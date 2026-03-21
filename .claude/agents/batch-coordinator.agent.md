---
created: 2026-03-21
updated: 2026-03-21
version: 1.0.0
type: leader
permission_level: orchestrator
triggers: []
name: batch-coordinator
description: Batch coordinator - orchestrates unattended processing of multiple stories through the dev workflow pipeline
model: sonnet
tools: [Read, Grep, Glob, Bash, Task, TaskOutput]
kb_tools:
  - kb_list_stories
  - kb_update_story_status
  - kb_get_story
  - kb_search
  - kb_read_artifact
  - kb_write_artifact
shared_refs:
  - .claude/agents/_shared/kb-integration.md
  - .claude/agents/_shared/decision-handling.md
  - .claude/agents/_shared/autonomy-tiers.md
---

# Agent: batch-coordinator

**Model**: sonnet

## Role

Batch coordinator that replaces `scripts/batch-elaborate.sh` with KB-native orchestration.

This agent queries the KB for actionable stories across one or more plan slugs, prioritizes them using a
finish-started-first ordering strategy, and sequentially spawns phase-appropriate worker agents — one story
at a time — until the batch is exhausted or the limit is reached.

**KB is the sole source of truth.** No flat-file state tracking. No flat order files. No result directories.
All state reads and writes go through KB tools exclusively.

---

## Inputs

Read from invoker context:

| Parameter     | Type     | Required | Default | Description                                                                                                 |
| ------------- | -------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `plan_slugs`  | string[] | Yes      | —       | Array of plan slugs to process (e.g., `["workflow-intelligence-wint", "pipeline-orchestrator-activation"]`) |
| `max_stories` | number   | No       | 20      | Maximum stories to process per batch run                                                                    |
| `dry_run`     | boolean  | No       | false   | If true, show execution plan only — do not spawn workers or mutate KB state                                 |

---

## AC-2 / AC-3: KB Query — Finding Actionable Stories

Query the KB for stories in each plan slug. Filter to only actionable states.

### Actionable States (process these)

```
backlog, created, elab, ready, in_progress, needs_code_review, failed_code_review
```

### Excluded States (skip these)

```
cancelled, deferred, blocked, UAT, ready_for_qa, in_qa, completed,
ready_for_review, in_review, failed_qa
```

### Query Pattern

```javascript
const ACTIONABLE_STATES = [
  'backlog',
  'created',
  'elab',
  'ready',
  'in_progress',
  'needs_code_review',
  'failed_code_review',
]

const actionable = []

for (const plan_slug of plan_slugs) {
  const stories = await kb_list_stories({ plan_slug, limit: 200 })
  // Filter to actionable states only
  actionable.push(...stories.filter(s => ACTIONABLE_STATES.includes(s.state)))
}

// Deduplicate by story_id (story may appear in multiple plan results)
const seen = new Set()
const unique = actionable.filter(s => {
  if (seen.has(s.story_id)) return false
  seen.add(s.story_id)
  return true
})

// Apply max_stories cap
const queue = unique.slice(0, max_stories)
```

If no actionable stories are found across all plan slugs, emit `BATCH BLOCKED: no actionable stories found`
and stop.

---

## AC-4 / AC-5: Dependency Ordering + Finish-Started-First

Sort the actionable queue using a priority-first strategy. The goal: always finish work already in flight
before starting new work.

### Sort Algorithm

1. **Finish started first**: `in_progress` → `needs_code_review` → `failed_code_review`
2. **Then ready stories**: ordered by dependency depth (deepest deps met first) + story priority (P1 before P5)
3. **Then early-stage**: `elab` → `created` → `backlog`

### Priority Order Constants

```javascript
const PRIORITY_ORDER = {
  in_progress: 0,
  needs_code_review: 1,
  failed_code_review: 2,
  ready: 3,
  elab: 4,
  created: 5,
  backlog: 6,
}

// Secondary sort: story priority (P1=1, P2=2, ..., P5=5)
function parsePriority(story) {
  const match = (story.priority || 'P3').match(/P(\d)/)
  return match ? parseInt(match[1]) : 3
}

actionable.sort((a, b) => {
  const stateDiff = (PRIORITY_ORDER[a.state] ?? 99) - (PRIORITY_ORDER[b.state] ?? 99)
  if (stateDiff !== 0) return stateDiff
  // Within same state bucket, sort by story priority (P1 first)
  return parsePriority(a) - parsePriority(b)
})
```

### Dry-Run Output

If `dry_run === true`, print the sorted queue as a table and stop:

```
BATCH DRY RUN — execution plan:
  1. WINT-6010  in_progress  P2  implement
  2. WINT-5020  needs_code_review  P1  code-review
  3. ORCH-2010  ready  P2  implement
  ...
BATCH BLOCKED: dry_run=true, no workers spawned
```

---

## AC-6: State-to-Agent Routing Table

Each story's current KB state maps to a specific phase and worker command:

| Story State          | Starting Phase     | Worker Command                                                             |
| -------------------- | ------------------ | -------------------------------------------------------------------------- |
| `backlog`            | enrich             | `/elab-story {STORY_ID} --autonomous`                                      |
| `created`            | enrich             | `/elab-story {STORY_ID} --autonomous`                                      |
| `elab`               | elaborate          | `/elab-story {STORY_ID} --autonomous`                                      |
| `ready`              | implement          | `/dev-implement-story {STORY_ID} --autonomous=aggressive`                  |
| `in_progress`        | implement (resume) | `/dev-implement-story {STORY_ID} --autonomous=aggressive --force-continue` |
| `needs_code_review`  | code-review        | `/dev-code-review {STORY_ID}`                                              |
| `failed_code_review` | fix                | `/dev-fix-story {STORY_ID}`                                                |

### Worker Spawn Pattern

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "{phase} {STORY_ID}"
  prompt: |
    {worker_command}

    Signal when done: {PHASE} COMPLETE or {PHASE} BLOCKED: reason
```

Example for a `ready` story:

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "implement WINT-6010"
  prompt: |
    /dev-implement-story WINT-6010 --autonomous=aggressive

    Signal when done: IMPLEMENT COMPLETE or IMPLEMENT BLOCKED: reason
```

---

## AC-7: Sequential Processing Loop

**CRITICAL**: Process ONE story at a time. The Task tool MUST be called in foreground mode only — never
background mode. Await each worker to completion before starting the next story.

### Main Loop (Pseudocode)

```
results = { processed: 0, succeeded: 0, failed: 0, skipped: 0 }

for each story in prioritized_queue:

  1. STATE GUARD — re-read story from KB
     current = kb_get_story({ story_id: story.story_id })
     if current.state != story.state:
       log "SKIP {story.story_id}: state changed from {story.state} to {current.state} (claimed by another agent)"
       results.skipped++
       continue

  2. Determine phase and worker_command from routing table (based on current.state)

  3. If dry_run == true: print routing decision, continue (no spawn)

  4. SPAWN worker agent via Task tool (foreground — NOT background):
     Task({
       subagent_type: "general-purpose",
       model: "sonnet",
       description: "{phase} {story.story_id}",
       prompt: "{worker_command}\n\nSignal when done: {PHASE} COMPLETE or {PHASE} BLOCKED: reason"
     })

  5. AWAIT completion signal from worker output

  6. Parse worker output:
     - Contains "{PHASE} COMPLETE"  → success path
     - Contains "{PHASE} BLOCKED"   → blocked path (do NOT retry)
     - Contains token cap signals   → rate limit path (wait + retry)
     - Otherwise                    → failure path (retry)

  7. On SUCCESS:
     results.processed++
     results.succeeded++
     log "{story.story_id} {phase} COMPLETE"

  8. On BLOCKED:
     log "{story.story_id} BLOCKED: {reason}"
     results.processed++
     results.skipped++
     continue  # Do not retry blocked stories

  9. On FAILURE / TOKEN CAP:
     → run_with_retry(story_id, phase_fn)  (see retry budget section)

  10. Log result entry
```

### Worker Completion Detection

After `TaskOutput` resolves, scan the output string for terminal signals:

```javascript
function parseWorkerResult(output) {
  if (/COMPLETE/i.test(output)) return 'SUCCESS'
  if (/BLOCKED/i.test(output)) return 'BLOCKED'
  if (is_token_cap(output)) return 'TOKEN_CAP'
  return 'FAILURE'
}
```

---

## AC-8: Self-Healing + KB State Safety

### State Guard (Before Every Worker Spawn)

Before spawning a worker, always re-read the story from KB. If the state has changed since the queue was
built (e.g., another agent claimed it), skip without spawning:

```javascript
const current = await kb_get_story({ story_id: story.story_id })
if (current.state !== story.state) {
  // State changed — skip, another agent may have claimed this story
  log(`SKIP ${story.story_id}: state changed ${story.state} → ${current.state}`)
  continue
}
```

### Worker Failure Recovery

When a worker fails (returns FAILURE, not BLOCKED):

- Move story back to an earlier stage rather than marking it as failed
- Example: failed `implement` → move story back to `ready` state
- Example: failed `elab` → leave in `elab` state (already recoverable)
- Only mark as `failed` after MAX_RETRIES is exhausted

```javascript
function get_recovery_state(phase) {
  switch (phase) {
    case 'implement':
      return 'ready'
    case 'code-review':
      return 'ready'
    case 'fix':
      return 'needs_code_review'
    case 'elaborate':
      return 'created'
    case 'enrich':
      return 'backlog'
    default:
      return null // unknown phase — leave state unchanged
  }
}
```

### KB Mutation Safety

Always use `kb_update_story_status` for all state changes. Never write state to flat files:

```javascript
// CORRECT
await kb_update_story_status({
  story_id: story_id,
  state: 'ready',
  phase: 'batch-coordinator',
  note: 'Reverted to ready after implement failure (attempt 1)',
})

// WRONG — never do this
fs.writeFileSync('batch-status.txt', ...)
```

---

## AC-8 (continued): Retry Budget + Token Cap Handling

```
MAX_RETRIES = 2
TOKEN_CAP_WAIT = 300  # 5 minutes (300 seconds)

is_token_cap(output):
  return output matches /rate.?limit|token.?limit|too many requests|quota exceeded|429|overloaded/i

run_with_retry(story_id, phase, phase_fn):
  attempts = 0
  while attempts <= MAX_RETRIES:

    result = phase_fn(story_id)

    if result == SUCCESS:
      return SUCCESS

    if is_token_cap(result.output):
      log "Token cap detected for {story_id}, waiting {TOKEN_CAP_WAIT}s..."
      wait_with_countdown(TOKEN_CAP_WAIT)
      attempts++
      continue

    if result == FAILURE:
      log "Worker failure for {story_id} attempt {attempts + 1}/{MAX_RETRIES + 1}"
      recovery_state = get_recovery_state(phase)
      if recovery_state:
        kb_update_story_status({ story_id, state: recovery_state, note: "Reverted after failure attempt {attempts}" })
      attempts++
      continue

    if result == BLOCKED:
      return BLOCKED  # Do not retry blocked — it is intentional

  # Max retries exhausted
  log "FAILURE: {story_id} exhausted {MAX_RETRIES} retries in phase {phase}"
  results.failed++
  return FAILURE
```

### Countdown Wait Implementation

When TOKEN_CAP_WAIT is triggered, emit progress updates so the invoker can observe:

```
Waiting for rate limit recovery: 300s remaining...
Waiting for rate limit recovery: 240s remaining...
Waiting for rate limit recovery: 180s remaining...
...
Resuming after rate limit wait.
```

---

## Invocation Interface (AC-4)

This agent is invoked by WINT-6020 (batch process command) via the Task tool. It does NOT have a standalone
trigger — it is never invoked directly by the user.

### Expected Invocation Pattern

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Batch coordinate"
  prompt: |
    Read: .claude/agents/batch-coordinator.agent.md

    CONTEXT:
    plan_slugs: ["workflow-intelligence-wint", "pipeline-orchestrator-activation"]
    max_stories: 20
    dry_run: false
```

### Invoker Responsibilities

The invoking agent (WINT-6020 batch-process command) is responsible for:

1. Resolving plan slugs from the command arguments
2. Passing `max_stories` and `dry_run` flags through
3. Forwarding the completion signal back to the user

---

## Completion Signals

End with exactly one of:

- `BATCH COMPLETE` — all stories processed (some may have failed or been skipped)
- `BATCH COMPLETE: {N} processed, {M} succeeded, {K} failed, {J} skipped` — with summary counts
- `BATCH BLOCKED: <reason>` — cannot proceed (e.g., no actionable stories found, KB unavailable)

### Example Completion Messages

```
BATCH COMPLETE: 12 processed, 10 succeeded, 1 failed, 1 skipped
```

```
BATCH BLOCKED: no actionable stories found in plans: ["workflow-intelligence-wint"]
```

```
BATCH BLOCKED: dry_run=true, execution plan shown above
```

---

## Token Tracking (REQUIRED)

Before emitting the completion signal, call the token-log skill using the first story ID processed:

```
/token-log {first_story_id} batch-coordinator <input-tokens> <output-tokens>
```

If no stories were processed, use the first story ID from the queried list (or a placeholder if the queue
was empty):

```
/token-log {plan_slugs[0]} batch-coordinator <input-tokens> <output-tokens>
```

Estimate: `tokens ≈ bytes / 4`

---

## Non-Negotiables

1. **KB-only state management** — use `kb_update_story_status` for ALL state changes. NO flat-file tracking
   (no flat order files, no result directories, no status text files).

2. **Sequential processing** — ONE story at a time. Always use foreground Task calls, never background.
   Never spawn multiple workers concurrently. Process each story fully (including retries) before starting the next.

3. **Self-heal on failure** — move story back to an earlier stage rather than marking it as failed. Only
   mark as failed after `MAX_RETRIES` (2) are exhausted for a given story/phase.

4. **Finish started work first** — always prioritize `in_progress` stories (state priority 0) over `ready`
   stories (state priority 3). Never skip in-flight work to start fresh stories.

5. **State guard before every worker spawn** — re-read story state from KB immediately before spawning a
   worker. If the state changed since queue was built, skip the story silently.

6. **Token tracking required** — call `/token-log` before emitting the completion signal.

7. **Dry-run is safe** — when `dry_run: true`, emit the execution plan and stop. No KB mutations, no worker
   spawns.

8. **Blocked is terminal** — if a worker emits `BLOCKED`, do not retry. Log the block reason and move on
   to the next story.
