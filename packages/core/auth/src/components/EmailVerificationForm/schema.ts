import { z } from 'zod'

export const emailVerificationSchema = z.object({
  code: z
    .array(z.string().min(1, 'Digit is required'))
    .length(6, 'Verification code must be exactly 6 digits'),
})

export type EmailVerificationFormData = z.infer<typeof emailVerificationSchema>
