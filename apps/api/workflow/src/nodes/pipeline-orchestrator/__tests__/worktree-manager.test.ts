/**
 * worktree-manager node tests (pipeline-orchestrator)
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
  parseWtListForStory,
  parseWtSwitchOutput,
  createWorktreeNode,
  createCleanupWorktreeNode,
} from '../worktree-manager.js'
import type { ShellExecFn, ShellExecResult } from '../worktree-manager.js'

// ============================================================================
// Helpers
// ============================================================================

function makeShellExec(
  responses: Record<string, ShellExecResult>,
): ShellExecFn {
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
// parseWtListForStory tests
// ============================================================================

describe('parseWtListForStory', () => {
  it('finds worktree path when storyId is present', () => {
    const output = [
      '/home/dev/monorepo/.worktrees/ORCH-1010  ORCH-1010  [clean]',
      '/home/dev/monorepo/.worktrees/ORCH-2030  ORCH-2030  [modified]',
      '/home/dev/monorepo  main  [clean]',
    ].join('\n')

    const result = parseWtListForStory(output, 'ORCH-2030')
    expect(result).toBe('/home/dev/monorepo/.worktrees/ORCH-2030')
  })

  it('returns null when storyId is not in the list', () => {
    const output = [
      '/home/dev/monorepo/.worktrees/ORCH-1010  ORCH-1010  [clean]',
      '/home/dev/monorepo  main  [clean]',
    ].join('\n')

    expect(parseWtListForStory(output, 'ORCH-9999')).toBeNull()
  })

  it('returns null for empty output', () => {
    expect(parseWtListForStory('', 'ORCH-2030')).toBeNull()
  })

  it('handles output without .worktrees path by returning first token', () => {
    const output = '/tmp/my-worktree  ORCH-2030  [clean]'
    const result = parseWtListForStory(output, 'ORCH-2030')
    expect(result).toBe('/tmp/my-worktree')
  })
})

// ============================================================================
// parseWtSwitchOutput tests
// ============================================================================

describe('parseWtSwitchOutput', () => {
  it('extracts path from "worktree @ <path>" pattern', () => {
    const stdout = 'Creating branch ORCH-2030\nworktree @ /home/dev/monorepo/.worktrees/ORCH-2030\n'
    const result = parseWtSwitchOutput(stdout, 'ORCH-2030', '/home/dev/monorepo')
    expect(result).toBe('/home/dev/monorepo/.worktrees/ORCH-2030')
  })

  it('falls back to conventional path when pattern not found', () => {
    const stdout = 'Switched to branch ORCH-2030\n'
    const result = parseWtSwitchOutput(stdout, 'ORCH-2030', '/home/dev/monorepo')
    expect(result).toBe('/home/dev/monorepo/.worktrees/ORCH-2030')
  })
})

// ============================================================================
// createWorktreeNode tests
// ============================================================================

describe('createWorktreeNode', () => {
  const monorepoRoot = '/home/dev/monorepo'

  it('pulls main, creates worktree, and returns result', async () => {
    const shellExec = makeShellExec({
      'git pull': ok(),
      'wt list': ok('/home/dev/monorepo  main  [clean]\n'),
      'wt switch': ok('worktree @ /home/dev/monorepo/.worktrees/ORCH-2030\n'),
    })

    const node = createWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.worktreePath).toBe('/home/dev/monorepo/.worktrees/ORCH-2030')
    expect(result.worktreeResult.created).toBe(true)
    expect(result.worktreeResult.reused).toBe(false)
    expect(result.worktreeResult.branch).toBe('ORCH-2030')
  })

  it('reuses existing worktree when found in wt list', async () => {
    const shellExec = makeShellExec({
      'git pull': ok(),
      'wt list': ok(
        '/home/dev/monorepo/.worktrees/ORCH-2030  ORCH-2030  [clean]\n' +
        '/home/dev/monorepo  main  [clean]\n',
      ),
    })

    const node = createWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.worktreePath).toBe('/home/dev/monorepo/.worktrees/ORCH-2030')
    expect(result.worktreeResult.created).toBe(false)
    expect(result.worktreeResult.reused).toBe(true)
    // Should NOT call wt switch
    expect(shellExec).not.toHaveBeenCalledWith(
      'wt',
      expect.arrayContaining(['switch']),
      expect.anything(),
    )
  })

  it('continues if git pull fails', async () => {
    const shellExec = makeShellExec({
      'git pull': fail('network error'),
      'wt list': ok(''),
      'wt switch': ok('worktree @ /home/dev/monorepo/.worktrees/ORCH-2030\n'),
    })

    const node = createWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.worktreeResult.created).toBe(true)
  })

  it('throws when wt switch --create fails', async () => {
    const shellExec = makeShellExec({
      'git pull': ok(),
      'wt list': ok(''),
      'wt switch': fail('branch already exists', 1),
    })

    const node = createWorktreeNode({ monorepoRoot, shellExec })

    await expect(node({ storyId: 'ORCH-2030' })).rejects.toThrow(
      /wt switch --create failed/,
    )
  })

  it('handles wt list failure gracefully and proceeds to create', async () => {
    const shellExec = makeShellExec({
      'git pull': ok(),
      'wt list': fail('wt not found'),
      'wt switch': ok('worktree @ /home/dev/monorepo/.worktrees/ORCH-2030\n'),
    })

    const node = createWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.worktreeResult.created).toBe(true)
  })

  it('uses fallback path when wt switch output lacks worktree @ pattern', async () => {
    const shellExec = makeShellExec({
      'git pull': ok(),
      'wt list': ok(''),
      'wt switch': ok('Switched to new branch\n'),
    })

    const node = createWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.worktreePath).toBe('/home/dev/monorepo/.worktrees/ORCH-2030')
  })

  it('passes cwd to shell exec calls', async () => {
    const shellExec = vi.fn(async () => ok(''))
    // Override to return proper outputs for each call
    shellExec
      .mockResolvedValueOnce(ok()) // git pull
      .mockResolvedValueOnce(ok('')) // wt list
      .mockResolvedValueOnce(ok('worktree @ /home/dev/monorepo/.worktrees/ORCH-2030'))

    const node = createWorktreeNode({ monorepoRoot, shellExec })
    await node({ storyId: 'ORCH-2030' })

    expect(shellExec).toHaveBeenCalledWith(
      'git',
      ['pull', 'origin', 'main'],
      { cwd: monorepoRoot },
    )
    expect(shellExec).toHaveBeenCalledWith('wt', ['list'], {
      cwd: monorepoRoot,
    })
  })
})

// ============================================================================
// createCleanupWorktreeNode tests
// ============================================================================

describe('createCleanupWorktreeNode', () => {
  const monorepoRoot = '/home/dev/monorepo'

  it('removes worktree successfully', async () => {
    const shellExec = makeShellExec({
      'wt remove': ok('Removed worktree ORCH-2030\n'),
    })

    const node = createCleanupWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.cleanupResult.removed).toBe(true)
    expect(result.cleanupResult.error).toBeUndefined()
  })

  it('returns removed=false with error when wt remove fails', async () => {
    const shellExec = makeShellExec({
      'wt remove': fail('worktree not found', 1),
    })

    const node = createCleanupWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.cleanupResult.removed).toBe(false)
    expect(result.cleanupResult.error).toMatch(/wt remove failed/)
  })

  it('does not throw on unexpected errors', async () => {
    const shellExec = vi.fn(async () => {
      throw new Error('unexpected crash')
    })

    const node = createCleanupWorktreeNode({ monorepoRoot, shellExec })
    const result = await node({ storyId: 'ORCH-2030' })

    expect(result.cleanupResult.removed).toBe(false)
    expect(result.cleanupResult.error).toBe('unexpected crash')
  })

  it('passes correct args to wt remove', async () => {
    const shellExec = vi.fn(async () => ok(''))

    const node = createCleanupWorktreeNode({ monorepoRoot, shellExec })
    await node({ storyId: 'ORCH-2030' })

    expect(shellExec).toHaveBeenCalledWith(
      'wt',
      ['remove', 'ORCH-2030', '--yes', '--force'],
      { cwd: monorepoRoot },
    )
  })
})
