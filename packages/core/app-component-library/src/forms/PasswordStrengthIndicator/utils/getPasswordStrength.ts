/**
 * Password strength calculation utility
 * Returns score (0-4), label, and color for password strength indicator
 *
 * Scoring criteria:
 * - Length >= 8: +1
 * - Length >= 12: +1
 * - Mixed case (uppercase and lowercase): +1
 * - Contains numbers: +1
 * - Contains special characters: +1
 *
 * Maximum score: 4 (5 bars total, indexed 0-4)
 */

import { z } from 'zod'

const PasswordStrengthSchema = z.object({
  score: z.number(),
  label: z.string(),
  color: z.string(),
})

type PasswordStrength = z.infer<typeof PasswordStrengthSchema>

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const colors = ['red', 'orange', 'yellow', 'lime', 'green']

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
  }
}
