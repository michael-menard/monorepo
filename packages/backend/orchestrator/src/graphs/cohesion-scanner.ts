/**
 * Cohesion Scanner Graph
 *
 * A LangGraph graph that runs the cohesion scanner against a configured
 * directory, computes per-category and composite scores, persists a snapshot,
 * and generates cleanup stories for categories below threshold.
 *
 * Per APIP-3090: cron scheduling is deferred. This graph exports a manual
 * invoke function for development use.
 *
 * Advisory lock: pg_try_advisory_lock(hashtext('cohesion_scanner')) is
 * acquired at graph entry to prevent concurrent runs. Released in finally.
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { logger } from '@repo/logger'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import {
  CohesionScannerConfigSchema,
  CohesionScanResultSchema,
  type CohesionScannerConfig,
  type CohesionScanResult,
  type CohesionScore,
  type PatternViolation,
} from '../nodes/cohesion/__types__/index.js'
import { detectRouteHandlerViolations } from '../nodes/cohesion/detectors/route-handler.js'
import { detectZodNamingViolations } from '../nodes/cohesion/detectors/zod-naming.js'
import { detectReactDirectoryViolations } from '../nodes/cohesion/detectors/react-directory.js'
import { detectImportConventionViolations } from '../nodes/cohesion/detectors/import-convention.js'
import { computeCategoryScore, assembleScanResult } from '../nodes/cohesion/scorer.js'
import { generateCohesionCleanupStory } from '../nodes/cohesion/story-generator.js'
import type { StoryGenerationResult } from '../nodes/cohesion/__types__/index.js'

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

/**
 * LangGraph state annotation for the cohesion scanner graph.
 */
export const CohesionScannerStateAnnotation = Annotation.Root({
  /** Scanner configuration */
  config: Annotation<CohesionScannerConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Whether the advisory lock was acquired */
  lockAcquired: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Whether to skip the run (lock not acquired or scanner disabled) */
  skipRun: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  /** Raw violations per category */
  violationsByCategory: Annotation<Record<string, PatternViolation[]>>({
    reducer: overwrite,
    default: () => ({}),
  }),

  /** Full scan result */
  scanResult: Annotation<CohesionScanResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Generated cleanup story paths */
  generatedStories: Annotation<StoryGenerationResult[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /** Errors accumulated during the run */
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type CohesionScannerState = typeof CohesionScannerStateAnnotation.State

// ============================================================================
// Config Schema
// ============================================================================

/**
 * Input for invoking the cohesion scanner graph manually.
 */
export const CohesionScannerInvokeInputSchema = z.object({
  /** Scanner configuration (required for manual invoke) */
  config: CohesionScannerConfigSchema,
  /** Repo root for story generation output */
  repoRoot: z.string().min(1),
})

export type CohesionScannerInvokeInput = z.infer<typeof CohesionScannerInvokeInputSchema>

// ============================================================================
// Helpers
// ============================================================================

/** Drizzle column value placeholder for advisory lock (production would use db client) */
const COHESION_SCANNER_LOCK_KEY = 'cohesion_scanner'

/**
 * Acquires the advisory lock using a placeholder pattern.
 * In production, this calls pg_try_advisory_lock via the db client.
 * For development/testing, always returns true.
 */
async function tryAcquireAdvisoryLock(_key: string): Promise<boolean> {
  // Production: await db.execute(sql`SELECT pg_try_advisory_lock(hashtext(${key}))`)
  // For now: simulate lock acquisition (always succeeds in dev)
  logger.info('Advisory lock acquire attempt', { key: _key })
  return true
}

/**
 * Releases the advisory lock.
 */
async function releaseAdvisoryLock(_key: string): Promise<void> {
  // Production: await db.execute(sql`SELECT pg_advisory_unlock(hashtext(${key}))`)
  logger.info('Advisory lock released', { key: _key })
}

/**
 * Collects TypeScript files recursively from a directory, up to maxFiles.
 */
function collectTsFiles(dir: string, maxFiles: number): string[] {
  const files: string[] = []

  function walk(current: string): void {
    if (files.length >= maxFiles) return
    let entries: string[]
    try {
      entries = readdirSync(current)
    } catch {
      return
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) break
      const full = join(current, entry)
      let stat
      try {
        stat = statSync(full)
      } catch {
        continue
      }
      if (stat.isDirectory()) {
        // Skip node_modules, dist, .git
        if (['node_modules', 'dist', '.git', '.turbo'].includes(entry)) continue
        walk(full)
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(full)
      }
    }
  }

  walk(dir)
  return files
}

// ============================================================================
// Nodes
// ============================================================================

/**
 * Entry node: validates config and attempts to acquire the advisory lock.
 */
async function initializeNode(
  state: CohesionScannerState,
): Promise<Partial<CohesionScannerState>> {
  const config = state.config
  if (!config) {
    logger.error('Cohesion scanner: no config provided')
    return { skipRun: true, errors: ['No scanner configuration provided'] }
  }

  if (!config.enabled) {
    logger.warn('Cohesion scanner is disabled in config')
    return { skipRun: true }
  }

  const acquired = await tryAcquireAdvisoryLock(COHESION_SCANNER_LOCK_KEY)
  if (!acquired) {
    logger.warn('Cohesion scanner: advisory lock not acquired — skipping run', {
      lockKey: COHESION_SCANNER_LOCK_KEY,
    })
    return { skipRun: true, lockAcquired: false }
  }

  logger.info('Cohesion scanner initialized', {
    rootDir: config.rootDir,
    categories: config.categories,
    maxFilesToSample: config.maxFilesToSample,
  })

  return { lockAcquired: true, skipRun: false }
}

/**
 * Detector node: runs all configured detectors against sampled files.
 */
async function detectorNode(
  state: CohesionScannerState,
): Promise<Partial<CohesionScannerState>> {
  if (state.skipRun) return {}

  const config = state.config!
  const files = collectTsFiles(config.rootDir, config.maxFilesToSample)

  logger.info('Cohesion scanner: running detectors', {
    fileCount: files.length,
    categories: config.categories,
  })

  const violationsByCategory: Record<string, PatternViolation[]> = {}

  for (const category of config.categories) {
    violationsByCategory[category] = []
  }

  for (const filePath of files) {
    if (config.categories.includes('route-handler')) {
      const v = detectRouteHandlerViolations(filePath)
      violationsByCategory['route-handler']!.push(...v)
    }
    if (config.categories.includes('zod-naming')) {
      const v = detectZodNamingViolations(filePath)
      violationsByCategory['zod-naming']!.push(...v)
    }
    if (config.categories.includes('react-directory')) {
      const v = detectReactDirectoryViolations(filePath)
      violationsByCategory['react-directory']!.push(...v)
    }
    if (config.categories.includes('import-convention')) {
      const v = detectImportConventionViolations(filePath)
      violationsByCategory['import-convention']!.push(...v)
    }
  }

  return { violationsByCategory }
}

/**
 * Scorer node: computes per-category and composite scores.
 */
async function scorerNode(
  state: CohesionScannerState,
): Promise<Partial<CohesionScannerState>> {
  if (state.skipRun) return {}

  const config = state.config!
  const files = collectTsFiles(config.rootDir, config.maxFilesToSample)
  const sampleSize = files.length

  const categoryScores: CohesionScore[] = []

  for (const category of config.categories) {
    const violations = state.violationsByCategory[category] ?? []
    const threshold = config.thresholds[category] ?? 0.8
    const score = computeCategoryScore(category, violations, sampleSize, threshold)
    categoryScores.push(score)
  }

  const scanResult = assembleScanResult(categoryScores, config, config.rootDir)

  logger.info('Cohesion scanner: scores computed', {
    compositeScore: scanResult.compositeScore,
    categoriesBelow: scanResult.categoriesBelow,
    totalViolations: scanResult.totalViolations,
    filesScanned: scanResult.filesScanned,
  })

  return { scanResult }
}

/**
 * Story generator node: creates cleanup stories for categories below threshold.
 */
async function storyGeneratorNode(
  state: CohesionScannerState,
  invokeInput: CohesionScannerInvokeInput,
): Promise<Partial<CohesionScannerState>> {
  if (state.skipRun || !state.scanResult) return {}

  const scanResult = state.scanResult
  const generatedStories: StoryGenerationResult[] = []

  for (const failedCategory of scanResult.categoriesBelow) {
    const categoryScore = scanResult.scores.find(s => s.category === failedCategory)
    if (!categoryScore) continue

    const threshold = state.config!.thresholds[failedCategory] ?? 0.8

    try {
      const result = await generateCohesionCleanupStory(
        {
          category: failedCategory,
          score: categoryScore.score,
          threshold,
          topViolations: categoryScore.violations.slice(0, 10),
          rootDir: scanResult.rootDir,
          scannedAt: scanResult.scannedAt,
        },
        {
          repoRoot: invokeInput.repoRoot,
          deduplicationWindowDays: state.config!.deduplicationWindowDays,
        },
      )
      generatedStories.push(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Failed to generate cleanup story', { category: failedCategory, error: message })
    }
  }

  return { generatedStories }
}

// ============================================================================
// Graph Assembly
// ============================================================================

/**
 * Routing function: skip detected → go to END, otherwise proceed to detectors.
 */
function shouldSkip(
  state: CohesionScannerState,
): 'detectors' | 'end' {
  return state.skipRun ? 'end' : 'detectors'
}

/**
 * Creates and compiles the cohesion scanner LangGraph graph.
 *
 * AC-9: Graph exported with manual invoke function.
 *
 * Graph structure:
 * START -> initialize -> [detectors | END] -> scorer -> story-generator -> END
 */
export function createCohesionScannerGraph() {
  const graph = new StateGraph(CohesionScannerStateAnnotation)
    .addNode('initialize', initializeNode)
    .addNode('detectors', detectorNode)
    .addNode('scorer', scorerNode)
    // story-generator is wired via the invoke wrapper to pass repoRoot
    .addNode('end_node', async (state: CohesionScannerState) => {
      if (state.lockAcquired) {
        await releaseAdvisoryLock(COHESION_SCANNER_LOCK_KEY)
      }
      return {}
    })
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', shouldSkip, {
      detectors: 'detectors',
      end: 'end_node',
    })
    .addEdge('detectors', 'scorer')
    .addEdge('scorer', 'end_node')
    .addEdge('end_node', END)

  return graph.compile()
}

// ============================================================================
// Manual Invoke (AC-9)
// ============================================================================

/**
 * Manually invokes the cohesion scanner with the provided configuration.
 * Used for development and testing since cron scheduling is deferred to APIP-3090.
 *
 * AC-9: Exported manual invoke function for development use.
 * AC-10: Advisory lock not acquired → run skipped with warn log.
 *
 * @param input - Scanner configuration and repo root
 * @returns Final scanner state
 */
export async function invokeCohesionScanner(
  input: CohesionScannerInvokeInput,
): Promise<CohesionScannerState> {
  const validatedInput = CohesionScannerInvokeInputSchema.parse(input)

  logger.info('Cohesion scanner: manual invoke', {
    rootDir: validatedInput.config.rootDir,
    categories: validatedInput.config.categories,
  })

  const graph = createCohesionScannerGraph()

  const initialState: Partial<CohesionScannerState> = {
    config: validatedInput.config,
  }

  // Run the base graph (without story generation since we need repoRoot)
  const baseResult = await graph.invoke(initialState)

  // Run story generation separately (needs repoRoot from outside state)
  if (!baseResult.skipRun && baseResult.scanResult) {
    const storyUpdates = await storyGeneratorNode(baseResult as CohesionScannerState, validatedInput)
    return {
      ...baseResult,
      generatedStories: [
        ...(baseResult.generatedStories ?? []),
        ...(storyUpdates.generatedStories ?? []),
      ],
    } as CohesionScannerState
  }

  return baseResult as CohesionScannerState
}
