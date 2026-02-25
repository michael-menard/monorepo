/**
 * Story Tools Integration Tests
 *
 * Tests the story tools at the MCP dispatch layer (handleToolCall), verifying:
 * - Happy-path flows for all 5 story tools
 * - Validation error propagation
 * - Database error sanitization (no credentials in error messages)
 * - Authorization: all story tools allow pm, dev, qa, all roles
 *
 * Uses handleToolCall (same dispatch layer as mcp-integration.test.ts) rather
 * than calling individual handlers directly.
 *
 * @see KBAR-0100 ACs for story tool integration requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEmbeddingClient } from './test-helpers.js'
import type { ToolHandlerDeps } from '../tool-handlers.js'

// ============================================================================
// Hoisted mock functions (must be hoisted for vi.mock to work with ESM)
// ============================================================================

const {
  mockKbGetStory,
  mockKbListStories,
  mockKbUpdateStoryStatus,
  mockKbUpdateStory,
  mockKbGetNextStory,
} = vi.hoisted(() => ({
  mockKbGetStory: vi.fn(),
  mockKbListStories: vi.fn(),
  mockKbUpdateStoryStatus: vi.fn(),
  mockKbUpdateStory: vi.fn(),
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

// Mock the story CRUD operations
vi.mock('../../crud-operations/story-crud-operations.js', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../crud-operations/story-crud-operations.js')>()
  return {
    ...actual,
    kb_get_story: mockKbGetStory,
    kb_list_stories: mockKbListStories,
    kb_update_story_status: mockKbUpdateStoryStatus,
    kb_update_story: mockKbUpdateStory,
    kb_get_next_story: mockKbGetNextStory,
  }
})

// handleToolCall import comes AFTER vi.mock declarations (ESM hoisting requirement)
import { handleToolCall } from '../tool-handlers.js'

// ============================================================================
// Story fixture factory (inlined — not imported from story-tools.test.ts)
// ============================================================================

function createMockStory(overrides?: Record<string, unknown>) {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    storyId: overrides?.storyId ?? 'KBAR-0100',
    feature: overrides?.feature ?? 'kbar',
    epic: overrides?.epic ?? 'platform',
    title: overrides?.title ?? 'Integration Test Story',
    storyDir: overrides?.storyDir ?? 'plans/future/platform/KBAR-0100',
    storyFile: overrides?.storyFile ?? 'story.yaml',
    storyType: overrides?.storyType ?? 'feature',
    points: overrides?.points ?? 3,
    priority: overrides?.priority ?? 'medium',
    state: overrides?.state ?? 'ready',
    phase: overrides?.phase ?? 'planning',
    iteration: overrides?.iteration ?? 0,
    blocked: overrides?.blocked ?? false,
    blockedReason: overrides?.blockedReason ?? null,
    blockedByStory: overrides?.blockedByStory ?? null,
    touchesBackend: overrides?.touchesBackend ?? true,
    touchesFrontend: overrides?.touchesFrontend ?? false,
    touchesInfra: overrides?.touchesInfra ?? false,
    startedAt: overrides?.startedAt ?? null,
    completedAt: overrides?.completedAt ?? null,
    fileSyncedAt: overrides?.fileSyncedAt ?? null,
    fileHash: overrides?.fileHash ?? null,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('Story Tools Integration (via handleToolCall dispatch)', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  // ==========================================================================
  // AC-1: kb_get_story — happy path: returns story when found
  // ==========================================================================
  describe('kb_get_story', () => {
    it('AC-1: returns story when found', async () => {
      const mockStory = createMockStory({ storyId: 'KBAR-0100' })
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        message: 'Found story KBAR-0100',
      })

      const result = await handleToolCall('kb_get_story', { story_id: 'KBAR-0100' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('KBAR-0100')
      expect(parsed.message).toBe('Found story KBAR-0100')
    })

    it('AC-1: returns null story when not found', async () => {
      mockKbGetStory.mockResolvedValue({
        story: null,
        message: 'Story MISSING-0001 not found',
      })

      const result = await handleToolCall(
        'kb_get_story',
        { story_id: 'MISSING-0001' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('not found')
    })

    // AC-2: validation errors
    it('AC-2: returns VALIDATION_ERROR for empty story_id', async () => {
      const result = await handleToolCall('kb_get_story', { story_id: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('AC-2: returns VALIDATION_ERROR when story_id is missing', async () => {
      const result = await handleToolCall('kb_get_story', {}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    // AC-7: DB error sanitization
    it('AC-7: sanitizes DB connection errors (no credentials in message)', async () => {
      mockKbGetStory.mockRejectedValue(
        new Error('Connection to postgresql://admin:secret123@db.prod.example.com:5432/kb failed'),
      )

      const result = await handleToolCall('kb_get_story', { story_id: 'KBAR-0100' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.message).not.toContain('secret123')
      expect(error.message).not.toContain('admin')
    })
  })

  // ==========================================================================
  // AC-3: kb_list_stories — happy path: returns filtered stories
  // ==========================================================================
  describe('kb_list_stories', () => {
    it('AC-3: returns filtered stories list', async () => {
      const mockStories = [
        createMockStory({ storyId: 'KBAR-0100', feature: 'kbar' }),
        createMockStory({ storyId: 'KBAR-0101', feature: 'kbar' }),
      ]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 2,
        message: 'Found 2 stories (2 total)',
      })

      const result = await handleToolCall(
        'kb_list_stories',
        { feature: 'kbar', limit: 20 },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(2)
      expect(parsed.total).toBe(2)
      expect(parsed.stories[0].storyId).toBe('KBAR-0100')
    })

    it('AC-3: returns empty list when no stories match', async () => {
      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      const result = await handleToolCall(
        'kb_list_stories',
        { state: 'backlog', limit: 20 },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(0)
      expect(parsed.total).toBe(0)
    })

    it('AC-2: returns VALIDATION_ERROR for invalid state filter', async () => {
      const result = await handleToolCall(
        'kb_list_stories',
        { state: 'not_a_valid_state', limit: 20 },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ==========================================================================
  // AC-4: kb_update_story_status — happy path: transitions state
  // AC-5: terminal-state guard blocks invalid transitions
  // AC-6: same-state transitions are idempotent
  // ==========================================================================
  describe('kb_update_story_status', () => {
    it('AC-4: updates state when valid transition', async () => {
      const updatedStory = createMockStory({ storyId: 'KBAR-0100', state: 'in_progress' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0100',
      })

      const result = await handleToolCall(
        'kb_update_story_status',
        { story_id: 'KBAR-0100', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(true)
      expect(parsed.story.state).toBe('in_progress')
    })

    it('AC-5: blocks transition from terminal state (completed -> in_progress)', async () => {
      const completedStory = createMockStory({ storyId: 'KBAR-0100', state: 'completed' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: completedStory,
        updated: false,
        message:
          "Cannot transition story KBAR-0100 from terminal state 'completed' to 'in_progress'",
      })

      const result = await handleToolCall(
        'kb_update_story_status',
        { story_id: 'KBAR-0100', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.message).toContain('terminal state')
      expect(parsed.message).toContain('completed')
    })

    it('AC-5: blocks transition from terminal state (cancelled -> ready)', async () => {
      const cancelledStory = createMockStory({ storyId: 'KBAR-0100', state: 'cancelled' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: cancelledStory,
        updated: false,
        message: "Cannot transition story KBAR-0100 from terminal state 'cancelled' to 'ready'",
      })

      const result = await handleToolCall(
        'kb_update_story_status',
        { story_id: 'KBAR-0100', state: 'ready' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.message).toContain('terminal state')
    })

    it('AC-6: allows same-state transition (idempotent)', async () => {
      const completedStory = createMockStory({ storyId: 'KBAR-0100', state: 'completed' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: completedStory,
        updated: true,
        message: 'Updated story KBAR-0100',
      })

      const result = await handleToolCall(
        'kb_update_story_status',
        { story_id: 'KBAR-0100', state: 'completed' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(true)
    })

    it('AC-2: returns VALIDATION_ERROR for empty story_id', async () => {
      const result = await handleToolCall(
        'kb_update_story_status',
        { story_id: '' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('AC-2: returns VALIDATION_ERROR for invalid state value', async () => {
      const result = await handleToolCall(
        'kb_update_story_status',
        { story_id: 'KBAR-0100', state: 'invalid_state' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    // AC-7: DB sanitization
    it('AC-7: sanitizes DB errors for story status update', async () => {
      mockKbUpdateStoryStatus.mockRejectedValue(
        new Error('Connection to postgresql://admin:dbpass@prod-db:5432/kb failed'),
      )

      const result = await handleToolCall(
        'kb_update_story_status',
        { story_id: 'KBAR-0100', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.message).not.toContain('dbpass')
    })
  })

  // ==========================================================================
  // AC-4: kb_update_story — happy path: updates metadata fields
  // ==========================================================================
  describe('kb_update_story', () => {
    it('AC-4: updates story metadata fields', async () => {
      const updatedStory = createMockStory({
        storyId: 'KBAR-0100',
        epic: 'new-epic',
        title: 'Updated Title',
        points: 5,
      })
      mockKbUpdateStory.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0100',
      })

      const result = await handleToolCall(
        'kb_update_story',
        { story_id: 'KBAR-0100', epic: 'new-epic', title: 'Updated Title', points: 5 },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(true)
      expect(parsed.story.epic).toBe('new-epic')
      expect(parsed.story.title).toBe('Updated Title')
      expect(parsed.story.points).toBe(5)
    })

    it('AC-4: returns not-found when story does not exist', async () => {
      mockKbUpdateStory.mockResolvedValue({
        story: null,
        updated: false,
        message: 'Story MISSING-0099 not found',
      })

      const result = await handleToolCall(
        'kb_update_story',
        { story_id: 'MISSING-0099', epic: 'platform' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('not found')
    })

    it('AC-2: returns VALIDATION_ERROR for empty story_id', async () => {
      const result = await handleToolCall('kb_update_story', { story_id: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    // AC-7: DB sanitization
    it('AC-7: sanitizes DB errors for story update', async () => {
      mockKbUpdateStory.mockRejectedValue(
        new Error('Connection to postgresql://svc:s3cr3t@db.internal:5432/kb timed out'),
      )

      const result = await handleToolCall(
        'kb_update_story',
        { story_id: 'KBAR-0100', title: 'New Title' },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.message).not.toContain('s3cr3t')
    })
  })

  // ==========================================================================
  // AC-5: kb_get_next_story — happy path: returns next available story
  // ==========================================================================
  describe('kb_get_next_story', () => {
    it('AC-5: returns next available story in epic', async () => {
      const nextStory = createMockStory({
        storyId: 'KBAR-0101',
        epic: 'platform',
        state: 'ready',
        priority: 'high',
      })
      mockKbGetNextStory.mockResolvedValue({
        story: nextStory,
        candidates_count: 3,
        blocked_by_dependencies: [],
        message: 'Next story: KBAR-0101 - Integration Test Story',
      })

      const result = await handleToolCall('kb_get_next_story', { epic: 'platform' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('KBAR-0101')
      expect(parsed.story.state).toBe('ready')
      expect(parsed.candidates_count).toBe(3)
    })

    it('AC-5: returns null when no stories available in epic', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 0,
        blocked_by_dependencies: [],
        message: "No available stories found in epic 'platform'",
      })

      const result = await handleToolCall('kb_get_next_story', { epic: 'platform' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.candidates_count).toBe(0)
    })

    it('AC-5: returns blocked dependency info when all candidates are dependency-blocked', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 2,
        blocked_by_dependencies: [
          'KBAR-0102 (blocked by: KBAR-0099)',
          'KBAR-0103 (blocked by: KBAR-0100)',
        ],
        message: 'All 2 candidate stories are blocked by unresolved dependencies',
      })

      const result = await handleToolCall('kb_get_next_story', { epic: 'platform' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.candidates_count).toBe(2)
      expect(parsed.blocked_by_dependencies).toHaveLength(2)
    })

    it('AC-2: returns VALIDATION_ERROR for empty epic', async () => {
      const result = await handleToolCall('kb_get_next_story', { epic: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('AC-2: returns VALIDATION_ERROR when epic is missing', async () => {
      const result = await handleToolCall('kb_get_next_story', {}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ==========================================================================
  // AC-8: Authorization — dev role can access all story tools
  // AC-9: Authorization — all roles (pm, dev, qa, all) are allowed
  // AC-10: Authorization — no FORBIDDEN for any standard role on story tools
  // ==========================================================================
  describe('Authorization (AC-8, AC-9, AC-10)', () => {
    // Story tools allow pm, dev, qa, all — no role should be forbidden

    it('AC-8: dev role can call kb_get_story', async () => {
      const mockStory = createMockStory({ storyId: 'KBAR-0100' })
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        message: 'Found story KBAR-0100',
      })

      const context = {
        correlation_id: 'test-correlation',
        tool_call_chain: [] as string[],
        start_time: Date.now(),
        agent_role: 'dev' as const,
      }

      const result = await handleToolCall(
        'kb_get_story',
        { story_id: 'KBAR-0100' },
        mockDeps,
        context,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('KBAR-0100')
    })

    it('AC-9: all 4 roles (pm, dev, qa, all) can call kb_list_stories', async () => {
      const roles = ['pm', 'dev', 'qa', 'all'] as const

      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      for (const role of roles) {
        const context = {
          correlation_id: `test-${role}`,
          tool_call_chain: [] as string[],
          start_time: Date.now(),
          agent_role: role,
        }

        const result = await handleToolCall(
          'kb_list_stories',
          { limit: 10 },
          mockDeps,
          context,
        )

        // No FORBIDDEN for any of these roles
        expect(result.isError).toBeUndefined()
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.stories).toBeDefined()
      }
    })

    it('AC-9: all 4 roles can call kb_update_story_status', async () => {
      const roles = ['pm', 'dev', 'qa', 'all'] as const

      const updatedStory = createMockStory({ storyId: 'KBAR-0100', state: 'in_progress' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0100',
      })

      for (const role of roles) {
        const context = {
          correlation_id: `test-${role}`,
          tool_call_chain: [] as string[],
          start_time: Date.now(),
          agent_role: role,
        }

        const result = await handleToolCall(
          'kb_update_story_status',
          { story_id: 'KBAR-0100', state: 'in_progress' },
          mockDeps,
          context,
        )

        expect(result.isError).toBeUndefined()
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.updated).toBe(true)
      }
    })

    it('AC-9: all 4 roles can call kb_update_story', async () => {
      const roles = ['pm', 'dev', 'qa', 'all'] as const

      const updatedStory = createMockStory({ storyId: 'KBAR-0100', title: 'Updated' })
      mockKbUpdateStory.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0100',
      })

      for (const role of roles) {
        const context = {
          correlation_id: `test-${role}`,
          tool_call_chain: [] as string[],
          start_time: Date.now(),
          agent_role: role,
        }

        const result = await handleToolCall(
          'kb_update_story',
          { story_id: 'KBAR-0100', title: 'Updated' },
          mockDeps,
          context,
        )

        expect(result.isError).toBeUndefined()
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.updated).toBe(true)
      }
    })

    it('AC-9: all 4 roles can call kb_get_next_story', async () => {
      const roles = ['pm', 'dev', 'qa', 'all'] as const

      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 0,
        blocked_by_dependencies: [],
        message: "No available stories found in epic 'platform'",
      })

      for (const role of roles) {
        const context = {
          correlation_id: `test-${role}`,
          tool_call_chain: [] as string[],
          start_time: Date.now(),
          agent_role: role,
        }

        const result = await handleToolCall(
          'kb_get_next_story',
          { epic: 'platform' },
          mockDeps,
          context,
        )

        expect(result.isError).toBeUndefined()
      }
    })

    it('AC-10: story tools do NOT return FORBIDDEN for dev role (unlike admin tools)', async () => {
      const mockStory = createMockStory({ storyId: 'KBAR-0100' })
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        message: 'Found story KBAR-0100',
      })

      const devContext = {
        correlation_id: 'test-dev',
        tool_call_chain: [] as string[],
        start_time: Date.now(),
        agent_role: 'dev' as const,
      }

      const result = await handleToolCall(
        'kb_get_story',
        { story_id: 'KBAR-0100' },
        mockDeps,
        devContext,
      )

      // Ensure no FORBIDDEN was returned
      if (result.isError) {
        const error = JSON.parse(result.content[0].text)
        expect(error.code).not.toBe('FORBIDDEN')
      } else {
        expect(result.isError).toBeUndefined()
      }
    })
  })
})
