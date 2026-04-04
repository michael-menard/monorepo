import { z } from 'zod'

const EnvSchema = z.object({
  NOTIFICATIONS_PORT: z
    .string()
    .optional()
    .default('3098')
    .transform(val => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  REDIS_URL: z.string().url().optional(),
  NOTIFICATIONS_HMAC_SECRET: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
})

export const env = EnvSchema.parse(process.env)
