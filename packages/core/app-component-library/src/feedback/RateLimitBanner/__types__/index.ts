/**
 * BUGF-019: RateLimitBanner types
 * Zod schemas for component props
 */

import { z } from 'zod'

export const RateLimitBannerPropsSchema = z.object({
  /** Whether the banner is visible */
  visible: z.boolean(),
  /** Seconds until retry is allowed */
  retryAfterSeconds: z.number(),
  /** Callback when retry is clicked */
  onRetry: z.any(),
  /** Callback when banner is dismissed */
  onDismiss: z.any().optional(),
  /** Custom message to display (overrides default) */
  message: z.string().optional(),
  /** Custom title to display */
  title: z.string().optional().default('Rate Limit Exceeded'),
})

export type RateLimitBannerProps = z.infer<typeof RateLimitBannerPropsSchema>
