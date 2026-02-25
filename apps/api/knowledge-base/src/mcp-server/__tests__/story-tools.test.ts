/**
 * Story Tool Handler Tests
 *
 * Tests the story tool handlers:
 * - handleKbListStories: filters, pagination, total count
 * - handleKbUpdateStoryStatus: startedAt/completedAt auto-set, blocked:false clearing,
 *   non-existent story, terminal-state guard
 * - handleKbUpdateStory: partial updates, non-existent story
 *
 * All handlers enforce authorization via enforceAuthorization().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockEmbeddingClient } from './test-helpers.js'

// Create hoisted mock functions (needed for vi.mock)
const {
  mockKbListStories,
  mockKbUpdateStoryStatus,
  mockKbUpdateStory,
} = vi.hoisted(() => ({
  mockKbListStories: vi.fn(),
  mockKbUpdateStoryStatus: vi.fn(),
  mockKbUpdateStory: vi.fn(),
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
    kb_list_stories: mockKbListStories,
    kb_update_story_status: mockKbUpdateStoryStatus,
    kb_update_story: mockKbUpdateStory,
  }
})

import {
  handleKbListStories,
  handleKbUpdateStoryStatus,
  handleKbUpdateStory,
  type ToolHandlerDeps,
} from '../tool-handlers.js'

// Helper to create a mock story row
function createMockStory(overrides?: Record<string, unknown>) {
  return {
    storyId: 'KBAR-0080',
    title: 'Test Story',
    epic: 'platform',
    feature: 'kb-artifact-migration',
    state: 'ready',
    phase: 'planning',
    priority: 'medium',
    points: 3,
    blocked: false,
    blockedReason: null,
    blockedByStory: null,
    iteration: 0,
    startedAt: null,
    completedAt: null,
    storyDir: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('Story Tool Handlers', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  // ============================================================================
  // handleKbListStories
  // ============================================================================

  describe('handleKbListStories', () => {
    it('should return stories with total count', async () => {
      const mockStories = [createMockStory({ storyId: 'KBAR-0010' }), createMockStory()]
      mockKbListStories.mockResolvedValue({
        stories: mockStories,
        total: 10,
        message: 'Found 2 stories (10 total)',
      })

      const result = await handleKbListStories({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toHaveLength(2)
      expect(parsed.total).toBe(10)
    })

    it('should pass feature filter to CRUD layer', async () => {
      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      await handleKbListStories({ feature: 'kb-artifact-migration' }, mockDeps)

      expect(mockKbListStories).toHaveBeenCalledWith(
        { db: mockDeps.db },
        expect.objectContaining({ feature: 'kb-artifact-migration' }),
      )
    })

    it('should pass state filter to CRUD layer', async () => {
      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      await handleKbListStories({ state: 'in_progress' }, mockDeps)

      expect(mockKbListStories).toHaveBeenCalledWith(
        { db: mockDeps.db },
        expect.objectContaining({ state: 'in_progress' }),
      )
    })

    it('should pass limit and offset for pagination', async () => {
      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      await handleKbListStories({ limit: 5, offset: 10 }, mockDeps)

      expect(mockKbListStories).toHaveBeenCalledWith(
        { db: mockDeps.db },
        expect.objectContaining({ limit: 5, offset: 10 }),
      )
    })

    it('should return empty stories array when no matches', async () => {
      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      const result = await handleKbListStories({ state: 'completed' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stories).toEqual([])
      expect(parsed.total).toBe(0)
    })

    it('should enforce authorization', async () => {
      mockKbListStories.mockResolvedValue({
        stories: [],
        total: 0,
        message: 'Found 0 stories (0 total)',
      })

      // No context means 'all' role — kb_list_stories is not admin-only, should succeed
      const result = await handleKbListStories({}, mockDeps)

      expect(result.isError).toBeUndefined()
    })
  })

  // ============================================================================
  // handleKbUpdateStoryStatus
  // ============================================================================

  describe('handleKbUpdateStoryStatus', () => {
    it('should auto-set startedAt when transitioning to in_progress', async () => {
      const now = new Date()
      const updatedStory = createMockStory({ state: 'in_progress', startedAt: now })
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
      expect(parsed.story.startedAt).toBeTruthy()
    })

    it('should auto-set completedAt when transitioning to completed', async () => {
      const now = new Date()
      const updatedStory = createMockStory({ state: 'completed', completedAt: now })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'completed' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.completedAt).toBeTruthy()
    })

    it('should clear blockedReason and blockedByStory when blocked:false', async () => {
      const updatedStory = createMockStory({
        blocked: false,
        blockedReason: null,
        blockedByStory: null,
      })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', blocked: false },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.blocked).toBe(false)
      expect(parsed.story.blockedReason).toBeNull()
      expect(parsed.story.blockedByStory).toBeNull()
    })

    it('should return updated:false and story:null for non-existent story', async () => {
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: null,
        updated: false,
        message: 'Story KBAR-9999 not found',
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-9999', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('not found')
    })

    it('should return updated:false for terminal-state guard rejection', async () => {
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: null,
        updated: false,
        message:
          "Story KBAR-0080 is in terminal state 'completed'" +
          " and cannot be transitioned to 'in_progress'",
      })

      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('terminal state')
    })

    it('should allow same-state transition (idempotent)', async () => {
      const story = createMockStory({ state: 'completed' })
      mockKbUpdateStoryStatus.mockResolvedValue({
        story,
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

    it('should return validation error for missing story_id', async () => {
      const result = await handleKbUpdateStoryStatus({}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should enforce authorization', async () => {
      mockKbUpdateStoryStatus.mockResolvedValue({
        story: createMockStory(),
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      // No context means 'all' role — kb_update_story_status is not admin-only, should succeed
      const result = await handleKbUpdateStoryStatus(
        { story_id: 'KBAR-0080', state: 'in_progress' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
    })
  })

  // ============================================================================
  // handleKbUpdateStory
  // ============================================================================

  describe('handleKbUpdateStory', () => {
    it('should update story metadata fields partially', async () => {
      const updatedStory = createMockStory({ epic: 'KBAR', feature: 'kb-artifact-migration' })
      mockKbUpdateStory.mockResolvedValue({
        story: updatedStory,
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      const result = await handleKbUpdateStory(
        { story_id: 'KBAR-0080', epic: 'KBAR', feature: 'kb-artifact-migration' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(true)
      expect(parsed.story.epic).toBe('KBAR')
    })

    it('should return updated:false and story:null for non-existent story', async () => {
      mockKbUpdateStory.mockResolvedValue({
        story: null,
        updated: false,
        message: 'Story KBAR-9999 not found',
      })

      const result = await handleKbUpdateStory(
        { story_id: 'KBAR-9999', epic: 'KBAR' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.updated).toBe(false)
      expect(parsed.story).toBeNull()
      expect(parsed.message).toContain('not found')
    })

    it('should return validation error for missing story_id', async () => {
      const result = await handleKbUpdateStory({}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should enforce authorization', async () => {
      mockKbUpdateStory.mockResolvedValue({
        story: createMockStory(),
        updated: true,
        message: 'Updated story KBAR-0080',
      })

      // No context means 'all' role — kb_update_story is not admin-only, should succeed
      const result = await handleKbUpdateStory(
        { story_id: 'KBAR-0080', title: 'New Title' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
    })
  })
})
