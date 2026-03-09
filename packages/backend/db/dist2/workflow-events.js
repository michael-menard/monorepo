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
import { logger } from '@repo/logger';
import { db } from './client.js';
import { workflowEvents } from './schema.js';
import { WorkflowEventSchemas } from './workflow-events/schemas.js';
const WorkflowEventInputSchema = z.object({
    eventId: z.string().uuid('event_id must be a valid UUID'),
    eventType: z.enum([
        'item_state_changed',
        'step_completed',
        'story_changed',
        'gap_found',
        'flow_issue',
    ]),
    eventVersion: z.number().int().optional(),
    ts: z.date().optional(),
    runId: z.string().nullable().optional(),
    itemId: z.string().nullable().optional(),
    workflowName: z.string().nullable().optional(),
    agentRole: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    payload: z.record(z.unknown()).nullable().optional(),
    // INFR-0041: New metadata fields
    correlationId: z.string().uuid().nullable().optional(),
    source: z.string().nullable().optional(),
    emittedBy: z.string().nullable().optional(),
});
/**
 * Insert a workflow event into telemetry.workflow_events.
 *
 * - event_id MUST be provided by caller (AC-13)
 * - Duplicate event_id is handled gracefully via ON CONFLICT DO NOTHING (AC-4)
 * - DB errors are caught and logged, never thrown (AC-10)
 * - INFR-0041 AC-9: Validates payload against event_type schema
 */
export async function insertWorkflowEvent(event) {
    // Validate input - fail fast if event_id is missing (AC-13)
    const parsed = WorkflowEventInputSchema.parse(event);
    // INFR-0041 AC-9: Validate payload against event_type-specific schema
    if (parsed.payload !== null && parsed.payload !== undefined) {
        const schema = WorkflowEventSchemas[parsed.eventType];
        try {
            schema.parse(parsed.payload);
        }
        catch (error) {
            throw new Error(`[telemetry] Invalid payload for event_type '${parsed.eventType}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    try {
        await db
            .insert(workflowEvents)
            .values({
            eventId: parsed.eventId,
            eventType: parsed.eventType,
            eventVersion: parsed.eventVersion ?? 1,
            ts: parsed.ts ?? new Date(),
            runId: parsed.runId ?? null,
            itemId: parsed.itemId ?? null,
            workflowName: parsed.workflowName ?? null,
            agentRole: parsed.agentRole ?? null,
            status: parsed.status ?? null,
            payload: parsed.payload ?? null,
            correlationId: parsed.correlationId ?? null,
            source: parsed.source ?? null,
            emittedBy: parsed.emittedBy ?? null,
        })
            .onConflictDoNothing({ target: workflowEvents.eventId });
    }
    catch (error) {
        // Resilient error handling: log warning, don't crash orchestrator (AC-10)
        logger.warn(`[telemetry] Failed to insert workflow event ${parsed.eventId}:`, error instanceof Error ? error.message : error);
    }
}
