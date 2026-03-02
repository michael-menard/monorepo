import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// SyntheticTestStory Schema (Zod-first)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes the code change that the pipeline implementation graph should apply.
 * For synthetic testing, this is a literal pre-written patch — no LLM required.
 */
export const ChangeSpecSchema = z.object({
  /** Target file to modify (relative to repo root) */
  targetFile: z.string(),
  /** Literal code to append to the target file */
  codeToAdd: z.string(),
  /** Human-readable description of the change */
  description: z.string(),
})

export type ChangeSpec = z.infer<typeof ChangeSpecSchema>

/**
 * A minimal acceptance criterion for the synthetic story.
 */
export const SyntheticAcSchema = z.object({
  id: z.string(),
  description: z.string(),
})

export type SyntheticAc = z.infer<typeof SyntheticAcSchema>

/**
 * The full synthetic test story schema.
 *
 * This represents a minimal story fixture used to exercise the pipeline
 * without requiring real LLM elaboration. All fields are pre-populated so
 * the pipeline can run deterministically.
 */
export const SyntheticTestStorySchema = z.object({
  /** Unique story ID for this synthetic fixture (prefixed e2e- to avoid conflicts) */
  storyId: z.string(),
  /** Feature directory under plans/future/platform/autonomous-pipeline/ */
  featureDir: z.string(),
  /** Human-readable title for the synthetic story */
  title: z.string(),
  /** Acceptance criteria (minimum 1) */
  acs: z.array(SyntheticAcSchema).min(1),
  /**
   * The code change the pipeline implementation graph should apply.
   * Pre-written as a literal patch — NOT LLM-generated.
   * Must pass pnpm check-types and pnpm test deterministically.
   */
  changeSpec: ChangeSpecSchema,
  /** BullMQ queue name to use for this synthetic story job */
  queueName: z.string(),
  /** Timestamp the fixture was created (ISO 8601) */
  createdAt: z.string().datetime(),
})

export type SyntheticTestStory = z.infer<typeof SyntheticTestStorySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built Fixture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The pre-built synthetic test story fixture.
 *
 * ChangeSpec design:
 * - Adds a single exported constant to packages/backend/orchestrator/src/utils/string-utils.ts
 * - The constant is documented and trivially type-safe (no type errors)
 * - A corresponding Vitest test is added to verify the constant
 * - No LLM generation needed — the patch is pre-written verbatim
 *
 * This ensures the micro-verify step (pnpm check-types + pnpm test) passes
 * deterministically without any AI model involvement.
 */
export const syntheticTestStory: SyntheticTestStory = SyntheticTestStorySchema.parse({
  storyId: 'e2e-synthetic-001',
  featureDir: 'plans/future/platform/autonomous-pipeline/e2e-fixtures',
  title: 'Synthetic E2E Test Story: Add E2E_SYNTHETIC_MARKER constant',
  acs: [
    {
      id: 'AC-1',
      description:
        'A constant named E2E_SYNTHETIC_MARKER exists in packages/backend/orchestrator/src/utils/string-utils.ts ' +
        'and is exported. Its value is the string "e2e-synthetic-marker-v1".',
    },
  ],
  changeSpec: {
    targetFile: 'packages/backend/orchestrator/src/utils/string-utils.ts',
    description:
      'Add exported constant E2E_SYNTHETIC_MARKER to string-utils.ts as a trivially-passable E2E test fixture.',
    codeToAdd: `
/**
 * E2E synthetic test marker constant.
 * Added by the autonomous pipeline E2E test framework (APIP-5002).
 * This constant is used to verify the pipeline can apply a trivially-passable code change.
 */
export const E2E_SYNTHETIC_MARKER = 'e2e-synthetic-marker-v1'
`,
  },
  queueName: 'pipeline-e2e',
  createdAt: '2026-02-28T00:00:00.000Z',
})

// ─────────────────────────────────────────────────────────────────────────────
// YAML Artifact Stubs for mid-pipeline seeding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal EVIDENCE.yaml stub for seeding the pipeline at the review stage.
 * Used when testing phase1-elaboration in isolation (skipping implementation).
 */
export const syntheticEvidenceStub = {
  schema: 2,
  story_id: syntheticTestStory.storyId,
  version: 1,
  timestamp: syntheticTestStory.createdAt,
  acceptance_criteria: syntheticTestStory.acs.map(ac => ({
    ac_id: ac.id,
    status: 'PASS',
    evidence_items: [
      {
        type: 'file',
        description: `Synthetic fixture: ${ac.description}`,
        path: syntheticTestStory.changeSpec.targetFile,
      },
    ],
  })),
  touched_files: [
    {
      path: syntheticTestStory.changeSpec.targetFile,
      action: 'modified',
      description: syntheticTestStory.changeSpec.description,
    },
  ],
  commands_run: [
    {
      command: 'pnpm check-types --filter @repo/orchestrator',
      result: 'SUCCESS',
      timestamp: syntheticTestStory.createdAt,
    },
    {
      command: 'pnpm test --filter @repo/orchestrator',
      result: 'SUCCESS',
      timestamp: syntheticTestStory.createdAt,
    },
  ],
  endpoints_exercised: [],
  notable_decisions: ['Synthetic fixture — pre-written ChangeSpec, no LLM required'],
  known_deviations: [],
}
