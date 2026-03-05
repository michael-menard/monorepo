---
generated: "2026-03-01"
baseline_used: "pipeline-audit-2026-03-01"
baseline_date: "2026-03-01"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: APIP-6002

## Reality Context

### Problem Statement

Stories that fail a pipeline phase and exhaust their retry budget (currently default 0) become permanently stuck. There is no mechanism to detect these stuck stories or apply recovery actions. The pipeline runs, sees the story in `failed-code-review`, skips it (no retries left), and moves on. The story is never touched again.

### Current State (2026-03-01)

5 stories stuck in `failed-code-review` with no active remediation:
- APIP-5006 (security findings), APIP-5002 (E2E test failures), APIP-1040, APIP-2030, APIP-3010

Additionally, stories can stall in intermediate states:
- `needs-code-review` with no EVIDENCE.yaml (no commits in worktree)
- `ready-for-qa` bouncing back and forth to `needs-code-review` (REVIEW.yaml never produced)

---

## Story Seed

### Title

Stuck Story Recovery Loop

### Description

**Context**: The autonomous pipeline processes stories through a state machine, but stories can become permanently stuck when they fail a phase and exhaust retries, or when artifacts are never produced despite repeated attempts.

**Problem**: No periodic detection or recovery mechanism exists. Stuck stories are invisible unless someone manually inspects the pipeline directories.

**Proposed Solution**: Add a stuck story detector and recovery loop:

1. **Detection**: After each pipeline batch completes, sweep all stage directories and identify stories that:
   - Are in `failed-code-review` or `failed-qa` with retries exhausted
   - Have been in the same stage for >N hours without progress (configurable, default 4 hours)
   - Are in `needs-code-review` with no EVIDENCE.yaml and no worktree commits
   - Are in `ready-for-qa` missing REVIEW.yaml after 2+ failed attempts to produce it

2. **Recovery Actions**:
   - `failed-code-review` (retries exhausted): Reset retry counter, attempt one more fix cycle with fresh context
   - `needs-code-review` (no evidence, no commits): Move back to `ready-to-work` for re-implementation
   - `ready-for-qa` (missing REVIEW.yaml, 2+ bounces): Move back to `needs-code-review` with a RECOVERY-NOTE.yaml flagging the specific missing artifact
   - Stories stuck for >8 hours in any state: Write STUCK-ALERT.yaml and emit structured log for operator visibility

3. **Audit Trail**: Every recovery action produces a STUCK-RECOVERY.yaml artifact recording what was detected, what action was taken, and the timestamp.

### Acceptance Criteria

- [ ] AC-1: A `detect_stuck_stories()` function scans all stage directories and returns a list of stuck stories with their stuck pattern (exhausted-retries, no-evidence, missing-review, stale)
- [ ] AC-2: A `recover_story()` function takes a stuck story and pattern, applies the appropriate recovery action, and writes STUCK-RECOVERY.yaml
- [ ] AC-3: Recovery for exhausted-retries: resets the story's retry counter and moves it back to the appropriate retry stage (failed-code-review → needs-code-review, failed-qa → ready-for-qa) with max 1 additional recovery attempt per pipeline run
- [ ] AC-4: Recovery for no-evidence-no-commits: moves story to ready-to-work, cleans up stale worktree if present
- [ ] AC-5: Recovery for missing-review-bouncing: writes RECOVERY-NOTE.yaml with diagnosis, moves to needs-code-review with `--force-review` flag
- [ ] AC-6: Stories stuck >8 hours without recovery: STUCK-ALERT.yaml written with full diagnosis (stage, duration, missing artifacts, attempted recoveries)
- [ ] AC-7: The stuck detection sweep runs automatically at the end of each `implement-stories.sh` batch
- [ ] AC-8: The stuck detection sweep can also be triggered standalone: `./scripts/implement-stories.sh --detect-stuck`
- [ ] AC-9: Recovery actions are idempotent — running detection twice on the same stuck story doesn't duplicate artifacts or actions
- [ ] AC-10: All recovery actions emit structured log lines: `RECOVERY: {story_id} pattern={pattern} action={action}`

### Non-Goals

- Modifying the phase gate validation (covered by APIP-6001)
- KB-filesystem reconciliation (covered by APIP-6003)
- Alerting via external systems (Slack, email) — log-based detection only
- Automatic escalation to human operator — flag only, don't block pipeline

### Technical Approach

1. Add `detect_stuck_stories()` to implement-stories.sh — iterates stage directories, checks timestamps and artifact presence
2. Add `recover_story()` with pattern-matched recovery actions
3. Wire into the main loop's cleanup phase (after all stories processed)
4. Add `--detect-stuck` flag for standalone invocation
5. STUCK-RECOVERY.yaml format: `{story_id, pattern, action, timestamp, artifacts_missing[], previous_attempts}`
