/**
 * Workflow Event Helper Functions (INFR-0041)
 *
 * Provides typed helper functions for creating workflow events.
 * Each helper function validates its payload before returning.
 *
 * AC-10: createItemStateChangedEvent()
 * AC-11: createStepCompletedEvent(), createStoryChangedEvent(), createGapFoundEvent(), createFlowIssueEvent()
 */
import { randomUUID } from 'crypto';
import { ItemStateChangedPayloadSchema, StepCompletedPayloadSchema, StoryChangedPayloadSchema, GapFoundPayloadSchema, FlowIssuePayloadSchema, } from './schemas.js';
/**
 * AC-10: Create item_state_changed event
 * Tracks state transitions for workflow items
 */
export function createItemStateChangedEvent(params) {
    const payload = {
        from_state: params.fromState,
        to_state: params.toState,
        item_id: params.itemId,
        item_type: params.itemType,
        reason: params.reason,
    };
    // Validate payload
    ItemStateChangedPayloadSchema.parse(payload);
    return {
        eventId: randomUUID(),
        eventType: 'item_state_changed',
        itemId: params.itemId,
        runId: params.runId ?? null,
        workflowName: params.workflowName ?? null,
        agentRole: params.agentRole ?? null,
        correlationId: params.correlationId ?? null,
        source: params.source ?? null,
        emittedBy: params.emittedBy ?? null,
        payload,
    };
}
/**
 * AC-11: Create step_completed event
 * Tracks completion of workflow steps with metrics
 */
export function createStepCompletedEvent(params) {
    const payload = {
        step_name: params.stepName,
        duration_ms: params.durationMs,
        tokens_used: params.tokensUsed,
        model: params.model,
        status: params.status,
        error_message: params.errorMessage,
    };
    // Validate payload
    StepCompletedPayloadSchema.parse(payload);
    return {
        eventId: randomUUID(),
        eventType: 'step_completed',
        runId: params.runId ?? null,
        workflowName: params.workflowName ?? null,
        agentRole: params.agentRole ?? null,
        correlationId: params.correlationId ?? null,
        source: params.source ?? null,
        emittedBy: params.emittedBy ?? null,
        status: params.status,
        payload,
    };
}
/**
 * AC-11: Create story_changed event
 * Tracks changes to story data
 */
export function createStoryChangedEvent(params) {
    const payload = {
        change_type: params.changeType,
        field_changed: params.fieldChanged,
        old_value: params.oldValue,
        new_value: params.newValue,
        item_id: params.itemId,
    };
    // Validate payload
    StoryChangedPayloadSchema.parse(payload);
    return {
        eventId: randomUUID(),
        eventType: 'story_changed',
        itemId: params.itemId,
        runId: params.runId ?? null,
        workflowName: params.workflowName ?? null,
        agentRole: params.agentRole ?? null,
        correlationId: params.correlationId ?? null,
        source: params.source ?? null,
        emittedBy: params.emittedBy ?? null,
        payload,
    };
}
/**
 * AC-11: Create gap_found event
 * Tracks gaps detected in workflow execution
 */
export function createGapFoundEvent(params) {
    const payload = {
        gap_type: params.gapType,
        gap_description: params.gapDescription,
        severity: params.severity,
        item_id: params.itemId,
        workflow_name: params.workflowName,
    };
    // Validate payload
    GapFoundPayloadSchema.parse(payload);
    return {
        eventId: randomUUID(),
        eventType: 'gap_found',
        itemId: params.itemId,
        runId: params.runId ?? null,
        workflowName: params.workflowName,
        agentRole: params.agentRole ?? null,
        correlationId: params.correlationId ?? null,
        source: params.source ?? null,
        emittedBy: params.emittedBy ?? null,
        payload,
    };
}
/**
 * AC-11: Create flow_issue event
 * Tracks issues encountered during workflow execution
 */
export function createFlowIssueEvent(params) {
    const payload = {
        issue_type: params.issueType,
        issue_description: params.issueDescription,
        recovery_action: params.recoveryAction,
        workflow_name: params.workflowName,
        agent_role: params.agentRole,
    };
    // Validate payload
    FlowIssuePayloadSchema.parse(payload);
    return {
        eventId: randomUUID(),
        eventType: 'flow_issue',
        runId: params.runId ?? null,
        workflowName: params.workflowName,
        agentRole: params.agentRole ?? null,
        correlationId: params.correlationId ?? null,
        source: params.source ?? null,
        emittedBy: params.emittedBy ?? null,
        payload,
    };
}
