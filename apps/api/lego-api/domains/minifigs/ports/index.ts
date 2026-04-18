import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { MinifigInstance, MinifigArchetype, MinifigVariant } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────
// Minifig Instance Repository
// ─────────────────────────────────────────────────────────────────────────

export interface MinifigInstanceRepository {
  findById(id: string): Promise<Result<MinifigInstance, 'NOT_FOUND'>>

  findByUserId(
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
  ): Promise<PaginatedResult<MinifigInstance>>

  insert(
    data: Omit<MinifigInstance, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'variant'>,
  ): Promise<MinifigInstance>

  update(id: string, data: Record<string, unknown>): Promise<Result<MinifigInstance, 'NOT_FOUND'>>

  delete(id: string): Promise<Result<void, 'NOT_FOUND'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Minifig Archetype Repository
// ─────────────────────────────────────────────────────────────────────────

export interface MinifigArchetypeRepository {
  findAll(userId: string, search?: string): Promise<MinifigArchetype[]>
  findById(id: string): Promise<Result<MinifigArchetype, 'NOT_FOUND'>>
  insert(data: Omit<MinifigArchetype, 'id' | 'createdAt' | 'updatedAt'>): Promise<MinifigArchetype>
}

// ─────────────────────────────────────────────────────────────────────────
// Minifig Variant Repository
// ─────────────────────────────────────────────────────────────────────────

export interface MinifigVariantRepository {
  findAll(
    userId: string,
    filters?: { archetypeId?: string; search?: string },
  ): Promise<MinifigVariant[]>
  findById(id: string): Promise<Result<MinifigVariant, 'NOT_FOUND'>>
  findByLegoNumber(userId: string, legoNumber: string): Promise<Result<MinifigVariant, 'NOT_FOUND'>>
  insert(data: Omit<MinifigVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<MinifigVariant>
  update(id: string, data: Record<string, unknown>): Promise<Result<MinifigVariant, 'NOT_FOUND'>>
}
