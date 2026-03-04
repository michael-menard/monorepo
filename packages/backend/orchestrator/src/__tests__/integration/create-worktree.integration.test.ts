/**
 * Integration test for create-worktree node using real git subprocess.
 *
 * TempGitRepo fixture creates an isolated git repo in os.tmpdir().
 * NEVER touches the real monorepo.
 *
 * All tests use 180_000ms Vitest timeout (ARCH-002 mitigation for potential CI hangs).
 *
 * APIP-1032 AC-12, AC-13
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs/promises'
import { createCreateWorktreeNode, scheduleWorktreeCleanup, type GitRunner } from '../../nodes/create-worktree.js'

// ============================================================================
// TempGitRepo fixture
// ============================================================================

/**
 * Creates an isolated git repository in os.tmpdir() for integration testing.
 * Cleans up after test completion.
 */
async function createTempGitRepo(): Promise<{
  repoDir: string
  cleanup: () => Promise<void>
}> {
  const { spawn } = await import('child_process')

  function runGit(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, { cwd })
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      proc.on('close', code => resolve({ exitCode: code ?? 1, stdout, stderr }))
      proc.on('error', reject)
    })
  }

  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-repo-'))

  // Initialize git repo
  await runGit(['init', '--initial-branch=main'], repoDir)
    .catch(() => runGit(['init'], repoDir)) // fallback for older git

  // Configure git user for commits
  await runGit(['config', 'user.email', 'test@test.com'], repoDir)
  await runGit(['config', 'user.name', 'Test User'], repoDir)

  // Create an initial commit (required before git worktree add)
  const readmeFile = path.join(repoDir, 'README.md')
  await fs.writeFile(readmeFile, '# Test Repo\n', 'utf-8')
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

// ============================================================================
// Tests: create-worktree node with real git
// ============================================================================

describe(
  'create-worktree integration: real git worktree',
  () => {
    let repoDir: string
    let cleanup: () => Promise<void>

    beforeEach(async () => {
      const fixture = await createTempGitRepo()
      repoDir = fixture.repoDir
      cleanup = fixture.cleanup
    })

    afterEach(async () => {
      await cleanup()
    })

    it(
      'ED-4: creates a real git worktree in the temp repo',
      async () => {
        const storyId = 'TEST-001'
        const node = createCreateWorktreeNode({ repoRoot: repoDir })

        const state = {
          storyId,
          attemptNumber: 1,
          featureDir: 'plans/test',
          startedAt: new Date().toISOString(),
          storyContent: null,
          changeSpecs: [],
          loadError: null,
          storyLoaded: true,
          worktreePath: null,
          worktreeCreated: false,
          currentChangeIndex: 0,
          completedChanges: [],
          changeLoopComplete: false,
          changeLoopStatus: null,
          changeLoopRetryCount: 0,
          evidencePath: null,
          evidenceWritten: false,
          workflowComplete: false,
          workflowSuccess: false,
          aborted: false,
          abortReason: null,
          warnings: [],
          errors: [],
        }

        const result = await node(state as any)

        expect(result.worktreeCreated).toBe(true)
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
      'records worktree path in state',
      async () => {
        const storyId = 'WINT-9999'
        const node = createCreateWorktreeNode({ repoRoot: repoDir })

        const state = {
          storyId,
          attemptNumber: 1,
          featureDir: 'plans/test',
          startedAt: new Date().toISOString(),
          storyContent: null,
          changeSpecs: [],
          loadError: null,
          storyLoaded: true,
          worktreePath: null,
          worktreeCreated: false,
          currentChangeIndex: 0,
          completedChanges: [],
          changeLoopComplete: false,
          changeLoopStatus: null,
          changeLoopRetryCount: 0,
          evidencePath: null,
          evidenceWritten: false,
          workflowComplete: false,
          workflowSuccess: false,
          aborted: false,
          abortReason: null,
          warnings: [],
          errors: [],
        }

        const result = await node(state as any)
        expect(result.worktreePath).toContain(storyId)
      },
      180_000,
    )

    it(
      'returns worktreeCreated: false when branch already exists',
      async () => {
        const storyId = 'DUPLICATE-001'
        const node = createCreateWorktreeNode({ repoRoot: repoDir })
        const state = {
          storyId,
          attemptNumber: 1,
          featureDir: 'plans/test',
          startedAt: new Date().toISOString(),
          storyContent: null,
          changeSpecs: [],
          loadError: null,
          storyLoaded: true,
          worktreePath: null,
          worktreeCreated: false,
          currentChangeIndex: 0,
          completedChanges: [],
          changeLoopComplete: false,
          changeLoopStatus: null,
          changeLoopRetryCount: 0,
          evidencePath: null,
          evidenceWritten: false,
          workflowComplete: false,
          workflowSuccess: false,
          aborted: false,
          abortReason: null,
          warnings: [],
          errors: [],
        }

        // First creation should succeed
        const first = await node(state as any)
        expect(first.worktreeCreated).toBe(true)

        // Second creation of same branch should fail (branch already exists)
        const second = await node(state as any)
        expect(second.worktreeCreated).toBe(false)
      },
      180_000,
    )
  },
)

// ============================================================================
// Tests: scheduleWorktreeCleanup
// ============================================================================

describe(
  'scheduleWorktreeCleanup integration',
  () => {
    it(
      'calls gitRunner with correct worktree remove args',
      async () => {
        const calls: Array<{ args: string[]; cwd: string }> = []
        const mockGitRunner: GitRunner = async (args, opts) => {
          calls.push({ args, cwd: opts.cwd })
          return { exitCode: 0, stdout: '', stderr: '' }
        }

        scheduleWorktreeCleanup('/tmp/worktrees/test', '/repo/root', mockGitRunner, 'TEST-001')

        // Give the void IIFE time to execute
        await new Promise(resolve => setTimeout(resolve, 100))

        expect(calls).toHaveLength(1)
        expect(calls[0].args).toContain('worktree')
        expect(calls[0].args).toContain('remove')
        expect(calls[0].args).toContain('--force')
        expect(calls[0].args).toContain('/tmp/worktrees/test')
      },
      180_000,
    )
  },
)
