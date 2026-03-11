/**
 * Workflow Event Helper Functions (INFR-0041)
 *
 * Provides typed helper functions for creating workflow events.
 * Each helper function validates its payload before returning.
 *
 * AC-10: createItemStateChangedEvent()
 * AC-11: createStepCompletedEvent(), createStoryChangedEvent(), createGapFoundEvent(), createFlowIssueEvent()
 */
import type { WorkflowEventInput } from '../workflow-events.js';
/**
 * Helper function parameters - common metadata fields across all event types
 */
interface CommonEventParams {
    runId?: string;
    workflowName?: string;
    agentRole?: string;
    correlationId?: string;
    source?: string;
    emittedBy?: string;
}
/**
 * AC-10: Create item_state_changed event
 * Tracks state transitions for workflow items
 */
export declare function createItemStateChangedEvent(params: {
    fromState: string;
    toState: string;
    itemId: string;
    itemType: string;
    reason?: string;
} & CommonEventParams): WorkflowEventInput;
/**
 * AC-11: Create step_completed event
 * Tracks completion of workflow steps with metrics
 */
export declare function createStepCompletedEvent(params: {
    stepName: string;
    durationMs: number;
    tokensUsed?: number;
    model?: string;
    status: 'success' | 'error';
    errorMessage?: string;
} & CommonEventParams): WorkflowEventInput;
/**
 * AC-11: Create story_changed event
 * Tracks changes to story data
 */
export declare function createStoryChangedEvent(params: {
    changeType: 'created' | 'updated' | 'deleted';
    fieldChanged: string;
    oldValue?: unknown;
    newValue?: unknown;
    itemId: string;
} & CommonEventParams): WorkflowEventInput;
/**
 * AC-11: Create gap_found event
 * Tracks gaps detected in workflow execution
 */
export declare function createGapFoundEvent(params: {
    gapType: 'missing_ac' | 'scope_creep' | 'dependency_missing' | 'other';
    gapDescription: string;
    severity: 'low' | 'medium' | 'high';
    itemId: string;
    workflowName: string;
} & CommonEventParams): WorkflowEventInput;
/**
 * AC-11: Create flow_issue event
 * Tracks issues encountered during workflow execution
 */
export declare function createFlowIssueEvent(params: {
    issueType: 'agent_blocked' | 'tool_failure' | 'timeout' | 'other';
    issueDescription: string;
    recoveryAction?: string;
    workflowName: string;
    agentRole?: string;
} & Omit<CommonEventParams, 'agentRole'>): WorkflowEventInput;
export {};
//# sourceMappingURL=helpers.d.ts.map