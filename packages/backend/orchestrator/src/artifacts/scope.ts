import { z } from 'zod'

/**
 * SCOPE.yaml Schema
 *
 * Captures what surfaces a story touches for diff-aware agent selection.
 * Written by setup leader, read by all subsequent phases.
 */

export const ScopeSchema = z.object({
  schema: z.literal(1),
  story_id: z.string(),
  timestamp: z.string().datetime(),

  // What areas the story touches
  touches: z.object({
    backend: z.boolean().default(false),
    frontend: z.boolean().default(false),
    packages: z.boolean().default(false),
    db: z.boolean().default(false),
    contracts: z.boolean().default(false),
    ui: z.boolean().default(false),
    infra: z.boolean().default(false),
  }),

  // Glob patterns for touched paths (for review worker selection)
  touched_paths_globs: z.array(z.string()).default([]),

  // Risk flags that trigger additional review
  risk_flags: z.object({
    auth: z.boolean().default(false),
    payments: z.boolean().default(false),
    migrations: z.boolean().default(false),
    external_apis: z.boolean().default(false),
    security: z.boolean().default(false),
    performance: z.boolean().default(false),
  }),

  // Brief summary of what the story changes
  summary: z.string().optional(),
})

export type Scope = z.infer<typeof ScopeSchema>

/**
 * Create initial scope from story analysis
 */
export function createScope(storyId: string): Scope {
  return {
    schema: 1,
    story_id: storyId,
    timestamp: new Date().toISOString(),
    touches: {
      backend: false,
      frontend: false,
      packages: false,
      db: false,
      contracts: false,
      ui: false,
      infra: false,
    },
    touched_paths_globs: [],
    risk_flags: {
      auth: false,
      payments: false,
      migrations: false,
      external_apis: false,
      security: false,
      performance: false,
    },
  }
}

/**
 * Infer scope from story content keywords
 */
export function inferScopeFromContent(content: string): Partial<Scope['touches']> {
  const lower = content.toLowerCase()
  return {
    backend: /\b(api|endpoint|handler|database|lambda|serverless|hono)\b/.test(lower),
    frontend: /\b(react|component|ui|page|form|tailwind|css)\b/.test(lower),
    packages: /\b(package|library|shared|core|util)\b/.test(lower),
    db: /\b(database|migration|schema|postgres|aurora|sql)\b/.test(lower),
    contracts: /\b(contract|api.*contract|schema|zod)\b/.test(lower),
    ui: /\b(button|modal|dialog|input|select|table|card)\b/.test(lower),
    infra: /\b(config|environment|deployment|aws|vercel|cloudformation)\b/.test(lower),
  }
}

/**
 * Infer risk flags from story content
 */
export function inferRiskFlags(content: string): Partial<Scope['risk_flags']> {
  const lower = content.toLowerCase()
  return {
    auth: /\b(auth|cognito|login|session|token|jwt|oauth)\b/.test(lower),
    payments: /\b(payment|stripe|billing|subscription|charge)\b/.test(lower),
    migrations: /\b(migration|alter.*table|add.*column|drizzle.*migrate)\b/.test(lower),
    external_apis: /\b(external.*api|third.*party|webhook|fetch.*http)\b/.test(lower),
    security: /\b(security|xss|sql.*injection|sanitize|escape|csrf)\b/.test(lower),
    performance: /\b(performance|optimize|cache|index|slow|latency)\b/.test(lower),
  }
}
