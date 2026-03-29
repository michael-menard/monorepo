/**
 * evidence_collector node tests (dev-implement-v2)
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { createEvidenceCollectorNode } from '../evidence-collector.js'
import type { DevImplementV2State } from '../../../state/dev-implement-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<DevImplementV2State> = {}): DevImplementV2State {
  return {
    storyId: 'WINT-1234',
    storyGroundingContext: {
      storyId: 'WINT-1234',
      storyTitle: 'Add auth',
      acceptanceCriteria: ['User can log in'],
      subtasks: [],
      relevantFiles: [],
      relevantFunctions: [],
      existingPatterns: [],
      relatedStories: [],
    },
    implementationPlan: {
      approach: 'JWT-based auth',
      filesToCreate: ['src/auth.ts'],
      filesToModify: [],
      testFilesToCreate: ['src/auth.test.ts'],
      risks: [],
    },
    executorOutcome: {
      verdict: 'complete',
      filesCreated: ['src/auth.ts', 'src/auth.test.ts'],
      filesModified: [],
      testsRan: true,
      testsPassed: true,
      testOutput: '2 tests pass',
      diagnosis: '',
      acVerification: [
        { acIndex: 0, acText: 'User can log in', verified: true, evidence: 'auth.test.ts:12' },
      ],
    },
    postconditionResult: null,
    devImplementV2Phase: 'evidence_collector',
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('createEvidenceCollectorNode', () => {
  it('sets phase to postcondition_gate', async () => {
    const node = createEvidenceCollectorNode()
    const result = await node(makeState())
    expect(result.devImplementV2Phase).toBe('postcondition_gate')
  })

  it('skips when no executorOutcome', async () => {
    const node = createEvidenceCollectorNode()
    const result = await node(makeState({ executorOutcome: null }))
    expect(result.devImplementV2Phase).toBe('postcondition_gate')
  })

  it('skips when verdict is stuck', async () => {
    const node = createEvidenceCollectorNode()
    const result = await node(
      makeState({
        executorOutcome: {
          verdict: 'stuck',
          filesCreated: [],
          filesModified: [],
          testsRan: false,
          testsPassed: false,
          testOutput: '',
          diagnosis: 'Cannot proceed',
          acVerification: [],
        },
      }),
    )
    expect(result.devImplementV2Phase).toBe('postcondition_gate')
  })

  it('calls readFile for file verification when provided', async () => {
    const readFile = vi.fn().mockResolvedValue('file content')
    const node = createEvidenceCollectorNode({ readFile })
    await node(makeState())
    expect(readFile).toHaveBeenCalledWith('src/auth.ts')
    expect(readFile).toHaveBeenCalledWith('src/auth.test.ts')
  })

  it('handles readFile failures gracefully (non-fatal)', async () => {
    const readFile = vi.fn().mockRejectedValue(new Error('file not found'))
    const node = createEvidenceCollectorNode({ readFile })
    // Should not throw
    const result = await node(makeState())
    expect(result.devImplementV2Phase).toBe('postcondition_gate')
  })

  it('works without readFile adapter', async () => {
    const node = createEvidenceCollectorNode()
    const result = await node(makeState())
    expect(result.devImplementV2Phase).toBe('postcondition_gate')
  })

  it('handles empty filesCreated/filesModified', async () => {
    const node = createEvidenceCollectorNode()
    const result = await node(
      makeState({
        executorOutcome: {
          verdict: 'complete',
          filesCreated: [],
          filesModified: [],
          testsRan: true,
          testsPassed: true,
          testOutput: 'OK',
          diagnosis: '',
          acVerification: [],
        },
      }),
    )
    expect(result.devImplementV2Phase).toBe('postcondition_gate')
  })
})
