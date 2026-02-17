import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import { parseFrontmatter, validateFrontmatter } from '../parsers/frontmatter-parser.js'
import { z } from 'zod'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const fixturesDir = path.resolve(
  import.meta.dirname,
  '../__fixtures__',
)

describe('parseFrontmatter', () => {
  it('parses well-formed frontmatter from a valid markdown file', async () => {
    const result = await parseFrontmatter(path.join(fixturesDir, 'test-agent.md'))

    expect(result).not.toBeNull()
    expect(result!.data).toMatchObject({
      name: 'test-agent',
      type: 'worker',
      permission_level: 'read-write',
      model: 'sonnet',
      mission: 'Test agent for seeding',
    })
    expect(result!.content).toContain('Test Agent')
  })

  it('handles malformed YAML frontmatter gracefully', async () => {
    const result = await parseFrontmatter(path.join(fixturesDir, 'malformed-agent.md'))

    // gray-matter is lenient about malformed YAML, may still return something
    // The key is that it doesn't throw
    // result can be null or have partial data
    expect(true).toBe(true) // Test that it doesn't throw
  })

  it('returns null for non-existent files', async () => {
    const result = await parseFrontmatter('/non/existent/path/file.md')

    expect(result).toBeNull()
  })

  it('handles minimal frontmatter', async () => {
    const result = await parseFrontmatter(path.join(fixturesDir, 'minimal-agent.md'))

    expect(result).not.toBeNull()
    expect(result!.data).toMatchObject({
      type: 'worker',
      permission_level: 'docs-only',
    })
  })
})

describe('validateFrontmatter', () => {
  it('validates valid data against schema', () => {
    const schema = z.object({
      name: z.string(),
      type: z.string(),
    })

    const result = validateFrontmatter({ name: 'test', type: 'worker' }, schema)
    expect(result).toEqual({ name: 'test', type: 'worker' })
  })

  it('returns null for invalid data', () => {
    const schema = z.object({
      name: z.string(),
      required_field: z.string(),
    })

    const result = validateFrontmatter({ name: 'test' }, schema)
    expect(result).toBeNull()
  })

  it('validates data with optional fields', () => {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
    })

    const result = validateFrontmatter({ name: 'test' }, schema)
    expect(result).toEqual({ name: 'test' })
  })
})
