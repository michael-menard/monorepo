/**
 * @deprecated This file is deprecated. Import from '@repo/upload-types' instead.
 * See Story 3.1.29: Extract Upload Types Package
 *
 * Example migration:
 *   - import { UploaderSession } from '@/types/uploader-session'
 *   + import { UploaderSession } from '@repo/upload-types'
 */
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
} from '@repo/upload-types'
