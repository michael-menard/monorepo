/**
 * Load Story Node Tests
 *
 * Unit tests for:
 * - Missing story file → typed LoadError (STORY_NOT_FOUND)
 * - Missing ChangeSpec plan → typed LoadError (CHANGE_SPEC_NOT_FOUND)
 * - Happy path: story content + changeSpecs loaded into state
 * - Parse error → typed LoadError (STORY_PARSE_ERROR)
 *
 * APIP-1031 AC-4
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as yaml from 'yaml'
import type { ImplementationGraphState } from '../../graphs/implementation.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---- Mock fs/promises ----
const mockReadFile = vi.fn()
vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
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
    storyContent: null,
    changeSpecs: [],
    loadError: null,
    storyLoaded: false,
    worktreePath: null,
    worktreeCreated: false,
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

/**
 * Create a valid ChangeSpecCollection YAML string.
 * Uses the real ChangeSpecCollectionSchema format (schema: 1, discriminated union).
 */
function makeChangeSpecCollectionYaml(storyId: string, changes: unknown[]): string {
  return yaml.stringify({
    schema: 1,
    story_id: storyId,
    generated_at: new Date().toISOString(),
    changes,
  })
}

/**
 * Create a minimal valid file_change ChangeSpec object.
 */
function makeFileChangeSpec(id: string, filePath: string): unknown {
  return {
    schema: 1,
    story_id: 'APIP-1031',
    id,
    description: `Create ${filePath}`,
    ac_ids: ['AC-1'],
    rationale: 'Required for implementation',
    change_type: 'file_change',
    file_path: filePath,
    file_action: 'create',
    complexity: 'medium',
    test_strategy: 'unit',
    test_hints: [],
    dependencies: [],
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('loadStoryNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadFile.mockReset()
  })

  it('HP-1: returns STORY_NOT_FOUND LoadError when all candidate paths missing', async () => {
    // All readFile calls return ENOENT
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

    const { loadStoryNode } = await import('../../nodes/load-story.js')
    const state = createTestState()

    const result = await loadStoryNode(state)

    expect(result.storyLoaded).toBe(false)
    expect(result.loadError).toBeDefined()
    expect(result.loadError?.code).toBe('STORY_NOT_FOUND')
    expect(result.storyContent).toBeUndefined()
  })

  it('HP-2: returns CHANGE_SPEC_NOT_FOUND LoadError when story found but ChangeSpec missing', async () => {
    let callCount = 0
    mockReadFile.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve('# APIP-1031 Story Content')
      }
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    })

    const { loadStoryNode } = await import('../../nodes/load-story.js')
    const state = createTestState()

    const result = await loadStoryNode(state)

    expect(result.storyLoaded).toBe(false)
    expect(result.loadError).toBeDefined()
    expect(result.loadError?.code).toBe('CHANGE_SPEC_NOT_FOUND')
  })

  it('HP-3: happy path — loads story content and changeSpecs into state', async () => {
    const storyContent = '# APIP-1031 Story\n\nImplement the implementation graph.'
    const changeSpecYaml = makeChangeSpecCollectionYaml('APIP-1031', [
      makeFileChangeSpec('CS-001', 'packages/backend/orchestrator/src/graphs/implementation.ts'),
    ])

    let callCount = 0
    mockReadFile.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve(storyContent)
      }
      return Promise.resolve(changeSpecYaml)
    })

    const { loadStoryNode } = await import('../../nodes/load-story.js')
    const state = createTestState()

    const result = await loadStoryNode(state)

    expect(result.storyLoaded).toBe(true)
    expect(result.loadError).toBeNull()
    expect(result.storyContent).toBe(storyContent)
    expect(result.changeSpecs).toHaveLength(1)
    expect(result.changeSpecs?.[0]?.id).toBe('CS-001')
  })

  it('HP-4: returns STORY_PARSE_ERROR when ChangeSpec collection is invalid', async () => {
    let callCount = 0
    mockReadFile.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve('# Story content')
      }
      // Valid YAML but missing required ChangeSpecCollection fields
      return Promise.resolve(yaml.stringify({ schema: 1, changes: [] }))
    })

    const { loadStoryNode } = await import('../../nodes/load-story.js')
    const state = createTestState()

    const result = await loadStoryNode(state)

    // story_id is required, so schema 1 without story_id should fail Zod parse
    expect(result.storyLoaded).toBe(false)
    expect(result.loadError).toBeDefined()
    expect(result.loadError?.code).toBe('STORY_PARSE_ERROR')
  })

  it('HP-5: logs story_loaded event on success with storyId, attemptNumber, durationMs', async () => {
    const { logger } = await import('@repo/logger')
    const changeSpecYaml = makeChangeSpecCollectionYaml('APIP-1031', [
      makeFileChangeSpec('CS-001', 'src/test.ts'),
    ])

    let callCount = 0
    mockReadFile.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve('# Story content')
      }
      return Promise.resolve(changeSpecYaml)
    })

    const { loadStoryNode } = await import('../../nodes/load-story.js')
    const state = createTestState()

    await loadStoryNode(state)

    const infoMock = vi.mocked(logger.info)
    const storyLoadedCall = infoMock.mock.calls.find(call => call[0] === 'story_loaded')

    expect(storyLoadedCall).toBeDefined()
    const logData = storyLoadedCall?.[1] as Record<string, unknown>
    expect(logData?.storyId).toBe('APIP-1031')
    expect(logData?.attemptNumber).toBe(1)
    expect(typeof logData?.durationMs).toBe('number')
  })
})
