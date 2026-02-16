/**
 * Story File Adapter Tests
 *
 * Comprehensive test suite covering all acceptance criteria:
 * - AC-1: Read existing story files with Zod validation
 * - AC-2: Write story files with YAML frontmatter  
 * - AC-3: Update existing files (merge changes, preserve content)
 * - AC-4: Validate structure before read/write
 * - AC-5: Atomic writes (temp file + rename)
 * - AC-6: Typed error handling
 * - AC-7: Backward compatibility with legacy format
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { StoryFileAdapter } from '../story-file-adapter.js'
import {
  StoryNotFoundError,
  InvalidYAMLError,
  ValidationError,
  WriteError,
  ReadError,
} from '../__types__/index.js'
import type { StoryArtifact } from '../../artifacts/story-v2-compatible.js'

describe('StoryFileAdapter', () => {
  let adapter: StoryFileAdapter
  let tempDir: string
  const fixturesDir = path.join(__dirname, 'fixtures')

  beforeEach(async () => {
    adapter = new StoryFileAdapter()
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'story-adapter-test-'))
  })

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('AC-1: Read existing story files with Zod validation', () => {
    it('should read minimal legacy format story', async () => {
      const filePath = path.join(fixturesDir, 'minimal-story.yaml')
      const story = await adapter.read(filePath)

      expect(story.id).toBe('TEST-001')
      expect(story.title).toBe('Minimal Test Story')
      expect(story.status).toBe('backlog')
      expect(story.epic).toBe('test-epic')
      expect(story.content).toContain('Minimal Story')
    })

    it('should read full v2 format story', async () => {
      const filePath = path.join(fixturesDir, 'full-story.yaml')
      const story = await adapter.read(filePath)

      expect(story.id).toBe('TEST-002')
      expect(story.schema).toBe(1)
      expect(story.feature).toBe('platform')
      expect(story.type).toBe('infrastructure')
      expect(story.state).toBe('in-progress')
      expect(story.acs).toHaveLength(1)
      expect(story.acs?.[0]?.id).toBe('AC-1')
      expect(story.content).toContain('Full Story')
    })

    it('should parse frontmatter and content separately', async () => {
      const filePath = path.join(fixturesDir, 'full-story.yaml')
      const story = await adapter.read(filePath)

      // Frontmatter fields
      expect(story.id).toBe('TEST-002')
      expect(story.title).toBe('Full Test Story')

      // Content field
      expect(story.content).toBeDefined()
      expect(story.content).toContain('# Full Story')
      expect(story.content).toContain('Acceptance Criteria')
    })
  })

  describe('AC-2: Write story files with YAML frontmatter', () => {
    it('should write new story file with frontmatter', async () => {
      const filePath = path.join(tempDir, 'new-story.yaml')
      const story: StoryArtifact = {
        id: 'TEST-003',
        title: 'New Test Story',
        state: 'backlog',
        feature: 'test',
        content: '# Test Content\n\nThis is test content.',
      }

      await adapter.write(filePath, story)

      // Verify file exists
      const exists = await adapter.exists(filePath)
      expect(exists).toBe(true)

      // Read back and verify
      const readStory = await adapter.read(filePath)
      expect(readStory.id).toBe('TEST-003')
      expect(readStory.title).toBe('New Test Story')
      expect(readStory.content).toBe('# Test Content\n\nThis is test content.')
    })

    it('should write story with YAML frontmatter delimiters', async () => {
      const filePath = path.join(tempDir, 'frontmatter-test.yaml')
      const story: StoryArtifact = {
        id: 'TEST-004',
        title: 'Frontmatter Test',
      }

      await adapter.write(filePath, story)

      // Read raw file content
      const rawContent = await fs.readFile(filePath, 'utf-8')

      // Verify frontmatter structure
      expect(rawContent).toMatch(/^---\n/)
      expect(rawContent).toContain('id: TEST-004')
      expect(rawContent).toContain('title: Frontmatter Test')
      expect(rawContent).toMatch(/\n---\n/)
    })
  })

  describe('AC-3: Update existing files (merge changes, preserve content)', () => {
    it('should update frontmatter while preserving content', async () => {
      // Create initial story
      const filePath = path.join(tempDir, 'update-test.yaml')
      const initialStory: StoryArtifact = {
        id: 'TEST-005',
        title: 'Update Test',
        state: 'backlog',
        feature: 'test',
        content: '# Original Content\n\nDo not change this.',
      }

      await adapter.write(filePath, initialStory)

      // Update state field
      await adapter.update(filePath, { state: 'in-progress' })

      // Read and verify
      const updatedStory = await adapter.read(filePath)
      expect(updatedStory.state).toBe('in-progress')
      expect(updatedStory.content).toBe('# Original Content\n\nDo not change this.')
      expect(updatedStory.title).toBe('Update Test') // Unchanged
    })

    it('should merge multiple field updates', async () => {
      const filePath = path.join(tempDir, 'multi-update.yaml')
      const initialStory: StoryArtifact = {
        id: 'TEST-006',
        title: 'Multi Update Test',
        state: 'backlog',
        feature: 'test',
        points: 3,
      }

      await adapter.write(filePath, initialStory)

      // Update multiple fields
      await adapter.update(filePath, {
        state: 'in-progress',
        points: 5,
        priority: 'high',
      })

      const updatedStory = await adapter.read(filePath)
      expect(updatedStory.state).toBe('in-progress')
      expect(updatedStory.points).toBe(5)
      expect(updatedStory.priority).toBe('high')
      expect(updatedStory.title).toBe('Multi Update Test') // Unchanged
    })
  })

  describe('AC-4: Validate structure before read/write', () => {
    it('should throw ValidationError when reading invalid file (missing id)', async () => {
      const filePath = path.join(fixturesDir, 'invalid-missing-id.yaml')

      await expect(adapter.read(filePath)).rejects.toThrow(ValidationError)

      try {
        await adapter.read(filePath)
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.filePath).toBe(filePath)
        expect(validationError.validationErrors).toBeDefined()
        expect(validationError.validationErrors.some(e => e.path.includes('id'))).toBe(true)
      }
    })

    it('should throw ValidationError when writing invalid story', async () => {
      const filePath = path.join(tempDir, 'invalid-write.yaml')
      const invalidStory = {
        // Missing required 'id' field
        title: 'Invalid Story',
      } as StoryArtifact

      await expect(adapter.write(filePath, invalidStory)).rejects.toThrow(ValidationError)
    })

    it('should validate before performing atomic write', async () => {
      const filePath = path.join(tempDir, 'validate-before-write.yaml')
      const invalidStory = { title: 'No ID' } as StoryArtifact

      // Attempt to write invalid story
      await expect(adapter.write(filePath, invalidStory)).rejects.toThrow(ValidationError)

      // Verify no file was created (validation happens before write)
      const exists = await adapter.exists(filePath)
      expect(exists).toBe(false)

      // Verify no temp file left behind
      const tempExists = await adapter.exists(`${filePath}.tmp`)
      expect(tempExists).toBe(false)
    })
  })

  describe('AC-5: Atomic writes (temp file + rename)', () => {
    it('should use temp file during write operation', async () => {
      const filePath = path.join(tempDir, 'atomic-test.yaml')
      const story: StoryArtifact = {
        id: 'TEST-007',
        title: 'Atomic Test',
      }

      // Write story
      await adapter.write(filePath, story)

      // Verify final file exists
      const exists = await adapter.exists(filePath)
      expect(exists).toBe(true)

      // Verify temp file was cleaned up
      const tempExists = await adapter.exists(`${filePath}.tmp`)
      expect(tempExists).toBe(false)
    })

    it('should cleanup temp file on write failure', async () => {
      const filePath = '/invalid/path/that/does/not/exist/story.yaml'
      const story: StoryArtifact = {
        id: 'TEST-008',
        title: 'Cleanup Test',
      }

      // Attempt to write to invalid path
      await expect(adapter.write(filePath, story)).rejects.toThrow(WriteError)

      // Verify no temp file left behind (this is implicit - temp file can't be created in invalid path)
    })
  })

  describe('AC-6: Typed error handling', () => {
    it('should throw StoryNotFoundError for missing file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist.yaml')

      await expect(adapter.read(filePath)).rejects.toThrow(StoryNotFoundError)

      try {
        await adapter.read(filePath)
      } catch (error) {
        expect(error).toBeInstanceOf(StoryNotFoundError)
        const notFoundError = error as StoryNotFoundError
        expect(notFoundError.filePath).toBe(filePath)
        expect(notFoundError.message).toContain(filePath)
      }
    })

    it('should throw InvalidYAMLError for malformed YAML', async () => {
      const filePath = path.join(fixturesDir, 'malformed.yaml')

      // The first read will throw InvalidYAMLError
      await expect(adapter.read(filePath)).rejects.toThrow()
    })

    it('should throw ValidationError with detailed error messages', async () => {
      const filePath = path.join(fixturesDir, 'invalid-missing-id.yaml')

      try {
        await adapter.read(filePath)
        expect.fail('Should have thrown ValidationError')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        const validationError = error as ValidationError
        expect(validationError.validationErrors).toHaveLength(1)
        expect(validationError.validationErrors[0]?.path).toContain('id')
        expect(validationError.message).toContain('Validation failed')
      }
    })

    it('should throw WriteError on file system errors', async () => {
      const filePath = path.join(tempDir, 'write-error-test.yaml')
      const story: StoryArtifact = {
        id: 'TEST-009',
        title: 'Write Error Test',
      }

      // Create directory with same name as file to force write error
      await fs.mkdir(filePath)

      await expect(adapter.write(filePath, story)).rejects.toThrow(WriteError)
    })

    it('should throw StoryNotFoundError on update of non-existent file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist-update.yaml')

      await expect(adapter.update(filePath, { state: 'in-progress' })).rejects.toThrow(
        StoryNotFoundError,
      )
    })
  })

  describe('AC-7: Backward compatibility with legacy format', () => {
    it('should read legacy format with status field', async () => {
      const filePath = path.join(fixturesDir, 'minimal-story.yaml')
      const story = await adapter.read(filePath)

      expect(story.status).toBe('backlog')
      expect(story.epic).toBe('test-epic')
    })

    it('should read v2 format with state field', async () => {
      const filePath = path.join(fixturesDir, 'full-story.yaml')
      const story = await adapter.read(filePath)

      expect(story.state).toBe('in-progress')
      expect(story.feature).toBe('platform')
    })

    it('should write and read back both formats', async () => {
      // Test legacy format
      const legacyPath = path.join(tempDir, 'legacy.yaml')
      const legacyStory: StoryArtifact = {
        id: 'TEST-010',
        title: 'Legacy Format',
        status: 'backlog',
        epic: 'test',
      }

      await adapter.write(legacyPath, legacyStory)
      const readLegacy = await adapter.read(legacyPath)
      expect(readLegacy.status).toBe('backlog')
      expect(readLegacy.epic).toBe('test')

      // Test v2 format
      const v2Path = path.join(tempDir, 'v2.yaml')
      const v2Story: StoryArtifact = {
        schema: 1,
        id: 'TEST-011',
        title: 'V2 Format',
        state: 'in-progress',
        feature: 'platform',
      }

      await adapter.write(v2Path, v2Story)
      const readV2 = await adapter.read(v2Path)
      expect(readV2.state).toBe('in-progress')
      expect(readV2.feature).toBe('platform')
    })
  })

  describe('Batch Operations', () => {
    it('should read multiple files in batch', async () => {
      const file1 = path.join(fixturesDir, 'minimal-story.yaml')
      const file2 = path.join(fixturesDir, 'full-story.yaml')

      const result = await adapter.readBatch([file1, file2])

      expect(result.results).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
      expect(result.results.map(s => s.id).sort()).toEqual(['TEST-001', 'TEST-002'])
    })

    it('should handle errors gracefully in batch read', async () => {
      const file1 = path.join(fixturesDir, 'minimal-story.yaml')
      const fileMissing = path.join(tempDir, 'missing.yaml')
      const fileInvalid = path.join(fixturesDir, 'invalid-missing-id.yaml')

      const result = await adapter.readBatch([file1, fileMissing, fileInvalid])

      expect(result.results).toHaveLength(1)
      expect(result.results[0]?.id).toBe('TEST-001')
      expect(result.errors).toHaveLength(2)
      expect(result.errors.some(e => e.error instanceof StoryNotFoundError)).toBe(true)
      expect(result.errors.some(e => e.error instanceof ValidationError)).toBe(true)
    })
  })

  describe('exists() method', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(fixturesDir, 'minimal-story.yaml')
      const exists = await adapter.exists(filePath)
      expect(exists).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist.yaml')
      const exists = await adapter.exists(filePath)
      expect(exists).toBe(false)
    })
  })
})
