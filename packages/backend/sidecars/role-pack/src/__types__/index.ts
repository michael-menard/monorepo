/**
 * Zod schemas for Role Pack Sidecar Service
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 */

import { z } from 'zod'

/**
 * Valid role values matching actual WINT-0210 output files.
 * Note: 'pm' is NOT included — 'da' (devil's advocate) is used instead per AC-10.
 */
export const RoleSchema = z.enum(['dev', 'po', 'qa', 'da'])

export type Role = z.infer<typeof RoleSchema>

/**
 * Input schema for the rolePackGet MCP tool
 */
export const RolePackGetInputSchema = z.object({
  role: RoleSchema,
  version: z.number().int().positive().optional(),
})

export type RolePackGetInput = z.infer<typeof RolePackGetInputSchema>

/**
 * Output schema for the rolePackGet MCP tool — content string or null
 */
export const RolePackGetOutputSchema = z.string().nullable()

export type RolePackGetOutput = z.infer<typeof RolePackGetOutputSchema>

/**
 * Cached pack structure stored in memory
 */
export const CachedPackSchema = z.object({
  content: z.string(),
  version: z.number().int().nullable(),
})

export type CachedPack = z.infer<typeof CachedPackSchema>

/**
 * HTTP success response body schema
 */
export const RolePackHttpResponseSchema = z.object({
  content: z.string(),
})

export type RolePackHttpResponse = z.infer<typeof RolePackHttpResponseSchema>

/**
 * HTTP error response body schema
 */
export const RolePackHttpErrorSchema = z.object({
  error: z.string(),
  available: z.number().int().optional(),
})

export type RolePackHttpError = z.infer<typeof RolePackHttpErrorSchema>
