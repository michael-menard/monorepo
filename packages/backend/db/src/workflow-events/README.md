# Workflow Event SDK - Typed Schemas & Validation

**Story**: INFR-0041
**Parent**: INFR-0040 (Workflow Events Table + Ingestion)

## Overview

This module provides typed schemas and helper functions for creating workflow telemetry events. Each of the 5 event types has a specific Zod schema that validates its payload structure at runtime.

**Key Features:**
- Runtime payload validation using Zod schemas
- Typed helper functions for each event type
- Auto-generated event IDs
- Metadata fields for distributed tracing (correlation_id, source, emitted_by)
- Fail-fast validation to catch errors immediately

## Event Types

| Event Type | Description | Use Case |
|------------|-------------|----------|
| `item_state_changed` | State transitions for workflow items | Track story/task state changes (backlog → in-progress) |
| `step_completed` | Workflow step execution metrics | Track step duration, tokens used, success/error status |
| `story_changed` | Changes to story data | Track field updates (created/updated/deleted) |
| `gap_found` | Detected gaps in workflow execution | Track missing ACs, scope creep, dependency issues |
| `flow_issue` | Issues encountered during workflow | Track agent blocks, tool failures, timeouts |

## Schema Definitions

### 1. `item_state_changed` (AC-1)

Tracks state transitions for workflow items (stories, tasks, etc.).

**Fields:**
- `from_state` (string, required): Previous state
- `to_state` (string, required): New state
- `item_id` (string, required): Item identifier (e.g., "INFR-0041")
- `item_type` (string, required): Type of item (e.g., "story", "task")
- `reason` (string, optional): Reason for state change

**Example Payload:**
```json
{
  "from_state": "backlog",
  "to_state": "in-progress",
  "item_id": "INFR-0040",
  "item_type": "story",
  "reason": "user action"
}
```

### 2. `step_completed` (AC-2)

Tracks completion of workflow steps with metrics.

**Fields:**
- `step_name` (string, required): Name of the step
- `duration_ms` (number, required): Execution time in milliseconds
- `tokens_used` (number, optional): LLM tokens consumed
- `model` (string, optional): Model used (e.g., "claude-sonnet-4.5")
- `status` (enum, required): "success" | "error"
- `error_message` (string, optional): Error details if status is "error"

**Example Payload:**
```json
{
  "step_name": "elab-story",
  "duration_ms": 45000,
  "tokens_used": 12500,
  "model": "claude-sonnet-4.5",
  "status": "success"
}
```

### 3. `story_changed` (AC-3)

Tracks changes to story data.

**Fields:**
- `change_type` (enum, required): "created" | "updated" | "deleted"
- `field_changed` (string, required): Name of the field that changed
- `old_value` (any, optional): Previous value
- `new_value` (any, optional): New value
- `item_id` (string, required): Story identifier

**Example Payload:**
```json
{
  "change_type": "updated",
  "field_changed": "status",
  "old_value": "backlog",
  "new_value": "in-progress",
  "item_id": "INFR-0040"
}
```

### 4. `gap_found` (AC-4)

Tracks gaps detected in workflow execution.

**Fields:**
- `gap_type` (enum, required): "missing_ac" | "scope_creep" | "dependency_missing" | "other"
- `gap_description` (string, required): Description of the gap
- `severity` (enum, required): "low" | "medium" | "high"
- `item_id` (string, required): Item identifier
- `workflow_name` (string, required): Name of the workflow

**Example Payload:**
```json
{
  "gap_type": "missing_ac",
  "gap_description": "No AC for error handling in insertWorkflowEvent",
  "severity": "high",
  "item_id": "INFR-0040",
  "workflow_name": "elab-story"
}
```

### 5. `flow_issue` (AC-5)

Tracks issues encountered during workflow execution.

**Fields:**
- `issue_type` (enum, required): "agent_blocked" | "tool_failure" | "timeout" | "other"
- `issue_description` (string, required): Description of the issue
- `recovery_action` (string, optional): Action taken to recover
- `workflow_name` (string, required): Name of the workflow
- `agent_role` (string, optional): Agent that encountered the issue

**Example Payload:**
```json
{
  "issue_type": "tool_failure",
  "issue_description": "Git push failed: permission denied",
  "recovery_action": "retry with --force-with-lease",
  "workflow_name": "dev-implement-story",
  "agent_role": "dev-implementation-leader"
}
```

## Metadata Columns

INFR-0041 added 3 new metadata columns to the `workflow_events` table:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `correlation_id` | uuid (nullable) | Link to OpenTelemetry trace IDs for distributed tracing | "550e8400-e29b-41d4-a716-446655440000" |
| `source` | text (nullable) | Source system/service that emitted the event | "orchestrator", "langgraph-node", "claude-code" |
| `emitted_by` | text (nullable) | Agent/node that emitted the event | "dev-implementation-leader", "pm-story-seed-agent" |

**Migration**: These columns were added via migration `0017_majestic_mulholland_black.sql` and are backward compatible (nullable).

## Usage Examples

### Using Helper Functions (Recommended)

Helper functions provide the easiest way to create events with type safety and validation:

```typescript
import {
  createItemStateChangedEvent,
  createStepCompletedEvent,
  createStoryChangedEvent,
  createGapFoundEvent,
  createFlowIssueEvent,
  insertWorkflowEvent,
} from '@repo/db'

// Example 1: Track state change
const stateChangeEvent = createItemStateChangedEvent({
  fromState: 'backlog',
  toState: 'in-progress',
  itemId: 'INFR-0041',
  itemType: 'story',
  reason: 'developer started work',
  // Optional metadata
  runId: 'run-123',
  workflowName: 'dev-implement-story',
  agentRole: 'dev-implementation-leader',
  correlationId: '550e8400-e29b-41d4-a716-446655440000',
  source: 'orchestrator',
  emittedBy: 'dev-implementation-leader',
})

await insertWorkflowEvent(stateChangeEvent)

// Example 2: Track step completion
const stepEvent = createStepCompletedEvent({
  stepName: 'elab-story',
  durationMs: 45000,
  tokensUsed: 12500,
  model: 'claude-sonnet-4.5',
  status: 'success',
  runId: 'run-123',
})

await insertWorkflowEvent(stepEvent)

// Example 3: Track story changes
const changeEvent = createStoryChangedEvent({
  changeType: 'updated',
  fieldChanged: 'status',
  oldValue: 'backlog',
  newValue: 'in-progress',
  itemId: 'INFR-0041',
  runId: 'run-123',
})

await insertWorkflowEvent(changeEvent)

// Example 4: Track gaps
const gapEvent = createGapFoundEvent({
  gapType: 'missing_ac',
  gapDescription: 'No AC for error handling in validation',
  severity: 'high',
  itemId: 'INFR-0041',
  workflowName: 'elab-story',
  runId: 'run-123',
})

await insertWorkflowEvent(gapEvent)

// Example 5: Track flow issues
const issueEvent = createFlowIssueEvent({
  issueType: 'tool_failure',
  issueDescription: 'Git push failed: permission denied',
  recoveryAction: 'retry with --force-with-lease',
  workflowName: 'dev-implement-story',
  agentRole: 'dev-implementation-leader',
  runId: 'run-123',
})

await insertWorkflowEvent(issueEvent)
```

### Using Schemas Directly (Advanced)

If you need custom event construction, you can use the schemas directly:

```typescript
import { WorkflowEventSchemas, insertWorkflowEvent } from '@repo/db'
import { randomUUID } from 'crypto'

// Validate a payload manually
const payload = {
  from_state: 'backlog',
  to_state: 'in-progress',
  item_id: 'INFR-0041',
  item_type: 'story',
}

// Validate before using
const validatedPayload = WorkflowEventSchemas.item_state_changed.parse(payload)

// Insert manually (not recommended - use helpers instead)
await insertWorkflowEvent({
  eventId: randomUUID(),
  eventType: 'item_state_changed',
  itemId: 'INFR-0041',
  payload: validatedPayload,
})
```

### Accessing Schema Exports

```typescript
import {
  WorkflowEventSchemas,
  ItemStateChangedPayloadSchema,
  StepCompletedPayloadSchema,
} from '@repo/db'

// Use the unified schemas object (AC-12)
const schema = WorkflowEventSchemas['item_state_changed']
schema.parse(payload) // Validate

// Or use individual schema exports
ItemStateChangedPayloadSchema.parse(payload)
```

## Error Handling

### Validation Errors

Validation errors are thrown with clear messages indicating the event type and field name:

```typescript
try {
  await insertWorkflowEvent({
    eventId: randomUUID(),
    eventType: 'step_completed',
    payload: {
      step_name: 'test-step',
      duration_ms: 1000,
      status: 'pending', // Invalid enum value!
    },
  })
} catch (error) {
  // Error: [telemetry] Invalid payload for event_type 'step_completed':
  // Invalid enum value. Expected 'success' | 'error', received 'pending'
}
```

### Database Errors

Database errors are caught and logged (INFR-0040 resilient error handling):

```typescript
// insertWorkflowEvent never throws DB errors - it logs warnings instead
await insertWorkflowEvent(event) // Safe to call - won't crash your orchestrator
```

## TypeScript Types

All payload types are exported for use in your code:

```typescript
import type {
  ItemStateChangedPayload,
  StepCompletedPayload,
  StoryChangedPayload,
  GapFoundPayload,
  FlowIssuePayload,
  EventTypePayloadMap,
  WorkflowEventType,
} from '@repo/db'

// Use in function signatures
function processStateChange(payload: ItemStateChangedPayload) {
  console.log(`State changed: ${payload.from_state} -> ${payload.to_state}`)
}

// Type-safe event type mapping
type EventPayload<T extends WorkflowEventType> = EventTypePayloadMap[T]
```

## Migration Notes

### Upgrading from INFR-0040

INFR-0041 is **backward compatible** with INFR-0040. Existing code will continue to work:

1. **Existing events**: Old events without metadata columns will have NULL values
2. **Existing calls**: `insertWorkflowEvent()` accepts events with or without metadata
3. **Payload validation**: Only applies if payload is non-null (NULL payloads are allowed)

### Running the Migration

```bash
# Generate migration (already done in INFR-0041)
pnpm --filter @repo/database-schema db:generate

# Run migration
pnpm --filter @repo/database-schema db:migrate
```

**Migration File**: `0017_majestic_mulholland_black.sql`

**SQL Commands**:
```sql
ALTER TABLE "telemetry"."workflow_events" ADD COLUMN "correlation_id" uuid;
ALTER TABLE "telemetry"."workflow_events" ADD COLUMN "source" text;
ALTER TABLE "telemetry"."workflow_events" ADD COLUMN "emitted_by" text;
```

### Rollback Plan

If migration fails:

```bash
# Manual rollback (if needed)
psql $DATABASE_URL -c "ALTER TABLE telemetry.workflow_events DROP COLUMN correlation_id, DROP COLUMN source, DROP COLUMN emitted_by"
```

## Related Stories

- **INFR-0040**: Workflow Events Table + Ingestion (parent story)
- **INFR-0050**: Event SDK with hooks/middleware (blocked by this story)
- **TELE-0010**: Docker Telemetry Stack (blocked by this story)

## References

- [INFR-0040 Story](../../../plans/future/platform/UAT/INFR-0040/)
- [Database Schema](../../database-schema/src/schema/telemetry.ts)
- [Workflow Events Tests](./__tests__/workflow-events.test.ts)
