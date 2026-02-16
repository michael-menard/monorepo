/**
 * YAML Parser Utilities for Story File Adapter
 *
 * Handles parsing and serialization of story YAML files with frontmatter.
 * Uses gray-matter for frontmatter extraction and js-yaml for YAML serialization.
 */

import matter from 'gray-matter'
import yaml from 'js-yaml'
import { logger } from '@repo/logger'
import { InvalidYAMLError } from '../__types__/index.js'
import type { StoryArtifact } from '../../artifacts/story-v2-compatible.js'
import type { Checkpoint } from '../../artifacts/checkpoint.js'

/**
 * Result of parsing a story file
 */
export interface ParsedStory {
  /** Parsed frontmatter as object */
  frontmatter: Record<string, unknown>
  /** Markdown content (everything after frontmatter) */
  content: string
}

/**
 * Parse a story YAML file with frontmatter
 *
 * Extracts YAML frontmatter and markdown content from a story file.
 * The file should have this structure:
 *
 * ```
 * ---
 * id: STORY-001
 * title: Example Story
 * ---
 * # Story Content
 *
 * Description goes here...
 * ```
 *
 * @param fileContent - Raw file content as string
 * @param filePath - File path (for error messages)
 * @returns Parsed frontmatter and content
 * @throws {InvalidYAMLError} If YAML parsing fails
 *
 * @example
 * ```typescript
 * const parsed = parseFrontmatter(fileContent, '/path/to/story.yaml')
 * console.log(parsed.frontmatter.id) // 'STORY-001'
 * console.log(parsed.content) // '# Story Content\n\nDescription...'
 * ```
 */
export function parseFrontmatter(fileContent: string, filePath: string): ParsedStory {
  try {
    const result = matter(fileContent)

    logger.debug('Parsed story frontmatter', {
      filePath,
      frontmatterKeys: Object.keys(result.data),
      contentLength: result.content.length,
    })

    return {
      frontmatter: result.data,
      content: result.content.trim(),
    }
  } catch (error) {
    throw new InvalidYAMLError(filePath, error as Error)
  }
}

/**
 * Serialize a StoryArtifact object to YAML file format
 *
 * Creates a YAML frontmatter file with this structure:
 *
 * ```
 * ---
 * id: STORY-001
 * title: Example Story
 * ---
 * # Story Content
 *
 * Description goes here...
 * ```
 *
 * @param story - Story artifact object
 * @param content - Markdown content (optional, defaults to story.content or empty)
 * @returns Serialized YAML file content
 * @throws {InvalidYAMLError} If serialization fails
 *
 * @example
 * ```typescript
 * const yaml = serializeStory(storyArtifact, '# Example\n\nContent here')
 * await writeFile('story.yaml', yaml)
 * ```
 */
export function serializeStory(story: StoryArtifact, content?: string): string {
  try {
    // Separate content from frontmatter
    const { content: storyContent, ...frontmatter } = story

    // Use provided content or story.content or empty string
    const markdownContent = content ?? storyContent ?? ''

    // Use gray-matter to serialize
    const result = matter.stringify(markdownContent, frontmatter)

    logger.debug('Serialized story to YAML', {
      storyId: story.id,
      frontmatterKeys: Object.keys(frontmatter),
      contentLength: markdownContent.length,
    })

    return result
  } catch (error) {
    throw new InvalidYAMLError('(serialization)', error as Error)
  }
}

/**
 * Extract content from a parsed story
 *
 * Helper to get just the markdown content portion.
 *
 * @param parsed - Parsed story result
 * @returns Markdown content
 *
 * @example
 * ```typescript
 * const parsed = parseFrontmatter(fileContent, filePath)
 * const content = extractContent(parsed)
 * ```
 */
export function extractContent(parsed: ParsedStory): string {
  return parsed.content
}

/**
 * Merge frontmatter changes while preserving content
 *
 * Used for update operations where only frontmatter fields change.
 *
 * @param original - Original parsed story
 * @param updates - Partial story updates
 * @returns Merged frontmatter with original content
 *
 * @example
 * ```typescript
 * const merged = mergeFrontmatter(originalParsed, { state: 'in-progress' })
 * ```
 */
export function mergeFrontmatter(
  original: ParsedStory,
  updates: Partial<StoryArtifact>,
): ParsedStory {
  return {
    frontmatter: {
      ...original.frontmatter,
      ...updates,
    },
    content: original.content,
  }
}

/**
 * Parse a pure YAML checkpoint file (no frontmatter)
 *
 * Checkpoint files are pure YAML without markdown content or frontmatter delimiters.
 * This function uses js-yaml directly instead of gray-matter.
 *
 * @param content - Raw file content as string
 * @param filePath - File path (for error messages)
 * @returns Parsed YAML object
 * @throws {InvalidYAMLError} If YAML parsing fails
 *
 * @example
 * ```typescript
 * const data = parseCheckpointYAML(fileContent, '/path/to/CHECKPOINT.yaml')
 * ```
 */
export function parseCheckpointYAML(content: string, filePath: string): unknown {
  try {
    const parsed = yaml.load(content)

    logger.debug('Parsed checkpoint YAML', {
      filePath,
      hasData: !!parsed,
    })

    return parsed
  } catch (error) {
    throw new InvalidYAMLError(filePath, error as Error)
  }
}

/**
 * Serialize a Checkpoint object to YAML format
 *
 * Creates a pure YAML file (no frontmatter delimiters).
 *
 * @param checkpoint - Checkpoint object
 * @returns Serialized YAML content
 * @throws {InvalidYAMLError} If serialization fails
 *
 * @example
 * ```typescript
 * const yaml = serializeCheckpoint(checkpointData)
 * await writeFile('CHECKPOINT.yaml', yaml)
 * ```
 */
export function serializeCheckpoint(checkpoint: Checkpoint): string {
  try {
    const yamlContent = yaml.dump(checkpoint, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    })

    logger.debug('Serialized checkpoint to YAML', {
      storyId: checkpoint.story_id,
      phase: checkpoint.current_phase,
    })

    return yamlContent
  } catch (error) {
    throw new InvalidYAMLError('(serialization)', error as Error)
  }
}
