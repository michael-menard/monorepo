/**
 * Knowledge Base Schema — barrel re-export
 *
 * Splits the schema by PostgreSQL schema namespace:
 *   schema/kb.ts        — public schema (knowledge entries, embeddings, ADRs, etc.)
 *   schema/workflow.ts  — workflow.* (stories, plans, agents, sessions, etc.)
 *   schema/artifacts.ts — artifacts.* (per-story pipeline artifacts)
 *   schema/analytics.ts — analytics.* (token usage, model experiments, assignments)
 *
 * All existing imports from this file continue to work unchanged.
 * See docs/architecture/databases.md for the full database map.
 */

export * from './schema/kb.js'
export * from './schema/workflow.js'
export * from './schema/artifacts.js'
export * from './schema/analytics.js'
export * from './schema/legacy.js'
