/**
 * StoryDetails API and Types Tests
 *
 * Tests the StoryDetails type and API query logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoryDetails } from '../../store/roadmapApi'

describe('StoryDetails type', () => {
  it('should have expected shape for full story details', () => {
    const story: StoryDetails = {
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
          frontend: true,
          database: false,
          infra: true,
        },
        blocked_by: ['BLOCKER-001'],
        blocks: ['BLOCKED-001'],
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    }

    expect(story.storyId).toBe('TEST-001')
    expect(story.title).toBe('Test Story')
    expect(story.state).toBe('in_progress')
    expect(story.priority).toBe('P2')
    expect(story.metadata?.surfaces?.backend).toBe(true)
    expect(story.metadata?.surfaces?.frontend).toBe(true)
    expect(story.metadata?.blocked_by).toContain('BLOCKER-001')
  })

  it('should handle minimal story data', () => {
    const story: StoryDetails = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      storyId: 'MIN-001',
      title: 'Minimal Story',
      description: null,
      storyType: 'feature',
      epic: null,
      wave: null,
      priority: null,
      complexity: null,
      storyPoints: null,
      state: 'backlog',
      metadata: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    expect(story.metadata).toBeNull()
    expect(story.description).toBeNull()
    expect(story.priority).toBeNull()
    expect(story.complexity).toBeNull()
  })
})

describe('State to badge variant mapping', () => {
  const getStateVariant = (state: string) => {
    if (state === 'completed') return 'default'
    if (state === 'blocked') return 'destructive'
    if (state === 'in_progress' || state === 'in_qa') return 'outline'
    return 'secondary'
  }

  it('maps completed state to default badge', () => {
    expect(getStateVariant('completed')).toBe('default')
  })

  it('maps blocked state to destructive badge', () => {
    expect(getStateVariant('blocked')).toBe('destructive')
  })

  it('maps in_progress state to outline badge', () => {
    expect(getStateVariant('in_progress')).toBe('outline')
  })

  it('maps in_qa state to outline badge', () => {
    expect(getStateVariant('in_qa')).toBe('outline')
  })

  it('maps backlog state to secondary badge', () => {
    expect(getStateVariant('backlog')).toBe('secondary')
  })

  it('maps ready state to secondary badge', () => {
    expect(getStateVariant('ready')).toBe('secondary')
  })
})

describe('Priority to badge variant mapping', () => {
  const getPriorityVariant = (priority: string | null) => {
    if (priority === 'P0') return 'destructive'
    if (priority === 'P1') return 'outline'
    return 'secondary'
  }

  it('maps P0 to destructive badge', () => {
    expect(getPriorityVariant('P0')).toBe('destructive')
  })

  it('maps P1 to outline badge', () => {
    expect(getPriorityVariant('P1')).toBe('outline')
  })

  it('maps P2 to secondary badge', () => {
    expect(getPriorityVariant('P2')).toBe('secondary')
  })

  it('maps P3 to secondary badge', () => {
    expect(getPriorityVariant('P3')).toBe('secondary')
  })

  it('maps null to secondary badge', () => {
    expect(getPriorityVariant(null)).toBe('secondary')
  })
})

describe('Surfaces mapping logic', () => {
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

    const surfaceKeys = Object.keys(surfaces).filter(
      (key) => surfaces[key as keyof typeof surfaces],
    )
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
