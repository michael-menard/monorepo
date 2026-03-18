---
created: 2026-03-08
updated: 2026-03-08
version: 1.0.0
name: telemetry-log
description: Log an agent invocation record for a specific phase of story workflow. Called by workflow agents after completing a phase. Writes to the workflow.agent_invocations table via workflow_log_invocation MCP tool.
kb_tools:
  - workflow_log_invocation
---

# /telemetry-log - Log Agent Invocation

## Usage

```
/telemetry-log STORY-XXX agent-name phase status [options]
```

## Arguments

- `STORY-XXX` — story ID (e.g., WINT-3020, WRKF-1021). Optional — pass `null` if not story-scoped.
- `agent-name` — name of the agent being logged (e.g., `dev-execute-leader`, `pm-bootstrap-workflow`)
- `phase` — standardized phase name (see table below). Optional.
- `status` — invocation outcome: `success`, `failure`, or `partial`

### Standard Phase Values

| Phase     | When Used                                                 |
| --------- | --------------------------------------------------------- |
| `setup`   | Phase 0 — environment validation, worktree setup          |
| `plan`    | Phase 1 — plan generation (pm-bootstrap, dev-plan-leader) |
| `execute` | Phase 2 — implementation execution (dev-execute-leader)   |
| `review`  | Phase 3 — code review (dev-code-review)                   |
| `qa`      | Phase 4 — quality assurance (qa-verify-story)             |

## Task

1. Call `workflow_log_invocation` MCP tool with the provided arguments:

```javascript
workflow_log_invocation({
  agentName: 'agent-name',
  storyId: 'STORY-XXX',
  phase: 'phase',
  status: 'success',
  inputTokens: 1200,
  outputTokens: 400,
  cachedTokens: 0,
  durationMs: 4200,
  modelName: 'claude-sonnet-4-6',
  invocationId: 'agent-name-STORY-XXX-2026-03-08T23:55:00Z',
})
```

2. If the call returns a row, report success with the `invocationId`.
3. If the call returns `null`, log a warning and continue — do not block the workflow.

## Parameters

| Parameter      | Type                               | Required | Default        | Description                                                                                      |
| -------------- | ---------------------------------- | -------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `agentName`    | string                             | yes      | —              | Name of the calling agent                                                                        |
| `invocationId` | string (UUID)                      | no       | auto-generated | Unique ID for this invocation. Recommend `{agentName}-{storyId}-{isoTimestamp}` for idempotency. |
| `storyId`      | string                             | no       | null           | Story ID this invocation is associated with                                                      |
| `phase`        | `setup\|plan\|execute\|review\|qa` | no       | null           | Workflow phase                                                                                   |
| `status`       | `success\|failure\|partial`        | yes      | —              | Outcome of the invocation                                                                        |
| `inputTokens`  | integer ≥ 0                        | no       | null           | Input token count                                                                                |
| `outputTokens` | integer ≥ 0                        | no       | null           | Output token count                                                                               |
| `cachedTokens` | integer ≥ 0                        | no       | 0              | Cached/prompt-hit token count                                                                    |
| `durationMs`   | integer ≥ 0                        | no       | null           | Wall-clock duration in milliseconds                                                              |
| `modelName`    | string                             | no       | null           | LLM model name (e.g., `claude-sonnet-4-6`)                                                       |
| `errorMessage` | string                             | no       | null           | Error message if status is `failure`                                                             |

## Output

After logging, report the result:

```
Invocation logged for STORY-XXX:
  Agent: agent-name
  Phase: phase
  Status: success
  Tokens: 1,200 in / 400 out / 0 cached
  Duration: 4,200ms
  InvocationId: agent-name-STORY-XXX-2026-03-08T23:55:00Z
```

If `workflow_log_invocation` returns `null`:

```
Warning: telemetry-log could not persist invocation record (DB unavailable or duplicate ID).
Continuing workflow — telemetry is a side-effect, not a gate.
```

## Error Handling

If `workflow_log_invocation` returns `null` or throws:

- Log a warning message with the error context
- **Continue the primary workflow** — telemetry is fire-and-forget
- The calling agent must never block or fail due to a telemetry write error
- This behavior ensures the skill never gates critical workflow paths

If `status` is an invalid value (not `success`, `failure`, or `partial`):

- The MCP tool will reject the call with a Zod validation error
- Correct the `status` value and retry

If `agentName` is missing:

- The MCP tool will reject the call with a Zod validation error
- Provide a non-empty `agentName` string

## Examples

```javascript
// Example 1: Full invocation after execute phase
workflow_log_invocation({
  agentName: 'dev-execute-leader',
  storyId: 'WINT-3020',
  phase: 'execute',
  status: 'success',
  inputTokens: 1200,
  outputTokens: 400,
  cachedTokens: 0,
  durationMs: 4200,
  modelName: 'claude-sonnet-4-6',
  invocationId: 'dev-execute-leader-WINT-3020-2026-03-08T23:55:00Z',
})
// → Row inserted in workflow.agent_invocations

// Example 2: Minimal call — only required fields
workflow_log_invocation({
  agentName: 'qa-verify-story',
  status: 'failure',
  invocationId: 'qa-verify-story-WINT-3020-2026-03-08T23:56:00Z',
  errorMessage: 'Type check failed with 3 errors',
})
// → Row inserted with storyId/phase/tokens all null, cachedTokens = 0

// Example 3: Partial status (some work completed before interruption)
workflow_log_invocation({
  agentName: 'dev-execute-leader',
  storyId: 'WINT-3020',
  phase: 'execute',
  status: 'partial',
  inputTokens: 800,
  outputTokens: 200,
  durationMs: 2100,
})
// → Row inserted with status = 'partial'
```
