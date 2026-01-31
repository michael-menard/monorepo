import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type { SetRepository, SetImageRepository, ImageStorage } from '../ports/index.js'
import type {
  Set,
  SetImage,
  CreateSetInput,
  UpdateSetInput,
  CreateSetImageInput,
  UploadedFile,
  SetError,
} from '../types.js'
import { generateSetImageKey, generateSetThumbnailKey } from '../adapters/storage.js'

/**
 * Sets Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface SetsServiceDeps {
  setRepo: SetRepository
  setImageRepo: SetImageRepository
  imageStorage: ImageStorage
}

/**
 * Create the Sets Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createSetsService(deps: SetsServiceDeps) {
  const { setRepo, setImageRepo, imageStorage } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Set Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new set
     */
    async createSet(
      userId: string,
      input: CreateSetInput
    ): Promise<Result<Set, SetError>> {
      try {
        const set = await setRepo.insert({
          userId,
          title: input.title,
          setNumber: input.setNumber ?? null,
          store: input.store ?? null,
          sourceUrl: input.sourceUrl ?? null,
          pieceCount: input.pieceCount ?? null,
          releaseDate: input.releaseDate ?? null,
          theme: input.theme ?? null,
          tags: input.tags ?? null,
          notes: input.notes ?? null,
          isBuilt: input.isBuilt ?? false,
          quantity: input.quantity ?? 1,
          purchasePrice: input.purchasePrice ?? null,
          tax: input.tax ?? null,
          shipping: input.shipping ?? null,
          purchaseDate: input.purchaseDate ?? null,
          wishlistItemId: input.wishlistItemId ?? null,
        })

        return ok(set)
      } catch (error) {
        console.error('Failed to create set:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get set by ID (with ownership check)
     */
    async getSet(
      userId: string,
      setId: string
    ): Promise<Result<Set, SetError>> {
      const result = await setRepo.findById(setId)

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
     * Get set with its images
     */
    async getSetWithImages(
      userId: string,
      setId: string
    ): Promise<Result<{ set: Set; images: SetImage[] }, SetError>> {
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) {
        return setResult
      }

      const images = await setImageRepo.findBySetId(setId)

      return ok({
        set: setResult.data,
        images,
      })
    },

    /**
     * List sets for a user
     */
    async listSets(
      userId: string,
      pagination: PaginationInput,
      filters?: { search?: string; theme?: string; isBuilt?: boolean }
    ): Promise<PaginatedResult<Set>> {
      return setRepo.findByUserId(userId, pagination, filters)
    },

    /**
     * Update a set
     */
    async updateSet(
      userId: string,
      setId: string,
      input: UpdateSetInput
    ): Promise<Result<Set, SetError>> {
      // Check ownership first
      const existing = await setRepo.findById(setId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return setRepo.update(setId, input)
    },

    /**
     * Delete a set (also deletes all images)
     */
    async deleteSet(
      userId: string,
      setId: string
    ): Promise<Result<void, SetError>> {
      // Check ownership first
      const existing = await setRepo.findById(setId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Delete all images from S3 first
      const images = await setImageRepo.findBySetId(setId)
      for (const image of images) {
        const mainKey = imageStorage.extractKeyFromUrl(image.imageUrl)
        const thumbKey = image.thumbnailUrl
          ? imageStorage.extractKeyFromUrl(image.thumbnailUrl)
          : null

        if (mainKey) {
          await imageStorage.delete(mainKey)
        }
        if (thumbKey) {
          await imageStorage.delete(thumbKey)
        }
      }

      // Delete image records (cascade from schema should handle this, but explicit is clearer)
      await setImageRepo.deleteBySetId(setId)

      // Delete set
      return setRepo.delete(setId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Set Image Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Upload an image for a set
     */
    async uploadSetImage(
      userId: string,
      setId: string,
      file: UploadedFile,
      input?: Partial<CreateSetImageInput>
    ): Promise<Result<SetImage, SetError>> {
      // Validate set ownership
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) {
        return setResult
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.mimetype)) {
        return err('INVALID_FILE')
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        return err('INVALID_FILE')
      }

      // Generate unique ID for the image
      const imageId = crypto.randomUUID()

      // Generate S3 keys
      const mainKey = generateSetImageKey(userId, setId, imageId)
      const thumbKey = generateSetThumbnailKey(userId, setId, imageId)

      // Upload main image
      const uploadResult = await imageStorage.upload(mainKey, file.buffer, file.mimetype)
      if (!uploadResult.ok) {
        return err('UPLOAD_FAILED')
      }

      // Upload thumbnail (same file for MVP - TODO: resize)
      const thumbResult = await imageStorage.upload(thumbKey, file.buffer, file.mimetype)
      if (!thumbResult.ok) {
        // Clean up main image
        await imageStorage.delete(mainKey)
        return err('UPLOAD_FAILED')
      }

      // Get next position if not specified
      const position = input?.position ?? await setImageRepo.getNextPosition(setId)

      // Save to database
      try {
        const image = await setImageRepo.insert({
          setId,
          imageUrl: uploadResult.data.url,
          thumbnailUrl: thumbResult.data.url,
          position,
        })

        return ok(image)
      } catch (error) {
        // Clean up S3 files on DB error
        await imageStorage.delete(mainKey)
        await imageStorage.delete(thumbKey)
        console.error('Failed to save set image to database:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get a set image (with ownership check via parent set)
     */
    async getSetImage(
      userId: string,
      imageId: string
    ): Promise<Result<SetImage, SetError>> {
      const imageResult = await setImageRepo.findById(imageId)

      if (!imageResult.ok) {
        return imageResult
      }

      // Check ownership via parent set
      const setResult = await setRepo.findById(imageResult.data.setId)
      if (!setResult.ok) {
        return err('NOT_FOUND')
      }
      if (setResult.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return imageResult
    },

    /**
     * List images for a set
     */
    async listSetImages(
      userId: string,
      setId: string
    ): Promise<Result<SetImage[], SetError>> {
      // Check ownership
      const setResult = await this.getSet(userId, setId)
      if (!setResult.ok) {
        return setResult
      }

      const images = await setImageRepo.findBySetId(setId)
      return ok(images)
    },

    /**
     * Update a set image (position)
     */
    async updateSetImage(
      userId: string,
      imageId: string,
      input: { position?: number }
    ): Promise<Result<SetImage, SetError>> {
      // Get image and verify ownership
      const imageResult = await this.getSetImage(userId, imageId)
      if (!imageResult.ok) {
        return imageResult
      }

      return setImageRepo.update(imageId, input)
    },

    /**
     * Delete a set image
     */
    async deleteSetImage(
      userId: string,
      imageId: string
    ): Promise<Result<void, SetError>> {
      // Get image and verify ownership
      const imageResult = await this.getSetImage(userId, imageId)
      if (!imageResult.ok) {
        return imageResult
      }

      const image = imageResult.data

      // Delete from S3
      const mainKey = imageStorage.extractKeyFromUrl(image.imageUrl)
      const thumbKey = image.thumbnailUrl
        ? imageStorage.extractKeyFromUrl(image.thumbnailUrl)
        : null

      if (mainKey) {
        await imageStorage.delete(mainKey)
      }
      if (thumbKey) {
        await imageStorage.delete(thumbKey)
      }

      // Delete from database
      return setImageRepo.delete(imageId)
    },
  }
}

// Export the service type for use in routes
export type SetsService = ReturnType<typeof createSetsService>
