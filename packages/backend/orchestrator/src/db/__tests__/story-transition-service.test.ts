import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @repo/logger before any imports (pre-existing env issue in this package)
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  StoryTransitionService,
  ArtifactGateError,
  ARTIFACT_GATES,
  createStoryTransitionService,
} from '../story-transition-service.js'
import type { StoryRepository } from '../story-repository.js'
import type { WorkflowRepository } from '../workflow-repository.js'
import type { StoryState } from '../../state/enums/story-state.js'

// ============================================================================
// Mock helpers
// ============================================================================

function createMockStoryRepo(): StoryRepository {
  return {
    updateStoryState: vi.fn().mockResolvedValue(undefined),
    getStory: vi.fn().mockResolvedValue(null),
    createStory: vi.fn().mockResolvedValue(null),
    getWorkableStories: vi.fn().mockResolvedValue([]),
    getStoriesByState: vi.fn().mockResolvedValue([]),
    getStoriesByFeature: vi.fn().mockResolvedValue([]),
    setBlockedBy: vi.fn().mockResolvedValue(undefined),
    getNextAction: vi.fn().mockResolvedValue(''),
  } as unknown as StoryRepository
}

function createMockWorkflowRepo(options?: {
  hasProof?: boolean
  hasVerification?: boolean
}): WorkflowRepository {
  const hasProof = options?.hasProof ?? false
  const hasVerification = options?.hasVerification ?? false

  return {
    getLatestProof: vi.fn().mockResolvedValue(hasProof ? { id: 'proof-1' } : null),
    getLatestVerification: vi.fn().mockResolvedValue(hasVerification ? { id: 'verify-1' } : null),
    getLatestElaboration: vi.fn().mockResolvedValue(null),
    getLatestPlan: vi.fn().mockResolvedValue(null),
    saveElaboration: vi.fn().mockResolvedValue(null),
    savePlan: vi.fn().mockResolvedValue(null),
    saveVerification: vi.fn().mockResolvedValue(null),
    saveProof: vi.fn().mockResolvedValue(null),
    logTokenUsage: vi.fn().mockResolvedValue(null),
    getTokenUsageSummary: vi.fn().mockResolvedValue([]),
    getTotalTokenUsage: vi.fn().mockResolvedValue(0),
  } as unknown as WorkflowRepository
}

// ============================================================================
// ARTIFACT_GATES map tests
// ============================================================================

describe('ARTIFACT_GATES', () => {
  it('should gate needs_code_review on proof artifact', () => {
    expect(ARTIFACT_GATES.needs_code_review).toEqual({
      type: 'proof',
      label: 'Dev proof (evidence)',
    })
  })

  it('should gate ready_for_qa on review artifact', () => {
    expect(ARTIFACT_GATES.ready_for_qa).toEqual({
      type: 'review',
      label: 'Code review',
    })
  })

  it('should gate in_qa on review artifact', () => {
    expect(ARTIFACT_GATES.in_qa).toEqual({
      type: 'review',
      label: 'Code review',
    })
  })

  it('should gate completed on qa_verify artifact', () => {
    expect(ARTIFACT_GATES.completed).toEqual({
      type: 'qa_verify',
      label: 'QA verification',
    })
  })

  it('should not gate recovery states', () => {
    expect(ARTIFACT_GATES.failed_code_review).toBeUndefined()
    expect(ARTIFACT_GATES.failed_qa).toBeUndefined()
    expect(ARTIFACT_GATES.blocked).toBeUndefined()
    expect(ARTIFACT_GATES.cancelled).toBeUndefined()
  })

  it('should not gate claim-only states', () => {
    expect(ARTIFACT_GATES.in_progress).toBeUndefined()
    expect(ARTIFACT_GATES.ready).toBeUndefined()
    expect(ARTIFACT_GATES.backlog).toBeUndefined()
    expect(ARTIFACT_GATES.created).toBeUndefined()
    expect(ARTIFACT_GATES.elab).toBeUndefined()
  })
})

// ============================================================================
// StoryTransitionService.claim() tests
// ============================================================================

describe('StoryTransitionService.claim()', () => {
  let storyRepo: StoryRepository
  let service: StoryTransitionService

  beforeEach(() => {
    storyRepo = createMockStoryRepo()
    service = new StoryTransitionService(storyRepo)
  })

  it('should call storyRepo.updateStoryState with no artifact check', async () => {
    await service.claim('WISH-001', 'in_progress', 'dev-agent', 'Starting work')

    expect(storyRepo.updateStoryState).toHaveBeenCalledWith(
      'WISH-001',
      'in_progress',
      'dev-agent',
      'Starting work',
    )
  })

  it('should not enforce artifact gate even for gated states', async () => {
    // claim() is unconditional — no artifact gate should fire
    await expect(service.claim('WISH-001', 'needs_code_review', 'dev-agent')).resolves.toBeUndefined()
    expect(storyRepo.updateStoryState).toHaveBeenCalledOnce()
  })

  it('should work without optional workflowRepo', async () => {
    const serviceNoWorkflow = new StoryTransitionService(storyRepo)
    await expect(serviceNoWorkflow.claim('WISH-001', 'ready', 'agent')).resolves.toBeUndefined()
  })
})

// ============================================================================
// StoryTransitionService.advance() — artifact present
// ============================================================================

describe('StoryTransitionService.advance() — artifact present', () => {
  let storyRepo: StoryRepository
  let workflowRepo: WorkflowRepository

  beforeEach(() => {
    storyRepo = createMockStoryRepo()
    workflowRepo = createMockWorkflowRepo({ hasProof: true, hasVerification: true })
  })

  it('should advance to needs_code_review when proof exists', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepo)
    await service.advance('WISH-001', 'needs_code_review', 'dev-agent')

    expect(workflowRepo.getLatestProof).toHaveBeenCalledWith('WISH-001')
    expect(storyRepo.updateStoryState).toHaveBeenCalledWith(
      'WISH-001',
      'needs_code_review',
      'dev-agent',
      undefined,
    )
  })

  it('should advance to ready_for_qa when review exists', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepo)
    await service.advance('WISH-001', 'ready_for_qa', 'review-agent')

    expect(workflowRepo.getLatestVerification).toHaveBeenCalledWith('WISH-001', 'review')
    expect(storyRepo.updateStoryState).toHaveBeenCalledWith(
      'WISH-001',
      'ready_for_qa',
      'review-agent',
      undefined,
    )
  })

  it('should advance to in_qa when review exists', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepo)
    await service.advance('WISH-001', 'in_qa', 'qa-agent')

    expect(workflowRepo.getLatestVerification).toHaveBeenCalledWith('WISH-001', 'review')
    expect(storyRepo.updateStoryState).toHaveBeenCalledWith(
      'WISH-001',
      'in_qa',
      'qa-agent',
      undefined,
    )
  })

  it('should advance to completed when qa_verify exists', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepo)
    await service.advance('WISH-001', 'completed', 'qa-agent', 'All checks passed')

    expect(workflowRepo.getLatestVerification).toHaveBeenCalledWith('WISH-001', 'qa_verify')
    expect(storyRepo.updateStoryState).toHaveBeenCalledWith(
      'WISH-001',
      'completed',
      'qa-agent',
      'All checks passed',
    )
  })

  it('should advance to ungated state without checking artifacts', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepo)
    await service.advance('WISH-001', 'in_progress', 'dev-agent')

    expect(workflowRepo.getLatestProof).not.toHaveBeenCalled()
    expect(workflowRepo.getLatestVerification).not.toHaveBeenCalled()
    expect(storyRepo.updateStoryState).toHaveBeenCalledWith(
      'WISH-001',
      'in_progress',
      'dev-agent',
      undefined,
    )
  })
})

// ============================================================================
// StoryTransitionService.advance() — artifact missing → ArtifactGateError
// ============================================================================

describe('StoryTransitionService.advance() — ArtifactGateError', () => {
  let storyRepo: StoryRepository
  let workflowRepoNoProof: WorkflowRepository
  let workflowRepoNoVerification: WorkflowRepository

  beforeEach(() => {
    storyRepo = createMockStoryRepo()
    workflowRepoNoProof = createMockWorkflowRepo({ hasProof: false, hasVerification: false })
    workflowRepoNoVerification = createMockWorkflowRepo({ hasProof: true, hasVerification: false })
  })

  it('should throw ArtifactGateError for needs_code_review when proof missing', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepoNoProof)

    await expect(service.advance('WISH-001', 'needs_code_review', 'dev-agent')).rejects.toThrow(
      ArtifactGateError,
    )
  })

  it('should include storyId, toState, missingArtifact in error', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepoNoProof)

    let caught: ArtifactGateError | null = null
    try {
      await service.advance('WISH-001', 'needs_code_review', 'dev-agent')
    } catch (e) {
      caught = e as ArtifactGateError
    }

    expect(caught).not.toBeNull()
    expect(caught?.storyId).toBe('WISH-001')
    expect(caught?.toState).toBe('needs_code_review')
    expect(caught?.missingArtifact).toBe('Dev proof (evidence)')
    expect(caught?.name).toBe('ArtifactGateError')
  })

  it('should throw ArtifactGateError for ready_for_qa when review missing', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepoNoProof)

    await expect(service.advance('WISH-001', 'ready_for_qa', 'reviewer')).rejects.toThrow(
      ArtifactGateError,
    )
  })

  it('should throw ArtifactGateError for in_qa when review missing', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepoNoProof)

    await expect(service.advance('WISH-001', 'in_qa', 'qa-agent')).rejects.toThrow(ArtifactGateError)
  })

  it('should throw ArtifactGateError for completed when qa_verify missing', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepoNoVerification)

    await expect(service.advance('WISH-001', 'completed', 'qa-agent')).rejects.toThrow(
      ArtifactGateError,
    )
  })

  it('should not call updateStoryState when artifact gate fails', async () => {
    const service = new StoryTransitionService(storyRepo, workflowRepoNoProof)

    await expect(service.advance('WISH-001', 'needs_code_review', 'dev-agent')).rejects.toThrow()
    expect(storyRepo.updateStoryState).not.toHaveBeenCalled()
  })
})

// ============================================================================
// StoryTransitionService.advance() — graceful degradation (no workflowRepo)
// ============================================================================

describe('StoryTransitionService.advance() — graceful degradation', () => {
  it('should skip artifact gate when workflowRepo not injected', async () => {
    const storyRepo = createMockStoryRepo()
    const service = new StoryTransitionService(storyRepo) // no workflowRepo

    // Should NOT throw even for a gated state
    await expect(
      service.advance('WISH-001', 'needs_code_review', 'dev-agent'),
    ).resolves.toBeUndefined()

    expect(storyRepo.updateStoryState).toHaveBeenCalledWith(
      'WISH-001',
      'needs_code_review',
      'dev-agent',
      undefined,
    )
  })
})

// ============================================================================
// Factory function
// ============================================================================

describe('createStoryTransitionService', () => {
  it('should create a StoryTransitionService instance', () => {
    const storyRepo = createMockStoryRepo()
    const service = createStoryTransitionService(storyRepo)

    expect(service).toBeInstanceOf(StoryTransitionService)
  })

  it('should create with optional workflowRepo', () => {
    const storyRepo = createMockStoryRepo()
    const workflowRepo = createMockWorkflowRepo()
    const service = createStoryTransitionService(storyRepo, workflowRepo)

    expect(service).toBeInstanceOf(StoryTransitionService)
  })
})
