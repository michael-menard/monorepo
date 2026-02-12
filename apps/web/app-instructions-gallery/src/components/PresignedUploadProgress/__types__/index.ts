/**
 * PresignedUploadProgress Component Types
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 */

import { z } from 'zod'
import {
  PresignedUploadStatusSchema,
  UploadProgressInfoSchema,
} from '../../../hooks/usePresignedUpload'

export const PresignedUploadProgressPropsSchema = z.object({
  /** File being uploaded */
  file: z.instanceof(File),
  /** Current upload status */
  status: PresignedUploadStatusSchema,
  /** Progress information (null if not uploading) */
  progress: UploadProgressInfoSchema.nullable(),
  /** Error message if upload failed */
  error: z.string().nullable(),
  /** Callback to cancel upload */
  onCancel: z.function(z.tuple([]), z.void()),
  /** Callback to retry upload */
  onRetry: z.function(z.tuple([]), z.void()),
  /** Callback to remove file from queue */
  onRemove: z.function(z.tuple([]), z.void()),
})

export type PresignedUploadProgressProps = z.infer<typeof PresignedUploadProgressPropsSchema>
