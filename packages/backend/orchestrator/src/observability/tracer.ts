/**
 * tracer.ts
 *
 * Workflow tracer for emitting trace events during phase execution.
 * Writes TRACE.jsonl to _implementation/ directory.
 *
 * @module observability/tracer
 */

import { z } from 'zod'

// ============================================================================
// Trace Event Types
// ============================================================================

/**
 * Base fields for all trace events.
 */
const TraceEventBaseSchema = z.object({
  /** ISO-8601 timestamp */
  timestamp: z.string().datetime(),

  /** Story ID */
  storyId: z.string().min(1),

  /** Trace ID for correlation */
  traceId: z.string().uuid().optional(),
})

/**
 * Phase start event.
 */
export const PhaseStartEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('phase_start'),
  phase: z.string().min(1),
})

/**
 * Phase complete event.
 */
export const PhaseCompleteEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('phase_complete'),
  phase: z.string().min(1),
  status: z.enum(['PASS', 'FAIL', 'TIMEOUT', 'ERROR', 'SKIPPED']),
  durationMs: z.number().int().min(0),
})

/**
 * Agent spawn event.
 */
export const AgentSpawnEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('agent_spawn'),
  agent: z.string().min(1),
  model: z.enum(['haiku', 'sonnet', 'opus']),
  phase: z.string().min(1).optional(),
})

/**
 * Agent complete event.
 */
export const AgentCompleteEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('agent_complete'),
  agent: z.string().min(1),
  tokensInput: z.number().int().min(0),
  tokensOutput: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  status: z.enum(['success', 'error', 'timeout']).optional(),
})

/**
 * Tool call event.
 */
export const ToolCallEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('tool_call'),
  tool: z.string().min(1),
  path: z.string().optional(),
  durationMs: z.number().int().min(0).optional(),
  success: z.boolean().optional(),
})

/**
 * Error event.
 */
export const ErrorEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('error'),
  errorType: z.string(),
  message: z.string(),
  phase: z.string().optional(),
  node: z.string().optional(),
  recoverable: z.boolean().optional(),
})

/**
 * Checkpoint event.
 */
export const CheckpointEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('checkpoint'),
  stage: z.string(),
  iteration: z.number().int().min(0).optional(),
  data: z.record(z.unknown()).optional(),
})

/**
 * Artifact event.
 */
export const ArtifactEventSchema = TraceEventBaseSchema.extend({
  event: z.literal('artifact'),
  action: z.enum(['created', 'updated', 'deleted', 'read']),
  path: z.string(),
  artifactType: z.string().optional(),
  sizeBytes: z.number().int().min(0).optional(),
})

/**
 * Union of all trace event types.
 */
export const TraceEventSchema = z.discriminatedUnion('event', [
  PhaseStartEventSchema,
  PhaseCompleteEventSchema,
  AgentSpawnEventSchema,
  AgentCompleteEventSchema,
  ToolCallEventSchema,
  ErrorEventSchema,
  CheckpointEventSchema,
  ArtifactEventSchema,
])

export type TraceEvent = z.infer<typeof TraceEventSchema>
export type PhaseStartEvent = z.infer<typeof PhaseStartEventSchema>
export type PhaseCompleteEvent = z.infer<typeof PhaseCompleteEventSchema>
export type AgentSpawnEvent = z.infer<typeof AgentSpawnEventSchema>
export type AgentCompleteEvent = z.infer<typeof AgentCompleteEventSchema>
export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>
export type ErrorEvent = z.infer<typeof ErrorEventSchema>
export type CheckpointEvent = z.infer<typeof CheckpointEventSchema>
export type ArtifactEvent = z.infer<typeof ArtifactEventSchema>

// ============================================================================
// Workflow Tracer
// ============================================================================

/**
 * Tracer configuration.
 */
export interface TracerConfig {
  /** Story ID for all events */
  storyId: string

  /** Trace ID for correlation (auto-generated if not provided) */
  traceId?: string

  /** Whether to buffer events or emit immediately */
  buffered?: boolean

  /** Maximum buffer size before auto-flush */
  maxBufferSize?: number
}

/**
 * Workflow tracer for emitting trace events.
 */
export class WorkflowTracer {
  private events: TraceEvent[] = []
  private storyId: string
  private traceId: string
  private buffered: boolean
  private maxBufferSize: number
  private flushCallback?: (events: TraceEvent[]) => Promise<void>

  constructor(config: TracerConfig) {
    this.storyId = config.storyId
    this.traceId = config.traceId ?? crypto.randomUUID()
    this.buffered = config.buffered ?? true
    this.maxBufferSize = config.maxBufferSize ?? 100
  }

  /**
   * Sets a callback to be called when events are flushed.
   */
  onFlush(callback: (events: TraceEvent[]) => Promise<void>): void {
    this.flushCallback = callback
  }

  /**
   * Emits a trace event.
   */
  emit<T extends TraceEvent>(event: Omit<T, 'timestamp' | 'storyId' | 'traceId'>): void {
    const fullEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      storyId: this.storyId,
      traceId: this.traceId,
    } as TraceEvent

    // Validate the event
    const parsed = TraceEventSchema.parse(fullEvent)
    this.events.push(parsed)

    // Auto-flush if buffer is full
    if (this.buffered && this.events.length >= this.maxBufferSize) {
      this.flush()
    }
  }

  /**
   * Emits a phase start event.
   */
  phaseStart(phase: string): void {
    this.emit<PhaseStartEvent>({ event: 'phase_start', phase })
  }

  /**
   * Emits a phase complete event.
   */
  phaseComplete(
    phase: string,
    status: 'PASS' | 'FAIL' | 'TIMEOUT' | 'ERROR' | 'SKIPPED',
    durationMs: number,
  ): void {
    this.emit<PhaseCompleteEvent>({ event: 'phase_complete', phase, status, durationMs })
  }

  /**
   * Emits an agent spawn event.
   */
  agentSpawn(agent: string, model: 'haiku' | 'sonnet' | 'opus', phase?: string): void {
    this.emit<AgentSpawnEvent>({ event: 'agent_spawn', agent, model, phase })
  }

  /**
   * Emits an agent complete event.
   */
  agentComplete(
    agent: string,
    tokensInput: number,
    tokensOutput: number,
    durationMs: number,
    status?: 'success' | 'error' | 'timeout',
  ): void {
    this.emit<AgentCompleteEvent>({
      event: 'agent_complete',
      agent,
      tokensInput,
      tokensOutput,
      durationMs,
      status,
    })
  }

  /**
   * Emits a tool call event.
   */
  toolCall(tool: string, path?: string, durationMs?: number, success?: boolean): void {
    this.emit<ToolCallEvent>({ event: 'tool_call', tool, path, durationMs, success })
  }

  /**
   * Emits an error event.
   */
  error(
    errorType: string,
    message: string,
    options?: { phase?: string; node?: string; recoverable?: boolean },
  ): void {
    this.emit<ErrorEvent>({
      event: 'error',
      errorType,
      message,
      ...options,
    })
  }

  /**
   * Emits a checkpoint event.
   */
  checkpoint(stage: string, iteration?: number, data?: Record<string, unknown>): void {
    this.emit<CheckpointEvent>({ event: 'checkpoint', stage, iteration, data })
  }

  /**
   * Emits an artifact event.
   */
  artifact(
    action: 'created' | 'updated' | 'deleted' | 'read',
    path: string,
    artifactType?: string,
    sizeBytes?: number,
  ): void {
    this.emit<ArtifactEvent>({ event: 'artifact', action, path, artifactType, sizeBytes })
  }

  /**
   * Gets all buffered events.
   */
  getEvents(): TraceEvent[] {
    return [...this.events]
  }

  /**
   * Flushes buffered events.
   */
  async flush(): Promise<TraceEvent[]> {
    const events = [...this.events]
    this.events = []

    if (this.flushCallback && events.length > 0) {
      await this.flushCallback(events)
    }

    return events
  }

  /**
   * Converts events to JSONL format.
   */
  toJsonl(): string {
    return this.events.map(e => JSON.stringify(e)).join('\n')
  }

  /**
   * Gets the trace ID.
   */
  getTraceId(): string {
    return this.traceId
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new workflow tracer.
 */
export function createTracer(storyId: string, traceId?: string): WorkflowTracer {
  return new WorkflowTracer({ storyId, traceId })
}
