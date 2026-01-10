/**
 * Core gallery types and schemas for shared use across gallery components and hooks.
 * Uses Zod for runtime validation with inferred TypeScript types.
 * @module @repo/gallery/types
 */

import { z } from 'zod'

// =============================================================================
// Image Schemas
// =============================================================================

/**
 * Schema for aspect ratio options in gallery cards
 */
export const GalleryAspectRatioSchema = z.enum(['4/3', '16/9', '1/1', 'auto'])

export type GalleryAspectRatio = z.infer<typeof GalleryAspectRatioSchema>

/**
 * Schema for image configuration in GalleryCard component
 */
export const GalleryCardImageSchema = z.object({
  /** Image source URL */
  src: z.string(),
  /** Alt text for accessibility */
  alt: z.string(),
  /** Aspect ratio for the image container */
  aspectRatio: GalleryAspectRatioSchema.optional(),
})

export type GalleryCardImage = z.infer<typeof GalleryCardImageSchema>

/**
 * Schema for an image in a gallery item
 */
export const GalleryImageSchema = z.object({
  /** Unique identifier for the image */
  id: z.string(),
  /** Full-size image source URL */
  src: z.string().url(),
  /** Thumbnail image source URL */
  thumbnail: z.string().url(),
  /** Alt text for accessibility */
  alt: z.string(),
  /** Image width in pixels */
  width: z.number().positive().optional(),
  /** Image height in pixels */
  height: z.number().positive().optional(),
})

export type GalleryImage = z.infer<typeof GalleryImageSchema>

// =============================================================================
// Item Schemas
// =============================================================================

/**
 * Schema for gallery items.
 * Base schema for specific gallery types (MOCs, Wishlist, etc.)
 */
export const GalleryItemSchema = z.object({
  /** Unique identifier */
  id: z.string(),
  /** Display title */
  title: z.string().min(1),
  /** Optional description text */
  description: z.string().optional(),
  /** Array of images associated with this item */
  images: z.array(GalleryImageSchema),
  /** Tags for filtering/categorization */
  tags: z.array(z.string()),
  /** Theme classification (e.g., "Castle", "Space", "City") */
  theme: z.string().optional(),
  /** ISO 8601 creation timestamp */
  createdAt: z.string().datetime(),
  /** ISO 8601 last update timestamp */
  updatedAt: z.string().datetime(),
})

export type GalleryItem = z.infer<typeof GalleryItemSchema>

// =============================================================================
// Filter & Sort Schemas
// =============================================================================

/**
 * Schema for sort direction
 */
export const GallerySortDirectionSchema = z.enum(['asc', 'desc'])

export type GallerySortDirection = z.infer<typeof GallerySortDirectionSchema>

/**
 * Schema for filter state in gallery queries
 */
export const GalleryFilterStateSchema = z.object({
  /** Search query string */
  search: z.string(),
  /** Selected tags for filtering */
  tags: z.array(z.string()),
  /** Selected theme filter (null = all themes) */
  theme: z.string().nullable(),
})

export type GalleryFilterState = z.infer<typeof GalleryFilterStateSchema>

/**
 * Schema for sort state in gallery queries
 */
export const GallerySortStateSchema = z.object({
  /** Field to sort by */
  field: z.string(),
  /** Sort direction */
  direction: GallerySortDirectionSchema,
})

export type GallerySortState = z.infer<typeof GallerySortStateSchema>

/**
 * Schema for pagination state in gallery queries
 */
export const GalleryPaginationStateSchema = z.object({
  /** Current page number (1-indexed) */
  page: z.number().int().positive(),
  /** Number of items per page */
  pageSize: z.number().int().positive(),
  /** Total number of items (optional, from API response) */
  total: z.number().int().nonnegative().optional(),
  /** Total number of pages (computed) */
  totalPages: z.number().int().nonnegative().optional(),
})

export type GalleryPaginationState = z.infer<typeof GalleryPaginationStateSchema>

/**
 * Schema for complete gallery state combining filters, sort, and pagination
 */
export const GalleryStateSchema = z.object({
  /** Filter state */
  filter: GalleryFilterStateSchema,
  /** Sort state */
  sort: GallerySortStateSchema,
  /** Pagination state */
  pagination: GalleryPaginationStateSchema,
})

export type GalleryState = z.infer<typeof GalleryStateSchema>

// =============================================================================
// UI Configuration Schemas
// =============================================================================

export { ViewModeSchema } from './view-mode'
export type { ViewMode } from './view-mode'

/**
 * Schema for sort option configuration in dropdown menus
 */
export const GallerySortOptionSchema = z.object({
  /** Value to use when this option is selected (e.g., 'title', 'createdAt') */
  value: z.string(),
  /** Display label for the option */
  label: z.string(),
  /** Default direction when this option is selected */
  defaultDirection: GallerySortDirectionSchema.optional(),
})

export type GallerySortOption = z.infer<typeof GallerySortOptionSchema>

// Multi-column sort types (glry-1002)
export type { SortDirection, SortColumn } from './sort'

// =============================================================================
// API Query/Response Schemas
// =============================================================================

/**
 * Schema for query parameters in gallery API requests
 */
export const GalleryQueryParamsSchema = z.object({
  /** Search query */
  q: z.string().optional(),
  /** Tags to filter by */
  tags: z.array(z.string()).optional(),
  /** Theme to filter by */
  theme: z.string().optional(),
  /** Sort field */
  sort: z.string().optional(),
  /** Sort direction */
  order: GallerySortDirectionSchema.optional(),
  /** Page number */
  page: z.number().int().positive().optional(),
  /** Page size */
  limit: z.number().int().positive().optional(),
})

export type GalleryQueryParams = z.infer<typeof GalleryQueryParamsSchema>

/**
 * Schema for API response structure for paginated gallery results
 */
export const GalleryResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    /** Array of items */
    items: z.array(itemSchema),
    /** Total number of items matching the query */
    total: z.number().int().nonnegative(),
    /** Current page number */
    page: z.number().int().positive(),
    /** Page size */
    pageSize: z.number().int().positive(),
    /** Total number of pages */
    totalPages: z.number().int().nonnegative(),
    /** Whether there are more pages */
    hasMore: z.boolean(),
  })

/** Default gallery response schema using GalleryItemSchema */
export const DefaultGalleryResponseSchema = GalleryResponseSchema(GalleryItemSchema)

export type GalleryResponse<T extends GalleryItem = GalleryItem> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

// =============================================================================
// URL Search Params Schema
// =============================================================================

/**
 * Schema for URL search params in gallery pages (for TanStack Router)
 */
export const GallerySearchParamsSchema = z.object({
  /** Search query */
  q: z.string().optional(),
  /** Comma-separated tags or array */
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  /** Theme filter */
  theme: z.string().optional(),
  /** Sort field */
  sort: z.string().optional(),
  /** Sort order */
  order: GallerySortDirectionSchema.optional(),
  /** Page number */
  page: z.coerce.number().int().positive().optional(),
})

export type GallerySearchParams = z.infer<typeof GallerySearchParamsSchema>
