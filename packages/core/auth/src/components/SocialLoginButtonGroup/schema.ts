import { z } from 'zod'

export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'twitter', 'facebook', 'github']),
})

export type SocialLoginData = z.infer<typeof socialLoginSchema>
