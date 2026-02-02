/**
 * Workflow Repository
 *
 * Repository for workflow artifacts persistence to PostgreSQL.
 * Handles elaboration, plan, verification, proof, and token usage records.
 *
 * Works with schema from 002_workflow_tables.sql + 004_workflow_repository_compat.sql
 *
 * Note: The 002 schema uses UUID primary keys for tables that reference stories.
 * The story_id column in stories table is VARCHAR(30), but foreign keys use UUID.
 * This repository accepts story_id (VARCHAR) and looks up the UUID internally.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { DbClient } from './story-repository.js'
import type { Plan } from '../artifacts/plan.js'
import type { Evidence } from '../artifacts/evidence.js'
import type { QaVerify } from '../artifacts/qa-verify.js'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Elaboration record schema - matches 002 + 004 migration columns
 */
export const ElaborationRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  date: z.date().optional(), // Original schema column
  verdict: z.string().optional(), // Original schema column (verdict_type enum)
  audit: z.unknown().optional(), // Original schema column (JSONB)
  content: z.unknown().nullable(), // Added in 004 - full elaboration YAML
  readiness_score: z.number().int().min(0).max(100).nullable(),
  gaps_count: z.number().int().min(0).nullable(),
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type ElaborationRecord = z.infer<typeof ElaborationRecordSchema>

/**
 * Plan record schema - matches implementation_plans table
 */
export const PlanRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  version: z.number().int().positive(),
  approved: z.boolean().optional(),
  estimated_files: z.number().int().nullable(),
  estimated_tokens: z.number().int().nullable(),
  content: z.unknown().nullable(), // Added in 004
  steps_count: z.number().int().min(0).nullable(),
  files_count: z.number().int().min(0).nullable(),
  complexity: z.string().nullable(),
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type PlanRecord = z.infer<typeof PlanRecordSchema>

/**
 * Verification record schema - matches 002 + 004 columns
 */
export const VerificationRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  version: z.number().int().positive().nullable(),
  type: z.string().nullable(), // Added in 004
  content: z.unknown().nullable(), // Added in 004
  verdict: z.string().nullable(), // Added in 004
  issues_count: z.number().int().min(0).nullable(),
  qa_verdict: z.string().nullable(), // Original schema column
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type VerificationRecord = z.infer<typeof VerificationRecordSchema>

/**
 * Proof record schema - matches 002 + 004 columns
 */
export const ProofRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  version: z.number().int().positive().nullable(),
  content: z.unknown().nullable(), // Added in 004
  acs_passing: z.number().int().min(0).nullable(),
  acs_total: z.number().int().min(0).nullable(),
  files_touched: z.number().int().min(0).nullable(),
  all_acs_verified: z.boolean().nullable(), // Original schema column
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type ProofRecord = z.infer<typeof ProofRecordSchema>

/**
 * Token usage record schema - matches 002 + 004 columns
 */
export const TokenUsageRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  phase: z.string(),
  tokens_input: z.number().int().min(0), // Original column name
  tokens_output: z.number().int().min(0), // Original column name
  total_tokens: z.number().int().min(0).optional(), // Added in 004 (generated)
  model: z.string().nullable(),
  agent_name: z.string().nullable(),
  created_at: z.date(),
})

export type TokenUsageRecord = z.infer<typeof TokenUsageRecordSchema>

/**
 * Token usage input for logging
 */
export const TokenUsageInputSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  model: z.string().optional(),
  agentName: z.string().optional(),
})

export type TokenUsageInput = z.infer<typeof TokenUsageInputSchema>

// ============================================================================
// Repository Implementation
// ============================================================================

/**
 * Repository for workflow artifact CRUD operations.
 *
 * All methods accept storyId as a VARCHAR string (e.g., "WISH-001") and
 * internally resolve it to the UUID foreign key needed by the tables.
 */
export class WorkflowRepository {
  constructor(private client: DbClient) {}

  /**
   * Get story UUID from story_id VARCHAR
   */
  private async getStoryUuid(storyId: string): Promise<string | null> {
    const result = await this.client.query<{ id: string }>(
      `SELECT id FROM stories WHERE story_id = $1`,
      [storyId],
    )
    return result.rows[0]?.id ?? null
  }

  // ==========================================================================
  // Elaboration
  // ==========================================================================

  /**
   * Save an elaboration record
   */
  async saveElaboration(
    storyId: string,
    content: unknown,
    readinessScore: number | null,
    gapsCount: number,
    createdBy: string,
  ): Promise<ElaborationRecord> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        throw new Error(`Story not found: ${storyId}`)
      }

      // Insert elaboration
      const result = await this.client.query<ElaborationRecord>(
        `INSERT INTO elaborations (story_id, date, verdict, content, readiness_score, gaps_count, created_by)
        VALUES ($1, CURRENT_DATE, 'pass'::verdict_type, $2, $3, $4, $5)
        RETURNING *`,
        [storyUuid, JSON.stringify(content), readinessScore, gapsCount, createdBy],
      )

      logger.info('Saved elaboration', { storyId, storyUuid })
      return result.rows[0]
    } catch (error) {
      logger.error('Failed to save elaboration', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get latest elaboration for a story
   */
  async getLatestElaboration(storyId: string): Promise<ElaborationRecord | null> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        return null
      }

      const result = await this.client.query<ElaborationRecord>(
        `SELECT * FROM elaborations
        WHERE story_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
        [storyUuid],
      )

      return result.rows[0] ?? null
    } catch (error) {
      logger.error('Failed to get elaboration', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // ==========================================================================
  // Plan (implementation_plans table)
  // ==========================================================================

  /**
   * Save a plan record
   */
  async savePlan(storyId: string, plan: Plan, createdBy: string): Promise<PlanRecord> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        throw new Error(`Story not found: ${storyId}`)
      }

      // Get current max version
      const versionResult = await this.client.query<{ max_version: number | null }>(
        `SELECT MAX(version) as max_version FROM implementation_plans WHERE story_id = $1`,
        [storyUuid],
      )
      const nextVersion = (versionResult.rows[0]?.max_version ?? 0) + 1

      const stepsCount = plan.steps?.length ?? 0
      const filesCount = plan.files_to_change?.length ?? 0

      const result = await this.client.query<PlanRecord>(
        `INSERT INTO implementation_plans (
          story_id, version, content, steps_count, files_count, complexity, created_by,
          estimated_files, estimated_tokens
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          storyUuid,
          nextVersion,
          JSON.stringify(plan),
          stepsCount,
          filesCount,
          plan.complexity ?? null,
          createdBy,
          filesCount, // estimated_files for backward compat
          null, // estimated_tokens
        ],
      )

      logger.info('Saved plan', { storyId, version: nextVersion })
      return result.rows[0]
    } catch (error) {
      logger.error('Failed to save plan', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get latest plan for a story
   */
  async getLatestPlan(storyId: string): Promise<PlanRecord | null> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        return null
      }

      const result = await this.client.query<PlanRecord>(
        `SELECT * FROM implementation_plans
        WHERE story_id = $1
        ORDER BY version DESC
        LIMIT 1`,
        [storyUuid],
      )

      return result.rows[0] ?? null
    } catch (error) {
      logger.error('Failed to get plan', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // ==========================================================================
  // Verification
  // ==========================================================================

  /**
   * Save a verification record (QA or review)
   */
  async saveVerification(
    storyId: string,
    type: 'qa_verify' | 'review' | 'uat',
    content: QaVerify | unknown,
    verdict: 'PASS' | 'FAIL' | 'CONCERNS' | 'PENDING',
    issuesCount: number,
    createdBy: string,
  ): Promise<VerificationRecord> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        throw new Error(`Story not found: ${storyId}`)
      }

      // Get current max version for this type
      const versionResult = await this.client.query<{ max_version: number | null }>(
        `SELECT COALESCE(MAX(version), 0) as max_version FROM verifications WHERE story_id = $1 AND type = $2`,
        [storyUuid, type],
      )
      const nextVersion = (versionResult.rows[0]?.max_version ?? 0) + 1

      // Map verdict to verdict_type enum for qa_verdict column
      const qaVerdict = verdict.toLowerCase()

      const result = await this.client.query<VerificationRecord>(
        `INSERT INTO verifications (story_id, version, type, content, verdict, issues_count, created_by, qa_verdict)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::verdict_type)
        RETURNING *`,
        [storyUuid, nextVersion, type, JSON.stringify(content), verdict, issuesCount, createdBy, qaVerdict],
      )

      logger.info('Saved verification', { storyId, type, version: nextVersion, verdict })
      return result.rows[0]
    } catch (error) {
      logger.error('Failed to save verification', {
        storyId,
        type,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get latest verification for a story
   */
  async getLatestVerification(
    storyId: string,
    type: 'qa_verify' | 'review' | 'uat',
  ): Promise<VerificationRecord | null> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        return null
      }

      const result = await this.client.query<VerificationRecord>(
        `SELECT * FROM verifications
        WHERE story_id = $1 AND type = $2
        ORDER BY version DESC
        LIMIT 1`,
        [storyUuid, type],
      )

      return result.rows[0] ?? null
    } catch (error) {
      logger.error('Failed to get verification', {
        storyId,
        type,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // ==========================================================================
  // Proof (Evidence)
  // ==========================================================================

  /**
   * Save a proof/evidence record
   */
  async saveProof(storyId: string, evidence: Evidence, createdBy: string): Promise<ProofRecord> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        throw new Error(`Story not found: ${storyId}`)
      }

      // Get current max version
      const versionResult = await this.client.query<{ max_version: number | null }>(
        `SELECT COALESCE(MAX(version), 0) as max_version FROM proofs WHERE story_id = $1`,
        [storyUuid],
      )
      const nextVersion = (versionResult.rows[0]?.max_version ?? 0) + 1

      // Count passing ACs
      const acsPassing =
        evidence.acceptance_criteria?.filter(ac => ac.status === 'PASS').length ?? 0
      const acsTotal = evidence.acceptance_criteria?.length ?? 0
      const allAcsVerified = acsPassing === acsTotal && acsTotal > 0

      const result = await this.client.query<ProofRecord>(
        `INSERT INTO proofs (story_id, version, content, acs_passing, acs_total, files_touched, created_by, all_acs_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          storyUuid,
          nextVersion,
          JSON.stringify(evidence),
          acsPassing,
          acsTotal,
          evidence.touched_files?.length ?? 0,
          createdBy,
          allAcsVerified,
        ],
      )

      logger.info('Saved proof', {
        storyId,
        version: nextVersion,
        acsPassing,
        acsTotal,
      })
      return result.rows[0]
    } catch (error) {
      logger.error('Failed to save proof', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get latest proof for a story
   */
  async getLatestProof(storyId: string): Promise<ProofRecord | null> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        return null
      }

      const result = await this.client.query<ProofRecord>(
        `SELECT * FROM proofs
        WHERE story_id = $1
        ORDER BY version DESC
        LIMIT 1`,
        [storyUuid],
      )

      return result.rows[0] ?? null
    } catch (error) {
      logger.error('Failed to get proof', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // ==========================================================================
  // Token Usage
  // ==========================================================================

  /**
   * Log token usage for a phase
   */
  async logTokenUsage(
    storyId: string,
    phase: string,
    usage: TokenUsageInput,
  ): Promise<TokenUsageRecord> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        throw new Error(`Story not found: ${storyId}`)
      }

      // Use tokens_input and tokens_output column names (002 schema)
      // total_tokens is a generated column added in 004
      const result = await this.client.query<TokenUsageRecord>(
        `INSERT INTO token_usage (story_id, phase, tokens_input, tokens_output, model, agent_name)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          storyUuid,
          phase,
          usage.inputTokens,
          usage.outputTokens,
          usage.model ?? null,
          usage.agentName ?? null,
        ],
      )

      logger.debug('Logged token usage', {
        storyId,
        phase,
        totalTokens: usage.inputTokens + usage.outputTokens,
      })
      return result.rows[0]
    } catch (error) {
      logger.error('Failed to log token usage', {
        storyId,
        phase,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get token usage summary for a story
   */
  async getTokenUsageSummary(
    storyId: string,
  ): Promise<{ phase: string; total_tokens: number }[]> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        return []
      }

      // Use tokens_input + tokens_output for total (or total_tokens if 004 migration ran)
      const result = await this.client.query<{ phase: string; total_tokens: number }>(
        `SELECT phase, SUM(COALESCE(total_tokens, tokens_input + tokens_output))::int as total_tokens
        FROM token_usage
        WHERE story_id = $1
        GROUP BY phase
        ORDER BY phase`,
        [storyUuid],
      )

      return result.rows
    } catch (error) {
      logger.error('Failed to get token usage summary', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get total token usage for a story
   */
  async getTotalTokenUsage(storyId: string): Promise<number> {
    try {
      // Get story UUID from story_id
      const storyUuid = await this.getStoryUuid(storyId)
      if (!storyUuid) {
        return 0
      }

      const result = await this.client.query<{ total: number }>(
        `SELECT COALESCE(SUM(COALESCE(total_tokens, tokens_input + tokens_output)), 0)::int as total
        FROM token_usage
        WHERE story_id = $1`,
        [storyUuid],
      )

      return result.rows[0]?.total ?? 0
    } catch (error) {
      logger.error('Failed to get total token usage', {
        storyId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}

/**
 * Create a workflow repository with the given database client
 */
export function createWorkflowRepository(client: DbClient): WorkflowRepository {
  return new WorkflowRepository(client)
}
