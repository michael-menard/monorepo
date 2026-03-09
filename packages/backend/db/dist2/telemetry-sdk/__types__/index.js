/**
 * Telemetry SDK Type Definitions (INFR-0050)
 *
 * Zod schemas for SDK configuration, hook options, and internal types.
 * AC-7: SDK configuration schema with validation and defaults
 */
import { z } from 'zod';
/**
 * AC-7: SDK Configuration Schema
 * Defines configuration options for the telemetry SDK
 */
export const TelemetrySdkConfigSchema = z.object({
    source: z.string().min(1, 'source must be a non-empty string'),
    enableBuffering: z.boolean().default(true),
    bufferSize: z.number().int().positive().default(100),
    flushIntervalMs: z.number().int().positive().default(5000),
    overflowStrategy: z.enum(['drop-oldest', 'error', 'block']).default('drop-oldest'),
});
/**
 * AC-1: Step Tracking Options
 * Optional parameters for withStepTracking hook
 */
export const StepTrackingOptionsSchema = z.object({
    tokensUsed: z.number().int().optional(),
    model: z.string().optional(),
    runId: z.string().optional(),
    workflowName: z.string().optional(),
    agentRole: z.string().optional(),
    emittedBy: z.string().optional(),
});
/**
 * AC-2: State Tracking Options
 * Optional parameters for withStateTracking hook
 */
export const StateTrackingOptionsSchema = z.object({
    itemType: z.string().default('story'),
    reason: z.string().optional(),
    runId: z.string().optional(),
    workflowName: z.string().optional(),
    agentRole: z.string().optional(),
    emittedBy: z.string().optional(),
});
