import { z } from 'zod'

/**
 * EVIDENCE.yaml Schema (v2)
 *
 * Single source of truth for implementation evidence.
 * Written by execute leader, read by review and QA phases.
 *
 * v2 Changes (ADR-006):
 * - Added e2e_tests section with detailed E2E results
 * - Added config_issues tracking for workflow feedback loop
 * - E2E tests now run during dev phase with live resources
 */

export const EvidenceItemSchema = z.object({
  type: z.enum(['test', 'http', 'command', 'file', 'screenshot', 'manual', 'e2e']),
  path: z.string().optional(),
  command: z.string().optional(),
  result: z.string().optional(),
  description: z.string(),
  timestamp: z.string().datetime().optional(),
})

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>

export const AcceptanceCriteriaEvidenceSchema = z.object({
  ac_id: z.string(),
  ac_text: z.string().optional(),
  status: z.enum(['PASS', 'MISSING', 'PARTIAL']),
  evidence_items: z.array(EvidenceItemSchema),
  reason: z.string().optional(),
})

export type AcceptanceCriteriaEvidence = z.infer<typeof AcceptanceCriteriaEvidenceSchema>

export const TouchedFileSchema = z.object({
  path: z.string(),
  action: z.enum(['created', 'modified', 'deleted']),
  lines: z.number().int().positive().optional(),
  description: z.string().optional(),
})

export type TouchedFile = z.infer<typeof TouchedFileSchema>

export const CommandRunSchema = z.object({
  command: z.string(),
  result: z.enum(['SUCCESS', 'FAIL', 'SKIPPED']),
  output: z.string().optional(),
  timestamp: z.string().datetime(),
  duration_ms: z.number().int().min(0).optional(),
})

export type CommandRun = z.infer<typeof CommandRunSchema>

export const EndpointExercisedSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  path: z.string(),
  status: z.number().int().min(100).max(599),
  description: z.string().optional(),
})

export type EndpointExercised = z.infer<typeof EndpointExercisedSchema>

/**
 * Config Issue Schema (v2 - ADR-006)
 *
 * Captures configuration mismatches discovered during E2E testing.
 * Used for workflow feedback loop to improve future stories.
 */
export const ConfigIssueTypeSchema = z.enum([
  'url_mismatch',
  'env_var_missing',
  'env_var_wrong',
  'response_shape_mismatch',
  'auth_config_mismatch',
  'cors_issue',
])

export type ConfigIssueType = z.infer<typeof ConfigIssueTypeSchema>

export const ConfigIssueSchema = z.object({
  type: ConfigIssueTypeSchema,
  description: z.string(),
  expected: z.string().nullable().optional(),
  actual: z.string().nullable().optional(),
  files: z.array(z.string()).default([]),
  resolution: z.string().nullable().optional(),
})

export type ConfigIssue = z.infer<typeof ConfigIssueSchema>

/**
 * Failed E2E Test Schema
 */
export const FailedE2ETestSchema = z.object({
  name: z.string(),
  file: z.string(),
  error: z.string(),
  video: z.string().nullable().optional(),
  screenshot: z.string().nullable().optional(),
})

export type FailedE2ETest = z.infer<typeof FailedE2ETestSchema>

/**
 * E2E Tests Schema (v2 - ADR-006)
 *
 * Detailed E2E test results including config issues discovered.
 * E2E tests run during dev phase with live resources (no mocking).
 */
export const E2ETestsSchema = z.object({
  status: z.enum(['pass', 'fail', 'skipped']),
  skip_reason: z.string().nullable().optional(),
  config: z.string().default('playwright.legacy.config.ts'),
  project: z.string().default('chromium-live'),
  mode: z.literal('live'), // MUST always be 'live' per ADR-006

  results: z.object({
    total: z.number().int().min(0),
    passed: z.number().int().min(0),
    failed: z.number().int().min(0),
    skipped: z.number().int().min(0).default(0),
  }),

  failed_tests: z.array(FailedE2ETestSchema).default([]),

  // Config issues discovered during E2E (for workflow improvement)
  config_issues: z.array(ConfigIssueSchema).default([]),

  // Evidence artifacts
  videos: z.array(z.string()).default([]),
  screenshots: z.array(z.string()).default([]),
})

export type E2ETests = z.infer<typeof E2ETestsSchema>

export const TokenSummarySchema = z.object({
  setup: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
  plan: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
  execute: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
  proof: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
  review: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
  qa: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
})

export type TokenSummary = z.infer<typeof TokenSummarySchema>

export const EvidenceSchema = z.object({
  schema: z.literal(2), // Bumped for ADR-006 E2E integration
  story_id: z.string(),
  version: z.number().int().positive().default(1),
  timestamp: z.string().datetime(),

  // AC evidence - the core of the evidence bundle
  acceptance_criteria: z.array(AcceptanceCriteriaEvidenceSchema),

  // Files touched during implementation
  touched_files: z.array(TouchedFileSchema),

  // Commands run and their results
  commands_run: z.array(CommandRunSchema),

  // API endpoints exercised
  endpoints_exercised: z.array(EndpointExercisedSchema).default([]),

  // Notable decisions made during implementation
  notable_decisions: z.array(z.string()).default([]),

  // Known deviations from plan
  known_deviations: z.array(z.string()).default([]),

  // Token summary per phase
  token_summary: TokenSummarySchema.optional(),

  // Test results summary (unit, integration, http)
  test_summary: z
    .object({
      unit: z.object({ pass: z.number(), fail: z.number() }).optional(),
      integration: z.object({ pass: z.number(), fail: z.number() }).optional(),
      e2e: z.object({ pass: z.number(), fail: z.number() }).optional(), // Legacy - use e2e_tests for details
      http: z.object({ pass: z.number(), fail: z.number() }).optional(),
    })
    .optional(),

  // E2E Tests (v2 - ADR-006)
  // Detailed E2E test results with config issue tracking
  // E2E tests run during dev phase with live resources (no mocking)
  e2e_tests: E2ETestsSchema.optional(),

  // Coverage summary
  coverage: z
    .object({
      lines: z.number().min(0).max(100).optional(),
      branches: z.number().min(0).max(100).optional(),
      functions: z.number().min(0).max(100).optional(),
      statements: z.number().min(0).max(100).optional(),
    })
    .optional(),
})

export type Evidence = z.infer<typeof EvidenceSchema>

/**
 * Create an empty evidence bundle for a story
 */
export function createEvidence(storyId: string): Evidence {
  return {
    schema: 2,
    story_id: storyId,
    version: 1,
    timestamp: new Date().toISOString(),
    acceptance_criteria: [],
    touched_files: [],
    commands_run: [],
    endpoints_exercised: [],
    notable_decisions: [],
    known_deviations: [],
  }
}

/**
 * Create an E2E tests result object
 */
export function createE2ETests(results: {
  total: number
  passed: number
  failed: number
  skipped?: number
}): E2ETests {
  const status = results.failed > 0 ? 'fail' : results.total === 0 ? 'skipped' : 'pass'
  return {
    status,
    skip_reason: null,
    config: 'playwright.legacy.config.ts',
    project: 'chromium-live',
    mode: 'live',
    results: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped ?? 0,
    },
    failed_tests: [],
    config_issues: [],
    videos: [],
    screenshots: [],
  }
}

/**
 * Add E2E tests to evidence
 */
export function addE2ETests(evidence: Evidence, e2eTests: E2ETests): Evidence {
  return {
    ...evidence,
    e2e_tests: e2eTests,
    // Also update legacy test_summary.e2e for backwards compatibility
    test_summary: {
      ...evidence.test_summary,
      e2e: { pass: e2eTests.results.passed, fail: e2eTests.results.failed },
    },
    version: evidence.version + 1,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Add a config issue to E2E tests
 */
export function addConfigIssue(evidence: Evidence, issue: ConfigIssue): Evidence {
  if (!evidence.e2e_tests) {
    throw new Error('Cannot add config issue: e2e_tests not initialized')
  }
  return {
    ...evidence,
    e2e_tests: {
      ...evidence.e2e_tests,
      config_issues: [...evidence.e2e_tests.config_issues, issue],
    },
    version: evidence.version + 1,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Add or update an AC evidence entry
 */
export function updateAcEvidence(
  evidence: Evidence,
  acId: string,
  update: Partial<AcceptanceCriteriaEvidence>,
): Evidence {
  const existing = evidence.acceptance_criteria.findIndex(ac => ac.ac_id === acId)
  const updatedAcs = [...evidence.acceptance_criteria]

  if (existing >= 0) {
    updatedAcs[existing] = { ...updatedAcs[existing], ...update }
  } else {
    updatedAcs.push({
      ac_id: acId,
      status: 'MISSING',
      evidence_items: [],
      ...update,
    })
  }

  return {
    ...evidence,
    acceptance_criteria: updatedAcs,
    version: evidence.version + 1,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Add a touched file to evidence
 */
export function addTouchedFile(evidence: Evidence, file: TouchedFile): Evidence {
  return {
    ...evidence,
    touched_files: [...evidence.touched_files, file],
    version: evidence.version + 1,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Add a command run to evidence
 */
export function addCommandRun(evidence: Evidence, command: CommandRun): Evidence {
  return {
    ...evidence,
    commands_run: [...evidence.commands_run, command],
    version: evidence.version + 1,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Check if all ACs have PASS status
 */
export function allAcsPassing(evidence: Evidence): boolean {
  return evidence.acceptance_criteria.every(ac => ac.status === 'PASS')
}

/**
 * Get list of missing ACs
 */
export function getMissingAcs(evidence: Evidence): string[] {
  return evidence.acceptance_criteria.filter(ac => ac.status !== 'PASS').map(ac => ac.ac_id)
}
