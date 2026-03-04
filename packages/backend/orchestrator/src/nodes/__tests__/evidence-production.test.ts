/**
 * Evidence Production Node Tests
 *
 * Unit tests for:
 * - EvidenceSchema-conformant YAML output with empty completedChanges
 * - Mocked yaml-artifact-writer receives correct EVIDENCE.yaml path
 * - Partial state (some completedChanges) produces valid evidence
 * - evidence_written event logged with correct fields
 * - Write failure produces warning and evidenceWritten = false
 *
 * APIP-1031 AC-9
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ImplementationGraphState } from '../../graphs/implementation.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock fs/promises to intercept atomic write operations
const mockMkdir = vi.fn().mockResolvedValue(undefined)
const mockWriteFile = vi.fn().mockResolvedValue(undefined)
const mockRename = vi.fn().mockResolvedValue(undefined)
const mockUnlink = vi.fn().mockResolvedValue(undefined)

vi.mock('fs/promises', () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  rename: (...args: unknown[]) => mockRename(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
}))

// ============================================================================
// Helpers
// ============================================================================

function createTestState(overrides: Partial<ImplementationGraphState> = {}): ImplementationGraphState {
  return {
    storyId: 'APIP-1031',
    attemptNumber: 1,
    featureDir: '/repo/plans/future/platform/autonomous-pipeline',
    startedAt: new Date().toISOString(),
    storyContent: '# APIP-1031',
    changeSpecs: [],
    loadError: null,
    storyLoaded: true,
    worktreePath: '/repo/worktrees/APIP-1031',
    worktreeCreated: true,
    currentChangeIndex: 0,
    completedChanges: [],
    changeLoopComplete: false,
    evidencePath: null,
    evidenceWritten: false,
    workflowComplete: false,
    workflowSuccess: false,
    aborted: false,
    abortReason: null,
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('evidenceProductionNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockRename.mockResolvedValue(undefined)
  })

  it('HP-1: writes EVIDENCE.yaml at correct path (empty completedChanges)', async () => {
    const { evidenceProductionNode } = await import('../../nodes/evidence-production.js')
    const state = createTestState()

    const result = await evidenceProductionNode(state)

    expect(result.evidenceWritten).toBe(true)
    expect(result.evidencePath).toContain('APIP-1031')
    expect(result.evidencePath).toContain('EVIDENCE.yaml')
    expect(result.evidencePath).toContain('_implementation')
  })

  it('HP-2: writes file at plans/.../in-progress/APIP-1031/_implementation/EVIDENCE.yaml', async () => {
    const { evidenceProductionNode } = await import('../../nodes/evidence-production.js')
    const state = createTestState()

    const result = await evidenceProductionNode(state)

    // Verify writeFile was called with a path matching our expected pattern
    const writeCallArgs = mockWriteFile.mock.calls[0]
    const writtenPath = writeCallArgs?.[0] as string
    expect(writtenPath).toContain('in-progress')
    expect(writtenPath).toContain('APIP-1031')
    expect(writtenPath).toContain('_implementation')
  })

  it('HP-3: evidence YAML content is EvidenceSchema-conformant with empty completedChanges', async () => {
    const { evidenceProductionNode } = await import('../../nodes/evidence-production.js')
    const { EvidenceSchema } = await import('../../artifacts/evidence.js')
    const yaml = await import('yaml')

    // Capture written YAML content
    let capturedContent = ''
    mockWriteFile.mockImplementationOnce((_path: string, content: string) => {
      capturedContent = content
      return Promise.resolve()
    })

    const state = createTestState()
    await evidenceProductionNode(state)

    // Parse and validate the written YAML
    const parsed = yaml.parse(capturedContent)
    expect(() => EvidenceSchema.parse(parsed)).not.toThrow()

    const evidence = EvidenceSchema.parse(parsed)
    expect(evidence.story_id).toBe('APIP-1031')
    expect(evidence.schema).toBe(2)
    expect(evidence.touched_files).toEqual([])
    expect(evidence.commands_run).toHaveLength(1) // The implementation attempt record
  })

  it('HP-4: adds touched files from completedChanges to evidence', async () => {
    const { evidenceProductionNode } = await import('../../nodes/evidence-production.js')
    const { EvidenceSchema } = await import('../../artifacts/evidence.js')
    const yaml = await import('yaml')

    let capturedContent = ''
    mockWriteFile.mockImplementationOnce((_path: string, content: string) => {
      capturedContent = content
      return Promise.resolve()
    })

    const state = createTestState({
      completedChanges: [
        {
          changeSpecId: 'CS-001',
          commitSha: 'abc123',
          commitMessage: 'feat: implement load-story',
          touchedFiles: [
            'packages/backend/orchestrator/src/nodes/load-story.ts',
            'packages/backend/orchestrator/src/nodes/__tests__/load-story.test.ts',
          ],
          committedAt: new Date().toISOString(),
          durationMs: 2000,
        },
      ],
    })

    await evidenceProductionNode(state)

    const evidence = EvidenceSchema.parse(yaml.parse(capturedContent))
    expect(evidence.touched_files).toHaveLength(2)
    expect(evidence.touched_files[0]?.path).toContain('load-story.ts')
  })

  it('HP-5: handles empty completedChanges gracefully', async () => {
    const { evidenceProductionNode } = await import('../../nodes/evidence-production.js')
    const state = createTestState({ completedChanges: [] })

    const result = await evidenceProductionNode(state)

    expect(result.evidenceWritten).toBe(true)
    expect(result.evidencePath).toBeDefined()
  })

  it('HP-6: sets evidenceWritten = false and emits warning on write failure', async () => {
    const { evidenceProductionNode } = await import('../../nodes/evidence-production.js')

    mockWriteFile.mockRejectedValueOnce(new Error('ENOSPC: no space left on device'))

    const state = createTestState()
    const result = await evidenceProductionNode(state)

    expect(result.evidenceWritten).toBe(false)
    expect(result.evidencePath).toBeNull()
    expect(result.warnings?.[0]).toContain('Failed to write EVIDENCE.yaml')
  })

  it('HP-7: logs evidence_written event with storyId, attemptNumber, durationMs', async () => {
    const { logger } = await import('@repo/logger')
    const { evidenceProductionNode } = await import('../../nodes/evidence-production.js')

    const state = createTestState()
    await evidenceProductionNode(state)

    const infoMock = vi.mocked(logger.info)
    const call = infoMock.mock.calls.find(c => c[0] === 'evidence_written')

    expect(call).toBeDefined()
    const logData = call?.[1] as Record<string, unknown>
    expect(logData?.storyId).toBe('APIP-1031')
    expect(logData?.attemptNumber).toBe(1)
    expect(typeof logData?.durationMs).toBe('number')
  })
})
