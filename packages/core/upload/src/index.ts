// Re-export everything from client (including UploadErrorCode from client/types)
export * from './client'

// Re-export hooks
export * from './hooks'

// Re-export image utilities
export * from './image'

// Re-export components
export * from './components'

// Re-export types selectively to avoid conflict with client's UploadErrorCode
export {
  // Session types
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
  
  // Upload types (excluding UploadErrorCode/Schema which come from client)
  FileCategorySchema,
  type FileCategory,
  UploadStatusSchema,
  type UploadStatus,
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
  
  // Slug utilities
  SlugSchema,
  type Slug,
  slugify,
  slugWithSuffix,
  findAvailableSlug,
  
  // Edit MOC types
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
} from './types'
