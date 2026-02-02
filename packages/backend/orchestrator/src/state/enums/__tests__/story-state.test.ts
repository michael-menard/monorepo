import { describe, it, expect } from 'vitest'
import {
  StoryStateSchema,
  STORY_STATES,
  isTerminalState,
  isActiveState,
  isWorkableState,
  getNextState,
  isValidTransition,
} from '../story-state.js'

describe('StoryStateSchema', () => {
  it('should validate all story states', () => {
    const states = [
      'draft',
      'backlog',
      'ready-to-work',
      'in-progress',
      'ready-for-qa',
      'uat',
      'done',
      'cancelled',
    ]

    for (const state of states) {
      expect(StoryStateSchema.safeParse(state).success).toBe(true)
    }
  })

  it('should reject invalid states', () => {
    const result = StoryStateSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })

  it('should export STORY_STATES array with all values', () => {
    expect(STORY_STATES).toHaveLength(8)
    expect(STORY_STATES).toContain('draft')
    expect(STORY_STATES).toContain('done')
    expect(STORY_STATES).toContain('cancelled')
  })
})

describe('isTerminalState', () => {
  it('should return true for done', () => {
    expect(isTerminalState('done')).toBe(true)
  })

  it('should return true for cancelled', () => {
    expect(isTerminalState('cancelled')).toBe(true)
  })

  it('should return false for non-terminal states', () => {
    expect(isTerminalState('draft')).toBe(false)
    expect(isTerminalState('in-progress')).toBe(false)
    expect(isTerminalState('ready-to-work')).toBe(false)
  })
})

describe('isActiveState', () => {
  it('should return true for in-progress', () => {
    expect(isActiveState('in-progress')).toBe(true)
  })

  it('should return true for ready-for-qa', () => {
    expect(isActiveState('ready-for-qa')).toBe(true)
  })

  it('should return true for uat', () => {
    expect(isActiveState('uat')).toBe(true)
  })

  it('should return false for non-active states', () => {
    expect(isActiveState('draft')).toBe(false)
    expect(isActiveState('backlog')).toBe(false)
    expect(isActiveState('ready-to-work')).toBe(false)
    expect(isActiveState('done')).toBe(false)
  })
})

describe('isWorkableState', () => {
  it('should return true for ready-to-work', () => {
    expect(isWorkableState('ready-to-work')).toBe(true)
  })

  it('should return false for all other states', () => {
    expect(isWorkableState('draft')).toBe(false)
    expect(isWorkableState('backlog')).toBe(false)
    expect(isWorkableState('in-progress')).toBe(false)
    expect(isWorkableState('done')).toBe(false)
  })
})

describe('getNextState', () => {
  it('should return correct next state for standard progression', () => {
    expect(getNextState('draft')).toBe('backlog')
    expect(getNextState('backlog')).toBe('ready-to-work')
    expect(getNextState('ready-to-work')).toBe('in-progress')
    expect(getNextState('in-progress')).toBe('ready-for-qa')
    expect(getNextState('ready-for-qa')).toBe('uat')
    expect(getNextState('uat')).toBe('done')
  })

  it('should return null for terminal states', () => {
    expect(getNextState('done')).toBe(null)
    expect(getNextState('cancelled')).toBe(null)
  })
})

describe('isValidTransition', () => {
  describe('standard progression', () => {
    it('should allow draft -> backlog', () => {
      expect(isValidTransition('draft', 'backlog')).toBe(true)
    })

    it('should allow backlog -> ready-to-work', () => {
      expect(isValidTransition('backlog', 'ready-to-work')).toBe(true)
    })

    it('should allow ready-to-work -> in-progress', () => {
      expect(isValidTransition('ready-to-work', 'in-progress')).toBe(true)
    })

    it('should allow in-progress -> ready-for-qa', () => {
      expect(isValidTransition('in-progress', 'ready-for-qa')).toBe(true)
    })

    it('should allow ready-for-qa -> uat', () => {
      expect(isValidTransition('ready-for-qa', 'uat')).toBe(true)
    })

    it('should allow uat -> done', () => {
      expect(isValidTransition('uat', 'done')).toBe(true)
    })
  })

  describe('cancellation', () => {
    it('should allow cancellation from any state', () => {
      for (const state of STORY_STATES) {
        expect(isValidTransition(state, 'cancelled')).toBe(true)
      }
    })
  })

  describe('rejection handling', () => {
    it('should allow ready-for-qa -> in-progress (QA rejection)', () => {
      expect(isValidTransition('ready-for-qa', 'in-progress')).toBe(true)
    })

    it('should allow uat -> ready-for-qa (UAT rejection)', () => {
      expect(isValidTransition('uat', 'ready-for-qa')).toBe(true)
    })
  })

  describe('emergency close', () => {
    it('should allow active states to skip to done', () => {
      expect(isValidTransition('in-progress', 'done')).toBe(true)
      expect(isValidTransition('ready-for-qa', 'done')).toBe(true)
      expect(isValidTransition('uat', 'done')).toBe(true)
    })
  })

  describe('invalid transitions', () => {
    it('should not allow transitions from terminal states', () => {
      expect(isValidTransition('done', 'in-progress')).toBe(false)
      expect(isValidTransition('done', 'backlog')).toBe(false)
      // except to cancelled
      expect(isValidTransition('done', 'cancelled')).toBe(true)
    })

    it('should not allow skipping states in normal progression', () => {
      expect(isValidTransition('draft', 'in-progress')).toBe(false)
      expect(isValidTransition('backlog', 'in-progress')).toBe(false)
    })

    it('should not allow going backwards in early stages', () => {
      expect(isValidTransition('backlog', 'draft')).toBe(false)
      expect(isValidTransition('ready-to-work', 'backlog')).toBe(false)
    })
  })
})
