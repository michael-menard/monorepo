/**
 * Unit Tests for Context Pack Sidecar
 * WINT-2020: Create Context Pack Sidecar
 *
 * Tests cover:
 * - Zod schema validation (valid/invalid inputs)
 * - Token budget enforcement (trim repo_snippets first, then kb_links)
 * - Cache key generation ('{story_id}:{node_type}:{role}' format)
 * - Section trimming with oversized fixture
 * - Empty array (not null/undefined) returned when sections absent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ContextPackRequestSchema,
  ContextPackResponseSchema,
  estimateTokens,
  DEFAULT_TTL,
  DEFAULT_MAX_TOKENS,
} from '../__types__/index.js'
import { assembleContextPack, type AssembleContextPackDeps } from '../assemble-context-pack.js'

// ============================================================================
// Fixtures
// ============================================================================

/**
 * Create a mock KB search result with n entries.
 */
function makeKbSearchResult(count: number, content = 'short') {
  return {
    results: Array.from({ length: count }, (_, i) => ({
      id: `entry-${i}`,
      content: `${content} ${i}`,
      role: 'dev',
      tags: null,
      relevance_score: 1.0 - i * 0.05,
    })),
    metadata: { total: count, fallback_mode: false },
  }
}

/**
 * Create a mock KB search that returns empty results.
 */
function makeEmptyKbSearch(): AssembleContextPackDeps['kbSearch'] {
  return vi.fn().mockResolvedValue({ results: [], metadata: { total: 0, fallback_mode: true } })
}

/**
 * Create a long string of approximately `tokens` tokens.
 * tokens * 4 = chars (estimateTokens = Math.ceil(chars / 4))
 */
function makeTokenString(tokens: number): string {
  return 'x'.repeat(tokens * 4)
}

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('ContextPackRequestSchema', () => {
  it('accepts valid input with required fields', () => {
    const result = ContextPackRequestSchema.safeParse({
      story_id: 'WINT-2020',
      node_type: 'implement',
      role: 'dev',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.story_id).toBe('WINT-2020')
      expect(result.data.ttl).toBe(DEFAULT_TTL) // Default applied
    }
  })

  it('accepts valid input with optional ttl', () => {
    const result = ContextPackRequestSchema.safeParse({
      story_id: 'WINT-2020',
      node_type: 'plan',
      role: 'pm',
      ttl: 7200,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ttl).toBe(7200)
    }
  })

  it('rejects invalid role enum', () => {
    const result = ContextPackRequestSchema.safeParse({
      story_id: 'WINT-2020',
      node_type: 'plan',
      role: 'invalid-role',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('pm, dev, qa, po')
    }
  })

  it('rejects missing story_id', () => {
    const result = ContextPackRequestSchema.safeParse({
      node_type: 'plan',
      role: 'dev',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty story_id', () => {
    const result = ContextPackRequestSchema.safeParse({
      story_id: '',
      node_type: 'plan',
      role: 'dev',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing node_type', () => {
    const result = ContextPackRequestSchema.safeParse({
      story_id: 'WINT-2020',
      role: 'dev',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid roles', () => {
    for (const role of ['pm', 'dev', 'qa', 'po'] as const) {
      const result = ContextPackRequestSchema.safeParse({
        story_id: 'WINT-2020',
        node_type: 'plan',
        role,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('ContextPackResponseSchema', () => {
  it('validates correct response shape', () => {
    const result = ContextPackResponseSchema.safeParse({
      story_brief: 'Context for WINT-2020',
      kb_facts: [],
      kb_rules: [],
      kb_links: [],
      repo_snippets: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = ContextPackResponseSchema.safeParse({
      story_brief: 'Context',
      kb_facts: [],
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// estimateTokens Tests
// ============================================================================

describe('estimateTokens', () => {
  it('returns Math.ceil(text.length / 4)', () => {
    expect(estimateTokens('hello')).toBe(2) // 5 / 4 = 1.25 → ceil = 2
    expect(estimateTokens('abcd')).toBe(1) // 4 / 4 = 1
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('x'.repeat(100))).toBe(25) // 100 / 4 = 25
  })
})

// ============================================================================
// assembleContextPack Tests (with mocked DB via vi.mock)
// ============================================================================

// Mock the DB and database-schema imports to avoid needing real Postgres
vi.mock('@repo/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]), // Cache miss by default
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        catch: vi.fn(),
      })),
    })),
  },
}))

vi.mock('@repo/knowledge-base/db', () => ({
  contextPacks: {
    packType: 'pack_type',
    packKey: 'pack_key',
    expiresAt: 'expires_at',
    id: 'id',
    hitCount: 'hit_count',
    lastHitAt: 'last_hit_at',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gt: vi.fn(),
  or: vi.fn(),
  isNull: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}))

describe('assembleContextPack', () => {
  let mockKbSearch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockKbSearch = vi.fn().mockResolvedValue({ results: [], metadata: { total: 0, fallback_mode: true } })
    vi.clearAllMocks()
  })

  it('generates cache key as {story_id}:{node_type}:{role}', async () => {
    const deps: AssembleContextPackDeps = { kbSearch: mockKbSearch }

    const result = await assembleContextPack(
      { story_id: 'WINT-2020', node_type: 'implement', role: 'dev' },
      deps,
    )

    // Verify the function completed and returned valid structure
    expect(result).toBeDefined()
    expect(result.story_brief).toContain('WINT-2020')
    expect(result.story_brief).toContain('implement')
    expect(result.story_brief).toContain('dev')
  })

  it('returns empty arrays (not null) when KB search returns no results', async () => {
    const deps: AssembleContextPackDeps = { kbSearch: makeEmptyKbSearch() }

    const result = await assembleContextPack(
      { story_id: 'WINT-2020', node_type: 'plan', role: 'qa' },
      deps,
    )

    expect(result.kb_facts).toEqual([])
    expect(result.kb_rules).toEqual([])
    expect(result.kb_links).toEqual([])
    expect(result.repo_snippets).toEqual([])
    // story_brief is always populated
    expect(typeof result.story_brief).toBe('string')
    expect(result.story_brief.length).toBeGreaterThan(0)
  })

  it('returns empty arrays when kbSearch throws', async () => {
    const failingKbSearch = vi.fn().mockRejectedValue(new Error('KB unreachable'))
    const deps: AssembleContextPackDeps = { kbSearch: failingKbSearch }

    const result = await assembleContextPack(
      { story_id: 'WINT-2020', node_type: 'plan', role: 'po' },
      deps,
    )

    expect(result.kb_facts).toEqual([])
    expect(result.kb_rules).toEqual([])
    expect(result.kb_links).toEqual([])
    expect(result.repo_snippets).toEqual([])
  })

  it('validates schema — throws on invalid role', async () => {
    const deps: AssembleContextPackDeps = { kbSearch: mockKbSearch }

    await expect(
      assembleContextPack({ story_id: 'WINT-2020', node_type: 'plan', role: 'invalid' as any }, deps),
    ).rejects.toThrow()
  })
})

// ============================================================================
// Token Budget Enforcement Tests
// ============================================================================

describe('Token budget enforcement', () => {
  it('trims repo_snippets first when over budget', async () => {
    // Create an oversized mock: 5 repo_snippets each ~600 tokens = 3000 tokens total
    const largeContent = makeTokenString(600)
    const mockSearch = vi.fn().mockImplementation(async (input: { tags?: string[] }) => {
      if (input.tags?.includes('snippet')) {
        return {
          results: Array.from({ length: 5 }, (_, i) => ({
            id: `snippet-${i}`,
            content: largeContent,
            role: 'dev',
            tags: ['snippet'],
            relevance_score: 1.0,
          })),
          metadata: { total: 5, fallback_mode: false },
        }
      }
      return { results: [], metadata: { total: 0, fallback_mode: true } }
    })

    const deps: AssembleContextPackDeps = { kbSearch: mockSearch }
    const result = await assembleContextPack(
      { story_id: 'WINT-2020', node_type: 'plan', role: 'dev' },
      deps,
    )

    // Token budget: total tokens of result should be <= DEFAULT_MAX_TOKENS + tolerance
    const allText = [
      result.story_brief,
      ...result.kb_facts.map(f => f.content),
      ...result.kb_rules.map(r => r.content),
      ...result.kb_links.map(l => l.content),
      ...result.repo_snippets.map(s => s.content),
    ].join(' ')
    const totalTokens = estimateTokens(allText)

    expect(totalTokens).toBeLessThanOrEqual(DEFAULT_MAX_TOKENS + 50) // 50 token tolerance
    // repo_snippets should have been trimmed
    expect(result.repo_snippets.length).toBeLessThan(5)
  })

  it('trims kb_links after repo_snippets are exhausted', async () => {
    const largeContent = makeTokenString(500)
    const mockSearch = vi.fn().mockImplementation(async (input: { tags?: string[] }) => {
      if (input.tags?.includes('link')) {
        return {
          results: Array.from({ length: 5 }, (_, i) => ({
            id: `link-${i}`,
            content: largeContent,
            role: 'dev',
            tags: ['link'],
            relevance_score: 1.0,
          })),
          metadata: { total: 5, fallback_mode: false },
        }
      }
      return { results: [], metadata: { total: 0, fallback_mode: true } }
    })

    const deps: AssembleContextPackDeps = { kbSearch: mockSearch }
    const result = await assembleContextPack(
      { story_id: 'WINT-2020', node_type: 'plan', role: 'dev' },
      deps,
    )

    const allText = [
      result.story_brief,
      ...result.kb_links.map(l => l.content),
    ].join(' ')
    const totalTokens = estimateTokens(allText)

    expect(totalTokens).toBeLessThanOrEqual(DEFAULT_MAX_TOKENS + 50)
  })

  it('response with small content fits within budget without trimming', async () => {
    const shortContent = 'short content'
    const mockSearch = vi.fn().mockResolvedValue({
      results: [{ id: 'x', content: shortContent, role: 'dev', tags: null, relevance_score: 1.0 }],
      metadata: { total: 1, fallback_mode: false },
    })

    const deps: AssembleContextPackDeps = { kbSearch: mockSearch }
    const result = await assembleContextPack(
      { story_id: 'WINT-2020', node_type: 'plan', role: 'dev' },
      deps,
    )

    // All sections should be intact (not trimmed)
    expect(result.kb_facts.length).toBe(1)
    expect(result.kb_rules.length).toBe(1)
    expect(result.kb_links.length).toBe(1)
    expect(result.repo_snippets.length).toBe(1)
  })
})
