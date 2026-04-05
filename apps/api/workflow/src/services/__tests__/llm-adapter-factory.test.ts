/**
 * LLM Adapter Factory Tests
 *
 * Tests the adapter factory and state mapping logic used by subgraph invokers.
 */

import { describe, it, expect, vi } from 'vitest'
import { createLlmAdapterFactory } from '../llm-adapter-factory.js'
import {
  mapDevResultToOrchestratorState,
  mapReviewResultToOrchestratorState,
  mapQAResultToOrchestratorState,
} from '../../nodes/pipeline-orchestrator/subgraph-invokers.js'
import type { ModelConfig } from '../../state/pipeline-orchestrator-v2-state.js'
import type { DevImplementV2State } from '../../state/dev-implement-v2-state.js'
import type { ReviewV2State } from '../../state/review-v2-state.js'
import type { QAVerifyV2State } from '../../state/qa-verify-v2-state.js'

// Mock createLlmAdapter so tests don't need real LLM providers
vi.mock('../llm-adapters.js', () => ({
  createLlmAdapter: vi.fn((config: { modelString?: string }) => {
    const modelString = config.modelString ?? 'mock-model'
    return async () => ({
      content: `mock response from ${modelString}`,
      inputTokens: 10,
      outputTokens: 20,
    })
  }),
}))

// ============================================================================
// Factory Creation Tests
// ============================================================================

describe('createLlmAdapterFactory', () => {
  it('creates a factory with all builder methods', () => {
    const factory = createLlmAdapterFactory()

    expect(factory.createOllamaAdapter).toBeDefined()
    expect(factory.createAnthropicAdapter).toBeDefined()
    expect(factory.selectAdapter).toBeDefined()
    expect(factory.buildDevImplementAdapters).toBeDefined()
    expect(factory.buildReviewAdapters).toBeDefined()
    expect(factory.buildQAVerifyAdapters).toBeDefined()
  })

  it('accepts custom ollamaBaseUrl', () => {
    const factory = createLlmAdapterFactory({
      ollamaBaseUrl: 'http://custom:11434',
    })
    expect(factory).toBeDefined()
  })
})

// ============================================================================
// Adapter Builder Tests
// ============================================================================

describe('createOllamaAdapter', () => {
  it('creates an adapter that returns LlmResponse', async () => {
    const factory = createLlmAdapterFactory()
    const adapter = factory.createOllamaAdapter('qwen2.5-coder:14b')

    const result = await adapter([{ role: 'user', content: 'hello' }])
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('inputTokens')
    expect(result).toHaveProperty('outputTokens')
  })

  it('prefixes model with ollama: if not already prefixed', async () => {
    const { createLlmAdapter } = await import('../llm-adapters.js')
    const factory = createLlmAdapterFactory()
    factory.createOllamaAdapter('qwen2.5-coder:14b')

    expect(createLlmAdapter).toHaveBeenCalledWith({
      modelString: 'ollama:qwen2.5-coder:14b',
    })
  })

  it('does not double-prefix if already has ollama:', async () => {
    const { createLlmAdapter } = await import('../llm-adapters.js')
    const factory = createLlmAdapterFactory()
    factory.createOllamaAdapter('ollama:qwen2.5-coder:14b')

    expect(createLlmAdapter).toHaveBeenCalledWith({
      modelString: 'ollama:qwen2.5-coder:14b',
    })
  })
})

describe('createAnthropicAdapter', () => {
  it('prefixes model with claude-code/ if not already prefixed', async () => {
    const { createLlmAdapter } = await import('../llm-adapters.js')
    const factory = createLlmAdapterFactory()
    factory.createAnthropicAdapter('sonnet')

    expect(createLlmAdapter).toHaveBeenCalledWith({
      modelString: 'claude-code/sonnet',
    })
  })

  it('does not double-prefix if already has claude-code/', async () => {
    const { createLlmAdapter } = await import('../llm-adapters.js')
    const factory = createLlmAdapterFactory()
    factory.createAnthropicAdapter('claude-code/opus')

    expect(createLlmAdapter).toHaveBeenCalledWith({
      modelString: 'claude-code/opus',
    })
  })
})

// ============================================================================
// selectAdapter Tests
// ============================================================================

describe('selectAdapter', () => {
  const modelConfig: ModelConfig = {
    primaryModel: 'sonnet',
    escalationModel: 'opus',
    ollamaModel: 'qwen2.5-coder:14b',
  }

  it('uses Ollama when available', async () => {
    const { createLlmAdapter } = await import('../llm-adapters.js')
    const factory = createLlmAdapterFactory()
    factory.selectAdapter(modelConfig, true, 'test-role')

    expect(createLlmAdapter).toHaveBeenCalledWith({
      modelString: 'ollama:qwen2.5-coder:14b',
    })
  })

  it('falls back to Anthropic primary when Ollama unavailable', async () => {
    const { createLlmAdapter } = await import('../llm-adapters.js')
    const factory = createLlmAdapterFactory()
    factory.selectAdapter(modelConfig, false, 'test-role')

    expect(createLlmAdapter).toHaveBeenCalledWith({
      modelString: 'claude-code/sonnet',
    })
  })
})

// ============================================================================
// Build Adapters Tests
// ============================================================================

describe('buildDevImplementAdapters', () => {
  const modelConfig: ModelConfig = {
    primaryModel: 'sonnet',
    escalationModel: 'opus',
    ollamaModel: 'qwen2.5-coder:14b',
  }

  it('returns plannerLlmAdapter and executorLlmAdapter', () => {
    const factory = createLlmAdapterFactory()
    const adapters = factory.buildDevImplementAdapters(modelConfig)

    expect(adapters.plannerLlmAdapter).toBeDefined()
    expect(adapters.executorLlmAdapter).toBeDefined()
    expect(typeof adapters.plannerLlmAdapter).toBe('function')
    expect(typeof adapters.executorLlmAdapter).toBe('function')
  })
})

describe('buildReviewAdapters', () => {
  const modelConfig: ModelConfig = {
    primaryModel: 'sonnet',
    escalationModel: 'opus',
    ollamaModel: 'qwen2.5-coder:14b',
  }

  it('returns riskLlmAdapter and reviewLlmAdapter', () => {
    const factory = createLlmAdapterFactory()
    const adapters = factory.buildReviewAdapters(modelConfig)

    expect(adapters.riskLlmAdapter).toBeDefined()
    expect(adapters.reviewLlmAdapter).toBeDefined()
    expect(typeof adapters.riskLlmAdapter).toBe('function')
    expect(typeof adapters.reviewLlmAdapter).toBe('function')
  })
})

describe('buildQAVerifyAdapters', () => {
  const modelConfig: ModelConfig = {
    primaryModel: 'sonnet',
    escalationModel: 'opus',
    ollamaModel: 'qwen2.5-coder:14b',
  }

  it('returns strategyLlmAdapter and interpreterLlmAdapter', () => {
    const factory = createLlmAdapterFactory()
    const adapters = factory.buildQAVerifyAdapters(modelConfig)

    expect(adapters.strategyLlmAdapter).toBeDefined()
    expect(adapters.interpreterLlmAdapter).toBeDefined()
    expect(typeof adapters.strategyLlmAdapter).toBe('function')
    expect(typeof adapters.interpreterLlmAdapter).toBe('function')
  })
})

// ============================================================================
// State Mapping Tests
// ============================================================================

describe('mapDevResultToOrchestratorState', () => {
  it('maps complete verdict correctly', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      executorOutcome: {
        verdict: 'complete' as const,
        filesCreated: ['a.ts'],
        filesModified: [],
        testsRan: true,
        testsPassed: true,
        testOutput: '',
        diagnosis: '',
        acVerification: [],
      },
      errors: [],
    } as unknown as DevImplementV2State

    const result = mapDevResultToOrchestratorState(subgraphResult)

    expect(result.devResult?.verdict).toBe('complete')
    expect(result.devResult?.errors).toEqual([])
    expect(result.pipelinePhase).toBe('dev_implement')
  })

  it('maps stuck verdict with errors', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      executorOutcome: {
        verdict: 'stuck' as const,
        filesCreated: [],
        filesModified: [],
        testsRan: false,
        testsPassed: false,
        testOutput: '',
        diagnosis: 'Cannot find module',
        acVerification: [],
      },
      errors: ['Cannot find module'],
    } as unknown as DevImplementV2State

    const result = mapDevResultToOrchestratorState(subgraphResult)

    expect(result.devResult?.verdict).toBe('stuck')
    expect(result.devResult?.errors).toEqual(['Cannot find module'])
    expect(result.errors).toEqual(['Cannot find module'])
  })

  it('defaults to stuck when executorOutcome is null', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      executorOutcome: null,
      errors: [],
    } as unknown as DevImplementV2State

    const result = mapDevResultToOrchestratorState(subgraphResult)

    expect(result.devResult?.verdict).toBe('stuck')
  })
})

describe('mapReviewResultToOrchestratorState', () => {
  it('maps pass verdict correctly', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      reviewVerdict: 'pass' as const,
      reviewFindings: [],
      errors: [],
    } as unknown as ReviewV2State

    const result = mapReviewResultToOrchestratorState(subgraphResult)

    expect(result.reviewResult?.verdict).toBe('pass')
    expect(result.reviewResult?.findings).toEqual([])
    expect(result.pipelinePhase).toBe('review')
  })

  it('maps fail verdict with findings', () => {
    const findings = [
      {
        id: 'F-1',
        severity: 'high' as const,
        category: 'security',
        file: 'auth.ts',
        description: 'Missing input validation',
        evidence: 'line 42',
      },
    ]
    const subgraphResult = {
      storyId: 'STORY-1',
      reviewVerdict: 'fail' as const,
      reviewFindings: findings,
      errors: [],
    } as unknown as ReviewV2State

    const result = mapReviewResultToOrchestratorState(subgraphResult)

    expect(result.reviewResult?.verdict).toBe('fail')
    expect(result.reviewResult?.findings).toEqual(findings)
  })

  it('maps null verdict to block', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      reviewVerdict: null,
      reviewFindings: [],
      errors: [],
    } as unknown as ReviewV2State

    const result = mapReviewResultToOrchestratorState(subgraphResult)

    expect(result.reviewResult?.verdict).toBe('block')
  })
})

describe('mapQAResultToOrchestratorState', () => {
  it('maps pass verdict correctly', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      qaVerdict: 'pass' as const,
      acVerificationResults: [],
      errors: [],
    } as unknown as QAVerifyV2State

    const result = mapQAResultToOrchestratorState(subgraphResult)

    expect(result.qaResult?.verdict).toBe('pass')
    expect(result.qaResult?.failures).toEqual([])
    expect(result.pipelinePhase).toBe('qa_verify')
  })

  it('maps conditional_pass to pass at orchestrator level', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      qaVerdict: 'conditional_pass' as const,
      acVerificationResults: [],
      errors: [],
    } as unknown as QAVerifyV2State

    const result = mapQAResultToOrchestratorState(subgraphResult)

    expect(result.qaResult?.verdict).toBe('pass')
  })

  it('maps fail verdict with failed AC results', () => {
    const acResults = [
      {
        acIndex: 0,
        acText: 'Must validate input',
        verdict: 'pass' as const,
        evidence: 'validation present',
      },
      {
        acIndex: 1,
        acText: 'Must log errors',
        verdict: 'fail' as const,
        evidence: 'no logging found',
      },
    ]
    const subgraphResult = {
      storyId: 'STORY-1',
      qaVerdict: 'fail' as const,
      acVerificationResults: acResults,
      errors: [],
    } as unknown as QAVerifyV2State

    const result = mapQAResultToOrchestratorState(subgraphResult)

    expect(result.qaResult?.verdict).toBe('fail')
    // Only failed items should be in failures
    expect(result.qaResult?.failures).toHaveLength(1)
    expect(result.qaResult?.failures[0]).toMatchObject({
      acIndex: 1,
      verdict: 'fail',
    })
  })

  it('maps null verdict to block', () => {
    const subgraphResult = {
      storyId: 'STORY-1',
      qaVerdict: null,
      acVerificationResults: [],
      errors: [],
    } as unknown as QAVerifyV2State

    const result = mapQAResultToOrchestratorState(subgraphResult)

    expect(result.qaResult?.verdict).toBe('block')
  })
})
