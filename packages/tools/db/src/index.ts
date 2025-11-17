/**
 * @monorepo/db
 *
 * Shared database client and schema for Lambda functions
 *
 * Usage:
 * ```typescript
 * // Import everything
 * import { db, galleryImages, wishlistImages } from '@monorepo/db';
 *
 * // Or import separately
 * import { db } from '@monorepo/db/client';
 * import * as schema from '@monorepo/db/schema';
 * ```
 */

export { db, getPool, closePool, testConnection } from './client'
export * from './schema'
