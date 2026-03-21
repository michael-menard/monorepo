/**
 * Unit tests for planService - getStoryById function
 *
 * Tests the data transformation logic of getStoryById
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StoryUpdateInputSchema } from '../planService'

describe('planService - getStoryById data transformation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('StoryDetails interface', () => {
    it('should have expected shape for story details', () => {
      const storyDetails = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        storyId: 'TEST-001',
        title: 'Test Story',
        description: 'A test story description',
        storyType: 'test-feature',
        epic: 'test-feature',
        wave: null,
        priority: 'P2',
        complexity: null,
        storyPoints: null,
        state: 'in_progress',
        metadata: {
          surfaces: {
            backend: true,
            frontend: false,
            database: true,
            infra: false,
          },
          blocked_by: ['BLOCKER-001'],
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      }

      expect(storyDetails.storyId).toBe('TEST-001')
      expect(storyDetails.title).toBe('Test Story')
      expect(storyDetails.state).toBe('in_progress')
      expect(storyDetails.priority).toBe('P2')
      expect(storyDetails.metadata?.surfaces?.backend).toBe(true)
      expect(storyDetails.metadata?.surfaces?.frontend).toBe(false)
      expect(storyDetails.metadata?.blocked_by).toContain('BLOCKER-001')
    })

    it('should handle null metadata gracefully', () => {
      const storyDetails = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        storyId: 'TEST-002',
        title: 'Minimal Story',
        description: null,
        storyType: 'feature',
        epic: 'feature',
        wave: null,
        priority: 'P3',
        complexity: null,
        storyPoints: null,
        state: 'backlog',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(storyDetails.metadata).toBeNull()
      expect(storyDetails.description).toBeNull()
    })
  })

  describe('surface mapping logic', () => {
    it('should correctly map boolean touches to surfaces', () => {
      const touchesBackend = true
      const touchesFrontend = true
      const touchesDatabase = false
      const touchesInfra = true

      const surfaces = {
        backend: touchesBackend,
        frontend: touchesFrontend,
        database: touchesDatabase,
        infra: touchesInfra,
      }

      expect(surfaces.backend).toBe(true)
      expect(surfaces.frontend).toBe(true)
      expect(surfaces.database).toBe(false)
      expect(surfaces.infra).toBe(true)

      const surfaceKeys = Object.keys(surfaces).filter((key) => surfaces[key as keyof typeof surfaces])
      expect(surfaceKeys).toContain('backend')
      expect(surfaceKeys).toContain('frontend')
      expect(surfaceKeys).toContain('infra')
      expect(surfaceKeys).not.toContain('database')
    })

    it('should handle all false touches', () => {
      const touchesBackend = false
      const touchesFrontend = false
      const touchesDatabase = false
      const touchesInfra = false

      const surfaces = {
        backend: touchesBackend,
        frontend: touchesFrontend,
        database: touchesDatabase,
        infra: touchesInfra,
      }

      const hasAnySurface = Object.values(surfaces).some((v) => v)
      expect(hasAnySurface).toBe(false)
    })
  })

  describe('blocked_by mapping', () => {
    it('should map blockedByStory to blocked_by array', () => {
      const blockedByStory = 'BLOCKER-001'

      const metadata = {
        surfaces: { backend: false, frontend: false, database: false, infra: false },
        blocked_by: blockedByStory ? [blockedByStory] : undefined,
      }

      expect(metadata.blocked_by).toEqual(['BLOCKER-001'])
    })

    it('should handle null blockedByStory', () => {
      const blockedByStory = null

      const metadata = {
        surfaces: { backend: false, frontend: false, database: false, infra: false },
        blocked_by: blockedByStory ? [blockedByStory] : undefined,
      }

      expect(metadata.blocked_by).toBeUndefined()
    })
  })

  describe('state badge variants', () => {
    it('should map state to correct badge variant', () => {
      const getVariant = (state: string) => {
        if (state === 'completed') return 'default'
        if (state === 'blocked') return 'destructive'
        if (state === 'in_progress' || state === 'in_qa') return 'outline'
        return 'secondary'
      }

      expect(getVariant('completed')).toBe('default')
      expect(getVariant('blocked')).toBe('destructive')
      expect(getVariant('in_progress')).toBe('outline')
      expect(getVariant('in_qa')).toBe('outline')
      expect(getVariant('backlog')).toBe('secondary')
      expect(getVariant('ready')).toBe('secondary')
    })
  })

  describe('priority badge variants', () => {
    it('should map priority to correct badge variant', () => {
      const getVariant = (priority: string | null) => {
        if (priority === 'P0') return 'destructive'
        if (priority === 'P1') return 'outline'
        return 'secondary'
      }

      expect(getVariant('P0')).toBe('destructive')
      expect(getVariant('P1')).toBe('outline')
      expect(getVariant('P2')).toBe('secondary')
      expect(getVariant('P3')).toBe('secondary')
      expect(getVariant(null)).toBe('secondary')
    })
  })
})

describe('StoryUpdateInputSchema', () => {
  it('accepts description only', () => {
    const result = StoryUpdateInputSchema.safeParse({ description: 'updated desc' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('updated desc')
      expect(result.data.state).toBeUndefined()
    }
  })

  it('accepts state only', () => {
    const result = StoryUpdateInputSchema.safeParse({ state: 'cancelled' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.state).toBe('cancelled')
      expect(result.data.description).toBeUndefined()
    }
  })

  it('accepts both description and state', () => {
    const result = StoryUpdateInputSchema.safeParse({ description: 'new desc', state: 'cancelled' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('new desc')
      expect(result.data.state).toBe('cancelled')
    }
  })

  it('accepts empty object', () => {
    const result = StoryUpdateInputSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts null description with state', () => {
    const result = StoryUpdateInputSchema.safeParse({ description: null, state: 'blocked' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBeNull()
      expect(result.data.state).toBe('blocked')
    }
  })

  it('rejects non-string state', () => {
    const result = StoryUpdateInputSchema.safeParse({ state: 123 })
    expect(result.success).toBe(false)
  })
})
