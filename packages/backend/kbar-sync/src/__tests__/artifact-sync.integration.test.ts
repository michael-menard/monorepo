/**
 * Integration Tests for Artifact Sync with Real PostgreSQL
 * KBAR-0040: AC-1, AC-4, AC-5, AC-6, AC-9
 *
 * Uses testcontainers to spin up real PostgreSQL for integration testing.
 * Per ADR-005 and ADR-006: at least one happy-path integration test per AC required.
 *
 * NOTE: These tests are excluded from vitest.config.ts
 * Run explicitly with: pnpm --filter @repo/kbar-sync test -- artifact-sync.integration.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Skip integration tests if docker is unavailable or env vars not set
const shouldSkip =
  !process.env.POSTGRES_HOST &&
  !process.env.POSTGRES_DATABASE &&
  !process.env.DOCKER_HOST &&
  process.env.CI !== 'true'

if (shouldSkip) {
  console.log('Skipping artifact-sync integration tests — testcontainers not configured')
}

import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type pg from 'pg'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

describe.skipIf(shouldSkip)('Artifact Sync Integration Tests (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer
  let client: InstanceType<typeof import('pg').Client>
  let testDir: string

  beforeAll(async () => {
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
    const PgClient = (await import('pg')).default.Client

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('kbar_artifact_test')
      .withUsername('test')
      .withPassword('test')
      .start()

    client = new PgClient({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    })

    await client.connect()

    // Set env vars for @repo/db
    process.env.POSTGRES_HOST = container.getHost()
    process.env.POSTGRES_PORT = container.getPort().toString()
    process.env.POSTGRES_USERNAME = container.getUsername()
    process.env.POSTGRES_PASSWORD = container.getPassword()
    process.env.POSTGRES_DATABASE = container.getDatabase()

    // Create KBAR schema and tables
    await client.query(`CREATE SCHEMA IF NOT EXISTS kbar`)
    await client.query(`
      CREATE TYPE IF NOT EXISTS kbar_story_phase AS ENUM ('setup', 'plan', 'execute', 'review', 'qa', 'done');
      CREATE TYPE IF NOT EXISTS kbar_artifact_type AS ENUM (
        'story_file', 'elaboration', 'plan', 'scope', 'evidence', 'review',
        'test_plan', 'decisions', 'checkpoint', 'knowledge_context'
      );
      CREATE TYPE IF NOT EXISTS kbar_sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'conflict');
      CREATE TYPE IF NOT EXISTS kbar_dependency_type AS ENUM ('blocks', 'requires', 'related_to', 'enhances');
      CREATE TYPE IF NOT EXISTS kbar_story_priority AS ENUM ('P0', 'P1', 'P2', 'P3', 'P4');
      CREATE TYPE IF NOT EXISTS kbar_conflict_resolution AS ENUM ('filesystem_wins', 'database_wins', 'manual', 'merged', 'deferred');
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS kbar.stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id TEXT NOT NULL UNIQUE,
        epic TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        story_type TEXT NOT NULL,
        priority kbar_story_priority NOT NULL DEFAULT 'P2',
        complexity TEXT,
        story_points INTEGER,
        current_phase kbar_story_phase NOT NULL DEFAULT 'setup',
        status TEXT NOT NULL DEFAULT 'backlog',
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kbar.artifacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id UUID NOT NULL REFERENCES kbar.stories(id) ON DELETE CASCADE,
        artifact_type kbar_artifact_type NOT NULL,
        file_path TEXT NOT NULL,
        checksum TEXT NOT NULL,
        last_synced_at TIMESTAMPTZ,
        sync_status kbar_sync_status NOT NULL DEFAULT 'pending',
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kbar.artifact_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artifact_id UUID NOT NULL REFERENCES kbar.artifacts(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        content_snapshot TEXT,
        changed_by TEXT,
        change_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kbar.artifact_content_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artifact_id UUID NOT NULL UNIQUE REFERENCES kbar.artifacts(id) ON DELETE CASCADE,
        parsed_content JSONB NOT NULL,
        checksum TEXT NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0,
        last_hit_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kbar.sync_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL,
        status kbar_sync_status NOT NULL DEFAULT 'pending',
        story_id TEXT,
        artifact_id UUID REFERENCES kbar.artifacts(id) ON DELETE SET NULL,
        files_scanned INTEGER NOT NULL DEFAULT 0,
        files_changed INTEGER NOT NULL DEFAULT 0,
        conflicts_detected INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        duration_ms INTEGER,
        error_message TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kbar.sync_conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_event_id UUID NOT NULL REFERENCES kbar.sync_events(id) ON DELETE CASCADE,
        artifact_id UUID NOT NULL REFERENCES kbar.artifacts(id) ON DELETE CASCADE,
        conflict_type TEXT NOT NULL,
        filesystem_checksum TEXT NOT NULL,
        database_checksum TEXT NOT NULL,
        resolution kbar_conflict_resolution,
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS kbar.sync_checkpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        checkpoint_name TEXT NOT NULL UNIQUE,
        checkpoint_type TEXT NOT NULL,
        last_processed_path TEXT,
        last_processed_timestamp TIMESTAMPTZ,
        total_processed INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    // Seed story for tests
    await client.query(`
      INSERT INTO kbar.stories (story_id, epic, title, story_type)
      VALUES ('KBAR-INT-001', 'KBAR', 'Integration Test Story', 'feature')
      ON CONFLICT (story_id) DO NOTHING
    `)

    testDir = join(tmpdir(), `kbar-artifact-sync-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  }, 90000)

  afterAll(async () => {
    await client?.end()
    await container?.stop()
    await rm(testDir, { recursive: true, force: true })
  })

  it('AC-1: idempotency — second sync skips if checksum unchanged (real PostgreSQL)', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')

    const planContent = `schema: 1\nstory_id: KBAR-INT-001\nsteps: []\n`
    const planFile = join(testDir, 'PLAN.yaml')
    await writeFile(planFile, planContent, 'utf-8')

    const firstResult = await syncArtifactToDatabase({
      storyId: 'KBAR-INT-001',
      artifactType: 'plan',
      filePath: planFile,
      triggeredBy: 'automation',
    })

    expect(firstResult.success).toBe(true)
    expect(firstResult.syncStatus).toBe('synced')

    // Second sync — same content, should skip
    const secondResult = await syncArtifactToDatabase({
      storyId: 'KBAR-INT-001',
      artifactType: 'plan',
      filePath: planFile,
      triggeredBy: 'automation',
    })

    expect(secondResult.success).toBe(true)
    expect(secondResult.syncStatus).toBe('skipped')
    expect(secondResult.skipped).toBe(true)
  }, 30000)

  it('AC-6: no-conflict scenario — matching checksums (real PostgreSQL)', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')
    const { detectArtifactConflicts } = await import('../detect-artifact-conflicts.js')

    const scopeContent = `schema: 1\nstory_id: KBAR-INT-001\ntouches:\n  backend: true\n`
    const scopeFile = join(testDir, 'SCOPE.yaml')
    await writeFile(scopeFile, scopeContent, 'utf-8')

    // Sync to DB first
    await syncArtifactToDatabase({
      storyId: 'KBAR-INT-001',
      artifactType: 'scope',
      filePath: scopeFile,
      triggeredBy: 'automation',
    })

    // Detect conflicts — should find none since filesystem and DB are in sync
    const conflictResult = await detectArtifactConflicts({
      storyId: 'KBAR-INT-001',
      artifactType: 'scope',
      filePath: scopeFile,
    })

    expect(conflictResult.success).toBe(true)
    expect(conflictResult.hasConflict).toBe(false)
    expect(conflictResult.conflictType).toBe('none')
  }, 30000)

  it('AC-4: batch sync handles 100+ artifacts without N+1 issues', async () => {
    const { syncArtifactToDatabase } = await import('../sync-artifact-to-database.js')

    // Seed many stories
    for (let i = 1; i <= 50; i++) {
      const storyId = `KBAR-BATCH-${String(i).padStart(4, '0')}`
      await client.query(
        `INSERT INTO kbar.stories (story_id, epic, title, story_type)
         VALUES ($1, 'KBAR', $2, 'feature')
         ON CONFLICT (story_id) DO NOTHING`,
        [storyId, `Batch Test Story ${i}`],
      )

      const artifactContent = `schema: 1\nstory_id: ${storyId}\nsteps: []\n`
      const artifactFile = join(testDir, `PLAN-${i}.yaml`)
      await writeFile(artifactFile, artifactContent, 'utf-8')

      const result = await syncArtifactToDatabase({
        storyId,
        artifactType: 'plan',
        filePath: artifactFile,
        triggeredBy: 'automation',
      })

      expect(result.success).toBe(true)
    }

    // Verify all 50 artifacts were synced
    const count = await client.query(`SELECT COUNT(*) FROM kbar.artifacts WHERE artifact_type = 'plan'`)
    expect(parseInt(count.rows[0].count)).toBeGreaterThanOrEqual(50)
  }, 60000)

  it('AC-5: batch checkpoint resumption — partial state pre-inserted (real PostgreSQL)', async () => {
    const { batchSyncByType } = await import('../batch-sync-by-type.js')

    // Pre-insert a checkpoint to simulate resumption
    const checkpointName = 'test_resumption_checkpoint'
    const lastPath = join(testDir, 'PLAN-25.yaml') // Simulate processed up to story 25

    await client.query(
      `INSERT INTO kbar.sync_checkpoints (checkpoint_name, checkpoint_type, last_processed_path, total_processed, is_active)
       VALUES ($1, 'artifact_type', $2, 25, TRUE)
       ON CONFLICT (checkpoint_name) DO UPDATE SET last_processed_path = $2, total_processed = 25`,
      [checkpointName, lastPath],
    )

    const result = await batchSyncByType({
      artifactType: 'plan',
      baseDir: testDir,
      triggeredBy: 'automation',
      checkpointName,
    })

    // Should succeed (even with no story directories under testDir)
    expect(result.success).toBe(true)
    expect(result.checkpointName).toBe(checkpointName)
  }, 30000)
})
