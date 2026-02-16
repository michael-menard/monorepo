/**
 * Telemetry Database Schema
 *
 * Defines the telemetry.workflow_events table for tracking workflow execution events.
 * Append-only, immutable event log for orchestrator state transitions, step completions, etc.
 *
 * Story: INFR-0040 - Workflow Events Table + Ingestion
 *
 * Schema Isolation:
 * - All tables are in the 'telemetry' PostgreSQL schema namespace
 * - Isolated from application data (public, umami, kb, work, ai schemas)
 */

import {
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { z } from 'zod'

/**
 * Workflow Event Payload Schema
 * Event-specific data stored in JSONB payload column.
 * Each event_type may have different payload structure.
 * Per CLAUDE.md: Using Zod schema with z.infer<> instead of TypeScript type alias
 */
export const WorkflowEventPayloadSchema = z
  .object({
    // Common fields across all event types
    message: z.string().optional(),
    error: z.string().optional(),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
    // Event-type specific fields
    previousState: z.string().optional(),
    newState: z.string().optional(),
    stepName: z.string().optional(),
    duration: z.number().optional(),
    tokens: z.number().optional(),
    cost: z.number().optional(),
    gapType: z.string().optional(),
    severity: z.string().optional(),
  })
  .passthrough() // Allow additional properties like Record<string, unknown>

export type WorkflowEventPayload = z.infer<typeof WorkflowEventPayloadSchema>

// Define the 'telemetry' PostgreSQL schema namespace
export const telemetrySchema = pgSchema('telemetry')

// Workflow event type enum (5 core event types)
export const workflowEventTypeEnum = telemetrySchema.enum('workflow_event_type', [
  'item_state_changed',
  'step_completed',
  'story_changed',
  'gap_found',
  'flow_issue',
])

// Workflow Events Table - append-only, immutable event log
export const workflowEvents = telemetrySchema.table(
  'workflow_events',
  {
    eventId: uuid('event_id').primaryKey().defaultRandom(),
    eventType: workflowEventTypeEnum('event_type').notNull(),
    eventVersion: integer('event_version').notNull().default(1),
    ts: timestamp('ts').notNull().defaultNow(),
    runId: text('run_id'),
    itemId: text('item_id'),
    workflowName: text('workflow_name'),
    agentRole: text('agent_role'),
    status: text('status'),
    payload: jsonb('payload').$type<WorkflowEventPayload>(),
    // INFR-0041: Metadata columns for distributed tracing and debugging
    correlationId: uuid('correlation_id'), // AC-6: Link to OpenTelemetry trace IDs
    source: text('source'), // AC-7: Source system/service that emitted event
    emittedBy: text('emitted_by'), // AC-8: Agent/node that emitted event
  },
  table => ({
    // Unique index on event_id for idempotent ingestion (AC-4)
    uniqueEventId: uniqueIndex('idx_workflow_events_event_id_unique').on(table.eventId),
    // Composite index for telemetry queries: "show all step_completed events in last 24h" (AC-5)
    eventTypeTsIdx: index('idx_workflow_events_event_type_ts').on(table.eventType, table.ts),
    // Composite index for run-specific queries: "show all events for run-123" (AC-6)
    runIdTsIdx: index('idx_workflow_events_run_id_ts').on(table.runId, table.ts),
    // Single-column indexes for frequently queried columns (AC-7)
    itemIdIdx: index('idx_workflow_events_item_id').on(table.itemId),
    workflowNameIdx: index('idx_workflow_events_workflow_name').on(table.workflowName),
    agentRoleIdx: index('idx_workflow_events_agent_role').on(table.agentRole),
    statusIdx: index('idx_workflow_events_status').on(table.status),
    tsIdx: index('idx_workflow_events_ts').on(table.ts),
  }),
)
