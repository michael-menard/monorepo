/**
 * Phase 0 E2E Tests: Queue + Supervisor
 *
 * Verifies BullMQ enqueue and supervisor dispatch behavior.
 * Requires: APIP-0010 (BullMQ queue setup) + APIP-0020 (supervisor) complete.
 *
 * ACs covered:
 * - AC-5a: queueClient.add() returns non-null jobId
 * - AC-5b: BullMQ job transitions from waiting to active within 30s timeout
 * - AC-5c: Job does not transition to failed within the observation window
 *
 * Environment variables required:
 *   REDIS_URL — Redis connection string (e.g. redis://localhost:6379)
 */

import { expect } from '@playwright/test'
import { test } from '../fixtures/pipeline.fixture.ts'

// Configurable observation window for supervisor dispatch
const SUPERVISOR_ACTIVE_TIMEOUT_MS = 30_000

test.describe('Phase 0: Queue + Supervisor Dispatch', () => {
  let testJobId: string | undefined

  test.afterEach(async ({ queueClient }) => {
    // Best-effort cleanup of the test job
    if (testJobId) {
      try {
        const job = await queueClient.getJob(testJobId)
        if (job) {
          const state = await job.getState()
          if (state !== 'completed') {
            await job.remove()
          }
        }
      } catch {
        // Ignore cleanup errors — supervisor may have already processed it
      }
      testJobId = undefined
    }
  })

  test('(AC-5a) enqueuing a synthetic story job returns a non-null jobId', async ({
    queueClient,
    syntheticStory,
  }) => {
    const job = await queueClient.add(
      syntheticStory.storyId,
      { storyId: syntheticStory.storyId, featureDir: syntheticStory.featureDir },
      { jobId: `test-${syntheticStory.storyId}-${Date.now()}` },
    )

    testJobId = job.id

    expect(job.id).toBeTruthy()
    expect(typeof job.id).toBe('string')
    expect(job.id!.length).toBeGreaterThan(0)
  })

  test(
    '(AC-5b) BullMQ job transitions from waiting to active within 30s timeout, confirming supervisor is active',
    async ({ queueClient, syntheticStory }) => {
      const job = await queueClient.add(
        syntheticStory.storyId,
        { storyId: syntheticStory.storyId, featureDir: syntheticStory.featureDir },
        { jobId: `test-supervisor-${syntheticStory.storyId}-${Date.now()}` },
      )

      testJobId = job.id
      expect(job.id).toBeTruthy()

      // Poll until job reaches 'active' state (supervisor picked it up)
      const startTime = Date.now()
      let reachedActive = false

      while (Date.now() - startTime < SUPERVISOR_ACTIVE_TIMEOUT_MS) {
        const state = await job.getState()

        if (state === 'active') {
          reachedActive = true
          break
        }

        if (state === 'failed') {
          throw new Error(`Job ${job.id} transitioned to failed state — supervisor may have an error`)
        }

        if (state === 'completed') {
          // Job completed (supervisor dispatched and processed quickly)
          reachedActive = true
          break
        }

        await new Promise<void>(resolve => setTimeout(resolve, 1000))
      }

      expect(reachedActive).toBe(true)
    },
    { timeout: SUPERVISOR_ACTIVE_TIMEOUT_MS + 5000 },
  )

  test(
    '(AC-5c) BullMQ job does not transition to failed within the observation window',
    async ({ queueClient, syntheticStory }) => {
      const job = await queueClient.add(
        syntheticStory.storyId,
        { storyId: syntheticStory.storyId, featureDir: syntheticStory.featureDir },
        { jobId: `test-no-fail-${syntheticStory.storyId}-${Date.now()}` },
      )

      testJobId = job.id
      expect(job.id).toBeTruthy()

      // Observe job for 10 seconds — it should NOT reach 'failed' state
      const observationWindowMs = 10_000
      const startTime = Date.now()

      while (Date.now() - startTime < observationWindowMs) {
        const state = await job.getState()

        expect(state).not.toBe('failed')

        if (state === 'completed') {
          // Completed cleanly — even better
          break
        }

        await new Promise<void>(resolve => setTimeout(resolve, 1000))
      }
    },
    { timeout: 20_000 },
  )
})
