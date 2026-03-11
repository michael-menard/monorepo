/**
 * Unit Tests for regenerate-index.ts
 * KBAR-0240
 *
 * Tests:
 * - parseArgs: --help returns null, all flags parsed correctly
 * - RegenerateIndexCLIOptionsSchema validation
 * - main() behavior with mocked generateStoriesIndex
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { parseArgs } from '../regenerate-index.js'

// ============================================================================
// parseArgs Tests
// ============================================================================

describe('parseArgs', () => {
  it('returns null for --help flag', () => {
    expect(parseArgs(['--help'])).toBeNull()
    expect(parseArgs(['-h'])).toBeNull()
  })

  it('parses --epic flag', () => {
    const result = parseArgs(['--epic', 'KBAR'])
    expect(result).toEqual({ epic: 'KBAR' })
  })

  it('parses --output flag', () => {
    const result = parseArgs(['--epic', 'KBAR', '--output', '/path/to/output.md'])
    expect(result?.output).toBe('/path/to/output.md')
  })

  it('parses --dry-run flag', () => {
    const result = parseArgs(['--epic', 'KBAR', '--dry-run'])
    expect(result?.dryRun).toBe(true)
  })

  it('parses --verbose flag', () => {
    const result = parseArgs(['--epic', 'KBAR', '--verbose'])
    expect(result?.verbose).toBe(true)
  })

  it('parses --force flag', () => {
    const result = parseArgs(['--epic', 'KBAR', '--force'])
    expect(result?.force).toBe(true)
  })

  it('parses all flags together', () => {
    const result = parseArgs([
      '--epic', 'KBAR',
      '--output', '/some/file.md',
      '--dry-run',
      '--verbose',
      '--force',
    ])
    expect(result).toEqual({
      epic: 'KBAR',
      output: '/some/file.md',
      dryRun: true,
      verbose: true,
      force: true,
    })
  })

  it('returns empty object for empty args', () => {
    expect(parseArgs([])).toEqual({})
  })
})

// ============================================================================
// RegenerateIndexCLIOptionsSchema validation tests
// ============================================================================

describe('RegenerateIndexCLIOptionsSchema validation', () => {
  it('validates required epic field', async () => {
    const { RegenerateIndexCLIOptionsSchema } = await import('../__types__/cli-options.js')

    const result = RegenerateIndexCLIOptionsSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty epic string', async () => {
    const { RegenerateIndexCLIOptionsSchema } = await import('../__types__/cli-options.js')

    const result = RegenerateIndexCLIOptionsSchema.safeParse({ epic: '' })
    expect(result.success).toBe(false)
  })

  it('accepts valid epic', async () => {
    const { RegenerateIndexCLIOptionsSchema } = await import('../__types__/cli-options.js')

    const result = RegenerateIndexCLIOptionsSchema.safeParse({ epic: 'KBAR' })
    expect(result.success).toBe(true)
  })

  it('defaults dryRun, verbose, force to false', async () => {
    const { RegenerateIndexCLIOptionsSchema } = await import('../__types__/cli-options.js')

    const result = RegenerateIndexCLIOptionsSchema.safeParse({ epic: 'KBAR' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dryRun).toBe(false)
      expect(result.data.verbose).toBe(false)
      expect(result.data.force).toBe(false)
    }
  })

  it('accepts optional output path', async () => {
    const { RegenerateIndexCLIOptionsSchema } = await import('../__types__/cli-options.js')

    const result = RegenerateIndexCLIOptionsSchema.safeParse({
      epic: 'KBAR',
      output: '/path/to/file.md',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.output).toBe('/path/to/file.md')
    }
  })

  it('output is undefined when not provided', async () => {
    const { RegenerateIndexCLIOptionsSchema } = await import('../__types__/cli-options.js')

    const result = RegenerateIndexCLIOptionsSchema.safeParse({ epic: 'KBAR' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.output).toBeUndefined()
    }
  })
})

// ============================================================================
// main() Tests
// ============================================================================

describe('main()', () => {
  let exitSpy: MockInstance
  let stdoutSpy: MockInstance
  let stderrSpy: MockInstance
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit(${code})`)
    })
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('--help prints help text and exits 0', async () => {
    process.argv = ['node', 'regenerate-index.ts', '--help']

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(0)')
    expect(stdoutSpy).toHaveBeenCalled()
    const output = (stdoutSpy.mock.calls.flat().join('') as string)
    expect(output).toContain('regenerate:index')
    expect(output).toContain('--epic')
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('missing --epic exits 1 with validation error', async () => {
    process.argv = ['node', 'regenerate-index.ts']

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(1)')
    expect(stderrSpy).toHaveBeenCalled()
    const errOutput = (stderrSpy.mock.calls.flat().join('') as string)
    expect(errOutput).toContain('ERROR: Invalid options')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('exits 1 when generateStoriesIndex is not available in module', async () => {
    process.argv = ['node', 'regenerate-index.ts', '--epic', 'KBAR']

    // Mock the src/index.js module to NOT have generateStoriesIndex
    vi.doMock('../../src/index.js', () => ({
      syncStoryToDatabase: vi.fn(),
      // no generateStoriesIndex
    }))

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(1)')
    expect(stderrSpy).toHaveBeenCalled()
    const errOutput = (stderrSpy.mock.calls.flat().join('') as string)
    expect(errOutput).toContain('generateStoriesIndex')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('success: calls generateStoriesIndex and prints to stdout, exits 0', async () => {
    process.argv = ['node', 'regenerate-index.ts', '--epic', 'KBAR']

    vi.doMock('../../src/index.js', () => ({
      generateStoriesIndex: vi.fn().mockResolvedValue('# KBAR Stories Index\n- KBAR-0010'),
    }))

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(0)')
    const output = stdoutSpy.mock.calls.flat().join('') as string
    expect(output).toContain('# KBAR Stories Index')
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('--dry-run with matching content exits 0', async () => {
    const existingContent = '# KBAR Stories Index\n- KBAR-0010'
    process.argv = [
      'node', 'regenerate-index.ts',
      '--epic', 'KBAR',
      '--dry-run',
      '--output', '/tmp/test-index.md',
    ]

    vi.doMock('../../src/index.js', () => ({
      generateStoriesIndex: vi.fn().mockResolvedValue(existingContent),
    }))

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue(existingContent),
      writeFile: vi.fn(),
    }))

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(0)')
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('--dry-run with differing content exits 1', async () => {
    process.argv = [
      'node', 'regenerate-index.ts',
      '--epic', 'KBAR',
      '--dry-run',
      '--output', '/tmp/test-index.md',
    ]

    vi.doMock('../../src/index.js', () => ({
      generateStoriesIndex: vi.fn().mockResolvedValue('# New Content'),
    }))

    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('# Old Content'),
      writeFile: vi.fn(),
    }))

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(1)')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('DB connection error exits 2', async () => {
    process.argv = ['node', 'regenerate-index.ts', '--epic', 'KBAR']

    vi.doMock('../../src/index.js', () => ({
      generateStoriesIndex: vi.fn().mockRejectedValue(new Error('ECONNREFUSED: DB connection failed')),
    }))

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(2)')
    expect(stderrSpy).toHaveBeenCalled()
    const errOutput = stderrSpy.mock.calls.flat().join('') as string
    expect(errOutput).toContain('DB connection failed')
    expect(exitSpy).toHaveBeenCalledWith(2)
  })

  it('Zod validation error for invalid options exits 1', async () => {
    // empty epic
    process.argv = ['node', 'regenerate-index.ts', '--epic', '']

    const { main } = await import('../regenerate-index.js')

    await expect(main()).rejects.toThrow('process.exit(1)')
    expect(stderrSpy).toHaveBeenCalled()
    const errOutput = stderrSpy.mock.calls.flat().join('') as string
    expect(errOutput).toContain('ERROR: Invalid options')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
