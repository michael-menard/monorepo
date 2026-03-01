# Workflow Error Types

> **Auto-generated from TypeScript schema**
> Source: `packages/backend/orchestrator/src/errors/workflow-errors.ts`
> Generated: 2026-03-01T17:25:09.116Z

## Error Types

| Error Type | Description | Retryable |
|------------|-------------|-----------|
| `AGENT_SPAWN_FAILED` | Task tool failed to spawn agent | — |
| `AGENT_TIMEOUT` | Agent exceeded time limit | — |
| `MALFORMED_OUTPUT` | Agent output doesn't match schema | — |
| `PRECONDITION_FAILED` | Required input missing | — |
| `EXTERNAL_SERVICE_DOWN` | KB, git, or other service unavailable | — |

## Error Contract

Each error includes:
- `type`: One of the error types above
- `phase`: The phase where the error occurred
- `node`: The node/agent that failed
- `message`: Human-readable error description
- `retryable`: Whether the operation can be retried
- `retryCount`: Current retry attempt (0-indexed)
- `maxRetries`: Maximum retry attempts allowed
- `timestamp`: ISO-8601 timestamp

## Usage

```typescript
import { WorkflowErrorSchema } from '@repo/orchestrator'

const error = WorkflowErrorSchema.parse({
  type: 'AGENT_TIMEOUT',
  phase: 'dev-implementation',
  node: 'dev-implement-backend-coder',
  message: 'Agent exceeded 5 minute timeout',
  retryable: true,
  retryCount: 0,
  maxRetries: 3,
  timestamp: new Date().toISOString(),
})
```
