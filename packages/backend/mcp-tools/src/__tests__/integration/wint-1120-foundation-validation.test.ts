/**
 * Foundation Validation Integration Tests
 * WINT-1120: Spike — Validate wint.stories CRUD, shim routing, LangGraph parity,
 * and worktree roundtrip with real PostgreSQL (lego_dev port 5432).
 *
 * Acceptance Criteria covered:
 * - AC-1: Story CRUD via storyGetStatus, storyUpdateStatus, storyGetByStatus, storyGetByFeature
 * - AC-2: shimGetStoryStatus DB-hit path (returns DB result, no directory scan)
 * - AC-3: shimGetStoryStatus DB-miss path (directory fallback returns correct state)
 * - AC-4: shimUpdateStoryStatus DB-miss returns null, no filesystem side effects
 * - AC-8: Raw pg SELECT on wint.stories and storyGetStatus() return matching storyId/state/title
 * - AC-9: Raw pg UPDATE on wint.stories is immediately visible via storyGetStatus()
 * - AC-10: worktreeRegister() followed by worktreeGetByStory() returns active record
 * - AC-12: worktreeMarkComplete() updates status to merged/abandoned; confirmed via direct DB query
 *
 * ARCH-001 Finding: wint.stories and "core.stories" are the SAME physical table.
 * StoryRepository (orchestrator) queries wint.stories via raw pg client (port 5432).
 * MCP tools query wint.stories via Drizzle ORM (@repo/database-schema exports).
 * Both target the same lego_dev database on port 5432.
 *
 * For AC-8/AC-9, we use db.execute() (Drizzle raw SQL) to replicate what StoryRepository
 * does via raw pg, proving both paths target the same physical table.
 *
 * ADR-005: Real DB only, no mocks.
 * ADR-006: E2E exempt (frontend_impacted: false).
 */

import { randomUUID } from 'crypto'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { sql, eq } from 'drizzle-orm'
import { db } from '@repo/db'
import { stories, worktrees } from '@repo/database-schema'
import { storyGetStatus } from '../../story-management/story-get-status.js'
import { storyUpdateStatus } from '../../story-management/story-update-status.js'
import { storyGetByStatus } from '../../story-management/story-get-by-status.js'
import { storyGetByFeature } from '../../story-management/story-get-by-feature.js'
import {
  shimGetStoryStatus,
  shimUpdateStoryStatus,
} from '../../story-compatibility/index.js'
import {
  worktreeRegister,
  worktreeGetByStory,
  worktreeMarkComplete,
} from '../../worktree-management/index.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

describe('WINT-1120 Foundation Validation — Integration Tests (real PostgreSQL)', () => {
  let testStoryUuid: string
  let shimStoriesRoot: string

  beforeAll(async () => {
    // Use TEST-8001 pattern (matches /^[A-Z]{2,10}-\d{3,4}$/)
    testStoryUuid = randomUUID()

    await db.insert(stories).values({
      id: testStoryUuid,
      storyId: 'TEST-8001',
      title: 'WINT-1120 Foundation Validation Test Story',
      description: 'Integration test fixture for WINT-1120 spike',
      storyType: 'spike',
      epic: 'TEST',
      wave: 99,
      priority: 'P4',
      state: 'backlog',
    })

    // Temp directory for shim directory-fallback scenarios (AC-3)
    shimStoriesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wint-1120-shim-'))
    const inProgressPath = path.join(shimStoriesRoot, 'in-progress', 'MISS-0001')
    fs.mkdirSync(inProgressPath, { recursive: true })
  })

  // Clean up all worktrees for testStoryUuid after each test.
  // This prevents unique constraint violations when a test fails mid-execution
  // and leaves an active worktree in the DB, which would block subsequent tests.
  afterEach(async () => {
    await db.delete(worktrees).where(eq(worktrees.storyId, testStoryUuid))
  })

  afterAll(async () => {
    // Cascade deletes worktrees and state history automatically
    await db.delete(stories).where(eq(stories.id, testStoryUuid))

    if (shimStoriesRoot && fs.existsSync(shimStoriesRoot)) {
      fs.rmSync(shimStoriesRoot, { recursive: true, force: true })
    }
  })

  // ---------------------------------------------------------------------------
  // AC-1: Story CRUD — storyGetStatus, storyUpdateStatus, storyGetByStatus,
  //       storyGetByFeature execute without error against real story IDs
  // ---------------------------------------------------------------------------

  describe('AC-1: Story CRUD via MCP tools', () => {
    it('storyGetStatus returns record for test story (by UUID)', async () => {
      const result = await storyGetStatus({ storyId: testStoryUuid })

      expect(result).not.toBeNull()
      expect(result?.storyId).toBe('TEST-8001')
      expect(result?.state).toBe('backlog')
      expect(result?.epic).toBe('TEST')
      expect(result?.id).toBe(testStoryUuid)
    })

    it('storyUpdateStatus transitions test story to in_progress', async () => {
      const result = await storyUpdateStatus({
        storyId: testStoryUuid,
        newState: 'in_progress',
        reason: 'WINT-1120 AC-1 test',
        triggeredBy: 'wint-1120-test',
      })

      expect(result).not.toBeNull()
      expect(result?.storyId).toBe('TEST-8001')
      expect(result?.state).toBe('in_progress')
    })

    it('storyGetByStatus returns test story in in_progress list', async () => {
      // Ensure test story is in_progress
      await storyUpdateStatus({
        storyId: testStoryUuid,
        newState: 'in_progress',
        triggeredBy: 'wint-1120-test',
      })

      const results = await storyGetByStatus({ state: 'in_progress', limit: 100, offset: 0 })

      expect(Array.isArray(results)).toBe(true)
      const found = results.find(s => s.id === testStoryUuid)
      expect(found).toBeDefined()
      expect(found?.state).toBe('in_progress')
    })

    it('storyGetByFeature returns test story under TEST epic', async () => {
      const results = await storyGetByFeature({ epic: 'TEST', limit: 10, offset: 0 })

      expect(Array.isArray(results)).toBe(true)
      const found = results.find(s => s.id === testStoryUuid)
      expect(found).toBeDefined()
      expect(found?.epic).toBe('TEST')
    })
  })

  // ---------------------------------------------------------------------------
  // AC-2: shimGetStoryStatus DB-hit path — story present in DB, no directory scan
  // ---------------------------------------------------------------------------

  describe('AC-2: shimGetStoryStatus DB-hit path', () => {
    it('returns DB result directly when story is in DB (id is real UUID, not synthetic)', async () => {
      // Reset to backlog
      await storyUpdateStatus({
        storyId: testStoryUuid,
        newState: 'backlog',
        triggeredBy: 'wint-1120-test',
      })

      // shimGetStoryStatus uses UUID path to avoid OR-clause Postgres cast issue
      const result = await shimGetStoryStatus({ storyId: testStoryUuid })

      expect(result).not.toBeNull()
      expect(result?.storyId).toBe('TEST-8001')
      expect(result?.state).toBe('backlog')
      // Real UUID from DB — not a synthetic randomUUID() from directory fallback
      expect(result?.id).toBe(testStoryUuid)
    })
  })

  // ---------------------------------------------------------------------------
  // AC-3: shimGetStoryStatus DB-miss path — directory fallback
  // ---------------------------------------------------------------------------

  describe('AC-3: shimGetStoryStatus DB-miss → directory fallback', () => {
    it('returns directory result when story absent from DB but present in swim-lane dir', async () => {
      // MISS-0001 is in shimStoriesRoot/in-progress/ but not in DB
      const result = await shimGetStoryStatus(
        { storyId: 'MISS-0001' },
        { storiesRoot: shimStoriesRoot },
      )

      expect(result).not.toBeNull()
      expect(result?.storyId).toBe('MISS-0001')
      expect(result?.state).toBe('in_progress')
    })

    it('returns null when story absent from both DB and directory', async () => {
      const result = await shimGetStoryStatus(
        { storyId: 'MISS-0002' },
        { storiesRoot: shimStoriesRoot },
      )

      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // AC-4: shimUpdateStoryStatus DB-miss returns null, no filesystem side effects
  // ---------------------------------------------------------------------------

  describe('AC-4: shimUpdateStoryStatus DB-miss returns null', () => {
    it('returns null for story absent from DB without creating filesystem artifacts', async () => {
      const result = await shimUpdateStoryStatus({
        storyId: 'MISS-9001',
        newState: 'done',
        triggeredBy: 'wint-1120-test',
      })

      expect(result).toBeNull()

      // Verify no stray files were created — only 'in-progress' from beforeAll
      const allEntries = fs.readdirSync(shimStoriesRoot)
      const unexpectedEntry = allEntries.find(e => e !== 'in-progress')
      expect(unexpectedEntry).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // AC-8: Raw pg SELECT on wint.stories matches storyGetStatus() output
  //       ARCH-001: Both StoryRepository (raw pg) and MCP tools (Drizzle) query
  //       the same physical wint.stories table in lego_dev on port 5432.
  // ---------------------------------------------------------------------------

  describe('AC-8: LangGraph parity read — raw SQL vs storyGetStatus', () => {
    it('raw SQL SELECT on wint.stories and storyGetStatus() return matching storyId/state/title', async () => {
      // Raw SQL — replicates StoryRepository.getStory() query pattern
      const rawResult = await db.execute(
        sql`SELECT story_id, state, title FROM wint.stories WHERE story_id = 'TEST-8001'`,
      )

      // Drizzle ORM path (MCP tool)
      const mcpResult = await storyGetStatus({ storyId: testStoryUuid })

      expect(rawResult.rows.length).toBe(1)
      expect(mcpResult).not.toBeNull()

      const rawRow = rawResult.rows[0] as { story_id: string; state: string; title: string }

      // ARCH-001: Same physical table — fields must match
      expect(rawRow.story_id).toBe(mcpResult?.storyId)
      expect(rawRow.state).toBe(mcpResult?.state)
      expect(rawRow.title).toBe(mcpResult?.title)
    })
  })

  // ---------------------------------------------------------------------------
  // AC-9: Raw pg UPDATE on wint.stories visible via storyGetStatus()
  // ---------------------------------------------------------------------------

  describe('AC-9: LangGraph parity write — raw SQL write visible via MCP read', () => {
    it('state written via raw SQL UPDATE is immediately visible via storyGetStatus', async () => {
      // Raw SQL UPDATE — replicates StoryRepository.updateStoryState() pattern
      await db.execute(
        sql`UPDATE wint.stories SET state = 'ready_to_work', updated_at = NOW() WHERE story_id = 'TEST-8001'`,
      )

      // Read via Drizzle (MCP storyGetStatus path)
      const mcpResult = await storyGetStatus({ storyId: testStoryUuid })

      expect(mcpResult).not.toBeNull()
      expect(mcpResult?.state).toBe('ready_to_work')

      // Reset to backlog for subsequent tests
      await storyUpdateStatus({
        storyId: testStoryUuid,
        newState: 'backlog',
        triggeredBy: 'wint-1120-test',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // AC-10: worktreeRegister() → worktreeGetByStory() roundtrip
  //
  // Note: worktreeRegister returns storyId as the input storyId (UUID in this test).
  //       worktreeGetByStory returns storyId as the human-readable story_id column
  //       from wint.stories (via JOIN). These are different fields.
  // ---------------------------------------------------------------------------

  describe('AC-10: Worktree register roundtrip', () => {
    it('worktreeRegister + worktreeGetByStory returns correct story_id, branch_name, status: active', async () => {
      const registered = await worktreeRegister({
        storyId: testStoryUuid,
        worktreePath: '/tmp/wint-1120-test-wt',
        branchName: 'story/WINT-1120-test',
      })

      expect(registered).not.toBeNull()
      expect(registered?.status).toBe('active')
      // worktreeRegister returns storyId as the input value (UUID here)
      expect(registered?.storyId).toBe(testStoryUuid)
      expect(registered?.branchName).toBe('story/WINT-1120-test')

      // worktreeGetByStory by UUID — returns storyId as human-readable (stories.storyId from JOIN)
      const found = await worktreeGetByStory({ storyId: testStoryUuid })
      expect(found).not.toBeNull()
      expect(found?.id).toBe(registered?.id)
      // found.storyId comes from JOIN on stories.storyId (human-readable)
      expect(found?.storyId).toBe('TEST-8001')
      expect(found?.branchName).toBe('story/WINT-1120-test')
      expect(found?.status).toBe('active')
    })
  })

  // ---------------------------------------------------------------------------
  // AC-12: worktreeMarkComplete() updates DB record; confirmed via direct DB query
  //
  // Note: afterEach cleans up all worktrees for testStoryUuid, so each test
  // starts with no active worktrees.
  // ---------------------------------------------------------------------------

  describe('AC-12: worktreeMarkComplete updates status and timestamps', () => {
    it('worktreeMarkComplete sets status=merged, mergedAt is set; getByStory returns null', async () => {
      const registered = await worktreeRegister({
        storyId: testStoryUuid,
        worktreePath: '/tmp/wint-1120-test-wt-complete',
        branchName: 'story/WINT-1120-test-complete',
      })

      expect(registered).not.toBeNull()

      const markResult = await worktreeMarkComplete({
        worktreeId: registered!.id,
        status: 'merged',
        metadata: { reason: 'WINT-1120 AC-12 test', prNumber: 0 },
      })

      expect(markResult).toEqual({ success: true })

      // After merge, worktreeGetByStory returns null (only active worktrees)
      const afterMerge = await worktreeGetByStory({ storyId: testStoryUuid })
      expect(afterMerge).toBeNull()

      // Direct DB query (select) confirms status=merged and mergedAt is set
      const [dbRow] = await db
        .select()
        .from(worktrees)
        .where(eq(worktrees.id, registered!.id))
        .limit(1)

      expect(dbRow?.status).toBe('merged')
      expect(dbRow?.mergedAt).not.toBeNull()
      expect(dbRow?.mergedAt).toBeInstanceOf(Date)
    })

    it('worktreeMarkComplete with status=abandoned sets abandonedAt', async () => {
      const registered = await worktreeRegister({
        storyId: testStoryUuid,
        worktreePath: '/tmp/wint-1120-test-wt-abandoned',
        branchName: 'story/WINT-1120-test-abandoned',
      })

      expect(registered).not.toBeNull()

      const markResult = await worktreeMarkComplete({
        worktreeId: registered!.id,
        status: 'abandoned',
        metadata: { reason: 'WINT-1120 AC-12 abandoned test' },
      })

      expect(markResult).toEqual({ success: true })

      // Direct DB query (select) confirms status=abandoned and abandonedAt is set
      const [dbRow] = await db
        .select()
        .from(worktrees)
        .where(eq(worktrees.id, registered!.id))
        .limit(1)

      expect(dbRow?.status).toBe('abandoned')
      expect(dbRow?.abandonedAt).not.toBeNull()
      expect(dbRow?.abandonedAt).toBeInstanceOf(Date)
    })
  })
})
