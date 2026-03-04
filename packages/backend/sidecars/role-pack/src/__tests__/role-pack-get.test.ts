/**
 * Tests for role-pack-get.ts (MCP tool)
 * WINT-2010: Create Role Pack Sidecar Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'
import { rolePackGet } from '../role-pack-get.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the role-pack-reader module
vi.mock('../role-pack-reader.js', () => ({
  readRolePack: vi.fn(),
  clearRolePackCache: vi.fn(),
}))

describe('rolePackGet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns content string for a valid role', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    vi.mocked(readRolePack).mockResolvedValueOnce({
      content: 'You are a dev agent.',
      version: 1,
    })

    const result = await rolePackGet({ role: 'dev' })

    expect(result).toBe('You are a dev agent.')
  })

  it('throws ZodError for an invalid role (pm is not in allowlist)', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rolePackGet({ role: 'pm' as any }),
    ).rejects.toThrow(ZodError)
  })

  it('throws ZodError for a completely unknown role', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rolePackGet({ role: 'architect' as any }),
    ).rejects.toThrow(ZodError)
  })

  it('returns null and warns when file is missing', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    const { logger } = await import('@repo/logger')
    vi.mocked(readRolePack).mockResolvedValueOnce(null)

    const result = await rolePackGet({ role: 'qa' })

    expect(result).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      '[sidecar-role-pack] rolePackGet: role pack not found',
      expect.objectContaining({ role: 'qa' }),
    )
  })

  it('returns content for all 4 valid roles', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    vi.mocked(readRolePack).mockResolvedValue({ content: 'Role content.', version: 1 })

    const roles = ['dev', 'po', 'qa', 'da'] as const
    for (const role of roles) {
      const result = await rolePackGet({ role })
      expect(result).toBe('Role content.')
    }
  })

  it('returns null when version constraint does not match', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    const { logger } = await import('@repo/logger')
    vi.mocked(readRolePack).mockResolvedValueOnce({ content: 'Content.', version: 1 })

    const result = await rolePackGet({ role: 'dev', version: 2 })

    expect(result).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      '[sidecar-role-pack] rolePackGet: version mismatch',
      expect.objectContaining({ role: 'dev', requested: 2, available: 1 }),
    )
  })

  it('returns content when version constraint matches', async () => {
    const { readRolePack } = await import('../role-pack-reader.js')
    vi.mocked(readRolePack).mockResolvedValueOnce({ content: 'Versioned content.', version: 1 })

    const result = await rolePackGet({ role: 'po', version: 1 })

    expect(result).toBe('Versioned content.')
  })
})
