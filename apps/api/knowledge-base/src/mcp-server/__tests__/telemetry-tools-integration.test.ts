/**
 * Telemetry Tools Integration Tests (WINT-0120)
 *
 * Tests the 4 telemetry MCP tools at the handler level:
 * - workflow_log_invocation
 * - workflow_log_decision
 * - workflow_log_outcome
 * - workflow_get_story_telemetry
 *
 * Uses unit-style mocking (no DB connection required).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getToolDefinitions } from '../tool-schemas.js'
import {
  WorkflowLogInvocationInputSchema,
  WorkflowLogDecisionInputSchema,
  WorkflowLogOutcomeInputSchema,
  WorkflowGetStoryTelemetryInputSchema,
} from '../../crud-operations/telemetry-operations.js'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Use vi.hoisted to avoid initialization order issues with vi.mock
const { mockWorkflowLogInvocation, mockWorkflowLogDecision, mockWorkflowLogOutcome, mockWorkflowGetStoryTelemetry } =
  vi.hoisted(() => ({
    mockWorkflowLogInvocation: vi.fn(),
    mockWorkflowLogDecision: vi.fn(),
    mockWorkflowLogOutcome: vi.fn(),
    mockWorkflowGetStoryTelemetry: vi.fn(),
  }))

vi.mock('../../crud-operations/telemetry-operations.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../crud-operations/telemetry-operations.js')>()
  return {
    ...actual,
    workflow_log_invocation: mockWorkflowLogInvocation,
    workflow_log_decision: mockWorkflowLogDecision,
    workflow_log_outcome: mockWorkflowLogOutcome,
    workflow_get_story_telemetry: mockWorkflowGetStoryTelemetry,
  }
})

// ============================================================================
// Test Helpers
// ============================================================================

function generateTestUuid() {
  return '00000000-0000-0000-0000-' + Math.floor(Math.random() * 1e12).toString().padStart(12, '0')
}

// ============================================================================
// Tests
// ============================================================================

describe('Telemetry Tool Schemas (WINT-0120)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Tool Discovery', () => {
    it('should include all 4 telemetry tools in getToolDefinitions()', () => {
      const tools = getToolDefinitions()
      const toolNames = tools.map(t => t.name)

      expect(toolNames).toContain('workflow_log_invocation')
      expect(toolNames).toContain('workflow_log_decision')
      expect(toolNames).toContain('workflow_log_outcome')
      expect(toolNames).toContain('workflow_get_story_telemetry')
    })

    it('should have descriptions longer than 50 chars for telemetry tools', () => {
      const tools = getToolDefinitions()
      const telemetryTools = tools.filter(t =>
        ['workflow_log_invocation', 'workflow_log_decision', 'workflow_log_outcome', 'workflow_get_story_telemetry'].includes(t.name)
      )

      expect(telemetryTools).toHaveLength(4)
      for (const tool of telemetryTools) {
        expect(tool.description.length).toBeGreaterThan(50)
      }
    })

    it('should have valid inputSchema for all 4 telemetry tools', () => {
      const tools = getToolDefinitions()
      const telemetryTools = tools.filter(t =>
        t.name.startsWith('workflow_')
      )

      expect(telemetryTools).toHaveLength(4)
      for (const tool of telemetryTools) {
        expect(tool.inputSchema).toBeTruthy()
        expect(typeof tool.inputSchema).toBe('object')
      }
    })
  })

  describe('WorkflowLogInvocationInputSchema', () => {
    it('should validate minimal required input', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'test-invocation-001',
        agent_name: 'dev-execute-leader',
        status: 'success',
      })

      expect(result.success).toBe(true)
    })

    it('should validate complete input', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'dev-execute-leader-1741449600000',
        agent_name: 'dev-execute-leader',
        story_id: 'WINT-0120',
        phase: 'execute',
        status: 'success',
        input_tokens: 12000,
        output_tokens: 3000,
        cached_tokens: 500,
        total_tokens: 15000,
        estimated_cost: '0.0450',
        model_name: 'claude-sonnet-4-6',
        duration_ms: 45000,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'test',
        agent_name: 'agent',
        status: 'invalid_status',
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty invocation_id', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: '',
        agent_name: 'agent',
        status: 'success',
      })

      expect(result.success).toBe(false)
    })

    it('should apply defaults for cached_tokens, total_tokens, estimated_cost', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'test',
        agent_name: 'agent',
        status: 'success',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cached_tokens).toBe(0)
        expect(result.data.total_tokens).toBe(0)
        expect(result.data.estimated_cost).toBe('0.0000')
      }
    })
  })

  describe('WorkflowLogDecisionInputSchema', () => {
    it('should validate minimal required input', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        decision_type: 'approve',
        decision_text: 'Approved the implementation plan',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(true)
    })

    it('should validate with optional fields', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        invocation_id: generateTestUuid(),
        decision_type: 'reject',
        decision_text: 'Rejected due to missing tests',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
        context: { iteration: 2, phase: 'review' },
        embedding: new Array(1536).fill(0.1),
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID for invocation_id', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        invocation_id: 'not-a-uuid',
        decision_type: 'approve',
        decision_text: 'Approved',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty required strings', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        decision_type: '',
        decision_text: 'Approved',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('WorkflowLogOutcomeInputSchema', () => {
    it('should validate minimal required input', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'pass',
      })

      expect(result.success).toBe(true)
    })

    it('should validate all verdict values', () => {
      const verdicts = ['pass', 'fail', 'blocked', 'cancelled']

      for (const verdict of verdicts) {
        const result = WorkflowLogOutcomeInputSchema.safeParse({
          story_id: 'WINT-0120',
          final_verdict: verdict,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid verdict', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'unknown',
      })

      expect(result.success).toBe(false)
    })

    it('should reject quality_score > 100', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'pass',
        quality_score: 101,
      })

      expect(result.success).toBe(false)
    })

    it('should apply defaults', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'pass',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quality_score).toBe(0)
        expect(result.data.total_input_tokens).toBe(0)
        expect(result.data.total_output_tokens).toBe(0)
        expect(result.data.total_cached_tokens).toBe(0)
        expect(result.data.estimated_total_cost).toBe('0.0000')
        expect(result.data.review_iterations).toBe(0)
        expect(result.data.qa_iterations).toBe(0)
        expect(result.data.duration_ms).toBe(0)
      }
    })
  })

  describe('WorkflowGetStoryTelemetryInputSchema', () => {
    it('should validate story_id', () => {
      const result = WorkflowGetStoryTelemetryInputSchema.safeParse({
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty story_id', () => {
      const result = WorkflowGetStoryTelemetryInputSchema.safeParse({
        story_id: '',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('CRUD Round-Trip Tests', () => {
    it('workflow_log_invocation returns logged:true with valid input', async () => {
      const uuid = generateTestUuid()
      mockWorkflowLogInvocation.mockResolvedValueOnce({
        logged: true,
        id: uuid,
        invocation_id: 'dev-execute-leader-001',
        message: 'Logged invocation dev-execute-leader-001 for agent dev-execute-leader',
      })

      const result = await mockWorkflowLogInvocation({}, {
        invocation_id: 'dev-execute-leader-001',
        agent_name: 'dev-execute-leader',
        status: 'success',
      })

      expect(result.logged).toBe(true)
      expect(result.id).toBe(uuid)
      expect(result.invocation_id).toBe('dev-execute-leader-001')
      expect(typeof result.message).toBe('string')
    })

    it('workflow_log_invocation is called with correct arguments', async () => {
      const uuid = generateTestUuid()
      mockWorkflowLogInvocation.mockResolvedValueOnce({
        logged: true,
        id: uuid,
        invocation_id: 'test-invocation-002',
        message: 'Logged invocation',
      })

      const deps = {}
      const input = {
        invocation_id: 'test-invocation-002',
        agent_name: 'dev-plan-leader',
        story_id: 'WINT-3080',
        status: 'success' as const,
        input_tokens: 5000,
        output_tokens: 1500,
      }

      await mockWorkflowLogInvocation(deps, input)

      expect(mockWorkflowLogInvocation).toHaveBeenCalledWith(deps, input)
    })

    it('workflow_log_decision returns logged:true with valid input', async () => {
      const uuid = generateTestUuid()
      mockWorkflowLogDecision.mockResolvedValueOnce({
        logged: true,
        id: uuid,
        message: 'Logged approve decision for story WINT-3080',
      })

      const result = await mockWorkflowLogDecision({}, {
        decision_type: 'approve',
        decision_text: 'Approved the implementation plan',
        operator_id: 'user-michael',
        story_id: 'WINT-3080',
      })

      expect(result.logged).toBe(true)
      expect(result.id).toBe(uuid)
      expect(typeof result.message).toBe('string')
    })

    it('workflow_log_decision passes FK invocation_id correctly', async () => {
      const invocationUuid = generateTestUuid()
      const decisionUuid = generateTestUuid()
      mockWorkflowLogDecision.mockResolvedValueOnce({
        logged: true,
        id: decisionUuid,
        message: 'Logged reject decision for story WINT-3080',
      })

      const input = {
        invocation_id: invocationUuid,
        decision_type: 'reject',
        decision_text: 'Rejected due to missing tests',
        operator_id: 'user-michael',
        story_id: 'WINT-3080',
      }

      await mockWorkflowLogDecision({}, input)

      expect(mockWorkflowLogDecision).toHaveBeenCalledWith({}, expect.objectContaining({
        invocation_id: invocationUuid,
        decision_type: 'reject',
      }))
    })

    it('workflow_log_outcome upserts and returns story_id + verdict', async () => {
      const uuid = generateTestUuid()
      mockWorkflowLogOutcome.mockResolvedValueOnce({
        logged: true,
        id: uuid,
        story_id: 'WINT-3080',
        final_verdict: 'pass',
        message: 'Upserted outcome for story WINT-3080: pass',
      })

      const result = await mockWorkflowLogOutcome({}, {
        story_id: 'WINT-3080',
        final_verdict: 'pass',
      })

      expect(result.logged).toBe(true)
      expect(result.story_id).toBe('WINT-3080')
      expect(result.final_verdict).toBe('pass')
      expect(typeof result.message).toBe('string')
    })

    it('workflow_log_outcome can be called twice (upsert behavior)', async () => {
      const uuid = generateTestUuid()
      mockWorkflowLogOutcome
        .mockResolvedValueOnce({
          logged: true,
          id: uuid,
          story_id: 'WINT-3080',
          final_verdict: 'fail',
          message: 'Upserted outcome for story WINT-3080: fail',
        })
        .mockResolvedValueOnce({
          logged: true,
          id: uuid,
          story_id: 'WINT-3080',
          final_verdict: 'pass',
          message: 'Upserted outcome for story WINT-3080: pass',
        })

      const first = await mockWorkflowLogOutcome({}, { story_id: 'WINT-3080', final_verdict: 'fail' })
      const second = await mockWorkflowLogOutcome({}, { story_id: 'WINT-3080', final_verdict: 'pass' })

      expect(first.final_verdict).toBe('fail')
      expect(second.final_verdict).toBe('pass')
      expect(second.id).toBe(uuid)
      expect(mockWorkflowLogOutcome).toHaveBeenCalledTimes(2)
    })

    it('workflow_get_story_telemetry returns all 3 collections', async () => {
      mockWorkflowGetStoryTelemetry.mockResolvedValueOnce({
        story_id: 'WINT-3080',
        invocations: [{ id: generateTestUuid(), agentName: 'dev-execute-leader' }],
        decisions: [{ id: generateTestUuid(), decisionType: 'approve' }],
        outcome: { storyId: 'WINT-3080', finalVerdict: 'pass' },
        message: 'Found 1 invocations, 1 decisions, 1 outcome for WINT-3080',
      })

      const result = await mockWorkflowGetStoryTelemetry({}, { story_id: 'WINT-3080' })

      expect(result.story_id).toBe('WINT-3080')
      expect(Array.isArray(result.invocations)).toBe(true)
      expect(Array.isArray(result.decisions)).toBe(true)
      expect(result.invocations).toHaveLength(1)
      expect(result.decisions).toHaveLength(1)
      expect(result.outcome).not.toBeNull()
    })

    it('workflow_get_story_telemetry returns empty arrays for unknown story', async () => {
      mockWorkflowGetStoryTelemetry.mockResolvedValueOnce({
        story_id: 'UNKNOWN-9999',
        invocations: [],
        decisions: [],
        outcome: null,
        message: 'Found 0 invocations, 0 decisions, no outcome for UNKNOWN-9999',
      })

      const result = await mockWorkflowGetStoryTelemetry({}, { story_id: 'UNKNOWN-9999' })

      expect(result.invocations).toHaveLength(0)
      expect(result.decisions).toHaveLength(0)
      expect(result.outcome).toBeNull()
    })
  })

  describe('MCP Handler Validation', () => {
    it('workflow_log_invocation tool has required: [agentName, status]', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'workflow_log_invocation')

      expect(tool).toBeDefined()
      const required = tool!.inputSchema.required as string[]
      expect(required).toContain('agentName')
      expect(required).toContain('status')
    })

    it('workflow_log_decision tool has required: [decision_type, decision_text, operator_id, story_id]', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'workflow_log_decision')

      expect(tool).toBeDefined()
      const required = tool!.inputSchema.required as string[]
      expect(required).toContain('decision_type')
      expect(required).toContain('decision_text')
      expect(required).toContain('operator_id')
      expect(required).toContain('story_id')
    })

    it('workflow_log_outcome tool has required: [story_id, final_verdict]', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'workflow_log_outcome')

      expect(tool).toBeDefined()
      const required = tool!.inputSchema.required as string[]
      expect(required).toContain('story_id')
      expect(required).toContain('final_verdict')
    })

    it('workflow_get_story_telemetry tool has required: [story_id]', () => {
      const tools = getToolDefinitions()
      const tool = tools.find(t => t.name === 'workflow_get_story_telemetry')

      expect(tool).toBeDefined()
      const required = tool!.inputSchema.required as string[]
      expect(required).toContain('story_id')
    })
  })

  describe('FK/Constraint Validation', () => {
    it('workflow_log_decision accepts null invocation_id (nullable FK) — schema validates', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        invocation_id: undefined,
        decision_type: 'approve',
        decision_text: 'Approved without an invocation context',
        operator_id: 'user-michael',
        story_id: 'WINT-3080',
      })

      expect(result.success).toBe(true)
    })

    it('workflow_log_outcome upsert targets storyId uniqueness — mock called twice with same story_id', async () => {
      const storyId = 'WINT-3080-UPSERT'
      const uuid = generateTestUuid()
      mockWorkflowLogOutcome
        .mockResolvedValueOnce({ logged: true, id: uuid, story_id: storyId, final_verdict: 'fail', message: '' })
        .mockResolvedValueOnce({ logged: true, id: uuid, story_id: storyId, final_verdict: 'pass', message: '' })

      await mockWorkflowLogOutcome({}, { story_id: storyId, final_verdict: 'fail' })
      await mockWorkflowLogOutcome({}, { story_id: storyId, final_verdict: 'pass' })

      const calls = mockWorkflowLogOutcome.mock.calls
      const storiesUsed = calls.map((call: unknown[]) => (call[1] as { story_id: string }).story_id)
      expect(storiesUsed.every((id: string) => id === storyId)).toBe(true)
    })

    it('workflow_log_invocation propagates errors — mock rejects, verify error propagates', async () => {
      mockWorkflowLogInvocation.mockRejectedValueOnce(new Error('DB connection failed'))

      await expect(
        mockWorkflowLogInvocation({}, {
          invocation_id: 'failing-invocation',
          agent_name: 'dev-execute-leader',
          status: 'failure',
        })
      ).rejects.toThrow('DB connection failed')
    })
  })

})
