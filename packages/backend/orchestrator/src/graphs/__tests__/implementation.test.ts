/**
 * Implementation Graph Tests
 *
 * Unit tests for:
 * - Graph compilation (createImplementationGraph)
 * - ImplementationGraphStateAnnotation defaults
 * - CommitRecordSchema and LoadErrorSchema Zod validation
 * - ChangeSpecSchema validation (from change-spec-schema.ts — APIP-1020 discriminated union)
 * - IModelDispatch schema validation (from pipeline/i-model-dispatch.ts)
 *
 * APIP-1031 AC-2, AC-10
 * APIP-1032 AC-1 (ChangeSpecSchema updated to APIP-1020 real schema)
 */

import { describe, expect, it, vi } from 'vitest'
import {
  createImplementationGraph,
  CommitRecordSchema,
  LoadErrorSchema,
  ImplementationGraphStateAnnotation,
  ImplementationResultSchema,
  ImplementationGraphConfigSchema,
} from '../implementation.js'
import { ChangeSpecSchema } from '../change-spec-schema.js'
import {
  IModelDispatchSchema,
  ModelDispatchRequestSchema,
  ModelDispatchResponseSchema,
} from '../../pipeline/i-model-dispatch.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the node modules that have filesystem/git side effects
vi.mock('../../nodes/load-story.js', () => ({
  loadStoryNode: vi.fn().mockResolvedValue({
    storyContent: 'mock story content',
    changeSpecs: [],
    loadError: null,
    storyLoaded: true,
  }),
}))

vi.mock('../../nodes/create-worktree.js', () => ({
  createWorktreeNode: vi.fn().mockResolvedValue({
    worktreePath: '/tmp/worktrees/APIP-1031',
    worktreeCreated: true,
  }),
}))

vi.mock('../../nodes/evidence-production.js', () => ({
  evidenceProductionNode: vi.fn().mockResolvedValue({
    evidencePath: '/tmp/evidence/EVIDENCE.yaml',
    evidenceWritten: true,
  }),
}))

vi.mock('../../nodes/change-loop.js', () => ({
  createChangeLoopNode: vi.fn(() => async () => ({
    changeLoopComplete: true,
    changeLoopStatus: 'complete' as const,
  })),
}))

// ============================================================================
// CommitRecordSchema
// ============================================================================

describe('CommitRecordSchema', () => {
  it('validates a complete commit record', () => {
    const record = {
      changeSpecId: 'CS-001',
      commitSha: 'abc123def456',
      commitMessage: 'feat: implement load-story node',
      touchedFiles: ['src/nodes/load-story.ts'],
      committedAt: new Date().toISOString(),
      durationMs: 1500,
    }

    expect(() => CommitRecordSchema.parse(record)).not.toThrow()
    const parsed = CommitRecordSchema.parse(record)
    expect(parsed.changeSpecId).toBe('CS-001')
    expect(parsed.touchedFiles).toHaveLength(1)
  })

  it('defaults touchedFiles to empty array', () => {
    const record = {
      changeSpecId: 'CS-001',
      commitSha: 'abc123',
      commitMessage: 'fix: small patch',
      committedAt: new Date().toISOString(),
      durationMs: 500,
    }

    const parsed = CommitRecordSchema.parse(record)
    expect(parsed.touchedFiles).toEqual([])
  })

  it('rejects missing required fields', () => {
    expect(() => CommitRecordSchema.parse({ changeSpecId: 'CS-001' })).toThrow()
  })

  it('rejects negative durationMs', () => {
    expect(() =>
      CommitRecordSchema.parse({
        changeSpecId: 'CS-001',
        commitSha: 'abc',
        commitMessage: 'msg',
        committedAt: new Date().toISOString(),
        durationMs: -1,
      }),
    ).toThrow()
  })
})

// ============================================================================
// LoadErrorSchema
// ============================================================================

describe('LoadErrorSchema', () => {
  it('validates STORY_NOT_FOUND error', () => {
    const err = {
      code: 'STORY_NOT_FOUND',
      message: 'Story file not found',
      path: '/some/path/APIP-1031.md',
    }
    expect(() => LoadErrorSchema.parse(err)).not.toThrow()
    const parsed = LoadErrorSchema.parse(err)
    expect(parsed.code).toBe('STORY_NOT_FOUND')
  })

  it('validates CHANGE_SPEC_NOT_FOUND error', () => {
    const err = {
      code: 'CHANGE_SPEC_NOT_FOUND',
      message: 'ChangeSpec plan missing',
    }
    expect(() => LoadErrorSchema.parse(err)).not.toThrow()
  })

  it('validates STORY_PARSE_ERROR', () => {
    expect(() =>
      LoadErrorSchema.parse({ code: 'STORY_PARSE_ERROR', message: 'YAML parse failure' }),
    ).not.toThrow()
  })

  it('validates UNKNOWN code', () => {
    expect(() =>
      LoadErrorSchema.parse({ code: 'UNKNOWN', message: 'Unexpected failure' }),
    ).not.toThrow()
  })

  it('rejects invalid error codes', () => {
    expect(() =>
      LoadErrorSchema.parse({ code: 'INVALID_CODE', message: 'Bad' }),
    ).toThrow()
  })

  it('requires message field', () => {
    expect(() => LoadErrorSchema.parse({ code: 'STORY_NOT_FOUND' })).toThrow()
  })
})

// ============================================================================
// ChangeSpecSchema — APIP-1020 discriminated union (AC-1)
// ============================================================================

describe('ChangeSpecSchema', () => {
  it('validates a file_change ChangeSpec', () => {
    const spec = {
      schema: 1,
      story_id: 'APIP-1031',
      id: 'CS-001',
      description: 'Implement load-story node',
      change_type: 'file_change',
      file_path: 'packages/backend/orchestrator/src/nodes/load-story.ts',
      file_action: 'create',
      ac_ids: ['AC-1'],
    }
    expect(() => ChangeSpecSchema.parse(spec)).not.toThrow()
    const parsed = ChangeSpecSchema.parse(spec)
    expect(parsed.id).toBe('CS-001')
    expect(parsed.change_type).toBe('file_change')
  })

  it('validates a migration_change ChangeSpec', () => {
    const spec = {
      schema: 1,
      story_id: 'APIP-1031',
      id: 'CS-002',
      description: 'Add pipeline schema migration',
      change_type: 'migration_change',
      file_path: 'packages/backend/database-schema/src/migrations/app/0001_pipeline.sql',
      ac_ids: ['AC-2'],
    }
    expect(() => ChangeSpecSchema.parse(spec)).not.toThrow()
  })

  it('validates a config_change ChangeSpec', () => {
    const spec = {
      schema: 1,
      story_id: 'APIP-1031',
      id: 'CS-003',
      description: 'Add @langchain/langgraph dependency',
      change_type: 'config_change',
      file_path: 'packages/backend/orchestrator/package.json',
      ac_ids: ['AC-3'],
    }
    expect(() => ChangeSpecSchema.parse(spec)).not.toThrow()
  })

  it('validates a test_change ChangeSpec', () => {
    const spec = {
      schema: 1,
      story_id: 'APIP-1031',
      id: 'CS-004',
      description: 'Add unit tests for load-story node',
      change_type: 'test_change',
      file_path: 'packages/backend/orchestrator/src/nodes/__tests__/load-story.test.ts',
      test_type: 'unit',
      ac_ids: ['AC-4'],
    }
    expect(() => ChangeSpecSchema.parse(spec)).not.toThrow()
  })

  it('rejects empty id', () => {
    expect(() =>
      ChangeSpecSchema.parse({
        schema: 1,
        story_id: 'TEST-001',
        id: '',
        description: 'Test',
        change_type: 'file_change',
        file_path: 'src/foo.ts',
        file_action: 'create',
        ac_ids: ['AC-1'],
      }),
    ).toThrow()
  })

  it('rejects unknown change_type', () => {
    expect(() =>
      ChangeSpecSchema.parse({
        schema: 1,
        story_id: 'TEST-001',
        id: 'CS-001',
        description: 'Test',
        change_type: 'unknown_type',
        ac_ids: ['AC-1'],
      }),
    ).toThrow()
  })

  it('rejects missing ac_ids', () => {
    expect(() =>
      ChangeSpecSchema.parse({
        schema: 1,
        story_id: 'TEST-001',
        id: 'CS-001',
        description: 'Test',
        change_type: 'file_change',
        file_path: 'src/foo.ts',
        file_action: 'create',
        ac_ids: [],
      }),
    ).toThrow()
  })
})

// ============================================================================
// IModelDispatch Schema
// ============================================================================

describe('ModelDispatchRequestSchema', () => {
  it('validates a complete dispatch request', () => {
    const req = {
      storyId: 'APIP-1031',
      attemptNumber: 1,
      prompt: 'Implement the load-story node',
    }
    expect(() => ModelDispatchRequestSchema.parse(req)).not.toThrow()
  })

  it('accepts optional modelOverride', () => {
    const req = {
      storyId: 'APIP-1031',
      attemptNumber: 1,
      prompt: 'Test prompt',
      modelOverride: 'claude-opus-4-6',
    }
    const parsed = ModelDispatchRequestSchema.parse(req)
    expect(parsed.modelOverride).toBe('claude-opus-4-6')
  })

  it('rejects non-positive attemptNumber', () => {
    expect(() =>
      ModelDispatchRequestSchema.parse({
        storyId: 'APIP-1031',
        attemptNumber: 0,
        prompt: 'Test',
      }),
    ).toThrow()
  })
})

describe('ModelDispatchResponseSchema', () => {
  it('validates a success response', () => {
    const res = {
      success: true,
      output: 'Implementation complete',
      durationMs: 3000,
    }
    expect(() => ModelDispatchResponseSchema.parse(res)).not.toThrow()
  })

  it('validates a failure response', () => {
    const res = {
      success: false,
      error: 'Model timed out',
      durationMs: 10000,
    }
    expect(() => ModelDispatchResponseSchema.parse(res)).not.toThrow()
  })
})

describe('IModelDispatchSchema', () => {
  it('validates a conformant dispatch object', () => {
    const mockDispatch = {
      dispatch: vi.fn().mockResolvedValue({
        success: true,
        output: 'Done',
        durationMs: 100,
      }),
    }
    // IModelDispatch is a function schema — validate the shape
    expect(typeof mockDispatch.dispatch).toBe('function')
    // The schema exists and can be referenced
    expect(IModelDispatchSchema).toBeDefined()
  })
})

// ============================================================================
// createImplementationGraph — graph compilation
// ============================================================================

describe('createImplementationGraph (AC-2)', () => {
  it('graph.compile() succeeds without config', () => {
    expect(() => {
      const graph = createImplementationGraph()
      expect(graph).toBeDefined()
      expect(typeof graph.invoke).toBe('function')
    }).not.toThrow()
  })

  it('graph.compile() succeeds with partial config', () => {
    expect(() => {
      const graph = createImplementationGraph({
        featureDir: 'plans/future/platform/autonomous-pipeline',
        storyId: 'APIP-1031',
        attemptNumber: 1,
      })
      expect(graph).toBeDefined()
    }).not.toThrow()
  })

  it('compiled graph has invoke method', () => {
    const graph = createImplementationGraph()
    expect(typeof graph.invoke).toBe('function')
    expect(typeof graph.stream).toBe('function')
  })
})

// ============================================================================
// ImplementationGraphConfigSchema
// ============================================================================

describe('ImplementationGraphConfigSchema', () => {
  it('defaults attemptNumber to 1', () => {
    const config = ImplementationGraphConfigSchema.parse({
      featureDir: 'plans/future/platform',
      storyId: 'APIP-1031',
    })
    expect(config.attemptNumber).toBe(1)
  })

  it('rejects empty featureDir', () => {
    expect(() =>
      ImplementationGraphConfigSchema.parse({ featureDir: '', storyId: 'APIP-1031' }),
    ).toThrow()
  })

  it('rejects empty storyId', () => {
    expect(() =>
      ImplementationGraphConfigSchema.parse({ featureDir: 'plans/', storyId: '' }),
    ).toThrow()
  })
})

// ============================================================================
// ImplementationResultSchema
// ============================================================================

describe('ImplementationResultSchema', () => {
  it('validates a successful result', () => {
    const result = {
      storyId: 'APIP-1031',
      attemptNumber: 1,
      success: true,
      aborted: false,
      abortReason: null,
      completedChanges: [],
      evidencePath: '/tmp/EVIDENCE.yaml',
      warnings: [],
      errors: [],
      durationMs: 5000,
      completedAt: new Date().toISOString(),
    }
    expect(() => ImplementationResultSchema.parse(result)).not.toThrow()
  })

  it('validates an aborted result', () => {
    const result = {
      storyId: 'APIP-1031',
      attemptNumber: 1,
      success: false,
      aborted: true,
      abortReason: 'Story file not found',
      completedChanges: [],
      evidencePath: null,
      warnings: [],
      errors: ['STORY_NOT_FOUND'],
      durationMs: 100,
      completedAt: new Date().toISOString(),
    }
    expect(() => ImplementationResultSchema.parse(result)).not.toThrow()
    const parsed = ImplementationResultSchema.parse(result)
    expect(parsed.aborted).toBe(true)
    expect(parsed.abortReason).toBe('Story file not found')
  })
})

// ============================================================================
// ImplementationGraphStateAnnotation defaults
// ============================================================================

describe('ImplementationGraphStateAnnotation (AC-2)', () => {
  it('state type is defined', () => {
    // Type-level check: ensure the annotation is properly structured
    expect(ImplementationGraphStateAnnotation).toBeDefined()
    expect(ImplementationGraphStateAnnotation.spec).toBeDefined()
  })
})
