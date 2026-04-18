import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type {
  MinifigInstanceRepository,
  MinifigArchetypeRepository,
  MinifigVariantRepository,
} from '../ports/index.js'
import type {
  MinifigInstance,
  MinifigArchetype,
  MinifigVariant,
  CreateMinifigInstanceInput,
  UpdateMinifigInstanceInput,
  MinifigError,
  MinifigPart,
  AppearsInSet,
} from '../types.js'

// ─────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────

export interface MinifigsServiceDeps {
  instanceRepo: MinifigInstanceRepository
  archetypeRepo: MinifigArchetypeRepository
  variantRepo: MinifigVariantRepository
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────

export function createMinifigsService(deps: MinifigsServiceDeps) {
  const { instanceRepo, archetypeRepo, variantRepo } = deps

  return {
    // ─────────────────────────────────────────────────────────────────────
    // Instance CRUD
    // ─────────────────────────────────────────────────────────────────────

    async createInstance(
      userId: string,
      input: CreateMinifigInstanceInput,
    ): Promise<Result<MinifigInstance, MinifigError>> {
      try {
        const instance = await instanceRepo.insert({
          userId,
          variantId: input.variantId ?? null,
          displayName: input.displayName,
          status: input.status ?? 'none',
          condition: input.condition ?? null,
          sourceType: input.sourceType ?? null,
          sourceSetId: input.sourceSetId ?? null,
          isCustom: input.isCustom ?? false,
          quantityOwned: input.quantityOwned ?? 0,
          quantityWanted: input.quantityWanted ?? 0,
          purchasePrice: input.purchasePrice ?? null,
          purchaseTax: input.purchaseTax ?? null,
          purchaseShipping: input.purchaseShipping ?? null,
          purchaseDate: input.purchaseDate ?? null,
          purpose: input.purpose ?? null,
          plannedUse: input.plannedUse ?? null,
          notes: input.notes ?? null,
          imageUrl: input.imageUrl ?? null,
          sortOrder: null,
        })
        return ok(instance)
      } catch (error) {
        console.error('Failed to create minifig instance:', error)
        return err('DB_ERROR')
      }
    },

    async getInstance(userId: string, id: string): Promise<Result<MinifigInstance, MinifigError>> {
      const result = await instanceRepo.findById(id)
      if (!result.ok) return result
      if (result.data.userId !== userId) return err('FORBIDDEN')
      return result
    },

    async listInstances(
      userId: string,
      pagination: PaginationInput,
      filters?: {
        search?: string
        status?: 'owned' | 'wanted'
        condition?: string
        sourceType?: string
        tags?: string[]
        sort?: string
        order?: 'asc' | 'desc'
      },
    ): Promise<PaginatedResult<MinifigInstance>> {
      return instanceRepo.findByUserId(userId, pagination, filters)
    },

    async updateInstance(
      userId: string,
      id: string,
      input: UpdateMinifigInstanceInput,
    ): Promise<Result<MinifigInstance, MinifigError>> {
      const existing = await instanceRepo.findById(id)
      if (!existing.ok) return existing
      if (existing.data.userId !== userId) return err('FORBIDDEN')

      const updateData: Record<string, unknown> = {}

      if (input.displayName !== undefined) updateData.displayName = input.displayName
      if (input.status !== undefined) updateData.status = input.status
      if (input.condition !== undefined) updateData.condition = input.condition
      if (input.variantId !== undefined) updateData.variantId = input.variantId
      if (input.sourceType !== undefined) updateData.sourceType = input.sourceType
      if (input.sourceSetId !== undefined) updateData.sourceSetId = input.sourceSetId
      if (input.isCustom !== undefined) updateData.isCustom = input.isCustom
      if (input.quantityOwned !== undefined) updateData.quantityOwned = input.quantityOwned
      if (input.quantityWanted !== undefined) updateData.quantityWanted = input.quantityWanted
      if (input.purchasePrice !== undefined) updateData.purchasePrice = input.purchasePrice
      if (input.purchaseTax !== undefined) updateData.purchaseTax = input.purchaseTax
      if (input.purchaseShipping !== undefined) updateData.purchaseShipping = input.purchaseShipping
      if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate
      if (input.purpose !== undefined) updateData.purpose = input.purpose
      if (input.plannedUse !== undefined) updateData.plannedUse = input.plannedUse
      if (input.notes !== undefined) updateData.notes = input.notes
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder

      return instanceRepo.update(id, updateData)
    },

    async deleteInstance(userId: string, id: string): Promise<Result<void, MinifigError>> {
      const existing = await instanceRepo.findById(id)
      if (!existing.ok) return existing
      if (existing.data.userId !== userId) return err('FORBIDDEN')
      return instanceRepo.delete(id)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Archetypes
    // ─────────────────────────────────────────────────────────────────────

    async listArchetypes(userId: string, search?: string): Promise<MinifigArchetype[]> {
      return archetypeRepo.findAll(userId, search)
    },

    // ─────────────────────────────────────────────────────────────────────
    // Variants
    // ─────────────────────────────────────────────────────────────────────

    async listVariants(
      userId: string,
      filters?: { archetypeId?: string; search?: string },
    ): Promise<MinifigVariant[]> {
      return variantRepo.findAll(userId, filters)
    },

    async getVariant(userId: string, id: string): Promise<Result<MinifigVariant, MinifigError>> {
      const result = await variantRepo.findById(id)
      if (!result.ok) return result
      if (result.data.userId !== userId) return err('FORBIDDEN')
      return result
    },

    async updateVariant(
      userId: string,
      id: string,
      input: { theme?: string | null; subtheme?: string | null },
    ): Promise<Result<MinifigVariant, MinifigError>> {
      const existing = await variantRepo.findById(id)
      if (!existing.ok) return existing
      if (existing.data.userId !== userId) return err('FORBIDDEN')

      const updateData: Record<string, unknown> = {}
      if (input.theme !== undefined) updateData.theme = input.theme
      if (input.subtheme !== undefined) updateData.subtheme = input.subtheme

      return variantRepo.update(id, updateData)
    },

    async createVariant(
      userId: string,
      input: {
        name?: string
        legoNumber?: string
        theme?: string
        subtheme?: string
        year?: number
        cmfSeries?: string
        imageUrl?: string
        weight?: string
        dimensions?: string
        partsCount?: number
        parts?: MinifigPart[]
        appearsInSets?: AppearsInSet[]
      },
    ): Promise<Result<MinifigVariant, MinifigError>> {
      try {
        const variant = await variantRepo.insert({
          userId,
          archetypeId: null,
          name: input.name ?? null,
          legoNumber: input.legoNumber ?? null,
          theme: input.theme ?? null,
          subtheme: input.subtheme ?? null,
          year: input.year ?? null,
          cmfSeries: input.cmfSeries ?? null,
          imageUrl: input.imageUrl ?? null,
          weight: input.weight ?? null,
          dimensions: input.dimensions ?? null,
          partsCount: input.partsCount ?? null,
          parts: input.parts ?? null,
          appearsInSets: input.appearsInSets ?? null,
        })
        return ok(variant)
      } catch (error) {
        console.error('Failed to create minifig variant:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Find variant by lego number, or create it if it doesn't exist.
     * Used by scrapers to avoid duplicates.
     */
    async getOrCreateVariant(
      userId: string,
      legoNumber: string,
      input: {
        name?: string
        theme?: string
        subtheme?: string
        year?: number
        cmfSeries?: string
        imageUrl?: string
        weight?: string
        dimensions?: string
        partsCount?: number
        parts?: MinifigPart[]
        appearsInSets?: AppearsInSet[]
      },
    ): Promise<Result<MinifigVariant, MinifigError>> {
      const existing = await variantRepo.findByLegoNumber(userId, legoNumber)
      if (existing.ok) return existing
      return this.createVariant(userId, { ...input, legoNumber })
    },
  }
}

export type MinifigsService = ReturnType<typeof createMinifigsService>
