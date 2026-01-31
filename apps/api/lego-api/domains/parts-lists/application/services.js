import { ok, err } from '@repo/api-core';
/**
 * Create the Parts Lists Service
 *
 * Pure business logic - no infrastructure dependencies.
 * All I/O is done through injected ports.
 */
export function createPartsListsService(deps) {
    const { mocRepo, partsListRepo, partRepo } = deps;
    return {
        // ─────────────────────────────────────────────────────────────────────
        // Parts List Operations
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Create a new parts list for a MOC
         */
        async createPartsList(userId, mocId, input) {
            // Verify MOC ownership
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            try {
                const partsList = await partsListRepo.insert(mocId, input);
                return ok(partsList);
            }
            catch {
                return err('DB_ERROR');
            }
        },
        /**
         * Get parts list by ID (with ownership check via MOC)
         */
        async getPartsList(userId, mocId, partsListId) {
            // Verify MOC ownership
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const result = await partsListRepo.findById(partsListId);
            if (!result.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            // Verify parts list belongs to this MOC
            if (result.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            return result;
        },
        /**
         * Get parts list with all its parts
         */
        async getPartsListWithParts(userId, mocId, partsListId) {
            // Verify MOC ownership
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const result = await partsListRepo.findByIdWithParts(partsListId);
            if (!result.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            // Verify parts list belongs to this MOC
            if (result.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            return ok(result.data);
        },
        /**
         * List parts lists for a MOC
         */
        async listPartsLists(userId, mocId, pagination) {
            // Verify MOC ownership
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const result = await partsListRepo.findByMocId(mocId, pagination);
            return ok(result);
        },
        /**
         * Update a parts list
         */
        async updatePartsList(userId, mocId, partsListId, input) {
            // Verify MOC ownership
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            // Verify parts list exists and belongs to this MOC
            const existing = await partsListRepo.findById(partsListId);
            if (!existing.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            if (existing.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            const result = await partsListRepo.update(partsListId, input);
            if (!result.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            return result;
        },
        /**
         * Update parts list status (built/purchased flags)
         */
        async updatePartsListStatus(userId, mocId, partsListId, status) {
            // Map status to built/purchased flags
            const built = status === 'completed' || status === 'in_progress';
            const purchased = status === 'completed';
            return this.updatePartsList(userId, mocId, partsListId, { built, purchased });
        },
        /**
         * Delete a parts list (cascades to parts)
         */
        async deletePartsList(userId, mocId, partsListId) {
            // Verify MOC ownership
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            // Verify parts list exists and belongs to this MOC
            const existing = await partsListRepo.findById(partsListId);
            if (!existing.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            if (existing.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            // Delete parts first (cascade should handle this, but be explicit)
            await partRepo.deleteByPartsListId(partsListId);
            // Delete parts list
            return partsListRepo.delete(partsListId);
        },
        // ─────────────────────────────────────────────────────────────────────
        // Part Operations
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Add a part to a parts list
         */
        async addPart(userId, mocId, partsListId, input) {
            // Verify ownership chain
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const partsListResult = await partsListRepo.findById(partsListId);
            if (!partsListResult.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            if (partsListResult.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            try {
                const part = await partRepo.insert(partsListId, input);
                return ok(part);
            }
            catch {
                return err('DB_ERROR');
            }
        },
        /**
         * Add multiple parts to a parts list
         */
        async addParts(userId, mocId, partsListId, parts) {
            // Verify ownership chain
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const partsListResult = await partsListRepo.findById(partsListId);
            if (!partsListResult.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            if (partsListResult.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            try {
                const insertedParts = await partRepo.insertMany(partsListId, parts);
                return ok(insertedParts);
            }
            catch {
                return err('DB_ERROR');
            }
        },
        /**
         * Update a part
         */
        async updatePart(userId, mocId, partsListId, partId, input) {
            // Verify ownership chain
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const partsListResult = await partsListRepo.findById(partsListId);
            if (!partsListResult.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            if (partsListResult.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            // Verify part belongs to this parts list
            const partResult = await partRepo.findById(partId);
            if (!partResult.ok) {
                return err('PART_NOT_FOUND');
            }
            if (partResult.data.partsListId !== partsListId) {
                return err('FORBIDDEN');
            }
            const result = await partRepo.update(partId, input);
            if (!result.ok) {
                return err('PART_NOT_FOUND');
            }
            return result;
        },
        /**
         * Delete a part
         */
        async deletePart(userId, mocId, partsListId, partId) {
            // Verify ownership chain
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const partsListResult = await partsListRepo.findById(partsListId);
            if (!partsListResult.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            if (partsListResult.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            // Verify part belongs to this parts list
            const partResult = await partRepo.findById(partId);
            if (!partResult.ok) {
                return err('PART_NOT_FOUND');
            }
            if (partResult.data.partsListId !== partsListId) {
                return err('FORBIDDEN');
            }
            return partRepo.delete(partId);
        },
        /**
         * List parts for a parts list
         */
        async listParts(userId, mocId, partsListId) {
            // Verify ownership chain
            const mocResult = await mocRepo.verifyOwnership(mocId, userId);
            if (!mocResult.ok) {
                return err('MOC_NOT_FOUND');
            }
            const partsListResult = await partsListRepo.findById(partsListId);
            if (!partsListResult.ok) {
                return err('PARTS_LIST_NOT_FOUND');
            }
            if (partsListResult.data.mocId !== mocId) {
                return err('FORBIDDEN');
            }
            const parts = await partRepo.findByPartsListId(partsListId);
            return ok(parts);
        },
        // ─────────────────────────────────────────────────────────────────────
        // Summary Operations
        // ─────────────────────────────────────────────────────────────────────
        /**
         * Get summary of all parts lists for a user
         */
        async getUserSummary(userId) {
            try {
                const stats = await partsListRepo.getSummaryByUserId(userId);
                const completionPercentage = stats.totalParts > 0 ? Math.round((stats.totalAcquiredParts / stats.totalParts) * 100) : 0;
                return ok({
                    totalPartsLists: stats.totalPartsLists,
                    byStatus: stats.byStatus,
                    totalParts: stats.totalParts,
                    totalAcquiredParts: stats.totalAcquiredParts,
                    completionPercentage,
                });
            }
            catch {
                return err('DB_ERROR');
            }
        },
    };
}
