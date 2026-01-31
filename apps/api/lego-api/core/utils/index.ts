/**
 * Core Utilities
 *
 * Shared utility functions for the lego-api.
 */

export {
  // Constants
  ALLOWED_MIME_TYPES,
  MIME_TYPE_ALIASES,
  MAX_FILE_SIZE,
  MIN_FILE_SIZE,
  // Schemas
  ValidationResultSchema,
  SecurityLogEventSchema,
  // Types
  type ValidationResult,
  type SecurityLogEvent,
  // Functions
  validateMimeType,
  validateFileSize,
  validateFileUpload,
  logSecurityEvent,
  createSecurityEvent,
} from './file-validation.js'
