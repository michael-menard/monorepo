import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowRepository, createWorkflowRepository } from '../workflow-repository.js'
import type { DbClient } from '../story-repository.js'

// Mock database client
function createMockDbClient(): DbClient & { mockQueries: string[]; mockValues: unknown[][] } {
  const mockQueries: string[] = []
  const mockValues: unknown[][] = []

  const queryFn = vi.fn(
    async <T extends unknown = unknown>(
      text: string,
      values?: unknown[],
    ): Promise<{ rows: T[]; rowCount: number }> => {
      mockQueries.push(text)
      if (values) mockValues.push(values)

      // Mock story UUID lookup
      if (text.includes('SELECT id FROM wint.stories')) {
        return {
          rows: [{ id: 'story-uuid-001' }] as unknown as T[],
          rowCount: 1,
        }
      }

      // Mock version queries
      if (text.includes('MAX(version)') || text.includes('COALESCE(MAX(version)')) {
        return {
          rows: [{ max_version: 1 }] as unknown as T[],
          rowCount: 1,
        }
      }

      // Mock INSERT queries
      if (text.includes('INSERT INTO')) {
        return {
          rows: [
            {
              id: 'record-uuid-001',
              story_id: 'story-uuid-001',
              created_at: new Date(),
            },
          ] as unknown as T[],
          rowCount: 1,
        }
      }

      // Mock SELECT queries
      if (text.includes('SELECT *')) {
        return {
          rows: [
            {
              id: 'record-uuid-001',
              story_id: 'story-uuid-001',
              created_at: new Date(),
            },
          ] as unknown as T[],
          rowCount: 1,
        }
      }

      // Mock token usage aggregate queries
      if (text.includes('SUM')) {
        if (text.includes('GROUP BY phase')) {
          return {
            rows: [
              { phase: 'elaboration', total_tokens: 1000 },
              { phase: 'plan', total_tokens: 500 },
            ] as unknown as T[],
            rowCount: 2,
          }
        } else {
          return {
            rows: [{ total: 1500 }] as unknown as T[],
            rowCount: 1,
          }
        }
      }

      return { rows: [], rowCount: 0 }
    },
  ) as unknown as DbClient['query']

  return {
    mockQueries,
    mockValues,
    query: queryFn,
  }
}

describe('WorkflowRepository', () => {
  let mockClient: ReturnType<typeof createMockDbClient>
  let repo: WorkflowRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    repo = new WorkflowRepository(mockClient)
  })

  describe('saveElaboration', () => {
    it('should insert elaboration with wint schema prefix', async () => {
      const content = { test: 'data' }
      await repo.saveElaboration('WINT-001', content, 90, 0, 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('INSERT INTO wint.elaborations'),
      )
    })

    it('should use wint.verdict_type enum', async () => {
      const content = { test: 'data' }
      await repo.saveElaboration('WINT-001', content, 90, 0, 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining("'pass'::wint.verdict_type"),
      )
    })

    it('should throw error when story not found', async () => {
      mockClient.query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(repo.saveElaboration('WINT-999', {}, 90, 0, 'test-actor')).rejects.toThrow(
        'Story not found',
      )
    })
  })

  describe('getLatestElaboration', () => {
    it('should query wint.elaborations table', async () => {
      await repo.getLatestElaboration('WINT-001')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT * FROM wint.elaborations'),
      )
    })

    it('should return null when story not found', async () => {
      mockClient.query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await repo.getLatestElaboration('WINT-999')
      expect(result).toBe(null)
    })
  })

  describe('savePlan', () => {
    it('should query max version from wint.implementation_plans', async () => {
      const plan = { steps: [], files_to_change: [], complexity: 'medium' }
      await repo.savePlan('WINT-001', plan, 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT MAX(version) as max_version FROM wint.implementation_plans'),
      )
    })

    it('should insert into wint.implementation_plans', async () => {
      const plan = { steps: [], files_to_change: [], complexity: 'medium' }
      await repo.savePlan('WINT-001', plan, 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('INSERT INTO wint.implementation_plans'),
      )
    })
  })

  describe('getLatestPlan', () => {
    it('should query wint.implementation_plans table', async () => {
      await repo.getLatestPlan('WINT-001')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT * FROM wint.implementation_plans'),
      )
    })
  })

  describe('saveVerification', () => {
    it('should query max version from wint.verifications', async () => {
      await repo.saveVerification('WINT-001', 'qa_verify', {}, 'PASS', 0, 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT COALESCE(MAX(version), 0) as max_version FROM wint.verifications'),
      )
    })

    it('should insert into wint.verifications with wint.verdict_type', async () => {
      await repo.saveVerification('WINT-001', 'qa_verify', {}, 'PASS', 0, 'test-actor')

      const insertQuery = mockClient.mockQueries.find(q => q.includes('INSERT INTO wint.verifications'))
      expect(insertQuery).toBeDefined()
      expect(insertQuery).toContain('::wint.verdict_type')
    })
  })

  describe('getLatestVerification', () => {
    it('should query wint.verifications table', async () => {
      await repo.getLatestVerification('WINT-001', 'qa_verify')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT * FROM wint.verifications'),
      )
    })
  })

  describe('saveProof', () => {
    it('should query max version from wint.proofs', async () => {
      const evidence = { acceptance_criteria: [], touched_files: [] }
      await repo.saveProof('WINT-001', evidence, 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT COALESCE(MAX(version), 0) as max_version FROM wint.proofs'),
      )
    })

    it('should insert into wint.proofs', async () => {
      const evidence = { acceptance_criteria: [], touched_files: [] }
      await repo.saveProof('WINT-001', evidence, 'test-actor')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('INSERT INTO wint.proofs'),
      )
    })
  })

  describe('getLatestProof', () => {
    it('should query wint.proofs table', async () => {
      await repo.getLatestProof('WINT-001')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT * FROM wint.proofs'),
      )
    })
  })

  describe('logTokenUsage', () => {
    it('should insert into wint.token_usage', async () => {
      await repo.logTokenUsage('WINT-001', 'test-phase', {
        inputTokens: 100,
        outputTokens: 50,
      })

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('INSERT INTO wint.token_usage'),
      )
    })
  })

  describe('getTokenUsageSummary', () => {
    it('should query wint.token_usage with GROUP BY', async () => {
      await repo.getTokenUsageSummary('WINT-001')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('FROM wint.token_usage'),
      )
      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('GROUP BY phase'),
      )
    })
  })

  describe('getTotalTokenUsage', () => {
    it('should query wint.token_usage with SUM', async () => {
      await repo.getTotalTokenUsage('WINT-001')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('FROM wint.token_usage'),
      )
      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SUM'),
      )
    })
  })

  describe('getStoryUuid (private helper)', () => {
    it('should query wint.stories table', async () => {
      // Trigger the private method by calling a public method
      await repo.getLatestElaboration('WINT-001')

      expect(mockClient.mockQueries).toContainEqual(
        expect.stringContaining('SELECT id FROM wint.stories'),
      )
    })
  })
})

describe('createWorkflowRepository', () => {
  it('should create a repository instance', () => {
    const mockClient = createMockDbClient()
    const repo = createWorkflowRepository(mockClient)

    expect(repo).toBeInstanceOf(WorkflowRepository)
  })
})
