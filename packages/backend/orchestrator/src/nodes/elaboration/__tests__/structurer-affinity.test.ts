/**
 * Structurer + Affinity Integration Unit Tests
 *
 * APIP-3050 AC-5, AC-7, AC-11, AC-13:
 *   - AC-5: Structural fields unchanged after affinity guidance applied
 *   - AC-7: affinityEnabled:false → DB never called, output identical to APIP-1010 baseline
 *   - AC-11: EC-2 (affinityEnabled:false), EC-3 (minConfidence gate), EC-4 (maxWeight:0.0)
 *   - AC-13: Regression guard — existing structurer behavior unchanged
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GraphState } from '../../../state/index.js'

// Mock @repo/logger — MUST be before any imports that use it
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock node-factory to avoid @langchain/ollama transitive dependency
vi.mock('../../../runner/node-factory.js', () => ({
  createToolNode: vi.fn((_name: string, fn: (state: unknown) => Promise<unknown>) => fn),
  createNode: vi.fn((_config: unknown, fn: (state: unknown) => Promise<unknown>) => fn),
  createLLMNode: vi.fn((_name: string, fn: (state: unknown) => Promise<unknown>) => fn),
  createSimpleNode: vi.fn((_name: string, fn: (state: unknown) => Promise<unknown>) => fn),
}))

// Mock affinity-reader module — will be configured per test
const mockReadAffinityProfiles = vi.fn()
vi.mock('../affinity-reader.js', () => ({
  readAffinityProfiles: mockReadAffinityProfiles,
  extractFileType: (path: string) => {
    const lastDot = path.lastIndexOf('.')
    if (lastDot === -1) return 'unknown'
    return path.slice(lastDot + 1).toLowerCase()
  },
}))

import { createStructurerNode, StructurerConfigSchema } from '../structurer.js'
import type { ChangeOutlineItem } from '../structurer.js'

// ============================================================================
// Test fixtures
// ============================================================================

type TestState = GraphState & {
  storyId: string
  currentStory: {
    acceptanceCriteria: Array<{ id: string; description: string }>
  } | null
  escapeHatchResult?: unknown
  warnings?: string[]
}

function createTestState(overrides: Partial<TestState> = {}): TestState {
  return {
    storyId: 'apip-3050',
    currentStory: {
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Create React component for user login form' },
        { id: 'AC-2', description: 'Add database migration for sessions table' },
      ],
    },
    escapeHatchResult: null,
    warnings: [],
    routingFlags: { blocked: false },
    errors: [],
    ...overrides,
  } as TestState
}

function makeAffinityGuidance(overrides: Partial<{
  modelId: string
  changeType: string
  fileType: string
  preferredChangePattern: string
  successRate: number
  sampleCount: number
  confidence: number
}> = {}) {
  return {
    modelId: 'haiku',
    changeType: 'create',
    fileType: 'tsx',
    preferredChangePattern: 'create-new-file',
    successRate: 0.92,
    sampleCount: 45,
    confidence: 0.9,
    ...overrides,
  }
}

// ============================================================================
// EC-2: affinityEnabled:false — DB never called
// ============================================================================

describe('EC-2: affinityEnabled:false — DB never queried', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call readAffinityProfiles when affinityEnabled is false', async () => {
    const node = createStructurerNode({ affinityConfig: { affinityEnabled: false } })
    const state = createTestState()

    await node(state as unknown as GraphState)

    // readAffinityProfiles should NOT be called
    expect(mockReadAffinityProfiles).not.toHaveBeenCalled()
  })

  it('returns output identical to APIP-1010 baseline (AC-7)', async () => {
    // Baseline: structurer with no affinity config
    const baselineNode = createStructurerNode({})
    const affinityDisabledNode = createStructurerNode({ affinityConfig: { affinityEnabled: false } })

    const state = createTestState()
    const baselineResult = await baselineNode(state as unknown as GraphState)
    const affinityResult = await affinityDisabledNode(state as unknown as GraphState)

    // Both should produce identical changeOutline (same heuristics)
    expect(affinityResult.changeOutline).toEqual(baselineResult.changeOutline)
    expect(affinityResult.splitRequired).toEqual(baselineResult.splitRequired)
    expect(affinityResult.splitReason).toEqual(baselineResult.splitReason)
    expect(affinityResult.structurerComplete).toBe(true)
  })
})

// ============================================================================
// EC-3: minAffinityConfidence gate
// ============================================================================

describe('EC-3: minAffinityConfidence gate — low confidence rows ignored', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not set extensions when guidance.confidence < minAffinityConfidence', async () => {
    const lowConfidenceGuidance = makeAffinityGuidance({ confidence: 0.3 }) // below threshold

    mockReadAffinityProfiles.mockResolvedValue({
      map: new Map([
        ['CO-1', lowConfidenceGuidance],
        ['CO-2', lowConfidenceGuidance],
      ]),
      fallbackUsed: false,
    })

    const node = createStructurerNode(
      {
        affinityConfig: {
          affinityEnabled: true,
          minAffinityConfidence: 0.7, // threshold
          maxAffinityWeight: 0.8,
        },
      },
      { select: vi.fn() }, // mock db
    )

    const state = createTestState()
    const result = await node(state as unknown as GraphState)

    const items = result.changeOutline as ChangeOutlineItem[]
    for (const item of items) {
      // extensions.preferredChangePattern should NOT be set (confidence < threshold)
      expect(item.extensions?.preferredChangePattern).toBeUndefined()
    }
  })

  it('sets extensions when guidance.confidence >= minAffinityConfidence', async () => {
    const highConfidenceGuidance = makeAffinityGuidance({ confidence: 0.9 }) // above threshold

    mockReadAffinityProfiles.mockResolvedValue({
      map: new Map([['CO-1', highConfidenceGuidance]]),
      fallbackUsed: false,
    })

    // Single AC state
    const state = createTestState({
      currentStory: {
        acceptanceCriteria: [{ id: 'AC-1', description: 'Create component for login' }],
      },
    })

    const node = createStructurerNode(
      {
        affinityConfig: {
          affinityEnabled: true,
          minAffinityConfidence: 0.7,
          maxAffinityWeight: 0.8,
        },
      },
      { select: vi.fn() },
    )

    const result = await node(state as unknown as GraphState)
    const items = result.changeOutline as ChangeOutlineItem[]
    expect(items[0].extensions?.preferredChangePattern).toBe('create-new-file')
  })
})

// ============================================================================
// EC-4: maxAffinityWeight:0.0 — no patterns applied even with data
// ============================================================================

describe('EC-4: maxAffinityWeight:0.0 — no affinity applied', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call readAffinityProfiles when maxAffinityWeight is 0.0', async () => {
    const node = createStructurerNode(
      {
        affinityConfig: {
          affinityEnabled: true,
          minAffinityConfidence: 0.7,
          maxAffinityWeight: 0.0, // zero weight → skip
        },
      },
      { select: vi.fn() },
    )

    const state = createTestState()
    await node(state as unknown as GraphState)

    expect(mockReadAffinityProfiles).not.toHaveBeenCalled()
  })

  it('returns items without extensions when maxAffinityWeight is 0.0', async () => {
    const node = createStructurerNode(
      {
        affinityConfig: {
          affinityEnabled: true,
          maxAffinityWeight: 0.0,
        },
      },
      { select: vi.fn() },
    )

    const state = createTestState()
    const result = await node(state as unknown as GraphState)

    const items = result.changeOutline as ChangeOutlineItem[]
    for (const item of items) {
      expect(item.extensions?.preferredChangePattern).toBeUndefined()
    }
  })
})

// ============================================================================
// AC-5: Structural fields unchanged after affinity guidance applied
// ============================================================================

describe('AC-5: Structural fields unchanged after affinity guidance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves complexity, estimatedAtomicChanges, filePath, changeType, description, relatedAcIds', async () => {
    // Run baseline (no affinity) to get expected structural values
    const baselineNode = createStructurerNode({})
    const state = createTestState()
    const baselineResult = await baselineNode(state as unknown as GraphState)
    const baselineItems = baselineResult.changeOutline as ChangeOutlineItem[]

    // Now run with affinity enabled and mock data
    const affinityGuidance = makeAffinityGuidance({ confidence: 0.9 })
    mockReadAffinityProfiles.mockResolvedValue({
      map: new Map(baselineItems.map(item => [item.id, affinityGuidance])),
      fallbackUsed: false,
    })

    const affinityNode = createStructurerNode(
      {
        affinityConfig: {
          affinityEnabled: true,
          minAffinityConfidence: 0.7,
          maxAffinityWeight: 0.8,
        },
      },
      { select: vi.fn() },
    )

    const affinityResult = await affinityNode(state as unknown as GraphState)
    const affinityItems = affinityResult.changeOutline as ChangeOutlineItem[]

    // Structural fields must be identical
    for (let i = 0; i < baselineItems.length; i++) {
      expect(affinityItems[i].complexity).toBe(baselineItems[i].complexity)
      expect(affinityItems[i].estimatedAtomicChanges).toBe(baselineItems[i].estimatedAtomicChanges)
      expect(affinityItems[i].filePath).toBe(baselineItems[i].filePath)
      expect(affinityItems[i].changeType).toBe(baselineItems[i].changeType)
      expect(affinityItems[i].description).toBe(baselineItems[i].description)
      expect(affinityItems[i].relatedAcIds).toEqual(baselineItems[i].relatedAcIds)
    }

    // Affinity items should have extensions.preferredChangePattern set
    for (const item of affinityItems) {
      expect(item.extensions?.preferredChangePattern).toBe('create-new-file')
    }
  })
})

// ============================================================================
// Null DB guard: affinityEnabled:true but db not provided
// ============================================================================

describe('Null DB guard: affinityEnabled:true but no db provided', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back gracefully with warning when affinityEnabled:true but db is undefined', async () => {
    const { logger } = await import('@repo/logger')

    // Create node with affinityEnabled:true but no db
    const node = createStructurerNode({
      affinityConfig: {
        affinityEnabled: true,
        minAffinityConfidence: 0.7,
        maxAffinityWeight: 0.8,
      },
    }) // no affinityDb argument

    const state = createTestState()
    const result = await node(state as unknown as GraphState)

    // Should complete without error
    expect(result.structurerComplete).toBe(true)
    expect(result.changeOutline).toBeDefined()
    // Logger.warn should be called
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no affinityDb provided'),
      expect.any(Object),
    )
  })
})

// ============================================================================
// AC-13: Regression guard — existing tests remain valid
// ============================================================================

describe('AC-13: Regression guard — APIP-1010 baseline behavior preserved', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('StructurerConfigSchema default values unchanged (affinityConfig.affinityEnabled defaults to false)', () => {
    const config = StructurerConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.splitThreshold).toBe(15)
    expect(config.maxChangesPerItem).toBe(50)
    expect(config.nodeTimeoutMs).toBe(60000)
    // Affinity defaults
    expect(config.affinityConfig.affinityEnabled).toBe(false)
    expect(config.affinityConfig.minAffinityConfidence).toBe(0.7)
    expect(config.affinityConfig.maxAffinityWeight).toBe(0.8)
  })

  it('produces correct changeOutline structure without affinity config', async () => {
    const node = createStructurerNode({ splitThreshold: 15 })
    const state = createTestState()
    const result = await node(state as unknown as GraphState)

    expect(result.changeOutline).toBeDefined()
    expect(Array.isArray(result.changeOutline)).toBe(true)
    expect((result.changeOutline as ChangeOutlineItem[]).length).toBe(2)
    expect(result.structurerComplete).toBe(true)

    const ids = (result.changeOutline as ChangeOutlineItem[]).map(i => i.id)
    expect(ids).toContain('CO-1')
    expect(ids).toContain('CO-2')
  })

  it('split flagging still works without affinity', async () => {
    const node = createStructurerNode({ splitThreshold: 5 })
    const state = createTestState({
      currentStory: {
        acceptanceCriteria: [
          { id: 'AC-1', description: 'Authentication service with database and API endpoints' },
          { id: 'AC-2', description: 'Cache layer with Redis and queue processing' },
        ],
      },
    })

    const result = await node(state as unknown as GraphState)
    expect(result.splitRequired).toBe(true)
  })

  it('empty ACs returns empty outline (backward compat)', async () => {
    const node = createStructurerNode()
    const state = createTestState({ currentStory: { acceptanceCriteria: [] } })
    const result = await node(state as unknown as GraphState)
    expect(result.changeOutline).toEqual([])
    expect(result.splitRequired).toBe(false)
  })

  it('null currentStory returns empty outline (backward compat)', async () => {
    const node = createStructurerNode()
    const state = createTestState({ currentStory: null })
    const result = await node(state as unknown as GraphState)
    expect(result.changeOutline).toEqual([])
    expect(result.structurerComplete).toBe(true)
  })
})
