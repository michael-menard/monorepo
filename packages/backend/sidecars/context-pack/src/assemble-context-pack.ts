/**
 * assembleContextPack - Cache-First Context Pack Assembly
 * WINT-2020: Create Context Pack Sidecar
 *
 * Cache-first strategy:
 * 1. Generate packKey as '{story_id}:{node_type}:{role}'
 * 2. Check contextPacks table for a hit — return if found (not expired)
 * 3. On miss: call kbSearch for each category
 * 4. Apply token budget trimming (repo_snippets first, then kb_links)
 * 5. contextCachePut non-blocking (log warning on failure, continue)
 * 6. Return assembled pack with empty arrays for missing sections
 *
 * Note: Direct DB access used here to avoid circular dependency with @repo/mcp-tools.
 * (mcp-tools -> context-pack-sidecar -> mcp-tools would be circular)
 */

import { eq, and, gt, or, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/src/db'
import {
  ContextPackRequestSchema,
  ContextPackResponseSchema,
  DEFAULT_TTL,
  DEFAULT_MAX_TOKENS,
  estimateTokens,
  type ContextPackRequest,
  type ContextPackResponse,
  type KbFactEntry,
} from './__types__/index.js'

// ============================================================================
// Injectable KB Search Dependency
// ============================================================================

/**
 * A single search result entry from KB search.
 * Using Zod schema per CLAUDE.md — no TypeScript interfaces.
 */
export const KbSearchResultEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.string(),
  tags: z.array(z.string()).nullable(),
  relevance_score: z.number().optional(),
})

export type KbSearchResultEntry = z.infer<typeof KbSearchResultEntrySchema>

/**
 * Result from a KB search call.
 * Using Zod schema per CLAUDE.md — no TypeScript interfaces.
 */
export const KbSearchResultSchema = z.object({
  results: z.array(KbSearchResultEntrySchema),
  metadata: z.object({
    total: z.number(),
    fallback_mode: z.boolean(),
  }),
})

export type KbSearchResult = z.infer<typeof KbSearchResultSchema>

/**
 * Injectable KB search function signature.
 * Matches the shape of kb_search from apps/api/knowledge-base.
 */
export type KbSearchFn = (input: {
  query: string
  role?: string
  tags?: string[]
  limit?: number
}) => Promise<KbSearchResult>

/**
 * Dependencies for assembleContextPack.
 * kbSearch is injectable for testability.
 * Using Zod schema per CLAUDE.md — no TypeScript interfaces.
 */
export const AssembleContextPackDepsSchema = z.object({
  kbSearch: z.function(),
})

export type AssembleContextPackDeps = {
  kbSearch: KbSearchFn
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Convert KB search results to KbFactEntry array.
 */
function toKbFactEntries(results: KbSearchResultEntry[]): KbFactEntry[] {
  return results.map(r => ({
    id: r.id,
    content: r.content,
    relevance_score: r.relevance_score,
    tags: r.tags ?? undefined,
  }))
}

/**
 * Calculate total tokens for a ContextPackResponse.
 */
function calcTotalTokens(pack: ContextPackResponse): number {
  const allText = [
    pack.story_brief,
    ...pack.kb_facts.map(f => f.content),
    ...pack.kb_rules.map(r => r.content),
    ...pack.kb_links.map(l => l.content),
    ...pack.repo_snippets.map(s => s.content),
  ].join(' ')
  return estimateTokens(allText)
}

/**
 * Trim sections to fit within maxTokens budget.
 * Trims repo_snippets first, then kb_links.
 */
function applyTokenBudget(pack: ContextPackResponse, maxTokens: number): ContextPackResponse {
  let trimmed = { ...pack }

  // Trim from the end of repo_snippets first
  while (calcTotalTokens(trimmed) > maxTokens && trimmed.repo_snippets.length > 0) {
    trimmed = {
      ...trimmed,
      repo_snippets: trimmed.repo_snippets.slice(0, -1),
    }
  }

  // Then trim from the end of kb_links
  while (calcTotalTokens(trimmed) > maxTokens && trimmed.kb_links.length > 0) {
    trimmed = {
      ...trimmed,
      kb_links: trimmed.kb_links.slice(0, -1),
    }
  }

  return trimmed
}

/**
 * Get a valid (non-expired) context pack from the cache.
 * Returns null on miss, expired entry, or DB error.
 */
async function getCachedPack(packKey: string): Promise<ContextPackResponse | null> {
  try {
    const [pack] = await db
      .select()
      .from(contextPacks)
      .where(
        and(
          eq(contextPacks.packType, 'story'),
          eq(contextPacks.packKey, packKey),
          or(gt(contextPacks.expiresAt, sql`NOW()`), isNull(contextPacks.expiresAt))!,
        ),
      )
      .limit(1)

    if (!pack) {
      return null
    }

    // Atomically increment hitCount
    await db
      .update(contextPacks)
      .set({
        hitCount: sql`${contextPacks.hitCount} + 1`,
        lastHitAt: sql`NOW()`,
      })
      .where(eq(contextPacks.id, pack.id))

    const parsed = ContextPackResponseSchema.safeParse(pack.content)
    if (parsed.success) {
      return parsed.data
    }

    logger.warn('[context-pack] Cached content failed schema validation', { packKey })
    return null
  } catch (error) {
    logger.warn('[context-pack] Cache get failed', {
      error: (error instanceof Error ? error.message : null) ?? String(error),
      packKey,
    })
    return null
  }
}

/**
 * Write assembled pack to cache (non-blocking).
 */
function writeCacheAsync(packKey: string, pack: ContextPackResponse, ttl: number): void {
  // SEC-001: Use parameterized interval to prevent SQL injection from user-controlled ttl.
  // ttl is validated as a positive integer by ContextPackRequestSchema, but we avoid sql.raw()
  // entirely by using the interval multiplication form supported by PostgreSQL.
  const expiresAt = sql`NOW() + (${ttl} * '1 second'::INTERVAL)`

  // Validate pack before storing — ensures JSONB content matches expected schema
  const validatedPack = ContextPackResponseSchema.parse(pack)

  db.insert(contextPacks)
    .values({
      packType: 'story',
      packKey,
      content: validatedPack,
      version: 1,
      expiresAt,
      hitCount: 0,
    })
    .onConflictDoUpdate({
      target: [contextPacks.packType, contextPacks.packKey],
      set: {
        content: validatedPack,
        version: 1,
        expiresAt,
        updatedAt: sql`NOW()`,
      },
    })
    .catch(error => {
      logger.warn('[context-pack] contextCachePut failed (non-blocking)', {
        error: (error instanceof Error ? error.message : null) ?? String(error),
        packKey,
      })
    })
}

// ============================================================================
// Main function
// ============================================================================

/**
 * Assemble a context pack for the given request, using cache-first strategy.
 *
 * @param input - Request with story_id, node_type, role, optional ttl
 * @param deps - Injectable dependencies (kbSearch function)
 * @returns Assembled context pack
 */
export async function assembleContextPack(
  input: ContextPackRequest,
  deps: AssembleContextPackDeps,
): Promise<ContextPackResponse> {
  // Validate input
  const validated = ContextPackRequestSchema.parse(input)
  const { story_id, node_type, role, ttl } = validated

  // Generate cache key
  const packKey = `${story_id}:${node_type}:${role}`

  logger.info('[context-pack] assembleContextPack called', { story_id, node_type, role, packKey })

  // ── Cache hit path ──
  const cached = await getCachedPack(packKey)
  if (cached) {
    logger.info('[context-pack] Cache hit', { packKey })
    return cached
  }

  // ── Cache miss path — assemble from KB ──
  logger.info('[context-pack] Cache miss, assembling from KB', { packKey })

  const storyQuery = `story ${story_id} ${node_type}`

  // Run all KB search categories in parallel
  const [factsResult, rulesResult, linksResult, snippetsResult] = await Promise.allSettled([
    deps.kbSearch({ query: storyQuery, role, tags: ['kb_facts', 'fact'], limit: 10 }),
    deps.kbSearch({ query: storyQuery, role, tags: ['kb_rules', 'rule'], limit: 10 }),
    deps.kbSearch({ query: storyQuery, role, tags: ['kb_links', 'link'], limit: 10 }),
    deps.kbSearch({ query: storyQuery, role, tags: ['repo_snippets', 'snippet'], limit: 10 }),
  ])

  const kbFacts =
    factsResult.status === 'fulfilled' ? toKbFactEntries(factsResult.value.results) : []
  const kbRules =
    rulesResult.status === 'fulfilled' ? toKbFactEntries(rulesResult.value.results) : []
  const kbLinks =
    linksResult.status === 'fulfilled' ? toKbFactEntries(linksResult.value.results) : []
  const repoSnippets =
    snippetsResult.status === 'fulfilled' ? toKbFactEntries(snippetsResult.value.results) : []

  if (factsResult.status === 'rejected') {
    logger.warn('[context-pack] kb_facts search failed', {
      error:
        factsResult.reason instanceof Error
          ? factsResult.reason.message
          : String(factsResult.reason),
    })
  }
  if (rulesResult.status === 'rejected') {
    logger.warn('[context-pack] kb_rules search failed', {
      error:
        rulesResult.reason instanceof Error
          ? rulesResult.reason.message
          : String(rulesResult.reason),
    })
  }
  if (linksResult.status === 'rejected') {
    logger.warn('[context-pack] kb_links search failed', {
      error:
        linksResult.reason instanceof Error
          ? linksResult.reason.message
          : String(linksResult.reason),
    })
  }
  if (snippetsResult.status === 'rejected') {
    logger.warn('[context-pack] repo_snippets search failed', {
      error:
        snippetsResult.reason instanceof Error
          ? snippetsResult.reason.message
          : String(snippetsResult.reason),
    })
  }

  // Assemble pack
  const rawPack: ContextPackResponse = {
    story_brief: `Context pack for story ${story_id} — node: ${node_type}, role: ${role}`,
    kb_facts: kbFacts,
    kb_rules: kbRules,
    kb_links: kbLinks,
    repo_snippets: repoSnippets,
  }

  // Apply token budget enforcement
  const pack = applyTokenBudget(rawPack, DEFAULT_MAX_TOKENS)

  // ── Non-blocking cache write ──
  writeCacheAsync(packKey, pack, ttl ?? DEFAULT_TTL)

  logger.info('[context-pack] Context pack assembled', {
    packKey,
    kbFactsCount: pack.kb_facts.length,
    kbRulesCount: pack.kb_rules.length,
    kbLinksCount: pack.kb_links.length,
    repoSnippetsCount: pack.repo_snippets.length,
  })

  return pack
}
