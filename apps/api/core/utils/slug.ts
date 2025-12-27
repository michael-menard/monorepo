/**
 * @deprecated This file is deprecated. Import from '@repo/upload-types' instead.
 * See Story 3.1.29: Extract Upload Types Package
 *
 * Example migration:
 *   - import { slugify, findAvailableSlug } from '@/core/utils/slug'
 *   + import { slugify, findAvailableSlug } from '@repo/upload-types'
 */
export { SlugSchema, type Slug, slugify, slugWithSuffix, findAvailableSlug } from '@repo/upload-types'
