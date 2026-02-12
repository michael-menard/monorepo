/**
 * SessionExpiryWarning Component Types
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 */

import { z } from 'zod'

export const SessionExpiryWarningPropsSchema = z.object({
  /** Time remaining in milliseconds */
  timeRemainingMs: z.number().nonnegative(),
  /** Callback to refresh session */
  onRefresh: z.function(z.tuple([]), z.void()),
  /** Whether refresh is in progress */
  isRefreshing: z.boolean().optional().default(false),
})

export type SessionExpiryWarningProps = z.infer<typeof SessionExpiryWarningPropsSchema>
