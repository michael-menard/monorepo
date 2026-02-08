import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type {
  InspirationRepository,
  AlbumRepository,
  AlbumItemRepository,
  AlbumParentRepository,
  InspirationImageStorage,
  MocLinkRepository,
} from '../ports/index.js'
import type {
  Inspiration,
  Album,
  AlbumWithMetadata,
  CreateInspirationInput,
  UpdateInspirationInput,
  CreateAlbumInput,
  UpdateAlbumInput,
  ReorderInspirationsInput,
  ReorderAlbumsInput,
  InspirationError,
  AlbumError,
  PresignError,
} from '../types.js'
import { createDagValidator, type DagValidator } from './dag-validator.js'

/**
 * Inspiration Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface InspirationServiceDeps {
  inspirationRepo: InspirationRepository
  albumRepo: AlbumRepository
  albumItemRepo: AlbumItemRepository
  albumParentRepo: AlbumParentRepository
  imageStorage?: InspirationImageStorage
  mocLinkRepo?: MocLinkRepository
}

/**
 * Create the Inspiration Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createInspirationService(deps: InspirationServiceDeps) {
  const { inspirationRepo, albumRepo, albumItemRepo, albumParentRepo, imageStorage, mocLinkRepo } =
    deps

  // Create DAG validator for album hierarchy operations
  const dagValidator: DagValidator = createDagValidator(albumParentRepo)

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Image Upload
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Generate a presigned URL for uploading an inspiration image
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
    // Inspiration CRUD
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new inspiration
     */
    async createInspiration(
      userId: string,
      input: CreateInspirationInput,
    ): Promise<Result<Inspiration, InspirationError>> {
      try {
        // Get the next sort order
        const maxSortOrder = await inspirationRepo.getMaxSortOrder(userId)
        const sortOrder = maxSortOrder + 1

        const item = await inspirationRepo.insert({
          userId,
          title: input.title,
          description: input.description ?? null,
          imageUrl: input.imageUrl,
          thumbnailUrl: input.thumbnailUrl ?? null,
          sourceUrl: input.sourceUrl ?? null,
          tags: input.tags ?? [],
          sortOrder,
        })

        return ok(item)
      } catch (error) {
        logger.error('Failed to create inspiration:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get inspiration by ID (with ownership check)
     */
    async getInspiration(
      userId: string,
      inspirationId: string,
    ): Promise<Result<Inspiration, InspirationError>> {
      const result = await inspirationRepo.findById(inspirationId)

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
     * List inspirations for a user
     */
    async listInspirations(
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
    ): Promise<PaginatedResult<Inspiration>> {
      return inspirationRepo.findByUserId(userId, pagination, filters)
    },

    /**
     * Update an inspiration
     */
    async updateInspiration(
      userId: string,
      inspirationId: string,
      input: UpdateInspirationInput,
    ): Promise<Result<Inspiration, InspirationError>> {
      // Check ownership first
      const existing = await inspirationRepo.findById(inspirationId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return inspirationRepo.update(inspirationId, input)
    },

    /**
     * Delete an inspiration
     */
    async deleteInspiration(
      userId: string,
      inspirationId: string,
    ): Promise<Result<void, InspirationError>> {
      // Check ownership first
      const existing = await inspirationRepo.findById(inspirationId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Delete the image from S3 if it exists
      if (existing.data.imageUrl && imageStorage) {
        const key = imageStorage.extractKeyFromUrl(existing.data.imageUrl)
        if (key) {
          await imageStorage.deleteImage(key)
        }
      }

      return inspirationRepo.delete(inspirationId)
    },

    /**
     * Reorder inspirations
     */
    async reorderInspirations(
      userId: string,
      input: ReorderInspirationsInput,
    ): Promise<Result<{ updated: number }, InspirationError>> {
      // Verify all items belong to user
      const itemIds = input.items.map(item => item.id)
      const ownsAll = await inspirationRepo.verifyOwnership(userId, itemIds)

      if (!ownsAll) {
        return err('VALIDATION_ERROR')
      }

      const result = await inspirationRepo.updateSortOrders(userId, input.items)

      if (!result.ok) {
        return result
      }

      return ok({ updated: result.data })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Album CRUD
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new album
     */
    async createAlbum(userId: string, input: CreateAlbumInput): Promise<Result<Album, AlbumError>> {
      try {
        // Check for duplicate title
        const titleExists = await albumRepo.existsByTitle(userId, input.title)
        if (titleExists) {
          return err('DUPLICATE_TITLE')
        }

        // Get the next sort order
        const maxSortOrder = await albumRepo.getMaxSortOrder(userId)
        const sortOrder = maxSortOrder + 1

        const album = await albumRepo.insert({
          userId,
          title: input.title,
          description: input.description ?? null,
          coverImageId: input.coverImageId ?? null,
          tags: input.tags ?? [],
          sortOrder,
        })

        // If parent album specified, add the parent relationship
        if (input.parentAlbumId) {
          // Validate the parent relationship won't create a cycle
          const validation = await dagValidator.validateAddParent(album.id, input.parentAlbumId)
          if (!validation.ok) {
            // Rollback album creation
            await albumRepo.delete(album.id)
            return validation
          }

          await albumParentRepo.addParent(album.id, input.parentAlbumId)
        }

        return ok(album)
      } catch (error) {
        logger.error('Failed to create album:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get album by ID (with ownership check)
     */
    async getAlbum(
      userId: string,
      albumId: string,
    ): Promise<Result<AlbumWithMetadata, AlbumError>> {
      const result = await albumRepo.findByIdWithMetadata(albumId)

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
     * List albums for a user
     */
    async listAlbums(
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
    ): Promise<PaginatedResult<AlbumWithMetadata>> {
      return albumRepo.findByUserId(userId, pagination, filters)
    },

    /**
     * Update an album
     */
    async updateAlbum(
      userId: string,
      albumId: string,
      input: UpdateAlbumInput,
    ): Promise<Result<Album, AlbumError>> {
      // Check ownership first
      const existing = await albumRepo.findById(albumId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Check for duplicate title if title is being changed
      if (input.title && input.title !== existing.data.title) {
        const titleExists = await albumRepo.existsByTitle(userId, input.title, albumId)
        if (titleExists) {
          return err('DUPLICATE_TITLE')
        }
      }

      return albumRepo.update(albumId, input)
    },

    /**
     * Delete an album
     */
    async deleteAlbum(userId: string, albumId: string): Promise<Result<void, AlbumError>> {
      // Check ownership first
      const existing = await albumRepo.findById(albumId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Note: Cascade delete will handle:
      // - inspiration_album_items (items in this album)
      // - album_parents (parent relationships)
      // - album_mocs (MOC links)

      return albumRepo.delete(albumId)
    },

    /**
     * Reorder albums
     */
    async reorderAlbums(
      userId: string,
      input: ReorderAlbumsInput,
    ): Promise<Result<{ updated: number }, AlbumError>> {
      // Verify all albums belong to user
      const albumIds = input.items.map(item => item.id)
      const ownsAll = await albumRepo.verifyOwnershipMultiple(userId, albumIds)

      if (!ownsAll) {
        return err('VALIDATION_ERROR')
      }

      const result = await albumRepo.updateSortOrders(userId, input.items)

      if (!result.ok) {
        return result
      }

      return ok({ updated: result.data })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Album Items (Many-to-Many)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Add inspirations to an album
     */
    async addToAlbum(
      userId: string,
      albumId: string,
      inspirationIds: string[],
    ): Promise<Result<{ added: number }, AlbumError | InspirationError>> {
      // Verify user owns the album
      const ownsAlbum = await albumRepo.verifyOwnership(userId, albumId)
      if (!ownsAlbum) {
        return err('FORBIDDEN')
      }

      // Verify user owns all the inspirations
      const ownsInspirations = await inspirationRepo.verifyOwnership(userId, inspirationIds)
      if (!ownsInspirations) {
        return err('VALIDATION_ERROR')
      }

      const result = await albumItemRepo.addToAlbum(albumId, inspirationIds)
      if (!result.ok) {
        return result
      }

      return ok({ added: result.data })
    },

    /**
     * Remove inspirations from an album
     */
    async removeFromAlbum(
      userId: string,
      albumId: string,
      inspirationIds: string[],
    ): Promise<Result<{ removed: number }, AlbumError>> {
      // Verify user owns the album
      const ownsAlbum = await albumRepo.verifyOwnership(userId, albumId)
      if (!ownsAlbum) {
        return err('FORBIDDEN')
      }

      const result = await albumItemRepo.removeFromAlbum(albumId, inspirationIds)
      if (!result.ok) {
        return result
      }

      return ok({ removed: result.data })
    },

    // ─────────────────────────────────────────────────────────────────────
    // Album Hierarchy (DAG)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Add a parent album relationship
     */
    async addAlbumParent(
      userId: string,
      albumId: string,
      parentAlbumId: string,
    ): Promise<Result<void, AlbumError>> {
      // Verify user owns both albums
      const ownsAlbum = await albumRepo.verifyOwnership(userId, albumId)
      const ownsParent = await albumRepo.verifyOwnership(userId, parentAlbumId)
      if (!ownsAlbum || !ownsParent) {
        return err('FORBIDDEN')
      }

      // Validate the relationship won't create a cycle or exceed max depth
      const validation = await dagValidator.validateAddParent(albumId, parentAlbumId)
      if (!validation.ok) {
        return validation
      }

      return albumParentRepo.addParent(albumId, parentAlbumId)
    },

    /**
     * Remove a parent album relationship
     */
    async removeAlbumParent(
      userId: string,
      albumId: string,
      parentAlbumId: string,
    ): Promise<Result<void, AlbumError>> {
      // Verify user owns the album
      const ownsAlbum = await albumRepo.verifyOwnership(userId, albumId)
      if (!ownsAlbum) {
        return err('FORBIDDEN')
      }

      return albumParentRepo.removeParent(albumId, parentAlbumId)
    },

    /**
     * Get album breadcrumbs (ancestor chain)
     */
    async getAlbumBreadcrumbs(
      userId: string,
      albumId: string,
    ): Promise<Result<Album[], AlbumError>> {
      // Verify user owns the album
      const ownsAlbum = await albumRepo.verifyOwnership(userId, albumId)
      if (!ownsAlbum) {
        return err('FORBIDDEN')
      }

      const parents = await albumParentRepo.getParents(albumId)
      return ok(parents)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Stack-to-Create Album (INSP-012)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create an album from stacked inspirations
     *
     * This is the "stack gesture" where users drag inspirations on top of
     * each other to create a new album containing those items.
     */
    async createAlbumFromStack(
      userId: string,
      title: string,
      inspirationIds: string[],
      options?: {
        description?: string
        tags?: string[]
      },
    ): Promise<Result<Album, AlbumError | InspirationError>> {
      // Verify user owns all the inspirations
      const ownsAll = await inspirationRepo.verifyOwnership(userId, inspirationIds)
      if (!ownsAll) {
        return err('VALIDATION_ERROR')
      }

      // Create the album
      const albumResult = await this.createAlbum(userId, {
        title,
        description: options?.description,
        tags: options?.tags ?? [],
      })

      if (!albumResult.ok) {
        return albumResult
      }

      // Add the inspirations to the album
      const addResult = await albumItemRepo.addToAlbum(albumResult.data.id, inspirationIds)
      if (!addResult.ok) {
        // Rollback: delete the album if we couldn't add items
        await albumRepo.delete(albumResult.data.id)
        return err('DB_ERROR')
      }

      // Set the first inspiration as the cover image
      if (inspirationIds.length > 0) {
        await albumRepo.update(albumResult.data.id, {
          coverImageId: inspirationIds[0],
        })
      }

      return albumResult
    },

    // ─────────────────────────────────────────────────────────────────────
    // MOC Linking
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Link an inspiration to a MOC
     */
    async linkInspirationToMoc(
      userId: string,
      inspirationId: string,
      mocId: string,
      notes?: string,
    ): Promise<Result<void, InspirationError>> {
      if (!mocLinkRepo) {
        return err('DB_ERROR')
      }

      // Verify user owns the inspiration
      const ownsInspiration = await inspirationRepo.verifyOwnership(userId, [inspirationId])
      if (!ownsInspiration) {
        return err('FORBIDDEN')
      }

      // Note: MOC ownership should be verified by the caller or MOC service
      return mocLinkRepo.linkInspirationToMoc(inspirationId, mocId, notes)
    },

    /**
     * Unlink an inspiration from a MOC
     */
    async unlinkInspirationFromMoc(
      userId: string,
      inspirationId: string,
      mocId: string,
    ): Promise<Result<void, InspirationError>> {
      if (!mocLinkRepo) {
        return err('DB_ERROR')
      }

      // Verify user owns the inspiration
      const ownsInspiration = await inspirationRepo.verifyOwnership(userId, [inspirationId])
      if (!ownsInspiration) {
        return err('FORBIDDEN')
      }

      return mocLinkRepo.unlinkInspirationFromMoc(inspirationId, mocId)
    },

    /**
     * Link an album to a MOC
     */
    async linkAlbumToMoc(
      userId: string,
      albumId: string,
      mocId: string,
      notes?: string,
    ): Promise<Result<void, AlbumError>> {
      if (!mocLinkRepo) {
        return err('DB_ERROR')
      }

      // Verify user owns the album
      const ownsAlbum = await albumRepo.verifyOwnership(userId, albumId)
      if (!ownsAlbum) {
        return err('FORBIDDEN')
      }

      return mocLinkRepo.linkAlbumToMoc(albumId, mocId, notes)
    },

    /**
     * Unlink an album from a MOC
     */
    async unlinkAlbumFromMoc(
      userId: string,
      albumId: string,
      mocId: string,
    ): Promise<Result<void, AlbumError>> {
      if (!mocLinkRepo) {
        return err('DB_ERROR')
      }

      // Verify user owns the album
      const ownsAlbum = await albumRepo.verifyOwnership(userId, albumId)
      if (!ownsAlbum) {
        return err('FORBIDDEN')
      }

      return mocLinkRepo.unlinkAlbumFromMoc(albumId, mocId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // DAG Validator (Exposed for testing/debugging)
    // ─────────────────────────────────────────────────────────────────────

    dagValidator,
  }
}

// Export the service type for use in routes
export type InspirationService = ReturnType<typeof createInspirationService>
