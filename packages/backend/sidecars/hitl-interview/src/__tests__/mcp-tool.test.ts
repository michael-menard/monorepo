/**
 * Unit Tests for hitlInterview MCP Tool
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-2: hitlInterview exported, params validated
 * AC-10: ≥45% coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hitlInterview } from '../hitl-interview.js'

// ============================================================================
// Mock captureInterview
// ============================================================================

vi.mock('../capture-interview.js', () => ({
  captureInterview: vi.fn(),
  buildFeatureVector: vi.fn(),
  readHitlContext: vi.fn(),
  computeStoryComplexityScore: vi.fn(),
}))

// ============================================================================
// Fixtures
// ============================================================================

const validInput = {
  storyId: 'WINT-5010',
  phase: 'qa',
  decisionType: 'qa_gate' as const,
  answers: {
    rationale: 'All ACs pass',
    confidence: 0.95,
    alternativesConsidered: 'Defer to next sprint',
    riskAssessment: 'Low risk',
  },
}

const mockTrainingDataResult = {
  id: 'test-uuid-1234',
  dataType: 'qa_gate_decision',
  storyId: 'WINT-5010',
}

// ============================================================================
// Tests
// ============================================================================

describe('hitlInterview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HP-1: calls captureInterview with validated params and returns result', async () => {
    const { captureInterview } = await import('../capture-interview.js')
    vi.mocked(captureInterview).mockResolvedValue(mockTrainingDataResult)

    const result = await hitlInterview(validInput)

    expect(result).toEqual(mockTrainingDataResult)
    expect(captureInterview).toHaveBeenCalledOnce()
  })

  it('HP-2: passes correct storyId, phase, decisionType to captureInterview', async () => {
    const { captureInterview } = await import('../capture-interview.js')
    vi.mocked(captureInterview).mockResolvedValue(mockTrainingDataResult)

    await hitlInterview(validInput)

    expect(captureInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        storyId: 'WINT-5010',
        phase: 'qa',
        decisionType: 'qa_gate',
      }),
      expect.objectContaining({
        rationale: 'All ACs pass',
        confidence: 0.95,
      }),
    )
  })

  it('HP-3: works with code_review decision type', async () => {
    const { captureInterview } = await import('../capture-interview.js')
    vi.mocked(captureInterview).mockResolvedValue({
      id: 'uuid',
      dataType: 'code_review_decision',
      storyId: 'WINT-5010',
    })

    const result = await hitlInterview({ ...validInput, decisionType: 'code_review' })
    expect(result?.dataType).toBe('code_review_decision')
  })

  it('HP-4: works with story_approval decision type', async () => {
    const { captureInterview } = await import('../capture-interview.js')
    vi.mocked(captureInterview).mockResolvedValue({
      id: 'uuid',
      dataType: 'story_approval_decision',
      storyId: 'WINT-5010',
    })

    const result = await hitlInterview({ ...validInput, decisionType: 'story_approval' })
    expect(result?.dataType).toBe('story_approval_decision')
  })

  it('EC-1: returns null for invalid decisionType', async () => {
    const result = await hitlInterview({
      ...validInput,
      decisionType: 'invalid_type' as any,
    })
    expect(result).toBeNull()
  })

  it('EC-2: returns null when storyId is empty', async () => {
    const result = await hitlInterview({ ...validInput, storyId: '' })
    expect(result).toBeNull()
  })

  it('EC-3: returns null when confidence is out of range', async () => {
    const result = await hitlInterview({
      ...validInput,
      answers: { ...validInput.answers, confidence: 1.5 },
    })
    expect(result).toBeNull()
  })

  it('EC-4: returns null when captureInterview throws', async () => {
    const { captureInterview } = await import('../capture-interview.js')
    vi.mocked(captureInterview).mockRejectedValue(new Error('DB error'))

    const result = await hitlInterview(validInput)
    expect(result).toBeNull()
  })

  it('EC-5: returns null when rationale is empty string', async () => {
    const result = await hitlInterview({
      ...validInput,
      answers: { ...validInput.answers, rationale: '' },
    })
    expect(result).toBeNull()
  })
})
