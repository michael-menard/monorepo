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

## Runbook History

| Date       | Event                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| 2026-03-17 | AUDIT-8: Emergency controls implemented — pause, drain, quarantine        |
| 2026-03-16 | AUDIT-7: Operational visibility baseline — health server, structured logs |
| 2026-03-16 | AUDIT-4: Scheduler dispatch loop, supervisor wired to LangGraph graphs    |
