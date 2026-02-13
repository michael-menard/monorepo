/**
 * FileDownloadButton Component Types
 * Story INST-1107: Download Files
 */

import { z } from 'zod'

export const FileDownloadButtonPropsSchema = z.object({
  /** The MOC ID that owns the file */
  mocId: z.string().uuid(),
  /** The file ID to download */
  fileId: z.string().uuid(),
  /** The original filename (for aria-label) */
  fileName: z.string().min(1),
  /** Optional additional CSS classes */
  className: z.string().optional(),
})

export type FileDownloadButtonProps = z.infer<typeof FileDownloadButtonPropsSchema>
