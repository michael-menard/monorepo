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
  buildSystemPrompt,
  parseToolCall,
  checkPostconditions,
  createRefinementAgentNode,
  type LlmAdapterFn,
  type LlmMessage,
} from '../refinement-agent.js'
import type { Flow, NormalizedPlan } from '../../../state/plan-refinement-state.js'
import type { GroundingContext, PlanRefinementV2State } from '../../../state/plan-refinement-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeFlow = (id: string, overrides: Partial<Flow> = {}): Flow => ({
  id,
  name: `Flow ${id}`,
  actor: 'user',
  trigger: `trigger-${id}`,
  steps: [],
  successOutcome: 'success',
  source: 'inferred',
  confidence: 0.9,
  status: 'unconfirmed',
  ...overrides,
})

const makeNormalizedPlan = (): NormalizedPlan => ({
  planSlug: 'test-plan',
  title: 'Test Plan',
  summary: 'A test plan',
  problemStatement: 'Problem here',
  proposedSolution: 'Solution here',
  goals: [],
  nonGoals: [],
  flows: [],
  openQuestions: [],
  warnings: [],
  constraints: [],
  dependencies: [],
  status: 'draft',
  priority: 'medium',
  tags: [],
})

const makeGroundingContext = (overrides: Partial<GroundingContext> = {}): GroundingContext => ({
  existingStories: [],
  relatedPlans: [],
  existingPatterns: [],
  feasibilityFlags: [],
  ...overrides,
})

const makeBaseState = (overrides: Partial<PlanRefinementV2State> = {}): PlanRefinementV2State => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan: makeNormalizedPlan(),
  flows: [makeFlow('flow-1'), makeFlow('flow-2')],
  groundingContext: makeGroundingContext(),
  postconditionResult: null,
  refinementV2Phase: 'refinement_agent',
  retryCount: 0,
  maxRetries: 3,
  internalIterations: 0,
  tokenUsage: [],
  bakeOffVersion: 'v2-agentic',
  warnings: [],
  errors: [],
  ...overrides,
})

// ============================================================================
// buildSystemPrompt tests
// ============================================================================

describe('buildSystemPrompt', () => {
  it('includes plan slug and title', () => {
    const plan = makeNormalizedPlan()
    const prompt = buildSystemPrompt(plan, [], null)
    expect(prompt).toContain('test-plan')
    expect(prompt).toContain('Test Plan')
  })

  it('includes flow ids and confidence', () => {
    const flows = [makeFlow('flow-1', { confidence: 0.8 })]
    const prompt = buildSystemPrompt(makeNormalizedPlan(), flows, null)
    expect(prompt).toContain('flow-1')
    expect(prompt).toContain('0.8')
  })

  it('includes feasibility flags from grounding context', () => {
    const ctx = makeGroundingContext({
      feasibilityFlags: [
        { claim: 'Flow X', flag: 'already_implemented', evidence: 'story APRS-001 exists' },
      ],
    })
    const prompt = buildSystemPrompt(makeNormalizedPlan(), [], ctx)
    expect(prompt).toContain('already_implemented')
    expect(prompt).toContain('APRS-001')
  })

  it('includes POSTCONDITIONS section', () => {
    const prompt = buildSystemPrompt(makeNormalizedPlan(), [], null)
    expect(prompt).toContain('POSTCONDITIONS')
    expect(prompt).toContain('every_flow_has_source_confidence')
  })

  it('includes AVAILABLE TOOLS section', () => {
    const prompt = buildSystemPrompt(makeNormalizedPlan(), [], null)
    expect(prompt).toContain('AVAILABLE TOOLS')
    expect(prompt).toContain('query_kb')
    expect(prompt).toContain('update_flows')
    expect(prompt).toContain('complete')
  })

  it('includes PREVIOUS ATTEMPT FAILURES when provided', () => {
    const failures = [{ check: 'evidence_non_empty', reason: 'Evidence was empty' }]
    const prompt = buildSystemPrompt(makeNormalizedPlan(), [], null, failures)
    expect(prompt).toContain('PREVIOUS ATTEMPT FAILURES')
    expect(prompt).toContain('evidence_non_empty')
  })

  it('does not include PREVIOUS ATTEMPT FAILURES section when none provided', () => {
    const prompt = buildSystemPrompt(makeNormalizedPlan(), [], null)
    expect(prompt).not.toContain('PREVIOUS ATTEMPT FAILURES')
  })
})

// ============================================================================
// parseToolCall tests
// ============================================================================

describe('parseToolCall', () => {
  it('parses a valid complete tool call', () => {
    const response = JSON.stringify({
      tool: 'complete',
      args: { evidence: { check1: 'value1' } },
    })
    const result = parseToolCall(response)
    expect(result).not.toBeNull()
    expect(result?.tool).toBe('complete')
  })

  it('parses tool call wrapped in markdown code block', () => {
    const response = '```json\n{"tool":"query_kb","args":{"query":"test"}}\n```'
    const result = parseToolCall(response)
    expect(result).not.toBeNull()
    expect(result?.tool).toBe('query_kb')
  })

  it('returns null for invalid JSON', () => {
    const result = parseToolCall('not json at all')
    expect(result).toBeNull()
  })

  it('returns null when tool is not a valid enum value', () => {
    const response = JSON.stringify({ tool: 'invalid_tool', args: {} })
    const result = parseToolCall(response)
    expect(result).toBeNull()
  })

  it('parses update_flows tool call', () => {
    const response = JSON.stringify({
      tool: 'update_flows',
      args: { flows: [] },
    })
    const result = parseToolCall(response)
    expect(result?.tool).toBe('update_flows')
  })

  it('parses flag_for_human tool call', () => {
    const response = JSON.stringify({
      tool: 'flag_for_human',
      args: { flowId: 'flow-1', reason: 'too vague' },
    })
    const result = parseToolCall(response)
    expect(result?.tool).toBe('flag_for_human')
    expect(result?.args['flowId']).toBe('flow-1')
  })
})

// ============================================================================
// checkPostconditions tests
// ============================================================================

describe('checkPostconditions', () => {
  it('passes when all flows have source+confidence and evidence is non-empty', () => {
    const flows = [makeFlow('flow-1', { source: 'inferred', confidence: 0.9 })]
    const evidence = { checked: 'all good' }
    const result = checkPostconditions(flows, evidence, [])
    expect(result.passed).toBe(true)
    expect(result.failures).toHaveLength(0)
  })

  it('fails with evidence_non_empty when evidence record is empty', () => {
    const flows = [makeFlow('flow-1')]
    const result = checkPostconditions(flows, {}, [])
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'evidence_non_empty')).toBe(true)
  })

  it('fails with low_confidence_flows_addressed when confidence < 0.7 and not flagged', () => {
    const flows = [makeFlow('flow-1', { confidence: 0.5 })]
    const evidence = { checked: 'something' }
    const result = checkPostconditions(flows, evidence, [])
    expect(result.failures.some(f => f.check === 'low_confidence_flows_addressed')).toBe(true)
  })

  it('passes low_confidence check when flow is flagged for human review', () => {
    const flows = [makeFlow('flow-1', { confidence: 0.5 })]
    const evidence = { checked: 'something' }
    const flaggedForHuman = new Set(['flow-1'])
    const result = checkPostconditions(flows, evidence, [], flaggedForHuman)
    expect(result.failures.some(f => f.check === 'low_confidence_flows_addressed')).toBe(false)
  })

  it('fails with no_flow_contradictions when two flows share actor+trigger', () => {
    const flows = [
      makeFlow('flow-1', { actor: 'user', trigger: 'click submit' }),
      makeFlow('flow-2', { actor: 'user', trigger: 'click submit' }),
    ]
    const evidence = { checked: 'done' }
    const result = checkPostconditions(flows, evidence, [])
    expect(result.failures.some(f => f.check === 'no_flow_contradictions')).toBe(true)
  })

  it('passes no_flow_contradictions when flows have different triggers', () => {
    const flows = [
      makeFlow('flow-1', { actor: 'user', trigger: 'click submit' }),
      makeFlow('flow-2', { actor: 'user', trigger: 'page load' }),
    ]
    const evidence = { checked: 'done' }
    const result = checkPostconditions(flows, evidence, [])
    expect(result.failures.some(f => f.check === 'no_flow_contradictions')).toBe(false)
  })

  it('includes evidence in result', () => {
    const flows = [makeFlow('flow-1')]
    const evidence = { 'query_kb:test': 'some result' }
    const result = checkPostconditions(flows, evidence, [])
    expect(result.evidence).toEqual(evidence)
  })
})

// ============================================================================
// createRefinementAgentNode tests
// ============================================================================

describe('createRefinementAgentNode', () => {
  it('sets refinementV2Phase to postcondition_gate', async () => {
    const node = createRefinementAgentNode()
    const result = await node(makeBaseState())
    expect(result.refinementV2Phase).toBe('postcondition_gate')
  })

  it('returns postconditionResult', async () => {
    const node = createRefinementAgentNode()
    const result = await node(makeBaseState())
    expect(result.postconditionResult).not.toBeNull()
  })

  it('returns flows in result', async () => {
    const node = createRefinementAgentNode()
    const result = await node(makeBaseState())
    expect(Array.isArray(result.flows)).toBe(true)
  })

  it('returns tokenUsage array', async () => {
    const node = createRefinementAgentNode()
    const result = await node(makeBaseState())
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('returns error state when normalizedPlan is null', async () => {
    const node = createRefinementAgentNode()
    const result = await node(makeBaseState({ normalizedPlan: null }))
    expect(result.errors).toBeDefined()
    expect((result.errors as string[]).length).toBeGreaterThan(0)
    expect(result.refinementV2Phase).toBe('postcondition_gate')
  })

  it('calls llmAdapter with messages', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue({
      content: JSON.stringify({ tool: 'complete', args: { evidence: { stub: 'done' } } }),
      inputTokens: 10,
      outputTokens: 5,
    })
    const node = createRefinementAgentNode({ llmAdapter })
    await node(makeBaseState())
    expect(llmAdapter).toHaveBeenCalled()
    const callArgs = (llmAdapter as ReturnType<typeof vi.fn>).mock.calls[0][0] as LlmMessage[]
    expect(Array.isArray(callArgs)).toBe(true)
    expect(callArgs[0].role).toBe('system')
  })

  it('tracks token usage from llmAdapter', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue({
      content: JSON.stringify({ tool: 'complete', args: { evidence: { stub: 'done' } } }),
      inputTokens: 100,
      outputTokens: 50,
    })
    const node = createRefinementAgentNode({ llmAdapter })
    const result = await node(makeBaseState())
    const tokenUsage = result.tokenUsage as Array<{ inputTokens: number; outputTokens: number; nodeId: string }>
    expect(tokenUsage.some(t => t.inputTokens === 100 && t.outputTokens === 50)).toBe(true)
  })

  it('calls queryKb adapter when LLM returns query_kb tool call', async () => {
    const queryKb = vi.fn().mockResolvedValue('KB result text')
    // First call returns query_kb, second call returns complete
    const llmAdapter: LlmAdapterFn = vi
      .fn()
      .mockResolvedValueOnce({
        content: JSON.stringify({ tool: 'query_kb', args: { query: 'find flows' } }),
        inputTokens: 10,
        outputTokens: 5,
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ tool: 'complete', args: { evidence: { stub: 'done' } } }),
        inputTokens: 10,
        outputTokens: 5,
      })
    const node = createRefinementAgentNode({ llmAdapter, queryKb })
    await node(makeBaseState())
    expect(queryKb).toHaveBeenCalledWith('find flows')
  })

  it('calls flagForHuman adapter when LLM returns flag_for_human tool call', async () => {
    const flagForHuman = vi.fn().mockResolvedValue(undefined)
    const llmAdapter: LlmAdapterFn = vi
      .fn()
      .mockResolvedValueOnce({
        content: JSON.stringify({
          tool: 'flag_for_human',
          args: { flowId: 'flow-1', reason: 'ambiguous trigger' },
        }),
        inputTokens: 10,
        outputTokens: 5,
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({ tool: 'complete', args: { evidence: { flagged: 'flow-1' } } }),
        inputTokens: 5,
        outputTokens: 2,
      })
    const node = createRefinementAgentNode({ llmAdapter, flagForHuman })
    await node(makeBaseState())
    expect(flagForHuman).toHaveBeenCalledWith('flow-1', 'ambiguous trigger')
  })

  it('handles LLM adapter throwing — continues gracefully', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockRejectedValue(new Error('LLM error'))
    const node = createRefinementAgentNode({ llmAdapter })
    const result = await node(makeBaseState())
    expect(result.refinementV2Phase).toBe('postcondition_gate')
  })

  it('respects maxInternalIterations config', async () => {
    // LLM always returns invalid tool call to keep looping
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue({
      content: 'not a valid tool call',
      inputTokens: 5,
      outputTokens: 2,
    })
    const node = createRefinementAgentNode({ llmAdapter, maxInternalIterations: 2 })
    const result = await node(makeBaseState())
    // Should exit after 2 iterations max
    expect((llmAdapter as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(2)
    expect(result.refinementV2Phase).toBe('postcondition_gate')
  })

  it('tags tokenUsage entries with nodeId refinement_agent', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue({
      content: JSON.stringify({ tool: 'complete', args: { evidence: { done: 'yes' } } }),
      inputTokens: 10,
      outputTokens: 5,
    })
    const node = createRefinementAgentNode({ llmAdapter })
    const result = await node(makeBaseState())
    const tokenUsage = result.tokenUsage as Array<{ nodeId: string }>
    expect(tokenUsage.every(t => t.nodeId === 'refinement_agent')).toBe(true)
  })
})
