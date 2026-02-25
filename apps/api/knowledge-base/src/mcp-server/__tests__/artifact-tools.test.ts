/**
 * Artifact Tool Handler Tests
 *
 * Tests for the 4 artifact tool handlers:
 * - kb_read_artifact: Read a workflow artifact from the database
 * - kb_write_artifact: Write (create or update) a workflow artifact
 * - kb_list_artifacts: List artifacts for a story with optional filters
 * - kb_delete_artifact: Delete a workflow artifact by UUID
 *
 * @see KBAR-0120 ACs for artifact tool requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEmbeddingClient, generateTestUuid } from './test-helpers.js'
import type { ToolHandlerDeps } from '../tool-handlers.js'
import type { ToolCallContext } from '../server.js'
import type { ArtifactResponse, ArtifactListItem } from '../../crud-operations/artifact-operations.js'

// ============================================================================
// Hoisted mock functions (must be hoisted for vi.mock to work)
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

import {
  handleKbReadArtifact,
  handleKbWriteArtifact,
  handleKbListArtifacts,
  handleKbDeleteArtifact,
} from '../tool-handlers.js'

// ============================================================================
// Artifact fixture factory
// ============================================================================

function createMockArtifact(overrides?: Partial<ArtifactResponse>): ArtifactResponse {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    story_id: 'KBAR-0120',
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
    story_id: 'KBAR-0120',
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

describe('Artifact Tool Handlers', () => {
  let mockDeps: ToolHandlerDeps

  // Context with pm role — required for kb_delete_artifact (admin-only operation)
  const pmContext: ToolCallContext = {
    correlation_id: 'test-correlation-id',
    tool_call_chain: [],
    start_time: Date.now(),
    agent_role: 'pm',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  // ==========================================================================
  // AC-2: handleKbReadArtifact
  // ==========================================================================
  describe('handleKbReadArtifact', () => {
    // HP-1: artifact found — returns JSON-serialized ArtifactResponse
    it('should return JSON-serialized artifact when artifact exists (HP-1)', async () => {
      const mockArtifact = createMockArtifact({ story_id: 'KBAR-0120' })
      mockKbReadArtifact.mockResolvedValue(mockArtifact)

      const result = await handleKbReadArtifact(
        { story_id: 'KBAR-0120', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(result.content[0].type).toBe('text')
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.id).toBe(mockArtifact.id)
      expect(parsed.story_id).toBe('KBAR-0120')
      expect(parsed.artifact_type).toBe('checkpoint')
    })

    // EC-1: artifact not found — returns literal string 'null' (NOT JSON null)
    it('should return literal string "null" text when artifact not found (EC-1)', async () => {
      mockKbReadArtifact.mockResolvedValue(null)

      const result = await handleKbReadArtifact(
        { story_id: 'KBAR-0120', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      // Critical: text must be the string 'null', not JSON null or undefined
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toBe('null')
    })

    // EC-2: invalid input — returns MCP error result
    it('should return MCP error result for invalid input (EC-2)', async () => {
      const result = await handleKbReadArtifact(
        { story_id: '', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
    })

    // EC-3: DB rejection — returns MCP error result, does not throw
    it('should return MCP error result on DB rejection (EC-3)', async () => {
      mockKbReadArtifact.mockRejectedValue(new Error('DB connection failed'))

      const result = await handleKbReadArtifact(
        { story_id: 'KBAR-0120', artifact_type: 'checkpoint' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
    })

    // ED-1: explicit iteration: 0 — mock called with the iteration value
    it('should call kb_read_artifact with explicit iteration: 0 (ED-1)', async () => {
      const mockArtifact = createMockArtifact({ iteration: 0 })
      mockKbReadArtifact.mockResolvedValue(mockArtifact)

      await handleKbReadArtifact(
        { story_id: 'KBAR-0120', artifact_type: 'checkpoint', iteration: 0 },
        mockDeps,
      )

      expect(mockKbReadArtifact).toHaveBeenCalledTimes(1)
      expect(mockKbReadArtifact.mock.calls[0][0].iteration).toBe(0)
    })
  })

  // ==========================================================================
  // AC-3: handleKbWriteArtifact
  // ==========================================================================
  describe('handleKbWriteArtifact', () => {
    // HP-2: successful write — returns JSON-serialized ArtifactResponse
    it('should return JSON-serialized artifact on successful write (HP-2)', async () => {
      const mockArtifact = createMockArtifact({
        story_id: 'KBAR-0120',
        artifact_type: 'evidence',
        artifact_name: 'EVIDENCE',
      })
      mockKbWriteArtifact.mockResolvedValue(mockArtifact)

      const result = await handleKbWriteArtifact(
        {
          story_id: 'KBAR-0120',
          artifact_type: 'evidence',
          content: { ac_results: [] },
        },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(result.content[0].type).toBe('text')
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story_id).toBe('KBAR-0120')
      expect(parsed.artifact_type).toBe('evidence')
    })

    // EC-4: invalid input (missing required fields) — returns MCP error result
    it('should return MCP error result for missing required fields (EC-4)', async () => {
      const result = await handleKbWriteArtifact(
        // Missing content field
        { story_id: 'KBAR-0120', artifact_type: 'evidence' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
    })

    // EC-5: DB rejection — returns MCP error result, does not throw
    it('should return MCP error result on DB rejection (EC-5)', async () => {
      mockKbWriteArtifact.mockRejectedValue(new Error('DB connection failed'))

      const result = await handleKbWriteArtifact(
        {
          story_id: 'KBAR-0120',
          artifact_type: 'checkpoint',
          content: { status: 'test' },
        },
        mockDeps,
      )

      expect(result.isError).toBe(true)
    })

    // ED-2: iteration: 2 passes through to the operation
    it('should pass iteration: 2 through to the operation (ED-2)', async () => {
      const mockArtifact = createMockArtifact({ iteration: 2 })
      mockKbWriteArtifact.mockResolvedValue(mockArtifact)

      const result = await handleKbWriteArtifact(
        {
          story_id: 'KBAR-0120',
          artifact_type: 'fix_summary',
          content: { summary: 'fix cycle 2' },
          iteration: 2,
        },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.iteration).toBe(2)
      expect(mockKbWriteArtifact).toHaveBeenCalledWith(
        expect.objectContaining({ iteration: 2 }),
        expect.anything(),
      )
    })
  })

  // ==========================================================================
  // AC-4: handleKbListArtifacts
  // ==========================================================================
  describe('handleKbListArtifacts', () => {
    // HP-3: returns artifact list with count
    it('should return artifact list with count (HP-3)', async () => {
      const artifact1 = createMockArtifactListItem({ artifact_type: 'checkpoint' })
      const artifact2 = createMockArtifactListItem({ artifact_type: 'evidence' })
      mockKbListArtifacts.mockResolvedValue({ artifacts: [artifact1, artifact2], total: 2 })

      const result = await handleKbListArtifacts({ story_id: 'KBAR-0120' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.total).toBe(2)
      expect(parsed.artifacts).toHaveLength(2)
    })

    // HP-5: with include_content: true — content field present on items
    it('should return artifacts with content field when include_content is true (HP-5)', async () => {
      const artifactWithContent = createMockArtifactListItem({
        content: { status: 'test', details: 'included' },
      })
      mockKbListArtifacts.mockResolvedValue({ artifacts: [artifactWithContent], total: 1 })

      const result = await handleKbListArtifacts(
        { story_id: 'KBAR-0120', include_content: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.artifacts[0].content).toBeDefined()
      expect(mockKbListArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({ include_content: true }),
        expect.anything(),
      )
    })

    // EC-6: empty result — returns { artifacts: [], total: 0 }
    it('should return empty list when no artifacts found (EC-6)', async () => {
      mockKbListArtifacts.mockResolvedValue({ artifacts: [], total: 0 })

      const result = await handleKbListArtifacts({ story_id: 'KBAR-NONEXISTENT' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.artifacts).toHaveLength(0)
      expect(parsed.total).toBe(0)
    })

    // EC-7: DB rejection — returns MCP error result
    it('should return MCP error result on DB rejection (EC-7)', async () => {
      mockKbListArtifacts.mockRejectedValue(new Error('DB connection failed'))

      const result = await handleKbListArtifacts({ story_id: 'KBAR-0120' }, mockDeps)

      expect(result.isError).toBe(true)
    })

    // ED-3: artifact_type filter is forwarded to the operation
    it('should forward artifact_type filter to the operation (ED-3)', async () => {
      const evidenceArtifact = createMockArtifactListItem({ artifact_type: 'evidence' })
      mockKbListArtifacts.mockResolvedValue({ artifacts: [evidenceArtifact], total: 1 })

      const result = await handleKbListArtifacts(
        { story_id: 'KBAR-0120', artifact_type: 'evidence' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(mockKbListArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({ artifact_type: 'evidence' }),
        expect.anything(),
      )
    })
  })

  // ==========================================================================
  // AC-5: handleKbDeleteArtifact
  // Note: kb_delete_artifact is PM-only (admin operation). Tests pass pmContext
  // with agent_role: 'pm' for success paths. Error paths (EC-9, EC-10) also
  // use pmContext to isolate the error under test (not authorization failure).
  // ==========================================================================
  describe('handleKbDeleteArtifact', () => {
    // HP-4: artifact deleted — returns success JSON with deleted: true
    it('should return deleted: true on successful deletion (HP-4)', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockResolvedValue(true)

      const result = await handleKbDeleteArtifact({ artifact_id: artifactId }, mockDeps, pmContext)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.deleted).toBe(true)
      expect(parsed.artifact_id).toBe(artifactId)
    })

    // EC-8: artifact not found (operation returns false) — returns { deleted: false, artifact_id }
    it('should return deleted: false when artifact not found (EC-8)', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockResolvedValue(false)

      const result = await handleKbDeleteArtifact({ artifact_id: artifactId }, mockDeps, pmContext)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.deleted).toBe(false)
      expect(parsed.artifact_id).toBe(artifactId)
    })

    // EC-9: invalid UUID — returns MCP error result (Zod validation catches before auth check)
    it('should return MCP error result for invalid UUID (EC-9)', async () => {
      const result = await handleKbDeleteArtifact(
        { artifact_id: 'not-a-valid-uuid' },
        mockDeps,
        pmContext,
      )

      expect(result.isError).toBe(true)
    })

    // EC-10: DB rejection — returns MCP error result
    it('should return MCP error result on DB rejection (EC-10)', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockRejectedValue(new Error('DB connection failed'))

      const result = await handleKbDeleteArtifact({ artifact_id: artifactId }, mockDeps, pmContext)

      expect(result.isError).toBe(true)
    })

    // Verify handler calls kb_delete_artifact with bare artifact_id string (not the full object)
    it('should call kb_delete_artifact with bare artifact_id string (not full input object)', async () => {
      const artifactId = generateTestUuid()
      mockKbDeleteArtifact.mockResolvedValue(true)

      await handleKbDeleteArtifact({ artifact_id: artifactId }, mockDeps, pmContext)

      // Handler must call: kb_delete_artifact(validated.artifact_id, { db })
      // NOT: kb_delete_artifact(validated, { db })
      expect(mockKbDeleteArtifact).toHaveBeenCalledWith(artifactId, expect.anything())
      expect(mockKbDeleteArtifact.mock.calls[0][0]).toBe(artifactId)
      expect(typeof mockKbDeleteArtifact.mock.calls[0][0]).toBe('string')
    })
  })
})
