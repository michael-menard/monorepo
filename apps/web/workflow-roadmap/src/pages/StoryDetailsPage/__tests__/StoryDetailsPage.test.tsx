/**
 * StoryDetails API and Types Tests
 *
 * Tests the StoryDetails type and API query logic
 */

import { describe, it, expect } from 'vitest'
import type { StoryDetails } from '../../../store/roadmapApi'

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
      blockedReason: null,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: null,
      tags: ['surface:backend', 'surface:frontend', 'auth'],
      experimentVariant: null,
      outcome: null,
      contentSections: [],
      stateHistory: [],
      currentWorkState: null,
      linkedPlans: [],
      dependencies: [{ dependsOnId: 'BLOCKER-001', dependencyType: 'blocked_by', dependsOnState: 'in_progress' }],
      blockedByIds: ['BLOCKER-001'],
      blocksIds: [],
      branch: 'story/TEST-001',
      worktreePath: 'tree/story/TEST-001',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      elaboration: null,
      evidence: null,
      qaGate: null,
      review: null,
      verification: null,
    }

    expect(story.storyId).toBe('TEST-001')
    expect(story.title).toBe('Test Story')
    expect(story.state).toBe('in_progress')
    expect(story.priority).toBe('P2')
    expect(story.tags).toContain('surface:backend')
    expect(story.tags).toContain('surface:frontend')
    expect(story.dependencies[0].dependsOnId).toBe('BLOCKER-001')
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
      blockedReason: null,
      startedAt: null,
      completedAt: null,
      tags: null,
      experimentVariant: null,
      outcome: null,
      contentSections: [],
      stateHistory: [],
      currentWorkState: null,
      linkedPlans: [],
      dependencies: [],
      blockedByIds: [],
      blocksIds: [],
      branch: null,
      worktreePath: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      elaboration: null,
      evidence: null,
      qaGate: null,
      review: null,
      verification: null,
    }

    expect(story.tags).toBeNull()
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

describe('Tags surface convention', () => {
  const getSurfaces = (tags: string[] | null) =>
    (tags ?? []).filter(t => t.startsWith('surface:')).map(t => t.slice('surface:'.length))

  it('extracts surface tags from tag array', () => {
    const tags = ['surface:backend', 'surface:frontend', 'auth']
    const surfaces = getSurfaces(tags)
    expect(surfaces).toContain('backend')
    expect(surfaces).toContain('frontend')
    expect(surfaces).not.toContain('auth')
  })

  it('returns empty array when no surface tags', () => {
    const tags = ['auth', 'payments']
    expect(getSurfaces(tags)).toHaveLength(0)
  })

  it('handles null tags', () => {
    expect(getSurfaces(null)).toHaveLength(0)
  })
})

describe('Dependencies mapping', () => {
  it('filters blocked_by dependencies', () => {
    const dependencies = [
      { dependsOnId: 'BLOCKER-001', dependencyType: 'blocked_by', dependsOnState: 'in_progress' },
      { dependsOnId: 'BLOCKS-001', dependencyType: 'blocks', dependsOnState: 'completed' },
    ]
    const blockers = dependencies.filter(d => d.dependencyType === 'blocked_by')
    expect(blockers).toHaveLength(1)
    expect(blockers[0].dependsOnId).toBe('BLOCKER-001')
  })

  it('handles empty dependencies', () => {
    const dependencies: Array<{ dependsOnId: string; dependencyType: string }> = []
    const blockers = dependencies.filter(d => d.dependencyType === 'blocked_by')
    expect(blockers).toHaveLength(0)
  })
})

describe('Cancel story button visibility', () => {
  const shouldShowCancelButton = (state: string) =>
    state !== 'cancelled' && state !== 'completed' && state !== 'UAT'

  it('shows cancel button for in_progress stories', () => {
    expect(shouldShowCancelButton('in_progress')).toBe(true)
  })

  it('shows cancel button for backlog stories', () => {
    expect(shouldShowCancelButton('backlog')).toBe(true)
  })

  it('shows cancel button for ready stories', () => {
    expect(shouldShowCancelButton('ready')).toBe(true)
  })

  it('shows cancel button for blocked stories', () => {
    expect(shouldShowCancelButton('blocked')).toBe(true)
  })

  it('hides cancel button for cancelled stories', () => {
    expect(shouldShowCancelButton('cancelled')).toBe(false)
  })

  it('hides cancel button for completed stories', () => {
    expect(shouldShowCancelButton('completed')).toBe(false)
  })

  it('hides cancel button for UAT stories', () => {
    expect(shouldShowCancelButton('UAT')).toBe(false)
  })
})

describe('Cancel story confirmation description', () => {
  const getCancelDescription = (storyId: string, blocksIds: string[]) =>
    blocksIds.length > 0
      ? `This will cancel ${storyId}. The following stories depend on it and may be impacted: ${blocksIds.join(', ')}.`
      : `Are you sure you want to cancel ${storyId}? This action cannot be easily undone.`

  it('shows simple message when no downstream stories', () => {
    const desc = getCancelDescription('TEST-001', [])
    expect(desc).toBe('Are you sure you want to cancel TEST-001? This action cannot be easily undone.')
  })

  it('warns about single downstream story', () => {
    const desc = getCancelDescription('TEST-001', ['DEP-001'])
    expect(desc).toContain('DEP-001')
    expect(desc).toContain('depend on it')
  })

  it('warns about multiple downstream stories', () => {
    const desc = getCancelDescription('TEST-001', ['DEP-001', 'DEP-002', 'DEP-003'])
    expect(desc).toContain('DEP-001, DEP-002, DEP-003')
    expect(desc).toContain('This will cancel TEST-001')
  })
})
