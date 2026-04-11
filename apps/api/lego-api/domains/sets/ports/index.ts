import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { Set, SetImage, Store, UpdateSetInput, UpdateSetImageInput } from '../types.js'

/**
 * Unified Sets Domain Ports
 */

// ─────────────────────────────────────────────────────────────────────────
// Set Repository
// ─────────────────────────────────────────────────────────────────────────

export interface SetRepository {
  findById(id: string): Promise<Result<Set, 'NOT_FOUND'>>

  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filters?: {
      search?: string
      status?: 'wanted' | 'owned'
      storeId?: string
      tags?: string[]
      priority?: number
      priorityRange?: { min: number; max: number }
      priceRange?: { min: number; max: number }
      isBuilt?: boolean
      sort?: string
      order?: 'asc' | 'desc'
    },
  ): Promise<PaginatedResult<Set>>

  insert(data: Omit<Set, 'id' | 'createdAt' | 'updatedAt' | 'storeName' | 'tags'>): Promise<Set>

  update(id: string, data: Record<string, unknown>): Promise<Result<Set, 'NOT_FOUND'>>

  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  getMaxSortOrder(userId: string): Promise<number>

  updateSortOrders(
    userId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<Result<number, 'VALIDATION_ERROR'>>

  verifyOwnership(userId: string, itemIds: string[]): Promise<boolean>
}

// ─────────────────────────────────────────────────────────────────────────
// Store Repository
// ─────────────────────────────────────────────────────────────────────────

export interface StoreRepository {
  findAll(): Promise<Store[]>
  findById(id: string): Promise<Result<Store, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Set Image Repository (deprecated — migrating to entity_files)
// ─────────────────────────────────────────────────────────────────────────

export interface SetImageRepository {
  findById(id: string): Promise<Result<SetImage, 'NOT_FOUND'>>
  findBySetId(setId: string): Promise<SetImage[]>
  insert(data: Omit<SetImage, 'id' | 'createdAt'>): Promise<SetImage>
  update(id: string, data: Partial<UpdateSetImageInput>): Promise<Result<SetImage, 'NOT_FOUND'>>
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
  deleteBySetId(setId: string): Promise<void>
  getNextPosition(setId: string): Promise<number>
}

// ─────────────────────────────────────────────────────────────────────────
// Image Storage
// ─────────────────────────────────────────────────────────────────────────

export interface ImageStorage {
  upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<Result<{ url: string }, 'UPLOAD_FAILED'>>

  generatePresignedUrl(
    key: string,
    contentType: string,
  ): Promise<Result<{ uploadUrl: string; imageUrl: string }, 'PRESIGN_FAILED'>>

  delete(key: string): Promise<Result<void, 'DELETE_FAILED'>>

  extractKeyFromUrl(url: string): string | null
}
