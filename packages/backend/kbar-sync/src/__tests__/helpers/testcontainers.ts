/**
 * Shared Testcontainers Helper for KBAR Integration Tests
 * KBAR-0060: AC-8
 *
 * Provides:
 * - PostgreSQL testcontainer startup with full KBAR schema (all 6 enums + 7 tables)
 * - SKIP_TESTCONTAINERS guard (describe.skipIf)
 * - Temp directory utilities
 *
 * Per L-001: Uses DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$
 *            to avoid duplicate enum errors (CREATE TYPE IF NOT EXISTS is PG 16.3+ only).
 * Per L-002: Sets both POSTGRES_USERNAME and POSTGRES_USER env vars.
 * Per L-007: beforeAll timeout must be 90000ms (90s).
 */

import { mkdir, rm } from 'node:fs/promises'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type pg from 'pg'

// ============================================================================
// Skip Guard (AC-8 / L-003)
// ============================================================================

/**
 * Skip guard for all KBAR integration tests.
 * Use: describe.skipIf(SKIP_TESTCONTAINERS)('...', () => { ... })
 */
export const SKIP_TESTCONTAINERS = process.env.SKIP_TESTCONTAINERS === 'true'

// ============================================================================
// Container Startup
// ============================================================================

export interface TestContainerContext {
  container: StartedPostgreSqlContainer
  client: pg.Client
}

/**
 * Create an enum type safely, ignoring duplicate_object errors.
 * This is compatible with PostgreSQL 14+ (CREATE TYPE IF NOT EXISTS requires 16.3+).
 */
function createEnumSql(name: string, values: string[]): string {
  const valueList = values.map(v => `'${v}'`).join(', ')
  return `DO $$ BEGIN CREATE TYPE ${name} AS ENUM (${valueList}); EXCEPTION WHEN duplicate_object THEN null; END $$;`
}

/**
 * Start a PostgreSQL testcontainer and apply the full KBAR schema.
 *
 * Includes all 6 enums and 7 tables from artifact-sync.integration.test.ts (KBAR-0040).
 * Per L-004: DO NOT copy schema from integration.integration.test.ts (KBAR-0030) —
 * it is missing sync_checkpoints, artifact_versions, and artifact_content_cache tables.
 *
 * Sets both POSTGRES_USERNAME (for @repo/db) and POSTGRES_USER (for CLI scripts).
 *
 * @returns Container context with started container and connected client.
 */
export async function startKbarTestContainer(
  databaseName = 'kbar_integration_test',
): Promise<TestContainerContext> {
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
  const PgClient = (await import('pg')).default.Client

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase(databaseName)
    .withUsername('test')
    .withPassword('test')
    .start()

  const client = new PgClient({
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  })

  await client.connect()

  // Set env vars for @repo/db (POSTGRES_USERNAME) and CLI scripts (POSTGRES_USER)
  // Per L-002: set both for compatibility
  process.env.POSTGRES_HOST = container.getHost()
  process.env.POSTGRES_PORT = container.getPort().toString()
  process.env.POSTGRES_USERNAME = container.getUsername()
  process.env.POSTGRES_USER = container.getUsername()
  process.env.POSTGRES_PASSWORD = container.getPassword()
  process.env.POSTGRES_DATABASE = container.getDatabase()

  await applyKbarSchema(client)

  return { container, client }
}

/**
 * Apply the full KBAR schema to the given client.
 *
 * All 6 enums (with duplicate_object exception handling per L-001) and 7 tables.
 * Canonical source: artifact-sync.integration.test.ts (KBAR-0040).
 */
export async function applyKbarSchema(client: pg.Client): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS kbar`)

  // All 6 enums — using exception handling to avoid errors on repeated calls (L-001)
  await client.query(
    createEnumSql('kbar_story_phase', ['setup', 'plan', 'execute', 'review', 'qa', 'done']),
  )
  await client.query(
    createEnumSql('kbar_artifact_type', [
      'story_file',
      'elaboration',
      'plan',
      'scope',
      'evidence',
      'review',
      'test_plan',
      'decisions',
      'checkpoint',
      'knowledge_context',
    ]),
  )
  await client.query(
    createEnumSql('kbar_sync_status', [
      'pending',
      'in_progress',
      'completed',
      'failed',
      'conflict',
    ]),
  )
  await client.query(
    createEnumSql('kbar_dependency_type', ['blocks', 'requires', 'related_to', 'enhances']),
  )
  await client.query(createEnumSql('kbar_story_priority', ['P0', 'P1', 'P2', 'P3', 'P4']))
  await client.query(
    createEnumSql('kbar_conflict_resolution', [
      'filesystem_wins',
      'database_wins',
      'manual',
      'merged',
      'deferred',
    ]),
  )

  // All 7 tables — using IF NOT EXISTS
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
    )
  `)

  await client.query(`
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
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS kbar.artifact_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      artifact_id UUID NOT NULL REFERENCES kbar.artifacts(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      checksum TEXT NOT NULL,
      content_snapshot TEXT,
      changed_by TEXT,
      change_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await client.query(`
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
    )
  `)

  await client.query(`
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
    )
  `)

  await client.query(`
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
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS kbar.sync_checkpoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      checkpoint_name TEXT NOT NULL UNIQUE,
      checkpoint_type TEXT NOT NULL DEFAULT 'artifact_type',
      last_processed_path TEXT,
      last_processed_timestamp TIMESTAMPTZ,
      total_processed INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

/**
 * Stop a testcontainer and disconnect the client.
 */
export async function stopKbarTestContainer(ctx: TestContainerContext): Promise<void> {
  await ctx.client?.end()
  await ctx.container?.stop()
}

// ============================================================================
// Temp Directory Utilities
// ============================================================================

/**
 * Create a unique temp directory for test fixtures.
 *
 * Creates the directory under process.cwd()/plans/<prefix>-<timestamp> so that
 * syncStoryToDatabase's validateFilePath check (baseDir = cwd/plans) passes.
 * This avoids creating test fixtures in system tmpdir which would fail path security checks.
 *
 * Use in beforeAll; clean up in afterAll with removeTempDir.
 */
export async function createTempDir(prefix = 'kbar-integration-test'): Promise<string> {
  // Must be under cwd/plans to pass validateFilePath check in sync functions
  const { resolve } = await import('node:path')
  const dir = resolve(process.cwd(), 'plans', `${prefix}-${Date.now()}`)
  await mkdir(dir, { recursive: true })
  return dir
}

/**
 * Remove a temp directory created by createTempDir.
 */
export async function removeTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}
