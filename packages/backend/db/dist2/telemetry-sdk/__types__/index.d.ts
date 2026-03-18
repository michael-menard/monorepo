/**
 * Telemetry SDK Type Definitions (INFR-0050)
 *
 * Zod schemas for SDK configuration, hook options, and internal types.
 * AC-7: SDK configuration schema with validation and defaults
 */
import { z } from 'zod';
import type { WorkflowEventInput } from '../../workflow-events.js';
/**
 * AC-7: SDK Configuration Schema
 * Defines configuration options for the telemetry SDK
 */
export declare const TelemetrySdkConfigSchema: z.ZodObject<{
    source: z.ZodString;
    enableBuffering: z.ZodDefault<z.ZodBoolean>;
    bufferSize: z.ZodDefault<z.ZodNumber>;
    flushIntervalMs: z.ZodDefault<z.ZodNumber>;
    overflowStrategy: z.ZodDefault<z.ZodEnum<["drop-oldest", "error", "block"]>>;
}, "strip", z.ZodTypeAny, {
    source: string;
    enableBuffering: boolean;
    bufferSize: number;
    flushIntervalMs: number;
    overflowStrategy: "error" | "drop-oldest" | "block";
}, {
    source: string;
    enableBuffering?: boolean | undefined;
    bufferSize?: number | undefined;
    flushIntervalMs?: number | undefined;
    overflowStrategy?: "error" | "drop-oldest" | "block" | undefined;
}>;
export type TelemetrySdkConfig = z.infer<typeof TelemetrySdkConfigSchema>;
/**
 * AC-1: Step Tracking Options
 * Optional parameters for withStepTracking hook
 */
export declare const StepTrackingOptionsSchema: z.ZodObject<{
    tokensUsed: z.ZodOptional<z.ZodNumber>;
    model: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
    workflowName: z.ZodOptional<z.ZodString>;
    agentRole: z.ZodOptional<z.ZodString>;
    emittedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    runId?: string | undefined;
    workflowName?: string | undefined;
    agentRole?: string | undefined;
    emittedBy?: string | undefined;
    model?: string | undefined;
    tokensUsed?: number | undefined;
}, {
    runId?: string | undefined;
    workflowName?: string | undefined;
    agentRole?: string | undefined;
    emittedBy?: string | undefined;
    model?: string | undefined;
    tokensUsed?: number | undefined;
}>;
export type StepTrackingOptions = z.infer<typeof StepTrackingOptionsSchema>;
/**
 * AC-2: State Tracking Options
 * Optional parameters for withStateTracking hook
 */
export declare const StateTrackingOptionsSchema: z.ZodObject<{
    itemType: z.ZodDefault<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
    workflowName: z.ZodOptional<z.ZodString>;
    agentRole: z.ZodOptional<z.ZodString>;
    emittedBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    itemType: string;
    reason?: string | undefined;
    runId?: string | undefined;
    workflowName?: string | undefined;
    agentRole?: string | undefined;
    emittedBy?: string | undefined;
}, {
    reason?: string | undefined;
    runId?: string | undefined;
    workflowName?: string | undefined;
    agentRole?: string | undefined;
    emittedBy?: string | undefined;
    itemType?: string | undefined;
}>;
export type StateTrackingOptions = z.infer<typeof StateTrackingOptionsSchema>;
/**
 * Internal: Buffered Event Type
 * Events stored in buffer before flush
 */
export interface BufferedEvent {
    event: WorkflowEventInput;
    timestamp: Date;
}
/**
 * Internal: Buffer State
 * In-memory event buffer state
 */
export interface BufferState {
    events: BufferedEvent[];
    isFlushing: boolean;
    lastFlushTime: Date;
}
/**
 * Internal: Flush Timer Handle
 * Node.js timer handle for flush interval
 */
export type FlushTimerHandle = NodeJS.Timeout | null;
/**
 * SDK Instance Interface
 * Returned by initTelemetrySdk()
 */
export interface TelemetrySdk {
    withStepTracking: <T>(stepName: string, operation: () => Promise<T>, options?: StepTrackingOptions) => Promise<T>;
    withStateTracking: (itemId: string, fromState: string, toState: string, options?: Partial<StateTrackingOptions>) => Promise<void>;
    shutdown: () => Promise<void>;
    flush: () => Promise<void>;
}
//# sourceMappingURL=index.d.ts.map