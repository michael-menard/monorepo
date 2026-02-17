/**
 * Integration Tests for KBAR Sync with Real PostgreSQL
 * KBAR-0030: AC-8
 *
 * Uses testcontainers to spin up real PostgreSQL database for integration testing.
 * Tests full sync flows with actual database operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

// Skip integration tests if database env vars are not set
const shouldSkip = !process.env.POSTGRES_HOST && !process.env.POSTGRES_DATABASE
if (shouldSkip) {
  console.log('Skipping integration tests - database environment variables not set')
}
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { syncStoryToDatabase } from '../sync-story-to-database.js'
import { syncStoryFromDatabase } from '../sync-story-from-database.js'
import { detectSyncConflicts } from '../detect-sync-conflicts.js'

describe.skipIf(shouldSkip)('KBAR Sync Integration Tests', () => {
  let container: StartedPostgreSqlContainer
  let client: pg.Client
  let db: ReturnType<typeof drizzle>
  let testDir: string

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('kbar_test')
      .withUsername('test')
      .withPassword('test')
      .start()

    // Create database client
    client = new pg.Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    })

    await client.connect()
    db = drizzle(client)

    // Set environment variables for @repo/db to use this container
    process.env.POSTGRES_HOST = container.getHost()
    process.env.POSTGRES_PORT = container.getPort().toString()
    process.env.POSTGRES_USERNAME = container.getUsername()
    process.env.POSTGRES_PASSWORD = container.getPassword()
    process.env.POSTGRES_DATABASE = container.getDatabase()

    // Create KBAR schema
    await client.query(`CREATE SCHEMA IF NOT EXISTS kbar`)

    // Create enums
    await client.query(`
      CREATE TYPE kbar_story_phase AS ENUM ('setup', 'plan', 'execute', 'review', 'qa', 'done');
      CREATE TYPE kbar_artifact_type AS ENUM ('story_file', 'elaboration', 'plan', 'scope', 'evidence', 'review', 'test_plan', 'decisions', 'checkpoint', 'knowledge_context');
      CREATE TYPE kbar_sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'conflict');
      CREATE TYPE kbar_dependency_type AS ENUM ('blocks', 'requires', 'related_to', 'enhances');
      CREATE TYPE kbar_story_priority AS ENUM ('P0', 'P1', 'P2', 'P3', 'P4');
      CREATE TYPE kbar_conflict_resolution AS ENUM ('filesystem_wins', 'database_wins', 'manual', 'merged', 'deferred');
    `)

    // Create tables (simplified for tests)
    await client.query(`
      CREATE TABLE kbar.stories (
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

      CREATE TABLE kbar.artifacts (
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

      CREATE TABLE kbar.sync_events (
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

      CREATE TABLE kbar.sync_conflicts (
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
    `)

    // Create temp directory for test files
    testDir = join(tmpdir(), `kbar-sync-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  }, 60000) // 60s timeout for container startup

  afterAll(async () => {
    await client?.end()
    await container?.stop()
    await rm(testDir, { recursive: true, force: true })
  })

  it('should sync story from filesystem to database', async () => {
    const testFile = join(testDir, 'TEST-001.md')
    const yamlContent = `schema: 1
story_id: TEST-001
epic: TEST
title: Integration Test Story
description: Test story for integration testing
story_type: feature
priority: P2
complexity: low
story_points: 3
current_phase: setup
status: backlog
metadata:
  tags:
    - test
  feature_dir: /test
`

    await writeFile(testFile, yamlContent, 'utf-8')

    const result = await syncStoryToDatabase({
      storyId: 'TEST-001',
      filePath: testFile,
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')
    expect(result.checksum).toBeDefined()

    // Verify database records
    const dbStories = await client.query('SELECT * FROM kbar.stories WHERE story_id = $1', [
      'TEST-001',
    ])
    expect(dbStories.rows).toHaveLength(1)
    expect(dbStories.rows[0].title).toBe('Integration Test Story')

    const dbArtifacts = await client.query('SELECT * FROM kbar.artifacts WHERE story_id = $1', [
      dbStories.rows[0].id,
    ])
    expect(dbArtifacts.rows).toHaveLength(1)
    expect(dbArtifacts.rows[0].artifact_type).toBe('story_file')
  }, 30000)

  it('should sync story from database to filesystem', async () => {
    const outputFile = join(testDir, 'TEST-002.md')

    // Insert story directly to database
    const insertResult = await client.query(
      `INSERT INTO kbar.stories (story_id, epic, title, story_type, priority, current_phase, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      ['TEST-002', 'TEST', 'DB Test Story', 'feature', 'P1', 'setup', 'backlog'],
    )

    const storyId = insertResult.rows[0].id

    await client.query(
      `INSERT INTO kbar.artifacts (story_id, artifact_type, file_path, checksum, sync_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [storyId, 'story_file', outputFile, 'dummy-checksum', 'completed'],
    )

    const result = await syncStoryFromDatabase({
      storyId: 'TEST-002',
      outputPath: outputFile,
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')

    // Verify file was written
    const fileContent = await readFile(outputFile, 'utf-8')
    expect(fileContent).toContain('story_id: TEST-002')
    expect(fileContent).toContain('title: DB Test Story')
  }, 30000)

  it('should detect conflicts when both sides changed', async () => {
    const testFile = join(testDir, 'TEST-003.md')
    const yamlContent = `schema: 1
story_id: TEST-003
epic: TEST
title: Conflict Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    await writeFile(testFile, yamlContent, 'utf-8')

    // First sync
    await syncStoryToDatabase({
      storyId: 'TEST-003',
      filePath: testFile,
      triggeredBy: 'user',
    })

    // Modify file
    const modifiedContent = yamlContent.replace('Conflict Test', 'Modified Title')
    await writeFile(testFile, modifiedContent, 'utf-8')

    // Detect conflict (both filesystem and DB have changed)
    const result = await detectSyncConflicts({
      storyId: 'TEST-003',
      filePath: testFile,
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('checksum_mismatch')
    expect(result.conflictId).toBeDefined()

    // Verify conflict logged to database
    const conflicts = await client.query(
      'SELECT * FROM kbar.sync_conflicts WHERE conflict_type = $1',
      ['checksum_mismatch'],
    )
    expect(conflicts.rows.length).toBeGreaterThan(0)
  }, 30000)

  it('should skip sync when checksum unchanged (idempotency)', async () => {
    const testFile = join(testDir, 'TEST-004.md')
    const yamlContent = `schema: 1
story_id: TEST-004
epic: TEST
title: Idempotency Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    await writeFile(testFile, yamlContent, 'utf-8')

    // First sync
    const firstResult = await syncStoryToDatabase({
      storyId: 'TEST-004',
      filePath: testFile,
      triggeredBy: 'user',
    })

    expect(firstResult.syncStatus).toBe('completed')

    // Second sync (no changes)
    const secondResult = await syncStoryToDatabase({
      storyId: 'TEST-004',
      filePath: testFile,
      triggeredBy: 'user',
    })

    expect(secondResult.success).toBe(true)
    expect(secondResult.syncStatus).toBe('skipped')
    expect(secondResult.skipped).toBe(true)
  }, 30000)
})
