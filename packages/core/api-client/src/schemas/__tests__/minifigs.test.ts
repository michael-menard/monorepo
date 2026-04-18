import { describe, it, expect } from 'vitest'

import {
  MinifigStatusSchema,
  MinifigConditionSchema,
  MinifigSourceTypeSchema,
  MinifigPartSchema,
  AppearsInSetSchema,
  MinifigArchetypeSchema,
  MinifigVariantSchema,
  MinifigInstanceSchema,
  MinifigListResponseSchema,
  MinifigListQuerySchema,
  UpdateMinifigInstanceSchema,
} from '../minifigs'

describe('Minifig Schemas', () => {
  // ─────────────────────────────────────────────────────────────────────
  // Enums
  // ─────────────────────────────────────────────────────────────────────

  describe('MinifigStatusSchema', () => {
    it('accepts owned and wanted', () => {
      expect(MinifigStatusSchema.parse('owned')).toBe('owned')
      expect(MinifigStatusSchema.parse('wanted')).toBe('wanted')
    })

    it('rejects invalid values', () => {
      expect(() => MinifigStatusSchema.parse('parted_out')).toThrow()
      expect(() => MinifigStatusSchema.parse('')).toThrow()
    })
  })

  describe('MinifigConditionSchema', () => {
    it('accepts valid conditions', () => {
      expect(MinifigConditionSchema.parse('new_sealed')).toBe('new_sealed')
      expect(MinifigConditionSchema.parse('built')).toBe('built')
      expect(MinifigConditionSchema.parse('parted_out')).toBe('parted_out')
    })

    it('rejects invalid values', () => {
      expect(() => MinifigConditionSchema.parse('mint')).toThrow()
      expect(() => MinifigConditionSchema.parse('used')).toThrow()
    })
  })

  describe('MinifigSourceTypeSchema', () => {
    it('accepts all valid source types', () => {
      const validTypes = ['set', 'cmf_pack', 'bricklink', 'bulk_lot', 'trade', 'gift', 'custom']
      for (const type of validTypes) {
        expect(MinifigSourceTypeSchema.parse(type)).toBe(type)
      }
    })

    it('rejects invalid values', () => {
      expect(() => MinifigSourceTypeSchema.parse('ebay')).toThrow()
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // JSONB Schemas
  // ─────────────────────────────────────────────────────────────────────

  describe('MinifigPartSchema', () => {
    it('accepts valid part data', () => {
      const result = MinifigPartSchema.parse({
        partNumber: '3626cpb1234',
        name: 'Head with Smile',
        color: 'Yellow',
        quantity: 1,
        position: 'head',
      })
      expect(result.partNumber).toBe('3626cpb1234')
      expect(result.position).toBe('head')
    })

    it('accepts part without position', () => {
      const result = MinifigPartSchema.parse({
        partNumber: '3837',
        name: 'Bow',
        color: 'Brown',
        quantity: 1,
      })
      expect(result.position).toBeUndefined()
    })

    it('rejects missing required fields', () => {
      expect(() => MinifigPartSchema.parse({ partNumber: '123' })).toThrow()
    })
  })

  describe('AppearsInSetSchema', () => {
    it('accepts valid set reference', () => {
      const result = AppearsInSetSchema.parse({
        setNumber: '6077-1',
        name: 'Forestmen River Fortress',
        imageUrl: 'https://example.com/6077.jpg',
      })
      expect(result.setNumber).toBe('6077-1')
    })

    it('accepts without imageUrl', () => {
      const result = AppearsInSetSchema.parse({
        setNumber: '6077-1',
        name: 'Forestmen River Fortress',
      })
      expect(result.imageUrl).toBeUndefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Archetype
  // ─────────────────────────────────────────────────────────────────────

  describe('MinifigArchetypeSchema', () => {
    it('accepts valid archetype', () => {
      const result = MinifigArchetypeSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        name: 'Forestman',
        description: 'Classic Castle theme character',
        imageUrl: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(result.name).toBe('Forestman')
    })

    it('accepts null description and imageUrl', () => {
      const result = MinifigArchetypeSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        name: 'Stormtrooper',
        description: null,
        imageUrl: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(result.description).toBeNull()
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Variant
  // ─────────────────────────────────────────────────────────────────────

  describe('MinifigVariantSchema', () => {
    it('accepts valid variant with parts', () => {
      const result = MinifigVariantSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        archetypeId: '660e8400-e29b-41d4-a716-446655440000',
        name: 'Forestman - Green Hat',
        legoNumber: 'cas002',
        theme: 'Castle',
        subtheme: 'Forestmen',
        year: 1990,
        cmfSeries: null,
        imageUrl: 'https://example.com/cas002.jpg',
        weight: '5.2g',
        dimensions: '4.0 x 1.6 x 1.3 cm',
        partsCount: 4,
        parts: [
          { partNumber: '3626', name: 'Head', color: 'Yellow', quantity: 1, position: 'head' },
          { partNumber: '973', name: 'Torso', color: 'Green', quantity: 1, position: 'torso' },
        ],
        appearsInSets: [
          { setNumber: '6077-1', name: 'Forestmen River Fortress' },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(result.legoNumber).toBe('cas002')
      expect(result.parts).toHaveLength(2)
      expect(result.appearsInSets).toHaveLength(1)
    })

    it('accepts variant with all nullable fields as null', () => {
      const result = MinifigVariantSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        archetypeId: null,
        name: null,
        legoNumber: null,
        theme: null,
        subtheme: null,
        year: null,
        cmfSeries: null,
        imageUrl: null,
        weight: null,
        dimensions: null,
        partsCount: null,
        parts: null,
        appearsInSets: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(result.parts).toBeNull()
      expect(result.appearsInSets).toBeNull()
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Instance
  // ─────────────────────────────────────────────────────────────────────

  describe('MinifigInstanceSchema', () => {
    const validInstance = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-1',
      variantId: '660e8400-e29b-41d4-a716-446655440000',
      displayName: 'Forestman - Green Hat',
      status: 'owned',
      condition: 'built',
      sourceType: 'set',
      sourceSetId: '770e8400-e29b-41d4-a716-446655440000',
      isCustom: false,
      purchasePrice: '12.99',
      purchaseTax: '1.04',
      purchaseShipping: null,
      purchaseDate: '2026-01-15T00:00:00.000Z',
      purpose: 'Castle MOC army',
      plannedUse: 'Display in Forestmen scene',
      notes: 'Good condition',
      imageUrl: null,
      sortOrder: null,
      tags: ['forestmen', 'castle'],
      variant: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    it('accepts valid instance', () => {
      const result = MinifigInstanceSchema.parse(validInstance)
      expect(result.displayName).toBe('Forestman - Green Hat')
      expect(result.status).toBe('owned')
      expect(result.condition).toBe('built')
      expect(result.tags).toEqual(['forestmen', 'castle'])
    })

    it('accepts wanted status with null condition', () => {
      const result = MinifigInstanceSchema.parse({
        ...validInstance,
        status: 'wanted',
        condition: null,
      })
      expect(result.status).toBe('wanted')
      expect(result.condition).toBeNull()
    })

    it('rejects invalid status', () => {
      expect(() =>
        MinifigInstanceSchema.parse({ ...validInstance, status: 'parted_out' }),
      ).toThrow()
    })

    it('rejects invalid condition', () => {
      expect(() =>
        MinifigInstanceSchema.parse({ ...validInstance, condition: 'used' }),
      ).toThrow()
    })

    it('accepts instance with embedded variant', () => {
      const result = MinifigInstanceSchema.parse({
        ...validInstance,
        variant: {
          id: '660e8400-e29b-41d4-a716-446655440000',
          userId: 'user-1',
          archetypeId: null,
          name: 'Forestman',
          legoNumber: 'cas002',
          theme: 'Castle',
          subtheme: null,
          year: 1990,
          cmfSeries: null,
          imageUrl: null,
          weight: null,
          dimensions: null,
          partsCount: 4,
          parts: [],
          appearsInSets: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      })
      expect(result.variant?.legoNumber).toBe('cas002')
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // List Response
  // ─────────────────────────────────────────────────────────────────────

  describe('MinifigListResponseSchema', () => {
    it('accepts valid list response', () => {
      const result = MinifigListResponseSchema.parse({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      })
      expect(result.items).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Query Schema
  // ─────────────────────────────────────────────────────────────────────

  describe('MinifigListQuerySchema', () => {
    it('applies defaults', () => {
      const result = MinifigListQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.sort).toBe('createdAt')
      expect(result.order).toBe('desc')
    })

    it('coerces string page/limit to numbers', () => {
      const result = MinifigListQuerySchema.parse({ page: '3', limit: '50' })
      expect(result.page).toBe(3)
      expect(result.limit).toBe(50)
    })

    it('rejects page < 1', () => {
      expect(() => MinifigListQuerySchema.parse({ page: 0 })).toThrow()
    })

    it('rejects limit > 100', () => {
      expect(() => MinifigListQuerySchema.parse({ limit: 101 })).toThrow()
    })

    it('accepts all filter params', () => {
      const result = MinifigListQuerySchema.parse({
        search: 'forest',
        status: 'owned',
        condition: 'built',
        sourceType: 'set',
        sort: 'displayName',
        order: 'asc',
      })
      expect(result.search).toBe('forest')
      expect(result.status).toBe('owned')
      expect(result.condition).toBe('built')
    })

    it('rejects invalid sort field', () => {
      expect(() => MinifigListQuerySchema.parse({ sort: 'invalid' })).toThrow()
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Update Schema
  // ─────────────────────────────────────────────────────────────────────

  describe('UpdateMinifigInstanceSchema', () => {
    it('accepts partial update', () => {
      const result = UpdateMinifigInstanceSchema.parse({
        displayName: 'Updated Name',
        condition: 'parted_out',
      })
      expect(result.displayName).toBe('Updated Name')
      expect(result.condition).toBe('parted_out')
    })

    it('accepts empty object (no fields to update)', () => {
      const result = UpdateMinifigInstanceSchema.parse({})
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('accepts null for nullable fields', () => {
      const result = UpdateMinifigInstanceSchema.parse({
        condition: null,
        sourceType: null,
        purchasePrice: null,
        notes: null,
      })
      expect(result.condition).toBeNull()
      expect(result.sourceType).toBeNull()
    })

    it('rejects displayName over 200 chars', () => {
      expect(() =>
        UpdateMinifigInstanceSchema.parse({ displayName: 'x'.repeat(201) }),
      ).toThrow()
    })

    it('rejects notes over 5000 chars', () => {
      expect(() =>
        UpdateMinifigInstanceSchema.parse({ notes: 'x'.repeat(5001) }),
      ).toThrow()
    })

    it('rejects tags array over 20 items', () => {
      expect(() =>
        UpdateMinifigInstanceSchema.parse({
          tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
        }),
      ).toThrow()
    })
  })
})
