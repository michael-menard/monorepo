/**
 * Zod Schemas for Role Pack Sidecar Service
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 */

import { z } from 'zod'

/**
 * Valid role values per AC-10
 * NOTE: 'pm' is explicitly excluded
 */
export const RoleSchema = z.enum(['dev', 'po', 'qa', 'da'], {
  errorMap: () => ({ message: 'role must be one of: dev, po, qa, da' }),
})

export type Role = z.infer<typeof RoleSchema>

/**
 * Input schema for rolePackGet MCP tool
 */
export const RolePackGetInputSchema = z.object({
  role: RoleSchema,
  version: z.number().int().positive().optional(),
})

export type RolePackGetInput = z.infer<typeof RolePackGetInputSchema>

/**
 * Output schema for rolePackGet MCP tool
 */
export const RolePackGetOutputSchema = z.object({
  role: RoleSchema,
  content: z.string(),
  version: z.number().int().positive().optional(),
})

export type RolePackGetOutput = z.infer<typeof RolePackGetOutputSchema>

/**
 * HTTP response schema for GET /role-pack
 */
export const RolePackHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    role: RoleSchema,
    content: z.string(),
    version: z.number().int().positive().optional(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
])

export type RolePackHttpResponse = z.infer<typeof RolePackHttpResponseSchema>
