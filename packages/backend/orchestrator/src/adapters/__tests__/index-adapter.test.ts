/**
 * Index Adapter Tests
 *
 * Comprehensive test suite for IndexAdapter covering all acceptance criteria.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { IndexAdapter } from '../index-adapter.js'
import {
  InvalidIndexError,
  CircularDependencyError,
  DuplicateStoryIdError,
  StoryNotInIndexError,
} from '../__types__/index.js'
import type { IndexStoryEntry } from '../index-adapter.js'

describe('IndexAdapter', () => {
  let adapter: IndexAdapter
  let tempDir: string
  const fixturesDir = path.join(__dirname, 'fixtures')

  beforeEach(async () => {
    adapter = new IndexAdapter()
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'index-adapter-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('readIndex', () => {
    it('should parse frontmatter correctly', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      expect(index.frontmatter.doc_type).toBe('stories_index')
      expect(index.frontmatter.title).toBe('Test Index')
      expect(index.frontmatter.status).toBe('active')
      expect(index.frontmatter.story_prefix).toBe('TEST')
    })

    it('should parse wave sections', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      expect(index.waves).toHaveLength(1)
      expect(index.waves[0]?.name).toBe('Wave 1 — Test Wave')
      expect(index.waves[0]?.story_count).toBe(3)
    })

    it('should parse story entries correctly', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      expect(index.stories).toHaveLength(3)

      const story1 = index.stories[0]
      expect(story1?.number).toBe(1)
      expect(story1?.story_id).toBe('TEST-0010')
      expect(story1?.title).toBe('First Story')
      expect(story1?.started).toBe(false)
      expect(story1?.status).toBe('backlog')
      expect(story1?.epic).toBe('TEST')
      expect(story1?.priority).toBe('P1')
      expect(story1?.wave).toBe('Wave 1 — Test Wave')

      const story2 = index.stories[1]
      expect(story2?.story_id).toBe('TEST-0020')
      expect(story2?.status).toBe('created')
      expect(story2?.depends_on).toEqual(['TEST-0010'])

      const story3 = index.stories[2]
      expect(story3?.story_id).toBe('TEST-0030')
      expect(story3?.started).toBe(true)
      expect(story3?.status).toBe('completed')
      expect(story3?.depends_on).toEqual(['TEST-0020'])
    })

    it('should calculate metrics', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      expect(index.metrics.total).toBe(3)
      expect(index.metrics.by_status.backlog).toBe(1)
      expect(index.metrics.by_status.created).toBe(1)
      expect(index.metrics.by_status.completed).toBe(1)
      expect(index.metrics.by_epic.TEST).toBe(3)
      expect(index.metrics.completion_percent).toBe(33) // 1/3 = 33%
    })

    it('should preserve emojis and formatting in raw_title', async () => {
      const indexPath = path.join(fixturesDir, 'formatting-test.md')
      const index = await adapter.readIndex(indexPath)

      const story1 = index.stories[0]
      expect(story1?.raw_title).toBe('Critical Story ⚡ **created**')
      expect(story1?.title).toBe('Critical Story')
      expect(story1?.status).toBe('created')

      const story2 = index.stories[1]
      expect(story2?.raw_title).toBe('Milestone Story 🎯')
      expect(story2?.title).toBe('Milestone Story')

      const story3 = index.stories[2]
      expect(story3?.raw_title).toBe('LangGraph Story ✨ **completed**')
      expect(story3?.title).toBe('LangGraph Story')
      expect(story3?.status).toBe('completed')
    })
  })

  describe('writeIndex', () => {
    it('should write index and preserve round-trip', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'roundtrip.md')

      // Read original
      const original = await adapter.readIndex(sourcePath)

      // Write to temp
      await adapter.writeIndex(original, targetPath)

      // Read back
      const restored = await adapter.readIndex(targetPath)

      // Compare key fields
      expect(restored.frontmatter.title).toBe(original.frontmatter.title)
      expect(restored.waves).toHaveLength(original.waves.length)
      expect(restored.stories).toHaveLength(original.stories.length)
      expect(restored.stories.map(s => s.story_id)).toEqual(original.stories.map(s => s.story_id))
    })

    it('should use atomic write pattern', async () => {
      const indexPath = path.join(tempDir, 'atomic-test.md')
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(sourcePath)

      await adapter.writeIndex(index, indexPath)

      // Verify final file exists
      const exists = await fs.access(indexPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      // Verify no temp file left behind
      const tempExists = await fs.access(`${indexPath}.tmp`).then(() => true).catch(() => false)
      expect(tempExists).toBe(false)
    })
  })

  describe('updateStoryStatus', () => {
    it('should update story status marker', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'update-status.md')

      // Copy fixture to temp
      await fs.copyFile(sourcePath, targetPath)

      // Update status
      await adapter.updateStoryStatus('TEST-0010', 'in-progress', targetPath)

      // Read and verify
      const updated = await adapter.readIndex(targetPath)
      const story = updated.stories.find(s => s.story_id === 'TEST-0010')

      expect(story?.status).toBe('in-progress')
      expect(story?.raw_title).toContain('**in-progress**')
    })

    it('should preserve emojis when updating status', async () => {
      const sourcePath = path.join(fixturesDir, 'formatting-test.md')
      const targetPath = path.join(tempDir, 'update-emoji.md')

      await fs.copyFile(sourcePath, targetPath)

      // Update story with emoji
      await adapter.updateStoryStatus('TEST-0010', 'in-progress', targetPath)

      const updated = await adapter.readIndex(targetPath)
      const story = updated.stories.find(s => s.story_id === 'TEST-0010')

      expect(story?.raw_title).toContain('⚡')
      expect(story?.raw_title).toContain('**in-progress**')
      expect(story?.status).toBe('in-progress')
    })

    it('should throw StoryNotInIndexError for missing story', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'missing-story.md')

      await fs.copyFile(sourcePath, targetPath)

      await expect(
        adapter.updateStoryStatus('TEST-9999', 'in-progress', targetPath),
      ).rejects.toThrow(StoryNotInIndexError)
    })

    it('should recalculate metrics after status update', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'recalc-metrics.md')

      await fs.copyFile(sourcePath, targetPath)

      // Update backlog story to completed
      await adapter.updateStoryStatus('TEST-0010', 'completed', targetPath)

      const updated = await adapter.readIndex(targetPath)

      expect(updated.metrics.by_status.backlog).toBe(0)
      expect(updated.metrics.by_status.completed).toBe(2)
      expect(updated.metrics.completion_percent).toBe(67) // 2/3 = 67%
    })
  })

  describe('addStory', () => {
    it('should add new story to wave', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'add-story.md')

      await fs.copyFile(sourcePath, targetPath)

      const newEntry: IndexStoryEntry = {
        number: 0, // Will be assigned
        story_id: 'TEST-0040',
        title: 'New Story',
        started: false,
        status: 'created',
        epic: 'TEST',
        priority: 'P1',
        wave: '', // Will be assigned
        raw_title: 'New Story **created**',
      }

      await adapter.addStory(newEntry, 'Wave 1 — Test Wave', targetPath)

      const updated = await adapter.readIndex(targetPath)
      const story = updated.stories.find(s => s.story_id === 'TEST-0040')

      expect(story).toBeDefined()
      expect(story?.number).toBe(4) // Sequential after 3
      expect(story?.wave).toBe('Wave 1 — Test Wave')
      expect(updated.metrics.total).toBe(4)
    })

    it('should throw DuplicateStoryIdError for duplicate ID', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'duplicate-add.md')

      await fs.copyFile(sourcePath, targetPath)

      const newEntry: IndexStoryEntry = {
        number: 0,
        story_id: 'TEST-0010', // Already exists
        title: 'Duplicate',
        started: false,
        status: 'backlog',
        wave: '',
        raw_title: 'Duplicate',
      }

      await expect(
        adapter.addStory(newEntry, 'Wave 1 — Test Wave', targetPath),
      ).rejects.toThrow(DuplicateStoryIdError)
    })

    it('should throw InvalidIndexError for missing wave', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'missing-wave.md')

      await fs.copyFile(sourcePath, targetPath)

      const newEntry: IndexStoryEntry = {
        number: 0,
        story_id: 'TEST-0040',
        title: 'Test',
        started: false,
        status: 'backlog',
        wave: '',
        raw_title: 'Test',
      }

      await expect(
        adapter.addStory(newEntry, 'Wave 99 — Missing', targetPath),
      ).rejects.toThrow(InvalidIndexError)
    })
  })

  describe('removeStory', () => {
    it('should remove story from index', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'remove-story.md')

      await fs.copyFile(sourcePath, targetPath)

      await adapter.removeStory('TEST-0020', targetPath)

      const updated = await adapter.readIndex(targetPath)

      expect(updated.stories).toHaveLength(2)
      expect(updated.stories.find(s => s.story_id === 'TEST-0020')).toBeUndefined()
      expect(updated.metrics.total).toBe(2)
    })

    it('should throw StoryNotInIndexError for missing story', async () => {
      const sourcePath = path.join(fixturesDir, 'minimal-index.md')
      const targetPath = path.join(tempDir, 'remove-missing.md')

      await fs.copyFile(sourcePath, targetPath)

      await expect(adapter.removeStory('TEST-9999', targetPath)).rejects.toThrow(
        StoryNotInIndexError,
      )
    })
  })

  describe('validate', () => {
    it('should validate valid index', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      const result = adapter.validate(index)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect duplicate IDs', async () => {
      const indexPath = path.join(fixturesDir, 'invalid-duplicate-ids.md')
      const index = await adapter.readIndex(indexPath)

      const result = adapter.validate(index)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'duplicate_id')).toBe(true)
      expect(result.errors.find(e => e.type === 'duplicate_id')?.stories).toContain('TEST-0010')
    })

    it('should detect circular dependencies', async () => {
      const indexPath = path.join(fixturesDir, 'invalid-circular-deps.md')
      const index = await adapter.readIndex(indexPath)

      const result = adapter.validate(index)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'circular_dependency')).toBe(true)
    })

    it('should detect missing dependency references', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      // Add story with missing dependency
      index.stories.push({
        number: 99,
        story_id: 'TEST-9999',
        title: 'Bad Story',
        started: false,
        status: 'backlog',
        depends_on: ['TEST-MISSING'],
        wave: 'Wave 1 — Test Wave',
        raw_title: 'Bad Story',
      })

      const result = adapter.validate(index)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.type === 'missing_dependency')).toBe(true)
    })
  })

  describe('recalculateMetrics', () => {
    it('should count stories by status', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      const metrics = adapter.recalculateMetrics(index)

      expect(metrics.by_status.backlog).toBe(1)
      expect(metrics.by_status.created).toBe(1)
      expect(metrics.by_status.completed).toBe(1)
      expect(metrics.by_status['in-progress']).toBe(0)
    })

    it('should count stories by epic', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      const metrics = adapter.recalculateMetrics(index)

      expect(metrics.by_epic.TEST).toBe(3)
    })

    it('should count stories by wave', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      const metrics = adapter.recalculateMetrics(index)

      expect(metrics.by_wave['Wave 1 — Test Wave']).toBe(3)
    })

    it('should calculate completion percentage', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      const metrics = adapter.recalculateMetrics(index)

      expect(metrics.completion_percent).toBe(33) // 1/3 completed = 33%
    })
  })

  describe('formatting preservation', () => {
    it('should preserve emojis in titles', async () => {
      const indexPath = path.join(fixturesDir, 'formatting-test.md')
      const index = await adapter.readIndex(indexPath)

      expect(index.stories[0]?.raw_title).toContain('⚡')
      expect(index.stories[1]?.raw_title).toContain('🎯')
      expect(index.stories[2]?.raw_title).toContain('✨')
    })

    it('should preserve bold priorities', async () => {
      const indexPath = path.join(fixturesDir, 'formatting-test.md')
      const index = await adapter.readIndex(indexPath)

      expect(index.stories[0]?.priority).toBe('P0')
      expect(index.stories[1]?.priority).toBe('P1')
    })

    it('should preserve legend sections', async () => {
      const indexPath = path.join(fixturesDir, 'formatting-test.md')
      const content = await fs.readFile(indexPath, 'utf-8')

      expect(content).toContain('**Legend:**')
    })

    it('should handle round-trip with emojis', async () => {
      const sourcePath = path.join(fixturesDir, 'formatting-test.md')
      const targetPath = path.join(tempDir, 'emoji-roundtrip.md')

      const original = await adapter.readIndex(sourcePath)
      await adapter.writeIndex(original, targetPath)
      const restored = await adapter.readIndex(targetPath)

      expect(restored.stories[0]?.raw_title).toBe(original.stories[0]?.raw_title)
      expect(restored.stories[1]?.raw_title).toBe(original.stories[1]?.raw_title)
      expect(restored.stories[2]?.raw_title).toBe(original.stories[2]?.raw_title)
    })
  })

  describe('detectCircularDependencies', () => {
    it('should not throw for valid dependency graph', async () => {
      const indexPath = path.join(fixturesDir, 'minimal-index.md')
      const index = await adapter.readIndex(indexPath)

      expect(() => adapter.detectCircularDependencies(index.stories)).not.toThrow()
    })

    it('should throw CircularDependencyError for cycles', async () => {
      const indexPath = path.join(fixturesDir, 'invalid-circular-deps.md')
      const index = await adapter.readIndex(indexPath)

      expect(() => adapter.detectCircularDependencies(index.stories)).toThrow(
        CircularDependencyError,
      )
    })

    it('should include cycle path in error', async () => {
      const indexPath = path.join(fixturesDir, 'invalid-circular-deps.md')
      const index = await adapter.readIndex(indexPath)

      try {
        adapter.detectCircularDependencies(index.stories)
        expect.fail('Should have thrown CircularDependencyError')
      } catch (error) {
        expect(error).toBeInstanceOf(CircularDependencyError)
        const circError = error as CircularDependencyError
        expect(circError.cycle).toBeDefined()
        expect(circError.cycle.length).toBeGreaterThan(1)
      }
    })
  })
})
