/**
 * Integration tests for artifact_write summary auto-extraction
 *
 * Verifies that artifact_write correctly populates the summary column in the DB:
 * - TC-019: No caller summary → auto-extracted summary is non-null in DB
 * - TC-020: Caller-provided summary → caller value persisted (not auto-extracted)
 *
 * Requires real Postgres per ADR-005.
 *
 * @see KBAR-0140 AC-5, AC-6
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { artifact_write, kb_write_artifact } from '../artifact-operations.js'
import { getDbClient } from '../../db/client.js'
import { storyArtifacts } from '../../db/schema.js'

// Mock filesystem operations so we don't write real files
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('js-yaml', () => ({
  dump: (obj: unknown) => `# yaml\n${JSON.stringify(obj, null, 2)}\n`,
}))

// ============================================================================
// Integration test suite
// ============================================================================

describe('artifact_write integration: summary auto-extraction', () => {
  const db = getDbClient()
  const deps = { db }
  const createdIds: string[] = []

  afterEach(async () => {
    // Clean up created artifacts
    for (const id of createdIds) {
      await db.delete(storyArtifacts).where(eq(storyArtifacts.id, id))
    }
    createdIds.length = 0
  })

  // TC-019: artifact_write with no summary → non-null summary in DB
  it('TC-019: artifact_write with no caller summary produces non-null summary in DB', async () => {
    const storyId = `KBAR-0140-INTEGRATION-TC019-${Date.now()}`
    const content = {
      current_phase: 'execute',
      last_successful_phase: 'plan',
      iteration: 0,
      blocked: false,
    }

    const result = await artifact_write(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content,
        story_dir: '/tmp/test-stories/KBAR-0140',
        phase: 'implementation',
        iteration: 0,
        write_to_kb: true,
        // No summary provided — auto-extraction should kick in
      },
      deps,
    )

    expect(result.file_written).toBe(true)
    expect(result.kb_written).toBe(true)
    expect(result.kb_artifact_id).not.toBeNull()

    // Verify summary in DB is non-null and matches expected shape
    const rows = await db
      .select()
      .from(storyArtifacts)
      .where(eq(storyArtifacts.id, result.kb_artifact_id!))

    expect(rows).toHaveLength(1)
    const summary = rows[0].summary as Record<string, unknown>
    expect(summary).not.toBeNull()
    expect(summary.current_phase).toBe('execute')
    expect(summary.last_successful_phase).toBe('plan')
    expect(summary.iteration).toBe(0)
    expect(summary.blocked).toBe(false)

    createdIds.push(result.kb_artifact_id!)
  })

  // TC-020: artifact_write with explicit summary → caller value persisted
  it('TC-020: artifact_write with explicit caller summary persists caller value, not auto-extracted', async () => {
    const storyId = `KBAR-0140-INTEGRATION-TC020-${Date.now()}`
    const content = {
      current_phase: 'execute',
      last_successful_phase: 'plan',
      iteration: 0,
      blocked: false,
    }
    const callerSummary = {
      custom_field: 'caller-provided',
      phase_override: 'custom',
    }

    const result = await artifact_write(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content,
        story_dir: '/tmp/test-stories/KBAR-0140',
        phase: 'implementation',
        iteration: 0,
        write_to_kb: true,
        summary: callerSummary,
      },
      deps,
    )

    expect(result.file_written).toBe(true)
    expect(result.kb_written).toBe(true)
    expect(result.kb_artifact_id).not.toBeNull()

    // Verify the caller-provided summary was persisted, not auto-extracted
    const rows = await db
      .select()
      .from(storyArtifacts)
      .where(eq(storyArtifacts.id, result.kb_artifact_id!))

    expect(rows).toHaveLength(1)
    const summary = rows[0].summary as Record<string, unknown>
    expect(summary).not.toBeNull()
    // Caller value should be present
    expect(summary.custom_field).toBe('caller-provided')
    expect(summary.phase_override).toBe('custom')
    // Auto-extracted fields should NOT be present (caller override took precedence)
    expect(summary.current_phase).toBeUndefined()

    createdIds.push(result.kb_artifact_id!)
  })
})
