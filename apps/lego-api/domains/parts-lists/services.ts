import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type { MocRepository, PartsListRepository, PartRepository } from './ports.js'
import type {
  PartsList,
  Part,
  PartsListWithParts,
  CreatePartsListInput,
  UpdatePartsListInput,
  CreatePartInput,
  UpdatePartInput,
  UserSummary,
  PartsListError,
  PartsListStatus,
} from './types.js'

/**
 * Parts Lists Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface PartsListsServiceDeps {
  mocRepo: MocRepository
  partsListRepo: PartsListRepository
  partRepo: PartRepository
}

/**
 * Create the Parts Lists Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createPartsListsService(deps: PartsListsServiceDeps) {
  const { mocRepo, partsListRepo, partRepo } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Parts List Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Create a new parts list for a MOC
     */
    async createPartsList(
      userId: string,
      mocId: string,
      input: CreatePartsListInput,
    ): Promise<Result<PartsList, PartsListError>> {
      // Verify MOC ownership
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      try {
        const partsList = await partsListRepo.insert(mocId, input)
        return ok(partsList)
      } catch {
        return err('DB_ERROR')
      }
    },

    /**
     * Get parts list by ID (with ownership check via MOC)
     */
    async getPartsList(
      userId: string,
      mocId: string,
      partsListId: string,
    ): Promise<Result<PartsList, PartsListError>> {
      // Verify MOC ownership
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const result = await partsListRepo.findById(partsListId)
      if (!result.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }

      // Verify parts list belongs to this MOC
      if (result.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      return result
    },

    /**
     * Get parts list with all its parts
     */
    async getPartsListWithParts(
      userId: string,
      mocId: string,
      partsListId: string,
    ): Promise<Result<PartsListWithParts, PartsListError>> {
      // Verify MOC ownership
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const result = await partsListRepo.findByIdWithParts(partsListId)
      if (!result.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }

      // Verify parts list belongs to this MOC
      if (result.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      return ok(result.data)
    },

    /**
     * List parts lists for a MOC
     */
    async listPartsLists(
      userId: string,
      mocId: string,
      pagination: PaginationInput,
    ): Promise<Result<PaginatedResult<PartsList>, PartsListError>> {
      // Verify MOC ownership
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const result = await partsListRepo.findByMocId(mocId, pagination)
      return ok(result)
    },

    /**
     * Update a parts list
     */
    async updatePartsList(
      userId: string,
      mocId: string,
      partsListId: string,
      input: UpdatePartsListInput,
    ): Promise<Result<PartsList, PartsListError>> {
      // Verify MOC ownership
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      // Verify parts list exists and belongs to this MOC
      const existing = await partsListRepo.findById(partsListId)
      if (!existing.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }
      if (existing.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      const result = await partsListRepo.update(partsListId, input)
      if (!result.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }

      return result
    },

    /**
     * Update parts list status (built/purchased flags)
     */
    async updatePartsListStatus(
      userId: string,
      mocId: string,
      partsListId: string,
      status: PartsListStatus,
    ): Promise<Result<PartsList, PartsListError>> {
      // Map status to built/purchased flags
      const built = status === 'completed' || status === 'in_progress'
      const purchased = status === 'completed'

      return this.updatePartsList(userId, mocId, partsListId, { built, purchased })
    },

    /**
     * Delete a parts list (cascades to parts)
     */
    async deletePartsList(
      userId: string,
      mocId: string,
      partsListId: string,
    ): Promise<Result<void, PartsListError>> {
      // Verify MOC ownership
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      // Verify parts list exists and belongs to this MOC
      const existing = await partsListRepo.findById(partsListId)
      if (!existing.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }
      if (existing.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      // Delete parts first (cascade should handle this, but be explicit)
      await partRepo.deleteByPartsListId(partsListId)

      // Delete parts list
      return partsListRepo.delete(partsListId)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Part Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Add a part to a parts list
     */
    async addPart(
      userId: string,
      mocId: string,
      partsListId: string,
      input: CreatePartInput,
    ): Promise<Result<Part, PartsListError>> {
      // Verify ownership chain
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const partsListResult = await partsListRepo.findById(partsListId)
      if (!partsListResult.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }
      if (partsListResult.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      try {
        const part = await partRepo.insert(partsListId, input)
        return ok(part)
      } catch {
        return err('DB_ERROR')
      }
    },

    /**
     * Add multiple parts to a parts list
     */
    async addParts(
      userId: string,
      mocId: string,
      partsListId: string,
      parts: CreatePartInput[],
    ): Promise<Result<Part[], PartsListError>> {
      // Verify ownership chain
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const partsListResult = await partsListRepo.findById(partsListId)
      if (!partsListResult.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }
      if (partsListResult.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      try {
        const insertedParts = await partRepo.insertMany(partsListId, parts)
        return ok(insertedParts)
      } catch {
        return err('DB_ERROR')
      }
    },

    /**
     * Update a part
     */
    async updatePart(
      userId: string,
      mocId: string,
      partsListId: string,
      partId: string,
      input: UpdatePartInput,
    ): Promise<Result<Part, PartsListError>> {
      // Verify ownership chain
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const partsListResult = await partsListRepo.findById(partsListId)
      if (!partsListResult.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }
      if (partsListResult.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      // Verify part belongs to this parts list
      const partResult = await partRepo.findById(partId)
      if (!partResult.ok) {
        return err('PART_NOT_FOUND')
      }
      if (partResult.data.partsListId !== partsListId) {
        return err('FORBIDDEN')
      }

      const result = await partRepo.update(partId, input)
      if (!result.ok) {
        return err('PART_NOT_FOUND')
      }

      return result
    },

    /**
     * Delete a part
     */
    async deletePart(
      userId: string,
      mocId: string,
      partsListId: string,
      partId: string,
    ): Promise<Result<void, PartsListError>> {
      // Verify ownership chain
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const partsListResult = await partsListRepo.findById(partsListId)
      if (!partsListResult.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }
      if (partsListResult.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      // Verify part belongs to this parts list
      const partResult = await partRepo.findById(partId)
      if (!partResult.ok) {
        return err('PART_NOT_FOUND')
      }
      if (partResult.data.partsListId !== partsListId) {
        return err('FORBIDDEN')
      }

      return partRepo.delete(partId)
    },

    /**
     * List parts for a parts list
     */
    async listParts(
      userId: string,
      mocId: string,
      partsListId: string,
    ): Promise<Result<Part[], PartsListError>> {
      // Verify ownership chain
      const mocResult = await mocRepo.verifyOwnership(mocId, userId)
      if (!mocResult.ok) {
        return err('MOC_NOT_FOUND')
      }

      const partsListResult = await partsListRepo.findById(partsListId)
      if (!partsListResult.ok) {
        return err('PARTS_LIST_NOT_FOUND')
      }
      if (partsListResult.data.mocId !== mocId) {
        return err('FORBIDDEN')
      }

      const parts = await partRepo.findByPartsListId(partsListId)
      return ok(parts)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Summary Operations
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Get summary of all parts lists for a user
     */
    async getUserSummary(userId: string): Promise<Result<UserSummary, PartsListError>> {
      try {
        const stats = await partsListRepo.getSummaryByUserId(userId)

        const completionPercentage =
          stats.totalParts > 0 ? Math.round((stats.totalAcquiredParts / stats.totalParts) * 100) : 0

        return ok({
          totalPartsLists: stats.totalPartsLists,
          byStatus: stats.byStatus,
          totalParts: stats.totalParts,
          totalAcquiredParts: stats.totalAcquiredParts,
          completionPercentage,
        })
      } catch {
        return err('DB_ERROR')
      }
    },
  }
}

// Export the service type for use in routes
export type PartsListsService = ReturnType<typeof createPartsListsService>
