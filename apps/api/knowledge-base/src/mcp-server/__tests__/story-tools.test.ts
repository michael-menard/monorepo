/**
 * Story Tools Tests for MCP Server
 *
 * Unit tests for handleKbGetNextStory covering:
 * - AC-1: No candidates found
 * - AC-2: All candidates blocked by dependencies
 * - AC-3: First unblocked story returned
 * - AC-4: include_backlog parameter forwarded
 * - AC-5: exclude_story_ids parameter forwarded
 * - AC-6: feature filter forwarded
 * - AC-7: Authorization enforcement (invalid role rejected)
 * - AC-8: Zod validation error for missing required epic field
 *
 * @see KBAR-0090 AC-1 through AC-8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type AgentRole } from '../access-control.js'

// Create hoisted mock function (needed for vi.mock)
const { mockKbGetNextStory } = vi.hoisted(() => ({
  mockKbGetNextStory: vi.fn(),
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

// Mock story-crud-operations (ESM .js extension required)
vi.mock('../../crud-operations/story-crud-operations.js', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../crud-operations/story-crud-operations.js')>()
  return {
    ...actual,
    kb_get_next_story: mockKbGetNextStory,
  }
})

import { handleKbGetNextStory, type ToolHandlerDeps } from '../tool-handlers.js'

// Minimal story fixture matching stories.$inferSelect shape
const makeStoryFixture = (overrides: Record<string, unknown> = {}) => ({
  id: '00000000-0000-0000-0000-000000000001',
  storyId: 'KBAR-0090',
  feature: 'kb-artifact-migration',
  epic: 'kb-artifact-migration',
  title: 'Test story',
  storyDir: 'plans/future/platform/kb-artifact-migration/in-progress/KBAR-0090',
  storyFile: 'story.yaml',
  storyType: 'feature',
  points: 3,
  priority: 'medium',
  state: 'ready',
  phase: 'setup',
  iteration: 0,
  blocked: false,
  blockedReason: null,
  blockedByStory: null,
  touchesBackend: true,
  touchesFrontend: false,
  touchesDatabase: false,
  touchesInfra: false,
  createdAt: new Date('2026-02-01T00:00:00Z'),
  updatedAt: new Date('2026-02-01T00:00:00Z'),
  startedAt: null,
  completedAt: null,
  ...overrides,
})

describe('handleKbGetNextStory', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: {
        generateEmbedding: vi.fn(),
        generateEmbeddings: vi.fn(),
      } as unknown as ToolHandlerDeps['embeddingClient'],
    }
  })

  describe('AC-1: No candidates found', () => {
    it('should return null story with zero candidates when queue is empty', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 0,
        blocked_by_dependencies: [],
        message: 'No stories available in ready state for epic kb-artifact-migration',
      })

      const result = await handleKbGetNextStory(
        { epic: 'kb-artifact-migration' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.candidates_count).toBe(0)
      expect(parsed.blocked_by_dependencies).toHaveLength(0)
    })
  })

  describe('AC-2: All candidates blocked by dependencies', () => {
    it('should return null story with blocked_by_dependencies list when all are blocked', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 3,
        blocked_by_dependencies: [
          'KBAR-0080 (blocked by: KBAR-0070)',
          'KBAR-0070 (blocked by: KBAR-0060)',
          'KBAR-0060 (blocked by: KBAR-0050)',
        ],
        message: '3 candidates found but all are blocked by dependencies',
      })

      const result = await handleKbGetNextStory(
        { epic: 'kb-artifact-migration' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.candidates_count).toBe(3)
      expect(parsed.blocked_by_dependencies).toHaveLength(3)
      expect(parsed.blocked_by_dependencies[0]).toContain('KBAR-0080')
    })
  })

  describe('AC-3: First unblocked story returned', () => {
    it('should return the first unblocked story when one is available', async () => {
      const storyFixture = makeStoryFixture({ storyId: 'KBAR-0090', state: 'ready' })

      mockKbGetNextStory.mockResolvedValue({
        story: storyFixture,
        candidates_count: 1,
        blocked_by_dependencies: [],
        message: 'Next story found: KBAR-0090',
      })

      const result = await handleKbGetNextStory(
        { epic: 'kb-artifact-migration' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).not.toBeNull()
      expect(parsed.story.storyId).toBe('KBAR-0090')
      expect(parsed.candidates_count).toBe(1)
      expect(parsed.blocked_by_dependencies).toHaveLength(0)
    })
  })

  describe('AC-4: include_backlog forwarding', () => {
    it('should forward include_backlog: true to crud operation and return result', async () => {
      const storyFixture = makeStoryFixture({ storyId: 'KBAR-0085', state: 'backlog' })

      mockKbGetNextStory.mockResolvedValue({
        story: storyFixture,
        candidates_count: 2,
        blocked_by_dependencies: [],
        message: 'Next story found (including backlog): KBAR-0085',
      })

      const result = await handleKbGetNextStory(
        { epic: 'kb-artifact-migration', include_backlog: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(mockKbGetNextStory).toHaveBeenCalledOnce()
      const callArgs = mockKbGetNextStory.mock.calls[0]
      expect(callArgs[1]).toMatchObject({ include_backlog: true })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('KBAR-0085')
    })

    it('should work without include_backlog (defaults to false)', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 0,
        blocked_by_dependencies: [],
        message: 'No stories in ready state',
      })

      const result = await handleKbGetNextStory(
        { epic: 'kb-artifact-migration' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(mockKbGetNextStory).toHaveBeenCalledOnce()
      const callArgs = mockKbGetNextStory.mock.calls[0]
      // Default value: include_backlog should be false
      expect(callArgs[1]).toMatchObject({ include_backlog: false })
    })
  })

  describe('AC-5: exclude_story_ids forwarding', () => {
    it('should forward exclude_story_ids array to crud operation', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 0,
        blocked_by_dependencies: [],
        message: 'No stories available after exclusion',
      })

      const result = await handleKbGetNextStory(
        {
          epic: 'kb-artifact-migration',
          exclude_story_ids: ['KBAR-0080', 'KBAR-0070'],
        },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(mockKbGetNextStory).toHaveBeenCalledOnce()
      const callArgs = mockKbGetNextStory.mock.calls[0]
      expect(callArgs[1]).toMatchObject({ exclude_story_ids: ['KBAR-0080', 'KBAR-0070'] })
    })
  })

  describe('AC-6: feature filter forwarding', () => {
    it('should forward feature filter to crud operation and return correct result', async () => {
      const storyFixture = makeStoryFixture({
        storyId: 'KBAR-0090',
        feature: 'kb-artifact-migration',
      })

      mockKbGetNextStory.mockResolvedValue({
        story: storyFixture,
        candidates_count: 1,
        blocked_by_dependencies: [],
        message: 'Next story found for feature kb-artifact-migration: KBAR-0090',
      })

      const result = await handleKbGetNextStory(
        { epic: 'kb-artifact-migration', feature: 'kb-artifact-migration' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(mockKbGetNextStory).toHaveBeenCalledOnce()
      const callArgs = mockKbGetNextStory.mock.calls[0]
      expect(callArgs[1]).toMatchObject({ feature: 'kb-artifact-migration' })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('KBAR-0090')
    })
  })

  describe('AC-7: Authorization enforcement', () => {
    it('should reject invalid role and not call crud operation', async () => {
      const context = {
        correlation_id: 'test-correlation-id',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'unknown' as AgentRole,
      }

      const result = await handleKbGetNextStory(
        { epic: 'kb-artifact-migration' },
        mockDeps,
        context,
      )

      expect(result.isError).toBe(true)
      expect(mockKbGetNextStory).not.toHaveBeenCalled()
    })
  })

  describe('AC-8: Zod validation error for missing epic', () => {
    it('should return isError true with Zod error message when epic is missing', async () => {
      const result = await handleKbGetNextStory(
        {},
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const errorText = result.content[0].text
      // Should contain Zod validation error info
      expect(errorText).toBeTruthy()
    })
  })
})
