/**
 * Gallery Core Package
 *
 * Platform-agnostic business logic for gallery album and image operations.
 */

// ============================================================
// ALBUM CORE FUNCTIONS
// ============================================================

export { createAlbum } from './create-album.js'
export type { CreateAlbumDbClient, CreateAlbumSchema, CreateAlbumResult } from './create-album.js'

export { listAlbums } from './list-albums.js'
export type { ListAlbumsDbClient, ListAlbumsSchema } from './list-albums.js'

export { getAlbum } from './get-album.js'
export type { GetAlbumDbClient, GetAlbumSchema, GetAlbumResult } from './get-album.js'

export { updateAlbum } from './update-album.js'
export type { UpdateAlbumDbClient, UpdateAlbumSchema, UpdateAlbumResult } from './update-album.js'

export { deleteAlbum } from './delete-album.js'
export type { DeleteAlbumDbClient, DeleteAlbumSchema, DeleteAlbumResult } from './delete-album.js'

// ============================================================
// IMAGE CORE FUNCTIONS (STORY-007)
// ============================================================

export { getGalleryImage } from './get-image.js'
export type { GetImageDbClient, GetImageSchema, GetImageResult } from './get-image.js'

export { listGalleryImages } from './list-images.js'
export type { ListImagesDbClient, ListImagesSchema } from './list-images.js'

export { searchGalleryImages } from './search-images.js'
export type {
  SearchImagesDbClient,
  SearchImagesSchema,
  SearchImagesResult,
} from './search-images.js'

export { flagGalleryImage } from './flag-image.js'
export type { FlagImageDbClient, FlagImageSchema, FlagImageResult } from './flag-image.js'

// ============================================================
// IMAGE WRITE CORE FUNCTIONS (STORY-008)
// ============================================================

export { updateGalleryImage } from './update-image.js'
export type { UpdateImageDbClient, UpdateImageSchema, UpdateImageResult } from './update-image.js'

export { deleteGalleryImage } from './delete-image.js'
export type { DeleteImageDbClient, DeleteImageSchema, DeleteImageResult } from './delete-image.js'

// ============================================================
// TYPES - ALBUM
// ============================================================

export type {
  Album,
  AlbumWithImages,
  AlbumListResponse,
  ListAlbumsFilters,
  Pagination,
  AlbumRow,
  ImageRow,
  GalleryImage,
  CreateAlbumInput,
  UpdateAlbumInput,
} from './__types__/index.js'

export {
  AlbumSchema,
  AlbumWithImagesSchema,
  AlbumListResponseSchema,
  ListAlbumsFiltersSchema,
  PaginationSchema,
  AlbumRowSchema,
  ImageRowSchema,
  GalleryImageSchema,
  CreateAlbumInputSchema,
  UpdateAlbumInputSchema,
} from './__types__/index.js'

// ============================================================
// TYPES - IMAGE (STORY-007)
// ============================================================

export type {
  ListImagesFilters,
  SearchImagesFilters,
  FlagImageInput,
  ImageListResponse,
  FlagRow,
  FlagResult,
} from './__types__/index.js'

export {
  ListImagesFiltersSchema,
  SearchImagesFiltersSchema,
  FlagImageInputSchema,
  ImageListResponseSchema,
  FlagRowSchema,
  FlagResultSchema,
} from './__types__/index.js'

// ============================================================
// TYPES - IMAGE WRITE (STORY-008)
// ============================================================

export type { UpdateImageInput } from './__types__/index.js'

export { UpdateImageInputSchema } from './__types__/index.js'
