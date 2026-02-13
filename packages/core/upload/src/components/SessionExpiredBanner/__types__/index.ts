/**
 * REPA-0510: SessionExpiredBanner types
 * Zod schemas for component props
 */

import { z } from 'zod'

export const SessionExpiredBannerPropsSchema = z.object({
  /** Whether the banner is visible */
  visible: z.boolean(),
  /** Number of files affected by expired session */
  expiredCount: z.number(),
  /** Callback when refresh session is clicked */
  onRefreshSession: z.any(),
  /** Whether refresh is in progress */
  isRefreshing: z.boolean().optional(),
})

export type SessionExpiredBannerProps = z.infer<typeof SessionExpiredBannerPropsSchema>
