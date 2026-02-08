import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type {
  Inspiration,
  Album,
  AlbumWithMetadata,
  CreateInspirationInput,
  UpdateInspirationInput,
  CreateAlbumInput,
  UpdateAlbumInput,
  InspirationError,
  AlbumError,
  PresignError,
} from '../types.js'

/**
 * Inspiration Repository Interface
 *
 * Defines the contract for inspiration data access.
 * Implementation uses Drizzle ORM.
 */
export interface InspirationRepository {
  // ─────────────────────────────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Insert a new inspiration
   */
  insert(data: {
    userId: string
    title: string
    description: string | null
    imageUrl: string
    thumbnailUrl: string | null
    sourceUrl: string | null
    tags: string[]
    sortOrder: number
  }): Promise<Inspiration>

  // ─────────────────────────────────────────────────────────────────────
  // Read
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Find inspiration by ID
   */
  findById(id: string): Promise<Result<Inspiration, InspirationError>>

  /**
   * Find inspirations by user ID with pagination and filters
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: {
      search?: string
      tags?: string[]
      albumId?: string
      unassigned?: boolean
      sort?: 'createdAt' | 'updatedAt' | 'title' | 'sortOrder'
      order?: 'asc' | 'desc'
    },
  ): Promise<PaginatedResult<Inspiration>>

  /**
   * Get the maximum sort order for a user's inspirations
   */
  getMaxSortOrder(userId: string): Promise<number>

  // ─────────────────────────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Update an inspiration
   */
  update(id: string, data: UpdateInspirationInput): Promise<Result<Inspiration, InspirationError>>

  /**
   * Update sort orders for multiple inspirations
   */
  updateSortOrders(
    userId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<Result<number, InspirationError>>

  // ─────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Delete an inspiration
   */
  delete(id: string): Promise<Result<void, InspirationError>>

  // ─────────────────────────────────────────────────────────────────────
  // Ownership
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Verify user owns all the specified inspirations
   */
  verifyOwnership(userId: string, ids: string[]): Promise<boolean>
}

/**
 * Album Repository Interface
 *
 * Defines the contract for album data access.
 * Implementation uses Drizzle ORM.
 */
export interface AlbumRepository {
  // ─────────────────────────────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Insert a new album
   */
  insert(data: {
    userId: string
    title: string
    description: string | null
    coverImageId: string | null
    tags: string[]
    sortOrder: number
  }): Promise<Album>

  // ─────────────────────────────────────────────────────────────────────
  // Read
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Find album by ID
   */
  findById(id: string): Promise<Result<Album, AlbumError>>

  /**
   * Find album by ID with metadata (cover image, counts)
   */
  findByIdWithMetadata(id: string): Promise<Result<AlbumWithMetadata, AlbumError>>

  /**
   * Find albums by user ID with pagination and filters
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: {
      search?: string
      tags?: string[]
      parentAlbumId?: string
      rootOnly?: boolean
      sort?: 'createdAt' | 'updatedAt' | 'title' | 'sortOrder'
      order?: 'asc' | 'desc'
    },
  ): Promise<PaginatedResult<AlbumWithMetadata>>

  /**
   * Check if album title already exists for user
   */
  existsByTitle(userId: string, title: string, excludeId?: string): Promise<boolean>

  /**
   * Get the maximum sort order for a user's albums
   */
  getMaxSortOrder(userId: string): Promise<number>

  // ─────────────────────────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Update an album
   */
  update(id: string, data: UpdateAlbumInput): Promise<Result<Album, AlbumError>>

  /**
   * Update sort orders for multiple albums
   */
  updateSortOrders(
    userId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<Result<number, AlbumError>>

  // ─────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Delete an album
   */
  delete(id: string): Promise<Result<void, AlbumError>>

  // ─────────────────────────────────────────────────────────────────────
  // Ownership
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Verify user owns the specified album
   */
  verifyOwnership(userId: string, albumId: string): Promise<boolean>

  /**
   * Verify user owns all the specified albums
   */
  verifyOwnershipMultiple(userId: string, albumIds: string[]): Promise<boolean>
}

/**
 * Album Item Repository Interface
 *
 * Manages the many-to-many relationship between inspirations and albums.
 */
export interface AlbumItemRepository {
  /**
   * Add inspirations to an album
   */
  addToAlbum(albumId: string, inspirationIds: string[]): Promise<Result<number, AlbumError>>

  /**
   * Remove inspirations from an album
   */
  removeFromAlbum(albumId: string, inspirationIds: string[]): Promise<Result<number, AlbumError>>

  /**
   * Update sort orders for items within an album
   */
  updateSortOrders(
    albumId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<Result<number, AlbumError>>

  /**
   * Get all albums containing a specific inspiration
   */
  getAlbumsForInspiration(inspirationId: string): Promise<Album[]>

  /**
   * Check if inspiration is in album
   */
  isInAlbum(inspirationId: string, albumId: string): Promise<boolean>
}

/**
 * Album Parent Repository Interface
 *
 * Manages the DAG hierarchy between albums.
 */
export interface AlbumParentRepository {
  /**
   * Add a parent relationship
   */
  addParent(albumId: string, parentAlbumId: string): Promise<Result<void, AlbumError>>

  /**
   * Remove a parent relationship
   */
  removeParent(albumId: string, parentAlbumId: string): Promise<Result<void, AlbumError>>

  /**
   * Get all parent albums for an album
   */
  getParents(albumId: string): Promise<Album[]>

  /**
   * Get all child albums for an album
   */
  getChildren(albumId: string): Promise<Album[]>

  /**
   * Get all ancestors of an album (for cycle detection)
   */
  getAncestors(albumId: string): Promise<string[]>

  /**
   * Get the depth of an album in the hierarchy
   */
  getDepth(albumId: string): Promise<number>
}

/**
 * Inspiration Image Storage Interface
 *
 * Handles S3 operations for inspiration images.
 */
export interface InspirationImageStorage {
  /**
   * Generate a presigned URL for uploading an image
   */
  generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    fileSize?: number,
  ): Promise<
    Result<
      { presignedUrl: string; key: string; expiresIn: number },
      PresignError | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL'
    >
  >

  /**
   * Build the public S3 URL from a key
   */
  buildImageUrl(key: string): string

  /**
   * Extract the S3 key from a full URL
   */
  extractKeyFromUrl(url: string): string | null

  /**
   * Delete an image from S3
   */
  deleteImage(key: string): Promise<Result<void, 'DELETE_FAILED'>>

  /**
   * Copy an image to a new location
   */
  copyImage(sourceKey: string, destKey: string): Promise<Result<{ url: string }, 'COPY_FAILED'>>
}

/**
 * MOC Link Repository Interface
 *
 * Manages links between inspirations/albums and MOC instructions.
 */
export interface MocLinkRepository {
  /**
   * Link an inspiration to a MOC
   */
  linkInspirationToMoc(
    inspirationId: string,
    mocId: string,
    notes?: string,
  ): Promise<Result<void, InspirationError>>

  /**
   * Unlink an inspiration from a MOC
   */
  unlinkInspirationFromMoc(
    inspirationId: string,
    mocId: string,
  ): Promise<Result<void, InspirationError>>

  /**
   * Link an album to a MOC
   */
  linkAlbumToMoc(albumId: string, mocId: string, notes?: string): Promise<Result<void, AlbumError>>

  /**
   * Unlink an album from a MOC
   */
  unlinkAlbumFromMoc(albumId: string, mocId: string): Promise<Result<void, AlbumError>>

  /**
   * Get all MOCs linked to an inspiration
   */
  getMocsForInspiration(inspirationId: string): Promise<string[]>

  /**
   * Get all MOCs linked to an album
   */
  getMocsForAlbum(albumId: string): Promise<string[]>

  /**
   * Get all inspirations linked to a MOC
   */
  getInspirationsForMoc(mocId: string): Promise<Inspiration[]>

  /**
   * Get all albums linked to a MOC
   */
  getAlbumsForMoc(mocId: string): Promise<Album[]>
}
