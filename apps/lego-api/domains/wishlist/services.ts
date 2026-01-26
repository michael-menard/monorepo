import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type { WishlistRepository } from './ports.js'
import type {
  WishlistItem,
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
  ReorderWishlistInput,
  WishlistError,
} from './types.js'

/**
 * Wishlist Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface WishlistServiceDeps {
  wishlistRepo: WishlistRepository
}

/**
 * Create the Wishlist Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createWishlistService(deps: WishlistServiceDeps) {
  const { wishlistRepo } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Create
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new wishlist item
     */
    async createItem(
      userId: string,
      input: CreateWishlistItemInput
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
          price: input.price ?? null,
          currency: input.currency ?? 'USD',
          pieceCount: input.pieceCount ?? null,
          releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
          tags: input.tags ?? [],
          priority: input.priority ?? 0,
          notes: input.notes ?? null,
          sortOrder,
        })

        return ok(item)
      } catch (error) {
        console.error('Failed to create wishlist item:', error)
        return err('DB_ERROR')
      }
    },

    // ─────────────────────────────────────────────────────────────────────
    // Read
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get wishlist item by ID (with ownership check)
     */
    async getItem(
      userId: string,
      itemId: string
    ): Promise<Result<WishlistItem, WishlistError>> {
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
     */
    async listItems(
      userId: string,
      pagination: PaginationInput,
      filters?: {
        search?: string
        store?: string
        tags?: string[]
        priority?: number
        sort?: 'createdAt' | 'title' | 'price' | 'pieceCount' | 'sortOrder' | 'priority'
        order?: 'asc' | 'desc'
      }
    ): Promise<PaginatedResult<WishlistItem>> {
      return wishlistRepo.findByUserId(userId, pagination, filters)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Update
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Update a wishlist item
     */
    async updateItem(
      userId: string,
      itemId: string,
      input: UpdateWishlistItemInput
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
    async deleteItem(
      userId: string,
      itemId: string
    ): Promise<Result<void, WishlistError>> {
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
      input: ReorderWishlistInput
    ): Promise<Result<{ updated: number }, WishlistError>> {
      // Verify all items belong to user
      const itemIds = input.items.map((item) => item.id)
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
  }
}

// Export the service type for use in routes
export type WishlistService = ReturnType<typeof createWishlistService>
