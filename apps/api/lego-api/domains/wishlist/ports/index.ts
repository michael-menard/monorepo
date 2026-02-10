import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { WishlistItem, UpdateWishlistItemInput } from '../types.js'

/**
 * Wishlist Domain Ports
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in repositories.ts and storage.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// Wishlist Image Storage Port
// ─────────────────────────────────────────────────────────────────────────

export interface WishlistImageStorage {
  /**
   * Generate a presigned URL for uploading an image to S3
   *
   * WISH-2013: Enhanced with file size validation
   *
   * @param userId - The user ID for scoping the upload
   * @param fileName - The original file name
   * @param mimeType - The MIME type of the file
   * @param fileSize - Optional file size in bytes for server-side validation
   */
  generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    fileSize?: number,
  ): Promise<
    Result<
      { presignedUrl: string; key: string; expiresIn: number },
      | 'INVALID_EXTENSION'
      | 'INVALID_MIME_TYPE'
      | 'FILE_TOO_LARGE'
      | 'FILE_TOO_SMALL'
      | 'PRESIGN_FAILED'
    >
  >

  /**
   * Build the public S3 URL from a key
   */
  buildImageUrl(key: string): string

  /**
   * Copy an image from one S3 key to another
   * Used for cross-domain image transfer (e.g., wishlist to sets)
   */
  copyImage(
    sourceKey: string,
    destKey: string,
  ): Promise<Result<{ url: string }, 'COPY_FAILED' | 'SOURCE_NOT_FOUND'>>

  /**
   * Delete an image from S3
   */
  deleteImage(key: string): Promise<Result<void, 'DELETE_FAILED'>>

  /**
   * Extract S3 key from a full URL
   */
  extractKeyFromUrl(url: string): string | null
}

// ─────────────────────────────────────────────────────────────────────────
// Wishlist Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface WishlistRepository {
  /**
   * Find wishlist item by ID
   */
  findById(id: string): Promise<Result<WishlistItem, 'NOT_FOUND'>>

  /**
   * Find wishlist items by user ID with pagination and optional filters
   *
   * WISH-2014: Added smart sorting algorithms
   * - bestValue: Sort by price/pieceCount ratio (lowest first)
   * - expiringSoon: Sort by oldest release date first
   * - hiddenGems: Sort by (5 - priority) * pieceCount (highest first)
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: {
      search?: string
      store?: string[] // WISH-20171: Changed from string to string[]
      tags?: string[]
      priority?: number // Backward compatibility
      priorityRange?: { min: number; max: number } // WISH-20171: New
      priceRange?: { min: number; max: number } // WISH-20171: New
      status?: 'wishlist' | 'owned' // SETS-MVP-001: Filter by lifecycle status
      sort?:
        | 'createdAt'
        | 'title'
        | 'price'
        | 'pieceCount'
        | 'sortOrder'
        | 'priority'
        | 'bestValue'
        | 'expiringSoon'
        | 'hiddenGems'
      order?: 'asc' | 'desc'
    },
  ): Promise<PaginatedResult<WishlistItem>>

  /**
   * Insert a new wishlist item
   */
  insert(data: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<WishlistItem>

  /**
   * Update an existing wishlist item
   */
  update(
    id: string,
    data: Partial<UpdateWishlistItemInput>,
  ): Promise<Result<WishlistItem, 'NOT_FOUND'>>

  /**
   * Delete a wishlist item
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Get maximum sort order for a user's wishlist
   */
  getMaxSortOrder(userId: string): Promise<number>

  /**
   * Update sort order for multiple items in a transaction
   */
  updateSortOrders(
    userId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<Result<number, 'VALIDATION_ERROR'>>

  /**
   * Verify all items belong to user
   */
  verifyOwnership(userId: string, itemIds: string[]): Promise<boolean>
}
