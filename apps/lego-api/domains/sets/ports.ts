import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { Set, SetImage, UpdateSetInput, UpdateSetImageInput } from './types.js'

/**
 * Sets Domain Ports
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in repositories.ts and storage.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// Set Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface SetRepository {
  /**
   * Find set by ID
   */
  findById(id: string): Promise<Result<Set, 'NOT_FOUND'>>

  /**
   * Find sets by user ID with pagination and optional filters
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: { search?: string; theme?: string; isBuilt?: boolean }
  ): Promise<PaginatedResult<Set>>

  /**
   * Insert a new set record
   */
  insert(
    data: Omit<Set, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Set>

  /**
   * Update an existing set
   */
  update(id: string, data: Partial<UpdateSetInput>): Promise<Result<Set, 'NOT_FOUND'>>

  /**
   * Delete a set
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Set Image Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface SetImageRepository {
  /**
   * Find image by ID
   */
  findById(id: string): Promise<Result<SetImage, 'NOT_FOUND'>>

  /**
   * Find images by set ID, ordered by position
   */
  findBySetId(setId: string): Promise<SetImage[]>

  /**
   * Insert a new image record
   */
  insert(data: Omit<SetImage, 'id' | 'createdAt'>): Promise<SetImage>

  /**
   * Update an existing image
   */
  update(id: string, data: Partial<UpdateSetImageInput>): Promise<Result<SetImage, 'NOT_FOUND'>>

  /**
   * Delete an image
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Delete all images for a set
   */
  deleteBySetId(setId: string): Promise<void>

  /**
   * Get the next position number for a set
   */
  getNextPosition(setId: string): Promise<number>
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
