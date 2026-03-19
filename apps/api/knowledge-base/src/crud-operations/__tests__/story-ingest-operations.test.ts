/**
 * Tests for story ingest operations: kb_ingest_story_from_yaml.
 *
 * Vitest unit tests with a mocked database — does not require a live DB.
 *
 * Test groups:
 *   ZOD: Zod schema validation (required fields, type coercion)
 *   MOCK: Mocked DB response produces correct return shape
 *   MSG: Message reflects insert vs update
 *
 * @see CDBE-2030 for implementation details
 */

import { describe, it, expect, vi } from 'vitest'
import { ZodError } from 'zod'
import {
  KbIngestStoryFromYamlInputSchema,
  KbIngestStoryFromYamlResultSchema,
  kb_ingest_story_from_yaml,
} from '../story-ingest-operations.js'

// ============================================================================
// ZOD: Input Schema Validation
// ============================================================================

describe('KbIngestStoryFromYamlInputSchema', () => {
  it('ZOD-1: accepts valid input with caller_agent_id and story_yaml', () => {
    const input = {
      caller_agent_id: 'dev-implement-leader',
      story_yaml: {
        story_id: 'CDBE-2030',
        title: 'Test story',
        feature: 'cdbe',
      },
    }
    const parsed = KbIngestStoryFromYamlInputSchema.parse(input)
    expect(parsed.caller_agent_id).toBe('dev-implement-leader')
    expect(parsed.story_yaml['story_id']).toBe('CDBE-2030')
  })

  it('ZOD-2: rejects empty caller_agent_id', () => {
    expect(() =>
      KbIngestStoryFromYamlInputSchema.parse({
        caller_agent_id: '',
        story_yaml: { story_id: 'X', title: 'T', feature: 'f' },
      }),
    ).toThrow(ZodError)
  })

  it('ZOD-3: rejects missing caller_agent_id', () => {
    expect(() =>
      KbIngestStoryFromYamlInputSchema.parse({
        story_yaml: { story_id: 'X', title: 'T', feature: 'f' },
      }),
    ).toThrow(ZodError)
  })

  it('ZOD-4: rejects missing story_yaml', () => {
    expect(() =>
      KbIngestStoryFromYamlInputSchema.parse({
        caller_agent_id: 'dev-implement-leader',
      }),
    ).toThrow(ZodError)
  })

  it('ZOD-5: accepts story_yaml with optional content array', () => {
    const input = {
      caller_agent_id: 'dev-implement-leader',
      story_yaml: {
        story_id: 'CDBE-2030',
        title: 'Test story',
        feature: 'cdbe',
        content: [
          { section_name: 'description', content_text: 'Some content', source_format: 'markdown' },
        ],
        dependencies: [{ depends_on_id: 'CDBE-1010', dependency_type: 'depends_on' }],
      },
    }
    const parsed = KbIngestStoryFromYamlInputSchema.parse(input)
    expect(parsed.story_yaml['content']).toBeDefined()
    expect(parsed.story_yaml['dependencies']).toBeDefined()
  })
})

// ============================================================================
// MOCK: Mocked DB response produces correct return shape
// ============================================================================

describe('kb_ingest_story_from_yaml', () => {
  function makeMockDb(row: {
    inserted_stories: number
    updated_stories: number
    upserted_content: number
    upserted_details: number
    inserted_dependencies: number
    skipped_dependencies: number
  }) {
    return {
      execute: vi.fn().mockResolvedValue({ rows: [row] }),
    } as any
  }

  it('MOCK-1: returns correct shape on insert (inserted_stories=1)', async () => {
    const mockDb = makeMockDb({
      inserted_stories: 1,
      updated_stories: 0,
      upserted_content: 2,
      upserted_details: 1,
      inserted_dependencies: 1,
      skipped_dependencies: 0,
    })

    const result = await kb_ingest_story_from_yaml(
      { db: mockDb },
      {
        caller_agent_id: 'dev-implement-leader',
        story_yaml: {
          story_id: 'CDBE-2030',
          title: 'Test story',
          feature: 'cdbe',
        },
      },
    )

    expect(result.inserted_stories).toBe(1)
    expect(result.updated_stories).toBe(0)
    expect(result.upserted_content).toBe(2)
    expect(result.upserted_details).toBe(1)
    expect(result.inserted_dependencies).toBe(1)
    expect(result.skipped_dependencies).toBe(0)
    expect(result.message).toContain('CDBE-2030')
    expect(result.message).toContain('created')
  })

  it('MOCK-2: returns correct shape on update (updated_stories=1)', async () => {
    const mockDb = makeMockDb({
      inserted_stories: 0,
      updated_stories: 1,
      upserted_content: 1,
      upserted_details: 0,
      inserted_dependencies: 0,
      skipped_dependencies: 1,
    })

    const result = await kb_ingest_story_from_yaml(
      { db: mockDb },
      {
        caller_agent_id: 'dev-implement-leader',
        story_yaml: {
          story_id: 'CDBE-2030',
          title: 'Updated story',
          feature: 'cdbe',
        },
      },
    )

    expect(result.inserted_stories).toBe(0)
    expect(result.updated_stories).toBe(1)
    expect(result.skipped_dependencies).toBe(1)
    expect(result.message).toContain('updated')
  })

  it('MOCK-3: passes caller_agent_id and story_yaml to DB execute', async () => {
    const mockDb = makeMockDb({
      inserted_stories: 1,
      updated_stories: 0,
      upserted_content: 0,
      upserted_details: 0,
      inserted_dependencies: 0,
      skipped_dependencies: 0,
    })

    await kb_ingest_story_from_yaml(
      { db: mockDb },
      {
        caller_agent_id: 'dev-implement-leader',
        story_yaml: { story_id: 'X-001', title: 'T', feature: 'x' },
      },
    )

    expect(mockDb.execute).toHaveBeenCalledTimes(1)
  })

  it('MOCK-4: result passes KbIngestStoryFromYamlResultSchema validation', async () => {
    const mockDb = makeMockDb({
      inserted_stories: 1,
      updated_stories: 0,
      upserted_content: 0,
      upserted_details: 1,
      inserted_dependencies: 2,
      skipped_dependencies: 0,
    })

    const result = await kb_ingest_story_from_yaml(
      { db: mockDb },
      {
        caller_agent_id: 'dev-implement-leader',
        story_yaml: { story_id: 'Y-001', title: 'T', feature: 'y' },
      },
    )

    // Should not throw
    const parsed = KbIngestStoryFromYamlResultSchema.parse(result)
    expect(parsed.inserted_stories).toBe(1)
    expect(parsed.upserted_details).toBe(1)
    expect(parsed.inserted_dependencies).toBe(2)
  })
})

// ============================================================================
// MSG: Message reflects insert vs update
// ============================================================================

describe('kb_ingest_story_from_yaml message', () => {
  it('MSG-1: message says "created" when inserted_stories > 0', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            inserted_stories: 1,
            updated_stories: 0,
            upserted_content: 0,
            upserted_details: 0,
            inserted_dependencies: 0,
            skipped_dependencies: 0,
          },
        ],
      }),
    } as any

    const result = await kb_ingest_story_from_yaml(
      { db: mockDb },
      {
        caller_agent_id: 'dev-implement-leader',
        story_yaml: { story_id: 'MSG-001', title: 'T', feature: 'm' },
      },
    )

    expect(result.message).toMatch(/created/)
    expect(result.message).toContain('MSG-001')
  })

  it('MSG-2: message says "updated" when inserted_stories = 0', async () => {
    const mockDb = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            inserted_stories: 0,
            updated_stories: 1,
            upserted_content: 0,
            upserted_details: 0,
            inserted_dependencies: 0,
            skipped_dependencies: 0,
          },
        ],
      }),
    } as any

    const result = await kb_ingest_story_from_yaml(
      { db: mockDb },
      {
        caller_agent_id: 'dev-implement-leader',
        story_yaml: { story_id: 'MSG-002', title: 'T', feature: 'm' },
      },
    )

    expect(result.message).toMatch(/updated/)
    expect(result.message).toContain('MSG-002')
  })
})
