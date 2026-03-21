/**
 * Integration Tests for HiTL Interview Sidecar
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-10: Verifies trainingDataIngest call shape
 * Tests that the full captureInterview → ingestFn pipeline produces
 * the correct data shape expected by workflow.training_data
 */

import { describe, it, expect, vi } from 'vitest'
import { captureInterview } from '../capture-interview.js'
import type { CaptureInterviewDeps } from '../capture-interview.js'
import type { HitlInterviewParams, InterviewAnswers } from '../__types__/index.js'

// ============================================================================
// Fixtures
// ============================================================================

const qaGateParams: HitlInterviewParams = {
  storyId: 'WINT-5010',
  phase: 'qa_validation',
  decisionType: 'qa_gate',
}

const codeReviewParams: HitlInterviewParams = {
  storyId: 'WINT-5010',
  phase: 'code_review',
  decisionType: 'code_review',
}

const storyApprovalParams: HitlInterviewParams = {
  storyId: 'WINT-5010',
  phase: 'approval',
  decisionType: 'story_approval',
}

const validAnswers: InterviewAnswers = {
  rationale: 'Thorough testing confirms feature correctness',
  confidence: 0.92,
  alternativesConsidered: 'Request additional test cases',
  riskAssessment: 'Minimal risk — isolated change with full coverage',
}

function createMockDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
  } as any
}

// ============================================================================
// AC-10: Verify trainingDataIngest call shape
// ============================================================================

describe('integration: trainingDataIngest call shape (AC-10)', () => {
  it('AC-10.1: qa_gate — ingestFn called with qa_gate_decision dataType', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'integration-uuid-qa',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = { db: createMockDb(), ingestFn: mockIngestFn }
    await captureInterview(qaGateParams, validAnswers, deps)

    expect(mockIngestFn).toHaveBeenCalledOnce()

    const callArg = mockIngestFn.mock.calls[0][0]
    expect(callArg.dataType).toBe('qa_gate_decision')
    expect(callArg.storyId).toBe('WINT-5010')
    expect(typeof callArg.features).toBe('object')
    expect(typeof callArg.labels).toBe('object')
  })

  it('AC-10.2: code_review — ingestFn called with code_review_decision dataType', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'integration-uuid-cr',
      dataType: 'code_review_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = { db: createMockDb(), ingestFn: mockIngestFn }
    await captureInterview(codeReviewParams, validAnswers, deps)

    const callArg = mockIngestFn.mock.calls[0][0]
    expect(callArg.dataType).toBe('code_review_decision')
  })

  it('AC-10.3: story_approval — ingestFn called with story_approval_decision dataType', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'integration-uuid-sa',
      dataType: 'story_approval_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = { db: createMockDb(), ingestFn: mockIngestFn }
    await captureInterview(storyApprovalParams, validAnswers, deps)

    const callArg = mockIngestFn.mock.calls[0][0]
    expect(callArg.dataType).toBe('story_approval_decision')
  })

  it('AC-10.4: features object contains all required FeatureVector fields', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = { db: createMockDb(), ingestFn: mockIngestFn }
    await captureInterview(qaGateParams, validAnswers, deps)

    const features = mockIngestFn.mock.calls[0][0].features
    expect(features).toHaveProperty('storyId', 'WINT-5010')
    expect(features).toHaveProperty('phase', 'qa_validation')
    expect(features).toHaveProperty('decisionType', 'qa_gate_decision')
    expect(features).toHaveProperty('storyComplexityScore')
    expect(features).toHaveProperty('agentPhase')
    expect(features).toHaveProperty('decisionContext')
    expect(typeof features.storyComplexityScore).toBe('number')
  })

  it('AC-10.5: labels object contains all required InterviewAnswers fields', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = { db: createMockDb(), ingestFn: mockIngestFn }
    await captureInterview(qaGateParams, validAnswers, deps)

    const labels = mockIngestFn.mock.calls[0][0].labels
    expect(labels).toHaveProperty('rationale', validAnswers.rationale)
    expect(labels).toHaveProperty('confidence', validAnswers.confidence)
    expect(labels).toHaveProperty('alternativesConsidered', validAnswers.alternativesConsidered)
    expect(labels).toHaveProperty('riskAssessment', validAnswers.riskAssessment)
  })

  it('AC-10.6: storyId passed correctly to ingestFn', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const deps: CaptureInterviewDeps = { db: createMockDb(), ingestFn: mockIngestFn }
    await captureInterview(qaGateParams, validAnswers, deps)

    expect(mockIngestFn.mock.calls[0][0].storyId).toBe('WINT-5010')
  })

  it('AC-10.7: confidence value in range [0,1] is preserved in labels', async () => {
    const mockIngestFn = vi.fn().mockResolvedValue({
      id: 'uuid',
      dataType: 'qa_gate_decision',
      storyId: 'WINT-5010',
    })

    const highConfidenceAnswers: InterviewAnswers = { ...validAnswers, confidence: 1.0 }
    const deps: CaptureInterviewDeps = { db: createMockDb(), ingestFn: mockIngestFn }
    await captureInterview(qaGateParams, highConfidenceAnswers, deps)

    expect(mockIngestFn.mock.calls[0][0].labels.confidence).toBe(1.0)
  })
})
