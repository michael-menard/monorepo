/**
 * REPA-0510: UploaderFileItem types
 * Zod schemas for component props
 */

import { z } from 'zod'
import { UploaderFileItemSchema } from '@repo/upload/types'

export const UploaderFileItemPropsSchema = z.object({
  /** File item data */
  file: UploaderFileItemSchema,
  /** Cancel upload callback */
  onCancel: z.any().optional(),
  /** Retry upload callback */
  onRetry: z.any().optional(),
  /** Remove file callback */
  onRemove: z.any().optional(),
  /** Whether actions are disabled */
  disabled: z.boolean().optional(),
})

export type UploaderFileItemProps = z.infer<typeof UploaderFileItemPropsSchema>
