import { z } from 'zod'

/**
 * FINDINGS.yaml Schema
 *
 * Code audit findings from multi-lens analysis.
 * Written by audit-aggregate-leader, read by promote/trends agents.
 */

export const AuditSeveritySchema = z.enum(['critical', 'high', 'medium', 'low'])

export type AuditSeverity = z.infer<typeof AuditSeveritySchema>

export const AuditConfidenceSchema = z.enum(['high', 'medium', 'low'])

export type AuditConfidence = z.infer<typeof AuditConfidenceSchema>

export const AuditLensSchema = z.enum([
  'security',
  'duplication',
  'react',
  'typescript',
  'a11y',
  'ui-ux',
  'performance',
  'test-coverage',
  'code-quality',
])

export type AuditLens = z.infer<typeof AuditLensSchema>

export const AuditScopeSchema = z.enum(['full', 'delta', 'domain', 'story'])

export type AuditScope = z.infer<typeof AuditScopeSchema>

export const AuditModeSchema = z.enum(['pipeline', 'roundtable'])

export type AuditMode = z.infer<typeof AuditModeSchema>

export const DedupVerdictSchema = z.enum(['duplicate', 'new', 'related'])

export type DedupVerdict = z.infer<typeof DedupVerdictSchema>

export const FindingStatusSchema = z.enum(['new', 'recurring', 'promoted', 'false_positive'])

export type FindingStatus = z.infer<typeof FindingStatusSchema>

export const DevilsAdvocateDecisionSchema = z.enum([
  'confirmed',
  'downgraded',
  'upgraded',
  'false_positive',
  'duplicate',
  'deferred',
])

export type DevilsAdvocateDecision = z.infer<typeof DevilsAdvocateDecisionSchema>

export const DedupCheckSchema = z.object({
  similar_stories: z.array(z.string()).default([]),
  similarity_score: z.number().min(0).max(1).optional(),
  verdict: DedupVerdictSchema,
})

export type DedupCheck = z.infer<typeof DedupCheckSchema>

export const DevilsAdvocateResultSchema = z.object({
  challenged: z.boolean(),
  original_severity: AuditSeveritySchema,
  final_severity: AuditSeveritySchema.nullable(),
  decision: DevilsAdvocateDecisionSchema,
  reasoning: z.string(),
})

export type DevilsAdvocateResult = z.infer<typeof DevilsAdvocateResultSchema>

export const AuditFindingSchema = z.object({
  id: z.string(),
  lens: AuditLensSchema,
  severity: AuditSeveritySchema,
  confidence: AuditConfidenceSchema,
  title: z.string(),
  description: z.string().optional(),
  file: z.string(),
  lines: z.string().optional(),
  evidence: z.string(),
  remediation: z.string(),
  dedup_check: DedupCheckSchema.optional(),
  devils_advocate: DevilsAdvocateResultSchema.optional(),
  status: FindingStatusSchema.default('new'),
  story_id: z.string().optional(),
})

export type AuditFinding = z.infer<typeof AuditFindingSchema>

export const SeveritySummarySchema = z.object({
  critical: z.number().int().min(0).default(0),
  high: z.number().int().min(0).default(0),
  medium: z.number().int().min(0).default(0),
  low: z.number().int().min(0).default(0),
})

export type SeveritySummary = z.infer<typeof SeveritySummarySchema>

export const TrendDeltaSchema = z.object({
  new: z.number().int().min(0).default(0),
  fixed: z.number().int().min(0).default(0),
  recurring: z.number().int().min(0).default(0),
})

export type TrendDelta = z.infer<typeof TrendDeltaSchema>

export const AuditSummarySchema = z.object({
  total_findings: z.number().int().min(0),
  by_severity: SeveritySummarySchema,
  by_lens: z.record(z.string(), z.number().int().min(0)).default({}),
  new_since_last: z.number().int().min(0).default(0),
  recurring: z.number().int().min(0).default(0),
  fixed_since_last: z.number().int().min(0).default(0),
})

export type AuditSummary = z.infer<typeof AuditSummarySchema>

export const AuditMetricsSchema = z.object({
  files_scanned: z.number().int().min(0),
  lines_scanned: z.number().int().min(0).optional(),
  duration_ms: z.number().int().min(0).optional(),
  tokens: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
})

export type AuditMetrics = z.infer<typeof AuditMetricsSchema>

export const AuditFindingsSchema = z.object({
  schema: z.literal(1),
  timestamp: z.string().datetime(),
  mode: AuditModeSchema,
  scope: AuditScopeSchema,
  target: z.string(),
  lenses_run: z.array(AuditLensSchema),

  summary: AuditSummarySchema,
  findings: z.array(AuditFindingSchema),
  metrics: AuditMetricsSchema,

  trend_data: z
    .object({
      previous_run: z.string().nullable().default(null),
      delta: TrendDeltaSchema.optional(),
    })
    .optional(),
})

export type AuditFindings = z.infer<typeof AuditFindingsSchema>

// --- Lens Result (per-lens output before aggregation) ---

export const LensResultSchema = z.object({
  lens: AuditLensSchema,
  total_findings: z.number().int().min(0),
  by_severity: SeveritySummarySchema,
  findings: z.array(AuditFindingSchema),
  tokens: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
})

export type LensResult = z.infer<typeof LensResultSchema>

// --- Devil's Advocate Challenge Result ---

export const ChallengeResultSchema = z.object({
  total_reviewed: z.number().int().min(0),
  confirmed: z.number().int().min(0),
  downgraded: z.number().int().min(0),
  upgraded: z.number().int().min(0),
  false_positives: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  challenges: z.array(
    z.object({
      finding_id: z.string(),
      original_severity: AuditSeveritySchema,
      decision: DevilsAdvocateDecisionSchema,
      final_severity: AuditSeveritySchema.nullable(),
      reasoning: z.string(),
      existing_story: z.string().optional(),
    }),
  ),
})

export type ChallengeResult = z.infer<typeof ChallengeResultSchema>

// --- Roundtable Result ---

export const RoundtableResultSchema = z.object({
  original_count: z.number().int().min(0),
  vetted_count: z.number().int().min(0),
  removed: z.object({
    false_positives: z.number().int().min(0),
    duplicates: z.number().int().min(0),
  }),
  severity_changes: z.object({
    downgraded: z.number().int().min(0),
    upgraded: z.number().int().min(0),
  }),
  cross_references: z
    .array(
      z.object({
        findings: z.array(z.string()),
        relationship: z.string(),
      }),
    )
    .default([]),
  vetted_findings: z.array(AuditFindingSchema),
})

export type RoundtableResult = z.infer<typeof RoundtableResultSchema>

// --- Dedup Result ---

export const DedupResultSchema = z.object({
  total_checked: z.number().int().min(0),
  duplicates_found: z.number().int().min(0),
  related_found: z.number().int().min(0),
  new_findings: z.number().int().min(0),
})

export type DedupResult = z.infer<typeof DedupResultSchema>

// --- Trend Snapshot ---

export const TrendEntrySchema = z.object({
  date: z.string(),
  total: z.number().int().min(0),
  critical: z.number().int().min(0),
  high: z.number().int().min(0),
  medium: z.number().int().min(0),
  low: z.number().int().min(0),
})

export type TrendEntry = z.infer<typeof TrendEntrySchema>

export const TrendDirectionSchema = z.enum(['improving', 'stable', 'regressing'])

export type TrendDirection = z.infer<typeof TrendDirectionSchema>

export const TrendSnapshotSchema = z.object({
  schema: z.literal(1),
  generated: z.string().datetime(),
  window_days: z.number().int().positive(),
  audits_analyzed: z.number().int().min(0),
  overall: z.object({
    trend: TrendDirectionSchema,
    total_findings_current: z.number().int().min(0),
    total_findings_previous: z.number().int().min(0),
    delta: z.number().int(),
    fix_rate: z.number().min(0).max(1),
  }),
  by_severity: z.record(
    AuditSeveritySchema,
    z.object({
      current: z.number().int().min(0),
      previous: z.number().int().min(0),
      trend: TrendDirectionSchema,
    }),
  ),
  by_lens: z.record(
    z.string(),
    z.object({
      current: z.number().int().min(0),
      previous: z.number().int().min(0),
      trend: TrendDirectionSchema,
    }),
  ),
  worst_offenders: z.array(
    z.object({
      file: z.string(),
      total_findings: z.number().int().min(0),
      appearances: z.number().int().min(0),
      trend: TrendDirectionSchema,
    }),
  ),
  timeline: z.array(TrendEntrySchema),
})

export type TrendSnapshot = z.infer<typeof TrendSnapshotSchema>

// --- Debt Map ---

export const DebtFileEntrySchema = z.object({
  rank: z.number().int().positive(),
  file: z.string(),
  debt_score: z.number().int().min(0),
  lint_errors: z.number().int().min(0),
  lint_warnings: z.number().int().min(0),
  type_errors: z.number().int().min(0),
  top_rules: z
    .array(
      z.object({
        rule: z.string(),
        count: z.number().int().min(0),
      }),
    )
    .default([]),
})

export type DebtFileEntry = z.infer<typeof DebtFileEntrySchema>

export const DebtMapSchema = z.object({
  schema: z.literal(1),
  generated: z.string().datetime(),
  granularity: z.enum(['file', 'category', 'line']),
  total_files_scanned: z.number().int().min(0),
  total_violations: z.number().int().min(0),
  total_debt_score: z.number().int().min(0),
  summary: z.object({
    lint_errors: z.number().int().min(0),
    lint_warnings: z.number().int().min(0),
    type_errors: z.number().int().min(0),
    by_category: z.record(z.string(), z.number().int().min(0)).default({}),
  }),
  worst_offenders: z.array(DebtFileEntrySchema),
  clean_files: z.object({
    count: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
  }),
  tokens: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
})

export type DebtMap = z.infer<typeof DebtMapSchema>

// --- Factory Functions ---

/**
 * Create a new audit findings artifact
 */
export function createAuditFindings(
  mode: AuditMode,
  scope: AuditScope,
  target: string,
  lenses: AuditLens[],
): AuditFindings {
  return {
    schema: 1,
    timestamp: new Date().toISOString(),
    mode,
    scope,
    target,
    lenses_run: lenses,
    summary: {
      total_findings: 0,
      by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      by_lens: {},
      new_since_last: 0,
      recurring: 0,
      fixed_since_last: 0,
    },
    findings: [],
    metrics: {
      files_scanned: 0,
    },
  }
}

/**
 * Add findings from a lens result to the audit
 */
export function addLensFindings(audit: AuditFindings, lensResult: LensResult): AuditFindings {
  const findings = [...audit.findings, ...lensResult.findings]
  const byLens = { ...audit.summary.by_lens, [lensResult.lens]: lensResult.total_findings }

  const bySeverity = { ...audit.summary.by_severity }
  for (const finding of lensResult.findings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1
  }

  return {
    ...audit,
    timestamp: new Date().toISOString(),
    findings,
    summary: {
      ...audit.summary,
      total_findings: findings.length,
      by_severity: bySeverity,
      by_lens: byLens,
    },
  }
}

/**
 * Calculate trend direction from two values
 */
export function calculateTrend(current: number, previous: number): TrendDirection {
  if (previous === 0) return 'stable'
  const change = (current - previous) / previous
  if (change < -0.1) return 'improving'
  if (change > 0.1) return 'regressing'
  return 'stable'
}
