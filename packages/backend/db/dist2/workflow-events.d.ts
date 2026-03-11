/**
 * Workflow Event Ingestion (INFR-0040, INFR-0041)
 *
 * Provides insertWorkflowEvent() for writing telemetry events.
 * Designed to be resilient - catches DB errors and logs warnings
 * rather than crashing the calling orchestrator.
 *
 * INFR-0041: Added payload validation using event-type specific schemas
 */
import { z } from 'zod';
declare const WorkflowEventInputSchema: z.ZodObject<{
    eventId: z.ZodString;
    eventType: z.ZodEnum<["item_state_changed", "step_completed", "story_changed", "gap_found", "flow_issue"]>;
    eventVersion: z.ZodOptional<z.ZodNumber>;
    ts: z.ZodOptional<z.ZodDate>;
    runId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    workflowName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    agentRole: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    payload: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    correlationId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    emittedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    eventId: string;
    eventType: "item_state_changed" | "step_completed" | "story_changed" | "gap_found" | "flow_issue";
    status?: string | null | undefined;
    eventVersion?: number | undefined;
    ts?: Date | undefined;
    runId?: string | null | undefined;
    itemId?: string | null | undefined;
    workflowName?: string | null | undefined;
    agentRole?: string | null | undefined;
    payload?: Record<string, unknown> | null | undefined;
    correlationId?: string | null | undefined;
    source?: string | null | undefined;
    emittedBy?: string | null | undefined;
}, {
    eventId: string;
    eventType: "item_state_changed" | "step_completed" | "story_changed" | "gap_found" | "flow_issue";
    status?: string | null | undefined;
    eventVersion?: number | undefined;
    ts?: Date | undefined;
    runId?: string | null | undefined;
    itemId?: string | null | undefined;
    workflowName?: string | null | undefined;
    agentRole?: string | null | undefined;
    payload?: Record<string, unknown> | null | undefined;
    correlationId?: string | null | undefined;
    source?: string | null | undefined;
    emittedBy?: string | null | undefined;
}>;
export type WorkflowEventInput = z.infer<typeof WorkflowEventInputSchema>;
/**
 * Insert a workflow event into telemetry.workflow_events.
 *
 * - event_id MUST be provided by caller (AC-13)
 * - Duplicate event_id is handled gracefully via ON CONFLICT DO NOTHING (AC-4)
 * - DB errors are caught and logged, never thrown (AC-10)
 * - INFR-0041 AC-9: Validates payload against event_type schema
 */
export declare function insertWorkflowEvent(event: WorkflowEventInput): Promise<void>;
export {};
//# sourceMappingURL=workflow-events.d.ts.map