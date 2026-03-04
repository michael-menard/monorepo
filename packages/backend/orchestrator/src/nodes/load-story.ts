/**
 * Load Story Node
 *
 * Reads the story file (STORY-SEED.md or elaborated story) and the ChangeSpec
 * plan into implementation graph state. Missing story or ChangeSpec plan
 * produces a typed LoadError that transitions the graph to the abort edge.
 *
 * Logs: story_loaded event with storyId, attemptNumber, durationMs.
 *
 * APIP-1031 AC-4
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '@repo/logger'
import type { ImplementationGraphState } from '../graphs/implementation.js'
import { LoadErrorSchema } from '../graphs/implementation.js'
import { ChangeSpecCollectionSchema } from '../artifacts/change-spec.js'
import type { ChangeSpec } from '../artifacts/change-spec.js'

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Candidate paths for the story file, in priority order.
 * Checks elaborated story first, then falls back to STORY-SEED.md.
 */
function getStoryCandidatePaths(featureDir: string, storyId: string): string[] {
  const storyDir = path.join(featureDir, 'in-progress', storyId)
  return [path.join(storyDir, `${storyId}.md`), path.join(storyDir, '_pm', 'STORY-SEED.md')]
}

/**
 * Path for the ChangeSpec collection YAML.
 * Convention aligned with artifacts/change-spec.ts ChangeSpecCollectionSchema.
 */
function getChangeSpecPath(featureDir: string, storyId: string): string {
  return path.join(featureDir, 'in-progress', storyId, '_implementation', 'change-spec.yaml')
}

async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

// ============================================================================
// ChangeSpec collection reader
// ============================================================================

/**
 * Reads and parses the ChangeSpec collection from YAML.
 * Returns null if file missing; throws on parse error.
 */
async function readChangeSpecCollection(planPath: string): Promise<ChangeSpec[] | null> {
  const raw = await tryReadFile(planPath)
  if (raw === null) return null

  const yaml = await import('yaml')
  const parsed = yaml.parse(raw) as unknown
  const collection = ChangeSpecCollectionSchema.parse(parsed)
  return collection.changes
}

// ============================================================================
// Node implementation
// ============================================================================

/**
 * load-story node.
 *
 * Reads story content and ChangeSpec collection from the filesystem.
 * On missing file: returns a typed LoadError (abort path).
 * On success: populates storyContent and changeSpecs in state.
 */
export async function loadStoryNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const startTime = Date.now()
  const { storyId, attemptNumber, featureDir } = state

  // ---- Step 1: Find the story file ----
  const candidatePaths = getStoryCandidatePaths(featureDir, storyId)
  let storyContent: string | null = null
  let resolvedStoryPath: string | null = null

  for (const candidate of candidatePaths) {
    const content = await tryReadFile(candidate)
    if (content !== null) {
      storyContent = content
      resolvedStoryPath = candidate
      break
    }
  }

  if (storyContent === null || resolvedStoryPath === null) {
    const loadError = LoadErrorSchema.parse({
      code: 'STORY_NOT_FOUND',
      message: `Story file not found for ${storyId}. Checked: ${candidatePaths.join(', ')}`,
      path: candidatePaths[0],
    })

    logger.warn('story_load_failed', {
      storyId,
      stage: 'implementation',
      durationMs: Date.now() - startTime,
      attemptNumber,
      errorCode: loadError.code,
      checkedPaths: candidatePaths,
    })

    return {
      loadError,
      storyLoaded: false,
    }
  }

  // ---- Step 2: Load ChangeSpec collection ----
  const changeSpecPath = getChangeSpecPath(featureDir, storyId)
  let changeSpecs: ChangeSpec[] = []

  try {
    const specs = await readChangeSpecCollection(changeSpecPath)

    if (specs === null) {
      // ChangeSpec collection missing — return LoadError
      const loadError = LoadErrorSchema.parse({
        code: 'CHANGE_SPEC_NOT_FOUND',
        message: `ChangeSpec collection not found at ${changeSpecPath}`,
        path: changeSpecPath,
      })

      logger.warn('story_load_failed', {
        storyId,
        stage: 'implementation',
        durationMs: Date.now() - startTime,
        attemptNumber,
        errorCode: loadError.code,
        changeSpecPath,
      })

      return {
        loadError,
        storyLoaded: false,
      }
    }

    changeSpecs = specs
  } catch (error) {
    const loadError = LoadErrorSchema.parse({
      code: 'STORY_PARSE_ERROR',
      message: `Failed to parse ChangeSpec collection: ${error instanceof Error ? error.message : String(error)}`,
      path: changeSpecPath,
    })

    logger.warn('story_load_failed', {
      storyId,
      stage: 'implementation',
      durationMs: Date.now() - startTime,
      attemptNumber,
      errorCode: loadError.code,
      error: loadError.message,
    })

    return {
      loadError,
      storyLoaded: false,
    }
  }

  // ---- Step 3: Success ----
  const durationMs = Date.now() - startTime

  logger.info('story_loaded', {
    storyId,
    stage: 'implementation',
    durationMs,
    attemptNumber,
    storyPath: resolvedStoryPath,
    changeSpecCount: changeSpecs.length,
  })

  return {
    storyContent,
    changeSpecs,
    loadError: null,
    storyLoaded: true,
  }
}
