/**
 * ArtifactService
 *
 * High-level service for reading and writing workflow artifacts.
 * Wraps existing low-level persistence utilities with a clean, typed API.
 *
 * Features:
 * - Type-safe read/write methods for all artifact types
 * - Automatic stage detection
 * - Zod validation before write
 * - YAML-only and YAML+DB modes
 * - Atomic file writes
 *
 * Architecture: Simple class-based service pattern (factory + class)
 * NOT using Ports & Adapters pattern per AC-011
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { PathResolver } from '../persistence/path-resolver.js'
import { YamlArtifactReader } from '../persistence/yaml-artifact-reader.js'
import { YamlArtifactWriter } from '../persistence/yaml-artifact-writer.js'
import type { Plan } from '../artifacts/plan.js'
import type { Evidence } from '../artifacts/evidence.js'
import type { Scope } from '../artifacts/scope.js'
import type { Checkpoint } from '../artifacts/checkpoint.js'
import type { StoryArtifact } from '../artifacts/story.js'
import type { Review } from '../artifacts/review.js'
import type { QaVerify } from '../artifacts/qa-verify.js'
import type { AuditFindings } from '../artifacts/audit-findings.js'
import {
  PlanSchema,
  EvidenceSchema,
  ScopeSchema,
  CheckpointSchema,
  StoryArtifactSchema,
  ReviewSchema,
  QaVerifySchema,
  AuditFindingsSchema,
} from '../artifacts/index.js'
import {
  type ArtifactServiceConfig,
  ArtifactServiceConfigSchema,
  type ArtifactReadResult,
  type ArtifactWriteResult,
  STAGE_SEARCH_ORDER,
} from './__types__/index.js'

// ============================================================================
// ArtifactService Class
// ============================================================================

/**
 * Main service class for artifact operations
 *
 * Usage:
 * ```typescript
 * const service = createArtifactService({
 *   workspaceRoot: '/path/to/monorepo',
 *   featureDir: '/path/to/plans/future/platform',
 *   mode: 'yaml'
 * })
 *
 * const result = await service.readPlan('INFR-0020', 'in-progress')
 * if (result.success) {
 *   console.log(result.data)
 * }
 * ```
 */
export class ArtifactService {
  private readonly config: ArtifactServiceConfig
  private readonly pathResolver: PathResolver
  private readonly yamlReader: YamlArtifactReader
  private readonly yamlWriter: YamlArtifactWriter

  constructor(config: ArtifactServiceConfig) {
    this.config = config
    this.pathResolver = new PathResolver({ workspaceRoot: config.workspaceRoot })
    this.yamlReader = new YamlArtifactReader(this.pathResolver)
    this.yamlWriter = new YamlArtifactWriter(this.pathResolver)
  }

  // ==========================================================================
  // Stage Auto-Detection
  // ==========================================================================

  /**
   * Auto-detect the stage for a story by searching directories in order:
   * backlog → elaboration → ready-to-work → in-progress → ready-for-qa → UAT
   *
   * Returns the first stage directory where the story is found.
   */
  async autoDetectStage(storyId: string): Promise<string | null> {
    logger.debug('Auto-detecting stage', { storyId })

    for (const stage of STAGE_SEARCH_ORDER) {
      const storyPath = path.join(this.config.featureDir, stage, storyId)
      try {
        await fs.access(storyPath)
        logger.debug('Found story in stage', { storyId, stage })
        return stage
      } catch {
        // Directory doesn't exist, continue searching
      }
    }

    logger.warn('Story not found in any stage', { storyId })
    return null
  }

  /**
   * Resolve stage: use provided stage or auto-detect
   */
  private async resolveStage(
    storyId: string,
    stage?: string,
  ): Promise<{ success: true; stage: string } | { success: false; error: string }> {
    if (stage) {
      return { success: true, stage }
    }

    const detectedStage = await this.autoDetectStage(storyId)
    if (!detectedStage) {
      return {
        success: false,
        error: `Story ${storyId} not found in any stage (searched: ${STAGE_SEARCH_ORDER.join(', ')})`,
      }
    }

    return { success: true, stage: detectedStage }
  }

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * Read PLAN.yaml artifact
   */
  async readPlan(storyId: string, stage?: string): Promise<ArtifactReadResult<Plan>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'PLAN.yaml',
    )

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = PlanSchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read PLAN.yaml', { storyId, stage: stageResult.stage, error })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  /**
   * Read EVIDENCE.yaml artifact
   */
  async readEvidence(storyId: string, stage?: string): Promise<ArtifactReadResult<Evidence>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'EVIDENCE.yaml',
    )

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = EvidenceSchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read EVIDENCE.yaml', { storyId, stage: stageResult.stage, error })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  /**
   * Read SCOPE.yaml artifact
   */
  async readScope(storyId: string, stage?: string): Promise<ArtifactReadResult<Scope>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'SCOPE.yaml',
    )

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = ScopeSchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read SCOPE.yaml', { storyId, stage: stageResult.stage, error })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  /**
   * Read CHECKPOINT.yaml artifact
   */
  async readCheckpoint(storyId: string, stage?: string): Promise<ArtifactReadResult<Checkpoint>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'CHECKPOINT.yaml',
    )

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = CheckpointSchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read CHECKPOINT.yaml', { storyId, stage: stageResult.stage, error })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  /**
   * Read Story artifact (main story markdown file)
   */
  async readStory(storyId: string, stage?: string): Promise<ArtifactReadResult<StoryArtifact>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(this.config.featureDir, stageResult.stage, storyId, `${storyId}.md`)

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = StoryArtifactSchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read Story', { storyId, stage: stageResult.stage, error })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  /**
   * Read REVIEW.yaml artifact
   */
  async readReview(storyId: string, stage?: string): Promise<ArtifactReadResult<Review>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'REVIEW.yaml',
    )

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = ReviewSchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read REVIEW.yaml', { storyId, stage: stageResult.stage, error })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  /**
   * Read QA-VERIFY.yaml artifact
   */
  async readQaVerify(storyId: string, stage?: string): Promise<ArtifactReadResult<QaVerify>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'QA-VERIFY.yaml',
    )

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = QaVerifySchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read QA-VERIFY.yaml', { storyId, stage: stageResult.stage, error })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  /**
   * Read AUDIT-FINDINGS.yaml artifact
   */
  async readAuditFindings(
    storyId: string,
    stage?: string,
  ): Promise<ArtifactReadResult<AuditFindings>> {
    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'AUDIT-FINDINGS.yaml',
    )

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = AuditFindingsSchema.parse(yaml.parse(content))
      return {
        success: true,
        data: parsed,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to read AUDIT-FINDINGS.yaml', {
        storyId,
        stage: stageResult.stage,
        error,
      })
      return {
        success: false,
        error: 'READ_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }

  // ==========================================================================
  // Write Operations
  // ==========================================================================

  /**
   * Write PLAN.yaml artifact with validation
   */
  async writePlan(storyId: string, data: Plan, stage?: string): Promise<ArtifactWriteResult> {
    // Validate before writing
    try {
      PlanSchema.parse(data)
    } catch (error) {
      logger.error('PLAN.yaml validation failed', { storyId, error })
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof z.ZodError ? error.message : String(error),
        warnings: [],
      }
    }

    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'PLAN.yaml',
    )

    return this.atomicWrite(filePath, data)
  }

  /**
   * Write EVIDENCE.yaml artifact with validation
   */
  async writeEvidence(
    storyId: string,
    data: Evidence,
    stage?: string,
  ): Promise<ArtifactWriteResult> {
    // Validate before writing
    try {
      EvidenceSchema.parse(data)
    } catch (error) {
      logger.error('EVIDENCE.yaml validation failed', { storyId, error })
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof z.ZodError ? error.message : String(error),
        warnings: [],
      }
    }

    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'EVIDENCE.yaml',
    )

    return this.atomicWrite(filePath, data)
  }

  /**
   * Write SCOPE.yaml artifact with validation
   */
  async writeScope(storyId: string, data: Scope, stage?: string): Promise<ArtifactWriteResult> {
    // Validate before writing
    try {
      ScopeSchema.parse(data)
    } catch (error) {
      logger.error('SCOPE.yaml validation failed', { storyId, error })
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof z.ZodError ? error.message : String(error),
        warnings: [],
      }
    }

    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'SCOPE.yaml',
    )

    return this.atomicWrite(filePath, data)
  }

  /**
   * Write CHECKPOINT.yaml artifact with validation
   */
  async writeCheckpoint(
    storyId: string,
    data: Checkpoint,
    stage?: string,
  ): Promise<ArtifactWriteResult> {
    // Validate before writing
    try {
      CheckpointSchema.parse(data)
    } catch (error) {
      logger.error('CHECKPOINT.yaml validation failed', { storyId, error })
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof z.ZodError ? error.message : String(error),
        warnings: [],
      }
    }

    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'CHECKPOINT.yaml',
    )

    return this.atomicWrite(filePath, data)
  }

  /**
   * Write REVIEW.yaml artifact with validation
   */
  async writeReview(storyId: string, data: Review, stage?: string): Promise<ArtifactWriteResult> {
    // Validate before writing
    try {
      ReviewSchema.parse(data)
    } catch (error) {
      logger.error('REVIEW.yaml validation failed', { storyId, error })
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof z.ZodError ? error.message : String(error),
        warnings: [],
      }
    }

    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'REVIEW.yaml',
    )

    return this.atomicWrite(filePath, data)
  }

  /**
   * Write QA-VERIFY.yaml artifact with validation
   */
  async writeQaVerify(
    storyId: string,
    data: QaVerify,
    stage?: string,
  ): Promise<ArtifactWriteResult> {
    // Validate before writing
    try {
      QaVerifySchema.parse(data)
    } catch (error) {
      logger.error('QA-VERIFY.yaml validation failed', { storyId, error })
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof z.ZodError ? error.message : String(error),
        warnings: [],
      }
    }

    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'QA-VERIFY.yaml',
    )

    return this.atomicWrite(filePath, data)
  }

  /**
   * Write AUDIT-FINDINGS.yaml artifact with validation
   */
  async writeAuditFindings(
    storyId: string,
    data: AuditFindings,
    stage?: string,
  ): Promise<ArtifactWriteResult> {
    // Validate before writing
    try {
      AuditFindingsSchema.parse(data)
    } catch (error) {
      logger.error('AUDIT-FINDINGS.yaml validation failed', { storyId, error })
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error instanceof z.ZodError ? error.message : String(error),
        warnings: [],
      }
    }

    const stageResult = await this.resolveStage(storyId, stage)
    if (!stageResult.success) {
      return {
        success: false,
        error: stageResult.error,
        warnings: [],
      }
    }

    const filePath = path.join(
      this.config.featureDir,
      stageResult.stage,
      storyId,
      '_implementation',
      'AUDIT-FINDINGS.yaml',
    )

    return this.atomicWrite(filePath, data)
  }

  // ==========================================================================
  // Internal Helper Methods
  // ==========================================================================

  /**
   * Atomic write using temp file → rename pattern
   */
  private async atomicWrite(filePath: string, data: unknown): Promise<ArtifactWriteResult> {
    try {
      const dir = path.dirname(filePath)
      let created = false

      // Ensure directory exists
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
        created = true
      }

      // Write to temp file
      const tempPath = `${filePath}.tmp`
      await fs.writeFile(tempPath, yaml.stringify(data), 'utf-8')

      // Atomic rename
      await fs.rename(tempPath, filePath)

      logger.info('Artifact written successfully', { path: filePath, created })

      return {
        success: true,
        path: filePath,
        created,
        warnings: [],
      }
    } catch (error) {
      logger.error('Failed to write artifact', { path: filePath, error })
      return {
        success: false,
        error: 'WRITE_ERROR',
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an ArtifactService instance with validated configuration
 *
 * @param config - Service configuration (validated via Zod)
 * @returns Configured ArtifactService instance
 * @throws {z.ZodError} If configuration is invalid
 *
 * @example
 * ```typescript
 * const service = createArtifactService({
 *   workspaceRoot: '/path/to/monorepo',
 *   featureDir: '/path/to/plans/future/platform',
 *   mode: 'yaml'
 * })
 * ```
 */
export function createArtifactService(config: ArtifactServiceConfig): ArtifactService {
  const validatedConfig = ArtifactServiceConfigSchema.parse(config)
  return new ArtifactService(validatedConfig)
}

// Re-export types and schemas for external use
export { ArtifactServiceConfigSchema, STAGE_SEARCH_ORDER }
export type {
  ArtifactServiceConfig,
  ArtifactReadResult,
  ArtifactWriteResult,
  StageSearchOrder,
} from './__types__/index.js'
export { ArtifactReadResultSchema, ArtifactWriteResultSchema } from './__types__/index.js'
