/**
 * Run Dep Audit Orchestrator
 *
 * Orchestrates the five dependency analysis steps, persists results to the
 * wint.dep_audit_runs and wint.dep_audit_findings tables, and returns a
 * DepAuditResultSchema summary.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * Design:
 * - pg_try_advisory_lock guard prevents concurrent runs (LOCK_KEYS.DEP_AUDIT = 42002)
 * - Fire-and-forget DB persistence: DB failures warn but never throw
 * - Injectable db, fetchFn, toolRunner for full testability
 * - DepAuditThresholdsSchema defines configurable defaults
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { type PackageSnapshot, detectNewPackages } from './detect-new-packages.js'
import { checkOverlap, type CheckOverlapOptions } from './check-overlap.js'
import { estimateBundleImpact } from './estimate-bundle-impact.js'
import { runPnpmAudit } from './run-pnpm-audit.js'
import { detectUnmaintained } from './detect-unmaintained.js'
import { LOCK_KEYS } from '../../cron/constants.js'

// ============================================================================
// Thresholds Schema
// ============================================================================

/**
 * Configurable thresholds for dependency audit.
 *
 * Defaults:
 *   - blockingThreshold: 'high'   — only 'high' and 'critical' findings route to blocked queue
 *   - maxBundleDeltaBytes: 102400 — 100 KB gzip threshold for bundle bloat findings
 *   - unmaintainedAgeDays: 365    — packages with no release for 1 year are flagged
 */
export const DepAuditThresholdsSchema = z.object({
  /** Minimum severity that routes findings to the blocked queue (default: 'high') */
  blockingThreshold: z
    .enum(['critical', 'high', 'medium', 'low', 'info'])
    .default('high'),
  /** Max acceptable gzipped bundle delta in bytes (default: 102400 = 100 KB) */
  maxBundleDeltaBytes: z.number().int().positive().default(102400),
  /** Flag packages with no release for this many days (default: 365) */
  unmaintainedAgeDays: z.number().int().positive().default(365),
})

export type DepAuditThresholds = z.infer<typeof DepAuditThresholdsSchema>

// ============================================================================
// Input Schema
// ============================================================================

export const DepAuditConfigSchema = z.object({
  /** Story ID that triggered this audit */
  storyId: z.string(),
  /** Git commit SHA that triggered this audit */
  commitSha: z.string().optional(),
  /** Previous package.json snapshot (name -> version) */
  prevSnapshot: z.record(z.string(), z.string()),
  /** Current package.json snapshot (name -> version) */
  currentSnapshot: z.record(z.string(), z.string()),
  /** Absolute path to workspace root (for pnpm audit) */
  workspaceRoot: z.string(),
  /** Configurable severity thresholds */
  thresholds: DepAuditThresholdsSchema.optional(),
  /** Path to dep-equivalences.yaml (for checkOverlap) */
  equivalenceConfigPath: z.string().optional(),
})

export type DepAuditConfig = z.infer<typeof DepAuditConfigSchema>

// ============================================================================
// Result Schema
// ============================================================================

const SEVERITY_RANK = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
  none: 0,
} as const

export const DepAuditResultSchema = z.object({
  storyId: z.string(),
  runId: z.string().uuid().nullable(),
  packagesAdded: z.array(z.string()),
  packagesUpdated: z.array(z.string()),
  packagesRemoved: z.array(z.string()),
  overallRisk: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  findingsCount: z.number().int().nonnegative(),
  blockedQueueItemsCreated: z.number().int().nonnegative(),
  skippedReason: z.string().nullable(),
})

export type DepAuditResult = z.infer<typeof DepAuditResultSchema>

// ============================================================================
// DB Client Types (injectable)
// ============================================================================

export type DepAuditDbInsertRow = {
  storyId: string
  commitSha?: string
  packagesAdded: string[]
  packagesUpdated: string[]
  packagesRemoved: string[]
  overallRisk: string
  findingsCount: number
  blockedQueueItemsCreated: number
}

export type DepAuditFindingDbRow = {
  runId: string
  packageName: string
  findingType: string
  severity: string
  details: Record<string, unknown>
}

export type DepAuditDbClient = {
  insertRun: (row: DepAuditDbInsertRow) => Promise<{ id: string }>
  insertFinding: (row: DepAuditFindingDbRow) => Promise<void>
  tryAdvisoryLock: (lockKey: number) => Promise<boolean>
  releaseAdvisoryLock?: (lockKey: number) => Promise<void>
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Maps a finding type + severity to an overall risk level.
 * Returns the highest risk seen across all findings.
 */
function computeOverallRisk(
  findingSeverities: string[],
): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  const knownSeverities = ['critical', 'high', 'medium', 'low', 'info', 'none'] as const
  type Sev = (typeof knownSeverities)[number]

  let highest: Sev = 'none'

  for (const sev of findingSeverities) {
    const normalized = knownSeverities.includes(sev as Sev) ? (sev as Sev) : 'low'
    if ((SEVERITY_RANK[normalized] ?? 0) > (SEVERITY_RANK[highest] ?? 0)) {
      highest = normalized
    }
  }

  // Map 'info' -> 'low' for overall risk since 'info' is not in the risk enum
  if (highest === 'info') return 'low'
  return highest
}

/**
 * Compare severity against the blocking threshold.
 * Returns true if the finding severity meets or exceeds the threshold.
 */
function meetsBlockingThreshold(severity: string, threshold: string): boolean {
  const sevRank =
    SEVERITY_RANK[severity as keyof typeof SEVERITY_RANK] ??
    SEVERITY_RANK['low']
  const thresholdRank =
    SEVERITY_RANK[threshold as keyof typeof SEVERITY_RANK] ??
    SEVERITY_RANK['high']
  return sevRank >= thresholdRank
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Run the full dependency audit pipeline.
 *
 * 1. Acquire pg_try_advisory_lock (LOCK_KEYS.DEP_AUDIT)
 * 2. Detect new/updated packages
 * 3. Run overlap, bundle impact, pnpm audit, unmaintained checks
 * 4. Persist run + findings rows (fire-and-forget)
 * 5. Return DepAuditResult summary
 *
 * @param config - Audit configuration including snapshots and thresholds
 * @param db - Injectable DB client for testing
 * @param overrides - Optional overrides for injectable analysis functions
 * @returns DepAuditResult summary
 */
export async function runDepAudit(
  config: DepAuditConfig,
  db: DepAuditDbClient,
  overrides: {
    fetchFn?: unknown
    toolRunner?: unknown
    overlapOptions?: CheckOverlapOptions
  } = {},
): Promise<DepAuditResult> {
  const thresholds = DepAuditThresholdsSchema.parse(config.thresholds ?? {})

  // ── 1. Advisory lock guard ────────────────────────────────────────────────
  let lockAcquired = false
  try {
    lockAcquired = await db.tryAdvisoryLock(LOCK_KEYS.DEP_AUDIT)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('dep-audit: failed to check advisory lock', { error: message })
  }

  if (!lockAcquired) {
    logger.info('dep-audit: skipped — advisory lock held by another instance', {
      lockKey: LOCK_KEYS.DEP_AUDIT,
      storyId: config.storyId,
    })
    return DepAuditResultSchema.parse({
      storyId: config.storyId,
      runId: null,
      packagesAdded: [],
      packagesUpdated: [],
      packagesRemoved: [],
      overallRisk: 'none',
      findingsCount: 0,
      blockedQueueItemsCreated: 0,
      skippedReason: 'advisory_lock_held',
    })
  }

  // ── 2. Detect package changes ─────────────────────────────────────────────
  const changeSummary = detectNewPackages(
    config.prevSnapshot as PackageSnapshot,
    config.currentSnapshot as PackageSnapshot,
  )

  const newPackageNames = changeSummary.added.map(p => p.split('@')[0]).filter(Boolean) as string[]

  logger.info('dep-audit: starting', {
    storyId: config.storyId,
    added: changeSummary.added.length,
    updated: changeSummary.updated.length,
    removed: changeSummary.removed.length,
  })

  // ── 3. Run analysis steps in parallel ────────────────────────────────────

  const overlapOptions: CheckOverlapOptions = {
    configPath: config.equivalenceConfigPath,
    installedPackages: config.currentSnapshot,
    ...overrides.overlapOptions,
  }

  const [overlapFindings, bundleResults, vulnFindings, unmaintainedFindings] = await Promise.all([
    Promise.resolve(checkOverlap(newPackageNames, overlapOptions)),
    estimateBundleImpact(newPackageNames, {
      fetchFn: overrides.fetchFn as any,
    }),
    runPnpmAudit(config.workspaceRoot, {
      toolRunner: overrides.toolRunner as any,
    }),
    detectUnmaintained(newPackageNames, {
      fetchFn: overrides.fetchFn as any,
      unmaintainedAgeDays: thresholds.unmaintainedAgeDays,
    }),
  ])

  // ── 4. Build findings list ────────────────────────────────────────────────

  type RawFinding = {
    packageName: string
    findingType: string
    severity: string
    details: Record<string, unknown>
  }

  const rawFindings: RawFinding[] = []

  // Vulnerability findings
  for (const vuln of vulnFindings) {
    rawFindings.push({
      packageName: vuln.package,
      findingType: 'vulnerability',
      severity: vuln.severity,
      details: {
        cve: vuln.cve,
        title: vuln.title,
        url: vuln.url,
        fixAvailable: vuln.fixAvailable,
      },
    })
  }

  // Overlap findings
  for (const overlap of overlapFindings) {
    rawFindings.push({
      packageName: overlap.package,
      findingType: 'overlap',
      severity: 'high',
      details: {
        overlapsWith: overlap.overlapsWith,
        groupName: overlap.groupName,
      },
    })
  }

  // Bundle bloat findings
  for (const bundle of bundleResults) {
    if (
      bundle.estimatedBytes !== null &&
      bundle.estimatedBytes > thresholds.maxBundleDeltaBytes
    ) {
      rawFindings.push({
        packageName: bundle.package,
        findingType: 'bundle_bloat',
        severity: 'info',
        details: {
          estimatedBytes: bundle.estimatedBytes,
          maxAllowedBytes: thresholds.maxBundleDeltaBytes,
        },
      })
    }
  }

  // Unmaintained findings
  for (const unmaintained of unmaintainedFindings) {
    rawFindings.push({
      packageName: unmaintained.package,
      findingType: 'unmaintained',
      severity: 'medium',
      details: {
        reason: unmaintained.reason,
        lastPublished: unmaintained.lastPublished,
        daysSincePublish: unmaintained.daysSincePublish,
        deprecationMessage: unmaintained.deprecationMessage,
      },
    })
  }

  // ── 5. Compute overall risk ───────────────────────────────────────────────

  const overallRisk = computeOverallRisk(rawFindings.map(f => f.severity))

  // ── 6. Persist to DB (fire-and-forget) ───────────────────────────────────

  let runId: string | null = null
  let blockedQueueItemsCreated = 0

  try {
    const runRow = await db.insertRun({
      storyId: config.storyId,
      commitSha: config.commitSha,
      packagesAdded: changeSummary.added,
      packagesUpdated: changeSummary.updated,
      packagesRemoved: changeSummary.removed,
      overallRisk,
      findingsCount: rawFindings.length,
      blockedQueueItemsCreated: 0, // updated below after routing
    })

    runId = runRow.id

    for (const finding of rawFindings) {
      try {
        await db.insertFinding({ ...finding, runId })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn('dep-audit: failed to insert finding row', {
          storyId: config.storyId,
          packageName: finding.packageName,
          findingType: finding.findingType,
          error: message,
        })
        // Continue — fire-and-forget semantics
      }
    }

    // Count high/critical findings that would be routed to blocked queue
    blockedQueueItemsCreated = rawFindings.filter(f =>
      meetsBlockingThreshold(f.severity, thresholds.blockingThreshold),
    ).length

    logger.info('dep-audit: persisted results', {
      storyId: config.storyId,
      runId,
      findingsCount: rawFindings.length,
      overallRisk,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('dep-audit: DB persistence failed — continuing with fire-and-forget semantics', {
      storyId: config.storyId,
      error: message,
    })
    // Non-throwing: return result without runId
  }

  return DepAuditResultSchema.parse({
    storyId: config.storyId,
    runId,
    packagesAdded: changeSummary.added,
    packagesUpdated: changeSummary.updated,
    packagesRemoved: changeSummary.removed,
    overallRisk,
    findingsCount: rawFindings.length,
    blockedQueueItemsCreated,
    skippedReason: null,
  })
}
