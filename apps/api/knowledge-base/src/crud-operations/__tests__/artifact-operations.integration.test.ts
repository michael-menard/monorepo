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

// ============================================================================
// KFMB-1030: New PM Artifact Type Tests
// ============================================================================

describe('kb_write_artifact: PM artifact types (KFMB-1030)', () => {
  const db = getDbClient()
  const deps = { db }
  const createdIds: string[] = []

  afterEach(async () => {
    for (const id of createdIds) {
      await db.delete(storyArtifacts).where(eq(storyArtifacts.id, id))
    }
    createdIds.length = 0
  })

  // TC-KFMB-1030-01: test_plan type write+read round-trip
  it('TC-KFMB-1030-01: write and read test_plan artifact succeeds', async () => {
    const storyId = `KFMB-1030-TC01-${Date.now()}`
    const content = {
      strategy: 'integration',
      scope_ui_touched: true,
      scope_data_touched: false,
      notes: 'Test plan for PM story',
    }

    const result = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'test_plan',
        content,
        phase: 'planning',
        iteration: 0,
      },
      deps,
    )

    expect(result.id).toBeDefined()
    expect(result.artifact_type).toBe('test_plan')
    expect(result.artifact_name).toBe('TEST-PLAN')
    expect(result.content).toMatchObject(content)
    createdIds.push(result.id)
  })

  // TC-KFMB-1030-02: dev_feasibility type write+read round-trip
  it('TC-KFMB-1030-02: write and read dev_feasibility artifact succeeds', async () => {
    const storyId = `KFMB-1030-TC02-${Date.now()}`
    const content = {
      feasible: true,
      confidence: 'high',
      complexity: 'simple',
      notes: 'Feasibility assessment',
    }

    const result = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'dev_feasibility',
        content,
        phase: 'planning',
        iteration: 0,
      },
      deps,
    )

    expect(result.id).toBeDefined()
    expect(result.artifact_type).toBe('dev_feasibility')
    expect(result.artifact_name).toBe('DEV-FEASIBILITY')
    expect(result.content).toMatchObject(content)
    createdIds.push(result.id)
  })

  // TC-KFMB-1030-03: uiux_notes type write+read round-trip
  it('TC-KFMB-1030-03: write and read uiux_notes artifact succeeds', async () => {
    const storyId = `KFMB-1030-TC03-${Date.now()}`
    const content = {
      has_ui_changes: false,
      component_count: 0,
      notes: 'No UI changes expected',
    }

    const result = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'uiux_notes',
        content,
        phase: 'planning',
        iteration: 0,
      },
      deps,
    )

    expect(result.id).toBeDefined()
    expect(result.artifact_type).toBe('uiux_notes')
    expect(result.artifact_name).toBe('UIUX-NOTES')
    expect(result.content).toMatchObject(content)
    createdIds.push(result.id)
  })

  // TC-KFMB-1030-04: story_seed type write+read round-trip
  it('TC-KFMB-1030-04: write and read story_seed artifact succeeds', async () => {
    const storyId = `KFMB-1030-TC04-${Date.now()}`
    const content = {
      conflicts_found: 0,
      blocking_conflicts: 0,
      baseline_loaded: true,
      notes: 'Story seed with no conflicts',
    }

    const result = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'story_seed',
        content,
        phase: 'planning',
        iteration: 0,
      },
      deps,
    )

    expect(result.id).toBeDefined()
    expect(result.artifact_type).toBe('story_seed')
    expect(result.artifact_name).toBe('STORY-SEED')
    expect(result.content).toMatchObject(content)
    createdIds.push(result.id)
  })

  // TC-KFMB-1030-05: generateArtifactName returns correct display names for all 4 types
  it('TC-KFMB-1030-05: generateArtifactName returns correct names for all 4 new PM types', async () => {
    const storyId = `KFMB-1030-TC05-${Date.now()}`
    const types = [
      { type: 'test_plan' as const, expectedName: 'TEST-PLAN' },
      { type: 'dev_feasibility' as const, expectedName: 'DEV-FEASIBILITY' },
      { type: 'uiux_notes' as const, expectedName: 'UIUX-NOTES' },
      { type: 'story_seed' as const, expectedName: 'STORY-SEED' },
    ]

    for (const { type, expectedName } of types) {
      const result = await kb_write_artifact(
        {
          story_id: `${storyId}-${type}`,
          artifact_type: type,
          content: { placeholder: true },
          iteration: 0,
        },
        deps,
      )
      expect(result.artifact_name).toBe(expectedName)
      createdIds.push(result.id)
    }
  })

  // TC-KFMB-1030-06: Regression — existing types still work after extension
  it('TC-KFMB-1030-06: existing artifact types (checkpoint, scope) still work after enum extension', async () => {
    const storyId = `KFMB-1030-TC06-${Date.now()}`

    const checkpointResult = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'checkpoint',
        content: { current_phase: 'plan', blocked: false, iteration: 0 },
        phase: 'planning',
        iteration: 0,
      },
      deps,
    )
    expect(checkpointResult.artifact_type).toBe('checkpoint')
    expect(checkpointResult.artifact_name).toBe('CHECKPOINT')
    createdIds.push(checkpointResult.id)

    const scopeResult = await kb_write_artifact(
      {
        story_id: storyId,
        artifact_type: 'scope',
        content: { touches_backend: true, touches_frontend: false },
        phase: 'planning',
        iteration: 0,
      },
      deps,
    )
    expect(scopeResult.artifact_type).toBe('scope')
    expect(scopeResult.artifact_name).toBe('SCOPE')
    createdIds.push(scopeResult.id)
  })
})
