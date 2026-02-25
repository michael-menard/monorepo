/**
 * Story Tool Handler Tests
 *
 * Tests for the 5 story tool handlers:
 * - kb_get_story: Retrieve story by ID
 * - kb_list_stories: List stories with filters
 * - kb_update_story_status: Update workflow state (with terminal-state guard)
 * - kb_update_story: Update story metadata fields
 * - kb_get_next_story: Get next available story in epic
 *
 * @see KBAR-0080 ACs for story tool requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEmbeddingClient } from './test-helpers.js'
import type { ToolHandlerDeps } from '../tool-handlers.js'

// ============================================================================
// Hoisted mock functions (must be hoisted for vi.mock to work)
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

// Mock the story-crud-operations module
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

import {
  handleKbGetStory,
  handleKbListStories,
  handleKbUpdateStoryStatus,
  handleKbUpdateStory,
  handleKbGetNextStory,
} from '../tool-handlers.js'

// ============================================================================
// Story fixture factory
// ============================================================================

function createMockStory(overrides?: Record<string, unknown>) {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    storyId: overrides?.storyId ?? 'KBAR-0080',
    feature: overrides?.feature ?? 'kbar',
    epic: overrides?.epic ?? 'platform',
    title: overrides?.title ?? 'Test Story Title',
    storyDir: overrides?.storyDir ?? 'plans/future/platform/KBAR-0080',
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

describe('Story Tool Handlers', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  // ==========================================================================
  // AC1: kb_get_story — returns story when found
  // ==========================================================================
  describe('handleKbGetStory', () => {
    it('should return story when found (AC1)', async () => {
      const mockStory = createMockStory({ storyId: 'KBAR-0080' })
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        message: 'Found story KBAR-0080',
      })

      const result = await handleKbGetStory({ story_id: 'KBAR-0080' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('KBAR-0080')
      expect(parsed.message).toBe('Found story KBAR-0080')
    })

    // ==========================================================================
    // AC2: kb_get_story — returns null when not found
    // ==========================================================================
    it('should return null story when not found (AC2)', async () => {
      mockKbGetStory.mockResolvedValue({
        story: null,
        message: 'Story NONEXISTENT-0001 not found',
      })

      const result = await handleKbGetStory({ story_id: 'NONEXISTENT-0001' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('not found')
    })

    it('should return validation error for empty story_id', async () => {
      const result = await handleKbGetStory({ story_id: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ==========================================================================
  // AC3: kb_list_stories — returns matching stories
  // ==========================================================================
  describe('handleKbListStories', () => {
    it('should return filtered stories (AC3)', async () => {
      const mockStories = [
        createMockStory({ storyId: 'KBAR-0080', feature: 'kbar' }),
        createMockStory({ storyId: 'KBAR-0081', feature: 'kbar' }),
      ]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 2,
        message: 'Found 2 stories (2 total)',
      })

      const result = await handleKbListStories({ feature: 'kbar', limit: 20 }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(2)
      expect(parsed.total).toBe(2)
    })

    it('should return empty list when no matches', async () => {
      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      const result = await handleKbListStories({ state: 'backlog', limit: 20 }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(0)
      expect(parsed.total).toBe(0)
    })

    it('should filter by epic (AC2)', async () => {
      const mockStories = [createMockStory({ storyId: 'KBAR-0080', epic: 'platform' })]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 1,
        message: 'Found 1 stories (1 total)',
      })

      const result = await handleKbListStories({ epic: 'platform' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(1)
      expect(mockKbListStories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ epic: 'platform' }),
      )
    })

    it('should filter by states[] array (AC2)', async () => {
      const mockStories = [
        createMockStory({ storyId: 'KBAR-0080', state: 'ready' }),
        createMockStory({ storyId: 'KBAR-0081', state: 'in_progress' }),
      ]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 2,
        message: 'Found 2 stories (2 total)',
      })

      const result = await handleKbListStories({ states: ['ready', 'in_progress'] }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(2)
      expect(mockKbListStories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ states: ['ready', 'in_progress'] }),
      )
    })

    it('should pass states[] to handler even when singular state is also provided (AC2)', async () => {
      const mockStories = [createMockStory({ storyId: 'KBAR-0080', state: 'ready' })]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 1,
        message: 'Found 1 stories (1 total)',
      })

      // Both state and states[] provided — handler receives both; DB layer resolves precedence
      const result = await handleKbListStories(
        { state: 'backlog', states: ['ready'] },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      expect(mockKbListStories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ state: 'backlog', states: ['ready'] }),
      )
    })

    it('should filter by phase (AC2)', async () => {
      const mockStories = [createMockStory({ storyId: 'KBAR-0080', phase: 'implementation' })]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 1,
        message: 'Found 1 stories (1 total)',
      })

      const result = await handleKbListStories({ phase: 'implementation' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(1)
      expect(mockKbListStories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ phase: 'implementation' }),
      )
    })

    it('should filter by blocked status (AC2)', async () => {
      const mockStories = [createMockStory({ storyId: 'KBAR-0080', blocked: true })]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 1,
        message: 'Found 1 stories (1 total)',
      })

      const result = await handleKbListStories({ blocked: true }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(1)
      expect(mockKbListStories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ blocked: true }),
      )
    })

    it('should filter by priority (AC2)', async () => {
      const mockStories = [createMockStory({ storyId: 'KBAR-0080', priority: 'high' })]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 1,
        message: 'Found 1 stories (1 total)',
      })

      const result = await handleKbListStories({ priority: 'high' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(1)
      expect(mockKbListStories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ priority: 'high' }),
      )
    })

    it('should paginate results with offset (AC2)', async () => {
      const mockStories = [createMockStory({ storyId: 'KBAR-0085' })]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 10,
        message: 'Found 1 stories (10 total)',
      })

      const result = await handleKbListStories({ limit: 1, offset: 4 }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(1)
      expect(parsed.total).toBe(10)
      expect(mockKbListStories).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 1, offset: 4 }),
      )
    })
  })

  // ==========================================================================
  // AC4: kb_update_story_status — updates state when valid
  // ==========================================================================
  describe('handleKbUpdateStoryStatus', () => {
    it('should update story state when valid transition (AC4)', async () => {
      const updatedStory = createMockStory({ storyId: 'KBAR-0080', state: 'in_progress' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(true)
      expect(parsed.story.state).toBe('in_progress')
    })

    // ==========================================================================
    // AC5: kb_update_story_status — terminal-state guard blocks invalid transitions
    // ==========================================================================
    it('should block transition from terminal state to different state (AC5)', async () => {
      const completedStory = createMockStory({ storyId: 'KBAR-0080', state: 'completed' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: completedStory,
        updated: false,
        message:
          "Cannot transition story KBAR-0080 from terminal state 'completed' to 'in_progress'",
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.message).toContain('terminal state')
      expect(parsed.message).toContain('completed')
    })

    it('should block transition from cancelled state to different state (AC5)', async () => {
      const cancelledStory = createMockStory({ storyId: 'KBAR-0080', state: 'cancelled' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: cancelledStory,
        updated: false,
        message: "Cannot transition story KBAR-0080 from terminal state 'cancelled' to 'ready'",
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'ready' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.message).toContain('terminal state')
    })

    // ==========================================================================
    // AC6: kb_update_story_status — same-state transitions allowed (idempotent)
    // ==========================================================================
    it('should allow same-state transition (idempotent) (AC6)', async () => {
      const completedStory = createMockStory({ storyId: 'KBAR-0080', state: 'completed' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: completedStory,
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'completed' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(true)
    })

    // ==========================================================================
    // AC7: kb_update_story_status — returns not-found when story missing
    // ==========================================================================
    it('should return not-found when story does not exist (AC7)', async () => {
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: null,
        updated: false,
        message: 'Story MISSING-0001 not found',
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'MISSING-0001', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('not found')
    })

    it('should return validation error for empty story_id', async () => {
      const result = await handleKbUpdateStoryStatus({ story_id: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should return validation error for invalid state value', async () => {
      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'invalid_state' as any },
        mockDeps,
      )

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ==========================================================================
  // AC8: kb_update_story — updates metadata fields
  // ==========================================================================
  describe('handleKbUpdateStory', () => {
    it('should update story metadata fields (AC8)', async () => {
      const updatedStory = createMockStory({
        storyId: 'KBAR-0080',
        epic: 'new-epic',
        title: 'Updated Title',
        points: 5,
      })
      mockKbUpdateStory.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      const result = await handleKbUpdateStory(
        { story_id: 'KBAR-0080', epic: 'new-epic', title: 'Updated Title', points: 5 },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(true)
      expect(parsed.story.epic).toBe('new-epic')
      expect(parsed.story.title).toBe('Updated Title')
      expect(parsed.story.points).toBe(5)
    })

    // ==========================================================================
    // AC10: kb_update_story — returns not-found when story missing
    // ==========================================================================
    it('should return not-found when story does not exist (AC10)', async () => {
      mockKbUpdateStory.mockResolvedValue({
        story: null,
        updated: false,
        message: 'Story MISSING-0001 not found',
      })

      const result = await handleKbUpdateStory(
        { story_id: 'MISSING-0001', epic: 'new-epic' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('not found')
    })

    it('should return validation error for empty story_id', async () => {
      const result = await handleKbUpdateStory({ story_id: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ==========================================================================
  // AC9: kb_get_next_story — returns next available story in epic
  // ==========================================================================
  describe('handleKbGetNextStory', () => {
    it('should return next available story in epic (AC9)', async () => {
      const nextStory = createMockStory({
        storyId: 'KBAR-0081',
        epic: 'platform',
        state: 'ready',
        priority: 'high',
      })
      mockKbGetNextStory.mockResolvedValue({
        story: nextStory,
        candidates_count: 3,
        blocked_by_dependencies: [],
        message: 'Next story: KBAR-0081 - Test Story Title',
      })

      const result = await handleKbGetNextStory({ epic: 'platform' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('KBAR-0081')
      expect(parsed.story.state).toBe('ready')
      expect(parsed.candidates_count).toBe(3)
    })

    it('should return null when no stories available', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 0,
        blocked_by_dependencies: [],
        message: "No available stories found in epic 'platform'",
      })

      const result = await handleKbGetNextStory({ epic: 'platform' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.candidates_count).toBe(0)
    })

    it('should return validation error for empty epic', async () => {
      const result = await handleKbGetNextStory({ epic: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should return blocked stories info when all candidates are dependency-blocked', async () => {
      mockKbGetNextStory.mockResolvedValue({
        story: null,
        candidates_count: 2,
        blocked_by_dependencies: [
          'KBAR-0082 (blocked by: KBAR-0079)',
          'KBAR-0083 (blocked by: KBAR-0080)',
        ],
        message: 'All 2 candidate stories are blocked by unresolved dependencies',
      })

      const result = await handleKbGetNextStory({ epic: 'platform' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(parsed.candidates_count).toBe(2)
      expect(parsed.blocked_by_dependencies).toHaveLength(2)
    })
  })
})
