import { z } from 'zod'

export const QueueDepthIndicatorPropsSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  queueName: z.string().min(1, 'Queue name is required'),
  thresholds: z
    .object({
      low: z.number().optional().default(10),
      high: z.number().optional().default(50),
    })
    .optional(),
})

export type QueueDepthIndicatorProps = z.infer<typeof QueueDepthIndicatorPropsSchema>
