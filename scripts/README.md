# Pipeline Scripts

Batch scripts for running story generation, elaboration, implementation, review, and QA across an entire plan. Each script spawns `claude -p` subprocesses with fresh context per story, running multiple stories in parallel.

All scripts take a **plan slug** as the first argument (e.g., `autonomous-pipeline`). The slug is resolved to a feature directory via the KB or by searching `plans/` for a matching `stories.index.md`. You can also pass a direct feature dir path instead.

## Prerequisites

- `claude` CLI installed and authenticated
- A plan with a `stories.index.md` containing `**Plan Slug**:` and `**Prefix**:` metadata, or a plan registered in the KB

## Scripts

### `generate-stories.sh` -- Generate + Elaborate

Runs story generation (`/pm-story generate`) and elaboration (`/elab-story --autonomous`) for every story in a plan. Stories already generated or elaborated are automatically skipped.

```bash
# Generate and elaborate all stories (8 parallel by default)
./scripts/generate-stories.sh autonomous-pipeline

# Preview what would run
./scripts/generate-stories.sh autonomous-pipeline --dry-run

# Run 4 at a time
./scripts/generate-stories.sh autonomous-pipeline --parallel 4

# Generate only, skip elaboration
./scripts/generate-stories.sh autonomous-pipeline --gen-only

# Elaborate only (stories must already be generated)
./scripts/generate-stories.sh autonomous-pipeline --elab-only

# Resume from a specific story
./scripts/generate-stories.sh autonomous-pipeline --from APIP-1030

# Retry specific stories
./scripts/generate-stories.sh autonomous-pipeline --only APIP-2010,APIP-2020

# One at a time
./scripts/generate-stories.sh autonomous-pipeline --sequential
```

| Option | Default | Description |
|---|---|---|
| `--parallel N` | 8 | Max concurrent stories |
| `--sequential` | -- | Shorthand for `--parallel 1` |
| `--dry-run` | -- | Print commands without executing |
| `--from STORY-ID` | -- | Skip stories before this ID |
| `--gen-only` | -- | Run generation only |
| `--elab-only` | -- | Run elaboration only |
| `--only ID,ID,...` | -- | Process only listed stories |

Logs: `/tmp/<slug>-logs/` (one log per story per phase, plus `run.log` and `filter.log`)

---

### `implement-stories.sh` -- Implement + Review + QA

Runs the full implementation pipeline for stories that have been elaborated: implement (`/dev-implement-story`), code review (`/dev-code-review`), and QA (`/qa-verify-story`). Each phase runs as a separate `claude -p` call. Stories not yet elaborated are skipped.

```bash
# Implement all ready stories (4 parallel by default)
./scripts/implement-stories.sh autonomous-pipeline

# Preview what would run
./scripts/implement-stories.sh autonomous-pipeline --dry-run

# Run 2 at a time
./scripts/implement-stories.sh autonomous-pipeline --parallel 2

# Implement only, skip review and QA
./scripts/implement-stories.sh autonomous-pipeline --impl-only

# Review + QA only (stories must already be implemented)
./scripts/implement-stories.sh autonomous-pipeline --review-only

# QA only (stories must already be reviewed)
./scripts/implement-stories.sh autonomous-pipeline --qa-only

# Set autonomy level
./scripts/implement-stories.sh autonomous-pipeline --autonomy moderate

# Skip worktree creation
./scripts/implement-stories.sh autonomous-pipeline --skip-worktree

# Retry specific stories
./scripts/implement-stories.sh autonomous-pipeline --only APIP-0010,APIP-0020

# Resume from a specific story
./scripts/implement-stories.sh autonomous-pipeline --from APIP-1030
```

| Option | Default | Description |
|---|---|---|
| `--parallel N` | 4 | Max concurrent stories |
| `--sequential` | -- | Shorthand for `--parallel 1` |
| `--dry-run` | -- | Print commands without executing |
| `--from STORY-ID` | -- | Skip stories before this ID |
| `--impl-only` | -- | Implement only, skip review + QA |
| `--review-only` | -- | Review + QA only |
| `--qa-only` | -- | QA only |
| `--autonomy LEVEL` | aggressive | Autonomy level for implementation |
| `--skip-worktree` | -- | Skip worktree creation |
| `--only ID,ID,...` | -- | Process only listed stories |

Logs: `/tmp/<slug>-impl-logs/` (one log per story per phase, plus `run.log` and `filter.log`)

---

### `implement-dispatcher.sh` -- Continuous Dispatcher

A long-running watcher that polls the plan directory and dispatches stories as they become ready. Designed to run alongside `generate-stories.sh` -- as stories finish elaboration, the dispatcher picks them up and starts implementation immediately.

```bash
# Watch and dispatch (6 parallel by default)
./scripts/implement-dispatcher.sh autonomous-pipeline

# Preview what would dispatch
./scripts/implement-dispatcher.sh autonomous-pipeline --dry-run

# Stop after 1 hour
./scripts/implement-dispatcher.sh autonomous-pipeline --timeout 3600

# Check every 30 seconds (default 20s)
./scripts/implement-dispatcher.sh autonomous-pipeline --poll 30

# 4 parallel slots
./scripts/implement-dispatcher.sh autonomous-pipeline --parallel 4

# Implement only, skip review and QA
./scripts/implement-dispatcher.sh autonomous-pipeline --impl-only

# Only dispatch specific stories
./scripts/implement-dispatcher.sh autonomous-pipeline --only APIP-0010,APIP-0020
```

| Option | Default | Description |
|---|---|---|
| `--parallel N` | 6 | Max concurrent stories |
| `--poll N` | 20 | Seconds between polls |
| `--timeout N` | 0 (none) | Stop after N seconds |
| `--dry-run` | -- | Show what would dispatch |
| `--impl-only` | -- | Implement only, skip review + QA |
| `--review-only` | -- | Review + QA only |
| `--qa-only` | -- | QA only |
| `--autonomy LEVEL` | aggressive | Autonomy level for implementation |
| `--skip-worktree` | -- | Skip worktree creation |
| `--only ID,ID,...` | -- | Dispatch only listed stories |

The dispatcher exits when:
- All stories are done or failed and nothing is in-flight
- Timeout is reached
- 15 consecutive idle polls with no stories becoming ready (~5 min at default interval)

Logs: `/tmp/<slug>-impl-logs/` (shared with `implement-stories.sh`)

---

## Shared Library

### `lib/resolve-plan.sh`

Sourced by all three scripts. Provides two functions:

- **`resolve_plan "$slug"`** -- Resolves a plan slug to `FEATURE_DIR`, `PLAN_SLUG`, and `STORY_PREFIX`. Tries the KB first (`kb_get_plan`), then falls back to grepping `plans/` for a matching `stories.index.md`.
- **`discover_stories`** -- Populates the `DISCOVERED_STORIES` array with story IDs in phase order. Reads from `stories.index.md` if present, otherwise queries the KB via `kb_list_stories`.

## Typical Workflow

Run generation/elaboration and implementation in parallel using two terminals:

```bash
# Terminal 1: Generate and elaborate all stories
./scripts/generate-stories.sh autonomous-pipeline

# Terminal 2: Dispatch implementation as stories become ready
./scripts/implement-dispatcher.sh autonomous-pipeline --timeout 7200
```

Or run them sequentially:

```bash
# Step 1: Generate and elaborate
./scripts/generate-stories.sh autonomous-pipeline

# Step 2: Implement, review, QA
./scripts/implement-stories.sh autonomous-pipeline
```

## Failure Handling

All scripts track per-story results and print a summary at the end. Failed stories are listed with their log paths. Retry with `--only` or `--from`:

```bash
# Retry specific failures
./scripts/generate-stories.sh autonomous-pipeline --only APIP-2010,APIP-3020

# Resume from where it stopped
./scripts/implement-stories.sh autonomous-pipeline --from APIP-1030
```

Each script also writes structured `run.log` and `filter.log` files to the log directory for post-mortem analysis.
