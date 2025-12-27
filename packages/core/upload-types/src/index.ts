/**
 * @repo/upload-types
 *
 * Shared upload types and utilities for MOC upload features.
 * Used by main-app and API for consistent type definitions.
 */

// Session types
export {
  UPLOADER_SESSION_VERSION,
  FileMetadataSchema,
  type FileMetadata,
  UploaderStepSchema,
  type UploaderStep,
  UploaderSessionSchema,
  type UploaderSession,
  getStorageKey,
  generateAnonSessionId,
  parseSession,
  serializeSession,
  createEmptySession,
  fileToMetadata,
  migrateSession,
} from './session'

// Upload types
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
} from './upload'

// Slug utilities
export {
  SlugSchema,
  type Slug,
  slugify,
  slugWithSuffix,
  findAvailableSlug,
} from './slug'

// Edit types (Story 3.1.40)
export {
  MocStatusSchema,
  type MocStatus,
  MocFileItemSchema,
  type MocFileItem,
  MocForEditResponseSchema,
  type MocForEditResponse,
  EditMocRequestSchema,
  type EditMocRequest,
  EditMocFormSchema,
  type EditMocFormInput,
  formToEditRequest,
  responseToFormInput,
} from './edit'
