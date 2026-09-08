import { randomBytes } from "crypto"

/**
 * Access codes are capability tokens: anyone who holds one gets data
 * (public emergency view / share identity), so they must be
 * cryptographically random — NOT cuid(), which is timestamp+counter
 * structured and partially guessable.
 *
 * Format: MB-XXXX-XXXX-XXXX-XXXX (16 chars from a 31-symbol alphabet,
 * ~79 bits of entropy, no ambiguous glyphs like 0/O/1/I/L).
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

export function generateAccessCode(groups = 4, groupLength = 4): string {
  // Enough randomness to pick `groups * groupLength` symbols (5 bits each).
  const buf = randomBytes(groups * groupLength)
  const chars: string[] = []
  for (let i = 0; i < groups * groupLength; i++) {
    // 256 % 31 = 7, so re-draw values >= 248 to keep the distribution uniform.
    let byte = buf[i]
    while (byte >= 248) byte = randomBytes(1)[0]
    chars.push(ALPHABET[byte % ALPHABET.length])
  }
  const code: string[] = []
  for (let g = 0; g < groups; g++) {
    code.push(chars.slice(g * groupLength, (g + 1) * groupLength).join(""))
  }
  return `MB-${code.join("-")}`
}
