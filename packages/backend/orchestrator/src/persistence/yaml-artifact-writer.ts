/**
 * YAML Artifact Writer
 *
 * Writes YAML artifacts to the filesystem with atomic operations.
 * Handles surface type denormalization (infrastructure → infra).
 *
 * Features:
 * - Atomic writes (temp file → rename)
 * - Directory creation if missing
 * - Surface type denormalization for Claude compatibility
 * - Preserves comments and formatting where possible
 */

import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import * as os from 'os'
import { logger } from '@repo/logger'
import { PathResolver, type YamlArtifactType, type ResolvedPath } from './path-resolver.js'
import {
  createSurfaceNormalizer,
  denormalizeSurfaces,
  denormalizePlanSlice,
  type SurfaceNormalizerConfig,
  type NormalizedSurfaceType,
  type NormalizedPlanSlice,
} from './surface-normalizer.js'
import type {
  ClaudeStoryYaml,
  ClaudeElaborationYaml,
  ClaudePlanYaml,
  ClaudeVerificationYaml,
  ClaudeContextYaml,
} from './yaml-artifact-reader.js'

// ============================================================================
// Write Result Types
// ============================================================================

/**
 * Result of writing a YAML artifact
 */
export interface YamlWriteResult {
  success: boolean
  path: ResolvedPath
  error: string | null
  created: boolean // True if directory was created
  warnings: string[]
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * YAML Writer configuration
 */
export const YamlWriterConfigSchema = z.object({
  /** Denormalize surface types on write (infrastructure → infra) */
  denormalizeSurfaces: z.boolean().default(true),
  /** Create directories if they don't exist */
  createDirectories: z.boolean().default(true),
  /** Use atomic writes (temp file → rename) */
  atomicWrites: z.boolean().default(true),
  /** Pretty print YAML (vs compact) */
  prettyPrint: z.boolean().default(true),
  /** Indent size for YAML output */
  indent: z.number().default(2),
  /** Line width for YAML output */
  lineWidth: z.number().default(120),
  /** Create backup of existing file before overwriting */
  createBackup: z.boolean().default(false),
  /** Backup file extension */
  backupExtension: z.string().default('.bak'),
  /** Surface normalizer config */
  surfaceNormalizer: z.object({
    normalizeOnRead: z.boolean().default(true),
    denormalizeOnWrite: z.boolean().default(true),
    strictMode: z.boolean().default(false),
  }).optional(),
})
export type YamlWriterConfig = z.infer<typeof YamlWriterConfigSchema>

// ============================================================================
// YAML Artifact Writer Class
// ============================================================================

/**
 * Writes YAML artifacts with atomic operations
 */
export class YamlArtifactWriter {
  private pathResolver: PathResolver
  private config: YamlWriterConfig
  private surfaceNormalizer: ReturnType<typeof createSurfaceNormalizer>

  constructor(
    pathResolver: PathResolver,
    config: Partial<YamlWriterConfig> = {},
  ) {
    this.pathResolver = pathResolver
    this.config = YamlWriterConfigSchema.parse(config)
    this.surfaceNormalizer = createSurfaceNormalizer(this.config.surfaceNormalizer)
  }

  /**
   * Generate a temporary file path for atomic writes
   */
  private getTempFilePath(targetPath: string): string {
    const dir = path.dirname(targetPath)
    const ext = path.extname(targetPath)
    const base = path.basename(targetPath, ext)
    const randomSuffix = Math.random().toString(36).substring(2, 10)
    return path.join(dir, `.${base}.${randomSuffix}.tmp${ext}`)
  }

  /**
   * Generate a backup file path
   */
  private getBackupFilePath(targetPath: string): string {
    return `${targetPath}${this.config.backupExtension}`
  }

  /**
   * Serialize data to YAML string
   */
  private toYamlString(data: unknown): string {
    const doc = new yaml.Document(data)

    return doc.toString({
      indent: this.config.indent,
      lineWidth: this.config.lineWidth,
      minContentWidth: 0,
    })
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
      return true
    } catch (error) {
      // Directory might already exist
      try {
        const stat = await fs.stat(dirPath)
        return stat.isDirectory()
      } catch {
        return false
      }
    }
  }

  /**
   * Write data to file atomically
   */
  private async atomicWrite(
    targetPath: string,
    content: string,
    createBackup: boolean,
  ): Promise<{ success: boolean; error: string | null; created: boolean }> {
    const dir = path.dirname(targetPath)
    let created = false

    try {
      // Ensure directory exists
      if (this.config.createDirectories) {
        try {
          await fs.access(dir)
        } catch {
          await fs.mkdir(dir, { recursive: true })
          created = true
        }
      }

      // Check if file exists for backup
      let fileExists = false
      try {
        await fs.access(targetPath)
        fileExists = true
      } catch {
        fileExists = false
      }

      // Create backup if configured and file exists
      if (createBackup && fileExists) {
        const backupPath = this.getBackupFilePath(targetPath)
        await fs.copyFile(targetPath, backupPath)
      }

      if (this.config.atomicWrites) {
        // Write to temp file first
        const tempPath = this.getTempFilePath(targetPath)
        await fs.writeFile(tempPath, content, 'utf-8')

        // Atomic rename
        await fs.rename(tempPath, targetPath)
      } else {
        // Direct write
        await fs.writeFile(targetPath, content, 'utf-8')
      }

      return { success: true, error: null, created }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown write error',
        created,
      }
    }
  }

  /**
   * Write a story.yaml file
   */
  async writeStory(
    feature: string,
    stage: string,
    storyId: string,
    data: ClaudeStoryYaml,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'story')
    const warnings: string[] = []

    // Create a copy to avoid mutating the input
    const writeData = JSON.parse(JSON.stringify(data)) as ClaudeStoryYaml

    // Denormalize surfaces if configured
    if (this.config.denormalizeSurfaces && writeData.scope?.surfaces) {
      const denormalized = this.surfaceNormalizer.denormalizeSurfaces(
        writeData.scope.surfaces as NormalizedSurfaceType[],
      )
      if (denormalized.some((s, i) => s !== writeData.scope.surfaces[i])) {
        warnings.push('Surface types denormalized (infrastructure → infra)')
      }
      writeData.scope.surfaces = denormalized
    }

    const yamlContent = this.toYamlString(writeData)
    const result = await this.atomicWrite(
      resolvedPath.absolutePath,
      yamlContent,
      this.config.createBackup,
    )

    return {
      success: result.success,
      path: resolvedPath,
      error: result.error,
      created: result.created,
      warnings,
    }
  }

  /**
   * Write an elaboration.yaml file
   */
  async writeElaboration(
    feature: string,
    stage: string,
    storyId: string,
    data: ClaudeElaborationYaml,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'elaboration')
    const warnings: string[] = []

    const yamlContent = this.toYamlString(data)
    const result = await this.atomicWrite(
      resolvedPath.absolutePath,
      yamlContent,
      this.config.createBackup,
    )

    return {
      success: result.success,
      path: resolvedPath,
      error: result.error,
      created: result.created,
      warnings,
    }
  }

  /**
   * Write a plan.yaml file
   */
  async writePlan(
    feature: string,
    stage: string,
    storyId: string,
    data: ClaudePlanYaml,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'plan')
    const warnings: string[] = []

    // Create a copy to avoid mutating the input
    const writeData = JSON.parse(JSON.stringify(data)) as ClaudePlanYaml

    // Denormalize plan slices if configured
    if (this.config.denormalizeSurfaces && writeData.chunks) {
      for (const chunk of writeData.chunks) {
        if (chunk.slice === 'infrastructure') {
          chunk.slice = 'infra'
          warnings.push('Plan slice denormalized (infrastructure → infra)')
        }
      }
    }

    const yamlContent = this.toYamlString(writeData)
    const result = await this.atomicWrite(
      resolvedPath.absolutePath,
      yamlContent,
      this.config.createBackup,
    )

    return {
      success: result.success,
      path: resolvedPath,
      error: result.error,
      created: result.created,
      warnings,
    }
  }

  /**
   * Write a verification.yaml file
   */
  async writeVerification(
    feature: string,
    stage: string,
    storyId: string,
    data: ClaudeVerificationYaml,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'verification')
    const warnings: string[] = []

    const yamlContent = this.toYamlString(data)
    const result = await this.atomicWrite(
      resolvedPath.absolutePath,
      yamlContent,
      this.config.createBackup,
    )

    return {
      success: result.success,
      path: resolvedPath,
      error: result.error,
      created: result.created,
      warnings,
    }
  }

  /**
   * Write a proof.yaml file (LangGraph naming convention)
   */
  async writeProof(
    feature: string,
    stage: string,
    storyId: string,
    data: unknown,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'proof')
    const warnings: string[] = []

    const yamlContent = this.toYamlString(data)
    const result = await this.atomicWrite(
      resolvedPath.absolutePath,
      yamlContent,
      this.config.createBackup,
    )

    return {
      success: result.success,
      path: resolvedPath,
      error: result.error,
      created: result.created,
      warnings,
    }
  }

  /**
   * Write a context.yaml file
   */
  async writeContext(
    feature: string,
    stage: string,
    storyId: string,
    data: ClaudeContextYaml,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, 'context')
    const warnings: string[] = []

    const yamlContent = this.toYamlString(data)
    const result = await this.atomicWrite(
      resolvedPath.absolutePath,
      yamlContent,
      this.config.createBackup,
    )

    return {
      success: result.success,
      path: resolvedPath,
      error: result.error,
      created: result.created,
      warnings,
    }
  }

  /**
   * Write a generic YAML artifact
   */
  async writeArtifact(
    feature: string,
    stage: string,
    storyId: string,
    artifactType: YamlArtifactType,
    data: unknown,
  ): Promise<YamlWriteResult> {
    switch (artifactType) {
      case 'story':
        return this.writeStory(feature, stage, storyId, data as ClaudeStoryYaml)
      case 'elaboration':
        return this.writeElaboration(feature, stage, storyId, data as ClaudeElaborationYaml)
      case 'plan':
        return this.writePlan(feature, stage, storyId, data as ClaudePlanYaml)
      case 'verification':
        return this.writeVerification(feature, stage, storyId, data as ClaudeVerificationYaml)
      case 'proof':
        return this.writeProof(feature, stage, storyId, data)
      case 'context':
        return this.writeContext(feature, stage, storyId, data as ClaudeContextYaml)
      case 'tokens':
        return this.writeGenericYaml(feature, stage, storyId, 'tokens', data)
      default:
        return {
          success: false,
          path: this.pathResolver.resolveArtifactPath(feature, stage, storyId, artifactType),
          error: `Unknown artifact type: ${artifactType}`,
          created: false,
          warnings: [],
        }
    }
  }

  /**
   * Write a generic YAML file without specific schema handling
   */
  private async writeGenericYaml(
    feature: string,
    stage: string,
    storyId: string,
    artifactType: YamlArtifactType,
    data: unknown,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, artifactType)
    const warnings: string[] = []

    const yamlContent = this.toYamlString(data)
    const result = await this.atomicWrite(
      resolvedPath.absolutePath,
      yamlContent,
      this.config.createBackup,
    )

    return {
      success: result.success,
      path: resolvedPath,
      error: result.error,
      created: result.created,
      warnings,
    }
  }

  /**
   * Delete an artifact file
   */
  async deleteArtifact(
    feature: string,
    stage: string,
    storyId: string,
    artifactType: YamlArtifactType,
  ): Promise<YamlWriteResult> {
    const resolvedPath = this.pathResolver.resolveArtifactPath(feature, stage, storyId, artifactType)

    try {
      // Create backup if configured
      if (this.config.createBackup) {
        try {
          const backupPath = this.getBackupFilePath(resolvedPath.absolutePath)
          await fs.copyFile(resolvedPath.absolutePath, backupPath)
        } catch {
          // File might not exist, that's OK
        }
      }

      await fs.unlink(resolvedPath.absolutePath)
      return {
        success: true,
        path: resolvedPath,
        error: null,
        created: false,
        warnings: [],
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: true,
          path: resolvedPath,
          error: null,
          created: false,
          warnings: ['File did not exist'],
        }
      }
      return {
        success: false,
        path: resolvedPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        created: false,
        warnings: [],
      }
    }
  }

  /**
   * Move a story to a different stage directory
   */
  async moveStoryToStage(
    feature: string,
    fromStage: string,
    toStage: string,
    storyId: string,
  ): Promise<{
    success: boolean
    movedFiles: string[]
    error: string | null
  }> {
    const artifactTypes: YamlArtifactType[] = [
      'story',
      'elaboration',
      'plan',
      'verification',
      'context',
      'tokens',
    ]

    const movedFiles: string[] = []
    const errors: string[] = []

    // Ensure target directory exists
    const targetDir = this.pathResolver.getStoryDirectoryPath(feature, toStage, storyId)
    await this.ensureDirectory(targetDir)

    for (const artifactType of artifactTypes) {
      const sourcePath = this.pathResolver.getArtifactPath(feature, fromStage, storyId, artifactType)
      const targetPath = this.pathResolver.getArtifactPath(feature, toStage, storyId, artifactType)

      try {
        await fs.access(sourcePath)
        await fs.rename(sourcePath, targetPath)
        movedFiles.push(artifactType)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          errors.push(`Failed to move ${artifactType}: ${(error as Error).message}`)
        }
      }
    }

    // Try to remove the source directory if empty
    try {
      const sourceDir = this.pathResolver.getStoryDirectoryPath(feature, fromStage, storyId)
      await fs.rmdir(sourceDir)
    } catch {
      // Directory might not be empty or might have other files
    }

    return {
      success: errors.length === 0,
      movedFiles,
      error: errors.length > 0 ? errors.join('; ') : null,
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a YAML artifact writer
 */
export function createYamlArtifactWriter(
  pathResolver: PathResolver,
  config: Partial<YamlWriterConfig> = {},
): YamlArtifactWriter {
  return new YamlArtifactWriter(pathResolver, config)
}
