/**
 * Context Pack Schemas (local copy)
 *
 * Copied from @repo/context-pack-sidecar to break cyclic dependency.
 * Only the request schema is needed by the MCP server tool handlers/schemas.
 */

import { z } from 'zod'

export const DEFAULT_TTL = 3600

export const ContextPackRoleSchema = z.enum(['pm', 'dev', 'qa', 'po'], {
  errorMap: () => ({ message: 'role must be one of: pm, dev, qa, po' }),
})

export const ContextPackRequestSchema = z.object({
  story_id: z.string().min(1, 'story_id must not be empty'),
  node_type: z.string().min(1, 'node_type must not be empty'),
  role: ContextPackRoleSchema,
  ttl: z.number().int().positive().optional().default(DEFAULT_TTL),
})

export type ContextPackRequest = z.infer<typeof ContextPackRequestSchema>

export const ContextPackResponseSchema = z.object({
  story_brief: z.string(),
  kb_facts: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      relevance_score: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
  kb_rules: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      relevance_score: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
  kb_links: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      relevance_score: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
  repo_snippets: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      relevance_score: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
})

export type ContextPackResponse = z.infer<typeof ContextPackResponseSchema>
