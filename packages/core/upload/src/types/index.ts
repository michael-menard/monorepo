/**
 * @repo/upload/types
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
export { SlugSchema, type Slug, slugify, slugWithSuffix, findAvailableSlug } from './slug'

// Edit MOC types
export {
  LEGO_THEMES,
  type LegoTheme,
  MocStatusSchema,
  type MocStatus,
  MocFileCategorySchema,
  type MocFileCategory,
  MocFileItemSchema,
  type MocFileItem,
  MocForEditResponseSchema,
  type MocForEditResponse,
  TagSchema,
  EditSlugSchema,
  EditMocFormSchema,
  type EditMocFormInput,
  EditMocRequestSchema,
  type EditMocRequest,
  SlugAvailabilityResponseSchema,
  type SlugAvailabilityResponse,
  hasFormChanges,
  toFormValues,
} from './edit'

// Validation types
export { FileValidationResultSchema, type FileValidationResult } from './validation'
