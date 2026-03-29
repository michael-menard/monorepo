/**
 * benchmark-corpus.ts
 *
 * Task corpus for the benchmark harness.
 * Contains 3+ prompts per category sourced from real monorepo context:
 * actual TypeScript code snippets, real elaboration YAML fragments, real lint output.
 *
 * Categories:
 *   - code_generation (3 tasks)
 *   - code_review     (3 tasks)
 *   - elaboration_analysis (3 tasks)
 *   - lint_syntax     (3 tasks)
 *
 * WINT-0270: Benchmark Harness for Ollama Model Selection
 *
 * @module model-selector/benchmark-corpus
 */

import type { BenchmarkTask } from './__types__/benchmark.js'

// ============================================================================
// code_generation tasks
// ============================================================================

/**
 * code_generation_001: Zod schema generation
 * Sourced from the pattern in packages/backend/orchestrator/src/model-selector/__types__/index.ts
 */
const codeGenZodSchema: BenchmarkTask = {
  id: 'code_generation_001',
  category: 'code_generation',
  description: 'Generate a Zod schema for a run record with cost, latency, and task fields',
  prompt: `You are a TypeScript developer working in a pnpm monorepo.

Write a Zod schema named RunRecordSchema that extends QualityEvaluationSchema with three additional fields:
- cost_usd: a non-negative number representing cost in USD (0 for free local models)
- latency_ms: a non-negative number representing wall-clock inference time in milliseconds
- task_id: a non-empty string identifier for the benchmark task

Follow these rules:
- Use \`import { z } from 'zod'\`
- Use z.number().min(0) for numeric fields
- Export the schema as a named export
- Add a type alias using \`z.infer<typeof RunRecordSchema>\`
- No semicolons, single quotes, trailing commas, 2-space indent

Return only the TypeScript code.`,
  expectedKeywords: [
    'z.object',
    'z.number',
    'z.string',
    'RunRecordSchema',
    'z.infer',
    'cost_usd',
    'latency_ms',
    'task_id',
  ],
}

/**
 * code_generation_002: Function with error handling
 * Sourced from pattern in packages/backend/orchestrator/src/model-selector/leaderboard.ts
 */
const codeGenAtomicWrite: BenchmarkTask = {
  id: 'code_generation_002',
  category: 'code_generation',
  description: 'Generate an atomic file write function using temp file + rename pattern',
  prompt: `You are a TypeScript developer working on a Node.js backend service.

Write an async function named \`atomicWriteYaml\` that:
1. Accepts \`filePath: string\` and \`content: string\` parameters
2. Generates a temp file path in the same directory with a random suffix (e.g., \`.basename.abc123.tmp.yaml\`)
3. Writes \`content\` to the temp file using \`fs.writeFile\`
4. Renames the temp file to \`filePath\` using \`fs.rename\` (atomic on same filesystem)
5. On rename failure, deletes the temp file and re-throws the error
6. Creates the parent directory if it does not exist (using \`fs.mkdir\` with \`recursive: true\`)

Use:
- \`import * as fs from 'fs/promises'\`
- \`import * as path from 'path'\`

Rules: no semicolons, single quotes, trailing commas, 2-space indent. TypeScript strict mode compatible.

Return only the TypeScript function.`,
  expectedKeywords: ['fs.writeFile', 'fs.rename', 'fs.mkdir', 'async', 'filePath', 'recursive'],
}

/**
 * code_generation_003: Quality evaluator dimension function
 * Sourced from pattern in packages/backend/orchestrator/src/models/quality-evaluator.ts
 */
const codeGenQualityDimension: BenchmarkTask = {
  id: 'code_generation_003',
  category: 'code_generation',
  description: 'Generate a quality dimension evaluator function for coherence checking',
  prompt: `You are a TypeScript developer implementing a heuristic quality evaluator.

Write a function \`evaluateCoherence\` that:
- Takes \`(contract: TaskContract, output: string)\` parameters
- Returns \`QualityDimensionScore\` (an object with: dimension, score, rationale, weight)
- Sets dimension to \`'coherence'\`
- Checks for transition words: 'therefore', 'however', 'furthermore', 'additionally', 'thus'
- Each transition word found adds 10 points (capped at 40)
- Multi-paragraph output (2+ double newlines) adds 20 points
- Returns score 0 for empty output with rationale 'Empty output has no coherence'
- Sets weight to 0.2
- Clamps final score to 0-100 using Math.max/Math.min

Use @repo/logger for logging: \`import { logger } from '@repo/logger'\`

Rules: TypeScript, no semicolons, single quotes, trailing commas, 2-space indent.`,
  expectedKeywords: [
    'evaluateCoherence',
    'transition',
    'score',
    'rationale',
    'weight',
    'coherence',
  ],
}

// ============================================================================
// code_review tasks
// ============================================================================

/**
 * code_review_001: Review a leaderboard entry update for correctness
 * Sourced from logic in packages/backend/orchestrator/src/model-selector/leaderboard.ts
 */
const codeReviewLeaderboardUpdate: BenchmarkTask = {
  id: 'code_review_001',
  category: 'code_review',
  description: 'Review a running average update function for correctness',
  prompt: `Review this TypeScript code that updates running averages in a leaderboard entry.
Identify any bugs, edge cases, or improvements needed.

\`\`\`typescript
function updateRunningAverage(
  oldAvg: number,
  newValue: number,
  newCount: number
): number {
  return oldAvg + (newValue - oldAvg) / newCount
}

function updateLeaderboardEntry(entry: LeaderboardEntry, run: RunRecord): LeaderboardEntry {
  const newCount = entry.runs_count + 1
  return {
    ...entry,
    runs_count: newCount,
    avg_quality: updateRunningAverage(entry.avg_quality, run.qualityScore, newCount),
    avg_cost_usd: updateRunningAverage(entry.avg_cost_usd, run.cost_usd, newCount),
    avg_latency_ms: updateRunningAverage(entry.avg_latency_ms, run.latency_ms, newCount),
    recent_run_scores: [...entry.recent_run_scores, run.qualityScore].slice(-5),
    last_run_at: run.timestamp,
  }
}
\`\`\`

Provide a concise code review covering:
1. Correctness of the incremental average formula
2. Edge cases (first run, very large counts, NaN/Infinity)
3. Immutability (does it mutate entry?)
4. Any TypeScript-specific improvements`,
  expectedKeywords: ['formula', 'edge case', 'immut', 'average', 'count'],
}

/**
 * code_review_002: Review a Zod schema for completeness
 * Sourced from patterns in packages/backend/orchestrator/src/model-selector/__types__/index.ts
 */
const codeReviewZodSchema: BenchmarkTask = {
  id: 'code_review_002',
  category: 'code_review',
  description: 'Review a Zod schema for completeness and correctness',
  prompt: `Review this Zod schema definition for a model leaderboard entry.
Identify any missing constraints, incorrect types, or design issues.

\`\`\`typescript
import { z } from 'zod'

const LeaderboardEntrySchema = z.object({
  task_id: z.string(),
  model: z.string(),
  runs_count: z.number(),
  avg_quality: z.number(),
  avg_cost_usd: z.number(),
  avg_latency_ms: z.number(),
  value_score: z.number(),
  recent_run_scores: z.array(z.number()),
  convergence_status: z.string(),
  convergence_confidence: z.number(),
  quality_trend: z.string(),
  last_run_at: z.string(),
})
\`\`\`

Review against these requirements:
1. task_id and model should be non-empty strings
2. runs_count must be a non-negative integer
3. avg_quality, avg_latency_ms must be >= 0
4. avg_quality and all quality scores must be bounded 0-100
5. value_score should have a maximum cap
6. convergence_status should be an enum: 'exploring' | 'converging' | 'converged'
7. quality_trend should be an enum: 'improving' | 'stable' | 'degrading'
8. last_run_at should be validated as ISO 8601 datetime

List each issue found and provide the corrected schema.`,
  expectedKeywords: ['enum', 'min', 'max', 'integer', 'datetime', 'non-empty', 'constraint'],
}

/**
 * code_review_003: Review an async file operation for error handling
 * Sourced from pattern in packages/backend/orchestrator/src/model-selector/leaderboard.ts
 */
const codeReviewFileOps: BenchmarkTask = {
  id: 'code_review_003',
  category: 'code_review',
  description: 'Review async file operation error handling for robustness',
  prompt: `Review this TypeScript function that loads a YAML leaderboard from disk.
Identify any error handling gaps or robustness issues.

\`\`\`typescript
import * as fs from 'fs/promises'
import * as yaml from 'yaml'

async function loadLeaderboard(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8')
  const parsed = yaml.parse(content)
  return parsed
}
\`\`\`

Review against these requirements:
1. File not found should return an empty leaderboard (not throw)
2. Other filesystem errors should be logged and return empty leaderboard
3. Invalid YAML should not crash the process
4. Schema validation should be applied after parsing
5. The return type should be typed, not \`any\`

Provide specific improvements for each issue, with corrected code.`,
  expectedKeywords: ['ENOENT', 'try', 'catch', 'error', 'schema', 'validation', 'type'],
}

// ============================================================================
// elaboration_analysis tasks
// ============================================================================

/**
 * elaboration_analysis_001: Analyze a PLAN.yaml for completeness
 * Sourced from real PLAN.yaml structure in _implementation/PLAN.yaml
 */
const elaborationAnalyzePlan: BenchmarkTask = {
  id: 'elaboration_analysis_001',
  category: 'elaboration_analysis',
  description: 'Analyze a PLAN.yaml step for completeness and ambiguity',
  prompt: `Analyze this implementation plan step from a PLAN.yaml file and identify any gaps, ambiguities, or missing details that would block a developer from implementing it.

\`\`\`yaml
- id: 3
  description: >-
    Implement the benchmark harness runner — iterates tasks x models, measures latency,
    calls evaluateQuality() and recordRun(), builds summary table
  files:
    - packages/backend/orchestrator/src/model-selector/benchmark-harness.ts
  files_to_read:
    - packages/backend/orchestrator/src/model-selector/constants.ts
    - packages/backend/orchestrator/src/model-selector/__types__/benchmark.ts
    - packages/backend/orchestrator/src/model-selector/benchmark-corpus.ts
    - packages/backend/orchestrator/src/models/quality-evaluator.ts
    - packages/backend/orchestrator/src/model-selector/leaderboard.ts
  dependencies: [1, 2]
  slice: packages
  verification: pnpm check-types --filter @repo/orchestrator
  acs_covered: [AC-2, AC-3, AC-4, AC-7]
\`\`\`

Analyze for:
1. What is the expected function signature for the harness entry point?
2. Are the 5 models to benchmark specified or implied?
3. How should errors (network failure, model not found) be handled?
4. What should the summary table format look like (console output vs file)?
5. What are the acceptance criteria AC-2, AC-3, AC-4, AC-7 likely requiring?

Provide a structured analysis with specific questions and suggested clarifications.`,
  expectedKeywords: ['function', 'error', 'model', 'summary', 'acceptance', 'criteria'],
}

/**
 * elaboration_analysis_002: Analyze acceptance criteria for testability
 * Sourced from real PLAN.yaml acs in _implementation/PLAN.yaml
 */
const elaborationAnalyzeAcs: BenchmarkTask = {
  id: 'elaboration_analysis_002',
  category: 'elaboration_analysis',
  description: 'Analyze acceptance criteria for testability and completeness',
  prompt: `Analyze these acceptance criteria from a story about building a benchmark harness for local AI models.
Evaluate each for testability, completeness, and potential gaps.

AC-1: The harness shall include a task corpus with at least 3 prompts per category for 4 categories: code_generation, code_review, elaboration_analysis, lint_syntax.

AC-2: The harness shall iterate all 5 required Ollama models against each task, recording latency_ms, cost_usd=0, and raw output per run.

AC-3: For each (model, task) pair, the harness shall call evaluateQuality() and recordRun() to persist results to the leaderboard YAML.

AC-4: The harness shall include a QUALITY_EVALUATOR_LIMITATION constant documenting that scores are heuristic-only (keyword matching, length heuristics, no semantic analysis).

AC-5: MODEL_LEADERBOARD_PATH shall be a named constant in constants.ts, not hardcoded in harness files.

AC-6: The benchmark script shall be developer-local only (scripts/benchmark-models.ts) and NOT referenced in CI configuration.

For each AC:
1. Is it testable with unit tests? How?
2. Is it complete (no ambiguity)?
3. Any edge cases not covered?`,
  expectedKeywords: ['testable', 'unit', 'ambiguity', 'edge case', 'complete', 'verify'],
}

/**
 * elaboration_analysis_003: Analyze a SCOPE.yaml for backend/frontend classification
 * Sourced from real scope classification patterns
 */
const elaborationAnalyzeScope: BenchmarkTask = {
  id: 'elaboration_analysis_003',
  category: 'elaboration_analysis',
  description: 'Analyze a story scope to classify backend vs frontend touch points',
  prompt: `Analyze this list of files from a story implementation and classify them as backend, frontend, or shared. Then determine the correct SCOPE.yaml classification.

Files to be created or modified:
1. packages/backend/orchestrator/src/model-selector/constants.ts
2. packages/backend/orchestrator/src/model-selector/__types__/benchmark.ts
3. packages/backend/orchestrator/src/model-selector/benchmark-corpus.ts
4. packages/backend/orchestrator/src/model-selector/benchmark-harness.ts
5. packages/backend/orchestrator/src/model-selector/__tests__/benchmark-harness.test.ts
6. packages/backend/orchestrator/src/model-selector/__tests__/benchmark-corpus.test.ts
7. scripts/benchmark-models.ts

For each file:
1. Backend, frontend, or shared?
2. What package does it belong to?
3. Does it require a frontend worker, backend worker, or packages worker?

Then provide the correct SCOPE.yaml:
\`\`\`yaml
touches:
  backend: true/false
  frontend: true/false
  packages: true/false
\`\`\`

With a brief rationale for each classification.`,
  expectedKeywords: ['backend', 'frontend', 'packages', 'scope', 'classify', 'worker'],
}

// ============================================================================
// lint_syntax tasks
// ============================================================================

/**
 * lint_syntax_001: Fix ESLint violations in a TypeScript file
 * Sourced from actual lint patterns in the orchestrator package
 */
const lintSyntaxFixEslint: BenchmarkTask = {
  id: 'lint_syntax_001',
  category: 'lint_syntax',
  description: 'Fix ESLint violations: no-console, prefer-const, trailing comma',
  prompt: `Fix all ESLint violations in this TypeScript code. The project uses these ESLint rules:
- no-console (use @repo/logger instead)
- prefer-const (use const where possible)
- eol-last (file must end with newline)
- @typescript-eslint/no-explicit-any (avoid any)
- trailing commas required

\`\`\`typescript
import { logger } from '@repo/logger';

export async function runBenchmark(models: string[], tasks: any[]) {
  let results = []
  
  for (var i = 0; i < models.length; i++) {
    const model = models[i]
    console.log('Running model:', model)
    
    for (let task of tasks) {
      try {
        let result = await callOllama(model, task.prompt)
        results.push(result)
      } catch (e) {
        console.error('Error:', e)
      }
    }
  }
  
  return results
}
\`\`\`

Return the fully corrected TypeScript code with all ESLint violations fixed.
List each fix made with the rule that triggered it.`,
  expectedKeywords: ['logger', 'const', 'for', 'fix', 'rule', 'eslint'],
}

/**
 * lint_syntax_002: Fix TypeScript strict mode violations
 * Sourced from patterns in the orchestrator codebase
 */
const lintSyntaxTypeErrors: BenchmarkTask = {
  id: 'lint_syntax_002',
  category: 'lint_syntax',
  description: 'Fix TypeScript strict mode type errors in a function',
  prompt: `Fix the TypeScript strict mode errors in this code. The tsconfig has strict: true, noImplicitAny: true.

\`\`\`typescript
async function fetchOllamaResponse(model, prompt, timeout) {
  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal: AbortSignal.timeout(timeout)
  })
  
  if (!response.ok) {
    throw new Error('Ollama returned ' + response.status)
  }
  
  const data = await response.json()
  return data.response
}
\`\`\`

TypeScript errors:
- error TS7006: Parameter 'model' implicitly has an 'any' type.
- error TS7006: Parameter 'prompt' implicitly has an 'any' type.
- error TS7006: Parameter 'timeout' implicitly has an 'any' type.
- error TS2339: Property 'response' does not exist on type 'object'.

Fix all errors with proper TypeScript types. Add a return type annotation. The function should work with string model, string prompt, and number timeout. The Ollama generate API returns \`{ response: string, done: boolean }\`.`,
  expectedKeywords: ['string', 'number', 'Promise', 'type', 'return', 'interface', 'response'],
}

/**
 * lint_syntax_003: Convert interface to Zod schema
 * Sourced from CLAUDE.md requirement: no interfaces, use Zod
 */
const lintSyntaxZodConversion: BenchmarkTask = {
  id: 'lint_syntax_003',
  category: 'lint_syntax',
  description: 'Convert TypeScript interfaces to Zod schemas per project conventions',
  prompt: `The project CLAUDE.md requires all types to use Zod schemas instead of TypeScript interfaces.
Convert these interfaces to Zod schemas with inferred types.

\`\`\`typescript
interface BenchmarkTask {
  id: string
  category: 'code_generation' | 'code_review' | 'elaboration_analysis' | 'lint_syntax'
  prompt: string
  expectedKeywords?: string[]
  description?: string
}

interface BenchmarkResult {
  taskId: string
  model: string
  category: string
  output: string
  latency_ms: number
  cost_usd: 0
  qualityScore: number
  error: string | null
}
\`\`\`

Convert to Zod schemas following these rules:
- Use \`z.enum([...])\` for union string types
- Use \`.optional().default([])\` for optional arrays with defaults
- Use \`z.literal(0)\` for the literal 0 type
- Use \`z.nullable()\` for nullable strings
- Export both the schema and the inferred type
- Add \`.min(1)\` to non-empty string fields
- Add \`.min(0).max(100)\` to score fields
- No semicolons, single quotes, trailing commas`,
  expectedKeywords: [
    'z.object',
    'z.enum',
    'z.string',
    'z.number',
    'z.literal',
    'z.infer',
    'nullable',
  ],
}

// ============================================================================
// Export: Full Corpus
// ============================================================================

/**
 * The complete benchmark task corpus.
 * Contains 3+ tasks per category (12 total):
 *   - code_generation: 3 tasks
 *   - code_review: 3 tasks
 *   - elaboration_analysis: 3 tasks
 *   - lint_syntax: 3 tasks
 *
 * AC-1: >= 3 prompts per category, all 4 categories present.
 */
export const BENCHMARK_CORPUS: readonly BenchmarkTask[] = [
  // code_generation
  codeGenZodSchema,
  codeGenAtomicWrite,
  codeGenQualityDimension,
  // code_review
  codeReviewLeaderboardUpdate,
  codeReviewZodSchema,
  codeReviewFileOps,
  // elaboration_analysis
  elaborationAnalyzePlan,
  elaborationAnalyzeAcs,
  elaborationAnalyzeScope,
  // lint_syntax
  lintSyntaxFixEslint,
  lintSyntaxTypeErrors,
  lintSyntaxZodConversion,
] as const
