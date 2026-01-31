import { ok, err } from '@repo/api-core';
import { logger } from '@repo/logger';
/**
 * Create the Wishlist Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createWishlistService(deps) {
    const { wishlistRepo, imageStorage, setsService } = deps;
    return {
        // ─────────────────────────────────────────────────────────────────────
        // Image Upload
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Generate a presigned URL for uploading an image
         *
         * WISH-2013: Added fileSize parameter for server-side validation
         */
        async generateImageUploadUrl(userId, fileName, mimeType, fileSize) {
            if (!imageStorage) {
                return err('PRESIGN_FAILED');
            }
            return imageStorage.generateUploadUrl(userId, fileName, mimeType, fileSize);
        },
        /**
         * Build the public S3 URL from a key
         */
        buildImageUrl(key) {
            if (!imageStorage) {
                return null;
            }
            return imageStorage.buildImageUrl(key);
        },
        // ─────────────────────────────────────────────────────────────────────
        // Create
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Create a new wishlist item
         */
        async createItem(userId, input) {
            try {
                // Get the next sort order
                const maxSortOrder = await wishlistRepo.getMaxSortOrder(userId);
                const sortOrder = maxSortOrder + 1;
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
                });
                return ok(item);
            }
            catch (error) {
                logger.error('Failed to create wishlist item:', error);
                return err('DB_ERROR');
            }
        },
        // ─────────────────────────────────────────────────────────────────────
        // Read
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Get wishlist item by ID (with ownership check)
         */
        async getItem(userId, itemId) {
            const result = await wishlistRepo.findById(itemId);
            if (!result.ok) {
                return result;
            }
            // Check ownership
            if (result.data.userId !== userId) {
                return err('FORBIDDEN');
            }
            return result;
        },
        /**
         * List wishlist items for a user
         */
        async listItems(userId, pagination, filters) {
            return wishlistRepo.findByUserId(userId, pagination, filters);
        },
        // ─────────────────────────────────────────────────────────────────────
        // Update
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Update a wishlist item
         */
        async updateItem(userId, itemId, input) {
            // Check ownership first
            const existing = await wishlistRepo.findById(itemId);
            if (!existing.ok) {
                return existing;
            }
            if (existing.data.userId !== userId) {
                return err('FORBIDDEN');
            }
            return wishlistRepo.update(itemId, input);
        },
        // ─────────────────────────────────────────────────────────────────────
        // Delete
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Delete a wishlist item
         */
        async deleteItem(userId, itemId) {
            // Check ownership first
            const existing = await wishlistRepo.findById(itemId);
            if (!existing.ok) {
                return existing;
            }
            if (existing.data.userId !== userId) {
                return err('FORBIDDEN');
            }
            return wishlistRepo.delete(itemId);
        },
        // ─────────────────────────────────────────────────────────────────────
        // Reorder
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Reorder wishlist items
         */
        async reorderItems(userId, input) {
            // Verify all items belong to user
            const itemIds = input.items.map(item => item.id);
            const ownsAll = await wishlistRepo.verifyOwnership(userId, itemIds);
            if (!ownsAll) {
                return err('VALIDATION_ERROR');
            }
            const result = await wishlistRepo.updateSortOrders(userId, input.items);
            if (!result.ok) {
                return result;
            }
            return ok({ updated: result.data });
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
        async markAsPurchased(userId, itemId, input) {
            // Check if SetsService is available
            if (!setsService) {
                logger.error('SetsService not available for purchase operation');
                return err('SET_CREATION_FAILED');
            }
            // Step 1: Fetch and verify wishlist item ownership
            const wishlistResult = await wishlistRepo.findById(itemId);
            if (!wishlistResult.ok) {
                return wishlistResult;
            }
            const wishlistItem = wishlistResult.data;
            if (wishlistItem.userId !== userId) {
                return err('FORBIDDEN');
            }
            // Step 2: Build Set input from wishlist item + purchase data
            const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();
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
            };
            // Step 3: Create Set item (point of no return)
            const setResult = await setsService.createSet(userId, setInput);
            if (!setResult.ok) {
                logger.error('Failed to create Set item:', setResult.error);
                return err('SET_CREATION_FAILED');
            }
            const newSet = setResult.data;
            // Step 4: Copy image to Sets S3 key (best effort)
            if (wishlistItem.imageUrl && imageStorage) {
                try {
                    const sourceKey = imageStorage.extractKeyFromUrl(wishlistItem.imageUrl);
                    if (sourceKey) {
                        const destKey = `sets/${userId}/${newSet.id}/main.jpg`;
                        const copyResult = await imageStorage.copyImage(sourceKey, destKey);
                        if (!copyResult.ok) {
                            logger.warn(`Failed to copy image for purchase (set ${newSet.id}): ${copyResult.error}`);
                            // Continue - Set was created, image copy is best effort
                        }
                        // Note: We could update the Set's image URL here, but for MVP
                        // we'll let the user upload images separately via the Sets UI
                    }
                }
                catch (error) {
                    logger.warn('Error during image copy for purchase:', error);
                    // Continue - Set was created, image copy is best effort
                }
            }
            // Step 5: Delete wishlist item if requested (best effort)
            if (!input.keepOnWishlist) {
                try {
                    const deleteResult = await wishlistRepo.delete(itemId);
                    if (!deleteResult.ok) {
                        logger.warn(`Failed to delete wishlist item after purchase (item ${itemId}): ${deleteResult.error}`);
                        // Continue - Set was created, deletion is best effort
                    }
                    // Also delete the wishlist image if it exists
                    if (wishlistItem.imageUrl && imageStorage) {
                        const sourceKey = imageStorage.extractKeyFromUrl(wishlistItem.imageUrl);
                        if (sourceKey) {
                            await imageStorage.deleteImage(sourceKey);
                        }
                    }
                }
                catch (error) {
                    logger.warn('Error during wishlist item cleanup after purchase:', error);
                    // Continue - Set was created, cleanup is best effort
                }
            }
            return ok(newSet);
        },
    };
}
