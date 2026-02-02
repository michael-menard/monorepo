/**
 * metrics.ts
 *
 * Metrics collection for workflow execution.
 * Writes METRICS.yaml to _implementation/ directory.
 *
 * @module observability/metrics
 */

import { z } from 'zod'

// ============================================================================
// Phase Metrics
// ============================================================================

/**
 * Metrics for a single phase.
 */
export const PhaseMetricsSchema = z.object({
  /** Phase name */
  name: z.string().min(1),

  /** Execution duration in milliseconds */
  durationMs: z.number().int().min(0),

  /** Input tokens consumed */
  tokensInput: z.number().int().min(0),

  /** Output tokens generated */
  tokensOutput: z.number().int().min(0),

  /** Number of agent spawns */
  agentSpawns: z.number().int().min(0),

  /** Number of tool calls */
  toolCalls: z.number().int().min(0),

  /** Phase status */
  status: z.enum(['PASS', 'FAIL', 'TIMEOUT', 'ERROR', 'SKIPPED']),

  /** Timestamp when phase started */
  startedAt: z.string().datetime(),

  /** Timestamp when phase completed */
  completedAt: z.string().datetime(),

  /** Number of retries (if applicable) */
  retries: z.number().int().min(0).optional(),

  /** Error count */
  errors: z.number().int().min(0).optional(),

  /** Custom metrics */
  custom: z.record(z.unknown()).optional(),
})

export type PhaseMetrics = z.infer<typeof PhaseMetricsSchema>

// ============================================================================
// Story Metrics
// ============================================================================

/**
 * Aggregate metrics for an entire story.
 */
export const StoryMetricsSchema = z.object({
  /** Story ID */
  storyId: z.string().min(1),

  /** Timestamp when story started */
  startedAt: z.string().datetime(),

  /** Timestamp when story completed */
  completedAt: z.string().datetime().optional(),

  /** All phase metrics */
  phases: z.array(PhaseMetricsSchema),

  /** Total tokens consumed */
  totalTokens: z.number().int().min(0),

  /** Total execution duration in milliseconds */
  totalDurationMs: z.number().int().min(0),

  /** Total agent spawns */
  totalAgentSpawns: z.number().int().min(0),

  /** Total tool calls */
  totalToolCalls: z.number().int().min(0),

  /** Overall status */
  status: z.enum(['in_progress', 'completed', 'failed', 'blocked']),

  /** Current phase (if in progress) */
  currentPhase: z.string().optional(),

  /** Estimated cost (if available) */
  estimatedCost: z
    .object({
      inputCost: z.number().min(0),
      outputCost: z.number().min(0),
      totalCost: z.number().min(0),
      currency: z.string().default('USD'),
    })
    .optional(),
})

export type StoryMetrics = z.infer<typeof StoryMetricsSchema>

// ============================================================================
// Metrics Collector
// ============================================================================

/**
 * Collector for aggregating phase metrics.
 */
export class MetricsCollector {
  private storyId: string
  private startedAt: string
  private phases: PhaseMetrics[] = []
  private currentPhase: PhaseMetrics | null = null
  private phaseStartTime: number = 0

  constructor(storyId: string) {
    this.storyId = storyId
    this.startedAt = new Date().toISOString()
  }

  /**
   * Starts tracking a new phase.
   */
  startPhase(name: string): void {
    if (this.currentPhase) {
      // Auto-complete previous phase if not completed
      this.completePhase('ERROR')
    }

    this.phaseStartTime = Date.now()
    this.currentPhase = {
      name,
      durationMs: 0,
      tokensInput: 0,
      tokensOutput: 0,
      agentSpawns: 0,
      toolCalls: 0,
      status: 'PASS', // Will be updated on complete
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(), // Placeholder
      retries: 0,
      errors: 0,
    }
  }

  /**
   * Records tokens for the current phase.
   */
  recordTokens(input: number, output: number): void {
    if (this.currentPhase) {
      this.currentPhase.tokensInput += input
      this.currentPhase.tokensOutput += output
    }
  }

  /**
   * Records an agent spawn.
   */
  recordAgentSpawn(): void {
    if (this.currentPhase) {
      this.currentPhase.agentSpawns++
    }
  }

  /**
   * Records a tool call.
   */
  recordToolCall(): void {
    if (this.currentPhase) {
      this.currentPhase.toolCalls++
    }
  }

  /**
   * Records an error.
   */
  recordError(): void {
    if (this.currentPhase) {
      this.currentPhase.errors = (this.currentPhase.errors ?? 0) + 1
    }
  }

  /**
   * Records a retry.
   */
  recordRetry(): void {
    if (this.currentPhase) {
      this.currentPhase.retries = (this.currentPhase.retries ?? 0) + 1
    }
  }

  /**
   * Adds custom metrics to the current phase.
   */
  addCustomMetric(key: string, value: unknown): void {
    if (this.currentPhase) {
      this.currentPhase.custom = this.currentPhase.custom ?? {}
      this.currentPhase.custom[key] = value
    }
  }

  /**
   * Completes the current phase.
   */
  completePhase(status: 'PASS' | 'FAIL' | 'TIMEOUT' | 'ERROR' | 'SKIPPED'): void {
    if (!this.currentPhase) return

    const now = new Date().toISOString()
    this.currentPhase.durationMs = Date.now() - this.phaseStartTime
    this.currentPhase.status = status
    this.currentPhase.completedAt = now

    this.phases.push(PhaseMetricsSchema.parse(this.currentPhase))
    this.currentPhase = null
  }

  /**
   * Gets the current phase name.
   */
  getCurrentPhase(): string | undefined {
    return this.currentPhase?.name
  }

  /**
   * Calculates aggregate metrics.
   */
  private calculateAggregates(): Pick<
    StoryMetrics,
    'totalTokens' | 'totalDurationMs' | 'totalAgentSpawns' | 'totalToolCalls'
  > {
    return {
      totalTokens: this.phases.reduce((sum, p) => sum + p.tokensInput + p.tokensOutput, 0),
      totalDurationMs: this.phases.reduce((sum, p) => sum + p.durationMs, 0),
      totalAgentSpawns: this.phases.reduce((sum, p) => sum + p.agentSpawns, 0),
      totalToolCalls: this.phases.reduce((sum, p) => sum + p.toolCalls, 0),
    }
  }

  /**
   * Determines overall status from phases.
   */
  private determineStatus(): 'in_progress' | 'completed' | 'failed' | 'blocked' {
    if (this.currentPhase) {
      return 'in_progress'
    }

    const lastPhase = this.phases[this.phases.length - 1]
    if (!lastPhase) {
      return 'in_progress'
    }

    if (lastPhase.status === 'FAIL' || lastPhase.status === 'ERROR') {
      return 'failed'
    }

    if (lastPhase.status === 'TIMEOUT') {
      return 'blocked'
    }

    return 'completed'
  }

  /**
   * Finalizes and returns the story metrics.
   */
  finalize(): StoryMetrics {
    // Complete current phase if not completed
    if (this.currentPhase) {
      this.completePhase('ERROR')
    }

    const aggregates = this.calculateAggregates()
    const status = this.determineStatus()

    return StoryMetricsSchema.parse({
      storyId: this.storyId,
      startedAt: this.startedAt,
      completedAt: new Date().toISOString(),
      phases: this.phases,
      ...aggregates,
      status,
      currentPhase: this.currentPhase?.name,
    })
  }

  /**
   * Gets current metrics (may be incomplete).
   */
  getMetrics(): Partial<StoryMetrics> {
    const aggregates = this.calculateAggregates()

    return {
      storyId: this.storyId,
      startedAt: this.startedAt,
      phases: [...this.phases],
      ...aggregates,
      status: this.determineStatus(),
      currentPhase: this.currentPhase?.name,
    }
  }

  /**
   * Converts metrics to YAML-friendly object.
   */
  toYaml(): Record<string, unknown> {
    const metrics = this.finalize()

    return {
      story_id: metrics.storyId,
      started_at: metrics.startedAt,
      completed_at: metrics.completedAt,
      status: metrics.status,
      totals: {
        tokens: metrics.totalTokens,
        duration_ms: metrics.totalDurationMs,
        agent_spawns: metrics.totalAgentSpawns,
        tool_calls: metrics.totalToolCalls,
      },
      phases: metrics.phases.map(p => ({
        name: p.name,
        status: p.status,
        duration_ms: p.durationMs,
        tokens_input: p.tokensInput,
        tokens_output: p.tokensOutput,
        agent_spawns: p.agentSpawns,
        tool_calls: p.toolCalls,
        started_at: p.startedAt,
        completed_at: p.completedAt,
        ...(p.retries && p.retries > 0 ? { retries: p.retries } : {}),
        ...(p.errors && p.errors > 0 ? { errors: p.errors } : {}),
        ...(p.custom ? { custom: p.custom } : {}),
      })),
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new metrics collector.
 */
export function createMetricsCollector(storyId: string): MetricsCollector {
  return new MetricsCollector(storyId)
}

// ============================================================================
// Cost Estimation
// ============================================================================

/**
 * Token pricing per million tokens (as of 2024).
 */
export const TOKEN_PRICING = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
} as const

/**
 * Estimates cost from token usage.
 */
export function estimateCost(
  tokensInput: number,
  tokensOutput: number,
  model: 'haiku' | 'sonnet' | 'opus' = 'sonnet',
): { inputCost: number; outputCost: number; totalCost: number; currency: string } {
  const pricing = TOKEN_PRICING[model]

  const inputCost = (tokensInput / 1_000_000) * pricing.input
  const outputCost = (tokensOutput / 1_000_000) * pricing.output
  const totalCost = inputCost + outputCost

  return {
    inputCost: Math.round(inputCost * 10000) / 10000,
    outputCost: Math.round(outputCost * 10000) / 10000,
    totalCost: Math.round(totalCost * 10000) / 10000,
    currency: 'USD',
  }
}
