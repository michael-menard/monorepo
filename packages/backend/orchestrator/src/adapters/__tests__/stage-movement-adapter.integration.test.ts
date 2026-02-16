/**
 * Stage Movement Adapter Integration Tests
 *
 * Real file operations with test fixtures
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { StageMovementAdapter } from '../stage-movement-adapter.js'
import { InvalidTransitionError, StoryNotFoundError } from '../__types__/index.js'

describe('StageMovementAdapter Integration Tests', () => {
  let adapter: StageMovementAdapter
  let tempDir: string
  const fixturesDir = path.join(__dirname, 'fixtures', 'stage-test-epic')

  beforeEach(async () => {
    adapter = new StageMovementAdapter()

    // Create temp directory for test files
    tempDir = path.join(
      process.cwd(),
      'packages/backend/orchestrator/src/adapters/__tests__/temp',
      `test-${Date.now()}`,
    )
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up temp directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  })

  async function copyFixture(fixtureId: string): Promise<string> {
    const sourceFile = path.join(fixturesDir, `${fixtureId}.md`)
    const destDir = path.join(tempDir, fixtureId)
    const destFile = path.join(destDir, `${fixtureId}.md`)

    await fs.mkdir(destDir, { recursive: true })
    await fs.copyFile(sourceFile, destFile)

    return destFile
  }

  describe('Full lifecycle transitions', () => {
    it('should move story through complete lifecycle', async () => {
      // Copy TEST-001 (backlog)
      await copyFixture('TEST-001')

      // Transition 1: backlog -> elaboration
      const result1 = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'elaboration',
      })
      expect(result1.success).toBe(true)
      expect(result1.fromStage).toBe('backlog')
      expect(result1.toStage).toBe('elaboration')

      // Transition 2: elaboration -> ready-to-work
      const result2 = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'ready-to-work',
      })
      expect(result2.success).toBe(true)
      expect(result2.fromStage).toBe('elaboration')

      // Transition 3: ready-to-work -> in-progress
      const result3 = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'in-progress',
      })
      expect(result3.success).toBe(true)
      expect(result3.fromStage).toBe('ready-to-work')

      // Transition 4: in-progress -> ready-for-qa
      const result4 = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'ready-for-qa',
      })
      expect(result4.success).toBe(true)
      expect(result4.fromStage).toBe('in-progress')

      // Transition 5: ready-for-qa -> uat
      const result5 = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'uat',
      })
      expect(result5.success).toBe(true)
      expect(result5.fromStage).toBe('ready-for-qa')

      // Transition 6: uat -> in-progress (QA failure rework)
      const result6 = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'in-progress',
      })
      expect(result6.success).toBe(true)
      expect(result6.fromStage).toBe('uat')
    })

    it('should skip elaboration for simple stories', async () => {
      await copyFixture('TEST-001')

      // Direct backlog -> ready-to-work
      const result = await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'ready-to-work',
      })

      expect(result.success).toBe(true)
      expect(result.fromStage).toBe('backlog')
      expect(result.toStage).toBe('ready-to-work')
    })
  })

  describe('Batch operations', () => {
    it('should move 10 stories in <2s', async () => {
      // Create 10 test stories
      for (let i = 1; i <= 10; i++) {
        const storyId = `BATCH-${String(i).padStart(3, '0')}`
        const storyDir = path.join(tempDir, storyId)
        const storyFile = path.join(storyDir, `${storyId}.md`)

        await fs.mkdir(storyDir, { recursive: true })
        await fs.writeFile(
          storyFile,
          `---
id: ${storyId}
title: "Batch Test Story ${i}"
status: ready-to-work
priority: P0
epic: batch-test
created_at: "2026-02-14T00:00:00Z"
updated_at: "2026-02-14T00:00:00Z"
---

# ${storyId}
`,
          'utf-8',
        )
      }

      const startTime = Date.now()

      const result = await adapter.batchMoveStage({
        stories: Array.from({ length: 10 }, (_, i) => ({
          storyId: `BATCH-${String(i + 1).padStart(3, '0')}`,
          featureDir: tempDir,
          toStage: 'in-progress' as const,
        })),
      })

      const elapsedMs = Date.now() - startTime

      expect(result.totalStories).toBe(10)
      expect(result.succeeded).toBe(10)
      expect(result.failed).toBe(0)
      expect(elapsedMs).toBeLessThan(2000)
    })
  })

  describe('Error handling', () => {
    it('should throw StoryNotFoundError for missing story', async () => {
      await expect(
        adapter.moveStage({
          storyId: 'MISSING-001',
          featureDir: tempDir,
          toStage: 'in-progress',
        }),
      ).rejects.toThrow(StoryNotFoundError)
    })

    it('should throw InvalidTransitionError for blocked transitions', async () => {
      await copyFixture('TEST-003') // UAT

      await expect(
        adapter.moveStage({
          storyId: 'TEST-003',
          featureDir: tempDir,
          toStage: 'ready-for-qa',
        }),
      ).rejects.toThrow(InvalidTransitionError)
    })
  })

  describe('Performance benchmarks', () => {
    it('should complete single move in <100ms', async () => {
      await copyFixture('TEST-001')

      const startTime = Date.now()

      await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'ready-to-work',
      })

      const elapsedMs = Date.now() - startTime

      expect(elapsedMs).toBeLessThan(100)
    })
  })

  describe('Auto-locate functionality', () => {
    it('should find story without specifying fromStage', async () => {
      await copyFixture('TEST-002')

      const result = await adapter.moveStage({
        storyId: 'TEST-002',
        featureDir: tempDir,
        toStage: 'ready-for-qa',
      })

      expect(result.success).toBe(true)
      expect(result.fromStage).toBe('in-progress')
    })
  })

  describe('Frontmatter updates', () => {
    it('should verify status field is updated in file', async () => {
      const filePath = await copyFixture('TEST-001')

      await adapter.moveStage({
        storyId: 'TEST-001',
        featureDir: tempDir,
        toStage: 'ready-to-work',
      })

      // Read file and verify status
      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toContain('status: ready-to-work')
      expect(content).toContain('updated_at:')
    })
  })
})
