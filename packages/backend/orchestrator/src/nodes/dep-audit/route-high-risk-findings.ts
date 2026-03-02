/**
 * Route High-Risk Findings
 *
 * For any finding at or above the configured blockingThreshold severity,
 * creates a blocked queue item via the APIP-2010 API (stubbed until it ships).
 *
 * Deduplication: the same storyId:packageName:findingType combination will not
 * create a duplicate item in a single run.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * Design:
 * - DepBlockedQueueClient is a stub interface (logs warning + records item)
 * - Deduplication by storyId:packageName:findingType key
 * - Threshold-gated: only severity >= blockingThreshold routes to queue
 * - Never throws
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Severity Rank Helper
// ============================================================================

const SEVERITY_RANK = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
  none: 0,
} as const

function meetsThreshold(severity: string, threshold: string): boolean {
  const sevRank = SEVERITY_RANK[severity as keyof typeof SEVERITY_RANK] ?? 0
  const thresholdRank = SEVERITY_RANK[threshold as keyof typeof SEVERITY_RANK] ?? 4
  return sevRank >= thresholdRank
}

// ============================================================================
// Blocked Queue Item Schema
// ============================================================================

/**
 * Payload for a blocked queue item created by the dep auditor.
 * Contains sufficient human-readable context for review (ED-5).
 */
export const DepBlockedQueueItemSchema = z.object({
  storyId: z.string(),
  packageName: z.string(),
  version: z.string().optional(),
  findingType: z.enum(['vulnerability', 'overlap', 'bundle_bloat', 'unmaintained']),
  severity: z.string(),
  cve: z.string().nullable().optional(),
  npmLink: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  deduplicationKey: z.string(),
})

export type DepBlockedQueueItem = z.infer<typeof DepBlockedQueueItemSchema>

// ============================================================================
// DepBlockedQueueClient Stub Interface
// ============================================================================

/**
 * Client interface for the APIP-2010 blocked queue API.
 *
 * STUB: Until APIP-2010 ships, the default implementation logs a warning
 * and records the would-be item in memory for test assertions.
 * Wire to the real APIP-2010 API when it reaches Ready to Work.
 */
export type DepBlockedQueueClient = {
  create: (item: DepBlockedQueueItem) => Promise<void>
}

/**
 * Stub implementation of DepBlockedQueueClient.
 * Logs a warning and stores items for inspection.
 * Used until APIP-2010 ships.
 */
export function createStubBlockedQueueClient(): DepBlockedQueueClient & {
  getCreatedItems: () => DepBlockedQueueItem[]
} {
  const createdItems: DepBlockedQueueItem[] = []

  return {
    create: async (item: DepBlockedQueueItem): Promise<void> => {
      logger.warn(
        'dep-audit.route-high-risk-findings: APIP-2010 not yet available — would create blocked queue item',
        {
          storyId: item.storyId,
          packageName: item.packageName,
          findingType: item.findingType,
          severity: item.severity,
          deduplicationKey: item.deduplicationKey,
        },
      )
      createdItems.push(item)
    },
    getCreatedItems: () => [...createdItems],
  }
}

// ============================================================================
// Input Schema
// ============================================================================

export const RoutingFindingSchema = z.object({
  packageName: z.string(),
  version: z.string().optional(),
  findingType: z.enum(['vulnerability', 'overlap', 'bundle_bloat', 'unmaintained']),
  severity: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export type RoutingFinding = z.infer<typeof RoutingFindingSchema>

export const RouteHighRiskFindingsOptionsSchema = z.object({
  /** Story ID for context and deduplication */
  storyId: z.string(),
  /** Severity threshold for routing to blocked queue (default: 'high') */
  blockingThreshold: z.string().default('high'),
  /** Blocked queue client; defaults to stub that logs a warning */
  queueClient: z.unknown().optional(),
  /**
   * Set of deduplication keys already seen in this run.
   * Pass the same Set across multiple calls to deduplicate across invocations.
   */
  seenKeys: z.instanceof(Set).optional(),
})

export type RouteHighRiskFindingsOptions = z.infer<typeof RouteHighRiskFindingsOptionsSchema>

// ============================================================================
// Result Schema
// ============================================================================

export const RouteHighRiskFindingsResultSchema = z.object({
  processed: z.number().int().nonnegative(),
  routed: z.number().int().nonnegative(),
  deduplicated: z.number().int().nonnegative(),
  belowThreshold: z.number().int().nonnegative(),
})

export type RouteHighRiskFindingsResult = z.infer<typeof RouteHighRiskFindingsResultSchema>

// ============================================================================
// Implementation
// ============================================================================

/**
 * Route high-risk dependency findings to the blocked queue.
 *
 * For each finding at or above the blockingThreshold severity:
 * 1. Compute deduplication key: storyId:packageName:findingType
 * 2. Skip if key was already seen in this run
 * 3. Create blocked queue item via queueClient
 *
 * @param findings - Array of findings to route
 * @param options - storyId, threshold, queueClient, seenKeys
 * @returns Summary of routing results
 *
 * @example
 * const result = await routeHighRiskFindings(findings, { storyId: 'APIP-4030' })
 * // => { processed: 2, routed: 1, deduplicated: 0, belowThreshold: 1 }
 */
export async function routeHighRiskFindings(
  findings: RoutingFinding[],
  options: RouteHighRiskFindingsOptions,
): Promise<RouteHighRiskFindingsResult> {
  const blockingThreshold = options.blockingThreshold ?? 'high'
  const queueClient = (options.queueClient as DepBlockedQueueClient | undefined) ??
    createStubBlockedQueueClient()
  const seenKeys = options.seenKeys ?? new Set<string>()

  let routed = 0
  let deduplicated = 0
  let belowThreshold = 0

  for (const finding of findings) {
    if (!meetsThreshold(finding.severity, blockingThreshold)) {
      belowThreshold++
      continue
    }

    const deduplicationKey = `${options.storyId}:${finding.packageName}:${finding.findingType}`

    if (seenKeys.has(deduplicationKey)) {
      deduplicated++
      logger.debug('dep-audit.route-high-risk-findings: deduplicated blocked queue item', {
        deduplicationKey,
      })
      continue
    }

    seenKeys.add(deduplicationKey)

    const item = DepBlockedQueueItemSchema.parse({
      storyId: options.storyId,
      packageName: finding.packageName,
      version: finding.version,
      findingType: finding.findingType,
      severity: finding.severity,
      cve: (finding.details?.cve as string | null | undefined) ?? null,
      npmLink: finding.details?.url
        ? String(finding.details.url)
        : `https://www.npmjs.com/package/${finding.packageName}`,
      details: finding.details,
      deduplicationKey,
    })

    try {
      await queueClient.create(item)
      routed++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('dep-audit.route-high-risk-findings: failed to create blocked queue item', {
        storyId: options.storyId,
        packageName: finding.packageName,
        error: message,
      })
      // Remove key so next run can retry
      seenKeys.delete(deduplicationKey)
    }
  }

  return RouteHighRiskFindingsResultSchema.parse({
    processed: findings.length,
    routed,
    deduplicated,
    belowThreshold,
  })
}
