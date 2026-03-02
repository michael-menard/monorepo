/**
 * Unit tests for write-merge-artifact node
 * AC-11, AC-15, AC-18
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createWriteMergeArtifactNode } from '../write-merge-artifact.js'
import type { MergeGraphState, MergeGraphConfig } from '../../../graphs/merge.js'
import * as path from 'path'
import * as os from 'os'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock yaml so it doesn't need to be resolved from node_modules
// The mock produces JSON-serializable output so we can verify via mergeArtifact
vi.mock('yaml', () => ({
  stringify: (obj: unknown) => JSON.stringify(obj),
}))

const makeConfig = (): MergeGraphConfig => ({
  worktreeDir: '/tmp/worktree',
  storyBranch: 'story/APIP-1070',
  storyId: 'APIP-1070',
  storyTitle: 'Test Story',
  mainBranch: 'main',
  ciTimeoutMs: 1800000,
  ciPollIntervalMs: 30000,
  ciPollMaxIntervalMs: 300000,
  kbWriteBackEnabled: true,
  nodeTimeoutMs: 60000,
  featureDir: 'plans/future/platform/autonomous-pipeline',
})

const makeState = (overrides: Partial<MergeGraphState> = {}): MergeGraphState => ({
  storyId: 'APIP-1070',
  config: null,
  qaVerify: null,
  prNumber: 42,
  prUrl: 'https://github.com/repo/pull/42',
  mergeCommitSha: 'abc123',
  ciStatus: 'pass',
  ciPollCount: 3,
  ciStartTime: Date.now() - 5000,
  rebaseSuccess: true,
  worktreeCleanedUp: true,
  learningsPersisted: true,
  mergeVerdict: 'MERGE_COMPLETE',
  mergeComplete: false,
  mergeArtifact: null,
  errors: [],
  warnings: [],
  ...overrides,
})

describe('createWriteMergeArtifactNode', () => {
  let tmpDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    // Use a real temp dir for atomic write testing
    const { mkdtemp } = await import('fs/promises')
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'merge-test-'))
  })

  afterEach(async () => {
    // Clean up temp dir
    const { rm } = await import('fs/promises')
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  })

  it('writes MERGE.yaml and sets mergeComplete: true for MERGE_COMPLETE', async () => {
    const node = createWriteMergeArtifactNode(makeConfig(), { outputDir: tmpDir })
    const result = await node(makeState({ mergeVerdict: 'MERGE_COMPLETE' }))

    expect(result.mergeComplete).toBe(true)
    expect(result.mergeArtifact).toBeDefined()

    // Verify the artifact content via the returned mergeArtifact object
    const artifact = result.mergeArtifact!
    expect(artifact.verdict).toBe('MERGE_COMPLETE')
    expect(artifact.story_id).toBe('APIP-1070')
    expect(artifact.pr_number).toBe(42)
    expect(artifact.schema).toBe(1)

    // Verify file was written
    const { readFile } = await import('fs/promises')
    const content = await readFile(path.join(tmpDir, 'MERGE.yaml'), 'utf-8')
    expect(content).toBeTruthy()
  })

  it('writes MERGE.yaml for MERGE_FAIL with error field', async () => {
    const node = createWriteMergeArtifactNode(makeConfig(), { outputDir: tmpDir })
    const result = await node(makeState({
      mergeVerdict: 'MERGE_FAIL',
      errors: ['gh pr merge failed: connection error'],
    }))

    expect(result.mergeComplete).toBe(true)
    expect(result.mergeArtifact!.verdict).toBe('MERGE_FAIL')
    expect(result.mergeArtifact!.error).toBe('gh pr merge failed: connection error')
  })

  it('writes MERGE.yaml for MERGE_BLOCKED with block_reason field', async () => {
    const node = createWriteMergeArtifactNode(makeConfig(), { outputDir: tmpDir })
    const result = await node(makeState({
      mergeVerdict: 'MERGE_BLOCKED',
      errors: ['QA verdict is not PASS: FAIL'],
    }))

    expect(result.mergeComplete).toBe(true)
    expect(result.mergeArtifact!.verdict).toBe('MERGE_BLOCKED')
    expect(result.mergeArtifact!.block_reason).toBe('QA verdict is not PASS: FAIL')
  })

  it('uses atomic write (temp + rename) pattern', async () => {
    // Verify the file ends up at the correct path and no tmp files remain
    const node = createWriteMergeArtifactNode(makeConfig(), { outputDir: tmpDir })
    await node(makeState())

    const { readdir } = await import('fs/promises')
    const files = await readdir(tmpDir)
    // Only MERGE.yaml should remain (no .tmp files)
    expect(files).toContain('MERGE.yaml')
    const tmpFiles = files.filter(f => f.includes('.tmp.'))
    expect(tmpFiles).toHaveLength(0)
  })

  it('handles write error gracefully and sets mergeComplete: false', async () => {
    // Use a path that cannot be created on the filesystem (root-owned parent dir)
    // On macOS/Linux, /nonexistent cannot be created due to ENOENT on the root
    const node = createWriteMergeArtifactNode(makeConfig(), { outputDir: '/nonexistent/path' })
    const result = await node(makeState())

    expect(result.mergeComplete).toBe(false)
    expect(result.errors![0]).toContain('Failed to write MERGE.yaml')
  })
})
