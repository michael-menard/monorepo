/**
 * Story Repository
 *
 * Repository for story persistence to PostgreSQL.
 * Uses dependency injection for database client to keep orchestrator
 * loosely coupled from specific database implementations.
 *
 * Works with schema from 002_workflow_tables.sql
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { StoryStateSchema, type StoryState } from '../state/enums/story-state.js'
import {
  StoryArtifactSchema,
  type StoryArtifact,
  type StoryType,
  type PriorityLevel,
} from '../artifacts/story.js'

// ============================================================================
// Database Client Interface
// ============================================================================

/**
 * Minimal database client interface for dependency injection.
 * Allows the repository to work with any pg-compatible client.
 */
export interface DbClient {
  query<T>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number }>
}

/**
 * Database row for stories table
 * Matches the schema from 002_workflow_tables.sql
 */
export const StoryRowSchema = z.object({
  id: z.string().uuid(), // UUID primary key
  story_id: z.string(), // Story identifier (e.g., "WISH-001")
  feature_id: z.string().uuid().nullable(), // UUID reference to features table
  type: z.string(), // story_type enum
  state: StoryStateSchema,
  title: z.string(),
  goal: z.string().nullable(),
  points: z.number().nullable(),
  priority: z.string().nullable(), // priority_level enum (p0, p1, p2, p3)
  blocked_by: z.string().nullable(),
  depends_on: z.array(z.string()).nullable(),
  follow_up_from: z.string().nullable(),
  packages: z.array(z.string()).nullable(), // scope_packages
  surfaces: z.array(z.string()).nullable(), // scope_surfaces (surface_type enum)
  non_goals: z.array(z.string()).nullable(),
  created_at: z.date(),
  updated_at: z.date(),
})

export type StoryRow = z.infer<typeof StoryRowSchema>

/**
 * State transition log entry
 */
export const StateTransitionSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string(),
  from_state: StoryStateSchema.nullable(),
  to_state: StoryStateSchema,
  actor: z.string(),
  reason: z.string().nullable(),
  created_at: z.date(),
})

export type StateTransition = z.infer<typeof StateTransitionSchema>

// ============================================================================
// Repository Implementation
// ============================================================================

/**
 * Repository for story CRUD operations.
 *
 * Provides a clean interface for story persistence without exposing
 * SQL details to the rest of the application.
 */
export class StoryRepository {
  constructor(private client: DbClient) {}

  /**
   * Get a story by story ID (e.g., "WISH-001")
   */
  async getStory(storyId: string): Promise<StoryArtifact | null> {
    try {
      const result = await this.client.query<StoryRow>(
        `SELECT
          id, story_id, feature_id, type, state, title, goal, points, priority,
          blocked_by, depends_on, follow_up_from, packages, surfaces,
          non_goals, created_at, updated_at
        FROM stories
        WHERE story_id = $1`,
        [storyId],
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.rowToStoryArtifact(result.rows[0])
    } catch (error) {
      logger.error('Failed to get story', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Create a new story
   */
  async createStory(story: StoryArtifact, actor: string): Promise<StoryArtifact> {
    try {
      // Map priority from StoryArtifact format to DB enum format
      const dbPriority = this.mapPriorityToDb(story.priority)

      const result = await this.client.query<StoryRow>(
        `INSERT INTO stories (
          story_id, feature_id, type, state, title, goal, points, priority,
          blocked_by, depends_on, follow_up_from, packages, surfaces,
          non_goals, created_at, updated_at
        ) VALUES ($1, $2, $3, $4::story_state, $5, $6, $7, $8::priority_level, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          story.id, // This is the story_id (e.g., "WISH-001")
          story.feature ? await this.getOrCreateFeatureId(story.feature) : null,
          story.type,
          story.state,
          story.title,
          story.goal,
          story.points,
          dbPriority,
          story.blocked_by,
          story.depends_on,
          story.follow_up_from,
          story.scope.packages,
          story.scope.surfaces,
          story.non_goals,
          new Date(story.created_at),
          new Date(story.updated_at),
        ],
      )

      // Log initial state transition
      await this.logStateTransition(story.id, null, story.state, actor, 'Story created')

      return this.rowToStoryArtifact(result.rows[0])
    } catch (error) {
      logger.error('Failed to create story', {
        storyId: story.id,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Update story state with transition logging
   */
  async updateStoryState(
    storyId: string,
    newState: StoryState,
    actor: string,
    reason?: string,
  ): Promise<void> {
    try {
      // Get current state for transition logging
      const current = await this.getStory(storyId)
      if (!current) {
        throw new Error(`Story not found: ${storyId}`)
      }

      const fromState = current.state

      // Update state using story_id column
      await this.client.query(
        `UPDATE stories SET state = $1::story_state, updated_at = NOW() WHERE story_id = $2`,
        [newState, storyId],
      )

      // Log transition
      await this.logStateTransition(storyId, fromState, newState, actor, reason)

      logger.info('Story state updated', {
        storyId,
        fromState,
        toState: newState,
        actor,
      })
    } catch (error) {
      logger.error('Failed to update story state', {
        storyId,
        newState,
        actor,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Set story as blocked by another story
   */
  async setBlockedBy(
    storyId: string,
    blockedBy: string | null,
    actor: string,
  ): Promise<void> {
    try {
      await this.client.query(
        `UPDATE stories SET blocked_by = $1, updated_at = NOW() WHERE story_id = $2`,
        [blockedBy, storyId],
      )

      logger.info('Story blocked_by updated', {
        storyId,
        blockedBy,
        actor,
      })
    } catch (error) {
      logger.error('Failed to set blocked_by', {
        storyId,
        blockedBy,
        actor,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get all workable stories (ready-to-work and not blocked)
   */
  async getWorkableStories(): Promise<StoryArtifact[]> {
    try {
      const result = await this.client.query<StoryRow>(
        `SELECT
          id, story_id, feature_id, type, state, title, goal, points, priority,
          blocked_by, depends_on, follow_up_from, packages, surfaces,
          non_goals, created_at, updated_at
        FROM stories
        WHERE state = 'ready-to-work' AND blocked_by IS NULL
        ORDER BY
          CASE priority
            WHEN 'p0' THEN 1
            WHEN 'p1' THEN 2
            WHEN 'p2' THEN 3
            WHEN 'p3' THEN 4
            ELSE 5
          END,
          created_at ASC`,
      )

      return result.rows.map(row => this.rowToStoryArtifact(row))
    } catch (error) {
      logger.error('Failed to get workable stories', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get stories by state
   */
  async getStoriesByState(state: StoryState): Promise<StoryArtifact[]> {
    try {
      const result = await this.client.query<StoryRow>(
        `SELECT
          id, story_id, feature_id, type, state, title, goal, points, priority,
          blocked_by, depends_on, follow_up_from, packages, surfaces,
          non_goals, created_at, updated_at
        FROM stories
        WHERE state = $1::story_state
        ORDER BY created_at ASC`,
        [state],
      )

      return result.rows.map(row => this.rowToStoryArtifact(row))
    } catch (error) {
      logger.error('Failed to get stories by state', {
        state,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get stories by feature name
   */
  async getStoriesByFeature(featureName: string): Promise<StoryArtifact[]> {
    try {
      const result = await this.client.query<StoryRow>(
        `SELECT
          s.id, s.story_id, s.feature_id, s.type, s.state, s.title, s.goal, s.points, s.priority,
          s.blocked_by, s.depends_on, s.follow_up_from, s.packages, s.surfaces,
          s.non_goals, s.created_at, s.updated_at
        FROM stories s
        LEFT JOIN features f ON s.feature_id = f.id
        WHERE f.name = $1
        ORDER BY s.created_at ASC`,
        [featureName],
      )

      return result.rows.map(row => this.rowToStoryArtifact(row))
    } catch (error) {
      logger.error('Failed to get stories by feature', {
        featureName,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get the next action for a story based on its current state
   */
  async getNextAction(storyId: string): Promise<string> {
    const story = await this.getStory(storyId)
    if (!story) {
      return 'Story not found'
    }

    if (story.blocked_by) {
      return `Blocked by ${story.blocked_by} - resolve blocker first`
    }

    const actionMap: Record<StoryState, string> = {
      draft: 'Generate story structure (/pm-story generate)',
      backlog: 'Elaborate story (/elab-story)',
      'ready-to-work': 'Start implementation (/dev-implement-story)',
      'in-progress': 'Continue implementation or submit for review',
      'ready-for-qa': 'Run QA verification (/qa-verify-story)',
      uat: 'Complete UAT testing',
      done: 'Story complete - no action needed',
      cancelled: 'Story cancelled - no action needed',
    }

    return actionMap[story.state] || 'Unknown state'
  }

  /**
   * Get state transition history for a story
   */
  async getStateHistory(storyId: string): Promise<StateTransition[]> {
    try {
      // story_state_transitions uses story_id (VARCHAR) as reference
      const result = await this.client.query<StateTransition>(
        `SELECT id, story_id, from_state, to_state, actor, reason, created_at
        FROM story_state_transitions
        WHERE story_id = $1
        ORDER BY created_at ASC`,
        [storyId],
      )

      return result.rows
    } catch (error) {
      logger.error('Failed to get state history', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Log a state transition
   */
  private async logStateTransition(
    storyId: string,
    fromState: StoryState | null,
    toState: StoryState,
    actor: string,
    reason?: string,
  ): Promise<void> {
    await this.client.query(
      `INSERT INTO story_state_transitions (story_id, from_state, to_state, actor, reason)
      VALUES ($1, $2::story_state, $3::story_state, $4, $5)`,
      [storyId, fromState, toState, actor, reason ?? null],
    )
  }

  /**
   * Convert database row to StoryArtifact
   */
  private rowToStoryArtifact(row: StoryRow): StoryArtifact {
    return StoryArtifactSchema.parse({
      schema: 1,
      id: row.story_id, // story_id is the human-readable ID
      feature: row.feature_id ?? 'unknown', // Default to 'unknown' when no feature
      type: row.type as StoryType,
      state: row.state,
      title: row.title,
      goal: row.goal ?? '',
      points: row.points,
      priority: this.mapPriorityFromDb(row.priority),
      blocked_by: row.blocked_by,
      depends_on: row.depends_on ?? [],
      follow_up_from: row.follow_up_from,
      scope: {
        packages: row.packages ?? [],
        surfaces: row.surfaces ?? [],
      },
      non_goals: row.non_goals ?? [],
      acs: [], // ACs stored separately in acceptance_criteria table
      risks: [], // Risks stored separately in story_risks table
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    })
  }

  /**
   * Map priority from StoryArtifact format to DB enum format
   */
  private mapPriorityToDb(priority: PriorityLevel | null | undefined): string | null {
    if (!priority) return null
    const mapping: Record<PriorityLevel, string> = {
      critical: 'p0',
      high: 'p1',
      medium: 'p2',
      low: 'p3',
    }
    return mapping[priority] ?? null
  }

  /**
   * Map priority from DB enum format to StoryArtifact format
   */
  private mapPriorityFromDb(dbPriority: string | null): PriorityLevel | null {
    if (!dbPriority) return null
    const mapping: Record<string, PriorityLevel> = {
      p0: 'critical',
      p1: 'high',
      p2: 'medium',
      p3: 'low',
    }
    return mapping[dbPriority] ?? null
  }

  /**
   * Get or create feature ID by name
   */
  private async getOrCreateFeatureId(featureName: string): Promise<string | null> {
    if (!featureName) return null

    try {
      // Try to find existing feature
      const existing = await this.client.query<{ id: string }>(
        `SELECT id FROM features WHERE name = $1`,
        [featureName],
      )

      if (existing.rows.length > 0) {
        return existing.rows[0].id
      }

      // Create new feature
      const result = await this.client.query<{ id: string }>(
        `INSERT INTO features (name) VALUES ($1) RETURNING id`,
        [featureName],
      )

      return result.rows[0].id
    } catch (error) {
      logger.warn('Failed to get or create feature', {
        featureName,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }
}

/**
 * Create a story repository with the given database client
 */
export function createStoryRepository(client: DbClient): StoryRepository {
  return new StoryRepository(client)
}
