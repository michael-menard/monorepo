/**
 * Phase 1 E2E Tests: Full Critical Path
 *
 * Validates the complete autonomous pipeline end-to-end:
 *   BullMQ enqueue → supervisor dispatch → elaboration → implementation
 *   → review → QA → merge → git squash commit
 *
 * skipIf guard: Test is skipped when any dependency graph module is unavailable.
 * Active only after all of APIP-1010/1020/1030/1050/1060/1070 merge to main.
 *
 * ACs covered:
 * - AC-7a: synthetic story job enqueued (non-null jobId)
 * - AC-7b: supervisor dispatches to elaboration graph
 * - AC-7c: EVIDENCE.yaml written and schema-valid
 * - AC-7d: REVIEW.yaml written with verdict PASS or FAIL (not null)
 * - AC-7e: QA-VERIFY.yaml written with verdict PASS|FAIL|BLOCKED
 * - AC-7f: if PASS — MERGE.yaml verdict MERGE_COMPLETE and squash commit in git log
 * - AC-7g: BullMQ job in completed state
 *
 * Requires: APIP-0010 + APIP-0020 + APIP-1010 + APIP-1020 + APIP-1030 + APIP-1050 + APIP-1060 + APIP-1070
 *
 * Environment variables required:
 *   REDIS_URL              — Redis connection string
 *   LANGGRAPH_SERVER_URL   — LangGraph server URL
 *   TEST_STORY_FEATURE_DIR — Base directory for synthetic story artifacts
 */

import { expect } from '@playwright/test'
import { execSync } from 'child_process'
import { test } from '../fixtures/pipeline.fixture.ts'
import {
  assertEvidenceArtifact,
  assertReviewArtifact,
  assertQaVerifyArtifact,
  assertMergeArtifact,
} from '../helpers/artifact-assertions.ts'
import { pollJobCompletion } from '../helpers/job-poller.ts'

// ─────────────────────────────────────────────────────────────────────────────
// skipIf guard — checks all required graph modules are available
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_MODULES = [
  '@repo/orchestrator/graphs/elaboration',     // APIP-1010
  '@repo/orchestrator/graphs/change-spec',      // APIP-1020
  '@repo/orchestrator/graphs/implementation',   // APIP-1030
  '@repo/orchestrator/graphs/review',           // APIP-1050
  '@repo/orchestrator/graphs/qa-verify',        // APIP-1060
  '@repo/orchestrator/graphs/merge',            // APIP-1070
] as const

let allModulesAvailable = false
const unavailableModules: string[] = []

test.beforeAll(async () => {
  const checks = await Promise.allSettled(
    REQUIRED_MODULES.map(async mod => {
      await import(mod)
      return mod
    }),
  )

  for (let i = 0; i < checks.length; i++) {
    if (checks[i].status === 'rejected') {
      unavailableModules.push(REQUIRED_MODULES[i])
    }
  }

  allModulesAvailable = unavailableModules.length === 0
})

// Full critical path timeout: 30 minutes
const CRITICAL_PATH_TIMEOUT_MS = 30 * 60 * 1000
const ARTIFACT_POLL_INTERVAL_MS = 10_000
const ARTIFACT_MAX_WAIT_MS = 25 * 60 * 1000

/**
 * Poll filesystem until an artifact appears or maxWaitMs is exceeded.
 */
async function waitForArtifact<T>(
  readFn: () => Promise<T>,
  maxWaitMs: number,
  pollIntervalMs: number,
): Promise<T | null> {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWaitMs) {
    try {
      return await readFn()
    } catch {
      await new Promise<void>(resolve => setTimeout(resolve, pollIntervalMs))
    }
  }
  return null
}

test.describe('Phase 1: Full Critical Path', () => {
  test(
    '(AC-7) full critical path: enqueue → supervisor → EVIDENCE → REVIEW → QA-VERIFY → [MERGE] → completed',
    async ({ queueClient, syntheticStory, pipelineStateReader }) => {
      if (!allModulesAvailable) {
        test.skip(
          true,
          `SKIPPED: The following dependency graph modules are not yet available: ${unavailableModules.join(', ')}`,
        )
        return
      }

      // ─── AC-7a: Enqueue synthetic story job ─────────────────────────────────
      const job = await queueClient.add(
        syntheticStory.storyId,
        { storyId: syntheticStory.storyId, featureDir: syntheticStory.featureDir },
        { jobId: `critical-path-${syntheticStory.storyId}-${Date.now()}` },
      )

      expect(job.id).toBeTruthy()
      const jobId = job.id!

      const storyDir = pipelineStateReader.storyDir

      // ─── AC-7b: Supervisor dispatches to elaboration graph ──────────────────
      // Verified implicitly via AC-7c (EVIDENCE.yaml appears when elaboration completes)

      // ─── AC-7c: EVIDENCE.yaml written and schema-valid ──────────────────────
      const evidence = await waitForArtifact(
        () => assertEvidenceArtifact(storyDir),
        ARTIFACT_MAX_WAIT_MS,
        ARTIFACT_POLL_INTERVAL_MS,
      )

      expect(evidence).not.toBeNull()
      expect(evidence!.story_id).toBe(syntheticStory.storyId)

      // ─── AC-7d: REVIEW.yaml written with verdict PASS or FAIL ───────────────
      const review = await waitForArtifact(
        () => assertReviewArtifact(storyDir),
        ARTIFACT_MAX_WAIT_MS,
        ARTIFACT_POLL_INTERVAL_MS,
      )

      expect(review).not.toBeNull()
      expect(['PASS', 'FAIL']).toContain(review!.verdict)

      // Framework bug guard: synthetic ChangeSpec should always produce PASS review
      if (review!.verdict === 'FAIL') {
        expect.fail(
          'Framework bug: synthetic ChangeSpec produced REVIEW.yaml FAIL verdict — investigate review graph. ' +
          `Story: ${syntheticStory.storyId}, Review timestamp: ${review!.timestamp}`,
        )
      }

      // ─── AC-7e: QA-VERIFY.yaml written with verdict PASS|FAIL|BLOCKED ───────
      const qaVerify = await waitForArtifact(
        () => assertQaVerifyArtifact(storyDir),
        ARTIFACT_MAX_WAIT_MS,
        ARTIFACT_POLL_INTERVAL_MS,
      )

      expect(qaVerify).not.toBeNull()
      expect(['PASS', 'FAIL', 'BLOCKED']).toContain(qaVerify!.verdict)

      // ─── AC-7f: if PASS — MERGE.yaml + squash commit ────────────────────────
      if (qaVerify!.verdict === 'PASS') {
        const merge = await waitForArtifact(
          () => assertMergeArtifact(storyDir),
          ARTIFACT_MAX_WAIT_MS,
          ARTIFACT_POLL_INTERVAL_MS,
        )

        expect(merge).not.toBeNull()
        expect(merge!.verdict).toBe('MERGE_COMPLETE')
        expect(merge!.story_id).toBe(syntheticStory.storyId)

        // Verify squash commit appears in git log
        const gitLog = execSync(
          `git log --oneline main --grep="${syntheticStory.storyId}" --max-count=5`,
          { encoding: 'utf-8' },
        ).trim()

        expect(gitLog.length).toBeGreaterThan(0)
      }

      // ─── AC-7g: BullMQ job in completed state ───────────────────────────────
      const terminalState = await pollJobCompletion(queueClient, jobId, CRITICAL_PATH_TIMEOUT_MS, {
        pollIntervalMs: 10_000,
        maxPollIntervalMs: 60_000,
      })

      expect(terminalState).toBe('completed')
    },
    { timeout: CRITICAL_PATH_TIMEOUT_MS },
  )
})
