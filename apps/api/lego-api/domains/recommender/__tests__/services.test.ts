import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRecommenderService, scoreParts, computeScore } from '../application/services.js'
import type { ConceptSignals, ScoringWeights } from '../types.js'
import { DEFAULT_SCORING_WEIGHTS } from '../types.js'
import type { AIProvider, PartsSearchProvider, BuildProjectRepository, SearchablePart } from '../ports/index.js'

// ─────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────

function createMockAIProvider(): AIProvider {
  return {
    expandConcept: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        colors: ['dark red', 'orange'],
        categories: ['headgear', 'cape', 'staff'],
        accessoryTypes: ['staff', 'wand'],
        styleDescriptors: ['magical', 'sinister'],
        relatedThemes: ['Castle', 'Harry Potter'],
      },
    }),
    explainParts: vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { partNumber: '3001', color: 'Dark Red', explanation: 'Matches fire mage color palette' },
      ],
    }),
  }
}

function createMockPartsSearch(): PartsSearchProvider {
  return {
    searchCollection: vi.fn().mockResolvedValue([]),
    searchWishlist: vi.fn().mockResolvedValue([]),
    searchExternal: vi.fn().mockResolvedValue([]),
    findDonorMinifigs: vi.fn().mockResolvedValue([]),
  }
}

function createMockProjectRepo(): BuildProjectRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: false, error: 'NOT_FOUND' }),
    findByUserId: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      name: 'Fire Mage',
      concept: 'fire mage',
      searchSignals: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      parts: [],
    }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  }
}

function makePart(overrides: Partial<SearchablePart> = {}): SearchablePart {
  return {
    partNumber: '3001',
    partName: 'Brick 2 x 4',
    color: 'Red',
    category: null,
    theme: null,
    tags: [],
    imageUrl: null,
    source: 'collection',
    ...overrides,
  }
}

const FIRE_MAGE_SIGNALS: ConceptSignals = {
  colors: ['dark red', 'orange', 'black'],
  categories: ['headgear', 'cape', 'staff', 'torso'],
  accessoryTypes: ['staff', 'wand'],
  styleDescriptors: ['magical', 'sinister'],
  relatedThemes: ['Castle', 'Harry Potter'],
}

// ─────────────────────────────────────────────────────────────────────────
// Scoring Tests (pure functions)
// ─────────────────────────────────────────────────────────────────────────

describe('computeScore', () => {
  it('scores 0 for an external part with no matches', () => {
    const part = makePart({ color: 'White', partName: 'Tile 1 x 1', source: 'external' })
    const { score, reasons } = computeScore(part, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    expect(score).toBe(0)
    expect(reasons).toHaveLength(0)
  })

  it('gives owned parts availability bonus even with no signal matches', () => {
    const part = makePart({ color: 'White', partName: 'Tile 1 x 1', source: 'collection' })
    const { score, reasons } = computeScore(part, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    expect(score).toBe(DEFAULT_SCORING_WEIGHTS.availabilityBonus)
    expect(reasons).toContain('owned')
  })

  it('scores higher for color match', () => {
    const part = makePart({ color: 'Dark Red' })
    const { score, reasons } = computeScore(part, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    expect(score).toBeGreaterThan(0)
    expect(reasons).toContain('color: Dark Red')
  })

  it('scores higher for category match', () => {
    const part = makePart({ category: 'headgear' })
    const { score, reasons } = computeScore(part, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    expect(score).toBeGreaterThan(0)
    expect(reasons).toContain('category: headgear')
  })

  it('scores higher for theme match', () => {
    const part = makePart({ theme: 'Castle' })
    const { score, reasons } = computeScore(part, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    expect(score).toBeGreaterThan(0)
    expect(reasons).toContain('theme: Castle')
  })

  it('adds availability bonus for collection parts', () => {
    const collectionPart = makePart({ source: 'collection', color: 'Dark Red' })
    const externalPart = makePart({ source: 'external', color: 'Dark Red' })

    const collectionResult = computeScore(collectionPart, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    const externalResult = computeScore(externalPart, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)

    expect(collectionResult.score).toBeGreaterThan(externalResult.score)
    expect(collectionResult.reasons).toContain('owned')
  })

  it('adds partial availability bonus for wishlist parts', () => {
    const wishlistPart = makePart({ source: 'wishlist', color: 'Dark Red' })
    const externalPart = makePart({ source: 'external', color: 'Dark Red' })

    const wishlistResult = computeScore(wishlistPart, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    const externalResult = computeScore(externalPart, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)

    expect(wishlistResult.score).toBeGreaterThan(externalResult.score)
  })

  it('scores name match against categories and style descriptors', () => {
    const part = makePart({ partName: 'Magical Staff with Flame' })
    const { score, reasons } = computeScore(part, FIRE_MAGE_SIGNALS, DEFAULT_SCORING_WEIGHTS)
    expect(score).toBeGreaterThan(0)
    expect(reasons).toContain('name match')
  })

  it('respects custom weights', () => {
    const part = makePart({ color: 'Dark Red', category: 'headgear' })
    const colorHeavy: ScoringWeights = {
      ...DEFAULT_SCORING_WEIGHTS,
      colorMatch: 0.9,
      categoryMatch: 0.01,
    }
    const categoryHeavy: ScoringWeights = {
      ...DEFAULT_SCORING_WEIGHTS,
      colorMatch: 0.01,
      categoryMatch: 0.9,
    }

    const colorResult = computeScore(part, FIRE_MAGE_SIGNALS, colorHeavy)
    const categoryResult = computeScore(part, FIRE_MAGE_SIGNALS, categoryHeavy)

    // Both should have similar total scores since both match,
    // but the weight distribution should differ
    expect(colorResult.score).not.toEqual(categoryResult.score)
  })
})

describe('scoreParts', () => {
  it('returns parts sorted by score descending', () => {
    const parts: SearchablePart[] = [
      makePart({ partNumber: 'low', color: 'White', partName: 'Tile' }),
      makePart({ partNumber: 'high', color: 'Dark Red', category: 'headgear', theme: 'Castle' }),
      makePart({ partNumber: 'mid', color: 'Orange' }),
    ]

    const scored = scoreParts(parts, FIRE_MAGE_SIGNALS)
    expect(scored[0].partNumber).toBe('high')
    expect(scored[scored.length - 1].partNumber).toBe('low')
  })

  it('is deterministic — same input produces same output', () => {
    const parts: SearchablePart[] = [
      makePart({ partNumber: 'a', color: 'Dark Red' }),
      makePart({ partNumber: 'b', color: 'Orange' }),
      makePart({ partNumber: 'c', color: 'Black', category: 'cape' }),
    ]

    const result1 = scoreParts(parts, FIRE_MAGE_SIGNALS)
    const result2 = scoreParts(parts, FIRE_MAGE_SIGNALS)

    expect(result1.map(p => p.partNumber)).toEqual(result2.map(p => p.partNumber))
    expect(result1.map(p => p.score)).toEqual(result2.map(p => p.score))
  })

  it('includes matchReasons for each scored part', () => {
    const parts: SearchablePart[] = [
      makePart({ color: 'Dark Red', category: 'headgear' }),
    ]

    const scored = scoreParts(parts, FIRE_MAGE_SIGNALS)
    expect(scored[0].matchReasons.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Service Tests
// ─────────────────────────────────────────────────────────────────────────

describe('RecommenderService', () => {
  let service: ReturnType<typeof createRecommenderService>
  let mockAI: ReturnType<typeof createMockAIProvider>
  let mockSearch: ReturnType<typeof createMockPartsSearch>
  let mockRepo: ReturnType<typeof createMockProjectRepo>

  beforeEach(() => {
    mockAI = createMockAIProvider()
    mockSearch = createMockPartsSearch()
    mockRepo = createMockProjectRepo()
    service = createRecommenderService({
      aiProvider: mockAI,
      partsSearch: mockSearch,
      projectRepo: mockRepo,
    })
  })

  describe('expandConcept', () => {
    it('returns concept signals on success', async () => {
      const result = await service.expandConcept('fire mage')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.colors).toContain('dark red')
        expect(result.data.categories).toContain('headgear')
      }
    })

    it('returns error when AI fails', async () => {
      mockAI.expandConcept = vi.fn().mockResolvedValue({
        ok: false,
        error: 'AI_EXPANSION_FAILED',
      })

      const result = await service.expandConcept('fire mage')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('AI_EXPANSION_FAILED')
      }
    })
  })

  describe('searchParts', () => {
    it('searches all three sources in parallel', async () => {
      const userId = 'user-1'
      const signals = FIRE_MAGE_SIGNALS

      await service.searchParts(userId, signals)

      expect(mockSearch.searchCollection).toHaveBeenCalledWith(userId, signals)
      expect(mockSearch.searchWishlist).toHaveBeenCalledWith(userId, signals)
      expect(mockSearch.searchExternal).toHaveBeenCalledWith(userId, signals)
    })

    it('returns grouped and scored results', async () => {
      mockSearch.searchCollection = vi.fn().mockResolvedValue([
        makePart({ color: 'Dark Red', source: 'collection' }),
      ])
      mockSearch.searchWishlist = vi.fn().mockResolvedValue([
        makePart({ color: 'Orange', source: 'wishlist' }),
      ])
      mockSearch.searchExternal = vi.fn().mockResolvedValue([
        makePart({ color: 'Black', category: 'cape', source: 'external' }),
      ])

      const result = await service.searchParts('user-1', FIRE_MAGE_SIGNALS)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.collection).toHaveLength(1)
        expect(result.data.wishlist).toHaveLength(1)
        expect(result.data.external).toHaveLength(1)
        expect(result.data.totalResults).toBe(3)
      }
    })

    it('respects limit parameter', async () => {
      const manyParts = Array.from({ length: 50 }, (_, i) =>
        makePart({ partNumber: `part-${i}`, color: 'Dark Red', source: 'collection' }),
      )
      mockSearch.searchCollection = vi.fn().mockResolvedValue(manyParts)

      const result = await service.searchParts('user-1', FIRE_MAGE_SIGNALS, 5)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.collection).toHaveLength(5)
      }
    })

    it('returns empty results when no parts match', async () => {
      const result = await service.searchParts('user-1', FIRE_MAGE_SIGNALS)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.collection).toHaveLength(0)
        expect(result.data.wishlist).toHaveLength(0)
        expect(result.data.external).toHaveLength(0)
        expect(result.data.totalResults).toBe(0)
      }
    })
  })

  describe('explainParts', () => {
    it('generates explanations for parts', async () => {
      const result = await service.explainParts('fire mage', [
        {
          partNumber: '3001',
          partName: 'Brick',
          color: 'Dark Red',
          category: null,
          source: 'collection',
          matchReasons: ['color: Dark Red'],
        },
      ])
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].explanation).toBeTruthy()
      }
    })

    it('returns error when AI fails', async () => {
      mockAI.explainParts = vi.fn().mockResolvedValue({
        ok: false,
        error: 'AI_EXPLANATION_FAILED',
      })

      const result = await service.explainParts('fire mage', [])
      expect(result.ok).toBe(false)
    })
  })

  describe('Build Projects', () => {
    it('creates a project', async () => {
      const result = await service.createProject('user-1', {
        name: 'Fire Mage',
        concept: 'fire mage',
        parts: [],
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.name).toBe('Fire Mage')
      }
      expect(mockRepo.insert).toHaveBeenCalledWith('user-1', expect.objectContaining({
        name: 'Fire Mage',
        concept: 'fire mage',
      }))
    })

    it('lists projects for a user', async () => {
      mockRepo.findByUserId = vi.fn().mockResolvedValue([
        { id: 'p1', name: 'Fire Mage', concept: 'fire mage' },
      ])

      const result = await service.listProjects('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
      }
    })

    it('gets a project by id', async () => {
      mockRepo.findById = vi.fn().mockResolvedValue({
        ok: true,
        data: { id: 'p1', name: 'Fire Mage', parts: [] },
      })

      const result = await service.getProject('p1')
      expect(result.ok).toBe(true)
    })

    it('returns NOT_FOUND for missing project', async () => {
      const result = await service.getProject('nonexistent')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('NOT_FOUND')
    })

    it('deletes a project', async () => {
      const result = await service.deleteProject('p1')
      expect(result.ok).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// AI Provider Stub Tests
// ─────────────────────────────────────────────────────────────────────────

describe('StubAIProvider', () => {
  let stub: AIProvider

  beforeEach(async () => {
    const { createStubAIProvider } = await import('../adapters/ai-provider-stub.js')
    stub = createStubAIProvider()
  })

  it('expands "fire mage" into relevant signals', async () => {
    const result = await stub.expandConcept('fire mage')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.colors.length).toBeGreaterThan(0)
      expect(result.data.categories.length).toBeGreaterThan(0)
      // Fire should trigger warm colors
      expect(result.data.colors.some(c => c.includes('red') || c.includes('orange'))).toBe(true)
      // Mage should trigger magic-related categories
      expect(result.data.categories.some(c => ['headgear', 'cape', 'staff', 'wand'].includes(c))).toBe(true)
    }
  })

  it('expands "forest ranger" into relevant signals', async () => {
    const result = await stub.expandConcept('forest ranger')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.colors.some(c => c.includes('green') || c.includes('brown'))).toBe(true)
      expect(result.data.categories.some(c => ['bow', 'headgear', 'cape'].includes(c))).toBe(true)
    }
  })

  it('handles unknown concepts with defaults', async () => {
    const result = await stub.expandConcept('bioluminescent deep sea diver')
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Should still return valid signals, even if generic
      expect(result.data.colors.length).toBeGreaterThan(0)
      expect(result.data.categories.length).toBeGreaterThan(0)
    }
  })

  it('generates template explanations', async () => {
    const result = await stub.explainParts('fire mage', [
      {
        partNumber: '3001',
        partName: 'Hood',
        color: 'Dark Red',
        category: 'headgear',
        source: 'collection',
        matchReasons: ['color: Dark Red'],
      },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].explanation).toContain('fire mage')
      expect(result.data[0].explanation).toContain('own this part')
    }
  })
})
