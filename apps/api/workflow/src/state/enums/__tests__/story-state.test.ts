import { describe, it, expect } from 'vitest'
import {
  StoryStateSchema,
  STORY_STATES,
  TERMINAL_STATES,
  ACTIVE_STATES,
  WORKABLE_STATES,
  isTerminalState,
  isActiveState,
  isWorkableState,
  getNextState,
} from '../story-state.js'

describe('StoryStateSchema', () => {
  it('validates all 13 canonical states', () => {
    const states = [
      'backlog', 'created', 'elab', 'ready',
      'in_progress', 'needs_code_review',
      'ready_for_qa', 'in_qa', 'completed',
      'failed_code_review', 'failed_qa',
      'blocked', 'cancelled',
    ]
    for (const state of states) {
      expect(StoryStateSchema.safeParse(state).success, `expected ${state} to be valid`).toBe(true)
    }
  })

  it('rejects invalid states', () => {
    for (const invalid of ['draft', 'done', 'uat', 'ready-to-work', 'in-progress', 'ready_to_work', 'deferred', 'in_review', 'ready_for_review']) {
      expect(StoryStateSchema.safeParse(invalid).success, `expected ${invalid} to be rejected`).toBe(false)
    }
  })

  it('exports STORY_STATES with all 13 values', () => {
    expect(STORY_STATES).toHaveLength(13)
  })
})

describe('isTerminalState', () => {
  it('returns true for terminal states', () => {
    for (const s of TERMINAL_STATES) {
      expect(isTerminalState(s)).toBe(true)
    }
  })

  it('returns false for non-terminal states', () => {
    expect(isTerminalState('backlog')).toBe(false)
    expect(isTerminalState('in_progress')).toBe(false)
    expect(isTerminalState('ready')).toBe(false)
    expect(isTerminalState('blocked')).toBe(false)
  })
})

describe('isActiveState', () => {
  it('returns true for active states', () => {
    for (const s of ACTIVE_STATES) {
      expect(isActiveState(s)).toBe(true)
    }
  })

  it('returns false for pre-dev and terminal states', () => {
    expect(isActiveState('backlog')).toBe(false)
    expect(isActiveState('created')).toBe(false)
    expect(isActiveState('ready')).toBe(false)
    expect(isActiveState('completed')).toBe(false)
    expect(isActiveState('cancelled')).toBe(false)
  })
})

describe('isWorkableState', () => {
  it('returns true only for ready', () => {
    for (const s of WORKABLE_STATES) {
      expect(isWorkableState(s)).toBe(true)
    }
  })

  it('returns false for all other states', () => {
    expect(isWorkableState('backlog')).toBe(false)
    expect(isWorkableState('in_progress')).toBe(false)
    expect(isWorkableState('completed')).toBe(false)
  })
})

describe('getNextState', () => {
  it('returns correct next state in forward flow', () => {
    expect(getNextState('backlog')).toBe('created')
    expect(getNextState('created')).toBe('elab')
    expect(getNextState('elab')).toBe('ready')
    expect(getNextState('ready')).toBe('in_progress')
    expect(getNextState('in_progress')).toBe('needs_code_review')
    expect(getNextState('needs_code_review')).toBe('ready_for_qa')
    expect(getNextState('ready_for_qa')).toBe('in_qa')
    expect(getNextState('in_qa')).toBe('completed')
  })

  it('returns null for terminal and branching states', () => {
    expect(getNextState('completed')).toBeNull()
    expect(getNextState('cancelled')).toBeNull()
    expect(getNextState('blocked')).toBeNull()
    expect(getNextState('failed_code_review')).toBeNull()
    expect(getNextState('failed_qa')).toBeNull()
  })
})
