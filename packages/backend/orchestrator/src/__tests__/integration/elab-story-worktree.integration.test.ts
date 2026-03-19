/**
 * Integration tests for elab-story worktree lifecycle (PIPE-3020)
 *
 * Uses real git subprocess against an isolated temp repo.
 * Mocks @repo/mcp-tools KB operations (no database required).
 *
 * TempGitRepo fixture creates an isolated git repo in os.tmpdir().
 * NEVER touches the real monorepo.
 *
 * All tests use 180_000ms timeout (ARCH-002 mitigation for potential CI hangs).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs/promises'

// ============================================================================
// Mock @repo/mcp-tools for all integration tests (no DB required)
// ============================================================================

vi.mock('@repo/mcp-tools', () => ({
  worktreeRegister: vi.fn().mockResolvedValue({
    id: 'integration-uuid-5678',
    storyId: 'ELAB-001',
    worktreePath: '',
    branchName: 'elab/ELAB-001',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  worktreeGetByStory: vi.fn().mockResolvedValue({
    id: 'integration-uuid-5678',
    storyId: 'ELAB-001',
    worktreePath: '',
    branchName: 'elab/ELAB-001',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    mergedAt: null,
    abandonedAt: null,
    metadata: {},
  }),
  worktreeMarkComplete: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { createWorktreeSetupNode, createWorktreeTeardownNode, ElabStoryConfigSchema } from '../../graphs/elab-story.js'

// ============================================================================
// TempGitRepo fixture
// ============================================================================

async function createTempGitRepo(): Promise<{
  repoDir: string
  cleanup: () => Promise<void>
}> {
  const { spawn } = await import('child_process')

  function runGit(
    args: string[],
    cwd: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, { cwd })
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => {
        stdout += d.toString()
      })
      proc.stderr.on('data', (d: Buffer) => {
        stderr += d.toString()
      })
      proc.on('close', code => resolve({ exitCode: code ?? 1, stdout, stderr }))
      proc.on('error', reject)
    })
  }

  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'elab-worktree-test-'))

  // Initialize git repo
  await runGit(['init', '--initial-branch=main'], repoDir).catch(() =>
    runGit(['init'], repoDir),
  )

  // Configure git user for commits
  await runGit(['config', 'user.email', 'test@test.com'], repoDir)
  await runGit(['config', 'user.name', 'Test User'], repoDir)

  // Create initial commit (required before git worktree add)
  const readmeFile = path.join(repoDir, 'README.md')
  await fs.writeFile(readmeFile, '# Elab Test Repo\n', 'utf-8')
  await runGit(['add', '.'], repoDir)
  await runGit(['commit', '-m', 'Initial commit'], repoDir)

  const cleanup = async () => {
    try {
      await fs.rm(repoDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }

  return { repoDir, cleanup }
}

function createTestState(
  storyId: string,
  repoDir: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    storyId,
    config: ElabStoryConfigSchema.parse({ worktreeBaseDir: path.join(repoDir, 'worktrees') }),
    startedAt: new Date().toISOString(),
    threadId: `${storyId}:elab-story:1`,
    currentStory: null,
    previousStory: null,
    worktreePath: null,
    worktreeSetup: false,
    worktreeTornDown: false,
    elaborationResult: null,
    elaborationFailed: false,
    workflowComplete: false,
    workflowSuccess: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

// ============================================================================
// Integration tests: createWorktreeSetupNode with real git
// ============================================================================

describe(
  'createWorktreeSetupNode integration: real git worktree',
  () => {
    let repoDir: string
    let cleanup: () => Promise<void>

    beforeEach(async () => {
      vi.clearAllMocks()
      const fixture = await createTempGitRepo()
      repoDir = fixture.repoDir
      cleanup = fixture.cleanup
    })

    afterEach(async () => {
      await cleanup()
    })

    it(
      'creates a real git worktree on disk',
      async () => {
        const storyId = 'ELAB-001'
        const node = createWorktreeSetupNode({ repoRoot: repoDir })
        const state = createTestState(storyId, repoDir)

        const result = await node(state as any)

        expect(result.worktreeSetup).toBe(true)
        expect(result.worktreePath).toBeTruthy()

        // Verify the worktree directory actually exists on disk
        const worktreePath = result.worktreePath as string
        const stat = await fs.stat(worktreePath).catch(() => null)
        expect(stat).not.toBeNull()
        expect(stat?.isDirectory()).toBe(true)
      },
      180_000,
    )

    it(
      'creates worktree on branch elab/{storyId}',
      async () => {
        const { spawn } = await import('child_process')
        const storyId = 'ELAB-002'
        const node = createWorktreeSetupNode({ repoRoot: repoDir })
        const state = createTestState(storyId, repoDir)

        const result = await node(state as any)
        expect(result.worktreeSetup).toBe(true)

        // Verify branch exists via git branch list
        const branchList = await new Promise<string>((resolve, reject) => {
          const proc = spawn('git', ['branch', '--list', `elab/${storyId}`], { cwd: repoDir })
          let out = ''
          proc.stdout.on('data', (d: Buffer) => {
            out += d.toString()
          })
          proc.on('close', () => resolve(out))
          proc.on('error', reject)
        })
        expect(branchList.trim()).toContain(`elab/${storyId}`)
      },
      180_000,
    )

    it(
      'worktreePath uses path.join(baseDir, storyId)',
      async () => {
        const storyId = 'ELAB-003'
        const node = createWorktreeSetupNode({ repoRoot: repoDir })
        const expectedBase = path.join(repoDir, 'worktrees')
        const state = createTestState(storyId, repoDir)

        const result = await node(state as any)
        expect(result.worktreePath).toBe(path.join(expectedBase, storyId))
      },
      180_000,
    )

    it(
      'returns worktreeSetup: false when branch already exists',
      async () => {
        const storyId = 'ELAB-004'
        const node = createWorktreeSetupNode({ repoRoot: repoDir })
        const state = createTestState(storyId, repoDir)

        // First creation should succeed
        const first = await node(state as any)
        expect(first.worktreeSetup).toBe(true)

        // Recreate node — second creation should fail (branch already exists)
        const node2 = createWorktreeSetupNode({ repoRoot: repoDir })
        const second = await node2(state as any)
        expect(second.worktreeSetup).toBe(false)
        expect(second.errors).toBeDefined()
        expect(second.errors!.length).toBeGreaterThan(0)
      },
      180_000,
    )

    it(
      'calls worktreeRegister after successful creation',
      async () => {
        const { worktreeRegister } = await import('@repo/mcp-tools')
        const storyId = 'ELAB-005'
        const node = createWorktreeSetupNode({ repoRoot: repoDir })
        const state = createTestState(storyId, repoDir)

        await node(state as any)
        expect(worktreeRegister).toHaveBeenCalledWith(
          expect.objectContaining({ storyId, branchName: `elab/${storyId}` }),
        )
      },
      180_000,
    )
  },
)

// ============================================================================
// Integration tests: createWorktreeTeardownNode with real git
// ============================================================================

describe(
  'createWorktreeTeardownNode integration: real git worktree remove',
  () => {
    let repoDir: string
    let cleanup: () => Promise<void>

    beforeEach(async () => {
      vi.clearAllMocks()
      const fixture = await createTempGitRepo()
      repoDir = fixture.repoDir
      cleanup = fixture.cleanup
    })

    afterEach(async () => {
      await cleanup()
    })

    it(
      'removes the worktree from disk',
      async () => {
        const storyId = 'ELAB-101'
        // Setup first
        const setupNode = createWorktreeSetupNode({ repoRoot: repoDir })
        const setupState = createTestState(storyId, repoDir)
        const setupResult = await setupNode(setupState as any)
        expect(setupResult.worktreeSetup).toBe(true)

        const worktreePath = setupResult.worktreePath as string

        // Verify worktree exists
        const statBefore = await fs.stat(worktreePath).catch(() => null)
        expect(statBefore?.isDirectory()).toBe(true)

        // Now tear down
        const teardownNode = createWorktreeTeardownNode({ repoRoot: repoDir })
        const teardownState = createTestState(storyId, repoDir, {
          worktreeSetup: true,
          worktreePath,
        })
        const teardownResult = await teardownNode(teardownState as any)

        expect(teardownResult.worktreeTornDown).toBe(true)

        // Verify worktree directory is gone
        const statAfter = await fs.stat(worktreePath).catch(() => null)
        expect(statAfter).toBeNull()
      },
      180_000,
    )

    it(
      'sets worktreeTornDown: true even when worktree path does not exist on disk (warn-only)',
      async () => {
        const storyId = 'ELAB-102'
        const teardownNode = createWorktreeTeardownNode({ repoRoot: repoDir })
        const state = createTestState(storyId, repoDir, {
          worktreeSetup: true,
          worktreePath: '/nonexistent/path/ELAB-102',
        })
        const result = await teardownNode(state as any)

        expect(result.worktreeTornDown).toBe(true)
        expect(result.warnings).toBeDefined()
        expect(result.warnings!.length).toBeGreaterThan(0)
      },
      180_000,
    )

    it(
      'calls worktreeMarkComplete with abandoned after teardown',
      async () => {
        const { worktreeMarkComplete } = await import('@repo/mcp-tools')
        const storyId = 'ELAB-103'

        // Setup
        const setupNode = createWorktreeSetupNode({ repoRoot: repoDir })
        const setupState = createTestState(storyId, repoDir)
        const setupResult = await setupNode(setupState as any)

        // Teardown
        const teardownNode = createWorktreeTeardownNode({ repoRoot: repoDir })
        const teardownState = createTestState(storyId, repoDir, {
          worktreeSetup: true,
          worktreePath: setupResult.worktreePath,
        })
        await teardownNode(teardownState as any)

        expect(worktreeMarkComplete).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'abandoned' }),
        )
      },
      180_000,
    )

    it(
      'full lifecycle: setup → teardown leaves no worktree on disk',
      async () => {
        const storyId = 'ELAB-104'

        const setupNode = createWorktreeSetupNode({ repoRoot: repoDir })
        const setupState = createTestState(storyId, repoDir)
        const setupResult = await setupNode(setupState as any)
        expect(setupResult.worktreeSetup).toBe(true)
        const worktreePath = setupResult.worktreePath as string

        const teardownNode = createWorktreeTeardownNode({ repoRoot: repoDir })
        const teardownState = createTestState(storyId, repoDir, {
          worktreeSetup: true,
          worktreePath,
        })
        const teardownResult = await teardownNode(teardownState as any)
        expect(teardownResult.worktreeTornDown).toBe(true)

        const stat = await fs.stat(worktreePath).catch(() => null)
        expect(stat).toBeNull()
      },
      180_000,
    )
  },
)
