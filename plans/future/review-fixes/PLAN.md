# Workflow Hardening Improvements

## Objective

Harden both the Claude workflow system (`docs/FULL_WORKFLOW.md`, `.claude/commands/`, `.claude/agents/`) and the LangGraph orchestrator (`packages/backend/orchestrator/`) to address gaps identified in agent builder review.

## Scope

### Target Systems

1. **Claude Workflow** - Markdown-based command/agent system
   - `docs/FULL_WORKFLOW.md` - Master documentation
   - `.claude/commands/*.md` - Command orchestrators
   - `.claude/agents/*.agent.md` - Phase leaders and workers

2. **LangGraph Orchestrator** - TypeScript-based graph execution
   - `packages/backend/orchestrator/src/graphs/` - Graph definitions
   - `packages/backend/orchestrator/src/nodes/` - Node implementations
   - `packages/backend/orchestrator/src/artifacts/` - Artifact schemas

---

## Artifact Mapping (Claude ↔ LangGraph)

Each improvement creates paired artifacts that must stay synchronized:

| # | Improvement | Claude Workflow Artifact | LangGraph Artifact |
|---|-------------|--------------------------|-------------------|
| 1 | Error Contracts | `docs/FULL_WORKFLOW.md` § Error Handling | `src/errors/workflow-errors.ts` |
| 2 | Parallel Workers | `docs/FULL_WORKFLOW.md` § Parallel Worker Config | `src/utils/parallel-executor.ts` |
| 3 | State Machine | `docs/FULL_WORKFLOW.md` § State Transition Matrix | `src/state/story-state-machine.ts` |
| 4 | Token Budget | `docs/FULL_WORKFLOW.md` § Token Management | `src/utils/token-budget.ts` |
| 5 | Idempotency | `docs/FULL_WORKFLOW.md` § Idempotency | `src/utils/idempotency.ts` |
| 6 | Model Assignments | `.claude/config/model-assignments.yaml` | `src/config/model-assignments.ts` |
| 7 | Observability | `docs/FULL_WORKFLOW.md` § Observability | `src/observability/tracer.ts`, `metrics.ts` |
| 8 | Testing | `docs/FULL_WORKFLOW.md` § Testing Agents | `__tests__/fixtures/`, test helpers |

**Rule**: When implementing any story, both columns MUST be updated together.

---

## Required Changes

### 1. Error Contracts (HIGH PRIORITY)

**Problem:** No explicit error handling contracts between phases.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` a new section "## Error Handling" after "## Evidence Bundle":

```markdown
## Error Handling

### Error Types

| Error Type | Description | Recovery |
|------------|-------------|----------|
| `AGENT_SPAWN_FAILED` | Task tool failed to spawn agent | Retry once, then FAIL phase |
| `AGENT_TIMEOUT` | Agent exceeded time limit | Kill agent, mark phase TIMEOUT |
| `MALFORMED_OUTPUT` | Agent output doesn't match schema | Log error, retry with clarification |
| `PRECONDITION_FAILED` | Required input missing | FAIL with specific missing item |
| `EXTERNAL_SERVICE_DOWN` | KB, git, or other service unavailable | Use fallback or FAIL with advisory |

### Per-Phase Error Contracts

Each phase leader MUST handle:
1. Worker spawn failures (retry once)
2. Worker timeout (configurable, default 5 minutes)
3. Partial worker success (document policy)
4. Malformed artifacts (validate before accepting)

### Circuit Breaker Pattern

After 3 consecutive failures of the same type within a phase:
1. Stop retrying
2. Write `ERROR-LOG.yaml` to `_implementation/`
3. Set story status to `blocked`
4. Require manual intervention
```

Add error handling section to each command `.md` file.

**LangGraph Changes:**

Create `packages/backend/orchestrator/src/errors/workflow-errors.ts`:

```typescript
import { z } from 'zod'

export const WorkflowErrorSchema = z.object({
  type: z.enum([
    'AGENT_SPAWN_FAILED',
    'AGENT_TIMEOUT',
    'MALFORMED_OUTPUT',
    'PRECONDITION_FAILED',
    'EXTERNAL_SERVICE_DOWN',
  ]),
  phase: z.string(),
  node: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  timestamp: z.string().datetime(),
})

export type WorkflowError = z.infer<typeof WorkflowErrorSchema>
```

Add error handling to each node with try/catch and structured error returns.

---

### 2. Parallel Worker Synchronization (HIGH PRIORITY)

**Problem:** No timeout handling or partial failure semantics for parallel workers.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` in Phase 5 (Code Review):

```markdown
### Parallel Worker Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `worker_timeout_ms` | 300000 (5 min) | Max time per worker |
| `partial_pass_threshold` | 1.0 | Fraction of workers that must pass (1.0 = all) |
| `fail_fast` | false | Stop all workers on first failure |

### Partial Failure Policy

- **All 6 PASS** → Overall PASS
- **5/6 PASS, 1 TIMEOUT** → Overall PASS with warning (timeout worker logged)
- **4/6 PASS, 2 FAIL** → Overall FAIL (requires all to pass)
- **Any CRASH** → Overall ERROR (not FAIL), requires investigation
```

Update `.claude/commands/dev-code-review.md` to include timeout and aggregation logic.

**LangGraph Changes:**

Create `packages/backend/orchestrator/src/utils/parallel-executor.ts`:

```typescript
import { z } from 'zod'

export const ParallelConfigSchema = z.object({
  timeoutMs: z.number().default(300000),
  partialPassThreshold: z.number().min(0).max(1).default(1.0),
  failFast: z.boolean().default(false),
})

export const ParallelResultSchema = z.object({
  workers: z.array(z.object({
    name: z.string(),
    status: z.enum(['PASS', 'FAIL', 'TIMEOUT', 'ERROR']),
    durationMs: z.number(),
    output: z.unknown().optional(),
    error: z.string().optional(),
  })),
  overall: z.enum(['PASS', 'FAIL', 'TIMEOUT', 'ERROR']),
  passRate: z.number(),
})
```

---

### 3. Complete State Machine (MEDIUM PRIORITY)

**Problem:** 17 statuses but only ~10 shown in state diagram. Missing transitions.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` after "Story Status Lifecycle" table:

```markdown
### State Transition Matrix

| From Status | Valid Transitions | Trigger |
|-------------|-------------------|---------|
| `pending` | `generated` | `/pm-story generate` |
| `generated` | `in-elaboration` | `/elab-story` starts |
| `in-elaboration` | `ready-to-work`, `needs-refinement`, `needs-split` | `/elab-story` verdict |
| `needs-refinement` | `generated` | `/pm-fix-story` completes |
| `needs-split` | `generated` (for splits) | `/pm-story split` completes |
| `ready-to-work` | `in-progress` | `/dev-implement-story` starts |
| `in-progress` | `ready-for-qa`, `blocked` | Implementation completes or max iterations |
| `ready-for-qa` | `in-qa` | `/qa-verify-story` starts |
| `in-qa` | `uat`, `in-progress` | QA verify verdict |
| `uat` | `completed`, `in-progress` | `/qa-gate` verdict |
| `completed` | (terminal) | Merge complete |
| `blocked` | `in-progress`, `cancelled` | Manual unblock or cancel |
| `cancelled` | (terminal) | Manual cancellation |

### Blocked Status

Stories enter `blocked` when:
- Max review iterations exceeded without `--force-continue`
- External dependency unavailable
- Manual block by user

To unblock:
1. Resolve the blocking condition
2. Run `/story-update {STORY} in-progress`
3. Resume with `/dev-implement-story {STORY}`

### Cancelled Status

Cancellation is terminal. To revive a cancelled story:
1. Create a new story referencing the cancelled one
2. Copy relevant artifacts if needed
```

**LangGraph Changes:**

Create `packages/backend/orchestrator/src/state/story-state-machine.ts`:

```typescript
import { z } from 'zod'

export const StoryStatusSchema = z.enum([
  'pending',
  'generated',
  'in-elaboration',
  'needs-refinement',
  'needs-split',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'in-qa',
  'uat',
  'completed',
  'blocked',
  'cancelled',
])

export const validTransitions: Record<string, string[]> = {
  pending: ['generated'],
  generated: ['in-elaboration'],
  'in-elaboration': ['ready-to-work', 'needs-refinement', 'needs-split'],
  'needs-refinement': ['generated'],
  'needs-split': ['generated'],
  'ready-to-work': ['in-progress'],
  'in-progress': ['ready-for-qa', 'blocked'],
  'ready-for-qa': ['in-qa'],
  'in-qa': ['uat', 'in-progress'],
  uat: ['completed', 'in-progress'],
  completed: [],
  blocked: ['in-progress', 'cancelled'],
  cancelled: [],
}

export function canTransition(from: string, to: string): boolean {
  return validTransitions[from]?.includes(to) ?? false
}
```

---

### 4. Token Budget Enforcement (MEDIUM PRIORITY)

**Problem:** Token tracking is "low priority" but critical for cost control.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` new section "## Token Management":

```markdown
## Token Management

### Budget Thresholds

| Phase | Warning Threshold | Hard Limit |
|-------|-------------------|------------|
| PM Story Generation | 50K tokens | 100K tokens |
| Elaboration | 30K tokens | 60K tokens |
| Dev Implementation | 200K tokens | 500K tokens |
| Code Review | 50K tokens | 100K tokens |
| QA Verification | 50K tokens | 100K tokens |

### Enforcement Levels

1. **Advisory (current)** - Log to TOKEN-LOG.md, continue
2. **Warning** - Log + display warning to user, continue
3. **Soft Gate** - Log + require user confirmation to continue
4. **Hard Gate** - Log + FAIL phase, require budget increase

### Configuration

Set in story frontmatter:
```yaml
token_budget:
  enforcement: warning  # advisory | warning | soft_gate | hard_gate
  multiplier: 1.5       # Allow 1.5x default thresholds
```

### Tracking

Each phase leader MUST:
1. Call `/token-log` at phase completion
2. Check cumulative tokens against budget
3. Apply enforcement level if exceeded
```

Update `/token-log` skill to support enforcement levels.

**LangGraph Changes:**

Create `packages/backend/orchestrator/src/utils/token-budget.ts`:

```typescript
import { z } from 'zod'

export const TokenBudgetConfigSchema = z.object({
  enforcement: z.enum(['advisory', 'warning', 'soft_gate', 'hard_gate']).default('warning'),
  multiplier: z.number().min(0.5).max(5).default(1.0),
})

export const PhaseTokenLimitsSchema = z.object({
  pm_story: z.object({ warning: z.number(), hard: z.number() }),
  elaboration: z.object({ warning: z.number(), hard: z.number() }),
  dev_implementation: z.object({ warning: z.number(), hard: z.number() }),
  code_review: z.object({ warning: z.number(), hard: z.number() }),
  qa_verification: z.object({ warning: z.number(), hard: z.number() }),
})

export const DEFAULT_LIMITS: z.infer<typeof PhaseTokenLimitsSchema> = {
  pm_story: { warning: 50000, hard: 100000 },
  elaboration: { warning: 30000, hard: 60000 },
  dev_implementation: { warning: 200000, hard: 500000 },
  code_review: { warning: 50000, hard: 100000 },
  qa_verification: { warning: 50000, hard: 100000 },
}
```

---

### 5. Idempotency Guarantees (MEDIUM PRIORITY)

**Problem:** Undefined behavior when commands run twice.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` new section "## Idempotency":

```markdown
## Idempotency

### Command Behavior on Re-run

| Command | If Already Complete | Behavior |
|---------|---------------------|----------|
| `/pm-story generate` | Story exists | ERROR: "Story already exists. Use --force to overwrite." |
| `/elab-story` | ELAB file exists | SKIP: "Already elaborated. Use --force to re-run." |
| `/dev-implement-story` | PROOF exists | RESUME: Auto-detect stage, continue from there |
| `/dev-code-review` | VERIFICATION.yaml exists | RE-RUN: Always re-runs (code may have changed) |
| `/qa-verify-story` | Status is `uat` | SKIP: "Already verified." |
| `/qa-gate` | Gate file exists | RE-RUN: Always re-runs (may have new evidence) |
| `/wt-finish` | Branch merged | ERROR: "Already merged." |

### Force Flags

- `--force` - Overwrite existing artifacts, re-run from scratch
- `--resume` - (deprecated) Auto-resume is now default
- `--skip-existing` - Skip phases that have artifacts, don't fail

### Artifact Locking

During execution, phases write a `.lock` file:
- `_implementation/.phase-lock`
- Contains: phase name, start time, PID

If lock exists and is < 1 hour old, command fails with "Phase in progress".
If lock is > 1 hour old, considered stale and ignored.
```

**LangGraph Changes:**

Create `packages/backend/orchestrator/src/utils/idempotency.ts`:

```typescript
import { z } from 'zod'

export const IdempotencyConfigSchema = z.object({
  mode: z.enum(['error', 'skip', 'resume', 'rerun', 'force']).default('resume'),
  lockTimeoutMs: z.number().default(3600000), // 1 hour
})

export const PhaseLockSchema = z.object({
  phase: z.string(),
  startedAt: z.string().datetime(),
  pid: z.number().optional(),
  host: z.string().optional(),
})

export async function checkIdempotency(
  storyPath: string,
  phase: string,
  config: z.infer<typeof IdempotencyConfigSchema>
): Promise<{ action: 'proceed' | 'skip' | 'error', reason?: string }> {
  // Implementation
}
```

---

### 6. Centralized Model Assignments (LOW PRIORITY)

**Problem:** Model assignments scattered across agent files.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` new section "## Model Assignments":

```markdown
## Model Assignments

### Agent Model Matrix

| Agent | Model | Rationale |
|-------|-------|-----------|
| **Setup Leaders** | | |
| `*-setup-leader.agent.md` | haiku | Simple validation, low complexity |
| `elab-setup-leader` | haiku | Input validation only |
| `dev-setup-leader` | haiku | Scope detection |
| `qa-verify-setup-leader` | haiku | Precondition checks |
| **Work Leaders** | | |
| `pm-story-generation-leader` | sonnet | Complex story synthesis |
| `elab-analyst` | sonnet | Multi-point audit analysis |
| `dev-implement-planning-leader` | sonnet | Architecture decisions |
| `dev-implement-implementation-leader` | sonnet | Code generation coordination |
| `qa-verify-verification-leader` | sonnet | Test execution and analysis |
| **Workers** | | |
| `code-review-*` | haiku | Focused single-check validation |
| `dev-implement-*-coder` | sonnet | Code generation |
| `pm-draft-test-plan` | haiku | Template-based generation |
| **Completion Leaders** | | |
| `*-completion-leader.agent.md` | haiku | Status updates, artifact writes |

### Model Selection Criteria

- **haiku**: Validation, status updates, template filling, single-focus checks
- **sonnet**: Analysis, code generation, multi-factor decisions, synthesis
- **opus**: Reserved for critical judgment calls (not currently used)
```

Create `.claude/config/model-assignments.yaml` as source of truth.

**LangGraph Changes:**

Create `packages/backend/orchestrator/src/config/model-assignments.ts`:

```typescript
export const modelAssignments: Record<string, 'haiku' | 'sonnet' | 'opus'> = {
  // Setup leaders
  'elab-setup-leader': 'haiku',
  'dev-setup-leader': 'haiku',
  'qa-verify-setup-leader': 'haiku',

  // Work leaders
  'pm-story-generation-leader': 'sonnet',
  'elab-analyst': 'sonnet',
  'dev-implement-planning-leader': 'sonnet',

  // Workers
  'code-review-lint': 'haiku',
  'code-review-syntax': 'haiku',
  'dev-implement-backend-coder': 'sonnet',

  // Completion leaders
  'elab-completion-leader': 'haiku',
  'dev-documentation-leader': 'haiku',
}
```

---

### 7. Observability Section (LOW PRIORITY)

**Problem:** No tracing, logging, or metrics guidance.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` new section "## Observability":

```markdown
## Observability

### Trace Points

Each phase emits traces to `_implementation/TRACE.jsonl`:

```json
{"event": "phase_start", "phase": "dev-setup", "timestamp": "...", "story": "WISH-001"}
{"event": "agent_spawn", "agent": "dev-setup-leader", "model": "haiku", "timestamp": "..."}
{"event": "tool_call", "tool": "Read", "path": "/path/to/file", "timestamp": "..."}
{"event": "agent_complete", "agent": "dev-setup-leader", "tokens": 1234, "timestamp": "..."}
{"event": "phase_complete", "phase": "dev-setup", "status": "PASS", "timestamp": "..."}
```

### Metrics

Collected in `_implementation/METRICS.yaml`:

```yaml
story_id: WISH-001
phases:
  - name: dev-setup
    duration_ms: 12340
    tokens_input: 5000
    tokens_output: 1234
    agent_spawns: 1
    tool_calls: 15
    status: PASS
```

### Log Levels

- `DEBUG` - Tool calls, artifact reads/writes
- `INFO` - Phase transitions, verdicts
- `WARN` - Threshold exceeded, retries
- `ERROR` - Failures, blocked states
```

**LangGraph Changes:**

Create `packages/backend/orchestrator/src/observability/tracer.ts`:

```typescript
import { z } from 'zod'

export const TraceEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('phase_start'),
    phase: z.string(),
    story: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    event: z.literal('agent_spawn'),
    agent: z.string(),
    model: z.enum(['haiku', 'sonnet', 'opus']),
    timestamp: z.string().datetime(),
  }),
  z.object({
    event: z.literal('tool_call'),
    tool: z.string(),
    path: z.string().optional(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    event: z.literal('agent_complete'),
    agent: z.string(),
    tokens: z.number(),
    durationMs: z.number(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    event: z.literal('phase_complete'),
    phase: z.string(),
    status: z.enum(['PASS', 'FAIL', 'TIMEOUT', 'ERROR']),
    timestamp: z.string().datetime(),
  }),
])

export type TraceEvent = z.infer<typeof TraceEventSchema>

export class WorkflowTracer {
  private events: TraceEvent[] = []

  emit(event: TraceEvent): void {
    this.events.push(event)
  }

  async flush(path: string): Promise<void> {
    // Write events as JSONL to path
  }
}
```

Create `packages/backend/orchestrator/src/observability/metrics.ts`:

```typescript
import { z } from 'zod'

export const PhaseMetricsSchema = z.object({
  name: z.string(),
  durationMs: z.number(),
  tokensInput: z.number(),
  tokensOutput: z.number(),
  agentSpawns: z.number(),
  toolCalls: z.number(),
  status: z.enum(['PASS', 'FAIL', 'TIMEOUT', 'ERROR']),
})

export const StoryMetricsSchema = z.object({
  storyId: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  phases: z.array(PhaseMetricsSchema),
  totalTokens: z.number(),
  totalDurationMs: z.number(),
})

export type StoryMetrics = z.infer<typeof StoryMetricsSchema>

export class MetricsCollector {
  private metrics: Partial<z.infer<typeof StoryMetricsSchema>> = {}

  startStory(storyId: string): void {
    this.metrics = { storyId, startedAt: new Date().toISOString(), phases: [] }
  }

  recordPhase(phase: z.infer<typeof PhaseMetricsSchema>): void {
    this.metrics.phases?.push(phase)
  }

  finalize(): z.infer<typeof StoryMetricsSchema> {
    // Calculate totals and return
  }
}
```

---

### 8. Testing Section (LOW PRIORITY)

**Problem:** No guidance on testing new agents.

**Claude Workflow Changes:**

Add to `docs/FULL_WORKFLOW.md` new section "## Testing Agents":

```markdown
## Testing Agents

### Unit Testing an Agent

1. Create test fixture in `__tests__/fixtures/`:
   ```
   __tests__/fixtures/
     STORY-TEST/
       STORY-TEST.md
       _pm/
         TEST-PLAN.md
       _implementation/
         (expected outputs)
   ```

2. Run agent in isolation:
   ```bash
   claude --agent .claude/agents/my-new-agent.agent.md \
     --input "Process STORY-TEST" \
     --dry-run
   ```

3. Verify outputs match expected fixtures

### Integration Testing

1. Use harness story (WRKF-000) as integration test
2. Run full workflow with `--dry-run` to validate orchestration
3. Check CHECKPOINT.md for correct phase progression

### Regression Testing

Before merging agent changes:
1. Run `/dev-implement-story WRKF-000 --dry-run`
2. Compare TRACE.jsonl with baseline
3. Ensure no new errors or warnings
```

---

## Implementation Order

1. **Phase 1 (High Priority)**
   - Error contracts (both systems)
   - Parallel worker synchronization (both systems)

2. **Phase 2 (Medium Priority)**
   - Complete state machine (both systems)
   - Token budget enforcement (both systems)
   - Idempotency guarantees (both systems)

3. **Phase 3 (Low Priority)**
   - Centralized model assignments
   - Observability section
   - Testing section

---

## Acceptance Criteria

- [ ] `docs/FULL_WORKFLOW.md` updated with all new sections
- [ ] Each command `.md` file has error handling section
- [ ] LangGraph has Zod schemas for all new types
- [ ] State machine is complete with all 17 statuses
- [ ] Token budget has at least "warning" level enforcement
- [ ] All commands document idempotency behavior
- [ ] Model assignments centralized in config file
- [ ] TRACE.jsonl format documented and implemented
- [ ] Agent testing guide with example fixtures

## Synchronization Strategy

### Single Source of Truth

To prevent drift between Claude workflow and LangGraph orchestrator:

| Artifact | Source of Truth | Consumers |
|----------|-----------------|-----------|
| **Story Status Enum** | `packages/backend/orchestrator/src/state/story-state-machine.ts` | Claude agents read from generated `STATUS-ENUM.md` |
| **Error Types** | `packages/backend/orchestrator/src/errors/workflow-errors.ts` | Claude agents reference error type names |
| **Token Limits** | `packages/backend/orchestrator/src/utils/token-budget.ts` | `docs/FULL_WORKFLOW.md` table generated from TS |
| **Model Assignments** | `.claude/config/model-assignments.yaml` | LangGraph reads YAML, Claude agents reference directly |
| **Parallel Config** | `packages/backend/orchestrator/src/utils/parallel-executor.ts` | Claude commands reference defaults |

### Sync Enforcement

**Pre-commit hook** (`scripts/check-workflow-sync.ts`):

```typescript
// Verify Claude workflow and LangGraph stay in sync
import { StoryStatusSchema } from '../packages/backend/orchestrator/src/state/story-state-machine'
import { WorkflowErrorSchema } from '../packages/backend/orchestrator/src/errors/workflow-errors'
import { parseMarkdownTable } from './utils'

async function checkSync() {
  // 1. Verify FULL_WORKFLOW.md status table matches StoryStatusSchema
  const mdStatuses = parseMarkdownTable('docs/FULL_WORKFLOW.md', 'Story Status Lifecycle')
  const tsStatuses = StoryStatusSchema.options
  assertArraysEqual(mdStatuses, tsStatuses, 'Story statuses out of sync')

  // 2. Verify error types match
  const mdErrors = parseMarkdownTable('docs/FULL_WORKFLOW.md', 'Error Types')
  const tsErrors = WorkflowErrorSchema.shape.type._def.values
  assertArraysEqual(mdErrors, tsErrors, 'Error types out of sync')

  // 3. Verify token limits match
  // ...
}
```

**CI check**: Run sync verification on every PR that touches:
- `docs/FULL_WORKFLOW.md`
- `.claude/commands/*.md`
- `.claude/agents/*.agent.md`
- `packages/backend/orchestrator/src/**/*.ts`

### Generated Documentation

Generate markdown from TypeScript to ensure consistency:

```bash
# Add to package.json scripts
"generate:workflow-docs": "ts-node scripts/generate-workflow-docs.ts"
```

This generates:
- `docs/generated/STATUS-ENUM.md` - From StoryStatusSchema
- `docs/generated/ERROR-TYPES.md` - From WorkflowErrorSchema
- `docs/generated/TOKEN-LIMITS.md` - From DEFAULT_LIMITS

Claude agents can `Read` these generated files for authoritative values.

### Implementation Checklist Per Story

Each story implementing a sync'd feature MUST:

- [ ] Update TypeScript schema in `packages/backend/orchestrator/`
- [ ] Run `pnpm generate:workflow-docs` to regenerate markdown
- [ ] Update `docs/FULL_WORKFLOW.md` referencing generated docs
- [ ] Update relevant `.claude/commands/*.md` files
- [ ] Update relevant `.claude/agents/*.agent.md` files
- [ ] Verify CI sync check passes

---

## Notes

- Maintain backward compatibility with existing stories
- Use Zod schemas for all new TypeScript types (per CLAUDE.md)
- Update changelog in FULL_WORKFLOW.md for each change
- Test changes on WRKF-000 harness story before applying to feature stories
- **Always update both systems together** - never merge a PR that updates only one
