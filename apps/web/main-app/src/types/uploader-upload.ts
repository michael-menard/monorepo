/**
 * @deprecated This file is deprecated. Import from '@repo/upload-types' instead.
 * See Story 3.1.29: Extract Upload Types Package
 *
 * Example migration:
 *   - import { UploaderFileItem } from '@/types/uploader-upload'
 *   + import { UploaderFileItem } from '@repo/upload-types'
 */
export {
  FileCategorySchema,
  type FileCategory,
  UploadStatusSchema,
  type UploadStatus,
  UploadErrorCodeSchema,
  type UploadErrorCode,
  UploaderFileItemSchema,
  type UploaderFileItem,
  UploadBatchStateSchema,
  type UploadBatchState,
  ERROR_MESSAGE_MAP,
  createEmptyBatchState,
  calculateBatchState,
  mapHttpErrorToUploadError,
  getErrorMessage,
  createFileId,
  createFileItem,
} from '@repo/upload-types'
