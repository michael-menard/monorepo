/**
 * Tests for role-pack-reader.ts
 * WINT-2010 AC coverage: AC-3 (file read), AC-4 (cache), AC-5 (miss/error)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import { readRolePack, clearRolePackCache } from '../role-pack-reader.js'

vi.mock('node:fs/promises')

const mockReadFile = vi.mocked(readFile)

const DEV_FIXTURE = `---
role: dev
version: 1
---

# Dev Role Pack

Some content here.
`

describe('readRolePack', () => {
  beforeEach(() => {
    clearRolePackCache()
    vi.resetAllMocks()
  })

  afterEach(() => {
    clearRolePackCache()
  })

  it('returns pack content and version on happy path', async () => {
    mockReadFile.mockResolvedValueOnce(DEV_FIXTURE as any)

    const result = await readRolePack('dev')

    expect(result).not.toBeNull()
    expect(result!.content).toBe(DEV_FIXTURE)
    expect(result!.version).toBe(1)
  })

  it('returns null when file is not found (ENOENT)', async () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    mockReadFile.mockRejectedValueOnce(err)

    const result = await readRolePack('po')

    expect(result).toBeNull()
  })

  it('returns null when file read throws a generic error', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('Permission denied'))

    const result = await readRolePack('qa')

    expect(result).toBeNull()
  })

  it('returns cached result on second call without re-reading the file', async () => {
    mockReadFile.mockResolvedValueOnce(DEV_FIXTURE as any)

    const first = await readRolePack('dev')
    const second = await readRolePack('dev')

    expect(first).toBe(second) // same reference from cache
    expect(mockReadFile).toHaveBeenCalledTimes(1)
  })

  it('parses version from frontmatter correctly', async () => {
    const fixture = `---
role: da
version: 2
---

# DA content
`
    mockReadFile.mockResolvedValueOnce(fixture as any)

    const result = await readRolePack('da')

    expect(result!.version).toBe(2)
  })

  it('returns undefined version when frontmatter has no version field', async () => {
    const fixture = `---
role: dev
---

# No version
`
    mockReadFile.mockResolvedValueOnce(fixture as any)

    const result = await readRolePack('dev')

    expect(result!.version).toBeUndefined()
  })
})
