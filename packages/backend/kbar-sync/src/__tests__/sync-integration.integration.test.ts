/**
 * Integration Tests for KBAR Story + Artifact Sync
 * KBAR-0060: AC-1, AC-2, AC-3, AC-7
 *
 * Uses testcontainers to spin up real PostgreSQL for integration testing.
 * Per ADR-005 and ADR-006: at least one happy-path integration test per AC required.
 *
 * ARCHITECTURE NOTE: A single testcontainer is shared across ALL describe blocks
 * in this file. This is required because @repo/db's `db` singleton holds a
 * reference to the pg pool at creation time (drizzle(getPool())); if we stop the
 * container between describe blocks, drizzle cannot reconnect to a new container.
 * Each describe block seeds its own test data using unique story IDs.
 *
 * Run with: pnpm --filter @repo/kbar-sync test:integration
 * Skip: SKIP_TESTCONTAINERS=true pnpm --filter @repo/kbar-sync test:integration
 */

import { writeFile, mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  SKIP_TESTCONTAINERS,
  startKbarTestContainer,
  stopKbarTestContainer,
  createTempDir,
  removeTempDir,
  type TestContainerContext,
} from './helpers/testcontainers.js'

// ============================================================================
// Shared container context — all describe blocks share one testcontainer
// ============================================================================

let sharedCtx: TestContainerContext
let sharedTestDir: string

beforeAll(async () => {
  if (SKIP_TESTCONTAINERS) return
  sharedCtx = await startKbarTestContainer('kbar_sync_integration')
  sharedTestDir = await createTempDir('kbar-sync-integration')

  // Seed stories needed across multiple describe blocks
  await sharedCtx.client.query(`
    INSERT INTO kbar.stories (story_id, epic, title, story_type)
    VALUES
      ('KBAR-ART-001', 'KBAR', 'Artifact Test Story', 'feature'),
      ('KBAR-CONF-ART', 'KBAR', 'Artifact Conflict Story', 'feature'),
      ('KBAR-CONF-NONE', 'KBAR', 'No Conflict Story', 'feature'),
      ('KBAR-EDGE-001', 'KBAR', 'Edge Cases Story', 'feature')
    ON CONFLICT (story_id) DO NOTHING
  `)
}, 90000)

afterAll(async () => {
  if (SKIP_TESTCONTAINERS) return
  await stopKbarTestContainer(sharedCtx)
  await removeTempDir(sharedTestDir)
})

// ============================================================================
// AC-1: Story Sync — All 5 States, Idempotency, Checksum Update
// ============================================================================

describe.skipIf(SKIP_TESTCONTAINERS)('AC-1: Story Sync Integration Tests', () => {
  it('AC-1 TC-1.1: sync new story — status completed, checksum stored', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')
    const { StoryFrontmatterSchema } = await import('../__types__/index.js')

    const storyContent = `schema: 1
story_id: KBAR-AC1-001
epic: KBAR
title: AC-1 New Story Test
description: Integration test for new story sync
story_type: feature
priority: P2
current_phase: setup
status: backlog
`
    const storyDir = join(sharedTestDir, 'KBAR-AC1-001')
    await mkdir(storyDir, { recursive: true })
    const storyFile = join(storyDir, 'KBAR-AC1-001.md')
    await writeFile(storyFile, storyContent, 'utf-8')

    // Validate fixture data with StoryFrontmatterSchema (AC-8 requirement)
    const { parse } = await import('yaml')
    const parsed = parse(storyContent)
    const validated = StoryFrontmatterSchema.safeParse(parsed)
    expect(validated.success).toBe(true)

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-AC1-001',
      filePath: storyFile,
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')
    expect(result.storyId).toBe('KBAR-AC1-001')
    expect(result.checksum).toBeDefined()
    expect(result.checksum).toHaveLength(64)

    // Verify DB row exists
    const row = await sharedCtx.client.query(
      `SELECT s.story_id, a.checksum, a.sync_status
       FROM kbar.stories s
       JOIN kbar.artifacts a ON a.story_id = s.id
       WHERE s.story_id = $1 AND a.artifact_type = 'story_file'`,
      ['KBAR-AC1-001'],
    )
    expect(row.rows).toHaveLength(1)
    expect(row.rows[0].checksum).toBe(result.checksum)
    expect(row.rows[0].sync_status).toBe('completed')
  }, 30000)

  it('AC-1 TC-1.2: idempotency — second sync returns skipped when checksum unchanged', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')

    const storyContent = `schema: 1
story_id: KBAR-AC1-002
epic: KBAR
title: AC-1 Idempotency Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`
    const storyDir = join(sharedTestDir, 'KBAR-AC1-002')
    await mkdir(storyDir, { recursive: true })
    const storyFile = join(storyDir, 'KBAR-AC1-002.md')
    await writeFile(storyFile, storyContent, 'utf-8')

    const firstResult = await syncStoryToDatabase({
      storyId: 'KBAR-AC1-002',
      filePath: storyFile,
      triggeredBy: 'automation',
    })
    expect(firstResult.success).toBe(true)
    expect(firstResult.syncStatus).toBe('completed')

    // Second sync — same content, must be skipped
    const secondResult = await syncStoryToDatabase({
      storyId: 'KBAR-AC1-002',
      filePath: storyFile,
      triggeredBy: 'automation',
    })
    expect(secondResult.success).toBe(true)
    expect(secondResult.syncStatus).toBe('skipped')
    expect(secondResult.skipped).toBe(true)
  }, 30000)

  it('AC-1 TC-1.3: checksum update — modified content triggers re-sync', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')
    const { computeChecksum } = await import('../__types__/index.js')

    const storyDir = join(sharedTestDir, 'KBAR-AC1-003')
    await mkdir(storyDir, { recursive: true })
    const storyFile = join(storyDir, 'KBAR-AC1-003.md')

    const originalContent = `schema: 1
story_id: KBAR-AC1-003
epic: KBAR
title: Checksum Update Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`
    await writeFile(storyFile, originalContent, 'utf-8')

    const firstResult = await syncStoryToDatabase({
      storyId: 'KBAR-AC1-003',
      filePath: storyFile,
      triggeredBy: 'automation',
    })
    expect(firstResult.syncStatus).toBe('completed')
    const originalChecksum = firstResult.checksum

    // Modify content
    const modifiedContent = originalContent
      .replace('setup', 'plan')
      .replace('backlog', 'in-progress')
    await writeFile(storyFile, modifiedContent, 'utf-8')
    const expectedNewChecksum = computeChecksum(modifiedContent)

    const secondResult = await syncStoryToDatabase({
      storyId: 'KBAR-AC1-003',
      filePath: storyFile,
      triggeredBy: 'automation',
    })
    expect(secondResult.success).toBe(true)
    expect(secondResult.syncStatus).toBe('completed')
    expect(secondResult.checksum).toBe(expectedNewChecksum)
    expect(secondResult.checksum).not.toBe(originalChecksum)
  }, 30000)

  it('AC-1 TC-1.4: sync story in plan phase', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')

    const storyDir = join(sharedTestDir, 'KBAR-AC1-004')
    await mkdir(storyDir, { recursive: true })
    const storyFile = join(storyDir, 'KBAR-AC1-004.md')
    const content = `schema: 1
story_id: KBAR-AC1-004
epic: KBAR
title: Plan Phase Story
story_type: feature
priority: P1
current_phase: plan
status: in-progress
`
    await writeFile(storyFile, content, 'utf-8')

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-AC1-004',
      filePath: storyFile,
      triggeredBy: 'automation',
    })
    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')
  }, 30000)

  it('AC-1 TC-1.5: sync story in done phase', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')

    const storyDir = join(sharedTestDir, 'KBAR-AC1-005')
    await mkdir(storyDir, { recursive: true })
    const storyFile = join(storyDir, 'KBAR-AC1-005.md')
    const content = `schema: 1
story_id: KBAR-AC1-005
epic: KBAR
title: Done Phase Story
story_type: feature
priority: P3
current_phase: done
status: done
`
    await writeFile(storyFile, content, 'utf-8')

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-AC1-005',
      filePath: storyFile,
      triggeredBy: 'automation',
    })
    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')
  }, 30000)
})

// ============================================================================
// AC-2: Artifact Sync — All 9 NonStoryArtifactType Values, Idempotency, Batch
// ============================================================================

describe.skipIf(SKIP_TESTCONTAINERS)('AC-2: Artifact Sync Integration Tests', () => {
  const artifactTypes = [
    'elaboration',
    'plan',
    'scope',
    'evidence',
    'review',
    'test_plan',
    'decisions',
    'checkpoint',
    'knowledge_context',
  ] as const

  for (const artifactType of artifactTypes) {
    it(`AC-2 TC-2.${artifactTypes.indexOf(artifactType) + 1}: sync artifact type '${artifactType}'`, async () => {
      const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')

      const artifactContent = `schema: 1\nstory_id: KBAR-ART-001\ntype: ${artifactType}\ncontent: test content for ${artifactType}\n`
      const artifactFile = join(sharedTestDir, `${artifactType}-${Date.now()}.yaml`)
      await writeFile(artifactFile, artifactContent, 'utf-8')

      const result = await syncArtifactToDatabase({
        storyId: 'KBAR-ART-001',
        artifactType,
        filePath: artifactFile,
        triggeredBy: 'automation',
      })

      expect(result.success).toBe(true)
      expect(result.syncStatus).toBe('synced')
      expect(result.storyId).toBe('KBAR-ART-001')
      expect(result.artifactType).toBe(artifactType)
      expect(result.checksum).toBeDefined()
    }, 30000)
  }

  it('AC-2 TC-2.10: idempotency — second artifact sync returns skipped', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')

    const content = `schema: 1\nstory_id: KBAR-ART-001\ntype: plan\nidempotency: true\n`
    const file = join(sharedTestDir, `plan-idempotency-${Date.now()}.yaml`)
    await writeFile(file, content, 'utf-8')

    const first = await syncArtifactToDatabase({
      storyId: 'KBAR-ART-001',
      artifactType: 'plan',
      filePath: file,
      triggeredBy: 'automation',
    })
    expect(first.syncStatus).toBe('synced')

    const second = await syncArtifactToDatabase({
      storyId: 'KBAR-ART-001',
      artifactType: 'plan',
      filePath: file,
      triggeredBy: 'automation',
    })
    expect(second.success).toBe(true)
    expect(second.syncStatus).toBe('skipped')
    expect(second.skipped).toBe(true)
  }, 30000)

  it('AC-2 TC-2.11: batchSyncArtifactsForStory discovers and syncs multiple artifacts', async () => {
    const { batchSyncArtifactsForStory } = await import('../batch-sync-artifacts.js')

    const storyDir = join(sharedTestDir, 'KBAR-ART-BATCH')
    await mkdir(join(storyDir, '_implementation'), { recursive: true })
    await mkdir(join(storyDir, '_pm'), { recursive: true })

    await sharedCtx.client.query(`
      INSERT INTO kbar.stories (story_id, epic, title, story_type)
      VALUES ('KBAR-ART-BATCH', 'KBAR', 'Batch Artifact Story', 'feature')
      ON CONFLICT (story_id) DO NOTHING
    `)

    await writeFile(
      join(storyDir, '_implementation', 'PLAN.yaml'),
      `schema: 2\nstory_id: KBAR-ART-BATCH\nsteps: []\n`,
      'utf-8',
    )
    await writeFile(
      join(storyDir, '_implementation', 'SCOPE.yaml'),
      `schema: 1\nstory_id: KBAR-ART-BATCH\ntouches:\n  backend: true\n`,
      'utf-8',
    )
    await writeFile(
      join(storyDir, '_pm', 'STORY-SEED.md'),
      `# KBAR-ART-BATCH\nstory_id: KBAR-ART-BATCH\n`,
      'utf-8',
    )

    const result = await batchSyncArtifactsForStory({
      storyId: 'KBAR-ART-BATCH',
      storyDir,
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(true)
    expect(result.totalDiscovered).toBeGreaterThanOrEqual(3)
    expect(result.totalSynced).toBeGreaterThanOrEqual(3)
  }, 30000)

  it('AC-2 TC-2.12: fail-soft for missing artifact file — batch continues', async () => {
    const { batchSyncArtifactsForStory } = await import('../batch-sync-artifacts.js')

    const storyDir = join(sharedTestDir, 'KBAR-ART-FAILSOFT')
    await mkdir(join(storyDir, '_implementation'), { recursive: true })

    await sharedCtx.client.query(`
      INSERT INTO kbar.stories (story_id, epic, title, story_type)
      VALUES ('KBAR-ART-FAILSOFT', 'KBAR', 'Fail Soft Story', 'feature')
      ON CONFLICT (story_id) DO NOTHING
    `)

    await writeFile(
      join(storyDir, '_implementation', 'PLAN.yaml'),
      `schema: 2\nstory_id: KBAR-ART-FAILSOFT\nsteps: []\n`,
      'utf-8',
    )

    const result = await batchSyncArtifactsForStory({
      storyId: 'KBAR-ART-FAILSOFT',
      storyDir,
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(true)
    expect(result.totalDiscovered).toBeGreaterThanOrEqual(1)
    expect(result.totalSynced + result.totalFailed + result.totalSkipped).toBe(
      result.totalDiscovered,
    )
  }, 30000)
})

// ============================================================================
// AC-3: Conflict Detection — Story Conflicts, Artifact Conflicts, No-Conflict
// ============================================================================

describe.skipIf(SKIP_TESTCONTAINERS)('AC-3: Conflict Detection Integration Tests', () => {
  it('AC-3 TC-3.1: story conflict — hasConflict: true, conflictType: checksum_mismatch', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')
    const { detectSyncConflicts } = await import('../detect-sync-conflicts.js')

    const storyDir = join(sharedTestDir, 'KBAR-CONF-001')
    await mkdir(storyDir, { recursive: true })
    const storyFile = join(storyDir, 'KBAR-CONF-001.md')

    const originalContent = `schema: 1
story_id: KBAR-CONF-001
epic: KBAR
title: Conflict Detection Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`
    await writeFile(storyFile, originalContent, 'utf-8')

    const syncResult = await syncStoryToDatabase({
      storyId: 'KBAR-CONF-001',
      filePath: storyFile,
      triggeredBy: 'automation',
    })
    expect(syncResult.syncStatus).toBe('completed')

    const modifiedContent = originalContent + '\n# Modified locally\n'
    await writeFile(storyFile, modifiedContent, 'utf-8')

    const conflictResult = await detectSyncConflicts({
      storyId: 'KBAR-CONF-001',
      filePath: storyFile,
    })

    expect(conflictResult.success).toBe(true)
    expect(conflictResult.hasConflict).toBe(true)
    expect(conflictResult.conflictType).toBe('checksum_mismatch')
    expect(conflictResult.conflictId).toBeDefined()

    const conflictRow = await sharedCtx.client.query(
      `SELECT sc.conflict_type
       FROM kbar.sync_conflicts sc
       JOIN kbar.sync_events se ON sc.sync_event_id = se.id
       WHERE se.story_id = $1 AND sc.conflict_type = 'checksum_mismatch'`,
      ['KBAR-CONF-001'],
    )
    expect(conflictRow.rows.length).toBeGreaterThan(0)
  }, 30000)

  it('AC-3 TC-3.2: artifact conflict — artifact checksum mismatch detected', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')
    const { detectArtifactConflicts } = await import('../detect-artifact-conflicts.js')

    const artifactFile = join(sharedTestDir, `scope-conflict-${Date.now()}.yaml`)
    const originalContent = `schema: 1\nstory_id: KBAR-CONF-ART\ntouches:\n  backend: true\n`
    await writeFile(artifactFile, originalContent, 'utf-8')

    await syncArtifactToDatabase({
      storyId: 'KBAR-CONF-ART',
      artifactType: 'scope',
      filePath: artifactFile,
      triggeredBy: 'automation',
    })

    // Manually update checksum in DB to simulate DB diverging
    await sharedCtx.client.query(
      `UPDATE kbar.artifacts
       SET checksum = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
       WHERE file_path = $1`,
      [artifactFile],
    )

    const conflictResult = await detectArtifactConflicts({
      storyId: 'KBAR-CONF-ART',
      artifactType: 'scope',
      filePath: artifactFile,
    })

    expect(conflictResult.success).toBe(true)
    expect(conflictResult.hasConflict).toBe(true)
    expect(conflictResult.conflictType).toBe('checksum_mismatch')
  }, 30000)

  it('AC-3 TC-3.3: no-conflict scenario — matching checksums', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')
    const { detectArtifactConflicts } = await import('../detect-artifact-conflicts.js')

    const artifactFile = join(sharedTestDir, `no-conflict-plan-${Date.now()}.yaml`)
    const content = `schema: 1\nstory_id: KBAR-CONF-NONE\nsteps: []\n`
    await writeFile(artifactFile, content, 'utf-8')

    await syncArtifactToDatabase({
      storyId: 'KBAR-CONF-NONE',
      artifactType: 'plan',
      filePath: artifactFile,
      triggeredBy: 'automation',
    })

    const conflictResult = await detectArtifactConflicts({
      storyId: 'KBAR-CONF-NONE',
      artifactType: 'plan',
      filePath: artifactFile,
    })

    expect(conflictResult.success).toBe(true)
    expect(conflictResult.hasConflict).toBe(false)
    expect(conflictResult.conflictType).toBe('none')
  }, 30000)
})

// ============================================================================
// AC-7: Edge Cases
// ============================================================================

describe.skipIf(SKIP_TESTCONTAINERS)('AC-7: Edge Cases Integration Tests', () => {
  it('AC-7 TC-7.1: symlink rejection — rejects before DB interaction', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')

    const realFile = join(sharedTestDir, 'real-plan.yaml')
    const symlinkFile = join(sharedTestDir, `symlink-plan-${Date.now()}.yaml`)
    await writeFile(realFile, `schema: 1\nstory_id: KBAR-EDGE-001\n`, 'utf-8')

    let symlinkCreated = false
    try {
      await symlink(realFile, symlinkFile)
      symlinkCreated = true
    } catch {
      console.log('Skipping symlink test — fs.symlink not supported in this environment')
      return
    }

    if (symlinkCreated) {
      const countBefore = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.artifacts`)
      const rowsBefore = parseInt(countBefore.rows[0].count)

      const result = await syncArtifactToDatabase({
        storyId: 'KBAR-EDGE-001',
        artifactType: 'plan',
        filePath: symlinkFile,
        triggeredBy: 'automation',
      })

      expect(result.success).toBe(false)
      expect(result.syncStatus).toBe('failed')
      expect(result.error).toContain('ymlink')

      const countAfter = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.artifacts`)
      const rowsAfter = parseInt(countAfter.rows[0].count)
      expect(rowsAfter).toBe(rowsBefore)
    }
  }, 30000)

  it('AC-7 TC-7.2: path traversal rejection — exits with error, no partial DB writes', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')

    const traversalPath = join(sharedTestDir, '..', '..', 'etc', 'passwd')

    const countBefore = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.artifacts`)
    const rowsBefore = parseInt(countBefore.rows[0].count)

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-EDGE-001',
      artifactType: 'plan',
      filePath: traversalPath,
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')

    const countAfter = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.artifacts`)
    const rowsAfter = parseInt(countAfter.rows[0].count)
    expect(rowsAfter).toBe(rowsBefore)
  }, 30000)

  it('AC-7 TC-7.3: corrupt YAML — records failed event in kbar.sync_events', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')

    const storyDir = join(sharedTestDir, 'KBAR-CORRUPT')
    await mkdir(storyDir, { recursive: true })
    const corruptFile = join(storyDir, 'KBAR-CORRUPT.md')
    await writeFile(corruptFile, 'story_id: [unclosed bracket\n  invalid: : yaml\n', 'utf-8')

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-CORRUPT',
      filePath: corruptFile,
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')

    const eventsRow = await sharedCtx.client.query(
      `SELECT status, error_message FROM kbar.sync_events WHERE story_id = $1 AND status = 'failed'`,
      ['KBAR-CORRUPT'],
    )
    expect(eventsRow.rows.length).toBeGreaterThan(0)
  }, 30000)

  it('AC-7 TC-7.4: missing story file — returns error, no partial DB writes', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')

    const missingFile = join(sharedTestDir, 'KBAR-MISSING', 'KBAR-MISSING.md')

    const countBefore = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.stories`)
    const rowsBefore = parseInt(countBefore.rows[0].count)

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-MISSING',
      filePath: missingFile,
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')

    const countAfter = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.stories`)
    const rowsAfter = parseInt(countAfter.rows[0].count)
    expect(rowsAfter).toBe(rowsBefore)
  }, 30000)

  it('AC-7 TC-7.5: unicode content — syncs correctly with raw-byte checksum', async () => {
    const { syncStoryToDatabase } = await import('../sync-story-to-database.js')
    const { computeChecksum } = await import('../__types__/index.js')

    const storyDir = join(sharedTestDir, 'KBAR-UNICODE')
    await mkdir(storyDir, { recursive: true })
    const unicodeFile = join(storyDir, 'KBAR-UNICODE.md')

    const unicodeContent = `schema: 1
story_id: KBAR-UNICODE
epic: KBAR
title: "Unicode テスト 🎉 اختبار"
description: "Content with unicode: こんにちは世界 مرحبا بالعالم"
story_type: feature
priority: P2
current_phase: setup
status: backlog
`
    await writeFile(unicodeFile, unicodeContent, 'utf-8')

    const expectedChecksum = computeChecksum(unicodeContent)

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-UNICODE',
      filePath: unicodeFile,
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')
    expect(result.checksum).toBe(expectedChecksum)

    const row = await sharedCtx.client.query(
      `SELECT a.checksum FROM kbar.stories s
       JOIN kbar.artifacts a ON a.story_id = s.id
       WHERE s.story_id = $1 AND a.artifact_type = 'story_file'`,
      ['KBAR-UNICODE'],
    )
    expect(row.rows[0].checksum).toBe(expectedChecksum)
  }, 30000)
})
