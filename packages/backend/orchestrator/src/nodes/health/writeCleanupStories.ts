/**
 * writeCleanupStories
 *
 * File system writer for CLEANUP story YAML files.
 * Accepts (stories, outputDir) and writes each story to
 * outputDir/APIP-CLEANUP-NNNN/story.yaml.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-07)
 * AC: AC-8, AC-9
 *
 * Architecture:
 * - Uses fs.readdirSync to determine next CLEANUP sequence number
 * - Validates each story through StoryArtifactSchema.parse() before write
 * - CLEANUP story IDs use APIP-CLEANUP-NNNN format (4-digit zero-padding)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { stringify } from 'yaml'
import { logger } from '@repo/logger'
import { StoryArtifactSchema } from '../../artifacts/story-v2-compatible.js'
import type { StoryArtifact } from '../../artifacts/story-v2-compatible.js'

// ============================================================================
// getNextCleanupNumber
// ============================================================================

/**
 * getNextCleanupNumber
 *
 * Scans outputDir for existing APIP-CLEANUP-NNNN directories and returns
 * the next available sequence number.
 *
 * @param outputDir - Directory to scan for existing CLEANUP story dirs
 * @returns Next available CLEANUP sequence number (1-indexed)
 */
export function getNextCleanupNumber(outputDir: string): number {
  try {
    if (!fs.existsSync(outputDir)) {
      return 1
    }

    const entries = fs.readdirSync(outputDir)
    const cleanupDirs = entries.filter((entry: string) => /^APIP-CLEANUP-\d{4}$/.test(entry))

    if (cleanupDirs.length === 0) {
      return 1
    }

    // Extract numbers and find the max
    const numbers = cleanupDirs.map((dir: string) => parseInt(dir.replace('APIP-CLEANUP-', ''), 10))
    const maxNumber = Math.max(...numbers)
    return maxNumber + 1
  } catch (err) {
    logger.warn('writeCleanupStories: failed to read outputDir for sequence number', {
      outputDir,
      err: err instanceof Error ? err.message : String(err),
    })
    return 1
  }
}

// ============================================================================
// writeCleanupStories
// ============================================================================

/**
 * writeCleanupStories
 *
 * Writes each StoryArtifact to outputDir/APIP-CLEANUP-NNNN/story.yaml.
 * Uses fs.readdirSync to determine next CLEANUP sequence number.
 * Each story is validated through StoryArtifactSchema.parse() before write.
 *
 * @param stories - Array of StoryArtifact objects to write
 * @param outputDir - Base directory for CLEANUP story files (e.g., plans/future/.../backlog/)
 * @returns Array of written file paths
 */
export function writeCleanupStories(stories: StoryArtifact[], outputDir: string): string[] {
  if (stories.length === 0) {
    return []
  }

  const writtenPaths: string[] = []

  for (const story of stories) {
    try {
      // Validate story through StoryArtifactSchema before write (AC-8)
      const validated = StoryArtifactSchema.parse(story)

      // Determine story directory from ID (e.g., APIP-CLEANUP-0001)
      const storyDir = path.join(outputDir, validated.id)

      // Create directory if it doesn't exist
      fs.mkdirSync(storyDir, { recursive: true })

      // Write story.yaml
      const storyPath = path.join(storyDir, 'story.yaml')
      const yamlContent = stringify(validated)
      fs.writeFileSync(storyPath, yamlContent, 'utf-8')

      writtenPaths.push(storyPath)

      logger.info('writeCleanupStories: wrote CLEANUP story', {
        storyId: validated.id,
        path: storyPath,
      })
    } catch (err) {
      logger.warn('writeCleanupStories: failed to write CLEANUP story', {
        storyId: story.id,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return writtenPaths
}
