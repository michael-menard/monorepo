/**
 * Unit Tests for Training Data Collection Tools
 * WINT-5040: Collect ML Training Data
 *
 * Tests trainingDataCollect and trainingDatasetExport with mocked DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDbSelect, mockWarn, mockInfo } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockWarn: vi.fn(),
  mockInfo: vi.fn(),
}))

// Chainable mock builder for Drizzle select queries
function createSelectChain(resolvedValue: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.where = vi.fn().mockResolvedValue(resolvedValue)
  chain.innerJoin = vi.fn().mockReturnValue(chain)
  chain.from = vi.fn().mockReturnValue(chain)
  mockDbSelect.mockReturnValue(chain)
  return chain
}

vi.mock('@repo/db', () => ({
  db: {
    select: mockDbSelect,
  },
}))

vi.mock('@repo/logger', () => ({
  logger: { warn: mockWarn, info: mockInfo },
}))

vi.mock('../../db/index.js', () => ({
  agentInvocations: {
    storyId: 'story_id',
    agentName: 'agent_name',
    phase: 'phase',
    inputTokens: 'input_tokens',
    outputTokens: 'output_tokens',
    durationMs: 'duration_ms',
    status: 'status',
    startedAt: 'started_at',
    id: 'id',
  },
  agentOutcomes: {
    invocationId: 'invocation_id',
    testsWritten: 'tests_written',
    testsPassed: 'tests_passed',
    testsFailed: 'tests_failed',
    lintErrors: 'lint_errors',
    typeErrors: 'type_errors',
    codeQuality: 'code_quality',
    testCoverage: 'test_coverage',
  },
  storyOutcomes: {
    storyId: 'story_id',
    finalVerdict: 'final_verdict',
    qualityScore: 'quality_score',
    reviewIterations: 'review_iterations',
    qaIterations: 'qa_iterations',
    createdAt: 'created_at',
  },
  hitlDecisions: {
    decisionType: 'decision_type',
    storyId: 'story_id',
    operatorId: 'operator_id',
  },
  trainingData: {
    storyId: 'story_id',
    features: 'features',
    labels: 'labels',
  },
}))

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { trainingDataCollect } from '../training-data-collect'
import { trainingDatasetExport } from '../training-dataset-export'

// ============================================================================
// FIXTURES
// ============================================================================

function makeRoutingRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    agentName: `agent-${i % 3}`,
    phase: 'implementation',
    inputTokens: 1000 + i * 100,
    outputTokens: 500 + i * 50,
    durationMs: 3000 + i * 200,
    status: i % 4 === 0 ? 'error' : 'success',
    finalVerdict: i % 3 === 0 ? 'pass' : 'fail',
    qualityScore: 50 + (i % 50),
    storyId: `WINT-${1000 + i}`,
  }))
}

function makeQualityRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    testsWritten: 5 + i,
    testsPassed: 4 + i,
    testsFailed: i % 3,
    lintErrors: i % 5,
    typeErrors: i % 2,
    codeQuality: 70 + (i % 30),
    testCoverage: 45 + (i % 55),
    finalVerdict: i % 2 === 0 ? 'pass' : 'needs_revision',
    qualityScore: 60 + (i % 40),
    reviewIterations: 1 + (i % 3),
    qaIterations: i % 2,
    storyId: `WINT-${2000 + i}`,
  }))
}

function makePreferenceRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    decisionType: ['qa_gate', 'code_review', 'story_approval'][i % 3],
    storyId: `WINT-${3000 + i}`,
    operatorId: `user-${i % 2}`,
    tdFeatures: { storyId: `WINT-${3000 + i}`, phase: 'qa' },
    tdLabels: {
      rationale: `Decision rationale ${i}`,
      confidence: 0.5 + (i % 5) * 0.1,
      alternativesConsidered: `Alt ${i}`,
      riskAssessment: `Risk ${i}`,
    },
  }))
}

// ============================================================================
// TESTS: trainingDataCollect
// ============================================================================

describe('trainingDataCollect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('routing dataset', () => {
    it('returns cold-start when rows below minimum', async () => {
      createSelectChain(makeRoutingRows(5))

      const result = await trainingDataCollect({
        datasetType: 'routing',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      expect(result!).toHaveProperty('coldStart', true)
      if ('coldStart' in result!) {
        expect(result.available).toBe(5)
        expect(result.required).toBe(50)
        expect(result.recommendation).toContain('Routing dataset')
      }
    })

    it('returns dataset with validation when rows sufficient', async () => {
      createSelectChain(makeRoutingRows(60))

      const result = await trainingDataCollect({
        datasetType: 'routing',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      expect(result!).not.toHaveProperty('coldStart')
      if (!('coldStart' in result!)) {
        expect(result.rows).toHaveLength(60)
        expect(result.stats.totalRows).toBe(60)
        expect(result.validation.valid).toBe(true)
      }
    })

    it('returns dataset with correct feature/label shape', async () => {
      createSelectChain(makeRoutingRows(55))

      const result = await trainingDataCollect({
        datasetType: 'routing',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      if (result && !('coldStart' in result)) {
        const row = result.rows[0]
        expect(row.features).toHaveProperty('agentName')
        expect(row.features).toHaveProperty('phase')
        expect(row.features).toHaveProperty('inputTokens')
        expect(row.features).toHaveProperty('outputTokens')
        expect(row.features).toHaveProperty('durationMs')
        expect(row.features).toHaveProperty('status')
        expect(row.labels).toHaveProperty('finalVerdict')
        expect(row.labels).toHaveProperty('qualityScore')
      }
    })
  })

  describe('quality dataset', () => {
    it('returns cold-start when rows below minimum', async () => {
      createSelectChain(makeQualityRows(10))

      const result = await trainingDataCollect({
        datasetType: 'quality',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      expect(result!).toHaveProperty('coldStart', true)
    })

    it('returns dataset with correct feature/label shape', async () => {
      createSelectChain(makeQualityRows(60))

      const result = await trainingDataCollect({
        datasetType: 'quality',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      if (result && !('coldStart' in result)) {
        const row = result.rows[0]
        expect(row.features).toHaveProperty('testsWritten')
        expect(row.features).toHaveProperty('lintErrors')
        expect(row.features).toHaveProperty('typeErrors')
        expect(row.labels).toHaveProperty('finalVerdict')
        expect(row.labels).toHaveProperty('reviewIterations')
      }
    })
  })

  describe('preference dataset', () => {
    it('returns cold-start when rows below minimum', async () => {
      createSelectChain(makePreferenceRows(3))

      const result = await trainingDataCollect({
        datasetType: 'preference',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      expect(result!).toHaveProperty('coldStart', true)
    })

    it('returns dataset with correct feature/label shape', async () => {
      createSelectChain(makePreferenceRows(55))

      const result = await trainingDataCollect({
        datasetType: 'preference',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      if (result && !('coldStart' in result)) {
        const row = result.rows[0]
        expect(row.features).toHaveProperty('decisionType')
        expect(row.features).toHaveProperty('storyId')
        expect(row.features).toHaveProperty('operatorId')
        expect(row.labels).toHaveProperty('rationale')
        expect(row.labels).toHaveProperty('confidence')
      }
    })
  })

  describe('error handling', () => {
    it('returns null and warns on DB error', async () => {
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      chain.where = vi.fn().mockRejectedValue(new Error('connection refused'))
      chain.innerJoin = vi.fn().mockReturnValue(chain)
      chain.from = vi.fn().mockReturnValue(chain)
      mockDbSelect.mockReturnValue(chain)

      const result = await trainingDataCollect({
        datasetType: 'routing',
        minRows: 50,
      })

      expect(result).toBeNull()
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to collect 'routing' training dataset"),
        'connection refused',
      )
    })

    it('throws on invalid datasetType', async () => {
      await expect(
        trainingDataCollect({ datasetType: 'invalid' as any, minRows: 50 }),
      ).rejects.toThrow()
    })
  })

  describe('validation', () => {
    it('detects degenerate label distribution (all same class)', async () => {
      const rows = Array.from({ length: 55 }, (_, i) => ({
        agentName: `agent-${i}`,
        phase: 'implementation',
        inputTokens: 1000,
        outputTokens: 500,
        durationMs: 3000,
        status: 'success',
        finalVerdict: 'pass',
        qualityScore: 80,
        storyId: `WINT-${i}`,
      }))
      createSelectChain(rows)

      const result = await trainingDataCollect({
        datasetType: 'routing',
        minRows: 50,
      })

      expect(result).not.toBeNull()
      if (result && !('coldStart' in result)) {
        expect(result.validation.valid).toBe(false)
        expect(result.validation.reason).toContain('distinct value')
      }
    })
  })
})

// ============================================================================
// TESTS: trainingDatasetExport
// ============================================================================

describe('trainingDatasetExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports routing dataset as JSONL', async () => {
    createSelectChain(makeRoutingRows(55))

    const result = await trainingDatasetExport({
      datasetType: 'routing',
      format: 'jsonl',
      minRows: 50,
    })

    expect(result).not.toBeNull()
    if (result && 'rows' in result) {
      expect(result.rows).toHaveLength(55)
      const parsed = JSON.parse(result.rows[0])
      expect(parsed).toHaveProperty('features')
      expect(parsed).toHaveProperty('labels')
    }
  })

  it('exports routing dataset as CSV', async () => {
    createSelectChain(makeRoutingRows(55))

    const result = await trainingDatasetExport({
      datasetType: 'routing',
      format: 'csv',
      minRows: 50,
    })

    expect(result).not.toBeNull()
    if (result && 'rows' in result) {
      expect(result.rows[0]).toContain('feature_agentName')
      expect(result.rows[0]).toContain('label_finalVerdict')
      expect(result.rows).toHaveLength(56) // header + 55 data rows
    }
  })

  it('propagates cold-start from collect', async () => {
    createSelectChain(makeRoutingRows(5))

    const result = await trainingDatasetExport({
      datasetType: 'routing',
      format: 'jsonl',
      minRows: 50,
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(result).toHaveProperty('coldStart', true)
    }
  })

  it('rejects when feature completeness below threshold', async () => {
    const rows = Array.from({ length: 55 }, (_, i) => ({
      agentName: `agent-${i}`,
      phase: null,
      inputTokens: null,
      outputTokens: null,
      durationMs: null,
      status: i % 2 === 0 ? 'success' : 'error',
      finalVerdict: i % 3 === 0 ? 'pass' : 'fail',
      qualityScore: 50 + i,
      storyId: `WINT-${i}`,
    }))
    createSelectChain(rows)

    const result = await trainingDatasetExport({
      datasetType: 'routing',
      format: 'jsonl',
      minRows: 50,
      minCompleteness: 0.9,
    })

    expect(result).not.toBeNull()
    if (result && 'valid' in result) {
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('completeness')
    }
  })

  it('returns null on DB error', async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.where = vi.fn().mockRejectedValue(new Error('timeout'))
    chain.innerJoin = vi.fn().mockReturnValue(chain)
    chain.from = vi.fn().mockReturnValue(chain)
    mockDbSelect.mockReturnValue(chain)

    const result = await trainingDatasetExport({
      datasetType: 'routing',
      format: 'jsonl',
      minRows: 50,
    })

    expect(result).toBeNull()
  })

  it('logs export stats on success', async () => {
    createSelectChain(makeRoutingRows(55))

    await trainingDatasetExport({
      datasetType: 'routing',
      format: 'jsonl',
      minRows: 50,
    })

    expect(mockInfo).toHaveBeenCalledWith(
      expect.stringContaining('Exported routing dataset'),
    )
  })
})
