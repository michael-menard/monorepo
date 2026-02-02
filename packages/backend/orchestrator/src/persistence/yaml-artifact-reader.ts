/**
 * YAML Artifact Reader
 *
 * Reads YAML artifacts from the filesystem and validates them against Zod schemas.
 * Handles surface type normalization (infra → infrastructure).
 *
 * Supports both Claude's YAML format and LangGraph's expected schema format.
 */

import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { logger } from '@repo/logger'
import { PathResolver, type YamlArtifactType, type ResolvedPath } from './path-resolver.js'
import {
  createSurfaceNormalizer,
  normalizeSurfaces,
  type SurfaceNormalizerConfig,
} from './surface-normalizer.js'
import { StoryArtifactSchema, type StoryArtifact } from '../artifacts/story.js'
import { PlanSchema, type Plan } from '../artifacts/plan.js'
import { EvidenceSchema, type Evidence } from '../artifacts/evidence.js'
import { ScopeSchema, type Scope } from '../artifacts/scope.js'

// ============================================================================
// Claude YAML Schemas (for reading existing files)
// ============================================================================

/**
 * Claude's story.yaml format - more permissive for reading
 */
export const ClaudeStoryYamlSchema = z.object({
  schema: z.number().default(1),
  id: z.string(),
  feature: z.string(),
  type: z.string(),
  state: z.string(),
  title: z.string(),
  points: z.number().nullable().optional(),
  priority: z.string().nullable().optional(),
  blocked_by: z.string().nullable().optional(),
  depends_on: z.array(z.string()).optional().default([]),
  follow_up_from: z.string().nullable().optional(),
  scope: z.object({
    packages: z.array(z.string()).optional().default([]),
    surfaces: z.array(z.string()).optional().default([]),
  }),
  goal: z.string(),
  non_goals: z.array(z.string()).optional().default([]),
  acs: z.array(z.object({
    id: z.string(),
    description: z.string(),
    testable: z.boolean().optional().default(true),
    automated: z.boolean().optional().default(false),
  })).optional().default([]),
  risks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    severity: z.string(),
    mitigation: z.string().nullable().optional(),
  })).optional().default([]),
  created_at: z.string(),
  updated_at: z.string(),
})
export type ClaudeStoryYaml = z.infer<typeof ClaudeStoryYamlSchema>

/**
 * Claude's elaboration.yaml format
 */
export const ClaudeElaborationYamlSchema = z.object({
  schema: z.number().default(1),
  story_id: z.string(),
  date: z.string().optional(),
  verdict: z.string().optional(),
  audit: z.record(z.object({
    status: z.string(),
    note: z.string().optional(),
  })).optional(),
  gaps: z.array(z.object({
    id: z.string(),
    category: z.string(),
    severity: z.string(),
    finding: z.string(),
    recommendation: z.string().optional(),
  })).optional().default([]),
  split_required: z.boolean().optional(),
  follow_ups: z.array(z.object({
    finding: z.string(),
    story_id: z.string().nullable().optional(),
  })).optional().default([]),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
  }).optional(),
})
export type ClaudeElaborationYaml = z.infer<typeof ClaudeElaborationYamlSchema>

/**
 * Claude's plan.yaml format
 */
export const ClaudePlanYamlSchema = z.object({
  schema: z.number().default(1),
  story_id: z.string(),
  version: z.number().optional().default(1),
  approved: z.boolean().optional().default(false),
  estimates: z.object({
    files: z.number().optional().default(0),
    tokens: z.number().optional().default(0),
  }).optional(),
  chunks: z.array(z.object({
    id: z.number().optional(),
    description: z.string().optional(),
    files: z.array(z.string()).optional(),
    slice: z.string().optional(),
  })).optional().default([]),
  reuse: z.array(z.object({
    source: z.string().optional(),
    pattern: z.string().optional(),
  })).optional().default([]),
})
export type ClaudePlanYaml = z.infer<typeof ClaudePlanYamlSchema>

/**
 * Claude's verification.yaml format
 */
export const ClaudeVerificationYamlSchema = z.object({
  schema: z.number().default(1),
  story_id: z.string(),
  updated: z.string().optional(),
  code_review: z.object({
    verdict: z.string(),
    iterations: z.number().optional(),
    final_issues: z.object({
      errors: z.number(),
      warnings: z.number(),
      note: z.string().optional(),
    }).optional(),
  }).optional(),
  tests: z.object({
    unit: z.object({
      pass: z.number().optional().default(0),
      fail: z.number().optional().default(0),
    }).optional(),
    integration: z.object({
      passed: z.number().optional().default(0),
      failed: z.number().optional().default(0),
    }).optional(),
    e2e: z.object({
      passed: z.number().optional().default(0),
      failed: z.number().optional().default(0),
    }).optional(),
  }).optional(),
  acs: z.array(z.object({
    id: z.string(),
    verdict: z.string(),
    evidence: z.string().optional(),
  })).optional().default([]),
  qa: z.object({
    verdict: z.string(),
    verified_by: z.string().optional(),
    verified_at: z.string().optional(),
    blocking_issues: z.array(z.string()).optional().default([]),
  }).optional(),
})
export type ClaudeVerificationYaml = z.infer<typeof ClaudeVerificationYamlSchema>

/**
 * Claude's context.yaml format
 */
export const ClaudeContextYamlSchema = z.object({
  schema: z.number().default(1),
  story_id: z.string(),
  timestamp: z.string().optional(),
  loaded: z.boolean().optional().default(false),
  lessons: z.array(z.unknown()).optional().default([]),
  adrs: z.array(z.unknown()).optional().default([]),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
  }).optional(),
})
export type ClaudeContextYaml = z.infer<typeof ClaudeContextYamlSchema>

// ============================================================================
// Read Result Types
// ============================================================================

/**
 * Result of reading a YAML artifact
 */
export interface YamlReadResult<T> {
  success: boolean
  data: T | null
  raw: unknown
  path: ResolvedPath
  error: string | null
  warnings: string[]
}

/**
 * Combined read result for all story artifacts
 */
export interface StoryArtifactsReadResult {
  storyId: string
  feature: string
  stage: string
  story: YamlReadResult<ClaudeStoryYaml> | null
  elaboration: YamlReadResult<ClaudeElaborationYaml> | null
  plan: YamlReadResult<ClaudePlanYaml> | null
  verification: YamlReadResult<ClaudeVerificationYaml> | null
  context: YamlReadResult<ClaudeContextYaml> | null
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * YAML Reader configuration
 */
export const YamlReaderConfigSchema = z.object({
  /** Normalize surface types on read */
  normalizeSurfaces: z.boolean().default(true),
  /** Continue reading if one artifact fails */
  continueOnError: z.boolean().default(true),
  /** Validate against strict schema */
  strictValidation: z.boolean().default(false),
  /** Surface normalizer config */
  surfaceNormalizer: z.object({
    normalizeOnRead: z.boolean().default(true),
    denormalizeOnWrite: z.boolean().default(true),
    strictMode: z.boolean().default(false),
  }).optional(),
})
export type YamlReaderConfig = z.infer<typeof YamlReaderConfigSchema>

// ============================================================================
// YAML Artifact Reader Class
// ============================================================================

/**
 * Reads and validates YAML artifacts
 */
export class YamlArtifactReader {
  private pathResolver: PathResolver
  private config: YamlReaderConfig
  private surfaceNormalizer: ReturnType<typeof createSurfaceNormalizer>

  constructor(
    pathResolver: PathResolver,
    config: Partial<YamlReaderConfig> = {},
  ) {
    this.pathResolver = pathResolver
    this.config = YamlReaderConfigSchema.parse(config)
    this.surfaceNormalizer = createSurfaceNormalizer(this.config.surfaceNormalizer)
  }

  /**
   * Read and parse a YAML file
   */
  private async readYamlFile(filePath: string): Promise<{
    success: boolean
    data: unknown
    error: string | null
  }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const data = yaml.parse(content)
      return { success: true, data, error: null }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { success: false, data: null, error: 'File not found' }
      }
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Read a story.yaml file
   */
  async readStory(
    feature: string,
    stage: string,
    storyId: string,
  ): Promise<YamlReadResult<ClaudeStoryYaml>> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'story')
    const warnings: string[] = []

    const { success, data, error } = await this.readYamlFile(resolvedPath.absolutePath)

    if (!success) {
      return {
        success: false,
        data: null,
        raw: null,
        path: resolvedPath,
        error,
        warnings,
      }
    }

    try {
      const parsed = ClaudeStoryYamlSchema.parse(data)

      // Normalize surfaces if configured
      if (this.config.normalizeSurfaces && parsed.scope?.surfaces) {
        const normalized = this.surfaceNormalizer.normalizeSurfaces(parsed.scope.surfaces)
        if (normalized.some((s, i) => s !== parsed.scope.surfaces[i])) {
          warnings.push('Surface types were normalized (infra → infrastructure)')
        }
        parsed.scope.surfaces = normalized
      }

      return {
        success: true,
        data: parsed,
        raw: data,
        path: resolvedPath,
        error: null,
        warnings,
      }
    } catch (validationError) {
      return {
        success: false,
        data: null,
        raw: data,
        path: resolvedPath,
        error: validationError instanceof Error ? validationError.message : 'Validation failed',
        warnings,
      }
    }
  }

  /**
   * Read an elaboration.yaml file
   */
  async readElaboration(
    feature: string,
    stage: string,
    storyId: string,
  ): Promise<YamlReadResult<ClaudeElaborationYaml>> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'elaboration')
    const warnings: string[] = []

    const { success, data, error } = await this.readYamlFile(resolvedPath.absolutePath)

    if (!success) {
      return {
        success: false,
        data: null,
        raw: null,
        path: resolvedPath,
        error,
        warnings,
      }
    }

    try {
      const parsed = ClaudeElaborationYamlSchema.parse(data)
      return {
        success: true,
        data: parsed,
        raw: data,
        path: resolvedPath,
        error: null,
        warnings,
      }
    } catch (validationError) {
      return {
        success: false,
        data: null,
        raw: data,
        path: resolvedPath,
        error: validationError instanceof Error ? validationError.message : 'Validation failed',
        warnings,
      }
    }
  }

  /**
   * Read a plan.yaml file
   */
  async readPlan(
    feature: string,
    stage: string,
    storyId: string,
  ): Promise<YamlReadResult<ClaudePlanYaml>> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'plan')
    const warnings: string[] = []

    const { success, data, error } = await this.readYamlFile(resolvedPath.absolutePath)

    if (!success) {
      return {
        success: false,
        data: null,
        raw: null,
        path: resolvedPath,
        error,
        warnings,
      }
    }

    try {
      const parsed = ClaudePlanYamlSchema.parse(data)

      // Normalize slices if present
      if (this.config.normalizeSurfaces && parsed.chunks) {
        for (const chunk of parsed.chunks) {
          if (chunk.slice === 'infra') {
            chunk.slice = 'infrastructure'
            warnings.push('Plan slice normalized (infra → infrastructure)')
          }
        }
      }

      return {
        success: true,
        data: parsed,
        raw: data,
        path: resolvedPath,
        error: null,
        warnings,
      }
    } catch (validationError) {
      return {
        success: false,
        data: null,
        raw: data,
        path: resolvedPath,
        error: validationError instanceof Error ? validationError.message : 'Validation failed',
        warnings,
      }
    }
  }

  /**
   * Read a verification.yaml file (with fallback to proof.yaml)
   */
  async readVerification(
    feature: string,
    stage: string,
    storyId: string,
  ): Promise<YamlReadResult<ClaudeVerificationYaml>> {
    const { primary, fallback } = this.pathResolver.getProofOrVerificationPath(feature, stage, storyId)
    const warnings: string[] = []

    // Try primary first
    let resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'verification')
    let { success, data, error } = await this.readYamlFile(primary)

    // Fallback to alternate file
    if (!success && error === 'File not found') {
      resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'proof')
      const fallbackResult = await this.readYamlFile(fallback)
      success = fallbackResult.success
      data = fallbackResult.data
      error = fallbackResult.error

      if (success) {
        warnings.push(`Using fallback file: ${path.basename(fallback)}`)
      }
    }

    if (!success) {
      return {
        success: false,
        data: null,
        raw: null,
        path: resolvedPath,
        error,
        warnings,
      }
    }

    try {
      const parsed = ClaudeVerificationYamlSchema.parse(data)
      return {
        success: true,
        data: parsed,
        raw: data,
        path: resolvedPath,
        error: null,
        warnings,
      }
    } catch (validationError) {
      return {
        success: false,
        data: null,
        raw: data,
        path: resolvedPath,
        error: validationError instanceof Error ? validationError.message : 'Validation failed',
        warnings,
      }
    }
  }

  /**
   * Read a context.yaml file
   */
  async readContext(
    feature: string,
    stage: string,
    storyId: string,
  ): Promise<YamlReadResult<ClaudeContextYaml>> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'context')
    const warnings: string[] = []

    const { success, data, error } = await this.readYamlFile(resolvedPath.absolutePath)

    if (!success) {
      return {
        success: false,
        data: null,
        raw: null,
        path: resolvedPath,
        error,
        warnings,
      }
    }

    try {
      const parsed = ClaudeContextYamlSchema.parse(data)
      return {
        success: true,
        data: parsed,
        raw: data,
        path: resolvedPath,
        error: null,
        warnings,
      }
    } catch (validationError) {
      return {
        success: false,
        data: null,
        raw: data,
        path: resolvedPath,
        error: validationError instanceof Error ? validationError.message : 'Validation failed',
        warnings,
      }
    }
  }

  /**
   * Read all artifacts for a story
   */
  async readAllArtifacts(
    feature: string,
    stage: string,
    storyId: string,
  ): Promise<StoryArtifactsReadResult> {
    const [story, elaboration, plan, verification, context] = await Promise.all([
      this.readStory(feature, stage, storyId),
      this.readElaboration(feature, stage, storyId),
      this.readPlan(feature, stage, storyId),
      this.readVerification(feature, stage, storyId),
      this.readContext(feature, stage, storyId),
    ])

    return {
      storyId,
      feature,
      stage,
      story,
      elaboration,
      plan,
      verification,
      context,
    }
  }

  /**
   * Find and read a story when the stage is unknown
   * Searches through all stage directories
   */
  async findAndReadStory(
    feature: string,
    storyId: string,
  ): Promise<YamlReadResult<ClaudeStoryYaml> | null> {
    const stages = this.pathResolver.getAllStageDirectories()

    for (const stage of stages) {
      const result = await this.readStory(feature, stage, storyId)
      if (result.success) {
        return result
      }
    }

    return null
  }

  /**
   * Check if an artifact file exists
   */
  async artifactExists(
    feature: string,
    stage: string,
    storyId: string,
    artifactType: YamlArtifactType,
  ): Promise<boolean> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, artifactType)
    try {
      await fs.access(resolvedPath.absolutePath)
      return true
    } catch {
      return false
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a YAML artifact reader
 */
export function createYamlArtifactReader(
  pathResolver: PathResolver,
  config: Partial<YamlReaderConfig> = {},
): YamlArtifactReader {
  return new YamlArtifactReader(pathResolver, config)
}
