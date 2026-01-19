/**
 * Gallery Core Package
 *
 * Platform-agnostic business logic for gallery album operations.
 */

// Core functions
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

// Types
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
