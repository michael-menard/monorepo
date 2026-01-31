/**
 * Database Composition
 *
 * Creates typed database client using shared schema from @repo/database-schema.
 * This is the single source of truth for database access in lego-api.
 */
import { createDb } from '@repo/api-core';
import * as schema from '@repo/database-schema';
// Create typed database client with full schema
export const db = createDb(schema);
// Re-export schema for repository use
export { schema };
// Re-export specific tables for convenience
export const { galleryImages, galleryAlbums, galleryFlags, sets, setImages, wishlistItems, mocInstructions, mocFiles, mocPartsLists, mocParts, featureFlags, } = schema;
