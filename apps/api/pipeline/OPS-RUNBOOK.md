# Pipeline Ops Runbook

> Last updated: 2026-03-17 (AUDIT-8: Emergency Controls)

This runbook covers day-to-day operations, emergency procedures, and
observability for the autonomous pipeline (`apps/api/pipeline`).

---

## Emergency Controls (AUDIT-8)

Before the first automated pipeline run, these controls MUST be verified.

### Prerequisites

All emergency commands require `REDIS_URL` to be set. Quarantine additionally
requires `KB_DB_PASSWORD`.

```bash
export REDIS_URL=redis://localhost:6379
export KB_DB_PASSWORD=<password>
```

### 1 — Pause All Dispatch

**When to use:** Runaway agent detected; unexpected resource consumption;
need to stop ALL new job dispatch immediately.

```bash
npx tsx apps/api/pipeline/src/cli/index.ts emergency pause
```

- Calls `queue.pause()` at the BullMQ server level — ALL workers stop picking
  up new jobs
- Active (in-flight) jobs continue to completion
- Does NOT remove jobs from the queue — they stay waiting

**To resume:**

```bash
# From code or REPL:
await queue.resume()
# Or: restart the supervisor process (it will re-pick waiting jobs)
```

### 2 — Drain Waiting Jobs

**When to use:** After pausing, want to clear the backlog before a full stop.

```bash
npx tsx apps/api/pipeline/src/cli/index.ts emergency drain
```

- Calls `queue.drain()` — removes all waiting (not active) jobs
- Combine with pause for a clean "emergency stop all":

```bash
# Full emergency stop sequence:
npx tsx apps/api/pipeline/src/cli/index.ts emergency pause
npx tsx apps/api/pipeline/src/cli/index.ts emergency drain
# Then send SIGTERM to the supervisor process to drain in-flight jobs
kill -TERM <supervisor-pid>
```

### 3 — Quarantine a Story

**When to use:** A specific story is causing errors, loops, or unexpected
behavior. Block it from re-dispatch without affecting other stories.

```bash
npx tsx apps/api/pipeline/src/cli/index.ts emergency quarantine STORY-ID "reason description"
```

Example:

```bash
npx tsx apps/api/pipeline/src/cli/index.ts emergency quarantine ORCH-2010 "runaway agent loop detected — investigation needed"
```

What it does:

1. Sets `state=blocked` in the KB with the provided reason
2. Removes any waiting/delayed BullMQ job for that story
3. Active jobs for this story finish but the `complete` node will see the
   blocked state and skip KB advancement

**To unblock a story** (after investigation):

```sql
UPDATE workflow.stories SET state = 'ready', blocked_by_story = NULL
WHERE story_id = 'ORCH-2010';
```

Or use `kb_update_story_status({ story_id: 'ORCH-2010', state: 'ready' })`.

---

## Concurrency Control (AUDIT-8 Task 4)

The scheduler concurrency is controlled via environment variable:

```bash
# Default: 3 parallel LangGraph runs
SCHEDULER_MAX_CONCURRENT=3

# Serial/safe mode (before first real run):
SCHEDULER_MAX_CONCURRENT=1
```

**Recommendation for first real run:** Set `SCHEDULER_MAX_CONCURRENT=1` for
serial execution. Increase to 2-3 only after verifying single-story execution.

The supervisor BullMQ Worker concurrency (`concurrency.maxWorktrees`) defaults
to 1. It is set via `PipelineSupervisorConfig` in bootstrap.

---

## Iteration Limits (AUDIT-8 Task 3)

All LangGraph graphs have numeric iteration caps:

| Graph             | iterationCount       | maxIterations                | On exhaustion      |
| ----------------- | -------------------- | ---------------------------- | ------------------ |
| dev-implement     | state.iterationCount | 2 (default)                  | `abort_to_blocked` |
| review            | state.iterationCount | 2 (default)                  | `abort_to_blocked` |
| qa-verify         | state.iterationCount | 2 (default)                  | `abort_to_blocked` |
| change-loop node  | retryCount           | MAX_CHANGE_RETRIES=3         | returns 'abort'    |
| story-attack node | iteration            | maxIterationsPerAssumption=3 | exits loop         |
| batch-process     | retryCount           | maxRetriesPerStory=2         | returns failure    |

**BullMQ level:** The queue is configured with `attempts: 3` + exponential
backoff. This is the outermost retry cap.

**Note (2026-03-17):** The `shouldEscalate()` function is defined and correct
in all graphs. The retry loops that call it are stubs pending real LLM wiring
(AUDIT-3 implementation). Before wiring real LLM calls, each retry loop MUST
call `shouldEscalate()` in its conditional edge to enforce the cap.

Escalation path:

- `iterationCount = 0`: proceed (Sonnet)
- `iterationCount = 1`: escalate to Opus
- `iterationCount >= 2`: abort → story set to `blocked`

---

## Scheduler Poll Loop (AUDIT-4 F001)

The scheduler polls KB every 30s (configurable via `SCHEDULER_POLL_INTERVAL_MS`).

On each tick:

1. Counts active + waiting BullMQ jobs
2. If `activeCount + waitingCount >= SCHEDULER_MAX_CONCURRENT`: skip
3. Queries KB for `state='ready'` stories with resolved dependencies
4. Applies finish-before-new-start ordering (F005)
5. Atomically advances story to `in_progress` BEFORE enqueuing (F006)

**The scheduler respects blocked state automatically** — it only queries
`state='ready'` stories, so `blocked` stories are never dispatched.

---

## Viewing Queue State

```bash
# Job counts:
npx tsx apps/api/pipeline/src/cli/index.ts queue status

# List all jobs:
npx tsx apps/api/pipeline/src/cli/index.ts queue jobs

# Filter by status:
npx tsx apps/api/pipeline/src/cli/index.ts queue jobs --status waiting
npx tsx apps/api/pipeline/src/cli/index.ts queue jobs --status active
npx tsx apps/api/pipeline/src/cli/index.ts queue jobs --status failed
```

## Health Check

```bash
curl http://localhost:9091/health
# Returns: { draining: false, activeJobs: 0, startTimeMs: ... }

curl http://localhost:9091/live
# Returns 200 while process is alive
```

---

## Signal Handling

| Signal    | Effect                                                                                   |
| --------- | ---------------------------------------------------------------------------------------- |
| `SIGTERM` | Triggers drain: pause worker → wait for in-flight → exit(0) or exit(1) on timeout        |
| `SIGINT`  | Same as SIGTERM                                                                          |
| `SIGKILL` | Hard stop — in-flight jobs left in 'active' state (BullMQ stall detection handles these) |

Drain timeout: `SUPERVISOR_DRAIN_TIMEOUT_MS` (default 10 min = matches stage timeout).

---

---

## First Supervised Run (PIPE-4010, AC-10)

This section covers the complete procedure for running the first end-to-end pipeline
execution with a human operator monitoring. Before starting, run the pre-flight check.

### Prerequisites

Set all required environment variables:

```bash
export REDIS_URL=redis://localhost:6379
export KB_DB_HOST=localhost
export KB_DB_PORT=5432
export KB_DB_NAME=knowledge_base
export KB_DB_USER=postgres
export KB_DB_PASSWORD=<password>
export SCHEDULER_MAX_CONCURRENT=1   # Serial mode for first run
```

### Step 0: Pre-flight Check

Run the pre-flight script before starting supervisor or scheduler:

```bash
npx tsx apps/api/pipeline/scripts/preflight-check.ts --test-story <STORY-ID>
```

The script checks:

- All 4 dependency stories (PIPE-0030, PIPE-3020, PIPE-3010, PIPE-2050) are in `completed` state
- Redis is reachable
- KB database is reachable
- Orchestrator graphs module exports `runDevImplement`, `runReview`, `runQAVerify`
- Test story is in `ready` state with valid elaboration artifact

**Do not proceed if any check fails.** Resolve failures as indicated.

Test story selection criteria (AC-9):

- Story must be in `ready` state in KB
- Must have a valid elaboration artifact with `planContent` (ChangeSpec[])
- Must have no unresolved dependencies
- Prefer: backend-only, small scope, no external API changes, no DB migrations

### Step 1: Startup Sequence

Start the supervisor process (terminal 1):

```bash
# Build first (if not already built):
pnpm build --filter @repo/pipeline

# Start supervisor
npx tsx apps/api/pipeline/src/index.ts
```

Verify supervisor is running:

```bash
curl http://localhost:9091/health
# Expected: { "draining": false, "activeJobs": 0, "startTimeMs": <ms> }

curl http://localhost:9091/live
# Expected: HTTP 200
```

Start the scheduler loop (terminal 2):

```bash
npx tsx apps/api/pipeline/src/scheduler/index.ts
```

Verify queue is empty and ready:

```bash
npx tsx apps/api/pipeline/src/cli/index.ts queue status
# Expected: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
```

Ensure the test story is in `ready` state (scheduler picks up `ready` stories only):

```bash
# Confirm via KB query or pipeline-cli
npx tsx apps/api/pipeline/src/cli/index.ts queue jobs
```

### Step 2: Monitoring Dashboard

Watch for these structured log events in order during a successful run:

| Stage      | Log Event                 | Meaning                        |
| ---------- | ------------------------- | ------------------------------ |
| Scheduler  | `scheduler_dispatched`    | Story picked up and enqueued   |
| Supervisor | `job_received`            | BullMQ job received by worker  |
| Supervisor | `dispatching`             | Graph runner invoked for stage |
| Dev stage  | `dev_implement_start`     | dev-implement LangGraph begins |
| Dev stage  | `execute_node_start`      | LLM invocation starting        |
| Dev stage  | `proof_artifact_written`  | Proof artifact saved to KB     |
| Dev stage  | `completed`               | Dev stage job complete         |
| Review     | `review_artifact_written` | Review artifact saved to KB    |
| Review     | `completed`               | Review stage job complete      |
| QA         | `qa_artifact_written`     | QA artifact saved to KB        |
| QA         | `completed`               | QA stage job complete          |

Monitor queue state in real-time (terminal 3):

```bash
# Poll queue every 10 seconds:
watch -n 10 "npx tsx apps/api/pipeline/src/cli/index.ts queue status"

# Watch all jobs:
npx tsx apps/api/pipeline/src/cli/index.ts queue jobs

# Watch active jobs only:
npx tsx apps/api/pipeline/src/cli/index.ts queue jobs --status active
```

Expected state transitions in KB (AC-6):

```
ready → in_progress → needs_code_review → ready_for_qa → in_qa → completed
```

**Note on duplicate rejection logs (F006 deviation):** During QA polling, BullMQ
may emit rejection logs when `dispatchQaStory` is called and a QA job is already
active. This is expected behavior — BullMQ dedup via `{storyId}:qa:{attempt}` jobId
prevents actual double-dispatch. These logs are noise only; ignore them.

### Step 3: Kill Switch (Emergency Stop)

If the run needs to be aborted at any point:

```bash
# 1. Pause all dispatch immediately (stops new job pickup):
npx tsx apps/api/pipeline/src/cli/index.ts emergency pause

# 2. Drain waiting jobs (removes queue backlog):
npx tsx apps/api/pipeline/src/cli/index.ts emergency drain

# 3. Gracefully stop the supervisor (waits for in-flight to finish):
kill -TERM <supervisor-pid>
# In-flight jobs complete, then supervisor exits 0.

# 4. Stop the scheduler loop:
kill -TERM <scheduler-pid>
```

**Hard stop (if graceful stop hangs):**

```bash
kill -9 <supervisor-pid>
kill -9 <scheduler-pid>
# WARNING: In-flight BullMQ jobs left in 'active' state.
# BullMQ stall detection will handle these on next startup.
```

### Step 4: Rollback — Reset Test Story to `ready`

If the test story gets stuck in an intermediate state (e.g., `in_progress` with no
worker running), reset it:

```bash
# Option A: SQL reset
psql -h $KB_DB_HOST -U $KB_DB_USER -d $KB_DB_NAME -c \
  "UPDATE workflow.stories SET state = 'ready' WHERE story_id = '<STORY-ID>';"

# Option B: KB tool (if MCP server is available)
# kb_update_story_status({ story_id: '<STORY-ID>', state: 'ready' })
```

After reset, clear any orphaned BullMQ jobs:

```bash
npx tsx apps/api/pipeline/src/cli/index.ts emergency quarantine <STORY-ID> "rollback after interrupted run"
# Then unblock via SQL or kb_update_story_status with state: 'ready'
```

If an artifact gate blocked a transition, the artifact must exist before retrying:

```bash
# Check which artifacts are missing:
SELECT artifact_type FROM workflow.story_artifacts WHERE story_id = '<STORY-ID>';
```

### Step 5: Verify Proof Artifact Is Real (Not Stub)

After the dev stage completes, verify that real code was generated (AC-3):

```bash
# Query KB for the proof artifact:
psql -h $KB_DB_HOST -U $KB_DB_USER -d $KB_DB_NAME -c \
  "SELECT content FROM workflow.story_artifacts
   WHERE story_id = '<STORY-ID>' AND artifact_type = 'proof'
   ORDER BY iteration DESC LIMIT 1;"
```

**Stub detection:** If the proof artifact content contains `"path": "stub"` or
`evidence: [{path: 'stub'}]`, the dev stage ran with the stub execute node
(PIPE-3010 not yet applied). This means PIPE-3010 must be completed and the
orchestrator rebuilt before a real run.

**Real artifact indicators:**

- `path` field points to an actual file (e.g., `src/foo/bar.ts`)
- `content` field contains TypeScript/JavaScript code
- `evidence` array has multiple entries with real file paths

### Step 6: Post-Run Retrospective (AC-8)

Within 24 hours of run completion, write a retrospective as a KB artifact:

```javascript
// Via MCP or KB API:
artifact_write({
  story_id: '<STORY-ID>',
  artifact_type: 'completion_report',
  phase: 'completion',
  iteration: 0,
  content: {
    run_date: '<ISO-DATE>',
    test_story: '<STORY-ID>',
    states_observed: [
      { state: 'ready', timestamp: '<ISO>' },
      { state: 'in_progress', timestamp: '<ISO>' },
      // ... etc
    ],
    artifacts_produced: [
      { type: 'proof', kb_id: '<UUID>', created_at: '<ISO>' },
      { type: 'review', kb_id: '<UUID>', created_at: '<ISO>' },
      { type: 'qa_gate', kb_id: '<UUID>', created_at: '<ISO>' },
    ],
    stage_durations_sec: {
      dev: 0,
      review: 0,
      qa: 0,
    },
    stage_costs_usd: {
      dev: 0,
      review: 0,
      qa: 0,
    },
    failures: [],
    follow_up_stories: [],
    what_worked: '',
    what_failed: '',
  },
})
```

---

## Runbook History

| Date       | Event                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| 2026-03-19 | PIPE-4010: First Supervised Run section added                             |
| 2026-03-17 | AUDIT-8: Emergency controls implemented — pause, drain, quarantine        |
| 2026-03-16 | AUDIT-7: Operational visibility baseline — health server, structured logs |
| 2026-03-16 | AUDIT-4: Scheduler dispatch loop, supervisor wired to LangGraph graphs    |
