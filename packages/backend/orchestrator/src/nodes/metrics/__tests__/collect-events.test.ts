import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createEvent,
  detectClarificationEvents,
  detectScopeChangeEvents,
  countEventsByType,
  determineCurrentPhase,
  collectEvents,
  WorkflowPhaseSchema,
  EventTypeSchema,
  EventDetailsSchema,
  WorkflowEventSchema,
  EventCountsSchema,
  EventCollectionResultSchema,
  EventCollectionConfigSchema,
  ConversationMessageSchema,
  ConversationSchema,
  type WorkflowEvent,
  type Conversation,
  type GraphStateWithEventCollection,
} from '../collect-events.js'
import type { StoryStructure } from '../../story/seed.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Test fixtures
const createTestStoryStructure = (overrides: Partial<StoryStructure> = {}): StoryStructure => ({
  storyId: 'flow-035',
  title: 'Test Story',
  description: 'A test story description',
  domain: 'testing',
  acceptanceCriteria: [
    { id: 'AC-1', description: 'First criterion', fromBaseline: false },
    { id: 'AC-2', description: 'Second criterion', fromBaseline: false },
  ],
  constraints: ['Must be testable', 'Must be fast'],
  affectedFiles: ['src/test.ts', 'src/utils.ts'],
  dependencies: [],
  estimatedComplexity: 'medium',
  tags: ['test'],
  ...overrides,
})

const createTestConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  messages: [
    { role: 'user', content: 'I want to add a feature' },
    { role: 'assistant', content: 'I can help with that' },
  ],
  storyId: 'flow-035',
  ...overrides,
})

const createTestGraphState = (
  overrides: Partial<GraphStateWithEventCollection> = {},
): GraphStateWithEventCollection =>
  ({
    schemaVersion: '1.0.0',
    epicPrefix: 'flow',
    storyId: 'flow-035',
    artifactPaths: {},
    routingFlags: {},
    evidenceRefs: [],
    gateDecisions: {},
    errors: [],
    stateHistory: [],
    ...overrides,
  }) as GraphStateWithEventCollection

describe('createEvent', () => {
  it('creates a commitment event with correct structure', () => {
    const event = createEvent('commitment', 'flow-035', 'commitment', {
      description: 'Story committed',
      actor: 'pm_agent',
    })

    expect(event.type).toBe('commitment')
    expect(event.storyId).toBe('flow-035')
    expect(event.phase).toBe('commitment')
    expect(event.details.description).toBe('Story committed')
    expect(event.details.actor).toBe('pm_agent')
    expect(event.sequenceNumber).toBe(0)
    expect(event.id).toMatch(/^EVT-flow-035-/)
    expect(() => WorkflowEventSchema.parse(event)).not.toThrow()
  })

  it('increments sequence number based on existing events', () => {
    const existingEvents: WorkflowEvent[] = [
      createEvent('completion', 'flow-035', 'seed', { description: 'Phase complete' }),
      createEvent('completion', 'flow-035', 'elaboration', { description: 'Phase complete' }),
    ]

    const newEvent = createEvent(
      'clarification',
      'flow-035',
      'review',
      { description: 'Clarification needed' },
      existingEvents,
    )

    expect(newEvent.sequenceNumber).toBe(2)
  })

  it('uses default description when not provided', () => {
    const event = createEvent('blocker_added', 'flow-035', 'hygiene', {})

    expect(event.details.description).toBe('blocker_added event occurred')
  })

  it('validates event against schema', () => {
    const event = createEvent('scope_change', 'flow-035', 'elaboration', {
      description: 'Scope changed',
      previousValue: '2 ACs',
      newValue: '3 ACs',
      metadata: { changeType: 'ac_added' },
    })

    expect(() => WorkflowEventSchema.parse(event)).not.toThrow()
  })
})

describe('detectClarificationEvents', () => {
  it('detects clarification request from user', () => {
    const conversation = createTestConversation({
      messages: [
        { role: 'user', content: 'Can you clarify what this means?' },
        { role: 'assistant', content: 'Sure, let me explain...' },
      ],
    })

    const events = detectClarificationEvents(conversation, 'elaboration')

    expect(events.length).toBe(1)
    expect(events[0].type).toBe('clarification')
    expect(events[0].details.actor).toBe('user')
    expect(events[0].details.description).toContain('requested by user')
  })

  it('detects question marks as clarification patterns', () => {
    const conversation = createTestConversation({
      messages: [{ role: 'user', content: 'What about edge cases?' }],
    })

    const events = detectClarificationEvents(conversation, 'review')

    expect(events.length).toBe(1)
    expect(events[0].details.metadata.matchedPattern).toBe('\\?')
  })

  it('detects multiple clarification events', () => {
    const conversation = createTestConversation({
      messages: [
        { role: 'user', content: 'Can you explain?' },
        { role: 'assistant', content: 'Let me clarify this for you' },
        { role: 'user', content: 'What do you mean by that?' },
      ],
    })

    const events = detectClarificationEvents(conversation, 'elaboration')

    expect(events.length).toBe(3)
  })

  it('skips system messages', () => {
    const conversation = createTestConversation({
      messages: [
        { role: 'system', content: 'Can you clarify?' },
        { role: 'user', content: 'Hello' },
      ],
    })

    const events = detectClarificationEvents(conversation, 'elaboration')

    expect(events.length).toBe(0)
  })

  it('returns empty array for null conversation', () => {
    const events = detectClarificationEvents(null, 'seed')

    expect(events).toEqual([])
  })

  it('returns empty array for empty messages', () => {
    const conversation = createTestConversation({ messages: [] })

    const events = detectClarificationEvents(conversation, 'seed')

    expect(events).toEqual([])
  })

  it('uses custom clarification patterns from config', () => {
    const conversation = createTestConversation({
      messages: [{ role: 'user', content: 'I have a custom concern here' }],
    })

    const events = detectClarificationEvents(conversation, 'elaboration', {
      maxEventsPerStory: 100,
      detectClarifications: true,
      detectScopeChanges: true,
      clarificationPatterns: ['custom concern'],
    })

    expect(events.length).toBe(1)
    expect(events[0].details.metadata.matchedPattern).toBe('custom concern')
  })
})

describe('detectScopeChangeEvents', () => {
  it('detects added acceptance criteria', () => {
    const previousVersion = createTestStoryStructure()
    const currentVersion = createTestStoryStructure({
      acceptanceCriteria: [
        ...previousVersion.acceptanceCriteria,
        { id: 'AC-3', description: 'New criterion', fromBaseline: false },
      ],
    })

    const events = detectScopeChangeEvents(currentVersion, previousVersion, 'elaboration')

    expect(events.length).toBe(1)
    expect(events[0].type).toBe('scope_change')
    expect(events[0].details.description).toContain('1 acceptance criteria added')
    expect(events[0].details.relatedIds).toContain('AC-3')
  })

  it('detects removed acceptance criteria', () => {
    const previousVersion = createTestStoryStructure()
    const currentVersion = createTestStoryStructure({
      acceptanceCriteria: [previousVersion.acceptanceCriteria[0]],
    })

    const events = detectScopeChangeEvents(currentVersion, previousVersion, 'elaboration')

    expect(events.length).toBe(1)
    expect(events[0].details.description).toContain('1 acceptance criteria removed')
    expect(events[0].details.relatedIds).toContain('AC-2')
  })

  it('detects constraint changes', () => {
    const previousVersion = createTestStoryStructure()
    const currentVersion = createTestStoryStructure({
      constraints: [...previousVersion.constraints, 'New constraint'],
    })

    const events = detectScopeChangeEvents(currentVersion, previousVersion, 'review')

    expect(events.length).toBe(1)
    expect(events[0].details.description).toContain('Constraints modified')
    expect(events[0].details.metadata.changeType).toBe('constraints_modified')
  })

  it('detects affected files changes', () => {
    const previousVersion = createTestStoryStructure()
    const currentVersion = createTestStoryStructure({
      affectedFiles: ['src/new-file.ts'],
    })

    const events = detectScopeChangeEvents(currentVersion, previousVersion, 'elaboration')

    expect(events.length).toBe(1)
    expect(events[0].details.description).toContain('Affected files modified')
    expect(events[0].details.metadata.addedFiles).toContain('src/new-file.ts')
    expect(events[0].details.metadata.removedFiles).toContain('src/test.ts')
  })

  it('detects complexity change', () => {
    const previousVersion = createTestStoryStructure({ estimatedComplexity: 'small' })
    const currentVersion = createTestStoryStructure({ estimatedComplexity: 'large' })

    const events = detectScopeChangeEvents(currentVersion, previousVersion, 'elaboration')

    expect(events.length).toBe(1)
    expect(events[0].details.description).toContain('Complexity estimate changed')
    expect(events[0].details.previousValue).toBe('small')
    expect(events[0].details.newValue).toBe('large')
  })

  it('returns empty array when no changes', () => {
    const story = createTestStoryStructure()

    const events = detectScopeChangeEvents(story, story, 'elaboration')

    expect(events).toEqual([])
  })

  it('returns empty array when current story is null', () => {
    const previousVersion = createTestStoryStructure()

    const events = detectScopeChangeEvents(null, previousVersion, 'elaboration')

    expect(events).toEqual([])
  })

  it('returns empty array when previous version is null', () => {
    const currentVersion = createTestStoryStructure()

    const events = detectScopeChangeEvents(currentVersion, null, 'elaboration')

    expect(events).toEqual([])
  })

  it('returns empty array when story IDs do not match', () => {
    const previousVersion = createTestStoryStructure({ storyId: 'flow-001' })
    const currentVersion = createTestStoryStructure({ storyId: 'flow-002' })

    const events = detectScopeChangeEvents(currentVersion, previousVersion, 'elaboration')

    expect(events).toEqual([])
  })
})

describe('countEventsByType', () => {
  it('counts events by type correctly', () => {
    const events: WorkflowEvent[] = [
      createEvent('commitment', 'flow-035', 'commitment', { description: 'Committed' }),
      createEvent('clarification', 'flow-035', 'review', { description: 'Clarified' }),
      createEvent('clarification', 'flow-035', 'review', { description: 'Clarified again' }),
      createEvent('scope_change', 'flow-035', 'elaboration', { description: 'Changed' }),
      createEvent('blocker_added', 'flow-035', 'hygiene', { description: 'Blocker found' }),
      createEvent('blocker_resolved', 'flow-035', 'hygiene', { description: 'Blocker fixed' }),
    ]

    const counts = countEventsByType(events)

    expect(counts.commitment).toBe(1)
    expect(counts.clarification).toBe(2)
    expect(counts.scope_change).toBe(1)
    expect(counts.blocker_added).toBe(1)
    expect(counts.blocker_resolved).toBe(1)
    expect(counts.completion).toBe(0)
  })

  it('returns zeros for empty events array', () => {
    const counts = countEventsByType([])

    expect(counts.commitment).toBe(0)
    expect(counts.completion).toBe(0)
    expect(counts.clarification).toBe(0)
    expect(counts.scope_change).toBe(0)
    expect(counts.blocker_added).toBe(0)
    expect(counts.blocker_resolved).toBe(0)
  })

  it('validates output against schema', () => {
    const events: WorkflowEvent[] = [
      createEvent('completion', 'flow-035', 'seed', { description: 'Done' }),
    ]

    const counts = countEventsByType(events)

    expect(() => EventCountsSchema.parse(counts)).not.toThrow()
  })
})

describe('determineCurrentPhase', () => {
  it('returns complete when complete flag is set', () => {
    const state = createTestGraphState({
      routingFlags: { complete: true },
    })

    expect(determineCurrentPhase(state)).toBe('complete')
  })

  it('returns implementation when commitment passed', () => {
    const state = createTestGraphState({
      commitmentValidated: true,
      commitmentGateResult: { passed: true, passedChecks: 3, totalChecks: 3 },
    })

    expect(determineCurrentPhase(state)).toBe('implementation')
  })

  it('returns commitment when commitment validated but not passed', () => {
    const state = createTestGraphState({
      commitmentValidated: true,
      commitmentGateResult: { passed: false, passedChecks: 1, totalChecks: 3 },
    })

    expect(determineCurrentPhase(state)).toBe('commitment')
  })

  it('returns readiness when readiness analyzed', () => {
    const state = createTestGraphState({
      readinessAnalyzed: true,
    })

    expect(determineCurrentPhase(state)).toBe('readiness')
  })

  it('returns hygiene when gap hygiene result exists', () => {
    const state = createTestGraphState({
      gapHygieneResult: { rankedGaps: [] },
    })

    expect(determineCurrentPhase(state)).toBe('hygiene')
  })

  it('returns review when fanout results exist', () => {
    const state = createTestGraphState({
      pmGapsResult: {},
    })

    expect(determineCurrentPhase(state)).toBe('review')
  })

  it('returns elaboration when story structure exists', () => {
    const state = createTestGraphState({
      storyStructure: createTestStoryStructure(),
    })

    expect(determineCurrentPhase(state)).toBe('elaboration')
  })

  it('returns seed as default', () => {
    const state = createTestGraphState()

    expect(determineCurrentPhase(state)).toBe('seed')
  })
})

describe('collectEvents', () => {
  it('collects events successfully from workflow state', async () => {
    const state = createTestGraphState({
      storyStructure: createTestStoryStructure(),
    })

    const result = await collectEvents('flow-035', state)

    expect(result.success).toBe(true)
    expect(result.storyId).toBe('flow-035')
    expect(result.currentPhase).toBe('elaboration')
    expect(() => EventCollectionResultSchema.parse(result)).not.toThrow()
  })

  it('detects clarification events when conversation present', async () => {
    const state = createTestGraphState({
      conversation: createTestConversation({
        messages: [{ role: 'user', content: 'Can you clarify?' }],
      }),
    })

    const result = await collectEvents('flow-035', state)

    expect(result.success).toBe(true)
    expect(result.counts.clarification).toBeGreaterThan(0)
    expect(result.events.some(e => e.type === 'clarification')).toBe(true)
  })

  it('detects scope change events when previous version present', async () => {
    const previousVersion = createTestStoryStructure()
    const currentVersion = createTestStoryStructure({
      acceptanceCriteria: [
        ...previousVersion.acceptanceCriteria,
        { id: 'AC-3', description: 'New', fromBaseline: false },
      ],
    })

    const state = createTestGraphState({
      storyStructure: currentVersion,
      previousStoryVersion: previousVersion,
    })

    const result = await collectEvents('flow-035', state)

    expect(result.success).toBe(true)
    expect(result.counts.scope_change).toBeGreaterThan(0)
    expect(result.events.some(e => e.type === 'scope_change')).toBe(true)
  })

  it('detects blocker events from gap hygiene', async () => {
    const state = createTestGraphState({
      gapHygieneResult: {
        rankedGaps: [
          {
            id: 'RG-001',
            description: 'Critical blocker found',
            category: 'mvp_blocking',
            source: 'pm_scope',
            severity: 5,
            score: 20,
            resolved: false,
          },
        ],
      },
    })

    const result = await collectEvents('flow-035', state)

    expect(result.success).toBe(true)
    expect(result.counts.blocker_added).toBe(1)
    expect(result.events.some(e => e.type === 'blocker_added')).toBe(true)
  })

  it('detects resolved blocker events', async () => {
    const state = createTestGraphState({
      gapHygieneResult: {
        rankedGaps: [
          {
            id: 'RG-001',
            description: 'Resolved blocker',
            category: 'mvp_blocking',
            source: 'pm_scope',
            severity: 5,
            score: 20,
            resolved: true,
          },
        ],
      },
    })

    const result = await collectEvents('flow-035', state)

    expect(result.success).toBe(true)
    expect(result.counts.blocker_resolved).toBe(1)
  })

  it('detects commitment event when gate passed', async () => {
    const state = createTestGraphState({
      commitmentGateResult: { passed: true, passedChecks: 3, totalChecks: 3 },
      commitmentValidated: true,
      readinessResult: { score: 90 },
    })

    const result = await collectEvents('flow-035', state)

    expect(result.success).toBe(true)
    expect(result.counts.commitment).toBe(1)
    expect(result.events.some(e => e.type === 'commitment')).toBe(true)
  })

  it('preserves existing events', async () => {
    const existingEvent = createEvent('completion', 'flow-035', 'seed', {
      description: 'Seed phase complete',
    })

    const state = createTestGraphState({
      collectedEvents: [existingEvent],
      storyStructure: createTestStoryStructure(),
    })

    const result = await collectEvents('flow-035', state)

    expect(result.success).toBe(true)
    expect(result.events).toContainEqual(existingEvent)
    expect(result.totalEvents).toBeGreaterThanOrEqual(1)
  })

  it('limits events to maxEventsPerStory', async () => {
    const existingEvents: WorkflowEvent[] = Array.from({ length: 50 }, (_, i) =>
      createEvent('completion', 'flow-035', 'elaboration', {
        description: `Event ${i}`,
      }),
    )

    const state = createTestGraphState({
      collectedEvents: existingEvents,
      conversation: createTestConversation({
        messages: Array.from({ length: 100 }, () => ({
          role: 'user' as const,
          content: 'Can you clarify?',
        })),
      }),
    })

    const result = await collectEvents('flow-035', state, { maxEventsPerStory: 10 })

    expect(result.success).toBe(true)
    expect(result.events.length).toBeLessThanOrEqual(10)
  })

  it('handles errors gracefully', async () => {
    // Create a state that will cause an error by manipulating internal state
    const state = createTestGraphState({
      conversation: {
        messages: null as unknown as [],
        storyId: 'flow-035',
      },
    })

    // Even with malformed data, should return a result
    const result = await collectEvents('flow-035', state)

    // The function handles the error internally
    expect(result.storyId).toBe('flow-035')
    expect(typeof result.success).toBe('boolean')
  })
})

describe('Schema validations', () => {
  describe('WorkflowPhaseSchema', () => {
    it('validates all workflow phases', () => {
      const phases = [
        'seed',
        'elaboration',
        'review',
        'hygiene',
        'readiness',
        'commitment',
        'implementation',
        'verification',
        'complete',
      ]

      for (const phase of phases) {
        expect(() => WorkflowPhaseSchema.parse(phase)).not.toThrow()
      }
    })

    it('rejects invalid phase', () => {
      expect(() => WorkflowPhaseSchema.parse('invalid')).toThrow()
    })
  })

  describe('EventTypeSchema', () => {
    it('validates all event types', () => {
      const types = [
        'commitment',
        'completion',
        'clarification',
        'scope_change',
        'blocker_added',
        'blocker_resolved',
      ]

      for (const type of types) {
        expect(() => EventTypeSchema.parse(type)).not.toThrow()
      }
    })

    it('rejects invalid type', () => {
      expect(() => EventTypeSchema.parse('invalid')).toThrow()
    })
  })

  describe('EventDetailsSchema', () => {
    it('validates minimal details', () => {
      const details = {
        description: 'Something happened',
      }

      const parsed = EventDetailsSchema.parse(details)

      expect(parsed.description).toBe('Something happened')
      expect(parsed.actor).toBe('system')
      expect(parsed.relatedIds).toEqual([])
      expect(parsed.metadata).toEqual({})
    })

    it('validates full details', () => {
      const details = {
        description: 'AC added',
        actor: 'pm_agent',
        relatedIds: ['AC-1', 'AC-2'],
        previousValue: '2 ACs',
        newValue: '3 ACs',
        metadata: { changeType: 'add' },
      }

      expect(() => EventDetailsSchema.parse(details)).not.toThrow()
    })
  })

  describe('ConversationMessageSchema', () => {
    it('validates user message', () => {
      const message = {
        role: 'user',
        content: 'Hello',
      }

      expect(() => ConversationMessageSchema.parse(message)).not.toThrow()
    })

    it('validates assistant message with timestamp', () => {
      const message = {
        role: 'assistant',
        content: 'Hi there',
        timestamp: new Date().toISOString(),
      }

      expect(() => ConversationMessageSchema.parse(message)).not.toThrow()
    })

    it('validates system message', () => {
      const message = {
        role: 'system',
        content: 'System prompt',
      }

      expect(() => ConversationMessageSchema.parse(message)).not.toThrow()
    })

    it('rejects invalid role', () => {
      const message = {
        role: 'invalid',
        content: 'Hello',
      }

      expect(() => ConversationMessageSchema.parse(message)).toThrow()
    })
  })

  describe('EventCollectionConfigSchema', () => {
    it('applies default values', () => {
      const config = EventCollectionConfigSchema.parse({})

      expect(config.maxEventsPerStory).toBe(100)
      expect(config.detectClarifications).toBe(true)
      expect(config.detectScopeChanges).toBe(true)
      expect(config.clarificationPatterns.length).toBeGreaterThan(0)
    })

    it('accepts custom config', () => {
      const config = EventCollectionConfigSchema.parse({
        maxEventsPerStory: 50,
        detectClarifications: false,
        detectScopeChanges: false,
        clarificationPatterns: ['custom'],
      })

      expect(config.maxEventsPerStory).toBe(50)
      expect(config.detectClarifications).toBe(false)
      expect(config.detectScopeChanges).toBe(false)
      expect(config.clarificationPatterns).toEqual(['custom'])
    })
  })

  describe('EventCollectionResultSchema', () => {
    it('validates successful result', () => {
      const result = {
        storyId: 'flow-035',
        collectedAt: new Date().toISOString(),
        events: [],
        counts: {
          commitment: 0,
          completion: 0,
          clarification: 0,
          scope_change: 0,
          blocker_added: 0,
          blocker_resolved: 0,
        },
        totalEvents: 0,
        currentPhase: 'seed',
        success: true,
      }

      expect(() => EventCollectionResultSchema.parse(result)).not.toThrow()
    })

    it('validates failed result with error', () => {
      const result = {
        storyId: 'flow-035',
        collectedAt: new Date().toISOString(),
        events: [],
        counts: {
          commitment: 0,
          completion: 0,
          clarification: 0,
          scope_change: 0,
          blocker_added: 0,
          blocker_resolved: 0,
        },
        totalEvents: 0,
        currentPhase: 'seed',
        success: false,
        error: 'Something went wrong',
      }

      expect(() => EventCollectionResultSchema.parse(result)).not.toThrow()
    })
  })
})
