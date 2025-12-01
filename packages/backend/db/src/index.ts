/**
 * @monorepo/db
 *
 * Shared database client and schema for Lambda functions
 *
 * Usage:
 * ```typescript
 * // Import everything
 * import { db, galleryImages, wishlistImages } from '@repo/db';
 *
 * // Or import separately
 * import { db } from '@repo/db/client';
 * import * as schema from '@repo/db/schema';
 * import { galleryImageSchemas, createGalleryImageSchema } from '@repo/db/generated-schemas';
 * ```
 */

export { db, getPool, closePool, testConnection } from './client'
export * from './schema'
export * from './generated-schemas'
