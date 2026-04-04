/**
 * git-operations node tests (pipeline-orchestrator)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  parseCommitSha,
  parsePrUrl,
  parsePrNumber,
  parseExistingPr,
  createCommitPushNode,
  createCreatePrNode,
  createMergePrNode,
} from '../git-operations.js'
import type { ShellExecFn, ShellExecResult } from '../worktree-manager.js'

// ============================================================================
// Helpers
// ============================================================================

function makeShellExec(responses: Record<string, ShellExecResult>): ShellExecFn {
  return vi.fn(async (cmd: string, args: string[]) => {
    const key = `${cmd} ${args.join(' ')}`
    for (const [pattern, result] of Object.entries(responses)) {
      if (key.includes(pattern)) return result
    }
    return { stdout: '', stderr: 'unknown command', exitCode: 127 }
  })
}

function ok(stdout = ''): ShellExecResult {
  return { stdout, stderr: '', exitCode: 0 }
}

function fail(stderr = 'error', exitCode = 1): ShellExecResult {
  return { stdout: '', stderr, exitCode }
}

// ============================================================================
// parseCommitSha tests
// ============================================================================

describe('parseCommitSha', () => {
  it('extracts SHA from standard git commit output', () => {
    const output = '[ORCH-3020 abc1234] feat(workflow): add git ops (ORCH-3020)'
    expect(parseCommitSha(output)).toBe('abc1234')
  })

  it('extracts SHA from branch with slashes', () => {
    const output = '[feature/test a1b2c3d] fix something'
    expect(parseCommitSha(output)).toBe('a1b2c3d')
  })

  it('returns undefined when no SHA found', () => {
    expect(parseCommitSha('nothing here')).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(parseCommitSha('')).toBeUndefined()
  })
})

// ============================================================================
// parsePrUrl tests
// ============================================================================

describe('parsePrUrl', () => {
  it('extracts PR URL from gh output', () => {
    const output = 'https://github.com/owner/repo/pull/42\n'
    expect(parsePrUrl(output)).toBe('https://github.com/owner/repo/pull/42')
  })

  it('returns null when no URL found', () => {
    expect(parsePrUrl('Created pull request')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parsePrUrl('')).toBeNull()
  })
})

// ============================================================================
// parsePrNumber tests
// ============================================================================

describe('parsePrNumber', () => {
  it('extracts PR number from URL', () => {
    expect(parsePrNumber('https://github.com/owner/repo/pull/42')).toBe(42)
  })

  it('returns null for non-PR URL', () => {
    expect(parsePrNumber('https://github.com/owner/repo')).toBeNull()
  })
})

// ============================================================================
// parseExistingPr tests
// ============================================================================

describe('parseExistingPr', () => {
  it('parses existing PR from JSON output', () => {
    const json = JSON.stringify([{ number: 42, url: 'https://github.com/owner/repo/pull/42' }])
    const result = parseExistingPr(json)
    expect(result).toEqual({ prUrl: 'https://github.com/owner/repo/pull/42', prNumber: 42 })
  })

  it('returns null for empty array', () => {
    expect(parseExistingPr('[]')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseExistingPr('not json')).toBeNull()
  })

  it('returns null when fields are missing', () => {
    expect(parseExistingPr(JSON.stringify([{ number: 42 }]))).toBeNull()
  })
})

// ============================================================================
// createCommitPushNode tests
// ============================================================================

describe('createCommitPushNode', () => {
  const baseConfig = {
    worktreePath: '/home/dev/monorepo/.worktrees/ORCH-3020',
    storyId: 'ORCH-3020',
    branch: 'ORCH-3020',
    commitMessage: 'feat(workflow): add git ops (ORCH-3020)',
  }

  it('stages, commits, and pushes successfully', async () => {
    const shellExec = makeShellExec({
      'git add': ok(),
      'git status --porcelain': ok('M src/file.ts\n'),
      'git commit': ok('[ORCH-3020 abc1234] feat(workflow): add git ops (ORCH-3020)\n'),
      'git push': ok('To github.com:owner/repo.git\n'),
    })

    const node = createCommitPushNode({ ...baseConfig, shellExec })
    const { commitPushResult } = await node()

    expect(commitPushResult.committed).toBe(true)
    expect(commitPushResult.pushed).toBe(true)
    expect(commitPushResult.commitSha).toBe('abc1234')
    expect(commitPushResult.nothingToCommit).toBe(false)
    expect(commitPushResult.error).toBeUndefined()
  })

  it('returns nothingToCommit when working tree is clean', async () => {
    const shellExec = makeShellExec({
      'git add': ok(),
      'git status --porcelain': ok(''),
    })

    const node = createCommitPushNode({ ...baseConfig, shellExec })
    const { commitPushResult } = await node()

    expect(commitPushResult.nothingToCommit).toBe(true)
    expect(commitPushResult.committed).toBe(false)
    expect(commitPushResult.pushed).toBe(false)
  })

  it('returns error when git add fails', async () => {
    const shellExec = makeShellExec({
      'git add': fail('permission denied'),
    })

    const node = createCommitPushNode({ ...baseConfig, shellExec })
    const { commitPushResult } = await node()

    expect(commitPushResult.committed).toBe(false)
    expect(commitPushResult.error).toMatch(/git add failed/)
  })

  it('returns error when git commit fails', async () => {
    const shellExec = makeShellExec({
      'git add': ok(),
      'git status --porcelain': ok('M src/file.ts\n'),
      'git commit': fail('hook failed'),
    })

    const node = createCommitPushNode({ ...baseConfig, shellExec })
    const { commitPushResult } = await node()

    expect(commitPushResult.committed).toBe(false)
    expect(commitPushResult.pushed).toBe(false)
    expect(commitPushResult.error).toMatch(/git commit failed/)
  })

  it('returns committed=true but pushed=false when push fails', async () => {
    const shellExec = makeShellExec({
      'git add': ok(),
      'git status --porcelain': ok('M src/file.ts\n'),
      'git commit': ok('[ORCH-3020 abc1234] feat\n'),
      'git push': fail('rejected'),
    })

    const node = createCommitPushNode({ ...baseConfig, shellExec })
    const { commitPushResult } = await node()

    expect(commitPushResult.committed).toBe(true)
    expect(commitPushResult.pushed).toBe(false)
    expect(commitPushResult.commitSha).toBe('abc1234')
    expect(commitPushResult.error).toMatch(/git push failed/)
  })

  it('passes worktreePath as cwd to all commands', async () => {
    const shellExec = vi.fn(async () => ok(''))
    shellExec
      .mockResolvedValueOnce(ok()) // git add
      .mockResolvedValueOnce(ok('M file\n')) // git status
      .mockResolvedValueOnce(ok('[ORCH-3020 abc1234] feat\n')) // git commit
      .mockResolvedValueOnce(ok()) // git push

    const node = createCommitPushNode({ ...baseConfig, shellExec })
    await node()

    for (const call of shellExec.mock.calls) {
      expect(call[2]).toEqual({ cwd: baseConfig.worktreePath })
    }
  })
})

// ============================================================================
// createCreatePrNode tests
// ============================================================================

describe('createCreatePrNode', () => {
  const baseConfig = {
    worktreePath: '/home/dev/monorepo/.worktrees/ORCH-3020',
    storyId: 'ORCH-3020',
    branch: 'ORCH-3020',
    title: 'feat(workflow): add git ops (ORCH-3020)',
    body: '## Summary\nAdd git operations nodes.',
  }

  it('creates a new PR successfully', async () => {
    const shellExec = makeShellExec({
      'gh pr list': ok('[]'),
      'gh pr create': ok('https://github.com/owner/repo/pull/42\n'),
    })

    const node = createCreatePrNode({ ...baseConfig, shellExec })
    const { createPrResult } = await node()

    expect(createPrResult.prUrl).toBe('https://github.com/owner/repo/pull/42')
    expect(createPrResult.prNumber).toBe(42)
    expect(createPrResult.alreadyExists).toBe(false)
    expect(createPrResult.error).toBeUndefined()
  })

  it('detects existing PR from gh pr list', async () => {
    const existingPrs = JSON.stringify([
      { number: 99, url: 'https://github.com/owner/repo/pull/99' },
    ])
    const shellExec = makeShellExec({
      'gh pr list': ok(existingPrs),
    })

    const node = createCreatePrNode({ ...baseConfig, shellExec })
    const { createPrResult } = await node()

    expect(createPrResult.alreadyExists).toBe(true)
    expect(createPrResult.prUrl).toBe('https://github.com/owner/repo/pull/99')
    expect(createPrResult.prNumber).toBe(99)
  })

  it('handles "already exists" in stderr from gh pr create', async () => {
    const shellExec = makeShellExec({
      'gh pr list': ok('[]'),
      'gh pr create': fail('a pull request for branch ORCH-3020 already exists'),
    })

    const node = createCreatePrNode({ ...baseConfig, shellExec })
    const { createPrResult } = await node()

    expect(createPrResult.alreadyExists).toBe(true)
  })

  it('returns error when gh pr create fails with non-duplicate error', async () => {
    const shellExec = makeShellExec({
      'gh pr list': ok('[]'),
      'gh pr create': fail('authentication required'),
    })

    const node = createCreatePrNode({ ...baseConfig, shellExec })
    const { createPrResult } = await node()

    expect(createPrResult.alreadyExists).toBe(false)
    expect(createPrResult.error).toMatch(/gh pr create failed/)
  })

  it('proceeds to create when gh pr list fails', async () => {
    const shellExec = makeShellExec({
      'gh pr list': fail('gh not authenticated'),
      'gh pr create': ok('https://github.com/owner/repo/pull/1\n'),
    })

    const node = createCreatePrNode({ ...baseConfig, shellExec })
    const { createPrResult } = await node()

    expect(createPrResult.prUrl).toBe('https://github.com/owner/repo/pull/1')
    expect(createPrResult.alreadyExists).toBe(false)
  })

  it('passes correct args to gh pr create', async () => {
    const shellExec = vi.fn(async () => ok(''))
    shellExec
      .mockResolvedValueOnce(ok('[]')) // gh pr list
      .mockResolvedValueOnce(ok('https://github.com/owner/repo/pull/1\n')) // gh pr create

    const node = createCreatePrNode({ ...baseConfig, shellExec })
    await node()

    expect(shellExec).toHaveBeenCalledWith(
      'gh',
      [
        'pr',
        'create',
        '--title',
        baseConfig.title,
        '--body',
        baseConfig.body,
        '--base',
        'main',
      ],
      { cwd: baseConfig.worktreePath },
    )
  })
})

// ============================================================================
// createMergePrNode tests
// ============================================================================

describe('createMergePrNode', () => {
  const baseConfig = {
    worktreePath: '/home/dev/monorepo/.worktrees/ORCH-3020',
    storyId: 'ORCH-3020',
    branch: 'ORCH-3020',
    monorepoRoot: '/home/dev/monorepo',
  }

  it('fetches, rebases, and merges successfully', async () => {
    const shellExec = makeShellExec({
      'git fetch': ok(),
      'git rebase': ok('Successfully rebased\n'),
      'wt merge': ok('Merged ORCH-3020 into main\n'),
    })

    const node = createMergePrNode({ ...baseConfig, shellExec })
    const { mergePrResult } = await node()

    expect(mergePrResult.merged).toBe(true)
    expect(mergePrResult.conflict).toBe(false)
    expect(mergePrResult.error).toBeUndefined()
  })

  it('returns conflict=true when rebase fails', async () => {
    const shellExec = makeShellExec({
      'git fetch': ok(),
      'git rebase origin/main': fail('CONFLICT (content): merge conflict in src/file.ts'),
      'git rebase --abort': ok(),
    })

    const node = createMergePrNode({ ...baseConfig, shellExec })
    const { mergePrResult } = await node()

    expect(mergePrResult.merged).toBe(false)
    expect(mergePrResult.conflict).toBe(true)
    expect(mergePrResult.error).toMatch(/Rebase conflict/)
  })

  it('aborts rebase on conflict', async () => {
    const shellExec = vi.fn(async (cmd: string, args: string[]) => {
      const key = `${cmd} ${args.join(' ')}`
      if (key.includes('git fetch')) return ok()
      if (key.includes('git rebase --abort')) return ok()
      if (key.includes('git rebase')) return fail('conflict')
      return ok()
    })

    const node = createMergePrNode({ ...baseConfig, shellExec })
    await node()

    expect(shellExec).toHaveBeenCalledWith('git', ['rebase', '--abort'], {
      cwd: baseConfig.worktreePath,
    })
  })

  it('returns error when git fetch fails', async () => {
    const shellExec = makeShellExec({
      'git fetch': fail('network error'),
    })

    const node = createMergePrNode({ ...baseConfig, shellExec })
    const { mergePrResult } = await node()

    expect(mergePrResult.merged).toBe(false)
    expect(mergePrResult.conflict).toBe(false)
    expect(mergePrResult.error).toMatch(/git fetch failed/)
  })

  it('returns error when wt merge fails', async () => {
    const shellExec = makeShellExec({
      'git fetch': ok(),
      'git rebase': ok(),
      'wt merge': fail('merge failed'),
    })

    const node = createMergePrNode({ ...baseConfig, shellExec })
    const { mergePrResult } = await node()

    expect(mergePrResult.merged).toBe(false)
    expect(mergePrResult.conflict).toBe(false)
    expect(mergePrResult.error).toMatch(/wt merge failed/)
  })

  it('handles "already merged" from wt merge', async () => {
    const shellExec = makeShellExec({
      'git fetch': ok(),
      'git rebase': ok(),
      'wt merge': { stdout: '', stderr: 'already merged', exitCode: 1 },
    })

    const node = createMergePrNode({ ...baseConfig, shellExec })
    const { mergePrResult } = await node()

    expect(mergePrResult.merged).toBe(true)
    expect(mergePrResult.conflict).toBe(false)
  })

  it('runs fetch and rebase in worktreePath, merge in monorepoRoot', async () => {
    const shellExec = vi.fn(async () => ok(''))
    shellExec
      .mockResolvedValueOnce(ok()) // git fetch
      .mockResolvedValueOnce(ok()) // git rebase
      .mockResolvedValueOnce(ok()) // wt merge

    const node = createMergePrNode({ ...baseConfig, shellExec })
    await node()

    // git fetch runs in worktreePath
    expect(shellExec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'main'], {
      cwd: baseConfig.worktreePath,
    })

    // git rebase runs in worktreePath
    expect(shellExec).toHaveBeenCalledWith('git', ['rebase', 'origin/main'], {
      cwd: baseConfig.worktreePath,
    })

    // wt merge runs in monorepoRoot
    expect(shellExec).toHaveBeenCalledWith('wt', ['merge', 'ORCH-3020', '--yes'], {
      cwd: baseConfig.monorepoRoot,
    })
  })
})
