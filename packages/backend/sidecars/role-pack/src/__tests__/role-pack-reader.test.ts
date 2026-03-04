/**
 * Tests for role-pack-reader.ts
 * WINT-2010: Create Role Pack Sidecar Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { join } from 'path'

// Mock @repo/logger before imports
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fs/promises at top level before any imports
const mockReadFile = vi.fn()
vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}))

// Now import the module under test
import { readRolePack, clearRolePackCache } from '../role-pack-reader.js'
import { logger } from '@repo/logger'

const FIXTURE_DIR = join(new URL('..', import.meta.url).pathname, '__fixtures__')

describe('readRolePack', () => {
  beforeEach(() => {
    clearRolePackCache()
    vi.clearAllMocks()
    mockReadFile.mockReset()
  })

  it('reads and parses a role pack file with version frontmatter', async () => {
    mockReadFile.mockResolvedValueOnce('---\nversion: 1\nrole: dev\n---\n\nYou are a dev agent.')

    const result = await readRolePack('dev', '/fake/dir')

    expect(result).not.toBeNull()
    expect(result!.content).toBe('You are a dev agent.')
    expect(result!.version).toBe(1)
  })

  it('caches the result on second call (readFile called only once)', async () => {
    mockReadFile.mockResolvedValue('---\nversion: 1\n---\n\nCached content.')

    const first = await readRolePack('qa', '/fake/dir')
    const second = await readRolePack('qa', '/fake/dir')

    expect(first).toEqual(second)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
  })

  it('returns null and warns when file not found (ENOENT)', async () => {
    const err = Object.assign(new Error('File not found'), { code: 'ENOENT' })
    mockReadFile.mockRejectedValueOnce(err)

    const result = await readRolePack('po', '/fake/dir')

    expect(result).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      '[sidecar-role-pack] Role pack file not found',
      expect.objectContaining({ role: 'po' }),
    )
  })

  it('returns null and warns on generic read error', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('Permission denied'))

    const result = await readRolePack('da', '/fake/dir')

    expect(result).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      '[sidecar-role-pack] Role pack file read error',
      expect.objectContaining({ role: 'da', error: 'Permission denied' }),
    )
  })

  it('returns content with null version when frontmatter has no version field', async () => {
    mockReadFile.mockResolvedValueOnce('---\nrole: dev\n---\n\nNo version here.')

    const result = await readRolePack('dev', '/fake/dir')

    expect(result).not.toBeNull()
    expect(result!.version).toBeNull()
    expect(result!.content).toBe('No version here.')
  })

  it('reads fixture files correctly from fixture dir (real fs)', async () => {
    // Restore real readFile for this test
    mockReadFile.mockImplementationOnce(async (path: string) => {
      const { readFile: realReadFile } = await vi.importActual<typeof import('fs/promises')>('fs/promises')
      return realReadFile(path, 'utf-8')
    })

    const result = await readRolePack('dev', FIXTURE_DIR)

    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.content.length).toBeGreaterThan(0)
  })
})
