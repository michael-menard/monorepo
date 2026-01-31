import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type {
  PartsList,
  Part,
  CreatePartsListInput,
  UpdatePartsListInput,
  CreatePartInput,
  UpdatePartInput,
} from '../types.js'

/**
 * Parts Lists Domain Ports
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in repositories.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// MOC Repository Port (for ownership verification)
// ─────────────────────────────────────────────────────────────────────────

export interface MocRepository {
  /**
   * Check if a MOC exists and belongs to the given user
   */
  verifyOwnership(mocId: string, userId: string): Promise<Result<{ id: string }, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Parts List Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface PartsListRepository {
  /**
   * Find parts list by ID
   */
  findById(id: string): Promise<Result<PartsList, 'NOT_FOUND'>>

  /**
   * Find parts list by ID with all parts
   */
  findByIdWithParts(id: string): Promise<Result<PartsList & { parts: Part[] }, 'NOT_FOUND'>>

  /**
   * Find all parts lists for a MOC with pagination
   */
  findByMocId(mocId: string, pagination: PaginationInput): Promise<PaginatedResult<PartsList>>

  /**
   * Find all parts lists for a user across all their MOCs
   */
  findByUserId(userId: string): Promise<PartsList[]>

  /**
   * Insert a new parts list
   */
  insert(mocId: string, data: CreatePartsListInput): Promise<PartsList>

  /**
   * Update an existing parts list
   */
  update(id: string, data: Partial<UpdatePartsListInput>): Promise<Result<PartsList, 'NOT_FOUND'>>

  /**
   * Delete a parts list
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Get summary statistics for a user's parts lists
   */
  getSummaryByUserId(userId: string): Promise<{
    totalPartsLists: number
    byStatus: { planning: number; in_progress: number; completed: number }
    totalParts: number
    totalAcquiredParts: number
  }>
}

// ─────────────────────────────────────────────────────────────────────────
// Parts Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface PartRepository {
  /**
   * Find part by ID
   */
  findById(id: string): Promise<Result<Part, 'NOT_FOUND'>>

  /**
   * Find all parts for a parts list
   */
  findByPartsListId(partsListId: string): Promise<Part[]>

  /**
   * Insert a single part
   */
  insert(partsListId: string, data: CreatePartInput): Promise<Part>

  /**
   * Bulk insert parts
   */
  insertMany(partsListId: string, data: CreatePartInput[]): Promise<Part[]>

  /**
   * Update a part
   */
  update(id: string, data: Partial<UpdatePartInput>): Promise<Result<Part, 'NOT_FOUND'>>

  /**
   * Delete a part
   */
  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>

  /**
   * Delete all parts for a parts list
   */
  deleteByPartsListId(partsListId: string): Promise<void>

  /**
   * Count parts in a parts list
   */
  countByPartsListId(partsListId: string): Promise<number>

  /**
   * Sum quantities in a parts list
   */
  sumQuantityByPartsListId(partsListId: string): Promise<number>
}
