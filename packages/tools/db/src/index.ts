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
 * import { galleryImageSchemas, createGalleryImageSchema } from '@monorepo/db/generated-schemas';
 * ```
 */

export { db, getPool, closePool, testConnection } from './client'
export * from './schema'
export * from './generated-schemas'
