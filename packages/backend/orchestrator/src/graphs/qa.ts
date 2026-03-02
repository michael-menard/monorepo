/**
 * QA Graph
 *
 * Autonomous QA verification graph for story implementation quality assurance.
 * Runs unit tests, E2E tests, verifies acceptance criteria, and produces a
 * QA-VERIFY.yaml artifact.
 *
 * AC-1: QAGraphConfigSchema with all required fields and defaults
 * AC-2: QAGraphStateAnnotation with all required state fields
 * AC-10: StateGraph wiring with all conditional edges
 * AC-11: runQA() entry function returning QAGraphResult
 * AC-17: worktreeDir required field (no default)
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import type { Evidence } from '../artifacts/evidence.js'
import type { Review } from '../artifacts/review.js'
import type { QaVerify } from '../artifacts/qa-verify.js'

// ============================================================================
// Config Schema (AC-1, AC-17)
// ============================================================================

/**
 * Configuration for the QA graph.
 * AC-1: All fields with defaults
 * AC-17: worktreeDir required (no default)
 */
export const QAGraphConfigSchema = z.object({
  /** Absolute path to the worktree directory (required, AC-17) */
  worktreeDir: z.string().min(1),

  /** Story ID under test (validated format: PREFIX-DIGITS) */
  storyId: z.string().regex(/^[A-Z]{2,10}-\d{3,5}$/, 'Invalid story ID format'),

  /** Whether to run E2E tests */
  enableE2e: z.boolean().default(true),

  /** pnpm filter for unit tests (e.g. @repo/orchestrator) */
  testFilter: z.string().regex(/^[@\w\-\/\*]*$/, 'Invalid pnpm filter format').default('@repo/orchestrator'),

  /** Playwright config file */
  playwrightConfig: z.string().regex(/^[\w\-\.\/]*\.ts$/, 'Invalid Playwright config filename').default('playwright.legacy.config.ts'),

  /** Playwright project */
  playwrightProject: z.string().regex(/^[\w\-]*$/, 'Invalid Playwright project name').default('chromium-live'),

  /** Timeout for unit tests in ms */
  testTimeoutMs: z.number().int().positive().default(300000), // 5 minutes

  /** Max retries for unit tests on timeout */
  testTimeoutRetries: z.number().int().min(0).default(1),

  /** Max retries for E2E tests */
  playwrightMaxRetries: z.number().int().min(0).default(2),

  /** Whether to write lessons back to KB */
  kbWriteBackEnabled: z.boolean().default(false),

  /** Base directory for artifact output */
  artifactBaseDir: z.string().default('plans/future/platform/autonomous-pipeline/in-progress'),

  /** Gate model name for final decision */
  gateModel: z.string().default('claude-sonnet-4-5'),

  /** Node timeout ms for LLM nodes */
  nodeTimeoutMs: z.number().int().positive().default(60000),
})

export type QAGraphConfig = z.infer<typeof QAGraphConfigSchema>

// ============================================================================
// State Annotation (AC-2)
// ============================================================================

/** Simple overwrite reducer */
const overwrite = <T>(_: T, b: T): T => b

export type QAVerdict = 'PASS' | 'FAIL' | 'BLOCKED'

/**
 * Per-AC verification result from verify-acs node
 */
export const AcVerificationResultSchema = z.object({
  ac_id: z.string(),
  status: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  cited_evidence: z.string().optional(),
  reasoning: z.string().optional(),
})

export type AcVerificationResult = z.infer<typeof AcVerificationResultSchema>

/**
 * Unit test run result
 */
export const CommandRunResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number(),
  timedOut: z.boolean().default(false),
})

export type CommandRunResult = z.infer<typeof CommandRunResultSchema>

/**
 * Gate decision data from gate-decision node
 */
export const GateDecisionDataSchema = z.object({
  verdict: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  blocking_issues: z.string(),
  reasoning: z.string(),
})

export type GateDecisionData = z.infer<typeof GateDecisionDataSchema>

/**
 * LangGraph state annotation for QA graph (AC-2)
 */
export const QAGraphStateAnnotation = Annotation.Root({
  // ---- Required by node-factory (state.storyId) ----
  /** Story ID - required by node-factory infrastructure */
  storyId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  // ---- Inputs ----
  /** Evidence artifact from execute phase */
  evidence: Annotation<Evidence | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Review artifact from review phase */
  review: Annotation<Review | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Graph configuration */
  config: Annotation<QAGraphConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // ---- Preconditions ----
  /** Whether preconditions passed */
  preconditionsPassed: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // ---- Test Results ----
  /** Unit test command run result */
  unitTestResult: Annotation<CommandRunResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Unit test verdict */
  unitTestVerdict: Annotation<QAVerdict | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** E2E test per-attempt results */
  playwrightAttempts: Annotation<CommandRunResult[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** E2E test verdict */
  e2eVerdict: Annotation<QAVerdict | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // ---- AC Verifications ----
  /** Per-AC verification results */
  acVerifications: Annotation<AcVerificationResult[]>({
    reducer: overwrite,
    default: () => [],
  }),

  // ---- Gate Decision ----
  /** Aggregated verdict from gate model */
  qaVerdict: Annotation<QAVerdict | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Full gate decision data */
  gateDecision: Annotation<GateDecisionData | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // ---- Final Artifact ----
  /** Constructed QaVerify artifact */
  qaArtifact: Annotation<QaVerify | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Whether QA is fully complete */
  qaComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // ---- Errors / Warnings ----
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  warnings: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type QAGraphState = typeof QAGraphStateAnnotation.State

// ============================================================================
// Result Schema (AC-11)
// ============================================================================

export const QAGraphResultSchema = z.object({
  storyId: z.string(),
  verdict: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  qaArtifact: z.unknown().nullable(),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type QAGraphResult = z.infer<typeof QAGraphResultSchema>

// ============================================================================
// ModelClient schema (injectable for testing)
// ============================================================================

const ModelClientSchema = z.object({
  callModel: z.function()
    .args(z.string(), z.object({ model: z.string() }).optional())
    .returns(z.promise(z.string())),
})

export type ModelClient = z.infer<typeof ModelClientSchema>

// ============================================================================
// Conditional Edge Functions (AC-10)
// ============================================================================

/**
 * After check-preconditions: blocked if preconditions fail
 */
export function afterCheckPreconditions(state: QAGraphState): 'run_unit_tests' | typeof END {
  if (!state.preconditionsPassed) {
    return END
  }
  return 'run_unit_tests'
}

/**
 * After run-unit-tests: skip E2E if disabled, else run E2E
 */
export function afterRunUnitTests(state: QAGraphState): 'run_e2e_tests' | 'verify_acs' {
  const config = state.config
  if (!config?.enableE2e) {
    return 'verify_acs'
  }
  // If unit tests produced a hard FAIL (non-timeout), still run verify_acs per routing
  // E2E is only skipped when enableE2e:false
  return 'run_e2e_tests'
}

/**
 * After run-e2e-tests: always go to verify_acs
 */
export function afterRunE2ETests(_state: QAGraphState): 'verify_acs' {
  return 'verify_acs'
}

// ============================================================================
// Graph Factory (AC-10)
// ============================================================================

/**
 * Creates the QA graph with injected dependencies.
 *
 * @param config - QA graph configuration
 * @param deps - Injected dependencies (modelClient for testing)
 */
export function createQAGraph(config: QAGraphConfig, deps: { modelClient: ModelClient }) {
  // Lazy-import node factories to allow mocking in tests
  const getCheckPreconditions = async () => {
    const { createCheckPreconditionsNode } = await import('../nodes/qa/check-preconditions.js')
    return createCheckPreconditionsNode()
  }

  const getRunUnitTests = async () => {
    const { createRunUnitTestsNode } = await import('../nodes/qa/run-unit-tests.js')
    return createRunUnitTestsNode(config)
  }

  const getRunE2ETests = async () => {
    const { createRunE2ETestsNode } = await import('../nodes/qa/run-e2e-tests.js')
    return createRunE2ETestsNode(config)
  }

  const getVerifyAcs = async () => {
    const { createVerifyAcsNode } = await import('../nodes/qa/verify-acs.js')
    return createVerifyAcsNode(deps.modelClient)
  }

  const getGateDecision = async () => {
    const { createGateDecisionNode } = await import('../nodes/qa/gate-decision.js')
    return createGateDecisionNode(deps.modelClient, config)
  }

  const getWriteQaArtifact = async () => {
    const { createWriteQaArtifactNode } = await import('../nodes/qa/write-qa-artifact.js')
    return createWriteQaArtifactNode(config)
  }

  // Wrap async node factories: NodeFunction uses GraphState internally, but LangGraph
  // routes QAGraphState. We cast at the boundary since nodes do internal casting.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeNode = (factory: () => Promise<(state: any) => Promise<any>>) => {
    return async (state: QAGraphState): Promise<Partial<QAGraphState>> => {
      const node = await factory()
      return node(state)
    }
  }

  const graph = new StateGraph(QAGraphStateAnnotation)
    .addNode('check_preconditions', makeNode(getCheckPreconditions))
    .addNode('run_unit_tests', makeNode(getRunUnitTests))
    .addNode('run_e2e_tests', makeNode(getRunE2ETests))
    .addNode('verify_acs', makeNode(getVerifyAcs))
    .addNode('gate_decision', makeNode(getGateDecision))
    .addNode('write_qa_artifact', makeNode(getWriteQaArtifact))

    .addEdge(START, 'check_preconditions')
    .addConditionalEdges('check_preconditions', afterCheckPreconditions, {
      run_unit_tests: 'run_unit_tests',
      [END]: END,
    })
    .addConditionalEdges('run_unit_tests', afterRunUnitTests, {
      run_e2e_tests: 'run_e2e_tests',
      verify_acs: 'verify_acs',
    })
    .addEdge('run_e2e_tests', 'verify_acs')
    .addEdge('verify_acs', 'gate_decision')
    .addEdge('gate_decision', 'write_qa_artifact')
    .addEdge('write_qa_artifact', END)

  return graph.compile()
}

// ============================================================================
// Entry Function (AC-11)
// ============================================================================

/**
 * Run QA graph for a story.
 *
 * @param evidence - EVIDENCE.yaml content
 * @param review - REVIEW.yaml content
 * @param config - QA graph configuration (must include worktreeDir)
 * @param deps - Injectable dependencies
 * @returns QAGraphResult with verdict and artifact
 */
export async function runQA(
  evidence: Evidence,
  review: Review,
  config: QAGraphConfig,
  deps: { modelClient: ModelClient },
): Promise<QAGraphResult> {
  const startTime = Date.now()
  const graph = createQAGraph(config, deps)

  const initialState: Partial<QAGraphState> = {
    storyId: config.storyId,
    evidence,
    review,
    config,
  }

  try {
    const result = await graph.invoke(initialState)
    const durationMs = Date.now() - startTime

    return QAGraphResultSchema.parse({
      storyId: config.storyId,
      verdict: result.qaVerdict ?? result.gateDecision?.verdict ?? 'BLOCKED',
      qaArtifact: result.qaArtifact ?? null,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during QA'

    return {
      storyId: config.storyId,
      verdict: 'BLOCKED',
      qaArtifact: null,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: [errorMessage],
      warnings: [],
    }
  }
}
