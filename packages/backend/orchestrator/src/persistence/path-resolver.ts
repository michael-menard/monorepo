/**
 * Path Resolver
 *
 * Handles file path conventions for YAML artifacts in the Claude workflow.
 * Resolves paths based on feature directories, story stages, and artifact types.
 *
 * Directory Structure:
 * plans/future/{feature}/{stage}/{storyId}/
 * ├── story.yaml
 * ├── elaboration.yaml
 * ├── plan.yaml
 * ├── proof.yaml (LangGraph) / verification.yaml (Claude)
 * ├── context.yaml
 * └── tokens.yaml
 */

import { z } from 'zod'
import * as path from 'path'

// ============================================================================
// Stage Definitions
// ============================================================================

/**
 * Story lifecycle stages that map to directory names
 */
export const StoryStageSchema = z.enum([
  'backlog',
  'elaboration',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'uat', // Note: directory is 'UAT' but we normalize to lowercase
  'completed',
  'deferred',
  'cancelled',
])
export type StoryStage = z.infer<typeof StoryStageSchema>

/**
 * Mapping from story state to stage directory name
 */
const STATE_TO_STAGE_DIRECTORY: Record<string, string> = {
  draft: 'backlog',
  backlog: 'backlog',
  elaboration: 'elaboration',
  'ready-to-work': 'ready-to-work',
  'in-progress': 'in-progress',
  'ready-for-qa': 'ready-for-qa',
  uat: 'UAT', // Case-sensitive directory name
  done: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
  deferred: 'deferred',
}

/**
 * Mapping from directory name to stage (inverse of above, lowercase)
 */
const DIRECTORY_TO_STAGE: Record<string, StoryStage> = {
  backlog: 'backlog',
  elaboration: 'elaboration',
  'ready-to-work': 'ready-to-work',
  'in-progress': 'in-progress',
  'ready-for-qa': 'ready-for-qa',
  uat: 'uat',
  completed: 'completed',
  done: 'completed',
  cancelled: 'cancelled',
  deferred: 'deferred',
}

// ============================================================================
// Artifact Type Definitions
// ============================================================================

/**
 * YAML artifact types that can be read/written
 */
export const YamlArtifactTypeSchema = z.enum([
  'story',
  'elaboration',
  'plan',
  'proof', // LangGraph naming
  'verification', // Claude naming
  'context',
  'tokens',
])
export type YamlArtifactType = z.infer<typeof YamlArtifactTypeSchema>

/**
 * Mapping from artifact type to filename
 */
const ARTIFACT_TYPE_TO_FILENAME: Record<YamlArtifactType, string> = {
  story: 'story.yaml',
  elaboration: 'elaboration.yaml',
  plan: 'plan.yaml',
  proof: 'proof.yaml',
  verification: 'verification.yaml',
  context: 'context.yaml',
  tokens: 'tokens.yaml',
}

/**
 * Mapping from filename to artifact type
 */
const FILENAME_TO_ARTIFACT_TYPE: Record<string, YamlArtifactType> = {
  'story.yaml': 'story',
  'elaboration.yaml': 'elaboration',
  'plan.yaml': 'plan',
  'proof.yaml': 'proof',
  'verification.yaml': 'verification',
  'context.yaml': 'context',
  'tokens.yaml': 'tokens',
}

// ============================================================================
// Path Resolution Schemas
// ============================================================================

/**
 * Resolved path information
 */
export const ResolvedPathSchema = z.object({
  /** Absolute path to the artifact file */
  absolutePath: z.string(),
  /** Relative path from the plans root */
  relativePath: z.string(),
  /** Feature directory name (e.g., 'wish') */
  feature: z.string(),
  /** Stage directory name (e.g., 'UAT') */
  stageDirectory: z.string(),
  /** Story ID (e.g., 'WISH-2001') */
  storyId: z.string(),
  /** Artifact type */
  artifactType: YamlArtifactTypeSchema,
  /** Filename */
  filename: z.string(),
  /** Whether the file exists (if checked) */
  exists: z.boolean().optional(),
})
export type ResolvedPath = z.infer<typeof ResolvedPathSchema>

/**
 * Path resolver configuration
 */
export const PathResolverConfigSchema = z.object({
  /** Root directory for plans (default: plans/future) */
  plansRoot: z.string().default('plans/future'),
  /** Workspace root directory */
  workspaceRoot: z.string(),
  /** Prefer verification.yaml over proof.yaml for Claude compat */
  preferVerificationYaml: z.boolean().default(true),
  /** Search all stages when stage is unknown */
  searchAllStages: z.boolean().default(true),
})
export type PathResolverConfig = z.infer<typeof PathResolverConfigSchema>

// ============================================================================
// Path Resolver Class
// ============================================================================

/**
 * Resolves file paths for YAML artifacts
 */
export class PathResolver {
  private config: PathResolverConfig
  private plansAbsolutePath: string

  constructor(config: Partial<PathResolverConfig> & { workspaceRoot: string }) {
    this.config = PathResolverConfigSchema.parse(config)
    this.plansAbsolutePath = path.join(this.config.workspaceRoot, this.config.plansRoot)
  }

  /**
   * Get the plans root directory (absolute path)
   */
  get plansRoot(): string {
    return this.plansAbsolutePath
  }

  /**
   * Get stage directory name from story state
   */
  getStageDirectory(state: string): string {
    return STATE_TO_STAGE_DIRECTORY[state.toLowerCase()] || state
  }

  /**
   * Get stage from directory name
   */
  getStageFromDirectory(directory: string): StoryStage | null {
    return DIRECTORY_TO_STAGE[directory.toLowerCase()] || null
  }

  /**
   * Get artifact filename
   */
  getArtifactFilename(artifactType: YamlArtifactType): string {
    return ARTIFACT_TYPE_TO_FILENAME[artifactType]
  }

  /**
   * Get artifact type from filename
   */
  getArtifactTypeFromFilename(filename: string): YamlArtifactType | null {
    return FILENAME_TO_ARTIFACT_TYPE[filename] || null
  }

  /**
   * Build the path to a story directory
   */
  getStoryDirectoryPath(feature: string, stage: string, storyId: string): string {
    const stageDir = this.getStageDirectory(stage)
    return path.join(this.plansAbsolutePath, feature, stageDir, storyId)
  }

  /**
   * Build the absolute path to an artifact
   */
  getArtifactPath(
    feature: string,
    stage: string,
    storyId: string,
    artifactType: YamlArtifactType,
  ): string {
    const storyDir = this.getStoryDirectoryPath(feature, stage, storyId)
    const filename = this.getArtifactFilename(artifactType)
    return path.join(storyDir, filename)
  }

  /**
   * Resolve full path information for an artifact
   */
  resolveArtifactPath(
    feature: string,
    stage: string,
    storyId: string,
    artifactType: YamlArtifactType,
  ): ResolvedPath {
    const stageDir = this.getStageDirectory(stage)
    const filename = this.getArtifactFilename(artifactType)
    const relativePath = path.join(feature, stageDir, storyId, filename)
    const absolutePath = path.join(this.plansAbsolutePath, relativePath)

    return {
      absolutePath,
      relativePath,
      feature,
      stageDirectory: stageDir,
      storyId,
      artifactType,
      filename,
    }
  }

  /**
   * Parse a path to extract artifact information
   */
  parsePath(filePath: string): ResolvedPath | null {
    // Normalize the path
    const normalizedPath = path.normalize(filePath)

    // Try to find the plans root in the path
    const plansRootIndex = normalizedPath.indexOf(this.config.plansRoot)
    if (plansRootIndex === -1) {
      return null
    }

    // Get the relative path from plans root
    const relativePath = normalizedPath.substring(
      plansRootIndex + this.config.plansRoot.length + 1,
    )
    const parts = relativePath.split(path.sep)

    // Expected format: feature/stage/storyId/filename.yaml
    if (parts.length < 4) {
      return null
    }

    const [feature, stageDirectory, storyId, filename] = parts
    const artifactType = this.getArtifactTypeFromFilename(filename)

    if (!artifactType) {
      return null
    }

    return {
      absolutePath: normalizedPath.startsWith('/') ? normalizedPath : path.join(this.config.workspaceRoot, normalizedPath),
      relativePath,
      feature,
      stageDirectory,
      storyId,
      artifactType,
      filename,
    }
  }

  /**
   * Get all stage directories to search
   */
  getAllStageDirectories(): string[] {
    return [
      'backlog',
      'elaboration',
      'ready-to-work',
      'in-progress',
      'ready-for-qa',
      'UAT',
      'completed',
      'deferred',
      'cancelled',
    ]
  }

  /**
   * Build search paths for a story when stage is unknown
   * Returns paths in priority order (most likely stages first)
   */
  getSearchPaths(
    feature: string,
    storyId: string,
    artifactType: YamlArtifactType,
  ): string[] {
    const stages = this.getAllStageDirectories()
    const filename = this.getArtifactFilename(artifactType)

    return stages.map(stage =>
      path.join(this.plansAbsolutePath, feature, stage, storyId, filename),
    )
  }

  /**
   * Get the proof/verification artifact path with preference handling
   */
  getProofOrVerificationPath(
    feature: string,
    stage: string,
    storyId: string,
  ): { primary: string; fallback: string } {
    const storyDir = this.getStoryDirectoryPath(feature, stage, storyId)

    if (this.config.preferVerificationYaml) {
      return {
        primary: path.join(storyDir, 'verification.yaml'),
        fallback: path.join(storyDir, 'proof.yaml'),
      }
    } else {
      return {
        primary: path.join(storyDir, 'proof.yaml'),
        fallback: path.join(storyDir, 'verification.yaml'),
      }
    }
  }

  /**
   * Extract feature name from story ID
   * e.g., 'WISH-2001' -> 'wish'
   */
  extractFeatureFromStoryId(storyId: string): string | null {
    const match = storyId.match(/^([A-Z]+)-\d+$/i)
    return match ? match[1].toLowerCase() : null
  }

  /**
   * List all artifact files in a story directory
   */
  getStoryArtifactPaths(feature: string, stage: string, storyId: string): ResolvedPath[] {
    const artifactTypes: YamlArtifactType[] = [
      'story',
      'elaboration',
      'plan',
      'verification',
      'context',
      'tokens',
    ]

    return artifactTypes.map(type => this.resolveArtifactPath(feature, stage, storyId, type))
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a path resolver with configuration
 */
export function createPathResolver(
  workspaceRoot: string,
  options: Partial<Omit<PathResolverConfig, 'workspaceRoot'>> = {},
): PathResolver {
  return new PathResolver({
    workspaceRoot,
    ...options,
  })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Infer feature directory from story ID prefix
 */
export function inferFeatureFromStoryId(storyId: string): string | null {
  const match = storyId.match(/^([A-Z]+)-\d+$/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * Validate story ID format
 */
export function isValidStoryId(storyId: string): boolean {
  return /^[A-Z]+-\d+$/i.test(storyId)
}

/**
 * Normalize stage name to standard form
 */
export function normalizeStage(stage: string): StoryStage | null {
  const lower = stage.toLowerCase()
  return DIRECTORY_TO_STAGE[lower] || null
}
