import { describe, expect, it, vi } from 'vitest'

import { createKnowledgeContext, KnowledgeContextSchema } from '../knowledge-context'

// Mock @repo/logger — required because getPatternDiscoveryFromKB (imported below) uses it
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('KnowledgeContextSchema', () => {
  describe('schema validation', () => {
    it('validates a minimal valid knowledge context', () => {
      const context = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        loaded: true,
        lessons_learned: {
          count: 0,
          relevant_to_scope: [],
          blockers_to_avoid: [],
          patterns_to_follow: [],
          patterns_to_avoid: [],
        },
        architecture_decisions: {
          active_count: 0,
          relevant_adrs: [],
        },
        token_optimization: {
          high_cost_operations: [],
          recommended_patterns: [],
        },
        attack_vectors: [],
        do_not_repeat: [],
        warnings: [],
      }

      const result = KnowledgeContextSchema.parse(context)
      expect(result).toMatchObject(context)
    })

    it('validates a complete knowledge context', () => {
      const context = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        loaded: true,
        lessons_learned: {
          count: 5,
          relevant_to_scope: [
            {
              story_id: 'WISH-050',
              lesson: 'Use presigned URLs for S3 uploads',
              category: 'pattern',
              applies_because: 'Story involves file uploads',
            },
          ],
          blockers_to_avoid: ['Do not use multipart form for large files'],
          patterns_to_follow: ['Use Zod validation at API boundaries'],
          patterns_to_avoid: ['Avoid inline styles in components'],
        },
        architecture_decisions: {
          active_count: 3,
          relevant_adrs: [
            {
              id: 'ADR-001',
              title: 'Use S3 for file storage',
              status: 'active',
              constraint: 'All file storage must use S3',
              applies_to: ['file-upload', 'media'],
            },
          ],
          constraints: {
            api_paths: 'All API paths must be prefixed with /api/v1',
            infrastructure: 'Lambda functions only',
            storage: 'S3 for files, Aurora for data',
            auth: 'Cognito with JWT tokens',
            testing: 'Minimum 45% coverage',
          },
        },
        token_optimization: {
          high_cost_operations: [
            {
              operation: 'Reading full LESSONS-LEARNED.md',
              typical_tokens: 18000,
              mitigation: 'Use KNOWLEDGE-CONTEXT.yaml instead',
            },
          ],
          recommended_patterns: ['Use YAML artifacts', 'Cache KB queries'],
        },
        attack_vectors: ['Missing input validation led to XSS in WISH-042'],
        do_not_repeat: ['Do not hardcode S3 bucket names'],
        warnings: ['KB may be stale - last updated 7 days ago'],
        tokens: { in: 5000, out: 1000 },
      }

      const result = KnowledgeContextSchema.parse(context)
      expect(result.lessons_learned.count).toBe(5)
      expect(result.lessons_learned.relevant_to_scope).toHaveLength(1)
      expect(result.architecture_decisions.relevant_adrs).toHaveLength(1)
      expect(result.token_optimization.high_cost_operations).toHaveLength(1)
    })

    it('validates lesson categories', () => {
      const validCategories = ['blocker', 'pattern', 'time_sink', 'reuse', 'anti_pattern']

      validCategories.forEach(category => {
        const context = {
          schema: 1,
          story_id: 'WISH-001',
          timestamp: '2026-02-01T12:00:00.000Z',
          loaded: true,
          lessons_learned: {
            count: 1,
            relevant_to_scope: [
              {
                story_id: 'WISH-050',
                lesson: 'Test lesson',
                category,
                applies_because: 'Test reason',
              },
            ],
            blockers_to_avoid: [],
            patterns_to_follow: [],
            patterns_to_avoid: [],
          },
          architecture_decisions: {
            active_count: 0,
            relevant_adrs: [],
          },
          token_optimization: {
            high_cost_operations: [],
            recommended_patterns: [],
          },
          attack_vectors: [],
          do_not_repeat: [],
          warnings: [],
        }

        expect(() => KnowledgeContextSchema.parse(context)).not.toThrow()
      })
    })

    it('rejects invalid lesson category', () => {
      const context = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        loaded: true,
        lessons_learned: {
          count: 1,
          relevant_to_scope: [
            {
              story_id: 'WISH-050',
              lesson: 'Test',
              category: 'invalid',
              applies_because: 'Test',
            },
          ],
          blockers_to_avoid: [],
          patterns_to_follow: [],
          patterns_to_avoid: [],
        },
        architecture_decisions: { active_count: 0, relevant_adrs: [] },
        token_optimization: { high_cost_operations: [], recommended_patterns: [] },
        attack_vectors: [],
        do_not_repeat: [],
        warnings: [],
      }

      expect(() => KnowledgeContextSchema.parse(context)).toThrow()
    })

    it('validates ADR status', () => {
      const validStatuses = ['active', 'proposed', 'deprecated', 'superseded']

      validStatuses.forEach(status => {
        const context = {
          schema: 1,
          story_id: 'WISH-001',
          timestamp: '2026-02-01T12:00:00.000Z',
          loaded: true,
          lessons_learned: {
            count: 0,
            relevant_to_scope: [],
            blockers_to_avoid: [],
            patterns_to_follow: [],
            patterns_to_avoid: [],
          },
          architecture_decisions: {
            active_count: 1,
            relevant_adrs: [
              {
                id: 'ADR-001',
                title: 'Test ADR',
                status,
                constraint: 'Test constraint',
                applies_to: ['test'],
              },
            ],
          },
          token_optimization: {
            high_cost_operations: [],
            recommended_patterns: [],
          },
          attack_vectors: [],
          do_not_repeat: [],
          warnings: [],
        }

        expect(() => KnowledgeContextSchema.parse(context)).not.toThrow()
      })
    })

    it('validates pattern_discovery field with results', () => {
      const context = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        loaded: true,
        lessons_learned: {
          count: 0,
          relevant_to_scope: [],
          blockers_to_avoid: [],
          patterns_to_follow: [],
          patterns_to_avoid: [],
        },
        architecture_decisions: { active_count: 0, relevant_adrs: [] },
        token_optimization: { high_cost_operations: [], recommended_patterns: [] },
        pattern_discovery: [
          {
            story_id: 'KBAR-0130',
            artifact_type: 'evidence',
            content_summary: 'artifact_search tool implementation evidence',
            relevance_score: 0.91,
            phase: 'implementation',
          },
        ],
        attack_vectors: [],
        do_not_repeat: [],
        warnings: [],
      }

      const result = KnowledgeContextSchema.parse(context)
      expect(result.pattern_discovery).toHaveLength(1)
      expect(result.pattern_discovery[0].story_id).toBe('KBAR-0130')
      expect(result.pattern_discovery[0].artifact_type).toBe('evidence')
      expect(result.pattern_discovery[0].relevance_score).toBe(0.91)
    })

    it('defaults pattern_discovery to empty array when not provided', () => {
      const context = {
        schema: 1,
        story_id: 'WISH-001',
        timestamp: '2026-02-01T12:00:00.000Z',
        loaded: true,
        lessons_learned: {
          count: 0,
          relevant_to_scope: [],
          blockers_to_avoid: [],
          patterns_to_follow: [],
          patterns_to_avoid: [],
        },
        architecture_decisions: { active_count: 0, relevant_adrs: [] },
        token_optimization: { high_cost_operations: [], recommended_patterns: [] },
        attack_vectors: [],
        do_not_repeat: [],
        warnings: [],
      }

      const result = KnowledgeContextSchema.parse(context)
      expect(result.pattern_discovery).toEqual([])
    })
  })

  describe('createKnowledgeContext', () => {
    it('creates an empty knowledge context', () => {
      const context = createKnowledgeContext('WISH-001')

      expect(context.schema).toBe(1)
      expect(context.story_id).toBe('WISH-001')
      expect(context.loaded).toBe(false)
      expect(context.lessons_learned.count).toBe(0)
      expect(context.lessons_learned.relevant_to_scope).toEqual([])
      expect(context.architecture_decisions.active_count).toBe(0)
      expect(context.architecture_decisions.relevant_adrs).toEqual([])
      expect(context.token_optimization.high_cost_operations).toEqual([])
      expect(context.attack_vectors).toEqual([])
      expect(context.do_not_repeat).toEqual([])
      expect(context.warnings).toEqual([])
    })

    it('creates a valid context that passes schema validation', () => {
      const context = createKnowledgeContext('WISH-001')

      expect(() => KnowledgeContextSchema.parse(context)).not.toThrow()
    })

    it('sets loaded to false initially', () => {
      const context = createKnowledgeContext('WISH-001')

      expect(context.loaded).toBe(false)
    })

    it('has a valid timestamp', () => {
      const context = createKnowledgeContext('WISH-001')

      expect(context.timestamp).toBeDefined()
      expect(() => new Date(context.timestamp)).not.toThrow()
    })

    it('initializes pattern_discovery as empty array', () => {
      const context = createKnowledgeContext('WISH-001')

      expect(context.pattern_discovery).toEqual([])
    })
  })
})

describe('getPatternDiscoveryFromKB', () => {
  // Import the function from load-knowledge-context to test artifactSearchFn paths
  // These tests verify the three paths: provided+results, provided+empty, not provided

  it('HP-4: returns pattern discovery results when artifactSearchFn is provided and returns results', async () => {
    const { getPatternDiscoveryFromKB } = await import('../../nodes/reality/load-knowledge-context')

    const mockArtifactSearchFn = vi.fn().mockResolvedValue({
      results: [
        {
          story_id: 'KBAR-0130',
          artifact_type: 'evidence',
          content_summary: 'artifact_search tool implementation',
          relevance_score: 0.91,
          phase: 'implementation',
        },
      ],
      metadata: { total: 1 },
    })

    const warnings: string[] = []
    const result = await getPatternDiscoveryFromKB(
      'knowledge-base',
      'artifact search MCP tool',
      mockArtifactSearchFn,
      { db: {}, embeddingClient: {} },
      warnings,
    )

    expect(result).toHaveLength(2) // called twice (evidence + plan), first returns 1, second returns 1
    expect(result[0].story_id).toBe('KBAR-0130')
    expect(result[0].artifact_type).toBe('evidence')
    expect(result[0].relevance_score).toBe(0.91)
    expect(mockArtifactSearchFn).toHaveBeenCalledTimes(2)
    expect(mockArtifactSearchFn).toHaveBeenCalledWith(
      expect.objectContaining({ artifact_type: 'evidence' }),
      expect.anything(),
    )
    expect(mockArtifactSearchFn).toHaveBeenCalledWith(
      expect.objectContaining({ artifact_type: 'plan' }),
      expect.anything(),
    )
    expect(warnings).toHaveLength(0)
  })

  it('HP-5: returns empty array with warning when artifactSearchFn is provided but returns no results', async () => {
    const { getPatternDiscoveryFromKB } = await import('../../nodes/reality/load-knowledge-context')

    const mockArtifactSearchFn = vi.fn().mockResolvedValue({
      results: [],
      metadata: { total: 0 },
    })

    const warnings: string[] = []
    const result = await getPatternDiscoveryFromKB(
      'knowledge-base',
      'artifact search',
      mockArtifactSearchFn,
      { db: {}, embeddingClient: {} },
      warnings,
    )

    expect(result).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('artifact_search returned no results')
    expect(warnings[0]).toContain('pattern_discovery set to []')
  })

  it('ED-1: returns empty array with warning when artifactSearchFn throws', async () => {
    const { getPatternDiscoveryFromKB } = await import('../../nodes/reality/load-knowledge-context')

    const mockArtifactSearchFn = vi.fn().mockRejectedValue(new Error('artifact_search unavailable'))

    const warnings: string[] = []
    const result = await getPatternDiscoveryFromKB(
      'knowledge-base',
      'artifact search',
      mockArtifactSearchFn,
      { db: {}, embeddingClient: {} },
      warnings,
    )

    expect(result).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('pattern_discovery set to []')
  })
})
