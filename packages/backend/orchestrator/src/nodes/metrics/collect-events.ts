/**
 * Event Collection Metrics Node
 *
 * Captures workflow events (commitments, completions, clarifications, scope changes)
 * for SYSTEM LEARNING purposes. These events help track workflow progression
 * and identify patterns in story development.
 *
 * IMPORTANT: These metrics are for system learning only, NOT performance evaluation.
 *
 * FLOW-035: LangGraph Metrics Node - Event Collection
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { StoryStructure } from '../story/seed.js'

/**
 * Workflow phase enum - represents stages in the story workflow.
 */
export const WorkflowPhaseSchema = z.enum([
  'seed', // Initial story creation
  'elaboration', // Story elaboration and refinement
  'review', // PM/UX/QA review fanout
  'hygiene', // Gap hygiene and deduplication
  'readiness', // Readiness scoring
  'commitment', // Commitment gate
  'implementation', // Active implementation
  'verification', // QA verification
  'complete', // Story completed
])

export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>

/**
 * Event type enum - categories of workflow events to track.
 */
export const EventTypeSchema = z.enum([
  'commitment', // Team committed to the story
  'completion', // A phase or task completed
  'clarification', // Clarification requested or provided
  'scope_change', // Story scope was modified
  'blocker_added', // New blocker identified
  'blocker_resolved', // Blocker was resolved
])

export type EventType = z.infer<typeof EventTypeSchema>

/**
 * Schema for event details - type-specific payload data.
 */
export const EventDetailsSchema = z.object({
  /** Brief description of what happened */
  description: z.string().min(1),
  /** Actor who triggered the event (agent name, user, system) */
  actor: z.string().default('system'),
  /** Related entity IDs (gap IDs, AC IDs, etc.) */
  relatedIds: z.array(z.string()).default([]),
  /** Previous value for change events */
  previousValue: z.string().optional(),
  /** New value for change events */
  newValue: z.string().optional(),
  /** Additional metadata */
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export type EventDetails = z.infer<typeof EventDetailsSchema>

/**
 * Schema for a single workflow event.
 */
export const WorkflowEventSchema = z.object({
  /** Unique event ID */
  id: z.string().min(1),
  /** Type of event */
  type: EventTypeSchema,
  /** Story ID this event relates to */
  storyId: z.string().min(1),
  /** When the event occurred */
  timestamp: z.string().datetime(),
  /** Workflow phase when the event occurred */
  phase: WorkflowPhaseSchema,
  /** Event-specific details */
  details: EventDetailsSchema,
  /** Sequence number within the story's event stream */
  sequenceNumber: z.number().int().min(0),
})

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>

/**
 * Schema for event counts by type.
 */
export const EventCountsSchema = z.object({
  commitment: z.number().int().min(0).default(0),
  completion: z.number().int().min(0).default(0),
  clarification: z.number().int().min(0).default(0),
  scope_change: z.number().int().min(0).default(0),
  blocker_added: z.number().int().min(0).default(0),
  blocker_resolved: z.number().int().min(0).default(0),
})

export type EventCounts = z.infer<typeof EventCountsSchema>

/**
 * Schema for event collection result.
 */
export const EventCollectionResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** When collection was performed */
  collectedAt: z.string().datetime(),
  /** Array of collected events */
  events: z.array(WorkflowEventSchema),
  /** Counts by event type */
  counts: EventCountsSchema,
  /** Total number of events */
  totalEvents: z.number().int().min(0),
  /** Current workflow phase */
  currentPhase: WorkflowPhaseSchema,
  /** Whether collection was successful */
  success: z.boolean(),
  /** Error message if collection failed */
  error: z.string().optional(),
})

export type EventCollectionResult = z.infer<typeof EventCollectionResultSchema>

/**
 * Schema for event collection configuration.
 */
export const EventCollectionConfigSchema = z.object({
  /** Maximum events to retain per story */
  maxEventsPerStory: z.number().int().positive().default(100),
  /** Whether to detect clarification events from conversation */
  detectClarifications: z.boolean().default(true),
  /** Whether to detect scope changes automatically */
  detectScopeChanges: z.boolean().default(true),
  /** Patterns that indicate clarification in conversation */
  clarificationPatterns: z
    .array(z.string())
    .default([
      '\\?',
      'clarify',
      'clarification',
      'what do you mean',
      'can you explain',
      'please elaborate',
      'not sure about',
      'unclear',
      'ambiguous',
    ]),
})

export type EventCollectionConfig = z.infer<typeof EventCollectionConfigSchema>

/**
 * Conversation message schema for clarification detection.
 */
export const ConversationMessageSchema = z.object({
  /** Message role (user, assistant, system) */
  role: z.enum(['user', 'assistant', 'system']),
  /** Message content */
  content: z.string(),
  /** Timestamp of the message */
  timestamp: z.string().datetime().optional(),
})

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

/**
 * Schema for conversation input.
 */
export const ConversationSchema = z.object({
  /** Array of messages */
  messages: z.array(ConversationMessageSchema),
  /** Story ID the conversation relates to */
  storyId: z.string().min(1).optional(),
})

export type Conversation = z.infer<typeof ConversationSchema>

// Event ID counter for generating unique IDs within a session
let eventIdCounter = 0

/**
 * Generates a unique event ID.
 *
 * @param storyId - Story ID for namespace
 * @returns Unique event ID
 */
function generateEventId(storyId: string): string {
  eventIdCounter += 1
  const timestamp = Date.now().toString(36)
  return `EVT-${storyId}-${timestamp}-${eventIdCounter.toString().padStart(4, '0')}`
}

/**
 * Creates a workflow event.
 * Factory function for generating properly structured events.
 *
 * @param type - Event type
 * @param storyId - Story ID
 * @param phase - Current workflow phase
 * @param details - Event-specific details
 * @param existingEvents - Existing events for sequence numbering
 * @returns A new workflow event
 */
export function createEvent(
  type: EventType,
  storyId: string,
  phase: WorkflowPhase,
  details: Partial<EventDetails>,
  existingEvents: readonly WorkflowEvent[] = [],
): WorkflowEvent {
  const fullDetails = EventDetailsSchema.parse({
    description: details.description || `${type} event occurred`,
    actor: details.actor,
    relatedIds: details.relatedIds,
    previousValue: details.previousValue,
    newValue: details.newValue,
    metadata: details.metadata,
  })

  const sequenceNumber = existingEvents.length

  const event: WorkflowEvent = {
    id: generateEventId(storyId),
    type,
    storyId,
    timestamp: new Date().toISOString(),
    phase,
    details: fullDetails,
    sequenceNumber,
  }

  return WorkflowEventSchema.parse(event)
}

/**
 * Detects clarification events from conversation messages.
 * Scans conversation for patterns indicating clarification requests or responses.
 *
 * @param conversation - The conversation to analyze
 * @param currentPhase - Current workflow phase
 * @param config - Configuration with clarification patterns
 * @returns Array of detected clarification events
 */
export function detectClarificationEvents(
  conversation: Conversation | undefined | null,
  currentPhase: WorkflowPhase,
  config: EventCollectionConfig = EventCollectionConfigSchema.parse({}),
): WorkflowEvent[] {
  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return []
  }

  const events: WorkflowEvent[] = []
  const storyId = conversation.storyId || 'unknown'
  const patterns = config.clarificationPatterns.map(p => new RegExp(p, 'i'))

  for (let i = 0; i < conversation.messages.length; i++) {
    const message = conversation.messages[i]

    // Skip system messages
    if (message.role === 'system') {
      continue
    }

    // Check if message contains clarification patterns
    const matchedPattern = patterns.find(pattern => pattern.test(message.content))

    if (matchedPattern) {
      // Determine if this is a request (user) or response (assistant)
      const isRequest = message.role === 'user'
      const description = isRequest
        ? 'Clarification requested by user'
        : 'Clarification provided by assistant'

      const event = createEvent(
        'clarification',
        storyId,
        currentPhase,
        {
          description,
          actor: message.role,
          metadata: {
            messageIndex: i,
            matchedPattern: matchedPattern.source,
            contentPreview: message.content.substring(0, 100),
          },
        },
        events,
      )

      events.push(event)
    }
  }

  return events
}

/**
 * Detects scope change events by comparing story versions.
 * Identifies changes in acceptance criteria, constraints, or affected files.
 *
 * @param story - Current story structure
 * @param previousVersion - Previous version of the story
 * @param currentPhase - Current workflow phase
 * @returns Array of detected scope change events
 */
export function detectScopeChangeEvents(
  story: StoryStructure | undefined | null,
  previousVersion: StoryStructure | undefined | null,
  currentPhase: WorkflowPhase,
): WorkflowEvent[] {
  // Can't detect changes without both versions
  if (!story || !previousVersion) {
    return []
  }

  // Stories must be the same
  if (story.storyId !== previousVersion.storyId) {
    return []
  }

  const events: WorkflowEvent[] = []
  const storyId = story.storyId

  // Check for acceptance criteria changes
  const currentACIds = new Set(story.acceptanceCriteria.map(ac => ac.id))
  const previousACIds = new Set(previousVersion.acceptanceCriteria.map(ac => ac.id))

  const addedACs = [...currentACIds].filter(id => !previousACIds.has(id))
  const removedACs = [...previousACIds].filter(id => !currentACIds.has(id))

  if (addedACs.length > 0) {
    events.push(
      createEvent(
        'scope_change',
        storyId,
        currentPhase,
        {
          description: `${addedACs.length} acceptance criteria added`,
          relatedIds: addedACs,
          previousValue: `${previousVersion.acceptanceCriteria.length} ACs`,
          newValue: `${story.acceptanceCriteria.length} ACs`,
          metadata: {
            changeType: 'ac_added',
            addedIds: addedACs,
          },
        },
        events,
      ),
    )
  }

  if (removedACs.length > 0) {
    events.push(
      createEvent(
        'scope_change',
        storyId,
        currentPhase,
        {
          description: `${removedACs.length} acceptance criteria removed`,
          relatedIds: removedACs,
          previousValue: `${previousVersion.acceptanceCriteria.length} ACs`,
          newValue: `${story.acceptanceCriteria.length} ACs`,
          metadata: {
            changeType: 'ac_removed',
            removedIds: removedACs,
          },
        },
        events,
      ),
    )
  }

  // Check for constraint changes
  const currentConstraints = new Set(story.constraints)
  const previousConstraints = new Set(previousVersion.constraints)

  const addedConstraints = [...currentConstraints].filter(c => !previousConstraints.has(c))
  const removedConstraints = [...previousConstraints].filter(c => !currentConstraints.has(c))

  if (addedConstraints.length > 0 || removedConstraints.length > 0) {
    events.push(
      createEvent(
        'scope_change',
        storyId,
        currentPhase,
        {
          description: `Constraints modified (${addedConstraints.length} added, ${removedConstraints.length} removed)`,
          previousValue: `${previousVersion.constraints.length} constraints`,
          newValue: `${story.constraints.length} constraints`,
          metadata: {
            changeType: 'constraints_modified',
            added: addedConstraints,
            removed: removedConstraints,
          },
        },
        events,
      ),
    )
  }

  // Check for affected files changes
  const currentFiles = new Set(story.affectedFiles)
  const previousFiles = new Set(previousVersion.affectedFiles)

  const addedFiles = [...currentFiles].filter(f => !previousFiles.has(f))
  const removedFiles = [...previousFiles].filter(f => !currentFiles.has(f))

  if (addedFiles.length > 0 || removedFiles.length > 0) {
    events.push(
      createEvent(
        'scope_change',
        storyId,
        currentPhase,
        {
          description: `Affected files modified (${addedFiles.length} added, ${removedFiles.length} removed)`,
          previousValue: `${previousVersion.affectedFiles.length} files`,
          newValue: `${story.affectedFiles.length} files`,
          metadata: {
            changeType: 'files_modified',
            addedFiles,
            removedFiles,
          },
        },
        events,
      ),
    )
  }

  // Check for complexity change
  if (story.estimatedComplexity !== previousVersion.estimatedComplexity) {
    events.push(
      createEvent(
        'scope_change',
        storyId,
        currentPhase,
        {
          description: `Complexity estimate changed from ${previousVersion.estimatedComplexity || 'unset'} to ${story.estimatedComplexity || 'unset'}`,
          previousValue: previousVersion.estimatedComplexity || 'unset',
          newValue: story.estimatedComplexity || 'unset',
          metadata: {
            changeType: 'complexity_changed',
          },
        },
        events,
      ),
    )
  }

  return events
}

/**
 * Counts events by type.
 *
 * @param events - Array of workflow events
 * @returns Event counts by type
 */
export function countEventsByType(events: readonly WorkflowEvent[]): EventCounts {
  const counts: EventCounts = {
    commitment: 0,
    completion: 0,
    clarification: 0,
    scope_change: 0,
    blocker_added: 0,
    blocker_resolved: 0,
  }

  for (const event of events) {
    counts[event.type]++
  }

  return EventCountsSchema.parse(counts)
}

/**
 * Determines current workflow phase from state.
 *
 * @param state - Graph state with workflow indicators
 * @returns Current workflow phase
 */
export function determineCurrentPhase(state: GraphStateWithEventCollection): WorkflowPhase {
  // Check in reverse order of workflow progression
  if (state.routingFlags.complete) {
    return 'complete'
  }

  if (state.commitmentValidated !== undefined) {
    if (state.commitmentGateResult?.passed) {
      return 'implementation'
    }
    return 'commitment'
  }

  if (state.readinessAnalyzed) {
    return 'readiness'
  }

  if (state.gapHygieneResult) {
    return 'hygiene'
  }

  // Check for review phase indicators
  if (state.pmGapsResult || state.uxGapsResult || state.qaGapsResult) {
    return 'review'
  }

  if (state.storyStructure) {
    return 'elaboration'
  }

  return 'seed'
}

/**
 * Collects all events for a story from workflow state.
 * Main function that aggregates events from various sources.
 *
 * @param storyId - Story ID to collect events for
 * @param workflowState - Current workflow state
 * @param config - Collection configuration
 * @returns Event collection result
 */
export async function collectEvents(
  storyId: string,
  workflowState: GraphStateWithEventCollection,
  config: Partial<EventCollectionConfig> = {},
): Promise<EventCollectionResult> {
  const fullConfig = EventCollectionConfigSchema.parse(config)
  const now = new Date().toISOString()

  try {
    // Determine current phase
    const currentPhase = determineCurrentPhase(workflowState)

    // Start with existing events if available
    const existingEvents: WorkflowEvent[] = workflowState.collectedEvents || []

    // Collect new events from various sources
    const newEvents: WorkflowEvent[] = []

    // Detect clarification events from conversation (if enabled)
    if (fullConfig.detectClarifications && workflowState.conversation) {
      const clarificationEvents = detectClarificationEvents(
        workflowState.conversation,
        currentPhase,
        fullConfig,
      )
      newEvents.push(...clarificationEvents)
    }

    // Detect scope change events (if enabled)
    if (fullConfig.detectScopeChanges && workflowState.previousStoryVersion) {
      const scopeChangeEvents = detectScopeChangeEvents(
        workflowState.storyStructure,
        workflowState.previousStoryVersion,
        currentPhase,
      )
      newEvents.push(...scopeChangeEvents)
    }

    // Check for blocker events from gap hygiene
    if (workflowState.gapHygieneResult) {
      const blockingGaps = workflowState.gapHygieneResult.rankedGaps.filter(
        gap => gap.category === 'mvp_blocking',
      )

      // Find newly added blockers (not in previous collection)
      const existingBlockerIds = new Set(
        existingEvents.filter(e => e.type === 'blocker_added').flatMap(e => e.details.relatedIds),
      )

      const newBlockers = blockingGaps.filter(gap => !existingBlockerIds.has(gap.id))

      for (const blocker of newBlockers) {
        newEvents.push(
          createEvent(
            'blocker_added',
            storyId,
            currentPhase,
            {
              description: `MVP-blocking gap identified: ${blocker.description.substring(0, 50)}...`,
              relatedIds: [blocker.id],
              metadata: {
                gapSource: blocker.source,
                severity: blocker.severity,
                score: blocker.score,
              },
            },
            [...existingEvents, ...newEvents],
          ),
        )
      }

      // Check for resolved blockers
      const resolvedGaps = blockingGaps.filter(gap => gap.resolved)
      const existingResolvedIds = new Set(
        existingEvents
          .filter(e => e.type === 'blocker_resolved')
          .flatMap(e => e.details.relatedIds),
      )

      for (const resolved of resolvedGaps) {
        if (!existingResolvedIds.has(resolved.id)) {
          newEvents.push(
            createEvent(
              'blocker_resolved',
              storyId,
              currentPhase,
              {
                description: `Blocker resolved: ${resolved.description.substring(0, 50)}...`,
                relatedIds: [resolved.id],
                metadata: {
                  gapSource: resolved.source,
                },
              },
              [...existingEvents, ...newEvents],
            ),
          )
        }
      }
    }

    // Check for commitment event
    if (
      workflowState.commitmentGateResult?.passed &&
      !existingEvents.some(e => e.type === 'commitment')
    ) {
      newEvents.push(
        createEvent(
          'commitment',
          storyId,
          'commitment',
          {
            description: 'Story passed commitment gate - ready for implementation',
            metadata: {
              readinessScore: workflowState.readinessResult?.score,
              passedChecks: workflowState.commitmentGateResult.passedChecks,
              totalChecks: workflowState.commitmentGateResult.totalChecks,
            },
          },
          [...existingEvents, ...newEvents],
        ),
      )
    }

    // Combine all events
    const allEvents = [...existingEvents, ...newEvents]

    // Limit to max events if configured
    const limitedEvents =
      allEvents.length > fullConfig.maxEventsPerStory
        ? allEvents.slice(-fullConfig.maxEventsPerStory)
        : allEvents

    // Count by type
    const counts = countEventsByType(limitedEvents)

    return EventCollectionResultSchema.parse({
      storyId,
      collectedAt: now,
      events: limitedEvents,
      counts,
      totalEvents: limitedEvents.length,
      currentPhase,
      success: true,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during event collection'

    return EventCollectionResultSchema.parse({
      storyId,
      collectedAt: now,
      events: [],
      counts: EventCountsSchema.parse({}),
      totalEvents: 0,
      currentPhase: 'seed',
      success: false,
      error: errorMessage,
    })
  }
}

/**
 * Extended graph state with event collection.
 */
export interface GraphStateWithEventCollection extends GraphState {
  /** Conversation messages for clarification detection */
  conversation?: Conversation | null
  /** Previous story version for scope change detection */
  previousStoryVersion?: StoryStructure | null
  /** Current story structure */
  storyStructure?: StoryStructure | null
  /** Gap hygiene result */
  gapHygieneResult?: {
    rankedGaps: Array<{
      id: string
      description: string
      category: string
      source: string
      severity: number
      score: number
      resolved: boolean
    }>
  } | null
  /** PM gaps result (from fanout) */
  pmGapsResult?: unknown
  /** UX gaps result (from fanout) */
  uxGapsResult?: unknown
  /** QA gaps result (from fanout) */
  qaGapsResult?: unknown
  /** Readiness analysis completed */
  readinessAnalyzed?: boolean
  /** Readiness result */
  readinessResult?: { score: number } | null
  /** Commitment validated */
  commitmentValidated?: boolean
  /** Commitment gate result */
  commitmentGateResult?: { passed: boolean; passedChecks: number; totalChecks: number } | null
  /** Previously collected events */
  collectedEvents?: WorkflowEvent[]
  /** Event collection result */
  eventCollectionResult?: EventCollectionResult | null
  /** Whether event collection was successful */
  eventCollectionCompleted?: boolean
}

/**
 * Event Collection metrics node implementation.
 *
 * Collects workflow events from the current state for system learning.
 * Detects clarification events, scope changes, blockers, and commitments.
 *
 * IMPORTANT: These events are for SYSTEM LEARNING only, not performance evaluation.
 *
 * @param state - Current graph state
 * @returns Partial state update with event collection result
 */
export const collectEventsNode = createToolNode(
  'collect_events',
  async (state: GraphState): Promise<Partial<GraphStateWithEventCollection>> => {
    const stateWithEvents = state as GraphStateWithEventCollection

    const storyId = stateWithEvents.storyId || 'unknown'

    const result = await collectEvents(storyId, stateWithEvents)

    return updateState({
      eventCollectionResult: result,
      collectedEvents: result.events,
      eventCollectionCompleted: result.success,
    } as Partial<GraphStateWithEventCollection>)
  },
)

/**
 * Creates an event collection node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createCollectEventsNode(config: Partial<EventCollectionConfig> = {}) {
  return createToolNode(
    'collect_events',
    async (state: GraphState): Promise<Partial<GraphStateWithEventCollection>> => {
      const stateWithEvents = state as GraphStateWithEventCollection

      const storyId = stateWithEvents.storyId || 'unknown'

      const result = await collectEvents(storyId, stateWithEvents, config)

      return updateState({
        eventCollectionResult: result,
        collectedEvents: result.events,
        eventCollectionCompleted: result.success,
      } as Partial<GraphStateWithEventCollection>)
    },
  )
}
