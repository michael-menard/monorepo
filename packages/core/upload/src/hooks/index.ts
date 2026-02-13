/**
 * Upload Hooks Exports
 *
 * Story REPA-004: Migrate Image Processing to Shared Package
 * Story REPA-003: Migrate Upload Hooks to @repo/upload
 */

// Image upload hook (REPA-004)
export { useUpload } from './useUpload'
export type { PresignedUrlResponse, UploadState, ImageUploadOptions } from './__types__'
export {
  PresignedUrlResponseSchema,
  UploadStateSchema,
  ImageUploadOptionsSchema,
} from './__types__'
export type { UseUploadResult, UseUploadOptions } from './useUpload'
export { MAX_FILE_SIZE, MIN_FILE_SIZE, ALLOWED_MIME_TYPES } from './useUpload'

// Upload manager hook (REPA-003)
export { useUploadManager } from './useUploadManager'
export type {
  UseUploadManagerOptions,
  UseUploadManagerResult,
  FileWithUploadUrl,
} from './useUploadManager'

// Uploader session hook (REPA-003)
export { useUploaderSession } from './useUploaderSession'
export type {
  UseUploaderSessionOptions,
  UseUploaderSessionResult,
} from './useUploaderSession'
