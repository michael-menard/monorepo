import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { MocInstructions, MocFile, UpdateMocInput } from '../types.js'

/**
 * Instructions Domain Ports
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in repositories.ts and storage.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// MOC Instructions Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface InstructionRepository {
  /**
   * Find MOC instruction by ID
   */
  findById(id: string): Promise<Result<MocInstructions, 'NOT_FOUND'>>

  /**
   * Find MOC instructions by user ID with pagination and optional filters
   */
  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: {
      type?: 'moc' | 'set'
      status?: string
      theme?: string
      search?: string
    },
  ): Promise<PaginatedResult<MocInstructions>>

  /**
   * Check if a title already exists for a user
   */
  existsByUserAndTitle(userId: string, title: string, excludeId?: string): Promise<boolean>

  /**
   * Insert a new MOC instruction record
   */
  insert(
    data: Omit<
      MocInstructions,
      'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'isFeatured' | 'isVerified'
    >,
  ): Promise<MocInstructions>

  /**
   * Update an existing MOC instruction
   */
  update(id: string, data: Partial<UpdateMocInput>): Promise<Result<MocInstructions, 'NOT_FOUND'>>

  /**
   * Delete a MOC instruction
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// MOC File Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface FileRepository {
  /**
   * Find file by ID
   */
  findById(id: string): Promise<Result<MocFile, 'NOT_FOUND'>>

  /**
   * Find files by MOC ID
   */
  findByMocId(mocId: string, fileType?: string): Promise<MocFile[]>

  /**
   * Insert a new file record
   */
  insert(data: Omit<MocFile, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<MocFile>

  /**
   * Soft delete a file (set deletedAt)
   */
  softDelete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Hard delete a file
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Delete all files for a MOC
   */
  deleteByMocId(mocId: string): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────
// File Storage Port
// ─────────────────────────────────────────────────────────────────────────

export interface FileStorage {
  /**
   * Upload a file and return the URL
   */
  upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<Result<{ url: string }, 'UPLOAD_FAILED'>>

  /**
   * Delete a file by key
   */
  delete(key: string): Promise<Result<void, 'DELETE_FAILED'>>

  /**
   * Extract S3 key from URL (for deletion)
   */
  extractKeyFromUrl(url: string): string | null
}
