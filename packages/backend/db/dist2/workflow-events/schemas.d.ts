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
export declare const ItemStateChangedPayloadSchema: z.ZodObject<{
    from_state: z.ZodString;
    to_state: z.ZodString;
    item_id: z.ZodString;
    item_type: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    item_id: string;
    from_state: string;
    to_state: string;
    item_type: string;
    reason?: string | undefined;
}, {
    item_id: string;
    from_state: string;
    to_state: string;
    item_type: string;
    reason?: string | undefined;
}>;
export type ItemStateChangedPayload = z.infer<typeof ItemStateChangedPayloadSchema>;
/**
 * AC-2: step_completed event payload
 * Tracks completion of workflow steps with metrics
 */
export declare const StepCompletedPayloadSchema: z.ZodObject<{
    step_name: z.ZodString;
    duration_ms: z.ZodNumber;
    tokens_used: z.ZodOptional<z.ZodNumber>;
    model: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["success", "error"]>;
    error_message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "error" | "success";
    step_name: string;
    duration_ms: number;
    tokens_used?: number | undefined;
    model?: string | undefined;
    error_message?: string | undefined;
}, {
    status: "error" | "success";
    step_name: string;
    duration_ms: number;
    tokens_used?: number | undefined;
    model?: string | undefined;
    error_message?: string | undefined;
}>;
export type StepCompletedPayload = z.infer<typeof StepCompletedPayloadSchema>;
/**
 * AC-3: story_changed event payload
 * Tracks changes to story data
 */
export declare const StoryChangedPayloadSchema: z.ZodObject<{
    change_type: z.ZodEnum<["created", "updated", "deleted"]>;
    field_changed: z.ZodString;
    old_value: z.ZodOptional<z.ZodUnknown>;
    new_value: z.ZodOptional<z.ZodUnknown>;
    item_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    item_id: string;
    change_type: "created" | "updated" | "deleted";
    field_changed: string;
    old_value?: unknown;
    new_value?: unknown;
}, {
    item_id: string;
    change_type: "created" | "updated" | "deleted";
    field_changed: string;
    old_value?: unknown;
    new_value?: unknown;
}>;
export type StoryChangedPayload = z.infer<typeof StoryChangedPayloadSchema>;
/**
 * AC-4: gap_found event payload
 * Tracks gaps detected in workflow execution
 */
export declare const GapFoundPayloadSchema: z.ZodObject<{
    gap_type: z.ZodEnum<["missing_ac", "scope_creep", "dependency_missing", "other"]>;
    gap_description: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high"]>;
    item_id: z.ZodString;
    workflow_name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    severity: "low" | "medium" | "high";
    item_id: string;
    workflow_name: string;
    gap_type: "other" | "missing_ac" | "scope_creep" | "dependency_missing";
    gap_description: string;
}, {
    severity: "low" | "medium" | "high";
    item_id: string;
    workflow_name: string;
    gap_type: "other" | "missing_ac" | "scope_creep" | "dependency_missing";
    gap_description: string;
}>;
export type GapFoundPayload = z.infer<typeof GapFoundPayloadSchema>;
/**
 * AC-5: flow_issue event payload
 * Tracks issues encountered during workflow execution
 */
export declare const FlowIssuePayloadSchema: z.ZodObject<{
    issue_type: z.ZodEnum<["agent_blocked", "tool_failure", "timeout", "other"]>;
    issue_description: z.ZodString;
    recovery_action: z.ZodOptional<z.ZodString>;
    workflow_name: z.ZodString;
    agent_role: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workflow_name: string;
    issue_type: "other" | "agent_blocked" | "tool_failure" | "timeout";
    issue_description: string;
    agent_role?: string | undefined;
    recovery_action?: string | undefined;
}, {
    workflow_name: string;
    issue_type: "other" | "agent_blocked" | "tool_failure" | "timeout";
    issue_description: string;
    agent_role?: string | undefined;
    recovery_action?: string | undefined;
}>;
export type FlowIssuePayload = z.infer<typeof FlowIssuePayloadSchema>;
/**
 * AC-12: Unified WorkflowEventSchemas object
 * Provides easy access to all event-specific schemas
 */
export declare const WorkflowEventSchemas: {
    readonly item_state_changed: z.ZodObject<{
        from_state: z.ZodString;
        to_state: z.ZodString;
        item_id: z.ZodString;
        item_type: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        item_id: string;
        from_state: string;
        to_state: string;
        item_type: string;
        reason?: string | undefined;
    }, {
        item_id: string;
        from_state: string;
        to_state: string;
        item_type: string;
        reason?: string | undefined;
    }>;
    readonly step_completed: z.ZodObject<{
        step_name: z.ZodString;
        duration_ms: z.ZodNumber;
        tokens_used: z.ZodOptional<z.ZodNumber>;
        model: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<["success", "error"]>;
        error_message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "success";
        step_name: string;
        duration_ms: number;
        tokens_used?: number | undefined;
        model?: string | undefined;
        error_message?: string | undefined;
    }, {
        status: "error" | "success";
        step_name: string;
        duration_ms: number;
        tokens_used?: number | undefined;
        model?: string | undefined;
        error_message?: string | undefined;
    }>;
    readonly story_changed: z.ZodObject<{
        change_type: z.ZodEnum<["created", "updated", "deleted"]>;
        field_changed: z.ZodString;
        old_value: z.ZodOptional<z.ZodUnknown>;
        new_value: z.ZodOptional<z.ZodUnknown>;
        item_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        item_id: string;
        change_type: "created" | "updated" | "deleted";
        field_changed: string;
        old_value?: unknown;
        new_value?: unknown;
    }, {
        item_id: string;
        change_type: "created" | "updated" | "deleted";
        field_changed: string;
        old_value?: unknown;
        new_value?: unknown;
    }>;
    readonly gap_found: z.ZodObject<{
        gap_type: z.ZodEnum<["missing_ac", "scope_creep", "dependency_missing", "other"]>;
        gap_description: z.ZodString;
        severity: z.ZodEnum<["low", "medium", "high"]>;
        item_id: z.ZodString;
        workflow_name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        severity: "low" | "medium" | "high";
        item_id: string;
        workflow_name: string;
        gap_type: "other" | "missing_ac" | "scope_creep" | "dependency_missing";
        gap_description: string;
    }, {
        severity: "low" | "medium" | "high";
        item_id: string;
        workflow_name: string;
        gap_type: "other" | "missing_ac" | "scope_creep" | "dependency_missing";
        gap_description: string;
    }>;
    readonly flow_issue: z.ZodObject<{
        issue_type: z.ZodEnum<["agent_blocked", "tool_failure", "timeout", "other"]>;
        issue_description: z.ZodString;
        recovery_action: z.ZodOptional<z.ZodString>;
        workflow_name: z.ZodString;
        agent_role: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        workflow_name: string;
        issue_type: "other" | "agent_blocked" | "tool_failure" | "timeout";
        issue_description: string;
        agent_role?: string | undefined;
        recovery_action?: string | undefined;
    }, {
        workflow_name: string;
        issue_type: "other" | "agent_blocked" | "tool_failure" | "timeout";
        issue_description: string;
        agent_role?: string | undefined;
        recovery_action?: string | undefined;
    }>;
};
/**
 * Discriminated union type for all event payloads
 * Used for type-safe payload validation based on event_type
 */
export type EventTypePayloadMap = {
    item_state_changed: ItemStateChangedPayload;
    step_completed: StepCompletedPayload;
    story_changed: StoryChangedPayload;
    gap_found: GapFoundPayload;
    flow_issue: FlowIssuePayload;
};
export type WorkflowEventType = keyof EventTypePayloadMap;
//# sourceMappingURL=schemas.d.ts.map