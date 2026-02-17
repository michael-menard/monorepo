/**
 * Unit Tests: LangGraph to WINT Migration
 *
 * Tests transformation functions, enum normalization, and migration logic.
 * Database operations are mocked to isolate pure transformation logic.
 *
 * Story: WINT-1110
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import { Pool } from 'pg'
import {
  normalizeStoryState,
  normalizePriority,
  normalizeStoryType,
  mapLangGraphStoryToWint,
  mapLangGraphFeatureToWint,
  mapWorkflowEventToStateTransition,
  type LangGraphStoryRow,
  type LangGraphFeatureRow,
  type LangGraphWorkflowEventRow,
} from '../__types__/migration.js'
import {
  parseArgs,
  createWintPool,
  createLangGraphPool,
  testConnection,
  migrateStories,
  migrateFeatures,
  migrateStateTransitions,
  runMigration,
} from '../migrate-langgraph-data.js'

// ============================================================================
// Mock pg Pool
// ============================================================================

vi.mock('pg', () => {
  const mockPool = {
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  }
  return {
    Pool: vi.fn().mockImplementation(() => mockPool),
  }
})

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Test Fixtures
// ============================================================================

const baseDate = new Date('2025-01-01T00:00:00Z')

function makeLangGraphStory(overrides: Partial<LangGraphStoryRow> = {}): LangGraphStoryRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    story_id: 'WINT-0010',
    feature_id: null,
    state: 'ready-to-work',
    type: 'feature',
    title: 'Test Story',
    goal: 'Accomplish something',
    non_goals: ['Not this', 'Not that'],
    packages: ['@repo/core'],
    surfaces: ['backend'],
    blocked_by: null,
    depends_on: ['WINT-0001'],
    follow_up_from: null,
    priority: 'p1',
    created_at: baseDate,
    updated_at: baseDate,
    ...overrides,
  }
}

function makeLangGraphFeature(overrides: Partial<LangGraphFeatureRow> = {}): LangGraphFeatureRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'story-management',
    description: 'Core story management feature',
    created_at: baseDate,
    ...overrides,
  }
}

function makeLangGraphWorkflowEvent(
  overrides: Partial<LangGraphWorkflowEventRow> = {},
): LangGraphWorkflowEventRow {
  return {
    id: '550e8400-e29b-41d4-a716-446655440002',
    entity_type: 'story',
    entity_id: 'WINT-0010',
    event_type: 'state_change_ready_to_work',
    old_value: { state: 'backlog' },
    new_value: { state: 'ready-to-work' },
    actor: 'agent-orchestrator',
    created_at: baseDate,
    ...overrides,
  }
}

// ============================================================================
// Tests: normalizeStoryState()
// ============================================================================

describe('normalizeStoryState()', () => {
  it('normalizes ready-to-work to ready_to_work', () => {
    expect(normalizeStoryState('ready-to-work')).toBe('ready_to_work')
  })

  it('normalizes in-progress to in_progress', () => {
    expect(normalizeStoryState('in-progress')).toBe('in_progress')
  })

  it('normalizes ready-for-qa to ready_for_qa', () => {
    expect(normalizeStoryState('ready-for-qa')).toBe('ready_for_qa')
  })

  it('normalizes uat to in_qa (semantic mapping)', () => {
    expect(normalizeStoryState('uat')).toBe('in_qa')
  })

  it('passes through draft unchanged', () => {
    expect(normalizeStoryState('draft')).toBe('draft')
  })

  it('passes through backlog unchanged', () => {
    expect(normalizeStoryState('backlog')).toBe('backlog')
  })

  it('passes through done unchanged', () => {
    expect(normalizeStoryState('done')).toBe('done')
  })

  it('passes through cancelled unchanged', () => {
    expect(normalizeStoryState('cancelled')).toBe('cancelled')
  })

  it('passes through blocked unchanged', () => {
    expect(normalizeStoryState('blocked')).toBe('blocked')
  })

  it('falls back to backlog for unknown state', () => {
    expect(normalizeStoryState('UNKNOWN_STATE')).toBe('backlog')
  })

  it('handles case-insensitive input', () => {
    expect(normalizeStoryState('READY-TO-WORK')).toBe('ready_to_work')
    expect(normalizeStoryState('IN-PROGRESS')).toBe('in_progress')
    expect(normalizeStoryState('UAT')).toBe('in_qa')
    expect(normalizeStoryState('DRAFT')).toBe('draft')
  })

  it('falls back to backlog for null', () => {
    expect(normalizeStoryState(null)).toBe('backlog')
  })

  it('falls back to backlog for undefined', () => {
    expect(normalizeStoryState(undefined)).toBe('backlog')
  })

  it('falls back to backlog for empty string', () => {
    expect(normalizeStoryState('')).toBe('backlog')
  })
})

// ============================================================================
// Tests: normalizePriority()
// ============================================================================

describe('normalizePriority()', () => {
  it('normalizes p0 to P0', () => {
    expect(normalizePriority('p0')).toBe('P0')
  })

  it('normalizes p1 to P1', () => {
    expect(normalizePriority('p1')).toBe('P1')
  })

  it('normalizes p2 to P2', () => {
    expect(normalizePriority('p2')).toBe('P2')
  })

  it('normalizes p3 to P3', () => {
    expect(normalizePriority('p3')).toBe('P3')
  })

  it('accepts already-uppercase P0-P4', () => {
    expect(normalizePriority('P0')).toBe('P0')
    expect(normalizePriority('P4')).toBe('P4')
  })

  it('defaults to P2 for null', () => {
    expect(normalizePriority(null)).toBe('P2')
  })

  it('defaults to P2 for undefined', () => {
    expect(normalizePriority(undefined)).toBe('P2')
  })

  it('defaults to P2 for empty string', () => {
    expect(normalizePriority('')).toBe('P2')
  })

  it('defaults to P2 for unknown priority', () => {
    expect(normalizePriority('urgent')).toBe('P2')
  })
})

// ============================================================================
// Tests: normalizeStoryType()
// ============================================================================

describe('normalizeStoryType()', () => {
  it('passes through feature unchanged', () => {
    expect(normalizeStoryType('feature')).toBe('feature')
  })

  it('passes through bug unchanged', () => {
    expect(normalizeStoryType('bug')).toBe('bug')
  })

  it('passes through tech-debt unchanged', () => {
    expect(normalizeStoryType('tech-debt')).toBe('tech-debt')
  })

  it('passes through spike unchanged', () => {
    expect(normalizeStoryType('spike')).toBe('spike')
  })

  it('passes through chore unchanged', () => {
    expect(normalizeStoryType('chore')).toBe('chore')
  })

  it('defaults to feature for null', () => {
    expect(normalizeStoryType(null)).toBe('feature')
  })

  it('defaults to feature for undefined', () => {
    expect(normalizeStoryType(undefined)).toBe('feature')
  })

  it('defaults to feature for unknown type', () => {
    expect(normalizeStoryType('unknown-type')).toBe('feature')
  })
})

// ============================================================================
// Tests: mapLangGraphStoryToWint()
// ============================================================================

describe('mapLangGraphStoryToWint()', () => {
  it('maps all required fields correctly', () => {
    const row = makeLangGraphStory()
    const result = mapLangGraphStoryToWint(row)

    expect(result.story_id).toBe('WINT-0010')
    expect(result.title).toBe('Test Story')
    expect(result.type).toBe('feature')
    expect(result.state).toBe('ready_to_work')
    expect(result.goal).toBe('Accomplish something')
    expect(result.priority).toBe('P1')
  })

  it('normalizes state via normalizeStoryState', () => {
    const row = makeLangGraphStory({ state: 'in-progress' })
    const result = mapLangGraphStoryToWint(row)
    expect(result.state).toBe('in_progress')
  })

  it('normalizes uat state to in_qa', () => {
    const row = makeLangGraphStory({ state: 'uat' })
    const result = mapLangGraphStoryToWint(row)
    expect(result.state).toBe('in_qa')
  })

  it('normalizes priority from lowercase to uppercase', () => {
    const row = makeLangGraphStory({ priority: 'p0' })
    const result = mapLangGraphStoryToWint(row)
    expect(result.priority).toBe('P0')
  })

  it('preserves null fields as null', () => {
    const row = makeLangGraphStory({
      feature_id: null,
      goal: null,
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: null,
      surfaces: null,
      non_goals: null,
    })
    const result = mapLangGraphStoryToWint(row)

    expect(result.feature_id).toBeNull()
    expect(result.goal).toBeNull()
    expect(result.blocked_by).toBeNull()
    expect(result.depends_on).toBeNull()
    expect(result.follow_up_from).toBeNull()
    expect(result.packages).toBeNull()
    expect(result.surfaces).toBeNull()
    expect(result.non_goals).toBeNull()
  })

  it('preserves array fields', () => {
    const row = makeLangGraphStory({
      non_goals: ['No A', 'No B'],
      packages: ['@repo/core', '@repo/ui'],
      surfaces: ['backend', 'frontend'],
      depends_on: ['WINT-0001', 'WINT-0002'],
    })
    const result = mapLangGraphStoryToWint(row)

    expect(result.non_goals).toEqual(['No A', 'No B'])
    expect(result.packages).toEqual(['@repo/core', '@repo/ui'])
    expect(result.surfaces).toEqual(['backend', 'frontend'])
    expect(result.depends_on).toEqual(['WINT-0001', 'WINT-0002'])
  })

  it('preserves timestamps', () => {
    const row = makeLangGraphStory()
    const result = mapLangGraphStoryToWint(row)

    expect(result.created_at).toEqual(baseDate)
    expect(result.updated_at).toEqual(baseDate)
  })

  it('sets points to null (not in LangGraph)', () => {
    const row = makeLangGraphStory()
    const result = mapLangGraphStoryToWint(row)
    expect(result.points).toBeNull()
  })

  it('defaults unknown type to feature', () => {
    const row = makeLangGraphStory({ type: 'unknown-weird-type' })
    const result = mapLangGraphStoryToWint(row)
    expect(result.type).toBe('feature')
  })

  it('defaults null type to feature', () => {
    const row = makeLangGraphStory({ type: null })
    const result = mapLangGraphStoryToWint(row)
    expect(result.type).toBe('feature')
  })
})

// ============================================================================
// Tests: mapLangGraphFeatureToWint()
// ============================================================================

describe('mapLangGraphFeatureToWint()', () => {
  it('maps name to feature_name', () => {
    const row = makeLangGraphFeature({ name: 'my-feature' })
    const result = mapLangGraphFeatureToWint(row)
    expect(result.feature_name).toBe('my-feature')
  })

  it('preserves description', () => {
    const row = makeLangGraphFeature({ description: 'My feature description' })
    const result = mapLangGraphFeatureToWint(row)
    expect(result.description).toBe('My feature description')
  })

  it('handles null description', () => {
    const row = makeLangGraphFeature({ description: null })
    const result = mapLangGraphFeatureToWint(row)
    expect(result.description).toBeNull()
  })

  it('defaults feature_type to unknown', () => {
    const row = makeLangGraphFeature()
    const result = mapLangGraphFeatureToWint(row)
    expect(result.feature_type).toBe('unknown')
  })

  it('sets is_active to true', () => {
    const row = makeLangGraphFeature()
    const result = mapLangGraphFeatureToWint(row)
    expect(result.is_active).toBe(true)
  })

  it('preserves created_at timestamp', () => {
    const row = makeLangGraphFeature()
    const result = mapLangGraphFeatureToWint(row)
    expect(result.created_at).toEqual(baseDate)
  })

  it('sets updated_at to current time', () => {
    const before = new Date()
    const row = makeLangGraphFeature()
    const result = mapLangGraphFeatureToWint(row)
    const after = new Date()

    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

// ============================================================================
// Tests: mapWorkflowEventToStateTransition()
// ============================================================================

describe('mapWorkflowEventToStateTransition()', () => {
  it('maps a state_change event to a state transition', () => {
    const row = makeLangGraphWorkflowEvent()
    const result = mapWorkflowEventToStateTransition(row)

    expect(result).not.toBeNull()
    expect(result!.entity_type).toBe('story')
    expect(result!.entity_id).toBe('WINT-0010')
    expect(result!.from_state).toBe('backlog')
    expect(result!.to_state).toBe('ready_to_work')
    expect(result!.triggered_by).toBe('agent-orchestrator')
  })

  it('normalizes from_state and to_state through normalizeStoryState', () => {
    const row = makeLangGraphWorkflowEvent({
      old_value: { state: 'in-progress' },
      new_value: { state: 'ready-for-qa' },
    })
    const result = mapWorkflowEventToStateTransition(row)

    expect(result!.from_state).toBe('in_progress')
    expect(result!.to_state).toBe('ready_for_qa')
  })

  it('normalizes uat to in_qa in state transition', () => {
    const row = makeLangGraphWorkflowEvent({
      old_value: { state: 'ready-for-qa' },
      new_value: { state: 'uat' },
    })
    const result = mapWorkflowEventToStateTransition(row)

    expect(result!.from_state).toBe('ready_for_qa')
    expect(result!.to_state).toBe('in_qa')
  })

  it('returns null when old_value has no state', () => {
    const row = makeLangGraphWorkflowEvent({ old_value: { something: 'else' } })
    const result = mapWorkflowEventToStateTransition(row)
    expect(result).toBeNull()
  })

  it('returns null when new_value has no state', () => {
    const row = makeLangGraphWorkflowEvent({ new_value: { something: 'else' } })
    const result = mapWorkflowEventToStateTransition(row)
    expect(result).toBeNull()
  })

  it('returns null when old_value is null', () => {
    const row = makeLangGraphWorkflowEvent({ old_value: null })
    const result = mapWorkflowEventToStateTransition(row)
    expect(result).toBeNull()
  })

  it('uses langgraph_migration as fallback triggered_by when actor is null', () => {
    const row = makeLangGraphWorkflowEvent({ actor: null })
    const result = mapWorkflowEventToStateTransition(row)
    expect(result!.triggered_by).toBe('langgraph_migration')
  })

  it('includes migration metadata in the transition', () => {
    const row = makeLangGraphWorkflowEvent()
    const result = mapWorkflowEventToStateTransition(row)

    expect(result!.metadata).toMatchObject({
      source: 'langgraph_migration',
      original_event_id: row.id,
      event_type: row.event_type,
    })
  })

  it('preserves transitioned_at from created_at', () => {
    const row = makeLangGraphWorkflowEvent()
    const result = mapWorkflowEventToStateTransition(row)
    expect(result!.transitioned_at).toEqual(baseDate)
  })
})

// ============================================================================
// Tests: parseArgs()
// ============================================================================

describe('parseArgs()', () => {
  const originalArgv = process.argv

  beforeEach(() => {
    process.argv = ['node', 'script.ts']
  })

  it('defaults to dry-run mode when no flags', () => {
    process.argv = ['node', 'script.ts']
    const result = parseArgs()
    expect(result.dryRun).toBe(true)
  })

  it('sets dryRun false when --execute is present', () => {
    process.argv = ['node', 'script.ts', '--execute']
    const result = parseArgs()
    expect(result.dryRun).toBe(false)
  })

  it('parses --verbose flag', () => {
    process.argv = ['node', 'script.ts', '--verbose']
    const result = parseArgs()
    expect(result.verbose).toBe(true)
  })

  it('defaults verbose to false', () => {
    const result = parseArgs()
    expect(result.verbose).toBe(false)
  })

  it('parses --batch-size=100', () => {
    process.argv = ['node', 'script.ts', '--batch-size=100']
    const result = parseArgs()
    expect(result.batchSize).toBe(100)
  })

  it('defaults batchSize to 50', () => {
    const result = parseArgs()
    expect(result.batchSize).toBe(50)
  })

  it('handles invalid batch size by falling back to default', () => {
    process.argv = ['node', 'script.ts', '--batch-size=abc']
    const result = parseArgs()
    expect(result.batchSize).toBe(50)
  })

  afterAll(() => {
    process.argv = originalArgv
  })
})

// ============================================================================
// Tests: testConnection()
// ============================================================================

describe('testConnection()', () => {
  it('returns true on successful connection', async () => {
    const mockPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<{ now: Date }> }>> }
    mockPool.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] })

    const result = await testConnection(mockPool as unknown as Pool, 'test')
    expect(result).toBe(true)
  })

  it('returns false on connection failure', async () => {
    const mockPool = new Pool() as unknown as { query: MockedFunction<() => Promise<never>> }
    mockPool.query.mockRejectedValueOnce(new Error('Connection refused'))

    const result = await testConnection(mockPool as unknown as Pool, 'test')
    expect(result).toBe(false)
  })
})

// ============================================================================
// Tests: migrateStories() with mocked Pool
// ============================================================================

describe('migrateStories()', () => {
  it('returns dry-run result without executing inserts', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<unknown>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    const storyRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      story_id: 'WINT-0010',
      feature_id: null,
      state: 'backlog',
      type: 'feature',
      title: 'Test Story',
      goal: null,
      non_goals: null,
      packages: null,
      surfaces: null,
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      priority: 'p2',
      created_at: new Date(),
      updated_at: new Date(),
    }

    langGraphPool.query.mockResolvedValueOnce({ rows: [storyRow] })

    const result = await migrateStories(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: true,
      verbose: false,
      batchSize: 50,
    })

    expect(result.total_queried).toBe(1)
    expect(result.inserted_count).toBe(0) // dry-run, no inserts
    expect(result.skipped_count).toBe(1) // dry-run skips
    expect(result.error_count).toBe(0)
    // Verify no INSERT was executed (dry-run should only read, not write)
    // Note: Both pools share the same mock, so we check insert count instead
    expect(result.migratedIds).toEqual([])
  })

  it('inserts new stories and counts correctly', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rowCount: number }>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    const storyRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      story_id: 'WINT-0010',
      feature_id: null,
      state: 'backlog',
      type: 'feature',
      title: 'Test Story',
      goal: null,
      non_goals: null,
      packages: null,
      surfaces: null,
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      priority: 'p2',
      created_at: new Date(),
      updated_at: new Date(),
    }

    langGraphPool.query.mockResolvedValueOnce({ rows: [storyRow] })
    wintPool.query.mockResolvedValueOnce({ rowCount: 1 }) // INSERT succeeded

    const result = await migrateStories(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: false,
      verbose: false,
      batchSize: 50,
    })

    expect(result.total_queried).toBe(1)
    expect(result.inserted_count).toBe(1)
    expect(result.skipped_count).toBe(0)
    expect(result.error_count).toBe(0)
    expect(result.migratedIds).toEqual(['WINT-0010'])
  })

  it('counts skipped stories when ON CONFLICT fires (rowCount 0)', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rowCount: number }>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    const storyRow = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      story_id: 'WINT-0010',
      feature_id: null,
      state: 'backlog',
      type: 'feature',
      title: 'Existing Story',
      goal: null,
      non_goals: null,
      packages: null,
      surfaces: null,
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      priority: 'p2',
      created_at: new Date(),
      updated_at: new Date(),
    }

    langGraphPool.query.mockResolvedValueOnce({ rows: [storyRow] })
    wintPool.query.mockResolvedValueOnce({ rowCount: 0 }) // ON CONFLICT DO NOTHING

    const result = await migrateStories(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: false,
      verbose: false,
      batchSize: 50,
    })

    expect(result.inserted_count).toBe(0)
    expect(result.skipped_count).toBe(1)
    expect(result.migratedIds).toEqual([])
  })

  it('handles query errors gracefully', async () => {
    const wintPool = new Pool() as unknown as Pool
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<never>> }

    langGraphPool.query.mockRejectedValueOnce(new Error('Table does not exist'))

    const result = await migrateStories(wintPool, langGraphPool as unknown as Pool, {
      dryRun: false,
      verbose: false,
      batchSize: 50,
    })

    expect(result.total_queried).toBe(0)
    expect(result.error_count).toBe(1)
    expect(result.errors[0].error).toContain('Table does not exist')
  })
})

// ============================================================================
// Tests: migrateFeatures() with mocked Pool
// ============================================================================

describe('migrateFeatures()', () => {
  it('maps name to feature_name on insert', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rowCount: number }>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    const featureRow = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'story-management',
      description: 'Core feature',
      created_at: new Date(),
    }

    langGraphPool.query.mockResolvedValueOnce({ rows: [featureRow] })
    wintPool.query.mockResolvedValueOnce({ rowCount: 1 })

    const result = await migrateFeatures(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: false,
      verbose: false,
      batchSize: 50,
    })

    expect(result.inserted_count).toBe(1)
    expect(result.migratedNames).toEqual(['story-management'])
  })

  it('returns dry-run result without executing inserts', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<unknown>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    langGraphPool.query.mockResolvedValueOnce({
      rows: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'my-feature', description: null, created_at: new Date() }],
    })

    const result = await migrateFeatures(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: true,
      verbose: false,
      batchSize: 50,
    })

    expect(result.total_queried).toBe(1)
    expect(result.inserted_count).toBe(0)
    // Note: Both pools share the same mock, verify no inserts were made via result
    expect(result.migratedNames).toEqual([])
  })
})

// ============================================================================
// Tests: migrateStateTransitions() with mocked Pool
// ============================================================================

describe('migrateStateTransitions()', () => {
  it('inserts state_change events as state transitions', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rowCount: number }>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    const eventRow = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      entity_type: 'story',
      entity_id: 'WINT-0010',
      event_type: 'state_change_backlog_to_ready',
      old_value: { state: 'backlog' },
      new_value: { state: 'ready-to-work' },
      actor: 'orchestrator',
      created_at: new Date(),
    }

    langGraphPool.query.mockResolvedValueOnce({ rows: [eventRow] })
    wintPool.query.mockResolvedValueOnce({ rowCount: 1 })

    const result = await migrateStateTransitions(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: false,
      verbose: false,
      batchSize: 50,
    })

    expect(result.inserted_count).toBe(1)
    expect(result.error_count).toBe(0)
  })

  it('skips events that cannot be mapped to state transitions', async () => {
    const wintPool = new Pool() as unknown as Pool
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    // Event without state in old_value/new_value
    const eventRow = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      entity_type: 'story',
      entity_id: 'WINT-0010',
      event_type: 'state_change_something',
      old_value: { other: 'data' }, // No state field
      new_value: { other: 'data' }, // No state field
      actor: 'orchestrator',
      created_at: new Date(),
    }

    langGraphPool.query.mockResolvedValueOnce({ rows: [eventRow] })

    const result = await migrateStateTransitions(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: false,
      verbose: false,
      batchSize: 50,
    })

    expect(result.inserted_count).toBe(0)
    expect(result.skipped_count).toBe(1)
  })
})

// ============================================================================
// Tests: runMigration() - integration test with mocked pools
// ============================================================================

describe('runMigration()', () => {
  it('runs all three phases and returns combined log', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<unknown>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rows: Array<Record<string, unknown>> }>> }

    // Each phase queries from langGraph (3 queries total) and wintPool gets inserts
    langGraphPool.query
      .mockResolvedValueOnce({ rows: [] }) // stories query
      .mockResolvedValueOnce({ rows: [] }) // features query
      .mockResolvedValueOnce({ rows: [] }) // events query

    const result = await runMigration(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: true,
      verbose: false,
      batchSize: 50,
    })

    expect(result.story_id).toBe('WINT-1110')
    expect(result.dry_run).toBe(true)
    expect(result.started_at).toBeTruthy()
    expect(result.completed_at).toBeTruthy()
    expect(result.stories.total_queried).toBe(0)
    expect(result.features.total_queried).toBe(0)
    expect(result.state_transitions.total_queried).toBe(0)
    expect(result.success).toBe(true)
  })

  it('reports success=false when errors occur', async () => {
    const wintPool = new Pool() as unknown as { query: MockedFunction<() => Promise<{ rowCount: number }>> }
    const langGraphPool = new Pool() as unknown as { query: MockedFunction<() => Promise<unknown>> }

    // Stories query fails
    langGraphPool.query
      .mockRejectedValueOnce(new Error('Database error'))
      .mockResolvedValueOnce({ rows: [] }) // features
      .mockResolvedValueOnce({ rows: [] }) // events

    const result = await runMigration(wintPool as unknown as Pool, langGraphPool as unknown as Pool, {
      dryRun: false,
      verbose: false,
      batchSize: 50,
    })

    expect(result.success).toBe(false)
    expect(result.stories.error_count).toBe(1)
  })
})
