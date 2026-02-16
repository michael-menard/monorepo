import { z } from 'zod'

/**
 * Zod schema for PasswordStrengthIndicator props
 */
export const PasswordStrengthIndicatorPropsSchema = z.object({
  password: z.string(),
  showLabel: z.boolean().optional().default(true),
  className: z.string().optional(),
})

export type PasswordStrengthIndicatorProps = z.infer<typeof PasswordStrengthIndicatorPropsSchema>
