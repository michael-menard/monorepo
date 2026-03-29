/**
 * ArtifactService Type Definitions
 *
 * Zod schemas for configuration and result types used by ArtifactService.
 */

import { z } from 'zod'

// ============================================================================
// Configuration Schemas
// ============================================================================

/**
 * Configuration for ArtifactService
 *
 * Required:
 * - workspaceRoot: Path to monorepo root (e.g., /Users/user/monorepo)
 * - featureDir: Path to feature directory (e.g., /path/to/plans/future/platform)
 *
 * Optional:
 * - mode: 'yaml' (default) or 'yaml+db' for dual persistence
 * - storyRepo: Required if mode = 'yaml+db'
 * - workflowRepo: Required if mode = 'yaml+db'
 */
export const ArtifactServiceConfigSchema = z
  .object({
    workspaceRoot: z.string().min(1, 'workspaceRoot is required'),
    featureDir: z.string().min(1, 'featureDir is required'),
    mode: z.enum(['yaml', 'yaml+db']).default('yaml'),
    storyRepo: z.any().optional(),
    workflowRepo: z.any().optional(),
  })
  .refine(
    data => {
      // If mode is 'yaml+db', both repos must be provided
      if (data.mode === 'yaml+db') {
        return data.storyRepo !== undefined && data.workflowRepo !== undefined
      }
      return true
    },
    {
      message: "storyRepo and workflowRepo are required when mode is 'yaml+db'",
      path: ['mode'],
    },
  )

export type ArtifactServiceConfig = z.infer<typeof ArtifactServiceConfigSchema>

// ============================================================================
// Result Type Schemas
// ============================================================================

/**
 * Discriminated union result type for read operations
 *
 * Success case: { success: true, data: T, warnings: string[] }
 * Failure case: { success: false, error: string, message: string, warnings: string[] }
 */
export const ArtifactReadResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      data: dataSchema,
      warnings: z.array(z.string()).default([]),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
      message: z.string().optional(),
      warnings: z.array(z.string()).default([]),
    }),
  ])

export type ArtifactReadResult<T> =
  | {
      success: true
      data: T
      warnings: string[]
    }
  | {
      success: false
      error: string
      message?: string
      warnings: string[]
    }

/**
 * Result type for write operations
 *
 * Success case: { success: true, path: string, created: boolean, warnings: string[] }
 * Failure case: { success: false, error: string, message: string, warnings: string[] }
 */
export const ArtifactWriteResultSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    path: z.string(),
    created: z.boolean(), // True if directory was created
    warnings: z.array(z.string()).default([]),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    message: z.string().optional(),
    warnings: z.array(z.string()).default([]),
  }),
])

export type ArtifactWriteResult =
  | {
      success: true
      path: string
      created: boolean
      warnings: string[]
    }
  | {
      success: false
      error: string
      message?: string
      warnings: string[]
    }

// ============================================================================
// Stage Auto-Detection
// ============================================================================

/**
 * Story stages in search order for auto-detection
 */
export const STAGE_SEARCH_ORDER = [
  'backlog',
  'elaboration',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'UAT',
] as const

export type StageSearchOrder = (typeof STAGE_SEARCH_ORDER)[number]
