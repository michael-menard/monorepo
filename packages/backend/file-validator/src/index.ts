// Main exports for the file validator package
export * from './types.js'
export * from './file-types.js'
export * from './validators.js'

// Re-export commonly used functions
export {
  validateFile,
  validateFileTypes,
  validateMagicBytes,
  createImageValidationConfig,
  createDocumentValidationConfig,
  createLegoInstructionValidationConfig,
  createLegoPartsListValidationConfig,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isDocumentFile,
  isDataFile,
} from './validators.js'

export {
  FILE_TYPES,
  FILE_CATEGORIES,
  MAGIC_BYTES,
  getFileTypeByExtension,
  getFileTypeByMimeType,
  getFileTypesForCategory,
} from './file-types.js'

// Version
export const VERSION = '1.0.0'
