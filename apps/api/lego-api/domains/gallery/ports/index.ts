import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { GalleryImage, GalleryAlbum, CreateImageInput, UpdateImageInput } from '../types.js'

/**
 * Gallery Domain Ports
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in repositories.ts and storage.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// Image Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface ImageRepository {
  /**
   * Find image by ID
   */
  findById(id: string): Promise<Result<GalleryImage, 'NOT_FOUND'>>

  /**
   * Find images by user ID with pagination and optional filters
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: { albumId?: string | null; search?: string }
  ): Promise<PaginatedResult<GalleryImage>>

  /**
   * Insert a new image record
   */
  insert(data: Omit<GalleryImage, 'id' | 'createdAt' | 'lastUpdatedAt' | 'flagged'>): Promise<GalleryImage>

  /**
   * Update an existing image
   */
  update(id: string, data: Partial<UpdateImageInput>): Promise<Result<GalleryImage, 'NOT_FOUND'>>

  /**
   * Delete an image
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Orphan images in an album (set albumId to null)
   */
  orphanByAlbumId(albumId: string): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────
// Album Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface AlbumRepository {
  /**
   * Find album by ID with image count
   */
  findById(id: string): Promise<Result<GalleryAlbum, 'NOT_FOUND'>>

  /**
   * Find albums by user ID with pagination
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: { search?: string }
  ): Promise<PaginatedResult<GalleryAlbum>>

  /**
   * Insert a new album
   */
  insert(data: Omit<GalleryAlbum, 'id' | 'createdAt' | 'lastUpdatedAt' | 'imageCount'>): Promise<GalleryAlbum>

  /**
   * Update an existing album
   */
  update(id: string, data: Partial<{ title: string; description: string | null; coverImageId: string | null }>): Promise<Result<GalleryAlbum, 'NOT_FOUND'>>

  /**
   * Delete an album
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Image Storage Port
// ─────────────────────────────────────────────────────────────────────────

export interface ImageStorage {
  /**
   * Upload an image and return the URL
   */
  upload(key: string, buffer: Buffer, contentType: string): Promise<Result<{ url: string }, 'UPLOAD_FAILED'>>

  /**
   * Delete an image by key
   */
  delete(key: string): Promise<Result<void, 'DELETE_FAILED'>>

  /**
   * Extract S3 key from URL (for deletion)
   */
  extractKeyFromUrl(url: string): string | null
}

// ─────────────────────────────────────────────────────────────────────────
// Image Processor Port (optional - for MVP, can process in service)
// ─────────────────────────────────────────────────────────────────────────

export interface ImageProcessor {
  /**
   * Process an uploaded image (resize, optimize, generate thumbnail)
   */
  process(buffer: Buffer): Promise<Result<{
    main: { buffer: Buffer; contentType: string }
    thumbnail: { buffer: Buffer; contentType: string }
  }, 'PROCESSING_FAILED'>>
}
