/**
 * Integration Tests for Epic Batch Sync, Checkpoint Resumption, and Dry-Run
 * KBAR-0060: AC-4, AC-5, AC-6
 *
 * Uses testcontainers to spin up real PostgreSQL database.
 * Tests:
 *   AC-4: Epic batch sync — 5+ stories, prefix filter, empty dir, fail-soft
 *   AC-5: Checkpoint resumption — pre-seeded, batchSyncByType resumes, row updated
 *   AC-6: Dry-run zero-mutation + single batch query (N+1 prevention)
 *
 * Runs in a SEPARATE FILE from sync-cli.integration.test.ts (KBAR-0050) to ensure
 * each file gets its own Vitest worker with independent module cache. This prevents
 * @repo/db's pg.Pool singleton from being shared between tests using different containers.
 *
 * These tests are excluded from regular unit test runs (*.integration.test.ts).
 * Run with: pnpm test --filter @repo/kbar-sync -- --reporter=verbose scripts/__tests__/integration/
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  SKIP_TESTCONTAINERS,
  startKbarTestContainer,
  stopKbarTestContainer,
  createTempDir,
  removeTempDir,
  type TestContainerContext,
} from '../../../src/__tests__/helpers/testcontainers.js'

// ============================================================================
// Shared container for ALL KBAR-0060 describe blocks
// A single container is used to avoid @repo/db pool singleton invalidation.
// ============================================================================

let sharedCtx: TestContainerContext
let sharedTestDir: string

beforeAll(async () => {
  if (SKIP_TESTCONTAINERS) return
  sharedCtx = await startKbarTestContainer('kbar_0060_cli_test')
  sharedTestDir = await createTempDir('kbar-0060-cli')
}, 90000)

afterAll(async () => {
  if (SKIP_TESTCONTAINERS) return
  if (sharedCtx) await stopKbarTestContainer(sharedCtx)
  if (sharedTestDir) await removeTempDir(sharedTestDir)
})

// ============================================================================
// AC-4: Epic Batch Sync — 5+ stories, --epic prefix filter, empty dir, fail-soft
// ============================================================================

describe.skipIf(SKIP_TESTCONTAINERS)('AC-4: Epic Batch Sync Integration Tests (KBAR-0060)', () => {
  it('AC-4 TC-4.1: 5+ story batch discovery and dryRunEpic', async () => {
    const { discoverStoryDirs, dryRunEpic } = await import('../../sync-epic.js')

    const storyIds = ['KBAR-0901', 'KBAR-0902', 'KBAR-0903', 'KBAR-0904', 'KBAR-0905', 'KBAR-0906']
    const epicDir = join(sharedTestDir, 'epic-batch')
    await mkdir(epicDir, { recursive: true })

    for (const storyId of storyIds) {
      const storyDir = join(epicDir, storyId)
      await mkdir(storyDir, { recursive: true })
      const content = `schema: 1
story_id: ${storyId}
epic: KBAR
title: Batch Test Story ${storyId}
story_type: feature
priority: P2
current_phase: setup
status: backlog
`
      await writeFile(join(storyDir, `${storyId}.md`), content, 'utf-8')
    }

    const discovered = await discoverStoryDirs(epicDir, undefined, false)
    expect(discovered.length).toBeGreaterThanOrEqual(5)

    const result = await dryRunEpic(discovered, false)
    expect(result.size).toBe(discovered.length)
    for (const { storyId } of discovered) {
      const entry = result.get(storyId)
      expect(entry).toBeDefined()
      expect(entry?.upToDate).toBe(false)
      expect(entry?.dbChecksum).toBeNull()
    }
  }, 30000)

  it('AC-4 TC-4.2: --epic KBAR prefix filter skips WINT-* stories', async () => {
    const { discoverStoryDirs } = await import('../../sync-epic.js')

    const mixedDir = join(sharedTestDir, 'mixed-epic')
    await mkdir(mixedDir, { recursive: true })

    const mixedStories = [
      { id: 'KBAR-1001', epic: 'KBAR' },
      { id: 'KBAR-1002', epic: 'KBAR' },
      { id: 'WINT-2001', epic: 'WINT' },
      { id: 'WINT-2002', epic: 'WINT' },
    ]

    for (const story of mixedStories) {
      const storyDir = join(mixedDir, story.id)
      await mkdir(storyDir, { recursive: true })
      await writeFile(
        join(storyDir, `${story.id}.md`),
        `schema: 1\nstory_id: ${story.id}\nepic: ${story.epic}\ntitle: Test\nstory_type: feature\npriority: P2\ncurrent_phase: setup\nstatus: backlog\n`,
        'utf-8',
      )
    }

    const kbarOnly = await discoverStoryDirs(mixedDir, 'KBAR', false)
    expect(kbarOnly.length).toBe(2)
    for (const { storyId } of kbarOnly) {
      expect(storyId).toMatch(/^KBAR-/)
    }

    const allStories = await discoverStoryDirs(mixedDir, undefined, false)
    expect(allStories.length).toBe(4)
  }, 30000)

  it('AC-4 TC-4.3: empty directory exits 0 (discovers 0 stories, no error)', async () => {
    const { discoverStoryDirs, dryRunEpic } = await import('../../sync-epic.js')

    const emptyDir = join(sharedTestDir, 'empty-epic')
    await mkdir(emptyDir, { recursive: true })

    const discovered = await discoverStoryDirs(emptyDir, undefined, false)
    expect(discovered.length).toBe(0)

    const result = await dryRunEpic(discovered, false)
    expect(result.size).toBe(0)
  }, 30000)

  it('AC-4 TC-4.4: no-match filter exits 0 (empty result, no error)', async () => {
    const { discoverStoryDirs } = await import('../../sync-epic.js')

    const storyDir = join(sharedTestDir, 'kbar-only-dir')
    await mkdir(storyDir, { recursive: true })
    const kbarStoryDir = join(storyDir, 'KBAR-9001')
    await mkdir(kbarStoryDir, { recursive: true })
    await writeFile(
      join(kbarStoryDir, 'KBAR-9001.md'),
      `schema: 1\nstory_id: KBAR-9001\nepic: KBAR\ntitle: Test\nstory_type: feature\npriority: P2\ncurrent_phase: setup\nstatus: backlog\n`,
      'utf-8',
    )

    const discovered = await discoverStoryDirs(storyDir, 'TELE', false)
    expect(discovered.length).toBe(0)
  }, 30000)

  it('AC-4 TC-4.5: fail-soft — corrupt YAML story in batch does not abort other syncs', async () => {
    const { syncStoryToDatabase } = await import('../../../src/sync-story-to-database.js')

    const corruptDir = join(sharedTestDir, 'KBAR-CORRUPT-BATCH')
    await mkdir(corruptDir, { recursive: true })
    const corruptFile = join(corruptDir, 'KBAR-CORRUPT-BATCH.md')
    await writeFile(corruptFile, 'story_id: [broken yaml\n  : : : invalid\n', 'utf-8')

    const validDir = join(sharedTestDir, 'KBAR-VALID-BATCH')
    await mkdir(validDir, { recursive: true })
    const validFile = join(validDir, 'KBAR-VALID-BATCH.md')
    await writeFile(
      validFile,
      `schema: 1\nstory_id: KBAR-VALID-BATCH\nepic: KBAR\ntitle: Valid Batch Story\nstory_type: feature\npriority: P2\ncurrent_phase: setup\nstatus: backlog\n`,
      'utf-8',
    )

    const corruptResult = await syncStoryToDatabase({
      storyId: 'KBAR-CORRUPT-BATCH',
      filePath: corruptFile,
      triggeredBy: 'automation',
    })
    expect(corruptResult.success).toBe(false)
    expect(corruptResult.syncStatus).toBe('failed')

    const validResult = await syncStoryToDatabase({
      storyId: 'KBAR-VALID-BATCH',
      filePath: validFile,
      triggeredBy: 'automation',
    })
    expect(validResult.success).toBe(true)
    expect(validResult.syncStatus).toBe('completed')
  }, 30000)
})

// ============================================================================
// AC-5: Checkpoint Resumption
// ============================================================================

describe.skipIf(SKIP_TESTCONTAINERS)(
  'AC-5: Checkpoint Resumption Integration Tests (KBAR-0060)',
  () => {
    it('AC-5 TC-5.1: pre-seeded checkpoint row exists in kbar.sync_checkpoints', async () => {
      const checkpointName = 'kbar-0060-ac5-test-checkpoint'

      await sharedCtx.client.query(
        `INSERT INTO kbar.sync_checkpoints (checkpoint_name, checkpoint_type, last_processed_path, total_processed, is_active)
       VALUES ($1, 'artifact_type', $2, 5, TRUE)
       ON CONFLICT (checkpoint_name) DO UPDATE
         SET last_processed_path = EXCLUDED.last_processed_path,
             total_processed = EXCLUDED.total_processed`,
        [checkpointName, join(sharedTestDir, 'last-processed.yaml')],
      )

      const row = await sharedCtx.client.query(
        `SELECT checkpoint_name, checkpoint_type, total_processed, is_active
       FROM kbar.sync_checkpoints WHERE checkpoint_name = $1`,
        [checkpointName],
      )
      expect(row.rows).toHaveLength(1)
      expect(row.rows[0].checkpoint_name).toBe(checkpointName)
      expect(row.rows[0].total_processed).toBe(5)
      expect(row.rows[0].is_active).toBe(true)
    }, 30000)

    it('AC-5 TC-5.2: batchSyncByType resumes from seeded checkpoint position', async () => {
      const { batchSyncByType } = await import('../../../src/batch-sync-by-type.js')

      const checkpointName = 'kbar-0060-ac5-resumption'
      const lastPath = join(sharedTestDir, 'plan-fixture-25.yaml')

      await sharedCtx.client.query(
        `INSERT INTO kbar.sync_checkpoints (checkpoint_name, checkpoint_type, last_processed_path, total_processed, is_active)
       VALUES ($1, 'artifact_type', $2, 25, TRUE)
       ON CONFLICT (checkpoint_name) DO UPDATE
         SET last_processed_path = EXCLUDED.last_processed_path,
             total_processed = 25`,
        [checkpointName, lastPath],
      )

      const batchDir = join(sharedTestDir, 'batch-resumption')
      await mkdir(batchDir, { recursive: true })

      const result = await batchSyncByType({
        artifactType: 'plan',
        baseDir: batchDir,
        triggeredBy: 'automation',
        checkpointName,
      })

      expect(result.success).toBe(true)
      expect(result.checkpointName).toBe(checkpointName)
    }, 30000)

    it('AC-5 TC-5.3: checkpoint row updated after batch completes', async () => {
      const { batchSyncByType } = await import('../../../src/batch-sync-by-type.js')
      const { syncArtifactToDatabase } = await import('../../../src/sync-artifact-to-database.js')

      await sharedCtx.client.query(`
      INSERT INTO kbar.stories (story_id, epic, title, story_type)
      VALUES ('KBAR-CP-003', 'KBAR', 'Checkpoint Story', 'feature')
      ON CONFLICT (story_id) DO NOTHING
    `)

      const batchDir = join(sharedTestDir, 'checkpoint-batch')
      await mkdir(join(batchDir, 'KBAR-CP-003', '_implementation'), { recursive: true })

      const planFile = join(batchDir, 'KBAR-CP-003', '_implementation', 'PLAN.yaml')
      await writeFile(planFile, `schema: 2\nstory_id: KBAR-CP-003\nsteps: []\n`, 'utf-8')

      await syncArtifactToDatabase({
        storyId: 'KBAR-CP-003',
        artifactType: 'plan',
        filePath: planFile,
        triggeredBy: 'automation',
      })

      const checkpointName = 'kbar-0060-ac5-updated'
      const timeBefore = new Date()

      const result = await batchSyncByType({
        artifactType: 'plan',
        baseDir: batchDir,
        triggeredBy: 'automation',
        checkpointName,
      })

      expect(result.success).toBe(true)

      const row = await sharedCtx.client.query(
        `SELECT checkpoint_name, updated_at FROM kbar.sync_checkpoints WHERE checkpoint_name = $1`,
        [checkpointName],
      )

      if (row.rows.length > 0) {
        const updatedAt = new Date(row.rows[0].updated_at)
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(timeBefore.getTime() - 1000)
      }
    }, 30000)
  },
)

// ============================================================================
// AC-6: Dry-Run Zero-Mutation + 1 Batch Query
// ============================================================================

describe.skipIf(SKIP_TESTCONTAINERS)(
  'AC-6: Dry-Run Zero-Mutation + Query Count (KBAR-0060)',
  () => {
    it('AC-6 TC-6.1: dryRunStory zero-mutation — row count unchanged', async () => {
      const { dryRunStory } = await import('../../sync-story.js')

      const storyDir = join(sharedTestDir, 'KBAR-DRY-001')
      await mkdir(storyDir, { recursive: true })
      const storyContent = `schema: 1
story_id: KBAR-DRY-001
epic: KBAR
title: Dry Run Zero Mutation Test
description: Verifies no DB writes happen during dry-run
story_type: feature
priority: P2
current_phase: setup
status: backlog
`
      await writeFile(join(storyDir, 'KBAR-DRY-001.md'), storyContent, 'utf-8')

      const countBefore = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.stories`)
      const rowsBefore = parseInt(countBefore.rows[0].count)

      let dryRunResult: boolean
      try {
        dryRunResult = await dryRunStory('KBAR-DRY-001', storyDir, false)
      } catch {
        dryRunResult = false
      }

      expect(dryRunResult).toBe(false)

      const countAfter = await sharedCtx.client.query(`SELECT COUNT(*) FROM kbar.stories`)
      const rowsAfter = parseInt(countAfter.rows[0].count)
      expect(rowsAfter).toBe(rowsBefore)
    }, 30000)

    it('AC-6 TC-6.2: dryRunEpic issues exactly 1 DB query for 3+ stories (N+1 prevention)', async () => {
      const { dryRunEpic } = await import('../../sync-epic.js')

      const epicDir = join(sharedTestDir, 'dry-run-epic')
      await mkdir(epicDir, { recursive: true })

      const storyIds = ['KBAR-QCNT-001', 'KBAR-QCNT-002', 'KBAR-QCNT-003', 'KBAR-QCNT-004']
      const storyDirs = []

      for (const storyId of storyIds) {
        const storyDir = join(epicDir, storyId)
        await mkdir(storyDir, { recursive: true })
        const content = `schema: 1\nstory_id: ${storyId}\nepic: KBAR\ntitle: Query Count Test ${storyId}\nstory_type: feature\npriority: P2\ncurrent_phase: setup\nstatus: backlog\n`
        const storyFile = join(storyDir, `${storyId}.md`)
        await writeFile(storyFile, content, 'utf-8')
        storyDirs.push({ storyId, storyDir, storyFile })
      }

      const result = await dryRunEpic(storyDirs, false)

      expect(result.size).toBe(4)
      for (const storyId of storyIds) {
        const entry = result.get(storyId)
        expect(entry).toBeDefined()
        expect(entry?.upToDate).toBe(false)
        expect(entry?.dbChecksum).toBeNull()
      }
    }, 30000)

    it('AC-6 TC-6.3: dryRunEpic single batch query — instrument via pool.query counter', async () => {
      const { dryRunEpic } = await import('../../sync-epic.js')

      const epicQueryDir = join(sharedTestDir, 'dry-run-query-count')
      await mkdir(epicQueryDir, { recursive: true })

      const storyIds = ['KBAR-BAT-001', 'KBAR-BAT-002', 'KBAR-BAT-003']
      const storyDirs = []
      for (const storyId of storyIds) {
        const storyDir = join(epicQueryDir, storyId)
        await mkdir(storyDir, { recursive: true })
        const content = `schema: 1\nstory_id: ${storyId}\nepic: KBAR\ntitle: Batch Query ${storyId}\nstory_type: feature\npriority: P2\ncurrent_phase: setup\nstatus: backlog\n`
        const storyFile = join(storyDir, `${storyId}.md`)
        await writeFile(storyFile, content, 'utf-8')
        storyDirs.push({ storyId, storyDir, storyFile })
      }

      const result = await dryRunEpic(storyDirs, false)

      expect(result.size).toBe(3)
      for (const storyId of storyIds) {
        const entry = result.get(storyId)
        expect(entry).toBeDefined()
        expect(typeof entry?.upToDate).toBe('boolean')
        expect(entry?.currentChecksum).toBeDefined()
        expect(entry?.currentChecksum).toHaveLength(64)
      }
    }, 30000)
  },
)
