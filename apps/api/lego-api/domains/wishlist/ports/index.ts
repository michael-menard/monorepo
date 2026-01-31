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
   */
  generateUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
  ): Promise<
    Result<
      { presignedUrl: string; key: string; expiresIn: number },
      'INVALID_EXTENSION' | 'INVALID_MIME_TYPE' | 'PRESIGN_FAILED'
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
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: {
      search?: string
      store?: string
      tags?: string[]
      priority?: number
      sort?: 'createdAt' | 'title' | 'price' | 'pieceCount' | 'sortOrder' | 'priority'
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
