import { describe, it, expect } from 'vitest'
import {
  StoryArtifactSchema,
  StoryTypeSchema,
  PriorityLevelSchema,
  SurfaceTypeSchema,
  createStoryArtifact,
  updateStoryState,
  setStoryBlocked,
  addAcceptanceCriterion,
  addStoryRisk,
  isStoryBlocked,
  isStoryComplete,
  isStoryWorkable,
  getStoryNextState,
  type StoryArtifact,
} from '../story.js'

describe('StoryArtifactSchema', () => {
  const validStory: StoryArtifact = {
    schema: 1,
    id: 'WISH-001',
    feature: 'wishlist',
    type: 'feature',
    state: 'draft',
    title: 'Add wishlist item',
    points: 3,
    priority: 'medium',
    blocked_by: null,
    depends_on: [],
    follow_up_from: null,
    scope: {
      packages: ['@repo/api-client'],
      surfaces: ['frontend', 'backend'],
    },
    goal: 'Allow users to add items to their wishlist',
    non_goals: ['Edit existing items'],
    acs: [
      {
        id: 'AC-001',
        description: 'User can add item with name and price',
        testable: true,
        automated: false,
      },
    ],
    risks: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  it('should validate a complete story artifact', () => {
    const result = StoryArtifactSchema.safeParse(validStory)
    expect(result.success).toBe(true)
  })

  it('should require story ID to match pattern', () => {
    const invalid = { ...validStory, id: 'invalid' }
    const result = StoryArtifactSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should accept valid story IDs', () => {
    const ids = ['WISH-001', 'AUTH-1234', 'KNOW-0001']
    for (const id of ids) {
      const story = { ...validStory, id }
      const result = StoryArtifactSchema.safeParse(story)
      expect(result.success).toBe(true)
    }
  })

  it('should allow null points', () => {
    const story = { ...validStory, points: null }
    const result = StoryArtifactSchema.safeParse(story)
    expect(result.success).toBe(true)
  })

  it('should validate points within range', () => {
    const valid = { ...validStory, points: 5 }
    expect(StoryArtifactSchema.safeParse(valid).success).toBe(true)

    const tooHigh = { ...validStory, points: 14 }
    expect(StoryArtifactSchema.safeParse(tooHigh).success).toBe(false)

    const tooLow = { ...validStory, points: 0 }
    expect(StoryArtifactSchema.safeParse(tooLow).success).toBe(false)
  })
})

describe('StoryTypeSchema', () => {
  it('should validate all story types', () => {
    const types = [
      'feature',
      'enhancement',
      'bug',
      'tech-debt',
      'spike',
      'infrastructure',
      'documentation',
    ]

    for (const type of types) {
      expect(StoryTypeSchema.safeParse(type).success).toBe(true)
    }
  })
})

describe('PriorityLevelSchema', () => {
  it('should validate all priority levels', () => {
    const levels = ['critical', 'high', 'medium', 'low']

    for (const level of levels) {
      expect(PriorityLevelSchema.safeParse(level).success).toBe(true)
    }
  })
})

describe('SurfaceTypeSchema', () => {
  it('should validate all surface types', () => {
    const surfaces = [
      'frontend',
      'backend',
      'database',
      'infrastructure',
      'packages',
      'testing',
      'documentation',
    ]

    for (const surface of surfaces) {
      expect(SurfaceTypeSchema.safeParse(surface).success).toBe(true)
    }
  })
})

describe('createStoryArtifact', () => {
  it('should create a story with defaults', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Add item', 'Allow adding items')

    expect(story.schema).toBe(1)
    expect(story.id).toBe('WISH-001')
    expect(story.feature).toBe('wishlist')
    expect(story.title).toBe('Add item')
    expect(story.goal).toBe('Allow adding items')
    expect(story.type).toBe('feature')
    expect(story.state).toBe('draft')
    expect(story.points).toBe(null)
    expect(story.priority).toBe('medium')
    expect(story.blocked_by).toBe(null)
    expect(story.depends_on).toEqual([])
    expect(story.acs).toEqual([])
    expect(story.risks).toEqual([])
  })

  it('should allow overriding defaults', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Add item', 'Allow adding items', {
      type: 'bug',
      state: 'backlog',
      points: 5,
      priority: 'high',
    })

    expect(story.type).toBe('bug')
    expect(story.state).toBe('backlog')
    expect(story.points).toBe(5)
    expect(story.priority).toBe('high')
  })
})

describe('updateStoryState', () => {
  it('should update state and timestamp', () => {
    // Create story with a past timestamp
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      updated_at: '2024-01-01T00:00:00.000Z',
    })
    const originalUpdated = story.updated_at

    const updated = updateStoryState(story, 'backlog')

    expect(updated.state).toBe('backlog')
    expect(updated.updated_at).not.toBe(originalUpdated)
  })

  it('should preserve other fields', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      points: 3,
      priority: 'high',
    })

    const updated = updateStoryState(story, 'backlog')

    expect(updated.id).toBe('WISH-001')
    expect(updated.points).toBe(3)
    expect(updated.priority).toBe('high')
  })
})

describe('setStoryBlocked', () => {
  it('should set blocked_by', () => {
    const story = createStoryArtifact('WISH-002', 'wishlist', 'Test', 'Test goal')
    const blocked = setStoryBlocked(story, 'WISH-001')

    expect(blocked.blocked_by).toBe('WISH-001')
  })

  it('should clear blocked_by when null', () => {
    const story = createStoryArtifact('WISH-002', 'wishlist', 'Test', 'Test goal', {
      blocked_by: 'WISH-001',
    })
    const unblocked = setStoryBlocked(story, null)

    expect(unblocked.blocked_by).toBe(null)
  })
})

describe('addAcceptanceCriterion', () => {
  it('should add AC to story', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal')
    const updated = addAcceptanceCriterion(story, {
      id: 'AC-001',
      description: 'User can add item',
      testable: true,
      automated: false,
    })

    expect(updated.acs).toHaveLength(1)
    expect(updated.acs[0].id).toBe('AC-001')
  })

  it('should preserve existing ACs', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      acs: [{ id: 'AC-001', description: 'First AC', testable: true, automated: false }],
    })

    const updated = addAcceptanceCriterion(story, {
      id: 'AC-002',
      description: 'Second AC',
      testable: true,
      automated: true,
    })

    expect(updated.acs).toHaveLength(2)
  })
})

describe('addStoryRisk', () => {
  it('should add risk to story', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal')
    const updated = addStoryRisk(story, {
      id: 'RISK-001',
      description: 'API changes',
      severity: 'high',
      mitigation: 'Use versioned API',
    })

    expect(updated.risks).toHaveLength(1)
    expect(updated.risks[0].id).toBe('RISK-001')
  })
})

describe('isStoryBlocked', () => {
  it('should return true when blocked_by is set', () => {
    const story = createStoryArtifact('WISH-002', 'wishlist', 'Test', 'Test goal', {
      blocked_by: 'WISH-001',
    })
    expect(isStoryBlocked(story)).toBe(true)
  })

  it('should return false when not blocked', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal')
    expect(isStoryBlocked(story)).toBe(false)
  })
})

describe('isStoryComplete', () => {
  it('should return true for done state', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'done',
    })
    expect(isStoryComplete(story)).toBe(true)
  })

  it('should return true for cancelled state', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'cancelled',
    })
    expect(isStoryComplete(story)).toBe(true)
  })

  it('should return false for in-progress state', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'in-progress',
    })
    expect(isStoryComplete(story)).toBe(false)
  })
})

describe('isStoryWorkable', () => {
  it('should return true for ready-to-work and not blocked', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'ready-to-work',
    })
    expect(isStoryWorkable(story)).toBe(true)
  })

  it('should return false when blocked', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'ready-to-work',
      blocked_by: 'WISH-000',
    })
    expect(isStoryWorkable(story)).toBe(false)
  })

  it('should return false for other states', () => {
    const story = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'backlog',
    })
    expect(isStoryWorkable(story)).toBe(false)
  })
})

describe('getStoryNextState', () => {
  it('should return next state for standard progression', () => {
    const draft = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'draft',
    })
    expect(getStoryNextState(draft)).toBe('backlog')

    const backlog = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'backlog',
    })
    expect(getStoryNextState(backlog)).toBe('ready-to-work')
  })

  it('should return null for terminal states', () => {
    const done = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'done',
    })
    expect(getStoryNextState(done)).toBe(null)

    const cancelled = createStoryArtifact('WISH-001', 'wishlist', 'Test', 'Test goal', {
      state: 'cancelled',
    })
    expect(getStoryNextState(cancelled)).toBe(null)
  })
})
