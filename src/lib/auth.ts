import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare, hash } from "bcryptjs"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"

// MedUnbox authentication
// Uses NextAuth.js v4 (the engine Neon Auth is built on) with credentials provider.
// Patient and Doctor roles are enforced server-side.

// Compared against when the email doesn't exist so real and fake logins take
// the same time — otherwise response timing leaks which emails are registered.
const DUMMY_HASH = hash("medunbox-timing-equalizer", 12)

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        loginType: { label: "Login Type", type: "text" },
        aadhaar: { label: "Aadhaar", type: "text" },
        otp: { label: "OTP", type: "text" },
        category: { label: "Category", type: "text" },
        name: { label: "Name", type: "text" },
        phone: { label: "Phone", type: "text" },
        registrationNo: { label: "Registration No", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials) {
          throw new Error("No credentials provided")
        }

        // ----------------------------------------------------
        // 1. Patient Aadhaar Login
        // ----------------------------------------------------
        if (credentials.loginType === "patient") {
          const aadhaarRaw = credentials.aadhaar?.replace(/\s+/g, "").replace(/-/g, "") ?? ""
          const otp = credentials.otp?.trim() ?? ""

          if (!aadhaarRaw || aadhaarRaw.length !== 12 || !/^\d{12}$/.test(aadhaarRaw)) {
            throw new Error("Please enter a valid 12-digit Aadhaar number")
          }
          if (!otp || otp.length !== 6) {
            throw new Error("Please enter a valid 6-digit OTP")
          }

          const patient = await db.patient.findFirst({
            where: { aadhaar: aadhaarRaw },
            include: { user: true },
          })

          if (!patient || !patient.user) {
            throw new Error("No account found with this Aadhaar number. Please register first.")
          }

          return {
            id: patient.user.id,
            email: patient.user.email,
            name: patient.user.name ?? undefined,
            role: patient.user.role,
          }
        }

        // ----------------------------------------------------
        // 2. Healthcare Professional Login (Doctor, Pharmacist, Lab Technician)
        // ----------------------------------------------------
        if (credentials.loginType === "hcp") {
          const category = (credentials.category?.toUpperCase() ?? "") as "DOCTOR" | "PHARMACIST" | "LAB_TECHNICIAN"
          if (!["DOCTOR", "PHARMACIST", "LAB_TECHNICIAN"].includes(category)) {
            throw new Error("Invalid healthcare professional category")
          }

          const name = credentials.name?.trim() ?? ""
          const phone = credentials.phone?.trim() ?? ""
          const regNo = credentials.registrationNo?.trim() ?? ""

          if (!name) throw new Error("Full name is required")
          if (!phone) throw new Error("Phone number is required")
          if (!regNo) throw new Error("Registration number is required")

          let existingUser: { id: string; email: string; name: string | null; role: any; profilePhone: string | null } | null = null

          if (category === "DOCTOR") {
            const doc = await db.doctor.findFirst({
              where: { registrationNo: { equals: regNo, mode: "insensitive" } },
              include: { user: true },
            })
            if (doc) {
              existingUser = { ...doc.user, profilePhone: doc.phone }
            }
          } else if (category === "PHARMACIST") {
            const pharm = await db.pharmacist.findFirst({
              where: { registrationNo: { equals: regNo, mode: "insensitive" } },
              include: { user: true },
            })
            if (pharm) {
              existingUser = { ...pharm.user, profilePhone: pharm.phone }
            }
          } else if (category === "LAB_TECHNICIAN") {
            const lab = await db.labTechnician.findFirst({
              where: { registrationNo: { equals: regNo, mode: "insensitive" } },
              include: { user: true },
            })
            if (lab) {
              existingUser = { ...lab.user, profilePhone: lab.phone }
            }
          }

          if (existingUser) {
            // Check exact match of name and phone number
            const nameMatches = existingUser.name?.toLowerCase().trim() === name.toLowerCase().trim()
            const phoneClean = phone.replace(/[^0-9]/g, "")
            const existingPhoneClean = (existingUser.profilePhone ?? "").replace(/[^0-9]/g, "")
            const phoneMatches = !existingPhoneClean || existingPhoneClean === phoneClean

            if (!nameMatches || !phoneMatches) {
              throw new Error("Name or phone number does not match registered details for this registration number.")
            }

            return {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name ?? undefined,
              role: existingUser.role,
            }
          }

          // First-time HCP login: Auto-create account
          const cleanReg = regNo.toLowerCase().replace(/[^a-z0-9]/g, "")
          let dummyEmail = `${category.toLowerCase()}_${cleanReg}@medunbox.local`
          const existingEmail = await db.user.findUnique({ where: { email: dummyEmail } })
          if (existingEmail) {
            dummyEmail = `${category.toLowerCase()}_${cleanReg}_${Date.now()}@medunbox.local`
          }

          const newUser = await db.user.create({
            data: {
              email: dummyEmail,
              name,
              role: category,
            },
          })

          if (category === "DOCTOR") {
            await db.doctor.create({
              data: {
                userId: newUser.id,
                registrationNo: regNo,
                phone,
              },
            })
          } else if (category === "PHARMACIST") {
            await db.pharmacist.create({
              data: {
                userId: newUser.id,
                registrationNo: regNo,
                phone,
              },
            })
          } else if (category === "LAB_TECHNICIAN") {
            await db.labTechnician.create({
              data: {
                userId: newUser.id,
                registrationNo: regNo,
                phone,
              },
            })
          }

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name ?? undefined,
            role: newUser.role,
          }
        }

        // ----------------------------------------------------
        // 3. Fallback Email + Password Login
        // ----------------------------------------------------
        if (!credentials.email || !credentials.password) {
          throw new Error("Please provide valid login credentials")
        }

        const email = credentials.email.toLowerCase()

        // Brute-force guard: 10 attempts / 5 min / (email + IP).
        const ip =
          req && typeof req.headers?.get === "function"
            ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
              req.headers.get("x-real-ip") ??
              "unknown")
            : "unknown"
        const limited =
          !rateLimit(`login:email:${email}`, 10, 5 * 60 * 1000).ok ||
          !rateLimit(`login:ip:${ip}`, 30, 5 * 60 * 1000).ok
        if (limited) {
          throw new Error("Too many login attempts. Please wait a few minutes and try again.")
        }

        const user = await db.user.findUnique({
          where: { email },
          include: {
            patient: true,
            doctor: true,
          },
        })

        const isValid = await compare(credentials.password, user?.passwordHash ?? (await DUMMY_HASH))
        if (!user || !isValid) {
          throw new Error("Invalid email or password")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? "PATIENT"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
