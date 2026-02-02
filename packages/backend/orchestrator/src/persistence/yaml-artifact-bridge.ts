/**
 * YAML Artifact Bridge
 *
 * Bidirectional sync orchestrator between Claude's filesystem-based YAML artifacts
 * and LangGraph's PostgreSQL-based persistence.
 *
 * Sync Directions:
 * - yaml-to-db: Read YAML files, sync to database
 * - db-to-yaml: Read database, sync to YAML files
 * - bidirectional: Sync both ways with conflict resolution
 *
 * Conflict Strategies:
 * - yaml-wins: YAML files take precedence
 * - db-wins: Database takes precedence
 * - newest-wins: Most recently updated version wins
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { PathResolver, createPathResolver, inferFeatureFromStoryId } from './path-resolver.js'
import {
  YamlArtifactReader,
  createYamlArtifactReader,
  type YamlReaderConfig,
  type StoryArtifactsReadResult,
  type ClaudeStoryYaml,
  type ClaudeElaborationYaml,
  type ClaudePlanYaml,
  type ClaudeVerificationYaml,
} from './yaml-artifact-reader.js'
import {
  YamlArtifactWriter,
  createYamlArtifactWriter,
  type YamlWriterConfig,
  type YamlWriteResult,
} from './yaml-artifact-writer.js'
import { normalizeSurfaces, denormalizeSurfaces, type NormalizedSurfaceType } from './surface-normalizer.js'
import type { StoryArtifact, SurfaceType } from '../artifacts/story.js'
import type { Plan } from '../artifacts/plan.js'
import type { Evidence } from '../artifacts/evidence.js'
import type { StoryRepository } from '../db/story-repository.js'
import type { WorkflowRepository } from '../db/workflow-repository.js'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Sync direction options
 */
export const SyncDirectionSchema = z.enum([
  'yaml-to-db', // Read YAML, write to DB
  'db-to-yaml', // Read DB, write to YAML
  'bidirectional', // Sync both ways
])
export type SyncDirection = z.infer<typeof SyncDirectionSchema>

/**
 * Conflict resolution strategy
 */
export const ConflictStrategySchema = z.enum([
  'yaml-wins', // YAML files take precedence
  'db-wins', // Database takes precedence
  'newest-wins', // Most recent update wins
])
export type ConflictStrategy = z.infer<typeof ConflictStrategySchema>

/**
 * Bridge configuration
 */
export const YamlArtifactBridgeConfigSchema = z.object({
  /** Workspace root directory */
  workspaceRoot: z.string(),
  /** Plans root directory (relative to workspace) */
  plansRoot: z.string().default('plans/future'),
  /** Default sync direction */
  syncDirection: SyncDirectionSchema.default('yaml-to-db'),
  /** Conflict resolution strategy */
  conflictStrategy: ConflictStrategySchema.default('yaml-wins'),
  /** Enable YAML write-through (write to DB also writes to YAML) */
  enableWriteThrough: z.boolean().default(false),
  /** Enable YAML fallback (if DB read fails, try YAML) */
  enableYamlFallback: z.boolean().default(true),
  /** Actor name for database operations */
  dbActor: z.string().default('yaml-bridge'),
  /** Reader configuration */
  reader: z.custom<Partial<YamlReaderConfig>>().optional(),
  /** Writer configuration */
  writer: z.custom<Partial<YamlWriterConfig>>().optional(),
})
export type YamlArtifactBridgeConfig = z.infer<typeof YamlArtifactBridgeConfigSchema>

// ============================================================================
// Sync Result Types
// ============================================================================

/**
 * Result of syncing a single artifact
 */
export interface ArtifactSyncResult {
  artifactType: string
  success: boolean
  direction: 'yaml-to-db' | 'db-to-yaml' | 'skip'
  source: 'yaml' | 'db' | 'none'
  error: string | null
  warnings: string[]
}

/**
 * Result of syncing all artifacts for a story
 */
export interface StorySyncResult {
  storyId: string
  feature: string
  stage: string | null
  success: boolean
  artifacts: ArtifactSyncResult[]
  error: string | null
  warnings: string[]
}

/**
 * Combined load result from bridge
 */
export interface BridgeLoadResult {
  loaded: boolean
  source: 'db' | 'yaml' | 'none'
  storyId: string
  story: ClaudeStoryYaml | null
  elaboration: ClaudeElaborationYaml | null
  plan: ClaudePlanYaml | null
  verification: ClaudeVerificationYaml | null
  error: string | null
  warnings: string[]
}

// ============================================================================
// YAML Artifact Bridge Class
// ============================================================================

/**
 * Orchestrates bidirectional sync between YAML files and database
 */
export class YamlArtifactBridge {
  private config: YamlArtifactBridgeConfig
  private pathResolver: PathResolver
  private reader: YamlArtifactReader
  private writer: YamlArtifactWriter
  private storyRepo: StoryRepository | null
  private workflowRepo: WorkflowRepository | null

  constructor(
    config: Partial<YamlArtifactBridgeConfig> & { workspaceRoot: string },
    storyRepo: StoryRepository | null = null,
    workflowRepo: WorkflowRepository | null = null,
  ) {
    this.config = YamlArtifactBridgeConfigSchema.parse(config)
    this.pathResolver = createPathResolver(this.config.workspaceRoot, {
      plansRoot: this.config.plansRoot,
    })
    this.reader = createYamlArtifactReader(this.pathResolver, this.config.reader)
    this.writer = createYamlArtifactWriter(this.pathResolver, this.config.writer)
    this.storyRepo = storyRepo
    this.workflowRepo = workflowRepo
  }

  /**
   * Get the path resolver
   */
  get paths(): PathResolver {
    return this.pathResolver
  }

  /**
   * Get the YAML reader
   */
  get yamlReader(): YamlArtifactReader {
    return this.reader
  }

  /**
   * Get the YAML writer
   */
  get yamlWriter(): YamlArtifactWriter {
    return this.writer
  }

  // ==========================================================================
  // Load Operations
  // ==========================================================================

  /**
   * Load story artifacts with fallback support
   *
   * First tries database (if repositories provided), then falls back to YAML
   * if configured.
   */
  async loadStory(
    storyId: string,
    feature?: string,
    stage?: string,
  ): Promise<BridgeLoadResult> {
    const warnings: string[] = []

    // Infer feature from story ID if not provided
    const resolvedFeature = feature || inferFeatureFromStoryId(storyId)
    if (!resolvedFeature) {
      return {
        loaded: false,
        source: 'none',
        storyId,
        story: null,
        elaboration: null,
        plan: null,
        verification: null,
        error: `Cannot infer feature from story ID: ${storyId}`,
        warnings,
      }
    }

    // Try database first if available
    if (this.storyRepo) {
      try {
        const dbStory = await this.storyRepo.getStory(storyId)
        if (dbStory) {
          logger.debug('Loaded story from database', { storyId })

          // Load workflow artifacts from DB if available
          let elaboration: unknown = null
          let plan: unknown = null
          let verification: unknown = null

          if (this.workflowRepo) {
            const [elabRecord, planRecord, verifyRecord] = await Promise.all([
              this.workflowRepo.getLatestElaboration(storyId).catch(() => null),
              this.workflowRepo.getLatestPlan(storyId).catch(() => null),
              this.workflowRepo.getLatestVerification(storyId, 'qa_verify').catch(() => null),
            ])
            elaboration = elabRecord?.content ?? null
            plan = planRecord?.content ?? null
            verification = verifyRecord?.content ?? null
          }

          // Convert DB story to ClaudeStoryYaml format
          const claudeStory = this.dbStoryToClaudeFormat(dbStory)

          return {
            loaded: true,
            source: 'db',
            storyId,
            story: claudeStory,
            elaboration: elaboration as ClaudeElaborationYaml | null,
            plan: plan as ClaudePlanYaml | null,
            verification: verification as ClaudeVerificationYaml | null,
            error: null,
            warnings,
          }
        }
      } catch (error) {
        warnings.push(`Database load failed: ${(error as Error).message}`)
      }
    }

    // Fall back to YAML if configured
    if (this.config.enableYamlFallback) {
      return this.loadFromYaml(storyId, resolvedFeature, stage)
    }

    return {
      loaded: false,
      source: 'none',
      storyId,
      story: null,
      elaboration: null,
      plan: null,
      verification: null,
      error: 'Story not found in database and YAML fallback disabled',
      warnings,
    }
  }

  /**
   * Load story directly from YAML files
   */
  async loadFromYaml(
    storyId: string,
    feature: string,
    stage?: string,
  ): Promise<BridgeLoadResult> {
    const warnings: string[] = []

    // If stage is known, use it directly
    if (stage) {
      const result = await this.reader.readAllArtifacts(feature, stage, storyId)
      return this.formatLoadResult(result, warnings)
    }

    // Search for story across all stages
    const storyResult = await this.reader.findAndReadStory(feature, storyId)
    if (!storyResult?.success || !storyResult.data) {
      return {
        loaded: false,
        source: 'none',
        storyId,
        story: null,
        elaboration: null,
        plan: null,
        verification: null,
        error: `Story not found in YAML files: ${storyId}`,
        warnings,
      }
    }

    // Get stage from found path
    const foundStage = storyResult.path.stageDirectory

    // Now read all artifacts using the found stage
    const result = await this.reader.readAllArtifacts(feature, foundStage, storyId)
    return this.formatLoadResult(result, warnings)
  }

  /**
   * Format artifacts read result to bridge load result
   */
  private formatLoadResult(
    result: StoryArtifactsReadResult,
    warnings: string[],
  ): BridgeLoadResult {
    // Collect warnings from all artifacts
    if (result.story?.warnings) warnings.push(...result.story.warnings)
    if (result.elaboration?.warnings) warnings.push(...result.elaboration.warnings)
    if (result.plan?.warnings) warnings.push(...result.plan.warnings)
    if (result.verification?.warnings) warnings.push(...result.verification.warnings)

    const loaded = result.story?.success ?? false

    return {
      loaded,
      source: loaded ? 'yaml' : 'none',
      storyId: result.storyId,
      story: result.story?.data ?? null,
      elaboration: result.elaboration?.data ?? null,
      plan: result.plan?.data ?? null,
      verification: result.verification?.data ?? null,
      error: result.story?.error ?? null,
      warnings,
    }
  }

  /**
   * Convert database story row to Claude YAML format
   */
  private dbStoryToClaudeFormat(dbStory: unknown): ClaudeStoryYaml {
    const story = dbStory as {
      story_id: string
      feature_id?: string
      type: string
      state: string
      title: string
      goal: string
      points?: number | null
      priority?: string | null
      blocked_by?: string | null
      depends_on?: string[]
      follow_up_from?: string | null
      packages?: string[]
      surfaces?: string[]
      non_goals?: string[]
      created_at: Date | string
      updated_at: Date | string
    }

    return {
      schema: 1,
      id: story.story_id,
      feature: story.feature_id || inferFeatureFromStoryId(story.story_id) || 'unknown',
      type: story.type,
      state: story.state,
      title: story.title,
      points: story.points ?? null,
      priority: story.priority ?? null,
      blocked_by: story.blocked_by ?? null,
      depends_on: story.depends_on ?? [],
      follow_up_from: story.follow_up_from ?? null,
      scope: {
        packages: story.packages ?? [],
        // Denormalize surfaces for YAML format
        surfaces: story.surfaces
          ? denormalizeSurfaces(story.surfaces as NormalizedSurfaceType[])
          : [],
      },
      goal: story.goal,
      non_goals: story.non_goals ?? [],
      acs: [],
      risks: [],
      created_at: typeof story.created_at === 'string'
        ? story.created_at
        : story.created_at.toISOString(),
      updated_at: typeof story.updated_at === 'string'
        ? story.updated_at
        : story.updated_at.toISOString(),
    }
  }

  // ==========================================================================
  // Save Operations
  // ==========================================================================

  /**
   * Save story artifacts with write-through support
   *
   * Saves to database (if repositories provided), and also writes to YAML
   * if write-through is enabled.
   */
  async saveStory(
    storyId: string,
    feature: string,
    stage: string,
    data: {
      story?: ClaudeStoryYaml
      elaboration?: ClaudeElaborationYaml
      plan?: ClaudePlanYaml
      verification?: ClaudeVerificationYaml
    },
  ): Promise<StorySyncResult> {
    const artifacts: ArtifactSyncResult[] = []
    const warnings: string[] = []

    // Save to database if available
    if (this.storyRepo && data.story) {
      try {
        // Convert to database format and save
        await this.saveStoryToDb(data.story)
        artifacts.push({
          artifactType: 'story',
          success: true,
          direction: 'yaml-to-db',
          source: 'yaml',
          error: null,
          warnings: [],
        })
      } catch (error) {
        artifacts.push({
          artifactType: 'story',
          success: false,
          direction: 'yaml-to-db',
          source: 'yaml',
          error: (error as Error).message,
          warnings: [],
        })
      }
    }

    // Save workflow artifacts to DB
    if (this.workflowRepo) {
      if (data.elaboration) {
        try {
          await this.workflowRepo.saveElaboration(
            storyId,
            data.elaboration,
            null,
            data.elaboration.gaps?.length ?? 0,
            this.config.dbActor,
          )
          artifacts.push({
            artifactType: 'elaboration',
            success: true,
            direction: 'yaml-to-db',
            source: 'yaml',
            error: null,
            warnings: [],
          })
        } catch (error) {
          artifacts.push({
            artifactType: 'elaboration',
            success: false,
            direction: 'yaml-to-db',
            source: 'yaml',
            error: (error as Error).message,
            warnings: [],
          })
        }
      }

      if (data.plan) {
        try {
          // Cast to Plan type - the DB repository will serialize to JSON
          await this.workflowRepo.savePlan(storyId, data.plan as unknown as Plan, this.config.dbActor)
          artifacts.push({
            artifactType: 'plan',
            success: true,
            direction: 'yaml-to-db',
            source: 'yaml',
            error: null,
            warnings: [],
          })
        } catch (error) {
          artifacts.push({
            artifactType: 'plan',
            success: false,
            direction: 'yaml-to-db',
            source: 'yaml',
            error: (error as Error).message,
            warnings: [],
          })
        }
      }
    }

    // Write to YAML if write-through is enabled
    if (this.config.enableWriteThrough) {
      const yamlResults = await this.saveToYaml(storyId, feature, stage, data)
      artifacts.push(...yamlResults.artifacts)
      warnings.push(...yamlResults.warnings)
    }

    return {
      storyId,
      feature,
      stage,
      success: artifacts.every(a => a.success),
      artifacts,
      error: null,
      warnings,
    }
  }

  /**
   * Save story directly to YAML files
   */
  async saveToYaml(
    storyId: string,
    feature: string,
    stage: string,
    data: {
      story?: ClaudeStoryYaml
      elaboration?: ClaudeElaborationYaml
      plan?: ClaudePlanYaml
      verification?: ClaudeVerificationYaml
    },
  ): Promise<StorySyncResult> {
    const artifacts: ArtifactSyncResult[] = []
    const warnings: string[] = []

    if (data.story) {
      const result = await this.writer.writeStory(feature, stage, storyId, data.story)
      artifacts.push({
        artifactType: 'story',
        success: result.success,
        direction: 'db-to-yaml',
        source: 'db',
        error: result.error,
        warnings: result.warnings,
      })
      warnings.push(...result.warnings)
    }

    if (data.elaboration) {
      const result = await this.writer.writeElaboration(feature, stage, storyId, data.elaboration)
      artifacts.push({
        artifactType: 'elaboration',
        success: result.success,
        direction: 'db-to-yaml',
        source: 'db',
        error: result.error,
        warnings: result.warnings,
      })
      warnings.push(...result.warnings)
    }

    if (data.plan) {
      const result = await this.writer.writePlan(feature, stage, storyId, data.plan)
      artifacts.push({
        artifactType: 'plan',
        success: result.success,
        direction: 'db-to-yaml',
        source: 'db',
        error: result.error,
        warnings: result.warnings,
      })
      warnings.push(...result.warnings)
    }

    if (data.verification) {
      const result = await this.writer.writeVerification(feature, stage, storyId, data.verification)
      artifacts.push({
        artifactType: 'verification',
        success: result.success,
        direction: 'db-to-yaml',
        source: 'db',
        error: result.error,
        warnings: result.warnings,
      })
      warnings.push(...result.warnings)
    }

    return {
      storyId,
      feature,
      stage,
      success: artifacts.every(a => a.success),
      artifacts,
      error: null,
      warnings,
    }
  }

  /**
   * Save story to database in LangGraph format
   */
  private async saveStoryToDb(story: ClaudeStoryYaml): Promise<void> {
    if (!this.storyRepo) {
      throw new Error('Story repository not configured')
    }

    // Normalize surfaces for database
    const normalizedSurfaces = story.scope?.surfaces
      ? normalizeSurfaces(story.scope.surfaces)
      : []

    // Check if story exists
    const existing = await this.storyRepo.getStory(story.id)

    if (existing) {
      // Update existing story
      await this.storyRepo.updateStoryState(
        story.id,
        story.state as 'draft' | 'backlog' | 'ready-to-work' | 'in-progress' | 'ready-for-qa' | 'uat' | 'done' | 'cancelled',
        this.config.dbActor,
        'Synced from YAML',
      )
    } else {
      // Create new story - construct StoryArtifact format
      const storyArtifact: StoryArtifact = {
        schema: 1,
        id: story.id,
        feature: story.feature,
        type: story.type as 'feature' | 'enhancement' | 'bug' | 'tech-debt' | 'spike' | 'infrastructure' | 'documentation',
        state: (story.state as 'draft' | 'backlog' | 'ready-to-work' | 'in-progress' | 'ready-for-qa' | 'uat' | 'done' | 'cancelled'),
        title: story.title,
        goal: story.goal,
        points: story.points ?? null,
        priority: (story.priority ?? 'medium') as 'critical' | 'high' | 'medium' | 'low',
        blocked_by: story.blocked_by ?? null,
        depends_on: story.depends_on ?? [],
        follow_up_from: story.follow_up_from ?? null,
        scope: {
          packages: story.scope?.packages ?? [],
          surfaces: normalizedSurfaces as SurfaceType[],
        },
        non_goals: story.non_goals ?? [],
        acs: story.acs?.map(ac => ({
          id: ac.id,
          description: ac.description,
          testable: ac.testable ?? true,
          automated: ac.automated ?? false,
        })) ?? [],
        risks: story.risks?.map(r => ({
          id: r.id,
          description: r.description,
          severity: r.severity as 'high' | 'medium' | 'low',
          mitigation: r.mitigation ?? null,
        })) ?? [],
        created_at: story.created_at,
        updated_at: story.updated_at,
      }
      await this.storyRepo.createStory(storyArtifact, this.config.dbActor)
    }
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  /**
   * Sync a story based on configured direction
   */
  async syncStory(
    storyId: string,
    feature: string,
    stage: string,
    direction?: SyncDirection,
  ): Promise<StorySyncResult> {
    const syncDirection = direction ?? this.config.syncDirection

    switch (syncDirection) {
      case 'yaml-to-db':
        return this.syncYamlToDb(storyId, feature, stage)
      case 'db-to-yaml':
        return this.syncDbToYaml(storyId, feature, stage)
      case 'bidirectional':
        return this.syncBidirectional(storyId, feature, stage)
      default:
        return {
          storyId,
          feature,
          stage,
          success: false,
          artifacts: [],
          error: `Unknown sync direction: ${syncDirection}`,
          warnings: [],
        }
    }
  }

  /**
   * Sync YAML files to database
   */
  async syncYamlToDb(
    storyId: string,
    feature: string,
    stage: string,
  ): Promise<StorySyncResult> {
    // Read from YAML
    const loadResult = await this.loadFromYaml(storyId, feature, stage)

    if (!loadResult.loaded) {
      return {
        storyId,
        feature,
        stage,
        success: false,
        artifacts: [],
        error: loadResult.error,
        warnings: loadResult.warnings,
      }
    }

    // Save to database
    return this.saveStory(storyId, feature, stage, {
      story: loadResult.story ?? undefined,
      elaboration: loadResult.elaboration ?? undefined,
      plan: loadResult.plan ?? undefined,
      verification: loadResult.verification ?? undefined,
    })
  }

  /**
   * Sync database to YAML files
   */
  async syncDbToYaml(
    storyId: string,
    feature: string,
    stage: string,
  ): Promise<StorySyncResult> {
    // Read from database
    if (!this.storyRepo) {
      return {
        storyId,
        feature,
        stage,
        success: false,
        artifacts: [],
        error: 'Database repository not configured',
        warnings: [],
      }
    }

    const dbStory = await this.storyRepo.getStory(storyId)
    if (!dbStory) {
      return {
        storyId,
        feature,
        stage,
        success: false,
        artifacts: [],
        error: `Story not found in database: ${storyId}`,
        warnings: [],
      }
    }

    // Convert and write to YAML
    const claudeStory = this.dbStoryToClaudeFormat(dbStory)

    // Load workflow artifacts from DB
    let elaboration: ClaudeElaborationYaml | undefined
    let plan: ClaudePlanYaml | undefined
    let verification: ClaudeVerificationYaml | undefined

    if (this.workflowRepo) {
      const [elabRecord, planRecord, verifyRecord] = await Promise.all([
        this.workflowRepo.getLatestElaboration(storyId).catch(() => null),
        this.workflowRepo.getLatestPlan(storyId).catch(() => null),
        this.workflowRepo.getLatestVerification(storyId, 'qa_verify').catch(() => null),
      ])
      elaboration = elabRecord?.content as ClaudeElaborationYaml | undefined
      plan = planRecord?.content as ClaudePlanYaml | undefined
      verification = verifyRecord?.content as ClaudeVerificationYaml | undefined
    }

    return this.saveToYaml(storyId, feature, stage, {
      story: claudeStory,
      elaboration,
      plan,
      verification,
    })
  }

  /**
   * Bidirectional sync with conflict resolution
   */
  async syncBidirectional(
    storyId: string,
    feature: string,
    stage: string,
  ): Promise<StorySyncResult> {
    const warnings: string[] = []
    const artifacts: ArtifactSyncResult[] = []

    // Load from both sources
    const yamlResult = await this.loadFromYaml(storyId, feature, stage)
    let dbStory: unknown = null

    if (this.storyRepo) {
      dbStory = await this.storyRepo.getStory(storyId)
    }

    // Determine which source wins based on conflict strategy
    const useYaml = this.shouldUseYaml(yamlResult, dbStory)

    if (useYaml && yamlResult.loaded) {
      // YAML wins - sync to DB
      warnings.push('Using YAML as source of truth')
      const result = await this.saveStory(storyId, feature, stage, {
        story: yamlResult.story ?? undefined,
        elaboration: yamlResult.elaboration ?? undefined,
        plan: yamlResult.plan ?? undefined,
        verification: yamlResult.verification ?? undefined,
      })
      artifacts.push(...result.artifacts)
      warnings.push(...result.warnings)
    } else if (dbStory) {
      // DB wins - sync to YAML
      warnings.push('Using database as source of truth')
      const result = await this.syncDbToYaml(storyId, feature, stage)
      artifacts.push(...result.artifacts)
      warnings.push(...result.warnings)
    } else {
      return {
        storyId,
        feature,
        stage,
        success: false,
        artifacts: [],
        error: 'Story not found in either YAML or database',
        warnings,
      }
    }

    return {
      storyId,
      feature,
      stage,
      success: artifacts.every(a => a.success),
      artifacts,
      error: null,
      warnings,
    }
  }

  /**
   * Determine if YAML should be used based on conflict strategy
   */
  private shouldUseYaml(yamlResult: BridgeLoadResult, dbStory: unknown): boolean {
    switch (this.config.conflictStrategy) {
      case 'yaml-wins':
        return yamlResult.loaded

      case 'db-wins':
        return dbStory === null

      case 'newest-wins':
        if (!yamlResult.loaded && !dbStory) return false
        if (!yamlResult.loaded) return false
        if (!dbStory) return true

        // Compare timestamps
        const yamlUpdated = yamlResult.story?.updated_at
        const dbUpdated = (dbStory as { updated_at?: string | Date })?.updated_at

        if (!yamlUpdated && !dbUpdated) return true
        if (!yamlUpdated) return false
        if (!dbUpdated) return true

        const yamlTime = new Date(yamlUpdated).getTime()
        const dbTime = new Date(dbUpdated).getTime()

        return yamlTime >= dbTime

      default:
        return yamlResult.loaded
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a YAML artifact bridge
 */
export function createYamlArtifactBridge(
  config: Partial<YamlArtifactBridgeConfig> & { workspaceRoot: string },
  storyRepo: StoryRepository | null = null,
  workflowRepo: WorkflowRepository | null = null,
): YamlArtifactBridge {
  return new YamlArtifactBridge(config, storyRepo, workflowRepo)
}
