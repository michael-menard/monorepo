/**
 * Integration Tests for Worktree Management
 * WINT-1130 AC-6, AC-7, AC-10, AC-11, AC-12
 *
 * Critical tests with real database:
 * 1. Full lifecycle: register → query → list → mark complete
 * 2. FK cascade: delete story deletes worktrees
 * 3. Concurrent registration: unique constraint enforced
 * 4. Orphaned worktree: status remains active
 * 5. Pagination: multi-page results
 * 6. Pagination: boundary conditions
 * 7. Dual ID support: UUID vs human-readable
 * 8. Status transitions: active → merged → query returns null
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { db } from '@repo/db'
import { stories, worktrees } from '@repo/knowledge-base/db'
import { eq, like } from 'drizzle-orm'
import {
  worktreeRegister,
  worktreeGetByStory,
  worktreeListActive,
  worktreeMarkComplete,
} from '../index'

describe('Worktree Management Integration Tests', () => {
  let testStoryId: string
  let testStoryUuid: string

  beforeAll(async () => {
    // Clean up stale test data from previous failed runs
    await db.delete(stories).where(like(stories.storyId, 'TEST%'))
    await db.delete(stories).where(like(stories.storyId, 'TST%'))

    // Create test story fixture
    testStoryId = 'TEST-9999'
    testStoryUuid = randomUUID()

    await db.insert(stories).values({
      id: testStoryUuid,
      storyId: testStoryId,
      title: 'Integration Test Story for Worktrees',
      storyType: 'feature',
      state: 'in_progress',
    })
  })

  afterAll(async () => {
    // Clean up all test stories (cascade deletes worktrees automatically)
    await db.delete(stories).where(like(stories.storyId, 'TEST%'))
    await db.delete(stories).where(like(stories.storyId, 'TST%'))
  })

  it('should complete full lifecycle: register → query → list → mark complete (AC-10)', async () => {
    // Step 1: Register worktree
    const registered = await worktreeRegister({
      storyId: testStoryId,
      worktreePath: '/tmp/test-wt-lifecycle',
      branchName: 'test-lifecycle',
    })

    expect(registered).not.toBeNull()
    expect(registered?.status).toBe('active')
    expect(registered?.storyId).toBe(testStoryId)

    // Step 2: Query by story ID (human-readable)
    const foundByHumanId = await worktreeGetByStory({ storyId: testStoryId })
    expect(foundByHumanId).not.toBeNull()
    expect(foundByHumanId?.id).toBe(registered?.id)

    // Step 3: Query by story UUID
    const foundByUuid = await worktreeGetByStory({ storyId: testStoryUuid })
    expect(foundByUuid).not.toBeNull()
    expect(foundByUuid?.id).toBe(registered?.id)

    // Step 4: List active worktrees (should include ours)
    const activeList = await worktreeListActive({ limit: 100 })
    const ourWorktree = activeList.find(wt => wt.id === registered?.id)
    expect(ourWorktree).toBeDefined()

    // Step 5: Mark as merged
    const markResult = await worktreeMarkComplete({
      worktreeId: registered!.id,
      status: 'merged',
      metadata: { prNumber: 123, reason: 'Integration test complete' },
    })
    expect(markResult).toEqual({ success: true })

    // Step 6: Verify status changed and active query returns null
    const afterMerge = await worktreeGetByStory({ storyId: testStoryId })
    expect(afterMerge).toBeNull() // Only returns active worktrees

    // Step 7: Verify database state directly
    const [dbWorktree] = await db
      .select()
      .from(worktrees)
      .where(eq(worktrees.id, registered!.id))
      .limit(1)
    expect(dbWorktree?.status).toBe('merged')
    expect(dbWorktree?.mergedAt).not.toBeNull()
    expect(dbWorktree?.metadata).toMatchObject({
      prNumber: 123,
      reason: 'Integration test complete',
    })

    // Cleanup
    await db.delete(worktrees).where(eq(worktrees.id, registered!.id))
  })

  it('should enforce FK cascade: delete story deletes worktrees (AC-12)', async () => {
    // Create temporary story
    const tempStoryId = 'TSTFK-0001'
    const tempStoryUuid = randomUUID()

    await db.insert(stories).values({
      id: tempStoryUuid,
      storyId: tempStoryId,
      title: 'FK Test Story',
      storyType: 'feature',
      state: 'in_progress',
    })

    // Register worktree for temp story
    const registered = await worktreeRegister({
      storyId: tempStoryId,
      worktreePath: '/tmp/test-wt-fk',
      branchName: 'test-fk',
    })

    expect(registered).not.toBeNull()

    // Verify worktree exists
    const [beforeDelete] = await db
      .select()
      .from(worktrees)
      .where(eq(worktrees.id, registered!.id))
      .limit(1)
    expect(beforeDelete).toBeDefined()

    // Delete story (should cascade to worktrees)
    await db.delete(stories).where(eq(stories.id, tempStoryUuid))

    // Verify worktree was deleted via cascade
    const [afterDelete] = await db
      .select()
      .from(worktrees)
      .where(eq(worktrees.id, registered!.id))
      .limit(1)
    expect(afterDelete).toBeUndefined()
  })

  it('should prevent concurrent registration of active worktrees (AC-11, AC-12)', async () => {
    // Register first worktree
    const wt1 = await worktreeRegister({
      storyId: testStoryId,
      worktreePath: '/tmp/test-wt-concurrent-1',
      branchName: 'concurrent-1',
    })

    expect(wt1).not.toBeNull()
    expect(wt1?.status).toBe('active')

    // Attempt to register second active worktree for same story
    const wt2 = await worktreeRegister({
      storyId: testStoryId,
      worktreePath: '/tmp/test-wt-concurrent-2',
      branchName: 'concurrent-2',
    })

    // Second registration should fail (return null)
    expect(wt2).toBeNull()

    // Verify only one active worktree exists
    const active = await worktreeListActive({ limit: 100 })
    const storyWorktrees = active.filter(w => w.storyId === testStoryId)
    expect(storyWorktrees.length).toBe(1)
    expect(storyWorktrees[0].id).toBe(wt1?.id)

    // Cleanup
    await db.delete(worktrees).where(eq(worktrees.id, wt1!.id))
  })

  it('should detect orphaned worktree: status remains active (AC-11)', async () => {
    // Register worktree
    const registered = await worktreeRegister({
      storyId: testStoryId,
      worktreePath: '/tmp/test-wt-orphaned',
      branchName: 'orphaned-branch',
    })

    expect(registered).not.toBeNull()

    // Simulate time passing (old worktree)
    // In real scenario, this would be days/weeks old
    // For test, we just verify status remains active without being marked complete

    // Query worktree
    const found = await worktreeGetByStory({ storyId: testStoryId })
    expect(found).not.toBeNull()
    expect(found?.status).toBe('active')
    expect(found?.mergedAt).toBeNull()
    expect(found?.abandonedAt).toBeNull()

    // Cleanup
    await db.delete(worktrees).where(eq(worktrees.id, registered!.id))
  })

  it('should handle pagination: multi-page results (AC-7)', async () => {
    // Create 5 test worktrees
    const tempStoryIds: string[] = []
    const worktreeIds: string[] = []

    for (let i = 0; i < 5; i++) {
      const tempStoryId = `TSTPG-000${i + 1}`
      const tempStoryUuid = randomUUID()
      tempStoryIds.push(tempStoryUuid)

      await db.insert(stories).values({
        id: tempStoryUuid,
        storyId: tempStoryId,
        title: `Pagination Test Story ${i + 1}`,
        storyType: 'feature',
        state: 'in_progress',
      })

      const wt = await worktreeRegister({
        storyId: tempStoryId,
        worktreePath: `/tmp/test-wt-page-${i + 1}`,
        branchName: `page-${i + 1}`,
      })

      if (wt) {
        worktreeIds.push(wt.id)
      }
    }

    // Test pagination: first page (limit 2)
    const page1 = await worktreeListActive({ limit: 2, offset: 0 })
    expect(page1.length).toBeLessThanOrEqual(2)

    // Test pagination: second page (limit 2, offset 2)
    const page2 = await worktreeListActive({ limit: 2, offset: 2 })
    expect(page2.length).toBeLessThanOrEqual(2)

    // Pages should not overlap
    const page1Ids = page1.map(wt => wt.id)
    const page2Ids = page2.map(wt => wt.id)
    const overlap = page1Ids.filter(id => page2Ids.includes(id))
    expect(overlap.length).toBe(0)

    // Cleanup
    for (const storyUuid of tempStoryIds) {
      await db.delete(stories).where(eq(stories.id, storyUuid))
    }
  })

  it('should handle pagination boundary conditions (limit=1, offset beyond count) (AC-7)', async () => {
    // Test limit=1
    const singleResult = await worktreeListActive({ limit: 1 })
    expect(singleResult.length).toBeLessThanOrEqual(1)

    // Test offset beyond total count
    const beyondCount = await worktreeListActive({ offset: 999999 })
    expect(beyondCount).toEqual([])
  })

  it('should support dual ID: UUID and human-readable (AC-6)', async () => {
    // Register worktree
    const registered = await worktreeRegister({
      storyId: testStoryId,
      worktreePath: '/tmp/test-wt-dual-id',
      branchName: 'dual-id',
    })

    expect(registered).not.toBeNull()

    // Query by human-readable ID
    const byHumanId = await worktreeGetByStory({ storyId: testStoryId })
    expect(byHumanId).not.toBeNull()
    expect(byHumanId?.id).toBe(registered?.id)

    // Query by UUID
    const byUuid = await worktreeGetByStory({ storyId: testStoryUuid })
    expect(byUuid).not.toBeNull()
    expect(byUuid?.id).toBe(registered?.id)

    // Both should return same record
    expect(byHumanId).toEqual(byUuid)

    // Cleanup
    await db.delete(worktrees).where(eq(worktrees.id, registered!.id))
  })

  it('should handle status transitions: active → merged/abandoned → query returns null (AC-6)', async () => {
    // Register worktree
    const registered = await worktreeRegister({
      storyId: testStoryId,
      worktreePath: '/tmp/test-wt-transitions',
      branchName: 'transitions',
    })

    expect(registered).not.toBeNull()

    // Verify active status returns worktree
    const activeQuery = await worktreeGetByStory({ storyId: testStoryId })
    expect(activeQuery).not.toBeNull()
    expect(activeQuery?.status).toBe('active')

    // Mark as merged
    await worktreeMarkComplete({
      worktreeId: registered!.id,
      status: 'merged',
    })

    // Query should return null (only returns active)
    const afterMerge = await worktreeGetByStory({ storyId: testStoryId })
    expect(afterMerge).toBeNull()

    // Cleanup
    await db.delete(worktrees).where(eq(worktrees.id, registered!.id))
  })
})
