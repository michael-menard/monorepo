/**
 * REPA-0510: ConflictModal types
 * Zod schemas for component props
 */

import { z } from 'zod'

export const ConflictModalPropsSchema = z.object({
  /** Whether the modal is open */
  open: z.boolean(),
  /** Current title that caused conflict */
  currentTitle: z.string(),
  /** Suggested slug from API */
  suggestedSlug: z.string().optional(),
  /** Callback when user confirms with new title */
  onConfirm: z.any(),
  /** Callback when user uses suggested slug */
  onUseSuggested: z.any().optional(),
  /** Callback when user cancels */
  onCancel: z.any(),
  /** Whether confirm action is loading */
  isLoading: z.boolean().optional(),
})

export type ConflictModalProps = z.infer<typeof ConflictModalPropsSchema>
