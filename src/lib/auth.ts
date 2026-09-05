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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const email = credentials.email.toLowerCase()

        // Brute-force guard: 10 attempts / 5 min / (email + IP).
        // Keyed by email too, so one IP can't hammer many accounts quietly
        // and one account can't be sprayed from many IPs without tripping it.
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
          // Same message for unknown email and wrong password — no account
          // enumeration through the login form.
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
