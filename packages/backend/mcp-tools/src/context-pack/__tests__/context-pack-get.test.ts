/**
 * Integration Tests for context_pack_get MCP Tool
 * WINT-2020: Create Context Pack Sidecar — AC-6 (HP-3 coverage)
 *
 * Tests that the contextPackGet MCP tool wrapper returns a valid
 * ContextPackResponseSchema-shaped response.
 *
 * Uses real Postgres (port 5432, wint schema) for cache operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/db'
import { eq, and } from 'drizzle-orm'
import { contextPackGet } from '../context-pack-get.js'
import { ContextPackResponseSchema } from '@repo/context-pack-sidecar'

const TEST_STORY_ID = 'WINT-MCP-TEST'
const TEST_NODE_TYPE = 'mcp-get-test'

beforeEach(async () => {
  try {
    await db.delete(contextPacks).where(
      and(
        eq(contextPacks.packType, 'story'),
        eq(contextPacks.packKey, `${TEST_STORY_ID}:${TEST_NODE_TYPE}:dev`),
      ),
    )
  } catch {
    // DB may not be available
  }
})

afterEach(async () => {
  try {
    await db.delete(contextPacks).where(
      and(
        eq(contextPacks.packType, 'story'),
        eq(contextPacks.packKey, `${TEST_STORY_ID}:${TEST_NODE_TYPE}:dev`),
      ),
    )
  } catch {
    // DB may not be available
  }
})

describe('contextPackGet MCP tool (HP-3, AC-6)', () => {
  it('returns ContextPackResponseSchema-valid response', async () => {
    const result = await contextPackGet({
      story_id: TEST_STORY_ID,
      node_type: TEST_NODE_TYPE,
      role: 'dev',
    })

    // contextPackGet returns null on error — should return a response here
    expect(result).not.toBeNull()

    if (result) {
      // Validate against ContextPackResponseSchema
      const validation = ContextPackResponseSchema.safeParse(result)
      expect(validation.success).toBe(true)

      // All array fields must be arrays (not null/undefined)
      expect(Array.isArray(result.kb_facts)).toBe(true)
      expect(Array.isArray(result.kb_rules)).toBe(true)
      expect(Array.isArray(result.kb_links)).toBe(true)
      expect(Array.isArray(result.repo_snippets)).toBe(true)
      expect(typeof result.story_brief).toBe('string')
    }
  })

  it('handles invalid input by returning null (not throwing)', async () => {
    // Invalid role — contextPackGet should catch the ZodError and return null
    const result = await contextPackGet({
      story_id: TEST_STORY_ID,
      node_type: TEST_NODE_TYPE,
      role: 'invalid-role' as any,
    })

    expect(result).toBeNull()
  })
})
