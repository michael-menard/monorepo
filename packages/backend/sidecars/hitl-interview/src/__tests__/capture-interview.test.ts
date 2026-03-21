/**
 * Unit Tests for captureInterview
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-10: ≥45% coverage
 * Tests: core capture logic, feature vector building, context reading
 */

import { describe, it, expect, vi } from 'vitest'
import {
  captureInterview,
  buildFeatureVector,
  readHitlContext,
  computeStoryComplexityScore,
} from '../capture-interview.js'
import type { DrizzleDb, CaptureInterviewDeps } from '../capture-interview.js'
import type { HitlInterviewParams, InterviewAnswers } from '../__types__/index.js'

// ============================================================================
// Fixtures
// ============================================================================

const validParams: HitlInterviewParams = {
  storyId: 'WINT-5010',
  phase: 'qa',
  decisionType: 'qa_gate',
}

const validAnswers: InterviewAnswers = {
  rationale: 'All tests pass and coverage meets threshold',
  confidence: 0.9,
  alternativesConsidered: 'Defer to next sprint',
  riskAssessment: 'Low risk — well-tested feature',
}

const mockHitlRow = {
  decisionType: 'qa_gate',
  decisionText: 'approved',
  context: { agentPhase: 'qa_validation' },
}

// ============================================================================
// Mock DB factories
// ============================================================================

function createMockDbWithHitlRows(rows: typeof mockHitlRow[]): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(rows),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'test-uuid-1234',
              dataType: 'qa_gate_decision',
              storyId: 'WINT-5010',
            },
          ]),
      }),
    }),
  } as any
}

function createMockDbEmpty(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'test-uuid-empty',
              dataType: 'qa_gate_decision',
              storyId: 'WINT-5010',
            },
          ]),
      }),
    }),
  } as any
}

function createMockDbThrows(): DrizzleDb {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.reject(new Error('DB connection failed')),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.reject(new Error('DB insert failed')),
      }),
    }),
  } as any
}

// ============================================================================
// Tests: readHitlContext
// ============================================================================

describe('readHitlContext', () => {
  it('HP-1: returns decision context from existing rows', async () => {
    const mockDb = createMockDbWithHitlRows([mockHitlRow])
    const result = await readHitlContext('WINT-5010', mockDb)

    expect(result.decisionContext).toBe('qa_gate: approved')
    expect(result.agentPhase).toBe('qa_validation')
  })

  it('HP-2: returns default context when no rows exist', async () => {
    const mockDb = createMockDbEmpty()
    const result = await readHitlContext('WINT-5010', mockDb)

    expect(result.decisionContext).toBe('no prior decisions')
    expect(result.agentPhase).toBe('unknown')
  })

  it('EC-1: returns fallback context when DB throws', async () => {
    const mockDb = createMockDbThrows()
    const result = await readHitlContext('WINT-5010', mockDb)

    expect(result.decisionContext).toBe('context unavailable')
    expect(result.agentPhase).toBe('unknown')
  })

  it('HP-3: uses unknown agentPhase when context field missing', async () => {
    const rowWithoutContext = { ...mockHitlRow, context: null }
    const mockDb = createMockDbWithHitlRows([rowWithoutContext])
    const result = await readHitlContext('WINT-5010', mockDb)

    expect(result.agentPhase).toBe('unknown')
  })
})

// ============================================================================
// Tests: computeStoryComplexityScore
// ============================================================================

describe('computeStoryComplexityScore', () => {
  it('HP-1: returns 0 when no decisions exist', async () => {
    const mockDb = createMockDbEmpty()
    const score = await computeStoryComplexityScore('WINT-5010', mockDb)
    expect(score).toBe(0)
  })

  it('HP-2: returns 0.1 for 1 decision (heuristic: count/10)', async () => {
    const mockDb = createMockDbWithHitlRows([mockHitlRow])
    const score = await computeStoryComplexityScore('WINT-5010', mockDb)
    expect(score).toBeCloseTo(0.1)
  })

  it('EC-1: returns 0 when DB throws', async () => {
    const mockDb = createMockDbThrows()
    const score = await computeStoryComplexityScore('WINT-5010', mockDb)
    expect(score).toBe(0)
  })
})

// ============================================================================
// Tests: buildFeatureVector
// ============================================================================

describe('buildFeatureVector', () => {
  it('HP-1: builds correct feature vector with all fields', () => {
    const vector = buildFeatureVector(validParams, 'qa_gate_decision', 0.3, 'qa', 'approved')

    expect(vector.storyId).toBe('WINT-5010')
    expect(vector.phase).toBe('qa')
    expect(vector.decisionType).toBe('qa_gate_decision')
    expect(vector.storyComplexityScore).toBe(0.3)
    expect(vector.agentPhase).toBe('qa')
    expect(vector.decisionContext).toBe('approved')
  })
})

// ============================================================================
// Tests: captureInterview
// ============================================================================

describe('captureInterview', () => {
  it('HP-1: captures interview and returns training data record', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'training-uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = {
      db: createMockDbEmpty(),
      ingestFn: mockIngestFn,
    }

    const result = await captureInterview(validParams, validAnswers, deps)

    expect(result).not.toBeNull()
    expect(result!.id).toBe('training-uuid')
    expect(result!.dataType).toBe('qa_gate_decision')
    expect(mockIngestFn).toHaveBeenCalledOnce()
  })

  it('HP-2: maps qa_gate to qa_gate_decision data type', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = {
      db: createMockDbEmpty(),
      ingestFn: mockIngestFn,
    }

    await captureInterview(validParams, validAnswers, deps)

    expect(mockIngestFn).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'qa_gate_decision' }),
    )
  })

  it('HP-3: maps code_review to code_review_decision data type', async () => {
    const codeReviewParams: HitlInterviewParams = {
      ...validParams,
      decisionType: 'code_review',
    }
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'code_review_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = {
      db: createMockDbEmpty(),
      ingestFn: mockIngestFn,
    }

    await captureInterview(codeReviewParams, validAnswers, deps)

    expect(mockIngestFn).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'code_review_decision' }),
    )
  })

  it('HP-4: maps story_approval to story_approval_decision data type', async () => {
    const approvalParams: HitlInterviewParams = {
      ...validParams,
      decisionType: 'story_approval',
    }
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'story_approval_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = {
      db: createMockDbEmpty(),
      ingestFn: mockIngestFn,
    }

    await captureInterview(approvalParams, validAnswers, deps)

    expect(mockIngestFn).toHaveBeenCalledWith(
      expect.objectContaining({ dataType: 'story_approval_decision' }),
    )
  })

  it('HP-5: includes all answer fields in labels', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = {
      db: createMockDbEmpty(),
      ingestFn: mockIngestFn,
    }

    await captureInterview(validParams, validAnswers, deps)

    expect(mockIngestFn).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.objectContaining({
          rationale: validAnswers.rationale,
          confidence: validAnswers.confidence,
          alternativesConsidered: validAnswers.alternativesConsidered,
          riskAssessment: validAnswers.riskAssessment,
        }),
      }),
    )
  })

  it('EC-1: returns null when answers fail validation', async () => {
    const invalidAnswers = {
      rationale: '', // empty string — min(1) fails
      confidence: 0.5,
      alternativesConsidered: 'some',
      riskAssessment: 'low',
    } as InterviewAnswers

    const mockIngestFn = vi.fn()
    const deps: CaptureInterviewDeps = {
      db: createMockDbEmpty(),
      ingestFn: mockIngestFn,
    }

    const result = await captureInterview(validParams, invalidAnswers, deps)

    expect(result).toBeNull()
    expect(mockIngestFn).not.toHaveBeenCalled()
  })

  it('EC-2: returns null when ingestFn returns null', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue(null)
    const deps: CaptureInterviewDeps = {
      db: createMockDbEmpty(),
      ingestFn: mockIngestFn,
    }

    const result = await captureInterview(validParams, validAnswers, deps)
    expect(result).toBeNull()
  })

  it('HP-6: enriches with hitl context from DB', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = {
      db: createMockDbWithHitlRows([mockHitlRow]),
      ingestFn: mockIngestFn,
    }

    await captureInterview(validParams, validAnswers, deps)

    expect(mockIngestFn).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.objectContaining({
          agentPhase: 'qa_validation',
          decisionContext: 'qa_gate: approved',
        }),
      }),
    )
  })
})
