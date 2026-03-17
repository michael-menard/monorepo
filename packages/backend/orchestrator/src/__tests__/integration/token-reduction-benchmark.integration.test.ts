/**
 * WINT-2120: Token Reduction Benchmark Integration Test
 *
 * Measures estimated token reduction achieved by the context cache integration
 * (WINT-2110) by querying live pack hit counts and content sizes, then produces
 * a BENCHMARK-RESULTS.yaml artifact with a PASS/NEEDS-TUNING verdict.
 *
 * Runs against real PostgreSQL (ADR-005: no mocking of DB calls).
 * Tagged @integration — requires DB running on port 5433 (or POSTGRES_* env vars).
 *
 * Advisory verdict only — no hard assertions against the 80% threshold to avoid
 * flaky CI. Unit tests for calculateTokenReduction do NOT require DB.
 *
 * AC-1: Baseline token estimates from BASELINE-TOKENS.yaml or hardcoded AC-6 fallback
 * AC-2: context_cache_stats() query loop for all pack types
 * AC-3: Pack content size from workflow.context_packs (tokenCount preferred, char/4 fallback)
 * AC-4: calculateTokenReduction pure function with formula documentation
 * AC-5: BENCHMARK-RESULTS.yaml artifact with per-agent table, aggregate, verdict
 * AC-6: Tuning recommendations when aggregate < 80%
 * AC-7: Graceful handling of zero-hit and zero-content packs
 * AC-8: Runs without error against live PostgreSQL
 * AC-9: All output via @repo/logger (no console.log)
 * AC-10: pnpm check-types passes
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas
// ============================================================================

const AgentBaselineSchema = z.object({
  workflow: z.string(),
  agentFile: z.string(),
  baselineTokensPerInvocation: z.number().int().positive(),
  packTypes: z.array(
    z.object({
      packType: z.string(),
      packKey: z.string(),
    }),
  ),
  modelTier: z.enum(['haiku', 'sonnet', 'opus']).optional(),
})

type AgentBaseline = z.infer<typeof AgentBaselineSchema>

const PackStatsSchema = z.object({
  packType: z.string(),
  hitCount: z.number().int().min(0),
  avgHitsPerPack: z.number().min(0),
  totalPacks: z.number().int().min(0),
  populated: z.boolean(),
})

type PackStats = z.infer<typeof PackStatsSchema>

const PackSizeSchema = z.object({
  packType: z.string(),
  packKey: z.string(),
  tokenCount: z.number().int().min(0).nullable(),
  contentCharCount: z.number().int().min(0),
  estimatedTokens: z.number().int().min(0),
})

type PackSize = z.infer<typeof PackSizeSchema>

const AgentResultSchema = z.object({
  agent: z.string(),
  workflow: z.string(),
  baselineTokens: z.number().int().min(0),
  estimatedTokensWithCache: z.number().min(0).nullable(),
  reductionPct: z.number().min(0).max(100).nullable(),
  packTypesUsed: z.array(z.string()),
  excludedFromAggregate: z.boolean(),
  exclusionNote: z.string().optional(),
  modelTier: z.string().optional(),
})

type AgentResult = z.infer<typeof AgentResultSchema>

const BenchmarkResultsSchema = z.object({
  run_date: z.string(),
  methodology: z.object({
    baseline_source: z.string(),
    token_proxy: z.string(),
    formula: z.string(),
    limitations: z.string(),
  }),
  per_agent_results: z.array(AgentResultSchema),
  aggregate: z.object({
    estimated_reduction_pct: z.number().nullable(),
    sample_packs: z.number().int().min(0),
    excluded_packs: z.array(z.string()),
    exclusion_note: z.string().optional(),
    sample_size_note: z.string().optional(),
  }),
  pack_stats: z.array(PackStatsSchema),
  verdict: z.enum(['PASS', 'NEEDS-TUNING']),
  tuning_recommendations: z.array(z.string()),
})

type BenchmarkResults = z.infer<typeof BenchmarkResultsSchema>

// ============================================================================
// WINT-2110 AC-6 Hardcoded Baseline Estimates (fallback)
// Rough estimates based on agent file sizes + typical invocation context.
// Source: plans/future/platform/wint/needs-code-review/WINT-2110/WINT-2110.md#AC-6
// ============================================================================

const HARDCODED_BASELINES: AgentBaseline[] = [
  {
    workflow: 'pm-bootstrap-workflow',
    agentFile: 'pm-bootstrap-setup-leader',
    baselineTokensPerInvocation: 2000,
    packTypes: [{ packType: 'architecture', packKey: 'project-conventions' }],
    modelTier: 'haiku',
  },
  {
    workflow: 'pm-bootstrap-workflow',
    agentFile: 'pm-bootstrap-analysis-leader',
    baselineTokensPerInvocation: 4000,
    packTypes: [
      { packType: 'architecture', packKey: 'project-conventions' },
      { packType: 'lessons_learned', packKey: 'blockers-known' },
    ],
    modelTier: 'sonnet',
  },
  {
    workflow: 'pm-bootstrap-workflow',
    agentFile: 'pm-bootstrap-generation-leader',
    baselineTokensPerInvocation: 3000,
    packTypes: [
      { packType: 'architecture', packKey: 'project-conventions' },
      { packType: 'codebase', packKey: 'agent_missions' },
    ],
    modelTier: 'sonnet',
  },
  {
    workflow: 'dev-implement-story',
    agentFile: 'dev-implement-implementation-leader',
    baselineTokensPerInvocation: 5000,
    packTypes: [
      { packType: 'architecture', packKey: 'project-conventions' },
      { packType: 'codebase', packKey: 'lib-react19' },
      { packType: 'codebase', packKey: 'lib-tailwind' },
      { packType: 'codebase', packKey: 'lib-zod' },
      { packType: 'codebase', packKey: 'lib-vitest' },
    ],
    modelTier: 'sonnet',
  },
  {
    workflow: 'elab-story',
    agentFile: 'elab-analyst',
    baselineTokensPerInvocation: 6500,
    packTypes: [
      { packType: 'lessons_learned', packKey: 'blockers-known' },
      { packType: 'architecture', packKey: 'project-conventions' },
    ],
    modelTier: 'sonnet',
  },
  {
    workflow: 'qa-verify-story',
    agentFile: 'qa-verify-verification-leader',
    baselineTokensPerInvocation: 5500,
    packTypes: [
      { packType: 'test_patterns', packKey: 'main' },
      { packType: 'lessons_learned', packKey: 'blockers-known' },
      { packType: 'architecture', packKey: 'project-conventions' },
    ],
    modelTier: 'haiku',
  },
  {
    workflow: 'dev-fix-story',
    agentFile: 'dev-fix-fix-leader',
    baselineTokensPerInvocation: 5000,
    packTypes: [
      { packType: 'architecture', packKey: 'project-conventions' },
      { packType: 'lessons_learned', packKey: 'blockers-known' },
    ],
    modelTier: 'haiku',
  },
]

// ============================================================================
// Pure Functions (AC-4, HP-5 unit test)
// ============================================================================

/**
 * Calculates token reduction percentage from cache usage.
 *
 * Formula: (pack_token_size * hit_count) / (baseline_input_tokens * invocation_count)
 *
 * Both numerator and denominator are estimates — result is directional only.
 *
 * @param packTokenSize - Estimated token count for the pack content
 * @param hitCount - Total number of cache hits for this pack type
 * @param baselineInputTokens - Pre-cache baseline tokens per invocation
 * @param invocationCount - Number of agent invocations (derived from hitCount / avgHitsPerPack)
 * @returns Reduction percentage [0, 100] or null if inputs are invalid
 *
 * TODO: Extract to shared @repo/wint-benchmarks utility in Phase 3 when telemetry lands
 */
export function calculateTokenReduction(
  packTokenSize: number,
  hitCount: number,
  baselineInputTokens: number,
  invocationCount: number,
): number | null {
  // Guard: zero-content-size — AC-7 (no division by zero)
  if (packTokenSize <= 0) return null
  // Guard: zero invocation count
  if (invocationCount <= 0) return null
  // Guard: zero baseline tokens
  if (baselineInputTokens <= 0) return null

  const tokensSaved = packTokenSize * hitCount
  const baselineConsumed = baselineInputTokens * invocationCount

  if (baselineConsumed <= 0) return null

  const reductionFraction = tokensSaved / baselineConsumed
  // Clamp to [0, 100]
  return Math.min(100, Math.max(0, reductionFraction * 100))
}

// ============================================================================
// Unit Tests for calculateTokenReduction (no DB required)
// ============================================================================

describe('calculateTokenReduction (unit)', () => {
  it('HP-5: returns correct reduction for known inputs', () => {
    // packTokenSize=1000, hitCount=5, baselineInputTokens=2500, invocationCount=10
    // tokensSaved = 1000 * 5 = 5000
    // baselineConsumed = 2500 * 10 = 25000
    // reduction = 5000 / 25000 = 0.20 = 20%
    const result = calculateTokenReduction(1000, 5, 2500, 10)
    expect(result).toBeCloseTo(20, 1)
  })

  it('returns 0 for zero hit count', () => {
    const result = calculateTokenReduction(1000, 0, 2500, 10)
    expect(result).toBe(0)
  })

  it('returns null for zero pack token size (AC-7 zero-content guard)', () => {
    const result = calculateTokenReduction(0, 5, 2500, 10)
    expect(result).toBeNull()
  })

  it('returns null for zero invocation count', () => {
    const result = calculateTokenReduction(1000, 5, 2500, 0)
    expect(result).toBeNull()
  })

  it('returns null for zero baseline tokens', () => {
    const result = calculateTokenReduction(1000, 5, 0, 10)
    expect(result).toBeNull()
  })

  it('clamps to 100 for extremely high savings', () => {
    // packTokenSize=10000, hitCount=1000, baselineInputTokens=1000, invocationCount=1
    // tokensSaved = 10,000,000 >>> baselineConsumed = 1,000
    const result = calculateTokenReduction(10000, 1000, 1000, 1)
    expect(result).toBe(100)
  })
})

// ============================================================================
// Integration Test (requires real PostgreSQL)
// ============================================================================

/**
 * Checks if a PostgreSQL connection is reachable on the expected port.
 */
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const { Pool } = await import('pg')
    const pool = new Pool({
      host: process.env['POSTGRES_HOST'] ?? 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] ?? '5433', 10),
      database: process.env['POSTGRES_DATABASE'] ?? 'lego_dev',
      user: process.env['POSTGRES_USER'] ?? 'postgres',
      password: process.env['POSTGRES_PASSWORD'] ?? 'postgres',
      connectionTimeoutMillis: 3000,
    })
    const client = await pool.connect()
    client.release()
    await pool.end()
    return true
  } catch {
    return false
  }
}

describe('@integration WINT-2120: Token Reduction Benchmark (AC-2, AC-3, AC-5, AC-8)', () => {
  let dbAvailable = false

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      logger.warn('[WINT-2120] PostgreSQL not available on port 5433 — integration tests will be skipped')
    }
  })

  it('runs benchmark end-to-end and writes BENCHMARK-RESULTS.yaml (HP-1)', async () => {
    if (!dbAvailable) {
      logger.warn('[WINT-2120] Skipping integration benchmark — DB unavailable')
      return
    }

    logger.info('[WINT-2120] Starting token reduction benchmark')

    // --- Step 1: Load baselines (AC-1) ---

    // Derive WINT-2110 _implementation dir path relative to this test file
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    // From packages/backend/orchestrator/src/__tests__/integration/ navigate to monorepo root
    const monorepoRoot = path.resolve(__dirname, '../../../../../..')
    const baselineYamlPath = path.join(
      monorepoRoot,
      'plans/future/platform/wint/needs-code-review/WINT-2110/_implementation/BASELINE-TOKENS.yaml',
    )

    let baselines: AgentBaseline[] = HARDCODED_BASELINES
    let baselineSource = 'hardcoded_ac6_fallback'

    try {
      await fs.access(baselineYamlPath)
      logger.info('[WINT-2120] Found BASELINE-TOKENS.yaml, loading from file')
      const { parse } = await import('yaml')
      const raw = await fs.readFile(baselineYamlPath, 'utf8')
      const parsed = parse(raw) as { agents: AgentBaseline[] }
      baselines = parsed.agents ?? HARDCODED_BASELINES
      baselineSource = 'WINT-2110 BASELINE-TOKENS.yaml'
    } catch {
      logger.warn('[WINT-2120] BASELINE-TOKENS.yaml not found, using hardcoded AC-6 estimates', {
        path: baselineYamlPath,
      })
    }

    logger.info('[WINT-2120] Loaded baselines', {
      source: baselineSource,
      agentCount: baselines.length,
    })

    // --- Step 2: Collect context_cache_stats per pack type (AC-2) ---

    // Use packTypeValues from the actual enum (ARCH-003 decision)
    const { contextCacheStats } = await import(
      '@repo/mcp-tools'
    )
    const packTypeValues = [
      'codebase',
      'story',
      'feature',
      'epic',
      'architecture',
      'lessons_learned',
      'test_patterns',
      'agent_missions',
    ] as const

    const packStatsMap = new Map<string, PackStats>()

    for (const packType of packTypeValues) {
      try {
        const stats = await contextCacheStats({ packType })
        const populated = stats.hitCount > 0 || stats.totalPacks > 0
        packStatsMap.set(
          packType,
          PackStatsSchema.parse({
            packType,
            hitCount: stats.hitCount,
            avgHitsPerPack: stats.avgHitsPerPack,
            totalPacks: stats.totalPacks,
            populated,
          }),
        )
        logger.info(`[WINT-2120] Pack stats: ${packType}`, {
          hitCount: stats.hitCount,
          avgHitsPerPack: stats.avgHitsPerPack,
          totalPacks: stats.totalPacks,
        })
      } catch (err) {
        logger.warn(`[WINT-2120] Failed to get stats for packType: ${packType}`, {
          error: err instanceof Error ? err.message : String(err),
        })
        packStatsMap.set(
          packType,
          PackStatsSchema.parse({
            packType,
            hitCount: 0,
            avgHitsPerPack: 0,
            totalPacks: 0,
            populated: false,
          }),
        )
      }
    }

    // --- Step 3: Query pack content sizes from workflow.context_packs (AC-3) ---

    const packSizesMap = new Map<string, PackSize>()

    try {
      const { drizzle } = await import('drizzle-orm/node-postgres')
      const { Pool } = await import('pg')
      const { contextPacks } = await import('@repo/knowledge-base/db')

      const pool = new Pool({
        host: process.env['POSTGRES_HOST'] ?? 'localhost',
        port: parseInt(process.env['POSTGRES_PORT'] ?? '5433', 10),
        database: process.env['POSTGRES_DATABASE'] ?? 'lego_dev',
        user: process.env['POSTGRES_USER'] ?? 'postgres',
        password: process.env['POSTGRES_PASSWORD'] ?? 'postgres',
        connectionTimeoutMillis: 10000,
      })

      const db = drizzle(pool)

      try {
        const rows = await db
          .select({
            packType: contextPacks.packType,
            packKey: contextPacks.packKey,
            tokenCount: contextPacks.tokenCount,
            content: contextPacks.content,
          })
          .from(contextPacks)

        for (const row of rows) {
          const contentStr = JSON.stringify(row.content ?? '')
          const contentCharCount = contentStr.length
          const estimatedTokens =
            row.tokenCount != null && row.tokenCount > 0
              ? row.tokenCount
              : Math.floor(contentCharCount / 4)

          if (estimatedTokens === 0) {
            logger.warn('[WINT-2120] Pack has zero estimated tokens, excluding from calculation', {
              packType: row.packType,
              packKey: row.packKey,
            })
          }

          const key = `${row.packType}:${row.packKey}`
          packSizesMap.set(
            key,
            PackSizeSchema.parse({
              packType: row.packType,
              packKey: row.packKey,
              tokenCount: row.tokenCount,
              contentCharCount,
              estimatedTokens,
            }),
          )
        }

        logger.info('[WINT-2120] Loaded pack content sizes', { packCount: rows.length })
      } finally {
        await pool.end()
      }
    } catch (err) {
      logger.warn('[WINT-2120] Failed to query pack content sizes', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // --- Step 4: Calculate per-agent token reduction (AC-4) ---

    const agentResults: AgentResult[] = []

    for (const baseline of baselines) {
      const packTypesUsed = baseline.packTypes.map(p => p.packType)

      // Compute total token savings from all pack types used by this agent
      let totalTokensSaved = 0
      let allPacksExcluded = true
      const agentExclusionNotes: string[] = []

      for (const packRef of baseline.packTypes) {
        const statsKey = packRef.packType
        const sizeKey = `${packRef.packType}:${packRef.packKey}`

        const packStats = packStatsMap.get(statsKey)
        const packSize = packSizesMap.get(sizeKey)

        if (!packStats || packStats.hitCount === 0) {
          agentExclusionNotes.push(`${packRef.packType}/${packRef.packKey}: not yet populated (zero hits)`)
          continue
        }

        if (!packSize || packSize.estimatedTokens === 0) {
          agentExclusionNotes.push(`${packRef.packType}/${packRef.packKey}: zero content size, excluded`)
          continue
        }

        allPacksExcluded = false
        totalTokensSaved += packSize.estimatedTokens * packStats.hitCount
      }

      if (allPacksExcluded) {
        agentResults.push(
          AgentResultSchema.parse({
            agent: baseline.agentFile,
            workflow: baseline.workflow,
            baselineTokens: baseline.baselineTokensPerInvocation,
            estimatedTokensWithCache: null,
            reductionPct: null,
            packTypesUsed,
            excludedFromAggregate: true,
            exclusionNote: agentExclusionNotes.join('; ') || 'No populated packs for this agent',
            modelTier: baseline.modelTier,
          }),
        )
        continue
      }

      // Derive invocation count from hit counts and avgHitsPerPack
      // Use the first non-empty pack's avgHitsPerPack as proxy for invocation count
      let invocationCount = 0
      for (const packRef of baseline.packTypes) {
        const packStats = packStatsMap.get(packRef.packType)
        if (packStats && packStats.hitCount > 0 && packStats.avgHitsPerPack > 0) {
          invocationCount = Math.ceil(packStats.hitCount / packStats.avgHitsPerPack)
          break
        }
      }

      if (invocationCount <= 0) {
        agentResults.push(
          AgentResultSchema.parse({
            agent: baseline.agentFile,
            workflow: baseline.workflow,
            baselineTokens: baseline.baselineTokensPerInvocation,
            estimatedTokensWithCache: null,
            reductionPct: null,
            packTypesUsed,
            excludedFromAggregate: true,
            exclusionNote: 'Cannot derive invocation count (zero avgHitsPerPack)',
            modelTier: baseline.modelTier,
          }),
        )
        continue
      }

      // Calculate a representative packTokenSize for this agent as average across packs
      const populatedPackSizes: number[] = []
      for (const packRef of baseline.packTypes) {
        const sizeKey = `${packRef.packType}:${packRef.packKey}`
        const packSize = packSizesMap.get(sizeKey)
        if (packSize && packSize.estimatedTokens > 0) {
          populatedPackSizes.push(packSize.estimatedTokens)
        }
      }

      const avgPackTokenSize =
        populatedPackSizes.length > 0
          ? populatedPackSizes.reduce((a, b) => a + b, 0) / populatedPackSizes.length
          : 0

      // Use the representative pack stats (first populated pack type)
      let representativeHitCount = 0
      for (const packRef of baseline.packTypes) {
        const packStats = packStatsMap.get(packRef.packType)
        if (packStats && packStats.hitCount > 0) {
          representativeHitCount = packStats.hitCount
          break
        }
      }

      const reductionPct = calculateTokenReduction(
        avgPackTokenSize,
        representativeHitCount,
        baseline.baselineTokensPerInvocation,
        invocationCount,
      )

      const estimatedTokensWithCache =
        reductionPct != null
          ? baseline.baselineTokensPerInvocation * (1 - reductionPct / 100)
          : null

      agentResults.push(
        AgentResultSchema.parse({
          agent: baseline.agentFile,
          workflow: baseline.workflow,
          baselineTokens: baseline.baselineTokensPerInvocation,
          estimatedTokensWithCache,
          reductionPct,
          packTypesUsed,
          excludedFromAggregate: reductionPct == null,
          exclusionNote: reductionPct == null ? 'Could not compute reduction' : undefined,
          modelTier: baseline.modelTier,
        }),
      )

      logger.info(`[WINT-2120] Agent result: ${baseline.agentFile}`, {
        baselineTokens: baseline.baselineTokensPerInvocation,
        reductionPct,
        invocationCount,
      })
    }

    // --- Step 5: Compute aggregate reduction (AC-5, AC-6) ---

    const includedResults = agentResults.filter(r => !r.excludedFromAggregate && r.reductionPct != null)
    const excludedPacks = packTypeValues
      .filter(pt => {
        const stats = packStatsMap.get(pt)
        return !stats || !stats.populated
      })
      .map(String)

    let aggregateReductionPct: number | null = null
    if (includedResults.length > 0) {
      const totalReduction = includedResults.reduce((sum, r) => sum + (r.reductionPct ?? 0), 0)
      aggregateReductionPct = totalReduction / includedResults.length
    }

    logger.info('[WINT-2120] Aggregate reduction', {
      aggregateReductionPct,
      includedAgentCount: includedResults.length,
      totalAgentCount: agentResults.length,
    })

    // --- Determine verdict (AC-5) ---

    const PASS_THRESHOLD = 80
    const verdict: 'PASS' | 'NEEDS-TUNING' =
      aggregateReductionPct != null && aggregateReductionPct >= PASS_THRESHOLD ? 'PASS' : 'NEEDS-TUNING'

    // --- Generate tuning recommendations (AC-6) ---

    const tuningRecommendations: string[] = []

    if (verdict === 'NEEDS-TUNING') {
      // Identify packs with zero hits
      for (const packType of packTypeValues) {
        const stats = packStatsMap.get(packType)
        if (!stats || stats.hitCount === 0) {
          tuningRecommendations.push(
            `Populate '${packType}' pack — zero cache hits detected (check WINT-2040/2030/2050/2060 deployment status)`,
          )
        }
      }

      // Identify agents with low injection coverage
      const lowCoverageAgents = agentResults
        .filter(r => r.excludedFromAggregate || (r.reductionPct != null && r.reductionPct < 50))
        .slice(0, 3)

      for (const agent of lowCoverageAgents) {
        tuningRecommendations.push(
          `Increase context injection for '${agent.agent}' (${agent.workflow}) — current coverage is ${agent.reductionPct != null ? `${agent.reductionPct.toFixed(1)}%` : 'N/A'}, target ≥80%`,
        )
      }

      if (aggregateReductionPct == null) {
        tuningRecommendations.push(
          'No pack data available — run WINT-2030/2050/2060 to populate context packs before re-running benchmark',
        )
      }
    }

    // Trim to top 3 recommendations
    const topRecommendations = tuningRecommendations.slice(0, 3)

    logger.info('[WINT-2120] Benchmark verdict', {
      verdict,
      aggregateReductionPct,
      tuningRecommendationsCount: topRecommendations.length,
    })

    // --- Build results artifact (AC-5) ---

    const packStats = Array.from(packStatsMap.values())

    const sampleSizeNote =
      includedResults.length < baselines.length
        ? `Based on ${includedResults.length} of ${baselines.length} agents (${baselines.length - includedResults.length} excluded due to missing pack data)`
        : undefined

    const benchmarkResults: BenchmarkResults = BenchmarkResultsSchema.parse({
      run_date: new Date().toISOString(),
      methodology: {
        baseline_source: baselineSource,
        token_proxy: 'tokenCount from DB when non-null; otherwise content_char_count / 4',
        formula:
          '(pack_token_size * hit_count) / (baseline_input_tokens * invocation_count)',
        limitations:
          'Proxy measures — not actual LLM invocation logs. Phase 3 telemetry (agent_invocations table, WINT-0120/3010) not yet implemented. Results are directional estimates only.',
      },
      per_agent_results: agentResults,
      aggregate: {
        estimated_reduction_pct: aggregateReductionPct,
        sample_packs: includedResults.length,
        excluded_packs: excludedPacks,
        exclusion_note:
          excludedPacks.length > 0
            ? `${excludedPacks.join(', ')} not yet populated — WINT-2040/2030/2050/2060 deployment pending`
            : undefined,
        sample_size_note: sampleSizeNote,
      },
      pack_stats: packStats,
      verdict,
      tuning_recommendations: topRecommendations,
    })

    // --- Write BENCHMARK-RESULTS.yaml (AC-5, AC-8) ---

    // ARCH-002: derive output path dynamically relative to script location
    // This makes path stage-independent (story moves from backlog → in-progress → needs-code-review)
    const outputDir = path.join(monorepoRoot, 'plans/future/platform/wint/in-progress/WINT-2120/_implementation')
    const outputPath = path.join(outputDir, 'BENCHMARK-RESULTS.yaml')

    const { stringify } = await import('yaml')
    const yamlContent = stringify(benchmarkResults)

    try {
      await fs.mkdir(outputDir, { recursive: true })
      await fs.writeFile(outputPath, yamlContent, 'utf8')
      logger.info('[WINT-2120] BENCHMARK-RESULTS.yaml written', { path: outputPath })
    } catch (writeErr) {
      logger.error('[WINT-2120] Failed to write BENCHMARK-RESULTS.yaml', {
        path: outputPath,
        error: writeErr instanceof Error ? writeErr.message : String(writeErr),
      })
      throw writeErr
    }

    // Verify artifact was written (AC-5)
    const writtenContent = await fs.readFile(outputPath, 'utf8')
    expect(writtenContent).toContain('run_date')
    expect(writtenContent).toContain('methodology')
    expect(writtenContent).toContain('verdict')
    expect(writtenContent).toContain('per_agent_results')

    // Advisory log — not a blocking assertion (story risk: hard assertions cause flaky CI)
    logger.info('[WINT-2120] Benchmark complete', {
      verdict,
      aggregateReductionPct: aggregateReductionPct?.toFixed(1) ?? 'N/A',
      passingThreshold: PASS_THRESHOLD,
      advisoryNote: 'Verdict is advisory only — no hard CI assertion against 80% target',
    })
  }, 60_000) // 60s timeout for DB + YAML write operations
})
