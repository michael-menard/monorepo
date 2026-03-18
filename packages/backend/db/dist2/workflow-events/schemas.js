/**
 * Workflow Event Payload Schemas (INFR-0041)
 *
 * Defines Zod schemas for all 5 event types with typed payloads.
 * Each event_type has a specific schema that validates its payload structure.
 *
 * Event Types:
 * - item_state_changed: State transitions (backlog -> in-progress, etc.)
 * - step_completed: Workflow step execution metrics
 * - story_changed: Changes to story data (created, updated, deleted)
 * - gap_found: Detected gaps in workflow execution
 * - flow_issue: Issues encountered during workflow execution
 */
import { z } from 'zod';
/**
 * AC-1: item_state_changed event payload
 * Tracks state transitions for workflow items (stories, tasks, etc.)
 */
export const ItemStateChangedPayloadSchema = z.object({
    from_state: z.string(),
    to_state: z.string(),
    item_id: z.string(),
    item_type: z.string(),
    reason: z.string().optional(),
});
/**
 * AC-2: step_completed event payload
 * Tracks completion of workflow steps with metrics
 */
export const StepCompletedPayloadSchema = z.object({
    step_name: z.string(),
    duration_ms: z.number(),
    tokens_used: z.number().optional(),
    model: z.string().optional(),
    status: z.enum(['success', 'error']),
    error_message: z.string().optional(),
});
/**
 * AC-3: story_changed event payload
 * Tracks changes to story data
 */
export const StoryChangedPayloadSchema = z.object({
    change_type: z.enum(['created', 'updated', 'deleted']),
    field_changed: z.string(),
    old_value: z.unknown().optional(),
    new_value: z.unknown().optional(),
    item_id: z.string(),
});
/**
 * AC-4: gap_found event payload
 * Tracks gaps detected in workflow execution
 */
export const GapFoundPayloadSchema = z.object({
    gap_type: z.enum(['missing_ac', 'scope_creep', 'dependency_missing', 'other']),
    gap_description: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    item_id: z.string(),
    workflow_name: z.string(),
});
/**
 * AC-5: flow_issue event payload
 * Tracks issues encountered during workflow execution
 */
export const FlowIssuePayloadSchema = z.object({
    issue_type: z.enum(['agent_blocked', 'tool_failure', 'timeout', 'other']),
    issue_description: z.string(),
    recovery_action: z.string().optional(),
    workflow_name: z.string(),
    agent_role: z.string().optional(),
});
/**
 * AC-12: Unified WorkflowEventSchemas object
 * Provides easy access to all event-specific schemas
 */
export const WorkflowEventSchemas = {
    item_state_changed: ItemStateChangedPayloadSchema,
    step_completed: StepCompletedPayloadSchema,
    story_changed: StoryChangedPayloadSchema,
    gap_found: GapFoundPayloadSchema,
    flow_issue: FlowIssuePayloadSchema,
};
