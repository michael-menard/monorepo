import { z } from 'zod'

export const NotificationEventSchema = z.object({
  id: z.string().uuid().optional(),
  channel: z.string().min(1),
  type: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  title: z.string().min(1),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
})

export type NotificationEvent = z.infer<typeof NotificationEventSchema>
