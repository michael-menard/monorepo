/**
 * Artifact Tools Integration Tests
 *
 * Tests the artifact tools at the MCP dispatch layer (handleToolCall), verifying:
 * - Happy-path flows for all 4 artifact tools
 * - Validation error propagation
 * - Database error sanitization (no credentials in error messages)
 * - Authorization: kb_delete_artifact is PM-only; write/read/list allow all roles
 *
 * Uses handleToolCall (same dispatch layer as mcp-integration.test.ts) rather
 * than calling individual handlers directly.
 *
 * @see KBAR-0150 ACs for artifact tool integration requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEmbeddingClient, generateTestUuid, MockDatabaseError } from './test-helpers.js'
import type { ToolHandlerDeps } from '../tool-handlers.js'
import type { ToolCallContext } from '../server.js'
import type { ArtifactResponse, ArtifactListItem } from '../../crud-operations/artifact-operations.js'

// ============================================================================
// Hoisted mock functions (must be hoisted for vi.mock to work with ESM)
// ============================================================================

const {
  mockKbReadArtifact,
  mockKbWriteArtifact,
  mockKbListArtifacts,
  mockKbDeleteArtifact,
} = vi.hoisted(() => ({
  mockKbReadArtifact: vi.fn(),
  mockKbWriteArtifact: vi.fn(),
  mockKbListArtifacts: vi.fn(),
  mockKbDeleteArtifact: vi.fn(),
}))

// Mock the logger
vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock the artifact-operations module specifically (not crud-operations/index.js)
vi.mock('../../crud-operations/artifact-operations.js', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../crud-operations/artifact-operations.js')>()
  return {
    ...actual,
    kb_read_artifact: mockKbReadArtifact,
    kb_write_artifact: mockKbWriteArtifact,
    kb_list_artifacts: mockKbListArtifacts,
    kb_delete_artifact: mockKbDeleteArtifact,
  }
})

// handleToolCall import comes AFTER vi.mock declarations (ESM hoisting requirement)
import { handleToolCall } from '../tool-handlers.js'

// ============================================================================
// Artifact fixture factories (copied from artifact-tools.test.ts per Reuse Plan)
// ============================================================================

function createMockArtifact(overrides?: Partial<ArtifactResponse>): ArtifactResponse {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    story_id: 'KBAR-0150',
    artifact_type: 'checkpoint',
    artifact_name: 'CHECKPOINT',
    phase: 'implementation',
    iteration: 0,
    content: { status: 'test' },
    summary: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

function createMockArtifactListItem(overrides?: Partial<ArtifactListItem>): ArtifactListItem {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    story_id: 'KBAR-0150',
    artifact_type: 'checkpoint',
    artifact_name: 'CHECKPOINT',
    phase: 'implementation',
    iteration: 0,
    summary: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

// Create a fresh PM context for each call — tool_call_chain is mutated by handleToolCall
// so a shared context would trigger CIRCULAR_DEPENDENCY on repeated calls with the same tool
function makePmContext(): ToolCallContext {
  return {
    correlation_id: 'test-correlation-id',
    tool_call_chain: [],
    start_time: Date.now(),
    agent_role: 'pm',
  }
}

describe('Artifact Tools Integration (via handleToolCall dispatch)', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  // ==========================================================================
  // AC-1: kb_write_artifact — happy path and validation via handleToolCall
  // ==========================================================================
  describe('kb_write_artifact', () => {
    it('AC-1: returns JSON-serialized artifact on successful write', async () => {
      const mockArtifact = createMockArtifact({
        story_id: 'KBAR-0150',
        artifact_type: 'checkpoint',
        content: { status: 'test' },
      })
      mockKbWriteArtifact.mockResolvedValue(mockArtifact)

      const result = await handleToolCall(
        'kb_write_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint', content: { status: 'test' } },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(result.content[0].type).toBe('text')
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story_id).toBe('KBAR-0150')
      expect(parsed.artifact_type).toBe('checkpoint')
    })

    // AC-5: validation error
    it('AC-5: returns VALIDATION_ERROR for empty story_id', async () => {
      const result = await handleToolCall(
        'kb_write_artifact',
        { story_id: '', artifact_type: 'checkpoint', content: {} },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('AC-5: returns VALIDATION_ERROR when content is missing', async () => {
      const result = await handleToolCall(
        'kb_write_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    // AC-6: DB error sanitization
    it('AC-6: sanitizes DB error — no credentials in error message', async () => {
      mockKbWriteArtifact.mockRejectedValue(
        new MockDatabaseError('Connection to postgresql://admin:password=secret123@db:5432 failed'),
      )

      const result = await handleToolCall(
        'kb_write_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint', content: { status: 'test' } },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      expect(result.content[0].text).not.toContain('password')
      expect(result.content[0].text).not.toContain('secret123')
    })
  })

  // ==========================================================================
  // AC-2: kb_read_artifact — happy path (hit + null miss) via handleToolCall
  // ==========================================================================
  describe('kb_read_artifact', () => {
    it('AC-2: returns JSON-serialized artifact when artifact exists (cache hit)', async () => {
      const mockArtifact = createMockArtifact({ story_id: 'KBAR-0150' })
      mockKbReadArtifact.mockResolvedValue(mockArtifact)

      const result = await handleToolCall(
        'kb_read_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).not.toBeNull()
      expect(parsed.story_id).toBe('KBAR-0150')
    })

    it('AC-2: returns literal string "null" (not JSON null) when artifact not found (cache miss)', async () => {
      mockKbReadArtifact.mockResolvedValue(null)

      const result = await handleToolCall(
        'kb_read_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      // Critical: text must be the string 'null', not JSON null or undefined
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toBe('null')
    })

    // AC-5: validation error
    it('AC-5: returns VALIDATION_ERROR when story_id is missing', async () => {
      const result = await handleToolCall(
        'kb_read_artifact',
        { artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('AC-5: returns VALIDATION_ERROR for empty story_id', async () => {
      const result = await handleToolCall(
        'kb_read_artifact',
        { story_id: '', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    // AC-6: DB error sanitization
    it('AC-6: sanitizes DB error — no credentials in error message', async () => {
      mockKbReadArtifact.mockRejectedValue(
        new MockDatabaseError('Connection using password=dbpass failed'),
      )

      const result = await handleToolCall(
        'kb_read_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      expect(result.content[0].text).not.toContain('password')
      expect(result.content[0].text).not.toContain('dbpass')
    })
  })

  // ==========================================================================
  // AC-3: kb_list_artifacts — happy path (list, empty list) via handleToolCall
  // ==========================================================================
  describe('kb_list_artifacts', () => {
    it('AC-3: returns artifact list with count', async () => {
      const artifact1 = createMockArtifactListItem({ artifact_type: 'checkpoint' })
      const artifact2 = createMockArtifactListItem({ artifact_type: 'evidence' })
      mockKbListArtifacts.mockResolvedValue({ artifacts: [artifact1, artifact2], total: 2 })

      const result = await handleToolCall(
        'kb_list_artifacts',
        { story_id: 'KBAR-0150' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.artifacts).toHaveLength(2)
      expect(parsed.total).toBe(2)
    })

    it('AC-3: returns empty list { artifacts: [], total: 0 } when no artifacts found', async () => {
      mockKbListArtifacts.mockResolvedValue({ artifacts: [], total: 0 })

      const result = await handleToolCall(
        'kb_list_artifacts',
        { story_id: 'KBAR-0150' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.artifacts).toHaveLength(0)
      expect(parsed.total).toBe(0)
    })

    // AC-5: validation error
    it('AC-5: returns VALIDATION_ERROR when story_id is missing', async () => {
      const result = await handleToolCall('kb_list_artifacts', {}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    // AC-6: DB error sanitization
    it('AC-6: sanitizes DB error — no credentials in error message', async () => {
      mockKbListArtifacts.mockRejectedValue(
        new MockDatabaseError('DB connection with password=hunter2 refused'),
      )

      const result = await handleToolCall(
        'kb_list_artifacts',
        { story_id: 'KBAR-0150' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      expect(result.content[0].text).not.toContain('password')
      expect(result.content[0].text).not.toContain('hunter2')
    })
  })

  // ==========================================================================
  // AC-4: kb_delete_artifact — happy path (deleted: true / false) via handleToolCall (PM role)
  // ==========================================================================
  describe('kb_delete_artifact', () => {
    it('AC-4: returns { deleted: true, artifact_id } on successful deletion (PM role)', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockResolvedValue(true)

      const result = await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        makePmContext(),
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.deleted).toBe(true)
      expect(parsed.artifact_id).toBe(artifactId)
    })

    it('AC-4: returns { deleted: false, artifact_id } when artifact not found (PM role)', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockResolvedValue(false)

      const result = await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        makePmContext(),
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.deleted).toBe(false)
      expect(parsed.artifact_id).toBe(artifactId)
    })

    // AC-5: validation error
    it('AC-5: returns VALIDATION_ERROR for non-UUID artifact_id', async () => {
      const result = await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: 'not-a-uuid' },
        mockDeps,
        makePmContext(),
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    // AC-6: DB error sanitization
    it('AC-6: sanitizes DB error for PM role — no credentials in error message', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockRejectedValue(
        new MockDatabaseError('Delete failed: password=secret at db.prod:5432'),
      )

      const result = await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        makePmContext(),
      )

      expect(result.isError).toBe(true)
      expect(result.content[0].text).not.toContain('password')
      expect(result.content[0].text).not.toContain('secret')
    })
  })

  // ==========================================================================
  // AC-7: FORBIDDEN for kb_delete_artifact with non-PM roles
  // AC-8: Open access for kb_write_artifact, kb_read_artifact, kb_list_artifacts
  // AC-9: Business logic executed for PM; NOT executed for non-PM (FORBIDDEN)
  // ==========================================================================
  describe('Authorization (AC-7, AC-8, AC-9)', () => {
    // AC-7: kb_delete_artifact returns FORBIDDEN for dev role
    it('AC-7: returns FORBIDDEN for dev role on kb_delete_artifact', async () => {
      const artifactId = generateTestUuid()
      const devContext: ToolCallContext = {
        correlation_id: 'test-dev',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev',
      }

      const result = await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        devContext,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
    })

    // AC-7: kb_delete_artifact returns FORBIDDEN for qa role
    it('AC-7: returns FORBIDDEN for qa role on kb_delete_artifact', async () => {
      const artifactId = generateTestUuid()
      const qaContext: ToolCallContext = {
        correlation_id: 'test-qa',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'qa',
      }

      const result = await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        qaContext,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
    })

    // AC-7: kb_delete_artifact returns FORBIDDEN for all role
    it('AC-7: returns FORBIDDEN for all role on kb_delete_artifact', async () => {
      const artifactId = generateTestUuid()
      const allContext: ToolCallContext = {
        correlation_id: 'test-all',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'all',
      }

      const result = await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        allContext,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
    })

    // AC-8: kb_write_artifact accessible by dev role (no FORBIDDEN)
    it('AC-8: dev role can call kb_write_artifact (no FORBIDDEN)', async () => {
      const mockArtifact = createMockArtifact({ story_id: 'KBAR-0150' })
      mockKbWriteArtifact.mockResolvedValue(mockArtifact)

      const devContext: ToolCallContext = {
        correlation_id: 'test-dev',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev',
      }

      const result = await handleToolCall(
        'kb_write_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint', content: { status: 'test' } },
        mockDeps,
        devContext,
      )

      expect(result.isError).toBeUndefined()
    })

    // AC-8: kb_read_artifact accessible by qa role (no FORBIDDEN)
    it('AC-8: qa role can call kb_read_artifact (no FORBIDDEN)', async () => {
      mockKbReadArtifact.mockResolvedValue(null)

      const qaContext: ToolCallContext = {
        correlation_id: 'test-qa',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'qa',
      }

      const result = await handleToolCall(
        'kb_read_artifact',
        { story_id: 'KBAR-0150', artifact_type: 'checkpoint' },
        mockDeps,
        qaContext,
      )

      expect(result.isError).toBeUndefined()
    })

    // AC-8: kb_list_artifacts accessible by all role (no FORBIDDEN)
    it('AC-8: all role can call kb_list_artifacts (no FORBIDDEN)', async () => {
      mockKbListArtifacts.mockResolvedValue({ artifacts: [], total: 0 })

      const allContext: ToolCallContext = {
        correlation_id: 'test-all',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'all',
      }

      const result = await handleToolCall(
        'kb_list_artifacts',
        { story_id: 'KBAR-0150' },
        mockDeps,
        allContext,
      )

      expect(result.isError).toBeUndefined()
    })

    // AC-8: all 4 roles can call kb_write_artifact
    it('AC-8: all 4 roles (pm, dev, qa, all) can call kb_write_artifact', async () => {
      const roles = ['pm', 'dev', 'qa', 'all'] as const
      const mockArtifact = createMockArtifact({ story_id: 'KBAR-0150' })
      mockKbWriteArtifact.mockResolvedValue(mockArtifact)

      for (const role of roles) {
        const context: ToolCallContext = {
          correlation_id: `test-${role}`,
          tool_call_chain: [],
          start_time: Date.now(),
          agent_role: role,
        }

        const result = await handleToolCall(
          'kb_write_artifact',
          { story_id: 'KBAR-0150', artifact_type: 'checkpoint', content: { status: 'test' } },
          mockDeps,
          context,
        )

        // No FORBIDDEN for any of these roles
        expect(result.isError).toBeUndefined()
      }
    })

    // AC-9: PM role — business logic IS executed (mock CRUD called)
    it('AC-9: kb_delete_artifact with PM role — CRUD function IS called', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockResolvedValue(true)

      await handleToolCall('kb_delete_artifact', { artifact_id: artifactId }, mockDeps, makePmContext())

      expect(mockKbDeleteArtifact).toHaveBeenCalled()
    })

    // AC-9: non-PM roles — business logic NOT executed (FORBIDDEN returned immediately)
    it('AC-9: kb_delete_artifact with dev role — CRUD function NOT called (FORBIDDEN gate)', async () => {
      const artifactId = generateTestUuid()
      const devContext: ToolCallContext = {
        correlation_id: 'test-dev',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev',
      }

      await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        devContext,
      )

      expect(mockKbDeleteArtifact).not.toHaveBeenCalled()
    })

    it('AC-9: kb_delete_artifact with qa role — CRUD function NOT called (FORBIDDEN gate)', async () => {
      const artifactId = generateTestUuid()
      const qaContext: ToolCallContext = {
        correlation_id: 'test-qa',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'qa',
      }

      await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        qaContext,
      )

      expect(mockKbDeleteArtifact).not.toHaveBeenCalled()
    })

    it('AC-9: kb_delete_artifact with all role — CRUD function NOT called (FORBIDDEN gate)', async () => {
      const artifactId = generateTestUuid()
      const allContext: ToolCallContext = {
        correlation_id: 'test-all',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'all',
      }

      await handleToolCall(
        'kb_delete_artifact',
        { artifact_id: artifactId },
        mockDeps,
        allContext,
      )

      expect(mockKbDeleteArtifact).not.toHaveBeenCalled()
    })
  })
})
