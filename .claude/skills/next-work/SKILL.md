---
name: next-work
description: Find the next unblocked unit of work by reading the pre-computed WORK-QUEUE.json. Near-instant when the queue is fresh; auto-refreshes from WORK-ORDER-BY-BATCH.md when stale.
created: 2026-02-17
updated: 2026-02-17
version: 3.0.0
type: utility
---

# /next-work — Find Next Unit of Work

## Usage

```
/next-work {FEATURE_DIR} [--num=N] [--autonomous]
```

**Examples:**
```bash
# Find and recommend the next unit of work
/next-work plans/future/platform

# Show the next 5 unblocked work items
/next-work plans/future/platform --num=5

# Find and immediately execute the top recommended command
/next-work plans/future/platform --autonomous
```

---

## What It Does

Reads the pre-computed `WORK-QUEUE.json` in the feature directory for near-instant work recommendations. The queue is derived from `WORK-ORDER-BY-BATCH.md` by `refresh-work-queue.ts` and auto-refreshes when stale (>120s old).

**Data flow:**
```
WORK-ORDER-BY-BATCH.md  (canonical source — human-editable)
        │
        ▼  refresh-work-queue.ts (every 120s or on demand)
        │
WORK-QUEUE.json  (derived queue — machine-readable, top 10 unblocked)
        │
        ▼  /next-work reads this instantly
```

---

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `FEATURE_DIR` | Yes | Path to feature directory (e.g., `plans/future/platform`) |
| `--num=N` | No | Return the top N unblocked work items (default: 1). Useful for seeing what's coming up or planning parallel work. |
| `--autonomous` | No | Find and immediately execute the **first** recommended command without manual copy/paste. Only executes one story even if `--num` is set. |

---

## `--autonomous` Flag

When `--autonomous` is provided:
1. Find the next unit of work (same as normal mode)
2. **Claim the story** — update its row in `WORK-ORDER-BY-BATCH.md`:
   - Set Status to `🔧`
   - Set Worker column to the worktree name or session identifier
3. **Pop the story from WORK-QUEUE.json** — remove it from the `queue` array and add to `working`, then save
4. **Execute the recommended command immediately**
5. Pass autonomous intent downstream — agents should make their best engineering call on routine decisions without asking
6. **Only interrupt the user for:**
   - Architectural decisions with long-lived consequences (e.g., schema design, new package boundaries)
   - Decisions that affect more than the current story (cross-story dependencies, shared contracts)
   - Ambiguous acceptance criteria where multiple interpretations have meaningfully different outcomes
   - Anything flagged as a `HARD GATE` in the file
7. After the downstream command completes, report outcome and stop — **do not chain to the next story automatically**

**Interrupt threshold guidance passed to downstream agents:**
> "Operate autonomously. Make reasonable engineering decisions without asking. Only interrupt for: (1) irreversible architectural choices, (2) decisions affecting other stories or shared infrastructure, (3) acceptance criteria that are genuinely ambiguous with no clear best interpretation."

---

## Execution Steps

### Step 1 — Ensure Fresh Queue

Read `{FEATURE_DIR}/WORK-QUEUE.json`.

- If the file does **not exist**, or `generated_at` is older than `stale_after_seconds`:
  - Run: `pnpm exec tsx .claude/scripts/refresh-work-queue.ts {FEATURE_DIR} --force`
  - Re-read the JSON file
- If the file exists and is fresh (within `stale_after_seconds`), use it directly

### Step 2 — Read Queue Data

Parse the JSON. The structure is:

```json
{
  "generated_at": "2026-02-17T14:30:00Z",
  "source": "WORK-ORDER-BY-BATCH.md",
  "stale_after_seconds": 120,
  "summary": {
    "complete": 47,
    "blocked": 25,
    "working": 1,
    "cancelled": 1,
    "unblocked": 10
  },
  "working": [
    { "story_id": "WINT-9010", "title": "...", "worker": "main", "row": "57" }
  ],
  "queue": [
    {
      "story_id": "WINT-1070",
      "title": "Deprecate stories.index.md",
      "batch": "Batch 8 — Pre-LangGraph Prep",
      "priority": "P2",
      "row": "52",
      "status": "⏳",
      "feature_dir": "plans/future/platform/wint",
      "command": "/dev-implement-story plans/future/platform/wint WINT-1070",
      "deps": [
        { "story_id": "WINT-1030", "row": "38", "satisfied": true }
      ]
    }
  ],
  "next_gate": {
    "id": "GATE-01",
    "title": "E2E: Validate Foundation",
    "waiting_on": ["WINT-0180"]
  }
}
```

### Step 3 — Return Results

Return the first `--num=N` items from the `queue` array (default 1).

### Step 4 — Output

**When `--num=1` (default) and a story is found:**

```
Next unit of work: {STORY_ID}

  Batch:    {batch}
  Priority: {priority}
  Row:      #{row}
  Title:    {title}
  Status:   {status} {status meaning}
  Deps:     {dep1} ✓, {dep2} ✓

  Run:  {command}
```

**When `--num=N` (N > 1) and stories are found:**

```
Next {len(results)} unblocked work items:

  1. STORY-ID (batch, priority, #row)
     Title
     Status: {emoji} {meaning} | Deps: {dep1} ✓
     Run:  {command}

  2. ...
```

Each item uses the same single-item format but numbered and condensed. The first item is the top recommendation.

Priority indicator: include `⚡` for P0, nothing for P1+.

Deps line: list each dependency with `✓` (all should be satisfied since we only return unblocked stories).

**When queue is empty:**

```
No unblocked work available.

  Complete:  {summary.complete} stories ([x] checkbox)
  Blocked:   {summary.blocked} stories (unmet deps)
  Working:   {summary.working} stories (🔧 claimed)
  Cancelled: {summary.cancelled} stories (❌)

  Next gate: {next_gate.id} (waiting on: {next_gate.waiting_on})
```

Also include the `working` array if non-empty:

```
Currently being worked:
  - WINT-9010 (worker: main, row #57)
```

### Step 5 — Claim (Autonomous Mode Only)

When `--autonomous` is provided and a story is found:

1. Pop the first item from `queue` array in `WORK-QUEUE.json`
2. Add it to the `working` array with the current worker name
3. Save the updated JSON
4. Edit `WORK-ORDER-BY-BATCH.md`:
   - Change the story's Status column to `🔧`
   - Set the Worker column to the current worktree name (e.g., `wint-1012`)
5. Then execute the recommended command

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Queue JSON missing or corrupted | Regenerate by running refresh script with `--force` |
| Queue JSON stale (> stale_after_seconds) | Regenerate before reading |
| Queue is empty but working has items | Report "nothing available" with working list |
| `--num` with `--autonomous` | Show all N items but only claim and execute the first one |
| Story in queue was already claimed since last refresh | Refresh the queue (`--force`) and retry |

---

## Output Examples

### Example 1: Normal Mode

```
$ /next-work plans/future/platform

Next unit of work: WINT-1040

  Batch:    Batch 8 — Pre-LangGraph Prep
  Priority: P2
  Row:      #53
  Title:    Update story-status to Use DB
  Status:   ⏳ Ready to start
  Deps:     WINT-1011 (#48a) ✓, WINT-1030 (#38) ✓

  Run:  /dev-implement-story plans/future/platform/wint WINT-1040
```

### Example 2: Multiple Items (--num=3)

```
$ /next-work plans/future/platform --num=3

Next 3 unblocked work items:

  1. WINT-1040 (Batch 8, P2, #53)
     Update story-status to Use DB
     Status: ⏳ Ready to start | Deps: WINT-1011 (#48a) ✓, WINT-1030 (#38) ✓
     Run:  /dev-implement-story plans/future/platform/wint WINT-1040

  2. WINT-1160 (Batch 9, P2, #59)
     Add Parallel Work Conflict Prevention
     Status: ⏳ Ready to start | Deps: WINT-1130 (#44) ✓, WINT-1140 (#50) ✓
     Run:  /dev-implement-story plans/future/platform/wint WINT-1160

  3. WINT-7020 (Batch 9, P3, #61)
     Create Agent Migration Plan
     Status: ⏳ Ready to start | Deps: WINT-7010 (#15) ✓
     Run:  /dev-implement-story plans/future/platform/wint WINT-7020
```

### Example 3: Nothing Available

```
$ /next-work plans/future/platform

No unblocked work available.

  Complete:  47 stories ([x] checkbox)
  Blocked:   12 stories (unmet deps)
  Working:   3 stories (🔧 claimed)
  Cancelled: 1 story (❌)

  Currently being worked:
    - WINT-9010 (worker: main, row #57)

  Next gate: GATE-01 (waiting on: WINT-0180)
```

### Example 4: Autonomous Mode

```
$ /next-work plans/future/platform --autonomous

Next unit of work: WINT-1040

  Batch:    Batch 8 — Pre-LangGraph Prep
  Priority: P2
  Row:      #53
  Title:    Update story-status to Use DB
  Status:   ⏳ Ready to start
  Deps:     WINT-1011 (#48a) ✓, WINT-1030 (#38) ✓

  Run:  /dev-implement-story plans/future/platform/wint WINT-1040

Claiming WINT-1040 (Worker: wint-1040)...
Executing in autonomous mode...

[/dev-implement-story output follows]
```

---

## Refreshing the Queue Manually

To force a queue refresh (e.g., after editing WORK-ORDER-BY-BATCH.md):

```bash
pnpm exec tsx .claude/scripts/refresh-work-queue.ts plans/future/platform --force
```

The queue also auto-refreshes via a Claude Code `UserPromptSubmit` hook whenever it's stale.

---

## Verification Checklist

After running `/next-work {FEATURE_DIR}`:

1. Queue was read from JSON (or auto-refreshed if stale)
2. Returned story does NOT have `[x]` checkbox
3. Returned story is NOT struck through or `❌` cancelled
4. Returned story is NOT complete (`✅`) or claimed (`🔧`)
5. All dependencies for the returned story are satisfied
6. No earlier (higher in file) unblocked story was skipped
7. Command matches the story's status emoji
