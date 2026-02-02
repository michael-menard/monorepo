/**
 * Commitment Gate Node
 *
 * Validates readiness criteria before allowing progression to implementation.
 * Enforces thresholds for readiness score, blockers, and unknowns.
 *
 * FLOW-034: LangGraph Gate Node - Commitment Validation
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { ReadinessResult, GraphStateWithReadiness } from '../story/readiness-score.js'

/**
 * Default gate thresholds.
 */
export const DEFAULT_GATE_THRESHOLDS = {
  /** Minimum readiness score required (>= 85) */
  MIN_READINESS_SCORE: 85,
  /** Maximum blockers allowed (== 0) */
  MAX_BLOCKERS: 0,
  /** Maximum unknowns allowed (<= 5) */
  MAX_UNKNOWNS: 5,
} as const

/**
 * Schema for gate requirements configuration.
 */
export const GateRequirementsSchema = z.object({
  /** Minimum readiness score required (>= this value) */
  readinessThreshold: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(DEFAULT_GATE_THRESHOLDS.MIN_READINESS_SCORE),
  /** Maximum blockers allowed (must equal this value or less, default 0) */
  maxBlockers: z.number().int().min(0).default(DEFAULT_GATE_THRESHOLDS.MAX_BLOCKERS),
  /** Maximum unknowns allowed (<= this value) */
  maxUnknowns: z.number().int().min(0).default(DEFAULT_GATE_THRESHOLDS.MAX_UNKNOWNS),
  /** Whether override is allowed for exceptional cases */
  allowOverride: z.boolean().default(true),
})

export type GateRequirements = z.infer<typeof GateRequirementsSchema>

/**
 * Schema for a single gate check result.
 */
export const GateCheckResultSchema = z.object({
  /** Name of the requirement being checked */
  requirement: z.enum(['readiness_score', 'blocker_count', 'unknown_count']),
  /** Expected threshold/limit */
  threshold: z.number(),
  /** Actual value observed */
  actual: z.number(),
  /** Whether the check passed */
  passed: z.boolean(),
  /** Comparison operator used */
  operator: z.enum(['>=', '<=', '==']),
  /** Human-readable description of the check */
  description: z.string().min(1),
})

export type GateCheckResult = z.infer<typeof GateCheckResultSchema>

/**
 * Schema for override request.
 */
export const OverrideRequestSchema = z.object({
  /** Who requested the override */
  requestedBy: z.string().min(1),
  /** Reason for the override */
  reason: z.string().min(10),
  /** When the override was requested */
  requestedAt: z.string().datetime(),
  /** Risks acknowledged */
  risksAcknowledged: z.array(z.string()).min(1),
})

export type OverrideRequest = z.infer<typeof OverrideRequestSchema>

/**
 * Schema for override audit entry.
 */
export const OverrideAuditEntrySchema = z.object({
  /** Story ID affected */
  storyId: z.string().min(1),
  /** Override request details */
  request: OverrideRequestSchema,
  /** Checks that were bypassed */
  bypassedChecks: z.array(GateCheckResultSchema),
  /** Readiness score at time of override */
  scoreAtOverride: z.number().int().min(0).max(100),
  /** Whether override was approved */
  approved: z.boolean(),
  /** Who approved (if approved) */
  approvedBy: z.string().optional(),
  /** Approval timestamp */
  approvedAt: z.string().datetime().optional(),
})

export type OverrideAuditEntry = z.infer<typeof OverrideAuditEntrySchema>

/**
 * Schema for the commitment gate result.
 */
export const CommitmentGateResultSchema = z.object({
  /** Story ID validated */
  storyId: z.string().min(1),
  /** Timestamp of validation */
  validatedAt: z.string().datetime(),
  /** Whether the gate passed */
  passed: z.boolean(),
  /** Individual check results */
  checks: z.array(GateCheckResultSchema),
  /** Number of checks that passed */
  passedChecks: z.number().int().min(0),
  /** Total number of checks */
  totalChecks: z.number().int().min(0),
  /** Whether override is available (only if gate failed) */
  overrideAvailable: z.boolean(),
  /** Override request if submitted */
  overrideRequest: OverrideRequestSchema.optional(),
  /** Override audit trail if override was used */
  overrideAudit: OverrideAuditEntrySchema.optional(),
  /** Summary narrative */
  summary: z.string().min(1),
  /** Requirements used for validation */
  requirements: GateRequirementsSchema,
})

export type CommitmentGateResult = z.infer<typeof CommitmentGateResultSchema>

/**
 * Schema for commitment gate node configuration.
 */
export const CommitmentGateConfigSchema = z.object({
  /** Gate requirements */
  requirements: GateRequirementsSchema.optional(),
  /** Pre-approved override request (for exceptional cases) */
  overrideRequest: OverrideRequestSchema.optional(),
})

export type CommitmentGateConfig = z.infer<typeof CommitmentGateConfigSchema>

/**
 * Schema for commitment gate node result.
 */
export const CommitmentGateNodeResultSchema = z.object({
  /** The gate validation result */
  commitmentGateResult: CommitmentGateResultSchema.nullable(),
  /** Whether validation was performed */
  validated: z.boolean(),
  /** Error message if validation failed */
  error: z.string().optional(),
})

export type CommitmentGateNodeResult = z.infer<typeof CommitmentGateNodeResultSchema>

/**
 * Checks if readiness score meets the threshold.
 *
 * @param score - The readiness score (0-100)
 * @param threshold - The minimum required score (default 85)
 * @returns Gate check result
 */
export function checkReadinessThreshold(
  score: number,
  threshold: number = DEFAULT_GATE_THRESHOLDS.MIN_READINESS_SCORE,
): GateCheckResult {
  const passed = score >= threshold
  return {
    requirement: 'readiness_score',
    threshold,
    actual: score,
    passed,
    operator: '>=',
    description: passed
      ? `Readiness score ${score} meets threshold of ${threshold}`
      : `Readiness score ${score} is below required threshold of ${threshold}`,
  }
}

/**
 * Checks if blocker count is within limit.
 *
 * @param blockers - Number of blockers found
 * @param max - Maximum blockers allowed (default 0)
 * @returns Gate check result
 */
export function checkBlockerCount(
  blockers: number,
  max: number = DEFAULT_GATE_THRESHOLDS.MAX_BLOCKERS,
): GateCheckResult {
  const passed = blockers <= max
  return {
    requirement: 'blocker_count',
    threshold: max,
    actual: blockers,
    passed,
    operator: '==',
    description: passed
      ? max === 0
        ? `No blockers found (required: 0)`
        : `Blocker count ${blockers} is within limit of ${max}`
      : `${blockers} blocker(s) found, but maximum allowed is ${max}`,
  }
}

/**
 * Checks if unknown count is within limit.
 *
 * @param unknowns - Number of unknowns found
 * @param max - Maximum unknowns allowed (default 5)
 * @returns Gate check result
 */
export function checkUnknownCount(
  unknowns: number,
  max: number = DEFAULT_GATE_THRESHOLDS.MAX_UNKNOWNS,
): GateCheckResult {
  const passed = unknowns <= max
  return {
    requirement: 'unknown_count',
    threshold: max,
    actual: unknowns,
    passed,
    operator: '<=',
    description: passed
      ? `Unknown count ${unknowns} is within limit of ${max}`
      : `${unknowns} unknown(s) found, exceeds maximum of ${max}`,
  }
}

/**
 * Generates a summary narrative for the gate result.
 *
 * @param passed - Whether the gate passed
 * @param checks - Array of check results
 * @param overrideUsed - Whether an override was used
 * @returns Summary string
 */
export function generateGateSummary(
  passed: boolean,
  checks: GateCheckResult[],
  overrideUsed: boolean = false,
): string {
  const parts: string[] = []
  const passedCount = checks.filter(c => c.passed).length
  const totalCount = checks.length

  if (passed) {
    if (overrideUsed) {
      parts.push('COMMITMENT GATE: PASSED (with override)')
      parts.push('Gate requirements were bypassed via approved override.')
    } else {
      parts.push('COMMITMENT GATE: PASSED')
      parts.push(`All ${totalCount} requirements met.`)
    }
    parts.push('Story is cleared for implementation.')
  } else {
    parts.push('COMMITMENT GATE: FAILED')
    parts.push(`${passedCount}/${totalCount} requirements met.`)

    const failedChecks = checks.filter(c => !c.passed)
    for (const check of failedChecks) {
      parts.push(`- ${check.description}`)
    }

    parts.push('Story requires additional work before implementation.')
  }

  return parts.join(' ')
}

/**
 * Creates an override audit entry.
 *
 * @param storyId - Story ID
 * @param request - Override request
 * @param checks - Check results
 * @param score - Current readiness score
 * @param approved - Whether override is approved
 * @param approvedBy - Who approved (optional)
 * @returns Override audit entry
 */
export function createOverrideAudit(
  storyId: string,
  request: OverrideRequest,
  checks: GateCheckResult[],
  score: number,
  approved: boolean,
  approvedBy?: string,
): OverrideAuditEntry {
  const bypassedChecks = checks.filter(c => !c.passed)

  const audit: OverrideAuditEntry = {
    storyId,
    request,
    bypassedChecks,
    scoreAtOverride: score,
    approved,
  }

  if (approved && approvedBy) {
    audit.approvedBy = approvedBy
    audit.approvedAt = new Date().toISOString()
  }

  return OverrideAuditEntrySchema.parse(audit)
}

/**
 * Validates commitment readiness from a readiness result.
 *
 * @param readinessResult - The readiness analysis result
 * @param config - Optional configuration
 * @returns Commitment gate result
 */
export function validateCommitmentReadiness(
  readinessResult: ReadinessResult,
  config: CommitmentGateConfig = {},
): CommitmentGateResult {
  const requirements = GateRequirementsSchema.parse(config.requirements ?? {})

  // Extract values from readiness result
  const score = readinessResult.score
  const blockers = readinessResult.factors.mvpBlockingCount
  const unknowns = readinessResult.factors.knownUnknownsCount

  // Run all checks
  const checks: GateCheckResult[] = [
    checkReadinessThreshold(score, requirements.readinessThreshold),
    checkBlockerCount(blockers, requirements.maxBlockers),
    checkUnknownCount(unknowns, requirements.maxUnknowns),
  ]

  const passedChecks = checks.filter(c => c.passed).length
  const allChecksPassed = passedChecks === checks.length

  // Handle override if provided and gate failed
  let overrideUsed = false
  let overrideAudit: OverrideAuditEntry | undefined

  if (!allChecksPassed && config.overrideRequest && requirements.allowOverride) {
    // Create audit trail for override
    overrideAudit = createOverrideAudit(
      readinessResult.storyId,
      config.overrideRequest,
      checks,
      score,
      true, // Auto-approve if override request is provided in config
      'system', // System-approved override
    )
    overrideUsed = true
  }

  const passed = allChecksPassed || overrideUsed
  const summary = generateGateSummary(passed, checks, overrideUsed)

  return CommitmentGateResultSchema.parse({
    storyId: readinessResult.storyId,
    validatedAt: new Date().toISOString(),
    passed,
    checks,
    passedChecks,
    totalChecks: checks.length,
    overrideAvailable: !allChecksPassed && requirements.allowOverride && !overrideUsed,
    overrideRequest: config.overrideRequest,
    overrideAudit,
    summary,
    requirements,
  })
}

/**
 * Extended graph state with commitment gate validation.
 */
export interface GraphStateWithCommitmentGate extends GraphStateWithReadiness {
  /** Commitment gate result */
  commitmentGateResult?: CommitmentGateResult | null
  /** Whether commitment was validated */
  commitmentValidated?: boolean
}

/**
 * Commitment Gate node implementation.
 *
 * Validates that a story meets the commitment requirements before
 * allowing progression to implementation:
 * - Readiness score >= 85
 * - Blockers == 0
 * - Unknowns <= 5
 *
 * Supports override mechanism for exceptional cases with full audit trail.
 *
 * @param state - Current graph state (must have readiness result)
 * @returns Partial state update with commitment gate result
 */
export const commitmentGateNode = createToolNode(
  'commitment_gate',
  async (state: GraphState): Promise<Partial<GraphStateWithCommitmentGate>> => {
    const stateWithReadiness = state as GraphStateWithCommitmentGate

    // Require readiness result
    if (!stateWithReadiness.readinessResult) {
      return updateState({
        commitmentGateResult: null,
        commitmentValidated: false,
      } as Partial<GraphStateWithCommitmentGate>)
    }

    const result = validateCommitmentReadiness(stateWithReadiness.readinessResult)

    return updateState({
      commitmentGateResult: result,
      commitmentValidated: true,
    } as Partial<GraphStateWithCommitmentGate>)
  },
)

/**
 * Creates a commitment gate node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createCommitmentGateNode(config: CommitmentGateConfig = {}) {
  return createToolNode(
    'commitment_gate',
    async (state: GraphState): Promise<Partial<GraphStateWithCommitmentGate>> => {
      const stateWithReadiness = state as GraphStateWithCommitmentGate

      // Require readiness result
      if (!stateWithReadiness.readinessResult) {
        throw new Error('Readiness result is required for commitment gate validation')
      }

      const result = validateCommitmentReadiness(stateWithReadiness.readinessResult, config)

      return updateState({
        commitmentGateResult: result,
        commitmentValidated: true,
      } as Partial<GraphStateWithCommitmentGate>)
    },
  )
}

/**
 * Creates a commitment gate node with override capability.
 * This is used for exceptional cases where the gate must be bypassed.
 *
 * @param overrideRequest - Override request with justification
 * @param requirements - Optional custom requirements
 * @returns Configured node function with override
 */
export function createCommitmentGateWithOverride(
  overrideRequest: OverrideRequest,
  requirements?: Partial<GateRequirements>,
) {
  return createCommitmentGateNode({
    requirements: requirements ? GateRequirementsSchema.parse(requirements) : undefined,
    overrideRequest,
  })
}
