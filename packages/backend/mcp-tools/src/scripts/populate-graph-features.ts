/**
 * Populate Graph Features and Epics
 *
 * Scans the monorepo directory structure to discover feature candidates and
 * inserts them into graph.features and graph.epics tables.
 *
 * Scanned paths:
 *   - apps/api/*\/src/handlers/  → featureType: 'api_endpoint'
 *   - apps/web/*\/src/components/ → featureType: 'ui_component'
 *   - packages/backend/*\/src/   → featureType: 'service'
 *   - packages/core/*\/src/      → featureType: 'utility'
 *
 * Known epics seeded: WINT, KBAR, WISH, BUGF
 *
 * All inserts use onConflictDoNothing for idempotency (AC-10).
 * Injectable dbInsertEpicFn/dbInsertFeatureFn enable full unit testability
 * without a live DB in CI (AC-4, ADR-005 compliance).
 *
 * @example Run from monorepo root
 * ```bash
 * pnpm tsx packages/backend/mcp-tools/src/scripts/populate-graph-features.ts
 * ```
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 */

import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { logger } from '@repo/logger'

// Resolve from monorepo root (packages/backend/mcp-tools/src/scripts -> ../../../../..)
const MONOREPO_ROOT = resolve(import.meta.dirname ?? __dirname, '../../../../../')

// ============================================================================
// Zod Schemas
// ============================================================================

/** Per-category result shape */
export const CategoryResultSchema = z.object({
  attempted: z.number(),
  succeeded: z.number(),
  failed: z.number(),
})
export type CategoryResult = z.infer<typeof CategoryResultSchema>

/** Summary results returned from populateGraphFeatures() */
export const PopulateGraphResultSchema = z.object({
  epics: CategoryResultSchema,
  features: CategoryResultSchema,
})
export type PopulateGraphResult = z.infer<typeof PopulateGraphResultSchema>

/** Input for a single epic insert */
export const EpicInsertInputSchema = z.object({
  epicName: z.string().min(1),
  epicPrefix: z.string().min(1),
  description: z.string().nullable(),
})
export type EpicInsertInput = z.infer<typeof EpicInsertInputSchema>

/** Input for a single feature insert */
export const FeatureInsertInputSchema = z.object({
  featureName: z.string().min(1),
  featureType: z.string().min(1),
  packageName: z.string().min(1),
  filePath: z.string().min(1),
})
export type FeatureInsertInput = z.infer<typeof FeatureInsertInputSchema>

// ============================================================================
// Injectable function types
// ============================================================================

/** Injectable epic insert function for testability (AC-4) */
export type DbInsertEpicFn = (epic: EpicInsertInput) => Promise<void>

/** Injectable feature insert function for testability (AC-4) */
export type DbInsertFeatureFn = (feature: FeatureInsertInput) => Promise<void>

/** Options for populateGraphFeatures() */
export const PopulateGraphFeaturesOptsSchema = z.object({
  dbInsertEpicFn: z.function().optional(),
  dbInsertFeatureFn: z.function().optional(),
  monorepoRoot: z.string().optional(),
})
export type PopulateGraphFeaturesOpts = {
  dbInsertEpicFn?: DbInsertEpicFn
  dbInsertFeatureFn?: DbInsertFeatureFn
  monorepoRoot?: string
}

// ============================================================================
// Known epics (AC-7)
// ============================================================================

/** Known project epics to seed into graph.epics */
export const KNOWN_EPICS: EpicInsertInput[] = [
  {
    epicName: 'Workflow Intelligence',
    epicPrefix: 'WINT',
    description: 'Autonomous development workflow intelligence platform',
  },
  {
    epicName: 'Knowledge Base',
    epicPrefix: 'KBAR',
    description: 'Knowledge base and lessons learned tracking',
  },
  {
    epicName: 'Wishlist',
    epicPrefix: 'WISH',
    description: 'Feature wishlist and backlog management',
  },
  {
    epicName: 'Bug Fixes',
    epicPrefix: 'BUGF',
    description: 'Bug fix tracking and resolution',
  },
]

// ============================================================================
// Directory scan helpers
// ============================================================================

/**
 * Safely list subdirectories of a given path.
 * Returns empty array if path does not exist or cannot be read.
 */
function listSubdirs(dirPath: string): string[] {
  try {
    return readdirSync(dirPath).filter(entry => {
      try {
        return statSync(join(dirPath, entry)).isDirectory()
      } catch {
        return false
      }
    })
  } catch {
    return []
  }
}

/**
 * Safely list direct entries (files and dirs) of a given path.
 * Returns empty array if path does not exist or cannot be read.
 */
function listEntries(dirPath: string): string[] {
  try {
    return readdirSync(dirPath)
  } catch {
    return []
  }
}

/**
 * Discover feature candidates from the monorepo directory structure.
 * Returns an array of FeatureInsertInput objects (AC-5, AC-6).
 */
export function discoverFeatures(root: string): FeatureInsertInput[] {
  const features: FeatureInsertInput[] = []

  // ── 1. API handler directories: apps/api/*/src/handlers/ ──
  const apiAppsDir = join(root, 'apps', 'api')
  for (const appName of listSubdirs(apiAppsDir)) {
    const handlersDir = join(apiAppsDir, appName, 'src', 'handlers')
    for (const handlerName of listSubdirs(handlersDir)) {
      features.push({
        featureName: `${appName}/${handlerName}`,
        featureType: 'api_endpoint',
        packageName: `apps/api/${appName}`,
        filePath: `apps/api/${appName}/src/handlers/${handlerName}`,
      })
    }
  }

  // ── 2. UI component directories: apps/web/*/src/components/ ──
  const webAppsDir = join(root, 'apps', 'web')
  for (const appName of listSubdirs(webAppsDir)) {
    // Try src/components/ first, fall back to src/
    const componentsDir = join(webAppsDir, appName, 'src', 'components')
    const srcDir = join(webAppsDir, appName, 'src')
    const targetDir = listEntries(componentsDir).length > 0 ? componentsDir : srcDir
    const basePath =
      listEntries(componentsDir).length > 0
        ? `apps/web/${appName}/src/components`
        : `apps/web/${appName}/src`

    for (const componentName of listSubdirs(targetDir)) {
      features.push({
        featureName: `${appName}/${componentName}`,
        featureType: 'ui_component',
        packageName: `apps/web/${appName}`,
        filePath: `${basePath}/${componentName}`,
      })
    }
  }

  // ── 3. Backend package src directories: packages/backend/*/src/ ──
  const backendPkgsDir = join(root, 'packages', 'backend')
  for (const pkgName of listSubdirs(backendPkgsDir)) {
    const srcDir = join(backendPkgsDir, pkgName, 'src')
    if (listEntries(srcDir).length > 0) {
      features.push({
        featureName: `backend/${pkgName}`,
        featureType: 'service',
        packageName: `packages/backend/${pkgName}`,
        filePath: `packages/backend/${pkgName}/src`,
      })
    }
  }

  // ── 4. Core package src directories: packages/core/*/src/ ──
  const corePkgsDir = join(root, 'packages', 'core')
  for (const pkgName of listSubdirs(corePkgsDir)) {
    const srcDir = join(corePkgsDir, pkgName, 'src')
    if (listEntries(srcDir).length > 0) {
      features.push({
        featureName: `core/${pkgName}`,
        featureType: 'utility',
        packageName: `packages/core/${pkgName}`,
        filePath: `packages/core/${pkgName}/src`,
      })
    }
  }

  return features
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Populate graph.epics and graph.features from known epics and monorepo scan.
 *
 * - Inserts KNOWN_EPICS into graph.epics (onConflictDoNothing — idempotent)
 * - Scans monorepo for feature candidates and inserts into graph.features
 * - Per-item try/catch: single failures do not abort the run
 * - Returns { epics: { attempted, succeeded, failed }, features: { attempted, succeeded, failed } }
 *
 * @param opts - Optional injectable functions for testability (AC-4)
 * @returns Summary result with counts for both epics and features
 */
export async function populateGraphFeatures(
  opts: PopulateGraphFeaturesOpts = {},
): Promise<PopulateGraphResult> {
  const root = opts.monorepoRoot ?? MONOREPO_ROOT
  const epicResults: CategoryResult = { attempted: 0, succeeded: 0, failed: 0 }
  const featureResults: CategoryResult = { attempted: 0, succeeded: 0, failed: 0 }

  // ── Insert known epics (AC-7) ──
  const insertEpic = opts.dbInsertEpicFn ?? defaultDbInsertEpicFn
  for (const epic of KNOWN_EPICS) {
    epicResults.attempted++
    try {
      await insertEpic(epic)
      epicResults.succeeded++
      logger.info('[populate-graph-features] Epic inserted', { epicPrefix: epic.epicPrefix })
    } catch (error) {
      epicResults.failed++
      logger.error('[populate-graph-features] Epic insert failed', {
        epicPrefix: epic.epicPrefix,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // ── Discover and insert features (AC-5, AC-6) ──
  const insertFeature = opts.dbInsertFeatureFn ?? defaultDbInsertFeatureFn
  const discoveredFeatures = discoverFeatures(root)

  logger.info('[populate-graph-features] Features discovered', { count: discoveredFeatures.length })

  for (const feature of discoveredFeatures) {
    featureResults.attempted++
    try {
      await insertFeature(feature)
      featureResults.succeeded++
    } catch (error) {
      featureResults.failed++
      logger.error('[populate-graph-features] Feature insert failed', {
        featureName: feature.featureName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const result: PopulateGraphResult = { epics: epicResults, features: featureResults }
  logger.info('[populate-graph-features] Run complete', result)
  return result
}

// ============================================================================
// Default DB implementations (wired in main() — not used in unit tests)
// ============================================================================

async function defaultDbInsertEpicFn(epic: EpicInsertInput): Promise<void> {
  const { db } = await import('@repo/db')
  const { epics } = await import('@repo/knowledge-base/db')

  await db
    .insert(epics)
    .values({
      epicName: epic.epicName,
      epicPrefix: epic.epicPrefix,
      description: epic.description,
    })
    .onConflictDoNothing()
}

async function defaultDbInsertFeatureFn(feature: FeatureInsertInput): Promise<void> {
  const { db } = await import('@repo/db')
  const { features } = await import('@repo/knowledge-base/db')

  await db
    .insert(features)
    .values({
      featureName: feature.featureName,
      featureType: feature.featureType,
      packageName: feature.packageName,
      filePath: feature.filePath,
    })
    .onConflictDoNothing()
}

// ============================================================================
// Script entry point (AC-3)
// ============================================================================

// Run as script if executed directly
const isMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.endsWith('populate-graph-features.ts') ||
    process.argv[1]?.endsWith('populate-graph-features.js'))

if (isMain) {
  populateGraphFeatures()
    .then(summary => {
      logger.info('[populate-graph-features] Done', summary)
      process.exit(summary.epics.failed > 0 || summary.features.failed > 0 ? 1 : 0)
    })
    .catch(err => {
      logger.error('[populate-graph-features] Fatal error', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    })
}
