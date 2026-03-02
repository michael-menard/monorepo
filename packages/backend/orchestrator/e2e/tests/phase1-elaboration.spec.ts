/**
 * Phase 1 E2E Tests: Elaboration Stage
 *
 * Verifies that the elaboration stage (APIP-1010) completes successfully
 * and writes a valid EVIDENCE.yaml artifact.
 *
 * skipIf guard: Test is skipped when the APIP-1010 elaboration graph module
 * is not yet available. When APIP-1010 merges to main, the skip condition
 * resolves automatically.
 *
 * ACs covered:
 * - AC-6: Elaboration stage completes and EVIDENCE.yaml is schema-valid
 *
 * Requires: APIP-0010 + APIP-0020 + APIP-1010
 *
 * Environment variables required:
 *   REDIS_URL              — Redis connection string
 *   LANGGRAPH_SERVER_URL   — LangGraph server URL
 *   TEST_STORY_FEATURE_DIR — Base directory for synthetic story artifacts
 */

import { expect } from '@playwright/test'
import { test } from '../fixtures/pipeline.fixture.ts'
import { assertEvidenceArtifact } from '../helpers/artifact-assertions.ts'

// ─────────────────────────────────────────────────────────────────────────────
// skipIf guard — checks APIP-1010 elaboration graph module availability
// ─────────────────────────────────────────────────────────────────────────────

let elaborationModuleAvailable = false

test.beforeAll(async () => {
  try {
    await import('@repo/orchestrator/graphs/elaboration')
    elaborationModuleAvailable = true
  } catch {
    elaborationModuleAvailable = false
    // Test will be skipped below — this is the expected state until APIP-1010 merges
  }
})

// Elaboration E2E timeout: 10 minutes (graph execution is slower than supervisor-only)
const ELABORATION_TIMEOUT_MS = 10 * 60 * 1000
const ARTIFACT_POLL_INTERVAL_MS = 5_000
const ARTIFACT_MAX_WAIT_MS = 8 * 60 * 1000

test.describe('Phase 1: Elaboration Stage', () => {
  test(
    '(AC-6) elaboration stage completes and EVIDENCE.yaml artifact passes schema validation',
    async ({ queueClient, syntheticStory, pipelineStateReader }) => {
      if (!elaborationModuleAvailable) {
        test.skip(true, 'SKIPPED: APIP-1010 (structurer node) not yet available')
        return
      }

      // Enqueue the synthetic story job
      const job = await queueClient.add(
        syntheticStory.storyId,
        { storyId: syntheticStory.storyId, featureDir: syntheticStory.featureDir },
        { jobId: `elab-${syntheticStory.storyId}-${Date.now()}` },
      )

      expect(job.id).toBeTruthy()

      // Wait for the elaboration stage to complete (EVIDENCE.yaml appears in storyDir)
      const storyDir = pipelineStateReader.storyDir
      const startTime = Date.now()
      let evidence = null

      while (Date.now() - startTime < ARTIFACT_MAX_WAIT_MS) {
        try {
          evidence = await assertEvidenceArtifact(storyDir)
          break
        } catch {
          // Artifact not yet available — keep polling
          await new Promise<void>(resolve => setTimeout(resolve, ARTIFACT_POLL_INTERVAL_MS))
        }
      }

      expect(evidence).not.toBeNull()
      expect(evidence!.story_id).toBe(syntheticStory.storyId)
      expect(evidence!.acceptance_criteria.length).toBeGreaterThan(0)
    },
    { timeout: ELABORATION_TIMEOUT_MS },
  )
})
