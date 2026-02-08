import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type { ImageRepository, AlbumRepository, ImageStorage } from '../ports/index.js'
import type {
  GalleryImage,
  GalleryAlbum,
  CreateImageInput,
  UpdateImageInput,
  CreateAlbumInput,
  UpdateAlbumInput,
  UploadedFile,
  GalleryError,
} from '../types.js'
import { generateImageKey, generateThumbnailKey } from '../adapters/storage.js'

/**
 * Gallery Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface GalleryServiceDeps {
  imageRepo: ImageRepository
  albumRepo: AlbumRepository
  imageStorage: ImageStorage
}

/**
 * Create the Gallery Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createGalleryService(deps: GalleryServiceDeps) {
  const { imageRepo, albumRepo, imageStorage } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Image Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Upload a new image
     */
    async uploadImage(
      userId: string,
      file: UploadedFile,
      input: CreateImageInput,
    ): Promise<Result<GalleryImage, GalleryError>> {
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

      // For MVP: Skip image processing, upload original
      // TODO: Add Sharp processing for production
      const mainKey = generateImageKey(userId, imageId)
      const thumbKey = generateThumbnailKey(userId, imageId)

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

      // Save to database
      try {
        const image = await imageRepo.insert({
          userId,
          title: input.title,
          description: input.description ?? null,
          tags: input.tags ?? null,
          imageUrl: uploadResult.data.url,
          thumbnailUrl: thumbResult.data.url,
          albumId: input.albumId ?? null,
        })

        return ok(image)
      } catch (error) {
        // Clean up S3 files on DB error
        await imageStorage.delete(mainKey)
        await imageStorage.delete(thumbKey)
        console.error('Failed to save image to database:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get image by ID (with ownership check)
     */
    async getImage(userId: string, imageId: string): Promise<Result<GalleryImage, GalleryError>> {
      const result = await imageRepo.findById(imageId)

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
     * List images for a user
     */
    async listImages(
      userId: string,
      pagination: PaginationInput,
      filters?: { albumId?: string | null; search?: string },
    ): Promise<PaginatedResult<GalleryImage>> {
      return imageRepo.findByUserId(userId, pagination, filters)
    },

    /**
     * Update an image
     */
    async updateImage(
      userId: string,
      imageId: string,
      input: UpdateImageInput,
    ): Promise<Result<GalleryImage, GalleryError>> {
      // Check ownership first
      const existing = await imageRepo.findById(imageId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return imageRepo.update(imageId, input)
    },

    /**
     * Delete an image
     */
    async deleteImage(userId: string, imageId: string): Promise<Result<void, GalleryError>> {
      // Check ownership first
      const existing = await imageRepo.findById(imageId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Delete from S3
      const mainKey = imageStorage.extractKeyFromUrl(existing.data.imageUrl)
      const thumbKey = existing.data.thumbnailUrl
        ? imageStorage.extractKeyFromUrl(existing.data.thumbnailUrl)
        : null

      if (mainKey) {
        await imageStorage.delete(mainKey)
      }
      if (thumbKey) {
        await imageStorage.delete(thumbKey)
      }

      // Delete from database
      return imageRepo.delete(imageId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Album Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new album
     */
    async createAlbum(
      userId: string,
      input: CreateAlbumInput,
    ): Promise<Result<GalleryAlbum, GalleryError>> {
      // Validate cover image if provided
      if (input.coverImageId) {
        const coverImage = await imageRepo.findById(input.coverImageId)
        if (!coverImage.ok) {
          return err('VALIDATION_ERROR')
        }
        if (coverImage.data.userId !== userId) {
          return err('FORBIDDEN')
        }
      }

      try {
        const album = await albumRepo.insert({
          userId,
          title: input.title,
          description: input.description ?? null,
          coverImageId: input.coverImageId ?? null,
        })

        return ok(album)
      } catch (error) {
        console.error('Failed to create album:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get album by ID (with ownership check)
     */
    async getAlbum(userId: string, albumId: string): Promise<Result<GalleryAlbum, GalleryError>> {
      const result = await albumRepo.findById(albumId)

      if (!result.ok) {
        return result
      }

      if (result.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      return result
    },

    /**
     * Get album with its images
     */
    async getAlbumWithImages(
      userId: string,
      albumId: string,
    ): Promise<Result<{ album: GalleryAlbum; images: GalleryImage[] }, GalleryError>> {
      const albumResult = await this.getAlbum(userId, albumId)
      if (!albumResult.ok) {
        return albumResult
      }

      const imagesResult = await imageRepo.findByUserId(
        userId,
        { page: 1, limit: 100 },
        { albumId },
      )

      return ok({
        album: albumResult.data,
        images: imagesResult.items,
      })
    },

    /**
     * List albums for a user
     */
    async listAlbums(
      userId: string,
      pagination: PaginationInput,
      filters?: { search?: string },
    ): Promise<PaginatedResult<GalleryAlbum>> {
      return albumRepo.findByUserId(userId, pagination, filters)
    },

    /**
     * Update an album
     */
    async updateAlbum(
      userId: string,
      albumId: string,
      input: UpdateAlbumInput,
    ): Promise<Result<GalleryAlbum, GalleryError>> {
      // Check ownership first
      const existing = await albumRepo.findById(albumId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Validate new cover image if provided
      if (input.coverImageId) {
        const coverImage = await imageRepo.findById(input.coverImageId)
        if (!coverImage.ok) {
          return err('VALIDATION_ERROR')
        }
        if (coverImage.data.userId !== userId) {
          return err('FORBIDDEN')
        }
      }

      return albumRepo.update(albumId, input)
    },

    /**
     * Delete an album (orphans images, doesn't delete them)
     */
    async deleteAlbum(userId: string, albumId: string): Promise<Result<void, GalleryError>> {
      // Check ownership first
      const existing = await albumRepo.findById(albumId)
      if (!existing.ok) {
        return existing
      }
      if (existing.data.userId !== userId) {
        return err('FORBIDDEN')
      }

      // Orphan images in this album
      await imageRepo.orphanByAlbumId(albumId)

      // Delete album
      return albumRepo.delete(albumId)
    },
  }
}

// Export the service type for use in routes
export type GalleryService = ReturnType<typeof createGalleryService>
