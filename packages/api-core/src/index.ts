/**
 * @repo/api-core
 *
 * Slim shared infrastructure for lego-api (local development)
 *
 * Usage:
 * ```typescript
 * // Import core utilities
 * import { createDb, Result, ok, err, verifyToken } from '@repo/api-core'
 *
 * // Create typed db client with your schema
 * import * as schema from './my-schema'
 * const db = createDb(schema)
 * ```
 */

// Database
export { getDb, createDb, closeDb, testConnection } from './db.js'

// S3 Storage
export {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
  getPresignedUploadUrl,
} from './s3.js'

// Auth
export { verifyToken, isAuthBypassEnabled } from './auth.js'
export type { AuthUser } from './auth.js'

// Types
export {
  ok,
  err,
  paginate,
  PaginationInputSchema,
  PaginatedResultSchema,
} from './types.js'
export type { Result, PaginationInput, PaginatedResult } from './types.js'
