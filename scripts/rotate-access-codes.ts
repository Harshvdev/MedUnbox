/**
 * Rotates weak access codes.
 *
 * Share.accessCode and EmergencyAccess.accessCode were previously generated
 * by Prisma's cuid() default — timestamp+counter structured, partially
 * guessable, and guarding sensitive endpoints (the public emergency view and
 * share identity). This script rewrites every existing code with a
 * cryptographically random one (src/lib/access-code.ts).
 *
 * Patients will need to re-copy codes from /sharing and /emergency; the
 * codes are always displayed in the UI, so nothing is lost.
 *
 * Run: bun scripts/rotate-access-codes.ts
 */
import { PrismaClient } from '@prisma/client'
import { generateAccessCode } from '../src/lib/access-code'

const db = new PrismaClient()

async function main() {
  const [shares, contacts] = await Promise.all([
    db.share.findMany({ select: { id: true, accessCode: true } }),
    db.emergencyAccess.findMany({ select: { id: true, accessCode: true } }),
  ])

  let rotatedShares = 0
  for (const share of shares) {
    if (share.accessCode.startsWith('MB-')) continue // already strong
    await db.share.update({
      where: { id: share.id },
      data: { accessCode: generateAccessCode() },
    })
    rotatedShares++
  }

  let rotatedContacts = 0
  for (const contact of contacts) {
    if (contact.accessCode.startsWith('MB-')) continue // already strong
    await db.emergencyAccess.update({
      where: { id: contact.id },
      data: { accessCode: generateAccessCode() },
    })
    rotatedContacts++
  }

  console.log(
    `Rotated ${rotatedShares} share codes and ${rotatedContacts} emergency codes ` +
      `(skipped ${shares.length - rotatedShares} + ${contacts.length - rotatedContacts} already strong).`
  )
}

main()
  .catch((err) => {
    console.error('Rotation failed:', err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
