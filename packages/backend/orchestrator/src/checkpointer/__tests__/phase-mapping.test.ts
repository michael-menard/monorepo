/**
 * Phase Mapping Unit Tests
 *
 * HP-6: PHASE_TO_CHECKPOINT_MAP exported; translatePhaseToNode tests:
 *   setup->initialize, plan->seed, execute->synthesis + all 10 phase values.
 * AC-008: resume_from phase number maps to correct LangGraph checkpoint.
 */

import { describe, it, expect } from 'vitest'
import { PHASE_TO_CHECKPOINT_MAP, translatePhaseToNode } from '../phase-mapping.js'
import type { Phase } from '../../artifacts/checkpoint.js'

describe('PHASE_TO_CHECKPOINT_MAP', () => {
  it('is exported as a Record<Phase, string>', () => {
    expect(PHASE_TO_CHECKPOINT_MAP).toBeDefined()
    expect(typeof PHASE_TO_CHECKPOINT_MAP).toBe('object')
  })

  it('HP-6: setup -> initialize', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['setup']).toBe('initialize')
  })

  it('HP-6: plan -> seed', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['plan']).toBe('seed')
  })

  it('HP-6: execute -> synthesis', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['execute']).toBe('synthesis')
  })

  it('proof -> save_to_db', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['proof']).toBe('save_to_db')
  })

  it('review -> hitl', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['review']).toBe('hitl')
  })

  it('fix -> seed', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['fix']).toBe('seed')
  })

  it('qa-setup -> gap_hygiene', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['qa-setup']).toBe('gap_hygiene')
  })

  it('qa-verify -> readiness_scoring', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['qa-verify']).toBe('readiness_scoring')
  })

  it('qa-complete -> complete', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['qa-complete']).toBe('complete')
  })

  it('done -> complete', () => {
    expect(PHASE_TO_CHECKPOINT_MAP['done']).toBe('complete')
  })

  it('contains entries for all Phase enum values from CheckpointSchema', () => {
    // All Phase enum values (from artifacts/checkpoint.ts PhaseSchema)
    const allPhases: Phase[] = [
      'setup',
      'plan',
      'execute',
      'proof',
      'review',
      'fix',
      'qa-setup',
      'qa-verify',
      'qa-complete',
      'qa-completion',
      'uat-complete',
      'done',
    ]

    for (const phase of allPhases) {
      expect(PHASE_TO_CHECKPOINT_MAP[phase]).toBeDefined()
      expect(typeof PHASE_TO_CHECKPOINT_MAP[phase]).toBe('string')
    }
  })

  it('all node name values map to known story-creation.ts node names', () => {
    // These are the actual node names in createStoryCreationGraph()
    const validNodeNames = new Set([
      'initialize',
      'load_from_db',
      'load_baseline',
      'retrieve_context',
      'seed',
      'fanout_pm',
      'fanout_ux',
      'fanout_qa',
      'merge_fanout',
      'attack',
      'gap_hygiene',
      'readiness_scoring',
      'hitl',
      'synthesis',
      'save_to_db',
      'persist_learnings',
      'complete',
    ])

    for (const [phase, nodeName] of Object.entries(PHASE_TO_CHECKPOINT_MAP)) {
      expect(validNodeNames.has(nodeName), `Phase '${phase}' maps to unknown node '${nodeName}'`).toBe(true)
    }
  })
})

describe('translatePhaseToNode', () => {
  it('HP-6: returns initialize for setup', () => {
    expect(translatePhaseToNode('setup')).toBe('initialize')
  })

  it('HP-6: returns seed for plan', () => {
    expect(translatePhaseToNode('plan')).toBe('seed')
  })

  it('HP-6: returns synthesis for execute', () => {
    expect(translatePhaseToNode('execute')).toBe('synthesis')
  })

  it('returns save_to_db for proof', () => {
    expect(translatePhaseToNode('proof')).toBe('save_to_db')
  })

  it('returns hitl for review', () => {
    expect(translatePhaseToNode('review')).toBe('hitl')
  })

  it('returns seed for fix', () => {
    expect(translatePhaseToNode('fix')).toBe('seed')
  })

  it('returns gap_hygiene for qa-setup', () => {
    expect(translatePhaseToNode('qa-setup')).toBe('gap_hygiene')
  })

  it('returns readiness_scoring for qa-verify', () => {
    expect(translatePhaseToNode('qa-verify')).toBe('readiness_scoring')
  })

  it('returns complete for qa-complete', () => {
    expect(translatePhaseToNode('qa-complete')).toBe('complete')
  })

  it('returns complete for done', () => {
    expect(translatePhaseToNode('done')).toBe('complete')
  })

  it('returns string values (not null) for all defined phases', () => {
    const phases: Phase[] = ['setup', 'plan', 'execute', 'proof', 'review', 'fix', 'qa-setup', 'qa-verify', 'qa-complete', 'done']
    for (const phase of phases) {
      const result = translatePhaseToNode(phase)
      expect(result).not.toBeNull()
      expect(typeof result).toBe('string')
    }
  })
})
