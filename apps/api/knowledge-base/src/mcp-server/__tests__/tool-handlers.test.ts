/**
 * Tool Handler Tests for MCP Server
 *
 * Tests the 5 CRUD tool handlers:
 * - kb_add: Add knowledge entry
 * - kb_get: Retrieve entry by ID
 * - kb_update: Update existing entry
 * - kb_delete: Delete entry (idempotent)
 * - kb_list: List entries with filters
 *
 * @see KNOW-0051 AC3 for tool handler requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockEmbeddingClient,
  createMockKnowledgeEntry,
  sampleEntries,
  generateTestUuid,
} from './test-helpers.js'
import { NotFoundError } from '../../crud-operations/errors.js'

// Create hoisted mock functions (needed for vi.mock)
const { mockKbAdd, mockKbGet, mockKbUpdate, mockKbDelete, mockKbList } = vi.hoisted(() => ({
  mockKbAdd: vi.fn(),
  mockKbGet: vi.fn(),
  mockKbUpdate: vi.fn(),
  mockKbDelete: vi.fn(),
  mockKbList: vi.fn(),
}))

// Hoisted mocks for story CRUD operations (KBAR-0070)
const { mockKbGetStory } = vi.hoisted(() => ({
  mockKbGetStory: vi.fn(),
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

// Mock the CRUD operations
vi.mock('../../crud-operations/index.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../crud-operations/index.js')>()
  return {
    ...actual,
    kb_add: mockKbAdd,
    kb_get: mockKbGet,
    kb_update: mockKbUpdate,
    kb_delete: mockKbDelete,
    kb_list: mockKbList,
  }
})

// Mock story CRUD operations (KBAR-0070)
vi.mock('../../crud-operations/story-crud-operations.js', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../crud-operations/story-crud-operations.js')>()
  return {
    ...actual,
    kb_get_story: mockKbGetStory,
  }
})

import {
  handleKbAdd,
  handleKbGet,
  handleKbUpdate,
  handleKbDelete,
  handleKbList,
  handleKbGetStory,
  handleToolCall,
  type ToolHandlerDeps,
} from '../tool-handlers.js'

describe('Tool Handlers', () => {
  let mockDeps: ToolHandlerDeps

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      db: {} as ToolHandlerDeps['db'],
      embeddingClient: createMockEmbeddingClient(),
    }
  })

  describe('handleKbAdd', () => {
    it('should add entry and return UUID', async () => {
      const expectedId = generateTestUuid()
      mockKbAdd.mockResolvedValue(expectedId)

      const result = await handleKbAdd(sampleEntries.dev1, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe(expectedId)
      expect(mockKbAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          content: sampleEntries.dev1.content,
          role: sampleEntries.dev1.role,
        }),
        mockDeps,
      )
    })

    it('should return error for empty content', async () => {
      const result = await handleKbAdd({ content: '', role: 'dev' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.field).toBe('content')
    })

    it('should return error for invalid role', async () => {
      const result = await handleKbAdd({ content: 'test', role: 'invalid' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.field).toBe('role')
    })

    it('should handle null tags', async () => {
      mockKbAdd.mockResolvedValue('test-uuid')

      const result = await handleKbAdd(sampleEntries.noTags, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(mockKbAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: null,
        }),
        mockDeps,
      )
    })

    it('should return error on CRUD operation failure', async () => {
      mockKbAdd.mockRejectedValue(new Error('Database error'))

      const result = await handleKbAdd(sampleEntries.dev1, mockDeps)

      expect(result.isError).toBe(true)
    })
  })

  describe('handleKbGet', () => {
    it('should return entry when found', async () => {
      const mockEntry = createMockKnowledgeEntry()
      mockKbGet.mockResolvedValue(mockEntry)

      const result = await handleKbGet({ id: mockEntry.id }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.id).toBe(mockEntry.id)
      expect(parsed.content).toBe(mockEntry.content)
      // Should not include embedding in response
      expect(parsed.embedding).toBeUndefined()
    })

    it('should return null when not found', async () => {
      mockKbGet.mockResolvedValue(null)

      const result = await handleKbGet({ id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe('null')
    })

    it('should return error for invalid UUID', async () => {
      const result = await handleKbGet({ id: 'not-a-uuid' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('handleKbUpdate', () => {
    it('should update entry and return updated data', async () => {
      const mockEntry = createMockKnowledgeEntry({ content: 'Updated content' })
      mockKbUpdate.mockResolvedValue(mockEntry)

      const result = await handleKbUpdate(
        { id: mockEntry.id, content: 'Updated content' },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.content).toBe('Updated content')
      // Should not include embedding
      expect(parsed.embedding).toBeUndefined()
    })

    it('should return error when entry not found', async () => {
      const id = generateTestUuid()
      mockKbUpdate.mockRejectedValue(new NotFoundError('KnowledgeEntry', id))

      const result = await handleKbUpdate({ id, content: 'Updated' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should return error when no update fields provided', async () => {
      const result = await handleKbUpdate({ id: generateTestUuid() }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('handleKbDelete', () => {
    // kb_delete is an admin-only tool (KNOW-009), requires PM context
    const pmContext = {
      correlation_id: 'test-correlation',
      tool_call_chain: [],
      start_time: Date.now(),
      agent_role: 'pm' as const,
    }

    it('should delete entry and return success', async () => {
      mockKbDelete.mockResolvedValue(undefined)

      const result = await handleKbDelete({ id: generateTestUuid() }, mockDeps, pmContext)

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe('Deleted successfully')
    })

    it('should succeed for non-existent entry (idempotent)', async () => {
      mockKbDelete.mockResolvedValue(undefined)

      const result = await handleKbDelete({ id: generateTestUuid() }, mockDeps, pmContext)

      expect(result.isError).toBeUndefined()
    })

    it('should return error for invalid UUID', async () => {
      const result = await handleKbDelete({ id: 'invalid' }, mockDeps, pmContext)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should deny access for dev role (KNOW-009)', async () => {
      const devContext = {
        correlation_id: 'test-correlation',
        tool_call_chain: [],
        start_time: Date.now(),
        agent_role: 'dev' as const,
      }

      const result = await handleKbDelete({ id: generateTestUuid() }, mockDeps, devContext)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('FORBIDDEN')
      expect(error.message).toBe('kb_delete requires pm role')
    })
  })

  describe('handleKbList', () => {
    it('should return array of entries', async () => {
      const mockEntries = [
        createMockKnowledgeEntry({ id: 'entry-1' }),
        createMockKnowledgeEntry({ id: 'entry-2' }),
      ]
      mockKbList.mockResolvedValue(mockEntries)

      const result = await handleKbList({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toHaveLength(2)
      // Should not include embeddings
      expect(parsed[0].embedding).toBeUndefined()
    })

    it('should return empty array when no entries', async () => {
      mockKbList.mockResolvedValue([])

      const result = await handleKbList({}, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toEqual([])
    })

    it('should pass role filter', async () => {
      mockKbList.mockResolvedValue([])

      await handleKbList({ role: 'dev' }, mockDeps)

      expect(mockKbList).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'dev' }),
        mockDeps,
      )
    })

    it('should pass tags filter', async () => {
      mockKbList.mockResolvedValue([])

      await handleKbList({ tags: ['typescript'] }, mockDeps)

      expect(mockKbList).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['typescript'] }),
        mockDeps,
      )
    })

    it('should pass limit', async () => {
      mockKbList.mockResolvedValue([])

      await handleKbList({ limit: 50 }, mockDeps)

      expect(mockKbList).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
        mockDeps,
      )
    })

    it('should handle undefined input', async () => {
      mockKbList.mockResolvedValue([])

      const result = await handleKbList(undefined, mockDeps)

      expect(result.isError).toBeUndefined()
    })
  })

  describe('handleToolCall', () => {
    it('should dispatch to correct handler', async () => {
      mockKbGet.mockResolvedValue(null)

      await handleToolCall('kb_get', { id: generateTestUuid() }, mockDeps)

      expect(mockKbGet).toHaveBeenCalled()
    })

    it('should return error for unknown tool', async () => {
      const result = await handleToolCall('unknown_tool', {}, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.message).toContain('Unknown tool')
    })
  })

  // ============================================================================
  // handleKbGetStory tests (KBAR-0070)
  // ============================================================================

  describe('handleKbGetStory', () => {
    const mockStory = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      storyId: 'TEST-001',
      title: 'Test Story',
      feature: 'test',
      epic: 'platform',
      storyType: 'feature',
      state: 'in_progress',
      phase: 'implementation',
      blocked: false,
      blockedReason: null,
      blockedByStory: null,
      priority: 'medium',
      points: 3,
      iteration: 0,
      touchesBackend: true,
      touchesFrontend: false,
      touchesDatabase: false,
      touchesInfra: false,
      storyDir: null,
      storyFile: 'story.yaml',
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      fileSyncedAt: null,
      fileHash: null,
    }

    const mockArtifacts = [
      {
        id: 'artifact-1-uuid',
        storyId: 'TEST-001',
        artifactType: 'checkpoint',
        artifactName: 'CHECKPOINT.yaml',
        kbEntryId: null,
        filePath: null,
        phase: 'implementation',
        iteration: 0,
        summary: null,
        content: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'artifact-2-uuid',
        storyId: 'TEST-001',
        artifactType: 'plan',
        artifactName: 'PLAN.yaml',
        kbEntryId: null,
        filePath: null,
        phase: 'implementation',
        iteration: 0,
        summary: null,
        content: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const mockDependencies = [
      {
        id: 'dep-1-uuid',
        storyId: 'TEST-001',
        dependsOnId: 'TEST-002',
        dependencyType: 'depends_on',
        satisfied: false,
        createdAt: new Date(),
      },
    ]

    it('should return story without artifacts or dependencies when no flags provided (backward-compat)', async () => {
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        message: 'Found story TEST-001',
      })

      const result = await handleKbGetStory({ story_id: 'TEST-001' }, mockDeps)

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('TEST-001')
      expect(parsed.message).toBe('Found story TEST-001')
      // Artifacts and dependencies keys should not be present in backward-compat mode
      expect(parsed.artifacts).toBeUndefined()
      expect(parsed.dependencies).toBeUndefined()
    })

    it('should return story with artifacts when include_artifacts:true and artifacts exist', async () => {
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        artifacts: mockArtifacts,
        message: 'Found story TEST-001',
      })

      const result = await handleKbGetStory(
        { story_id: 'TEST-001', include_artifacts: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story.storyId).toBe('TEST-001')
      expect(Array.isArray(parsed.artifacts)).toBe(true)
      expect(parsed.artifacts).toHaveLength(2)
      expect(parsed.artifacts[0].artifactType).toBe('checkpoint')
    })

    it('should return empty artifacts array when include_artifacts:true but no artifacts exist', async () => {
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        artifacts: [],
        message: 'Found story TEST-001',
      })

      const result = await handleKbGetStory(
        { story_id: 'TEST-001', include_artifacts: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(Array.isArray(parsed.artifacts)).toBe(true)
      expect(parsed.artifacts).toHaveLength(0)
    })

    it('should return story with dependencies when include_dependencies:true and dependencies exist', async () => {
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        dependencies: mockDependencies,
        message: 'Found story TEST-001',
      })

      const result = await handleKbGetStory(
        { story_id: 'TEST-001', include_dependencies: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(Array.isArray(parsed.dependencies)).toBe(true)
      expect(parsed.dependencies).toHaveLength(1)
      expect(parsed.dependencies[0].storyId).toBe('TEST-001')
      expect(parsed.dependencies[0].dependsOnId).toBe('TEST-002')
    })

    it('should return empty dependencies array when include_dependencies:true but no dependencies exist', async () => {
      mockKbGetStory.mockResolvedValue({
        story: mockStory,
        dependencies: [],
        message: 'Found story TEST-001',
      })

      const result = await handleKbGetStory(
        { story_id: 'TEST-001', include_dependencies: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(Array.isArray(parsed.dependencies)).toBe(true)
      expect(parsed.dependencies).toHaveLength(0)
    })

    it('should return null story and empty arrays when story not found (both flags true)', async () => {
      mockKbGetStory.mockResolvedValue({
        story: null,
        artifacts: [],
        dependencies: [],
        message: 'Story NONEXISTENT-999 not found',
      })

      const result = await handleKbGetStory(
        { story_id: 'NONEXISTENT-999', include_artifacts: true, include_dependencies: true },
        mockDeps,
      )

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.story).toBeNull()
      expect(Array.isArray(parsed.artifacts)).toBe(true)
      expect(parsed.artifacts).toHaveLength(0)
      expect(Array.isArray(parsed.dependencies)).toBe(true)
      expect(parsed.dependencies).toHaveLength(0)
      expect(parsed.message).toBe('Story NONEXISTENT-999 not found')
      // Verify service was only called once (single service call)
      expect(mockKbGetStory).toHaveBeenCalledTimes(1)
    })

    it('should return validation error for empty story_id', async () => {
      const result = await handleKbGetStory({ story_id: '' }, mockDeps)

      expect(result.isError).toBe(true)
      const error = JSON.parse(result.content[0].text)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should propagate service errors as MCP error results', async () => {
      mockKbGetStory.mockRejectedValue(new Error('Database connection failed'))

      const result = await handleKbGetStory({ story_id: 'TEST-001' }, mockDeps)

      expect(result.isError).toBe(true)
    })
  })
})
