/**
 * Story File Adapter
 *
 * Type-safe file adapter for reading and writing story YAML files.
 * Supports both legacy and v2 schema formats via backward-compatible schema.
 *
 * Features:
 * - Atomic writes (temp file + rename pattern)
 * - Zod validation on read/write
 * - Typed error handling
 * - Backward compatibility with existing story files
 * - Batch operations for performance
 *
 * @example
 * ```typescript
 * const adapter = new StoryFileAdapter()
 *
 * // Read a story
 * const story = await adapter.read('/path/to/story.yaml')
 *
 * // Write a story
 * await adapter.write('/path/to/new-story.yaml', storyArtifact)
 *
 * // Update a story
 * await adapter.update('/path/to/story.yaml', { state: 'in-progress' })
 *
 * // Check if story exists
 * const exists = await adapter.exists('/path/to/story.yaml')
 *
 * // Read multiple stories
 * const result = await adapter.readBatch(['/path/1.yaml', '/path/2.yaml'])
 * ```
 */

import { logger } from '@repo/logger'
import { StoryArtifactSchema, type StoryArtifact } from '../artifacts/story-v2-compatible.js'
import { StoryNotFoundError, ValidationError } from './__types__/index.js'
import { writeFileAtomic, readFileSafe, fileExists } from './utils/file-utils.js'
import { parseFrontmatter, serializeStory, mergeFrontmatter } from './utils/yaml-parser.js'

/**
 * Result of batch read operation
 */
export interface BatchReadResult {
  /** Successfully read stories */
  results: StoryArtifact[]
  /** Errors encountered during read (missing files, validation failures, etc.) */
  errors: Array<{ filePath: string; error: Error }>
}

/**
 * Story File Adapter
 *
 * Provides type-safe read/write operations for story YAML files.
 * Uses backward-compatible schema to support both legacy and v2 formats.
 */
export class StoryFileAdapter {
  /**
   * Read a story file from disk
   *
   * @param filePath - Absolute path to the story YAML file
   * @returns Validated StoryArtifact object
   * @throws {StoryNotFoundError} If file does not exist
   * @throws {InvalidYAMLError} If YAML parsing fails
   * @throws {ValidationError} If Zod validation fails
   * @throws {ReadError} If file read fails for other reasons
   *
   * @example
   * ```typescript
   * const story = await adapter.read('/path/to/STORY-001.yaml')
   * console.log(story.id) // 'STORY-001'
   * ```
   */
  async read(filePath: string): Promise<StoryArtifact> {
    logger.info('Reading story file', { filePath })

    try {
      // Read file content
      const content = await readFileSafe(filePath)

      // Parse YAML frontmatter
      const parsed = parseFrontmatter(content, filePath)

      // Validate against schema
      const result = StoryArtifactSchema.safeParse(parsed.frontmatter)

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          path: err.path.map(String),
          message: err.message,
        }))
        throw new ValidationError(filePath, errors)
      }

      // Add content field from markdown portion
      const story: StoryArtifact = {
        ...result.data,
        content: parsed.content || undefined,
      }

      logger.info('Story file read successfully', { filePath, storyId: story.id })
      return story
    } catch (error) {
      // Convert ENOENT to StoryNotFoundError
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StoryNotFoundError(filePath)
      }
      throw error
    }
  }

  /**
   * Write a story file to disk
   *
   * Uses atomic write pattern (temp file + rename) to prevent corruption.
   *
   * @param filePath - Absolute path to the story YAML file
   * @param story - StoryArtifact object to write
   * @throws {ValidationError} If story object fails validation
   * @throws {WriteError} If file write fails
   *
   * @example
   * ```typescript
   * const story: StoryArtifact = {
   *   id: 'STORY-001',
   *   title: 'Example Story',
   *   // ... other fields
   * }
   * await adapter.write('/path/to/STORY-001.yaml', story)
   * ```
   */
  async write(filePath: string, story: StoryArtifact): Promise<void> {
    logger.info('Writing story file', { filePath, storyId: story.id })

    // Validate before writing
    const result = StoryArtifactSchema.safeParse(story)

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        path: err.path.map(String),
        message: err.message,
      }))
      throw new ValidationError(filePath, errors)
    }

    // Serialize to YAML
    const yaml = serializeStory(result.data, story.content)

    // Write atomically
    await writeFileAtomic(filePath, yaml)

    logger.info('Story file written successfully', { filePath, storyId: story.id })
  }

  /**
   * Update an existing story file
   *
   * Merges provided updates into existing story while preserving content.
   * Only frontmatter fields are updated - markdown content is preserved.
   *
   * @param filePath - Absolute path to the story YAML file
   * @param updates - Partial story object with fields to update
   * @throws {StoryNotFoundError} If file does not exist
   * @throws {InvalidYAMLError} If YAML parsing fails
   * @throws {ValidationError} If merged result fails validation
   * @throws {WriteError} If file write fails
   *
   * @example
   * ```typescript
   * // Update just the state field
   * await adapter.update('/path/to/STORY-001.yaml', { state: 'in-progress' })
   *
   * // Update multiple fields
   * await adapter.update('/path/to/STORY-001.yaml', {
   *   state: 'in-progress',
   *   updated_at: new Date().toISOString()
   * })
   * ```
   */
  async update(filePath: string, updates: Partial<StoryArtifact>): Promise<void> {
    logger.info('Updating story file', { filePath, updates: Object.keys(updates) })

    try {
      // Read existing file
      const content = await readFileSafe(filePath)

      // Parse frontmatter
      const parsed = parseFrontmatter(content, filePath)

      // Merge updates
      const merged = mergeFrontmatter(parsed, updates)

      // Validate merged result
      const result = StoryArtifactSchema.safeParse(merged.frontmatter)

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          path: err.path.map(String),
          message: err.message,
        }))
        throw new ValidationError(filePath, errors)
      }

      // Serialize with preserved content
      const yaml = serializeStory(result.data, merged.content)

      // Write atomically
      await writeFileAtomic(filePath, yaml)

      logger.info('Story file updated successfully', { filePath, updates: Object.keys(updates) })
    } catch (error) {
      // Convert ENOENT to StoryNotFoundError
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StoryNotFoundError(filePath)
      }
      throw error
    }
  }

  /**
   * Check if a story file exists
   *
   * @param filePath - Absolute path to the story YAML file
   * @returns True if file exists and is accessible
   *
   * @example
   * ```typescript
   * if (await adapter.exists('/path/to/STORY-001.yaml')) {
   *   console.log('Story exists')
   * }
   * ```
   */
  async exists(filePath: string): Promise<boolean> {
    return fileExists(filePath)
  }

  /**
   * Read multiple story files in batch
   *
   * Error handling strategy:
   * - Missing files: Logged to errors array, processing continues
   * - Validation errors: Logged to errors array, processing continues
   * - Read errors: Logged to errors array, processing continues
   *
   * This allows partial results when some files fail.
   *
   * @param filePaths - Array of absolute paths to story YAML files
   * @returns Object with results array and errors array
   *
   * @example
   * ```typescript
   * const result = await adapter.readBatch([
   *   '/path/to/STORY-001.yaml',
   *   '/path/to/STORY-002.yaml',
   *   '/path/to/missing.yaml' // Will be in errors array
   * ])
   *
   * console.log(`Read ${result.results.length} stories`)
   * console.log(`Failed ${result.errors.length} reads`)
   * ```
   */
  async readBatch(filePaths: string[]): Promise<BatchReadResult> {
    logger.info('Reading batch of story files', { count: filePaths.length })

    const results: StoryArtifact[] = []
    const errors: Array<{ filePath: string; error: Error }> = []

    // Read all files in parallel
    const promises = filePaths.map(async filePath => {
      try {
        const story = await this.read(filePath)
        results.push(story)
      } catch (error) {
        errors.push({ filePath, error: error as Error })
        logger.warn('Failed to read story file', { filePath, error: (error as Error).message })
      }
    })

    await Promise.all(promises)

    logger.info('Batch read complete', {
      totalFiles: filePaths.length,
      successCount: results.length,
      errorCount: errors.length,
    })

    return { results, errors }
  }
}
