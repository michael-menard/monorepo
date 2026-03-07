/**
 * Populate Domain Knowledge Cache
 *
 * Reads ADR-LOG.md from plans/stories/ and queries the KB database (port 5433)
 * for lessons learned and blockers, then writes structured cache entries to
 * wint.context_packs via contextCachePut().
 *
 * Produces 6 packs:
 * - architecture/active-adrs      (from ADR-LOG.md)
 * - lessons_learned/lessons-backend
 * - lessons_learned/lessons-frontend
 * - lessons_learned/lessons-testing
 * - lessons_learned/lessons-workflow
 * - lessons_learned/blockers-known (constraint/blocker KB entries)
 *
 * Content is capped at 8000 chars per pack (JSON.stringify).
 *
 * @example Run from monorepo root
 * ```bash
 * pnpm tsx packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts
 * ```
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 * (lego_dev at port 5432 — NOT the KB database at port 5433)
 *
 * @requires KB_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/lego_kb
 * (Knowledge Base at port 5433 — injectable via kbQueryFn for testability)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { contextCachePut } from '../context-cache/context-cache-put.js'
import { readDoc as readDocUtil } from './utils/read-doc.js'

// TTL: 30 days in seconds
const TTL_30_DAYS = 2592000

// Max JSON string length per pack before trimming
const MAX_CONTENT_CHARS = 8000

// ============================================================================
// Zod Schemas
// ============================================================================

/** Summary results returned from populateDomainKb() */
export const PopulateResultSchema = z.object({
  attempted: z.number(),
  succeeded: z.number(),
  failed: z.number(),
})
export type PopulateResult = z.infer<typeof PopulateResultSchema>

/** Single ADR entry extracted from ADR-LOG.md */
export const AdrEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  date: z.string(),
  decision: z.string(),
})
export type AdrEntry = z.infer<typeof AdrEntrySchema>

/** A single KB entry (lesson, blocker, or constraint) */
export const KbEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  entry_type: z.string().optional(),
  tags: z.array(z.string()).nullable().optional(),
})
export type KbEntry = z.infer<typeof KbEntrySchema>

/** Result from kbQueryFn */
export const KbQueryResultSchema = z.object({
  entries: z.array(KbEntrySchema),
})
export type KbQueryResult = z.infer<typeof KbQueryResultSchema>

/**
 * Injectable KB query function signature.
 * Default implementation queries KB_DATABASE_URL (port 5433).
 * Tests pass a mock function — no real port 5433 connection needed in CI.
 */
export type KbQueryFn = (opts: {
  entryType?: string
  tag?: string
  limit?: number
}) => Promise<KbQueryResult>

/**
 * Options for populateDomainKb()
 * kbQueryFn is injectable for testability (AC-9)
 */
export const PopulateDomainKbOptsSchema = z.object({
  kbQueryFn: z.function().optional(),
})
export type PopulateDomainKbOpts = {
  kbQueryFn?: KbQueryFn
}

// ============================================================================
// File helpers
// ============================================================================

const CALLER_TAG = '[populate-domain-kb]'

/**
 * Reads a file relative to the monorepo root. Returns null if not found.
 */
function readDoc(relPath: string): string | null {
  return readDocUtil(relPath, CALLER_TAG)
}

/**
 * Extract sections from a markdown file by ## heading.
 * Returns a map of heading → content.
 */
function extractSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {}
  let currentHeading = '__preamble__'
  let buffer: string[] = []

  for (const line of raw.split('\n')) {
    if (line.startsWith('## ')) {
      if (buffer.length > 0) {
        sections[currentHeading] = buffer.join('\n').trim()
      }
      currentHeading = line.replace(/^##\s+/, '').trim()
      buffer = []
    } else {
      buffer.push(line)
    }
  }

  if (buffer.length > 0) {
    sections[currentHeading] = buffer.join('\n').trim()
  }

  return sections
}

// ============================================================================
// Content cap helper
// ============================================================================

/**
 * Trims content if JSON.stringify length exceeds MAX_CONTENT_CHARS.
 * Truncates arrays from the end until within limit.
 */
function capContent(content: Record<string, unknown>): Record<string, unknown> {
  if (JSON.stringify(content).length < MAX_CONTENT_CHARS) {
    return content
  }

  logger.warn('[populate-domain-kb] Content exceeds 8000 chars, trimming', {
    originalLength: JSON.stringify(content).length,
  })

  // Find array fields to trim
  const trimmed = { ...content }
  const arrayKeys = Object.keys(trimmed).filter(k => Array.isArray(trimmed[k]))

  for (const key of arrayKeys) {
    const arr = trimmed[key] as unknown[]
    while (arr.length > 0 && JSON.stringify(trimmed).length >= MAX_CONTENT_CHARS) {
      arr.pop()
    }
    trimmed[key] = arr
    if (JSON.stringify(trimmed).length < MAX_CONTENT_CHARS) break
  }

  return trimmed
}

// ============================================================================
// ADR-LOG.md reader
// ============================================================================

/**
 * Parse ADR entries from ADR-LOG.md.
 * Extracts each ## ADR-NNN section with id, title, status, date, decision.
 */
export function extractAdrEntries(raw: string): AdrEntry[] {
  const sections = extractSections(raw)
  const adrs: AdrEntry[] = []

  for (const [heading, body] of Object.entries(sections)) {
    // Match "ADR-001: Some Title" pattern
    const match = heading.match(/^(ADR-\d+):\s*(.+)$/)
    if (!match) continue

    const id = match[1]!
    const title = match[2]!

    // Extract Status from body
    const statusMatch = body.match(/\*\*Status\*\*:\s*(.+)/i)
    const status = statusMatch ? statusMatch[1]!.trim() : 'Unknown'

    // Extract Date from body
    const dateMatch = body.match(/\*\*Date\*\*:\s*(.+)/i)
    const date = dateMatch ? dateMatch[1]!.trim() : 'Unknown'

    // Extract Decision section or first paragraph
    const decisionSectionMatch = body.match(/###\s*Decision\s*\n([\s\S]+?)(?=\n###|\n##|$)/i)
    let decision: string
    if (decisionSectionMatch) {
      decision = decisionSectionMatch[1]!.trim().slice(0, 500)
    } else {
      // Fallback: take first non-empty paragraph
      const firstPara = body.split('\n\n').find(p => p.trim().length > 10) ?? ''
      decision = firstPara.trim().slice(0, 500)
    }

    adrs.push({ id, title, status, date, decision })
  }

  return adrs
}

/**
 * Extract ADR pack content from ADR-LOG.md.
 * packType: architecture, packKey: active-adrs
 */
export function extractAdrPack(raw: string): Record<string, unknown> {
  const allAdrs = extractAdrEntries(raw)
  const activeAdrs = allAdrs.filter(a => a.status.toLowerCase().includes('active'))

  const summary =
    `Active Architecture Decision Records for the LEGO MOC platform. ` +
    `${activeAdrs.length} active ADRs covering API paths, infrastructure, auth, and testing strategy.`

  return capContent({
    summary,
    adrs: activeAdrs.length > 0 ? activeAdrs : allAdrs,
    totalAdrs: allAdrs.length,
    activeCount: activeAdrs.length,
  })
}

// ============================================================================
// KB query helpers
// ============================================================================

/**
 * Domain areas for lessons grouping
 */
const DOMAIN_AREAS = ['backend', 'frontend', 'testing', 'workflow'] as const
type DomainArea = (typeof DOMAIN_AREAS)[number]

/**
 * Keywords/tags per domain for KB filtering
 */
const DOMAIN_TAGS: Record<DomainArea, string[]> = {
  backend: ['backend', 'api', 'database', 'lambda', 'drizzle'],
  frontend: ['frontend', 'react', 'ui', 'component', 'tailwind'],
  testing: ['testing', 'vitest', 'playwright', 'e2e', 'unit-test'],
  workflow: ['workflow', 'pipeline', 'agent', 'langgraph', 'orchestration'],
}

/**
 * Check if a KB entry belongs to the given domain area
 */
function entryMatchesDomain(entry: KbEntry, domain: DomainArea): boolean {
  const tags = entry.tags ?? []
  const domainTags = DOMAIN_TAGS[domain]
  const contentLower = entry.content.toLowerCase()

  // Check tags first
  if (tags.some(t => domainTags.some(dt => t.toLowerCase().includes(dt)))) return true

  // Fall back to content keywords
  return domainTags.some(dt => contentLower.includes(dt))
}

/**
 * Build lessons pack content for a domain area.
 */
function buildLessonsPack(domain: DomainArea, entries: KbEntry[]): Record<string, unknown> {
  const domainEntries = entries.filter(e => entryMatchesDomain(e, domain)).slice(0, 8)

  const summary =
    domainEntries.length > 0
      ? `Lessons learned for ${domain} domain. ${domainEntries.length} entries.`
      : `No lessons found for ${domain} domain. Pack populated for cache completeness.`

  return capContent({
    summary,
    domain,
    lessons: domainEntries.map(e => ({
      id: e.id,
      content: e.content,
      tags: e.tags ?? [],
    })),
    count: domainEntries.length,
  })
}

/**
 * Build blockers-known pack from constraint/blocker KB entries.
 */
function buildBlockersPack(entries: KbEntry[]): Record<string, unknown> {
  const blockerEntries = entries
    .filter(e => {
      const isConstraint = e.entry_type === 'constraint'
      const hasBlockerTag = (e.tags ?? []).some(t => t.toLowerCase().includes('blocker'))
      const contentHasBlocker = e.content.toLowerCase().includes('block')
      return isConstraint || hasBlockerTag || contentHasBlocker
    })
    .slice(0, 8)

  const summary =
    blockerEntries.length > 0
      ? `Known blockers and constraints. ${blockerEntries.length} entries.`
      : `No active blockers found. Pack populated for cache completeness.`

  return capContent({
    summary,
    blockers: blockerEntries.map(e => ({
      id: e.id,
      content: e.content,
      entry_type: e.entry_type ?? 'unknown',
      tags: e.tags ?? [],
    })),
    count: blockerEntries.length,
  })
}

// ============================================================================
// Default KB query implementation
// ============================================================================

/**
 * Default KB query function using KB_DATABASE_URL (port 5433).
 * Uses a raw HTTP fetch to avoid pg/types dependencies.
 * Tests pass a mock via kbQueryFn — no real port 5433 needed in CI (AC-9).
 *
 * Note: The real KB query uses a direct PostgreSQL connection via pg.
 * We use dynamic import with eslint-disable to avoid @types/pg in devDependencies.
 */

async function defaultKbQueryFn(opts: {
  entryType?: string
  tag?: string
  limit?: number
}): Promise<KbQueryResult> {
  const { limit = 50 } = opts

  const kbUrl = process.env['KB_DATABASE_URL']
  if (!kbUrl) {
    throw new Error('KB_DATABASE_URL is not set — cannot query knowledge base at port 5433')
  }

  // Dynamic import of pg — available transitively via @repo/db
  // @ts-expect-error pg is a transitive runtime dependency (via @repo/db) without bundled types here

  const pgModule = (await import('pg')) as any
  const Pool = pgModule.default?.Pool ?? pgModule.Pool
  const pool = new Pool({ connectionString: kbUrl, max: 2 })

  try {
    const result: { rows: any[] } = await pool.query(
      `SELECT id::text, content, entry_type, tags FROM kb.entries LIMIT $1`,
      [limit],
    )

    return {
      entries: (result.rows as any[]).map((row: any) =>
        KbEntrySchema.parse({
          id: String(row.id),
          content: String(row.content),
          entry_type: row.entry_type != null ? String(row.entry_type) : undefined,
          tags: Array.isArray(row.tags) ? (row.tags as string[]) : null,
        }),
      ),
    }
  } finally {
    await (pool as { end(): Promise<void> }).end()
  }
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Populate domain knowledge cache from ADR-LOG.md and KB lessons.
 *
 * Writes 6 entries to wint.context_packs:
 * - architecture/active-adrs
 * - lessons_learned/lessons-backend
 * - lessons_learned/lessons-frontend
 * - lessons_learned/lessons-testing
 * - lessons_learned/lessons-workflow
 * - lessons_learned/blockers-known
 *
 * Individual failures are logged but do not abort the run.
 * kbQueryFn is injectable for testability (AC-9) — no real port 5433 needed in CI.
 *
 * @param opts - Optional injectable kbQueryFn for testing
 * @returns Summary with attempted, succeeded, failed counts
 */
export async function populateDomainKb(opts: PopulateDomainKbOpts = {}): Promise<PopulateResult> {
  const results: PopulateResult = { attempted: 0, succeeded: 0, failed: 0 }
  const kbQuery = opts.kbQueryFn ?? defaultKbQueryFn

  // ── Pack 1: architecture/active-adrs (from ADR-LOG.md) ──
  results.attempted++
  try {
    const raw = readDoc('plans/stories/ADR-LOG.md')
    if (raw === null) {
      logger.warn('[populate-domain-kb] Skipping active-adrs pack — ADR-LOG.md unreadable')
      results.failed++
    } else {
      const content = extractAdrPack(raw)
      const written = await contextCachePut({
        packType: 'architecture',
        packKey: 'active-adrs',
        content,
        ttl: TTL_30_DAYS,
      })

      if (written) {
        logger.info('[populate-domain-kb] Pack written', {
          packType: 'architecture',
          packKey: 'active-adrs',
        })
        results.succeeded++
      } else {
        logger.error('[populate-domain-kb] Pack write returned null', { packKey: 'active-adrs' })
        results.failed++
      }
    }
  } catch (error) {
    logger.error('[populate-domain-kb] Pack write failed', {
      packKey: 'active-adrs',
      error: error instanceof Error ? error.message : String(error),
    })
    results.failed++
  }

  // ── Query KB for lessons and blockers ──
  let kbEntries: KbEntry[] = []
  let kbAvailable = true

  try {
    const kbResult = await kbQuery({ limit: 100 })
    kbEntries = kbResult.entries
    logger.info('[populate-domain-kb] KB query succeeded', { count: kbEntries.length })
  } catch (error) {
    kbAvailable = false
    logger.warn('[populate-domain-kb] KB query failed — lessons and blockers packs will be empty', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // ── Packs 2-5: lessons_learned/lessons-{domain} ──
  for (const domain of DOMAIN_AREAS) {
    const packKey = `lessons-${domain}`
    results.attempted++
    try {
      const content = buildLessonsPack(domain, kbAvailable ? kbEntries : [])
      const written = await contextCachePut({
        packType: 'lessons_learned',
        packKey,
        content,
        ttl: TTL_30_DAYS,
      })

      if (written) {
        logger.info('[populate-domain-kb] Pack written', { packType: 'lessons_learned', packKey })
        results.succeeded++
      } else {
        logger.error('[populate-domain-kb] Pack write returned null', { packKey })
        results.failed++
      }
    } catch (error) {
      logger.error('[populate-domain-kb] Pack write failed', {
        packKey,
        error: error instanceof Error ? error.message : String(error),
      })
      results.failed++
    }
  }

  // ── Pack 6: lessons_learned/blockers-known ──
  results.attempted++
  try {
    const content = buildBlockersPack(kbAvailable ? kbEntries : [])
    const written = await contextCachePut({
      packType: 'lessons_learned',
      packKey: 'blockers-known',
      content,
      ttl: TTL_30_DAYS,
    })

    if (written) {
      logger.info('[populate-domain-kb] Pack written', {
        packType: 'lessons_learned',
        packKey: 'blockers-known',
      })
      results.succeeded++
    } else {
      logger.error('[populate-domain-kb] Pack write returned null', { packKey: 'blockers-known' })
      results.failed++
    }
  } catch (error) {
    logger.error('[populate-domain-kb] Pack write failed', {
      packKey: 'blockers-known',
      error: error instanceof Error ? error.message : String(error),
    })
    results.failed++
  }

  logger.info('[populate-domain-kb] Run complete', results)
  return results
}

// ============================================================================
// Script entry point
// ============================================================================

// Run as script if executed directly
const isMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.endsWith('populate-domain-kb.ts') ||
    process.argv[1]?.endsWith('populate-domain-kb.js'))

if (isMain) {
  populateDomainKb()
    .then(summary => {
      logger.info('[populate-domain-kb] Done', summary)
      process.exit(summary.failed > 0 ? 1 : 0)
    })
    .catch(err => {
      logger.error('[populate-domain-kb] Fatal error', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    })
}
