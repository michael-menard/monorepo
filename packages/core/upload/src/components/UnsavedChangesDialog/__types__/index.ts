/**
 * REPA-0510: UnsavedChangesDialog types
 * Zod schemas for component props
 */

import { z } from 'zod'

export const UnsavedChangesDialogPropsSchema = z.object({
  /** Whether the dialog is open */
  open: z.boolean(),
  /** Callback when user chooses to stay */
  onStay: z.any(),
  /** Callback when user chooses to leave */
  onLeave: z.any(),
  /** Custom title (optional) */
  title: z.string().optional(),
  /** Custom description (optional) */
  description: z.string().optional(),
  /** Custom stay button text (optional) */
  stayButtonText: z.string().optional(),
  /** Custom leave button text (optional) */
  leaveButtonText: z.string().optional(),
})

export type UnsavedChangesDialogProps = z.infer<typeof UnsavedChangesDialogPropsSchema>
