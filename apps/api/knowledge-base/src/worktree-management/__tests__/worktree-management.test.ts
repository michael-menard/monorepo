/**
 * Unit Tests for worktree-management (knowledge-base canonical implementation)
 * WINT-1130: Track Worktree-to-Story Mapping in Database
 *
 * Tests AC-5 through AC-8 for the canonical knowledge-base implementation
 * that uses getDbClient() from ../db/client.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist all mock functions before module loading
const {
  mockReturning,
  mockValues,
  mockInsert,
  mockSelectLimit,
  mockSelectFrom,
  mockSelectWhere,
  mockSelect,
  mockInnerJoin,
  mockOrderBy,
  mockOffset,
  mockUpdate,
  mockSet,
  mockUpdateWhere,
  mockWarn,
} = vi.hoisted(() => ({
  mockReturning: vi.fn(),
  mockValues: vi.fn(),
  mockInsert: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockSelectFrom: vi.fn(),
  mockSelectWhere: vi.fn(),
  mockSelect: vi.fn(),
  mockInnerJoin: vi.fn(),
  mockOrderBy: vi.fn(),
  mockOffset: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockWarn: vi.fn(),
}))

// Mock the db client
vi.mock('../../db/client.js', () => ({
  getDbClient: () => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  }),
}))

// Mock the db schema exports
vi.mock('../../db/index.js', () => ({
  worktrees: {
    id: 'id',
    storyId: 'story_id',
    worktreePath: 'worktree_path',
    branchName: 'branch_name',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    mergedAt: 'merged_at',
    abandonedAt: 'abandoned_at',
    metadata: 'metadata',
  },
  stories: {
    storyId: 'story_id',
  },
}))

vi.mock('@repo/logger', () => ({
  logger: { warn: mockWarn, info: vi.fn() },
}))

// Chain setup helpers
function setupSelectChain(result: unknown[]) {
  mockSelectLimit.mockResolvedValue(result)
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit })
  mockInnerJoin.mockReturnValue({ where: mockSelectWhere })
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere, innerJoin: mockInnerJoin })
  mockSelect.mockReturnValue({ from: mockSelectFrom })
}

function setupSelectChainWithPagination(result: unknown[]) {
  mockOffset.mockResolvedValue(result)
  mockSelectLimit.mockReturnValue({ offset: mockOffset })
  mockOrderBy.mockReturnValue({ limit: mockSelectLimit })
  mockSelectWhere.mockReturnValue({ orderBy: mockOrderBy })
  mockInnerJoin.mockReturnValue({ where: mockSelectWhere })
  mockSelectFrom.mockReturnValue({ innerJoin: mockInnerJoin })
  mockSelect.mockReturnValue({ from: mockSelectFrom })
}

function setupInsertChain(result: unknown[]) {
  mockReturning.mockResolvedValue(result)
  mockValues.mockReturnValue({ returning: mockReturning })
  mockInsert.mockReturnValue({ values: mockValues })
}

function setupUpdateChain(result: unknown[]) {
  mockReturning.mockResolvedValue(result)
  mockUpdateWhere.mockReturnValue({ returning: mockReturning })
  mockSet.mockReturnValue({ where: mockUpdateWhere })
  mockUpdate.mockReturnValue({ set: mockSet })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('worktreeRegister', () => {
  it('should register a worktree for an existing story', async () => {
    const { worktreeRegister } = await import('../worktree-register.js')

    const now = new Date()
    // First select: story lookup
    setupSelectChain([{ storyId: 'WINT-1130' }])
    // Then insert
    setupInsertChain([
      {
        id: 'test-uuid',
        storyId: 'WINT-1130',
        worktreePath: '/path/to/worktree',
        branchName: 'story/WINT-1130',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const result = await worktreeRegister({
      storyId: 'WINT-1130',
      worktreePath: '/path/to/worktree',
      branchName: 'story/WINT-1130',
    })

    expect(result).not.toBeNull()
    expect(result?.id).toBe('test-uuid')
    expect(result?.storyId).toBe('WINT-1130')
    expect(result?.status).toBe('active')
  })

  it('should return null when story does not exist', async () => {
    const { worktreeRegister } = await import('../worktree-register.js')

    setupSelectChain([]) // No story found

    const result = await worktreeRegister({
      storyId: 'NOEX-001',
      worktreePath: '/path/to/worktree',
      branchName: 'story/NOEX-001',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalled()
  })

  it('should return null on database error', async () => {
    const { worktreeRegister } = await import('../worktree-register.js')

    mockSelect.mockImplementation(() => {
      throw new Error('DB connection failed')
    })

    const result = await worktreeRegister({
      storyId: 'WINT-1130',
      worktreePath: '/path/to/worktree',
      branchName: 'story/WINT-1130',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalled()
  })

  it('should reject invalid storyId format', async () => {
    const { worktreeRegister } = await import('../worktree-register.js')

    await expect(
      worktreeRegister({
        storyId: 'invalid',
        worktreePath: '/path/to/worktree',
        branchName: 'story/invalid',
      }),
    ).rejects.toThrow()
  })
})

describe('worktreeGetByStory', () => {
  it('should return active worktree for a story', async () => {
    const { worktreeGetByStory } = await import('../worktree-get-by-story.js')

    const now = new Date()
    setupSelectChain([
      {
        id: 'test-uuid',
        storyId: 'WINT-1130',
        worktreePath: '/path/to/worktree',
        branchName: 'story/WINT-1130',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        mergedAt: null,
        abandonedAt: null,
        metadata: { some: 'data' },
      },
    ])

    const result = await worktreeGetByStory({ storyId: 'WINT-1130' })

    expect(result).not.toBeNull()
    expect(result?.id).toBe('test-uuid')
    expect(result?.status).toBe('active')
    expect(result?.metadata).toEqual({ some: 'data' })
  })

  it('should return null when no active worktree exists', async () => {
    const { worktreeGetByStory } = await import('../worktree-get-by-story.js')

    setupSelectChain([])

    const result = await worktreeGetByStory({ storyId: 'WINT-1130' })
    expect(result).toBeNull()
  })

  it('should default metadata to empty object when null', async () => {
    const { worktreeGetByStory } = await import('../worktree-get-by-story.js')

    setupSelectChain([
      {
        id: 'test-uuid',
        storyId: 'WINT-1130',
        worktreePath: '/path',
        branchName: 'branch',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        abandonedAt: null,
        metadata: null,
      },
    ])

    const result = await worktreeGetByStory({ storyId: 'WINT-1130' })
    expect(result?.metadata).toEqual({})
  })
})

describe('worktreeListActive', () => {
  it('should return list of active worktrees', async () => {
    const { worktreeListActive } = await import('../worktree-list-active.js')

    const now = new Date()
    setupSelectChainWithPagination([
      {
        id: 'uuid-1',
        storyId: 'WINT-1130',
        worktreePath: '/path/1',
        branchName: 'branch-1',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        mergedAt: null,
        abandonedAt: null,
        metadata: {},
      },
      {
        id: 'uuid-2',
        storyId: 'WINT-1140',
        worktreePath: '/path/2',
        branchName: 'branch-2',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        mergedAt: null,
        abandonedAt: null,
        metadata: null,
      },
    ])

    const result = await worktreeListActive({ limit: 50, offset: 0 })

    expect(result).toHaveLength(2)
    expect(result[0].status).toBe('active')
    expect(result[1].metadata).toEqual({}) // null → {}
  })

  it('should return empty array on error', async () => {
    const { worktreeListActive } = await import('../worktree-list-active.js')

    mockSelect.mockImplementation(() => {
      throw new Error('DB error')
    })

    const result = await worktreeListActive({ limit: 50, offset: 0 })
    expect(result).toEqual([])
  })
})

describe('worktreeMarkComplete', () => {
  it('should mark worktree as merged', async () => {
    const { worktreeMarkComplete } = await import('../worktree-mark-complete.js')

    setupUpdateChain([{ id: 'test-uuid', status: 'merged' }])

    const result = await worktreeMarkComplete({
      worktreeId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'merged',
    })

    expect(result).toEqual({ success: true })
  })

  it('should mark worktree as abandoned with metadata', async () => {
    const { worktreeMarkComplete } = await import('../worktree-mark-complete.js')

    setupUpdateChain([{ id: 'test-uuid', status: 'abandoned' }])

    const result = await worktreeMarkComplete({
      worktreeId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'abandoned',
      metadata: { reason: 'takeover' },
    })

    expect(result).toEqual({ success: true })
  })

  it('should return null when worktree not found', async () => {
    const { worktreeMarkComplete } = await import('../worktree-mark-complete.js')

    setupUpdateChain([]) // No rows updated

    const result = await worktreeMarkComplete({
      worktreeId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'merged',
    })

    expect(result).toBeNull()
  })

  it('should return null on database error', async () => {
    const { worktreeMarkComplete } = await import('../worktree-mark-complete.js')

    mockUpdate.mockImplementation(() => {
      throw new Error('DB error')
    })

    const result = await worktreeMarkComplete({
      worktreeId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'merged',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalled()
  })
})
