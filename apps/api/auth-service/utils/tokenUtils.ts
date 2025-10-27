import * as crypto from 'crypto'

/**
 * Generate a cryptographically secure CSRF token
 * @returns A 64-character hex string suitable for CSRF protection
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a secure token and its SHA-256 hash
 * @returns Object containing the raw token (to be sent) and its hash (to be stored)
 */
export function generateSecureToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

/**
 * Generate a secure 6-digit verification code and its SHA-256 hash
 * @returns Object containing the raw code (to be sent) and its hash (to be stored)
 */
export function generateSecureVerificationCode(): { raw: string; hash: string } {
  const raw = Math.floor(100000 + Math.random() * 900000).toString()
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

/**
 * Verify a raw token against its stored hash
 * @param rawToken - The raw token received from the user
 * @param hashedToken - The hashed token stored in the database
 * @returns True if the token matches, false otherwise
 */
export function verifyToken(rawToken: string, hashedToken: string): boolean {
  if (!rawToken || !hashedToken) {
    return false
  }

  const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  return hash === hashedToken
}
