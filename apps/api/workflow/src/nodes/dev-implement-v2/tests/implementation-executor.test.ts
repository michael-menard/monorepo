/**
 * implementation_executor node tests (dev-implement-v2)
 *
 * The executor now owns test-running internally.
 * Exits via 'complete' or 'stuck' — graph never retries.
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

import {
  buildExecutorSystemPrompt,
  buildExecutorTools,
  parseExecutorToolCall,
  createImplementationExecutorNode,
} from '../implementation-executor.js'
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
      approach: 'Implement JWT auth',
      filesToCreate: ['src/auth.ts'],
      filesToModify: [],
      testFilesToCreate: ['src/auth.test.ts'],
      risks: [],
    },
    executorOutcome: null,
    postconditionResult: null,
    devImplementV2Phase: 'implementation_executor',
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeCompleteAdapter() {
  return vi.fn().mockResolvedValue({
    content: JSON.stringify({
      tool: 'complete',
      args: {
        filesCreated: ['src/auth.ts', 'src/auth.test.ts'],
        filesModified: [],
        testsRan: true,
        testsPassed: true,
        testOutput: '2 tests pass',
        acVerification: [{ acIndex: 0, acText: 'User can log in', verified: true, evidence: 'auth.test.ts:12' }],
      },
    }),
    inputTokens: 10,
    outputTokens: 5,
  })
}

function makeStuckAdapter() {
  return vi.fn().mockResolvedValue({
    content: JSON.stringify({
      tool: 'stuck',
      args: {
        diagnosis: 'Missing dependency: bcrypt is not installed',
        filesCreated: [],
        filesModified: [],
      },
    }),
    inputTokens: 8,
    outputTokens: 4,
  })
}

// ============================================================================
// buildExecutorSystemPrompt tests
// ============================================================================

describe('buildExecutorSystemPrompt', () => {
  it('includes story title', () => {
    const grounding = {
      storyId: 'WINT-1234',
      storyTitle: 'Add authentication',
      acceptanceCriteria: ['User can log in'],
      subtasks: [],
      relevantFiles: [],
      relevantFunctions: [],
      existingPatterns: [],
      relatedStories: [],
    }
    const plan = {
      approach: 'JWT-based auth',
      filesToCreate: ['src/auth.ts'],
      filesToModify: [],
      testFilesToCreate: ['src/auth.test.ts'],
      risks: [],
    }
    const prompt = buildExecutorSystemPrompt(plan, grounding)
    expect(prompt).toContain('Add authentication')
  })

  it('includes run_tests tool', () => {
    const grounding = {
      storyId: 'WINT-1234',
      storyTitle: 'Test',
      acceptanceCriteria: [],
      subtasks: [],
      relevantFiles: [],
      relevantFunctions: [],
      existingPatterns: [],
      relatedStories: [],
    }
    const plan = {
      approach: '',
      filesToCreate: [],
      filesToModify: [],
      testFilesToCreate: [],
      risks: [],
    }
    const prompt = buildExecutorSystemPrompt(plan, grounding)
    expect(prompt).toContain('run_tests')
  })

  it('includes complete and stuck tools', () => {
    const grounding = {
      storyId: 'WINT-1234',
      storyTitle: 'Test',
      acceptanceCriteria: [],
      subtasks: [],
      relevantFiles: [],
      relevantFunctions: [],
      existingPatterns: [],
      relatedStories: [],
    }
    const plan = {
      approach: '',
      filesToCreate: [],
      filesToModify: [],
      testFilesToCreate: [],
      risks: [],
    }
    const prompt = buildExecutorSystemPrompt(plan, grounding)
    expect(prompt).toContain('complete')
    expect(prompt).toContain('stuck')
  })

  it('lists acceptance criteria', () => {
    const grounding = {
      storyId: 'WINT-1234',
      storyTitle: 'Test',
      acceptanceCriteria: ['User can log in', 'Token expires in 1h'],
      subtasks: [],
      relevantFiles: [],
      relevantFunctions: [],
      existingPatterns: [],
      relatedStories: [],
    }
    const plan = {
      approach: '',
      filesToCreate: [],
      filesToModify: [],
      testFilesToCreate: [],
      risks: [],
    }
    const prompt = buildExecutorSystemPrompt(plan, grounding)
    expect(prompt).toContain('User can log in')
    expect(prompt).toContain('Token expires in 1h')
  })
})

// ============================================================================
// buildExecutorTools tests
// ============================================================================

describe('buildExecutorTools', () => {
  it('returns 7 tools', () => {
    expect(buildExecutorTools()).toHaveLength(7)
  })

  it('includes run_tests', () => {
    const names = buildExecutorTools().map(t => t.name)
    expect(names).toContain('run_tests')
  })

  it('includes complete and stuck', () => {
    const names = buildExecutorTools().map(t => t.name)
    expect(names).toContain('complete')
    expect(names).toContain('stuck')
  })
})

// ============================================================================
// parseExecutorToolCall tests
// ============================================================================

describe('parseExecutorToolCall', () => {
  it('parses valid JSON tool call', () => {
    const result = parseExecutorToolCall(
      JSON.stringify({ tool: 'read_file', args: { path: 'src/auth.ts' } }),
    )
    expect(result?.tool).toBe('read_file')
    expect(result?.args['path']).toBe('src/auth.ts')
  })

  it('extracts from code fences', () => {
    const result = parseExecutorToolCall(
      '```json\n{ "tool": "write_file", "args": { "path": "x.ts", "content": "hello" } }\n```',
    )
    expect(result?.tool).toBe('write_file')
  })

  it('returns null for invalid JSON', () => {
    expect(parseExecutorToolCall('not json')).toBeNull()
  })

  it('returns null for missing tool field', () => {
    expect(parseExecutorToolCall('{ "name": "foo" }')).toBeNull()
  })
})

// ============================================================================
// createImplementationExecutorNode tests
// ============================================================================

describe('createImplementationExecutorNode', () => {
  it('returns complete outcome with default no-op adapter', async () => {
    const node = createImplementationExecutorNode()
    const result = await node(makeState())
    expect(result.executorOutcome?.verdict).toBe('complete')
  })

  it('sets phase to evidence_collector on complete', async () => {
    const node = createImplementationExecutorNode()
    const result = await node(makeState())
    expect(result.devImplementV2Phase).toBe('evidence_collector')
  })

  it('sets executorOutcome.filesCreated', async () => {
    const node = createImplementationExecutorNode({ llmAdapter: makeCompleteAdapter() })
    const result = await node(makeState())
    expect(result.executorOutcome?.filesCreated).toContain('src/auth.ts')
  })

  it('records testsRan and testsPassed on complete', async () => {
    const node = createImplementationExecutorNode({ llmAdapter: makeCompleteAdapter() })
    const result = await node(makeState())
    expect(result.executorOutcome?.testsRan).toBe(true)
    expect(result.executorOutcome?.testsPassed).toBe(true)
  })

  it('sets phase to error on stuck', async () => {
    const node = createImplementationExecutorNode({ llmAdapter: makeStuckAdapter() })
    const result = await node(makeState())
    expect(result.devImplementV2Phase).toBe('error')
    expect(result.executorOutcome?.verdict).toBe('stuck')
  })

  it('attaches diagnosis to errors[] on stuck', async () => {
    const node = createImplementationExecutorNode({ llmAdapter: makeStuckAdapter() })
    const result = await node(makeState())
    expect(result.errors?.[0]).toContain('Missing dependency')
  })

  it('calls run_tests adapter when agent uses run_tests tool', async () => {
    const runTests = vi.fn().mockResolvedValue({ passed: true, output: 'OK', failures: [] })
    let callCount = 0
    const llmAdapter = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          content: JSON.stringify({ tool: 'run_tests', args: { filter: 'src/auth' } }),
          inputTokens: 5,
          outputTokens: 3,
        }
      }
      return {
        content: JSON.stringify({
          tool: 'complete',
          args: {
            filesCreated: ['src/auth.ts'],
            filesModified: [],
            testsRan: true,
            testsPassed: true,
            testOutput: 'OK',
            acVerification: [],
          },
        }),
        inputTokens: 5,
        outputTokens: 3,
      }
    })
    const node = createImplementationExecutorNode({ llmAdapter, runTests })
    await node(makeState())
    expect(runTests).toHaveBeenCalledWith('src/auth')
  })

  it('calls writeFile adapter when agent uses write_file tool', async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined)
    let callCount = 0
    const llmAdapter = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          content: JSON.stringify({
            tool: 'write_file',
            args: { path: 'src/auth.ts', content: 'export const auth = {}' },
          }),
          inputTokens: 5,
          outputTokens: 3,
        }
      }
      return {
        content: JSON.stringify({
          tool: 'complete',
          args: {
            filesCreated: ['src/auth.ts'],
            filesModified: [],
            testsRan: true,
            testsPassed: true,
            testOutput: '',
            acVerification: [],
          },
        }),
        inputTokens: 5,
        outputTokens: 3,
      }
    })
    const node = createImplementationExecutorNode({ llmAdapter, writeFile })
    await node(makeState())
    expect(writeFile).toHaveBeenCalledWith('src/auth.ts', 'export const auth = {}')
  })

  it('tracks token usage', async () => {
    const node = createImplementationExecutorNode({ llmAdapter: makeCompleteAdapter() })
    const result = await node(makeState())
    expect(Array.isArray(result.tokenUsage)).toBe(true)
    expect((result.tokenUsage?.length ?? 0) > 0).toBe(true)
  })

  it('marks stuck when LLM throws', async () => {
    const node = createImplementationExecutorNode({
      llmAdapter: vi.fn().mockRejectedValue(new Error('LLM crash')),
    })
    const result = await node(makeState())
    expect(result.executorOutcome?.verdict).toBe('stuck')
    expect(result.devImplementV2Phase).toBe('error')
  })

  it('marks stuck when iterations exhausted without terminal call', async () => {
    // Adapter always returns a non-terminal tool — exhausts iterations
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({ tool: 'query_kb', args: { topic: 'auth' } }),
      inputTokens: 5,
      outputTokens: 3,
    })
    const node = createImplementationExecutorNode({ llmAdapter, maxInternalIterations: 2 })
    const result = await node(makeState())
    expect(result.executorOutcome?.verdict).toBe('stuck')
    expect(result.executorOutcome?.diagnosis).toContain('exhausted')
  })

  it('returns error phase when no implementationPlan', async () => {
    const node = createImplementationExecutorNode()
    const result = await node(makeState({ implementationPlan: null }))
    expect(result.devImplementV2Phase).toBe('error')
  })
})
