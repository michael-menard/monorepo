import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StoryRepository, createStoryRepository, type DbClient, type StoryRow } from '../story-repository.js'
import type { StoryArtifact } from '../../artifacts/story.js'

// Mock database client
function createMockDbClient(): DbClient & { mockRows: StoryRow[]; mockQueries: string[] } {
  const mockRows: StoryRow[] = []
  const mockQueries: string[] = []

  return {
    mockRows,
    mockQueries,
    query: vi.fn(async <T>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number }> => {
      mockQueries.push(text)

      // Return mock data based on query type
      if (text.includes('SELECT') && text.includes('FROM stories')) {
        return { rows: mockRows as unknown as T[], rowCount: mockRows.length }
      }

      if (text.includes('INSERT INTO stories')) {
        const newRow: StoryRow = {
          id: 'uuid-' + (values?.[0] as string || 'WISH-001'), // UUID primary key
          story_id: values?.[0] as string || 'WISH-001', // Human-readable ID
          feature_id: values?.[1] as string || null,
          type: values?.[2] as string || 'feature',
          state: values?.[3] as StoryRow['state'] || 'draft',
          title: values?.[4] as string || 'Test Story',
          goal: values?.[5] as string || 'Test goal',
          points: values?.[6] as number | null ?? null,
          priority: values?.[7] as string | null ?? 'p2',
          blocked_by: values?.[8] as string | null ?? null,
          depends_on: values?.[9] as string[] | null ?? [],
          follow_up_from: values?.[10] as string | null ?? null,
          packages: values?.[11] as string[] | null ?? [],
          surfaces: values?.[12] as string[] | null ?? [],
          non_goals: values?.[13] as string[] | null ?? [],
          created_at: new Date(),
          updated_at: new Date(),
        }
        return { rows: [newRow] as unknown as T[], rowCount: 1 }
      }

      if (text.includes('UPDATE stories')) {
        return { rows: [], rowCount: 1 }
      }

      if (text.includes('INSERT INTO story_state_transitions')) {
        return { rows: [], rowCount: 1 }
      }

      return { rows: [], rowCount: 0 }
    }),
  }
}

describe('StoryRepository', () => {
  let mockClient: ReturnType<typeof createMockDbClient>
  let repo: StoryRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    repo = new StoryRepository(mockClient)
  })

  describe('getStory', () => {
    it('should return null when story not found', async () => {
      const result = await repo.getStory('WISH-001')
      expect(result).toBe(null)
    })

    it('should return story artifact when found', async () => {
      mockClient.mockRows.push({
        id: 'uuid-WISH-001',
        story_id: 'WISH-001',
        feature_id: null,
        type: 'feature',
        state: 'draft',
        title: 'Test Story',
        goal: 'Test goal',
        points: 3,
        priority: 'p2',
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        packages: ['@repo/api-client'],
        surfaces: ['frontend'],
        non_goals: [],
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      })

      const result = await repo.getStory('WISH-001')

      expect(result).not.toBe(null)
      expect(result?.id).toBe('WISH-001')
      expect(result?.state).toBe('draft')
      expect(result?.scope.packages).toEqual(['@repo/api-client'])
    })

    it('should call database with correct query', async () => {
      await repo.getStory('WISH-001')

      expect(mockClient.query).toHaveBeenCalled()
      expect(mockClient.mockQueries[0]).toContain('SELECT')
      expect(mockClient.mockQueries[0]).toContain('FROM stories')
    })
  })

  describe('createStory', () => {
    it('should insert story and log initial state transition', async () => {
      const story: StoryArtifact = {
        schema: 1,
        id: 'WISH-001',
        feature: 'wishlist',
        type: 'feature',
        state: 'draft',
        title: 'Test Story',
        goal: 'Test goal',
        points: 3,
        priority: 'medium',
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        scope: { packages: [], surfaces: [] },
        non_goals: [],
        acs: [],
        risks: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const result = await repo.createStory(story, 'test-actor')

      expect(result.id).toBe('WISH-001')
      expect(mockClient.mockQueries).toContainEqual(expect.stringContaining('INSERT INTO stories'))
      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('INSERT INTO story_state_transitions'),
      )
    })
  })

  describe('updateStoryState', () => {
    it('should throw error when story not found', async () => {
      await expect(repo.updateStoryState('WISH-999', 'backlog', 'test-actor')).rejects.toThrow(
        'Story not found',
      )
    })

    it('should update state and log transition', async () => {
      mockClient.mockRows.push({
        id: 'uuid-WISH-001',
        story_id: 'WISH-001',
        feature_id: null,
        type: 'feature',
        state: 'draft',
        title: 'Test Story',
        goal: 'Test goal',
        points: null,
        priority: 'p2',
        blocked_by: null,
        depends_on: [],
        follow_up_from: null,
        packages: [],
        surfaces: [],
        non_goals: [],
        created_at: new Date(),
        updated_at: new Date(),
      })

      await repo.updateStoryState('WISH-001', 'backlog', 'test-actor', 'Ready for backlog')

      expect(mockClient.mockQueries).toContainEqual(expect.stringContaining('UPDATE stories SET state'))
      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('INSERT INTO story_state_transitions'),
      )
    })
  })

  describe('setBlockedBy', () => {
    it('should update blocked_by field', async () => {
      await repo.setBlockedBy('WISH-002', 'WISH-001', 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(expect.stringContaining('UPDATE stories SET blocked_by'))
    })

    it('should clear blocked_by when null', async () => {
      await repo.setBlockedBy('WISH-002', null, 'test-actor')

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('blocked_by = $1'),
        [null, 'WISH-002'],
      )
    })
  })

  describe('getWorkableStories', () => {
    it('should query for ready-to-work and not blocked stories', async () => {
      await repo.getWorkableStories()

      expect(mockClient.mockQueries[0]).toContain("state = 'ready-to-work'")
      expect(mockClient.mockQueries[0]).toContain('blocked_by IS NULL')
    })

    it('should order by priority', async () => {
      await repo.getWorkableStories()

      expect(mockClient.mockQueries[0]).toContain('ORDER BY')
      expect(mockClient.mockQueries[0]).toContain('priority')
    })
  })

  describe('getStoriesByState', () => {
    it('should filter by state', async () => {
      await repo.getStoriesByState('in-progress')

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('state = $1'), ['in-progress'])
    })
  })

  describe('getStoriesByFeature', () => {
    it('should filter by feature name using JOIN', async () => {
      await repo.getStoriesByFeature('wishlist')

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('f.name = $1'),
        ['wishlist'],
      )
    })
  })

  describe('getNextAction', () => {
    it('should return blocked message when story is blocked', async () => {
      mockClient.mockRows.push({
        id: 'uuid-WISH-002',
        story_id: 'WISH-002',
        feature_id: null,
        type: 'feature',
        state: 'ready-to-work',
        title: 'Test Story',
        goal: 'Test goal',
        points: null,
        priority: 'p2',
        blocked_by: 'WISH-001',
        depends_on: [],
        follow_up_from: null,
        packages: [],
        surfaces: [],
        non_goals: [],
        created_at: new Date(),
        updated_at: new Date(),
      })

      const action = await repo.getNextAction('WISH-002')

      expect(action).toContain('Blocked by WISH-001')
    })

    it('should return appropriate action for each state', async () => {
      const states = [
        { state: 'draft', expected: 'Generate story structure' },
        { state: 'backlog', expected: 'Elaborate story' },
        { state: 'ready-to-work', expected: 'Start implementation' },
        { state: 'in-progress', expected: 'Continue implementation' },
        { state: 'ready-for-qa', expected: 'Run QA verification' },
        { state: 'uat', expected: 'Complete UAT testing' },
        { state: 'done', expected: 'Story complete' },
        { state: 'cancelled', expected: 'Story cancelled' },
      ] as const

      for (const { state, expected } of states) {
        mockClient.mockRows.length = 0
        mockClient.mockRows.push({
          id: 'uuid-WISH-001',
          story_id: 'WISH-001',
          feature_id: null,
          type: 'feature',
          state,
          title: 'Test Story',
          goal: 'Test goal',
          points: null,
          priority: 'p2',
          blocked_by: null,
          depends_on: [],
          follow_up_from: null,
          packages: [],
          surfaces: [],
          non_goals: [],
          created_at: new Date(),
          updated_at: new Date(),
        })

        const action = await repo.getNextAction('WISH-001')
        expect(action).toContain(expected)
      }
    })

    it('should return not found message for missing story', async () => {
      const action = await repo.getNextAction('WISH-999')
      expect(action).toBe('Story not found')
    })
  })
})

describe('createStoryRepository', () => {
  it('should create a repository instance', () => {
    const mockClient = createMockDbClient()
    const repo = createStoryRepository(mockClient)

    expect(repo).toBeInstanceOf(StoryRepository)
  })
})
