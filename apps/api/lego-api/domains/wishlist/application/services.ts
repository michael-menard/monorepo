import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { WishlistRepository, WishlistImageStorage } from '../ports/index.js'
import type {
  WishlistItem,
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
  ReorderWishlistInput,
  MarkAsPurchasedInput,
  PurchaseDetailsInput,
  WishlistError,
  PresignError,
  BuildStatus,
} from '../types.js'
import type { Set as SetItem } from '../../sets/types.js'
import type { SetsService } from '../../sets/application/services.js'

/**
 * Wishlist Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface WishlistServiceDeps {
  wishlistRepo: WishlistRepository
  imageStorage?: WishlistImageStorage
  /** Optional: SetsService for cross-domain purchase operations (WISH-2042) */
  setsService?: SetsService
}

/**
 * Create the Wishlist Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createWishlistService(deps: WishlistServiceDeps) {
  const { wishlistRepo, imageStorage, setsService } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Image Upload
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Generate a presigned URL for uploading an image
     *
     * WISH-2013: Added fileSize parameter for server-side validation
     */
    async generateImageUploadUrl(
      userId: string,
      fileName: string,
      mimeType: string,
      fileSize?: number,
    ): Promise<
      Result<
        { presignedUrl: string; key: string; expiresIn: number },
        PresignError | 'FILE_TOO_LARGE' | 'FILE_TOO_SMALL'
      >
    > {
      if (!imageStorage) {
        return err('PRESIGN_FAILED')
      }

      return imageStorage.generateUploadUrl(userId, fileName, mimeType, fileSize)
    },

    /**
     * Build the public S3 URL from a key
     */
    buildImageUrl(key: string): string | null {
      if (!imageStorage) {
        return null
      }
      return imageStorage.buildImageUrl(key)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Create
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new wishlist item
     */
    async createItem(
      userId: string,
      input: CreateWishlistItemInput,
    ): Promise<Result<WishlistItem, WishlistError>> {
      try {
        // Get the next sort order
        const maxSortOrder = await wishlistRepo.getMaxSortOrder(userId)
        const sortOrder = maxSortOrder + 1

        const item = await wishlistRepo.insert({
          userId,
          title: input.title,
          store: input.store,
          setNumber: input.setNumber ?? null,
          sourceUrl: input.sourceUrl ?? null,
          imageUrl: input.imageUrl ?? null,
          imageVariants: null, // WISH-2016: Set by S3 event handler after upload
          price: input.price ?? null,
          currency: input.currency ?? 'USD',
          pieceCount: input.pieceCount ?? null,
          releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
          tags: input.tags ?? [],
          priority: input.priority ?? 0,
          notes: input.notes ?? null,
          sortOrder,
          // SETS-MVP-001: Collection management fields (new items default to wishlist)
          status: 'wishlist',
          statusChangedAt: null,
          purchaseDate: null,
          purchasePrice: null,
          purchaseTax: null,
          purchaseShipping: null,
          buildStatus: null,
        })

        return ok(item)
      } catch (error) {
        logger.error('Failed to create wishlist item:', error)
        return err('DB_ERROR')
      }
    },

    // ─────────────────────────────────────────────────────────────────────
    // Read
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get wishlist item by ID (with ownership check)
     */
    async getItem(userId: string, itemId: string): Promise<Result<WishlistItem, WishlistError>> {
      const result = await wishlistRepo.findById(itemId)

      if (!result.ok) {
        return result
      }

      // Check ownership
      if (result.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return result
    },

    /**
     * List wishlist items for a user
     *
     * WISH-2014: Added smart sorting algorithms
     * - bestValue: Sort by price/pieceCount ratio (lowest first)
     * - expiringSoon: Sort by oldest release date first
     * - hiddenGems: Sort by (5 - priority) * pieceCount (highest first)
     *
     * SETS-MVP-001: Added status filter with default 'wishlist' for backward compatibility
     * - status: Filter by item lifecycle status ('wishlist' or 'owned')
     * - If not provided, defaults to 'wishlist' to maintain existing behavior
     */
    async listItems(
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
    ): Promise<PaginatedResult<WishlistItem>> {
      // SETS-MVP-001: Default to 'wishlist' status for backward compatibility
      const effectiveFilters = filters
        ? { ...filters, status: (filters.status ?? 'wishlist') as 'wishlist' | 'owned' }
        : { status: 'wishlist' as 'wishlist' | 'owned' }

      // Pass all filters through to repository (including WISH-20171 filters)
      return wishlistRepo.findByUserId(userId, pagination, effectiveFilters)
    },

    /**
     * Update a wishlist item
     */
    async updateItem(
      userId: string,
      itemId: string,
      input: UpdateWishlistItemInput,
    ): Promise<Result<WishlistItem, WishlistError>> {
      // Check ownership first
      const existing = await wishlistRepo.findById(itemId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return wishlistRepo.update(itemId, input)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Delete
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Delete a wishlist item
     */
    async deleteItem(userId: string, itemId: string): Promise<Result<void, WishlistError>> {
      // Check ownership first
      const existing = await wishlistRepo.findById(itemId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return wishlistRepo.delete(itemId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Reorder
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Reorder wishlist items
     */
    async reorderItems(
      userId: string,
      input: ReorderWishlistInput,
    ): Promise<Result<{ updated: number }, WishlistError>> {
      // Verify all items belong to user
      const itemIds = input.items.map(item => item.id)
      const ownsAll = await wishlistRepo.verifyOwnership(userId, itemIds)

      if (!ownsAll) {
        return err('VALIDATION_ERROR')
      }

      const result = await wishlistRepo.updateSortOrders(userId, input.items)

      if (!result.ok) {
        return result
      }

      return ok({ updated: result.data })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Purchase (WISH-2042)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Mark a wishlist item as purchased
     *
     * Transaction semantics:
     * 1. Fetch and verify wishlist item ownership
     * 2. Create Set item (point of no return)
     * 3. Copy image to Sets S3 key (best effort)
     * 4. Delete wishlist item if requested (best effort)
     *
     * Data loss prevention: Never delete Wishlist before Set creation succeeds.
     */
    async markAsPurchased(
      userId: string,
      itemId: string,
      input: MarkAsPurchasedInput,
    ): Promise<Result<SetItem, WishlistError>> {
      // Check if SetsService is available
      if (!setsService) {
        logger.error('SetsService not available for purchase operation')
        return err('SET_CREATION_FAILED')
      }

      // Step 1: Fetch and verify wishlist item ownership
      const wishlistResult = await wishlistRepo.findById(itemId)
      if (!wishlistResult.ok) {
        return wishlistResult
      }

      const wishlistItem = wishlistResult.data
      if (wishlistItem.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Step 2: Build Set input from wishlist item + purchase data
      const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date()

      const setInput = {
        title: wishlistItem.title,
        setNumber: wishlistItem.setNumber ?? undefined,
        store: wishlistItem.store ?? undefined,
        sourceUrl: wishlistItem.sourceUrl ?? undefined,
        pieceCount: wishlistItem.pieceCount ?? undefined,
        releaseDate: wishlistItem.releaseDate ?? undefined,
        tags: wishlistItem.tags ?? undefined,
        notes: wishlistItem.notes ?? undefined,
        quantity: input.quantity,
        purchasePrice: input.pricePaid ?? wishlistItem.price ?? undefined,
        tax: input.tax,
        shipping: input.shipping,
        purchaseDate,
        wishlistItemId: itemId,
      }

      // Step 3: Create Set item (point of no return)
      const setResult = await setsService.createSet(userId, setInput)
      if (!setResult.ok) {
        logger.error('Failed to create Set item:', setResult.error)
        return err('SET_CREATION_FAILED')
      }

      const newSet = setResult.data

      // Step 4: Copy image to Sets S3 key (best effort)
      if (wishlistItem.imageUrl && imageStorage) {
        try {
          const sourceKey = imageStorage.extractKeyFromUrl(wishlistItem.imageUrl)
          if (sourceKey) {
            const destKey = `sets/${userId}/${newSet.id}/main.jpg`
            const copyResult = await imageStorage.copyImage(sourceKey, destKey)
            if (!copyResult.ok) {
              logger.warn(
                `Failed to copy image for purchase (set ${newSet.id}): ${copyResult.error}`,
              )
              // Continue - Set was created, image copy is best effort
            }
            // Note: We could update the Set's image URL here, but for MVP
            // we'll let the user upload images separately via the Sets UI
          }
        } catch (error) {
          logger.warn('Error during image copy for purchase:', error)
          // Continue - Set was created, image copy is best effort
        }
      }

      // Step 5: Delete wishlist item if requested (best effort)
      if (!input.keepOnWishlist) {
        try {
          const deleteResult = await wishlistRepo.delete(itemId)
          if (!deleteResult.ok) {
            logger.warn(
              `Failed to delete wishlist item after purchase (item ${itemId}): ${deleteResult.error}`,
            )
            // Continue - Set was created, deletion is best effort
          }

          // Also delete the wishlist image if it exists
          if (wishlistItem.imageUrl && imageStorage) {
            const sourceKey = imageStorage.extractKeyFromUrl(wishlistItem.imageUrl)
            if (sourceKey) {
              await imageStorage.deleteImage(sourceKey)
            }
          }
        } catch (error) {
          logger.warn('Error during wishlist item cleanup after purchase:', error)
          // Continue - Set was created, cleanup is best effort
        }
      }

      return ok(newSet)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Status Transitions (SETS-MVP-0310)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update item status to 'owned' with purchase details
     *
     * SETS-MVP-0310: Unified model status transition approach.
     * Updates the existing item's status field instead of creating a new Set record.
     *
     * Steps:
     * 1. Fetch and verify wishlist item ownership
     * 2. Update status to 'owned' with purchase metadata
     *
     * @deprecated markAsPurchased - Use this method instead for new purchase flows
     */
    async updateItemStatus(
      userId: string,
      itemId: string,
      input: PurchaseDetailsInput,
    ): Promise<Result<WishlistItem, WishlistError>> {
      // Step 1: Fetch and verify wishlist item ownership
      const wishlistResult = await wishlistRepo.findById(itemId)
      if (!wishlistResult.ok) {
        return wishlistResult
      }

      const wishlistItem = wishlistResult.data
      if (wishlistItem.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Step 2: Build update data with status transition
      const now = new Date()
      const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : now

      const updateData: UpdateWishlistItemInput & {
        status?: 'owned'
        statusChangedAt?: Date
        purchaseDate?: Date
        purchasePrice?: string | null
        purchaseTax?: string | null
        purchaseShipping?: string | null
        buildStatus?: 'not_started' | 'in_progress' | 'completed'
      } = {
        // Status transition
        status: 'owned',
        statusChangedAt: now,

        // Purchase metadata
        purchaseDate,
        purchasePrice: input.purchasePrice ?? null,
        purchaseTax: input.purchaseTax ?? null,
        purchaseShipping: input.purchaseShipping ?? null,

        // Build tracking
        buildStatus: input.buildStatus ?? 'not_started',
      }

      // Step 3: Update the item
      const updateResult = await wishlistRepo.update(itemId, updateData)
      if (!updateResult.ok) {
        logger.error(`Failed to update item status for item ${itemId}:`, updateResult.error)
        return updateResult
      }

      return ok(updateResult.data)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Build Status Toggle (SETS-MVP-004)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update build status for an owned item
     *
     * SETS-MVP-004: Build status can only be toggled on items with status='owned'.
     * Returns INVALID_STATUS error if attempting to update build status on wishlist items.
     *
     * Steps:
     * 1. Fetch and verify item ownership
     * 2. Validate item is 'owned'
     * 3. Update buildStatus
     */
    async updateBuildStatus(
      userId: string,
      itemId: string,
      buildStatus: BuildStatus,
    ): Promise<Result<WishlistItem, WishlistError | 'INVALID_STATUS'>> {
      // Step 1: Fetch and verify ownership
      const existing = await wishlistRepo.findById(itemId)
      if (!existing.ok) return existing
      if (existing.data.userId !== userId) return err('FORBIDDEN')

      // Step 2: Validate item is 'owned' (AC10, AC22)
      if (existing.data.status !== 'owned') {
        return err('INVALID_STATUS')
      }

      // Step 3: Update buildStatus
      const updateData: UpdateWishlistItemInput & {
        buildStatus?: BuildStatus
      } = { buildStatus }
      return wishlistRepo.update(itemId, updateData)
    },
  }
}

// Export the service type for use in routes
export type WishlistService = ReturnType<typeof createWishlistService>
