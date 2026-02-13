/**
 * REPA-0510: UploaderList types
 * Zod schemas for component props
 */

import { z } from 'zod'
import { UploadBatchStateSchema } from '@repo/upload/types'

export const UploaderListPropsSchema = z.object({
  /** Batch state with all files */
  state: UploadBatchStateSchema,
  /** Cancel upload callback */
  onCancel: z.any().optional(),
  /** Retry upload callback */
  onRetry: z.any().optional(),
  /** Remove file callback */
  onRemove: z.any().optional(),
  /** Whether actions are disabled */
  disabled: z.boolean().optional(),
})

export type UploaderListProps = z.infer<typeof UploaderListPropsSchema>
