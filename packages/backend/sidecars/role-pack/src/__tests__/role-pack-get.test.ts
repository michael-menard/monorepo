/**
 * Tests for role-pack-get.ts
 * WINT-2010 AC coverage: AC-1 (MCP tool), AC-5 (ZodError on invalid), AC-6 (version param)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'
import { rolePackGet } from '../role-pack-get.js'
import { clearRolePackCache } from '../role-pack-reader.js'

vi.mock('../role-pack-reader.js', () => ({
  readRolePack: vi.fn(),
  clearRolePackCache: vi.fn(),
}))

import { readRolePack } from '../role-pack-reader.js'

const mockReadRolePack = vi.mocked(readRolePack)

const MOCK_CONTENT = `---
role: dev
version: 1
---

# Dev Role Pack content
`

describe('rolePackGet', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns content on happy path', async () => {
    mockReadRolePack.mockResolvedValueOnce({ content: MOCK_CONTENT, version: 1 })

    const result = await rolePackGet({ role: 'dev' })

    expect(result).toBe(MOCK_CONTENT)
    expect(mockReadRolePack).toHaveBeenCalledWith('dev')
  })

  it('throws ZodError on invalid role', async () => {
    await expect(rolePackGet({ role: 'pm' as any })).rejects.toThrow(ZodError)
    expect(mockReadRolePack).not.toHaveBeenCalled()
  })

  it('returns null when file reader returns null', async () => {
    mockReadRolePack.mockResolvedValueOnce(null)

    const result = await rolePackGet({ role: 'po' })

    expect(result).toBeNull()
  })

  it('passes role correctly for each valid role', async () => {
    const roles = ['dev', 'po', 'qa', 'da'] as const

    for (const role of roles) {
      mockReadRolePack.mockResolvedValueOnce({ content: `content-${role}`, version: 1 })
      const result = await rolePackGet({ role })
      expect(result).toBe(`content-${role}`)
      expect(mockReadRolePack).toHaveBeenCalledWith(role)
      vi.resetAllMocks()
    }
  })

  it('accepts optional version parameter without error', async () => {
    mockReadRolePack.mockResolvedValueOnce({ content: MOCK_CONTENT, version: 1 })

    const result = await rolePackGet({ role: 'dev', version: 1 })

    expect(result).toBe(MOCK_CONTENT)
  })
})
