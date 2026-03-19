/**
 * Tests for service-managed artifact iterations.
 *
 * Verifies auto_increment, max_iterations, and content.iteration injection.
 * Requires real Postgres per ADR-005.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { eq, and, sql } from 'drizzle-orm'
import { kb_write_artifact } from '../artifact-operations.js'
import { getDbClient } from '../../db/client.js'
import { storyArtifacts } from '../../db/schema.js'

describe('artifact iteration management', () => {
  const db = getDbClient()
  const deps = { db }
  const createdIds: string[] = []
  const testStoryPrefix = `ITER-TEST-${Date.now()}`

  afterEach(async () => {
    for (const id of createdIds) {
      await db.delete(storyArtifacts).where(eq(storyArtifacts.id, id))
    }
    createdIds.length = 0
  })

  it('auto_increment=false preserves upsert behavior (iteration: 0)', async () => {
    const storyId = `${testStoryPrefix}-upsert`

    // First write
    const r1 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: { phase: 'setup' },
        iteration: 0,
      },
      deps,
    )
    createdIds.push(r1.id)
    expect(r1.iteration).toBe(0)

    // Second write with same iteration → upsert (update)
    const r2 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: { phase: 'plan' },
        iteration: 0,
      },
      deps,
    )
    // Should be same artifact ID (upsert)
    expect(r2.id).toBe(r1.id)
    expect(r2.content).toEqual(expect.objectContaining({ phase: 'plan' }))
  })

  it('auto_increment=true assigns 0 on first write', async () => {
    const storyId = `${testStoryPrefix}-auto0`

    const result = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: { phase: 'setup' },
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(result.id)

    expect(result.iteration).toBe(0)
    expect(result.content).toEqual(expect.objectContaining({ iteration: 0 }))
  })

  it('auto_increment=true assigns sequential iterations', async () => {
    const storyId = `${testStoryPrefix}-auto-seq`

    const r0 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'evidence',
        content: { tests_passed: true },
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(r0.id)
    expect(r0.iteration).toBe(0)

    const r1 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'evidence',
        content: { tests_passed: false },
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(r1.id)
    expect(r1.iteration).toBe(1)

    const r2 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'evidence',
        content: { tests_passed: true },
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(r2.id)
    expect(r2.iteration).toBe(2)
  })

  it('auto_increment=true ignores caller-provided iteration value', async () => {
    const storyId = `${testStoryPrefix}-ignore`

    const r0 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: {},
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(r0.id)

    // Caller passes iteration: 99 but auto_increment should ignore it
    const r1 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: {},
        iteration: 99,
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(r1.id)

    expect(r1.iteration).toBe(1)
  })

  it('max_iterations rejects writes at limit', async () => {
    const storyId = `${testStoryPrefix}-max`

    // Write iteration 0 and 1
    const r0 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'fix_summary',
        content: { issues_fixed: 3 },
        auto_increment: true,
        max_iterations: 2,
      },
      deps,
    )
    createdIds.push(r0.id)
    expect(r0.iteration).toBe(0)

    const r1 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'fix_summary',
        content: { issues_fixed: 1 },
        auto_increment: true,
        max_iterations: 2,
      },
      deps,
    )
    createdIds.push(r1.id)
    expect(r1.iteration).toBe(1)

    // Third write (iteration 2) should be rejected because max_iterations=2
    await expect(
      kb_write_artifact(
        {
          story_id: storyId,
          artifact_type: 'fix_summary',
          content: { issues_fixed: 0 },
          auto_increment: true,
          max_iterations: 2,
        },
        deps,
      ),
    ).rejects.toThrow(/Max iterations.*2.*reached/)
  })

  it('max_iterations works without auto_increment', async () => {
    const storyId = `${testStoryPrefix}-max-manual`

    // Manually write iteration 0
    const r0 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'evidence',
        content: {},
        iteration: 0,
        max_iterations: 1,
      },
      deps,
    )
    createdIds.push(r0.id)

    // iteration 1 should be rejected (max_iterations=1)
    await expect(
      kb_write_artifact(
        {
          story_id: storyId,
          artifact_type: 'evidence',
          content: {},
          iteration: 1,
          max_iterations: 1,
        },
        deps,
      ),
    ).rejects.toThrow(/Max iterations.*1.*reached/)
  })

  it('content.iteration is auto-injected with resolved value', async () => {
    const storyId = `${testStoryPrefix}-inject`

    // Caller provides content.iteration=99, but the resolved value should overwrite it
    const result = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: { phase: 'setup', iteration: 99 },
        iteration: 0,
      },
      deps,
    )
    createdIds.push(result.id)

    // content.iteration should be 0, not 99
    expect(result.content).toEqual(
      expect.objectContaining({
        phase: 'setup',
        iteration: 0,
      }),
    )
  })

  it('auto_increment scopes by artifact_type independently', async () => {
    const storyId = `${testStoryPrefix}-scope`

    const checkpoint = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: {},
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(checkpoint.id)
    expect(checkpoint.iteration).toBe(0)

    // Different artifact_type should start at 0
    const evidence = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'evidence',
        content: {},
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(evidence.id)
    expect(evidence.iteration).toBe(0)

    // Next checkpoint should be 1
    const checkpoint2 = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: {},
        auto_increment: true,
      },
      deps,
    )
    createdIds.push(checkpoint2.id)
    expect(checkpoint2.iteration).toBe(1)
  })
})
