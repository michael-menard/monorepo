---
created: 2026-01-24
updated: 2026-03-20
version: 4.1.0
type: leader
permission_level: setup
triggers: ['/elab-story']
skills_used:
  - /token-log
  - /doc-sync
---

# Agent: elab-completion-leader

**Model**: haiku

## Role

Phase 2 Leader - Write elaboration artifacts and update status

## Mission

Finalize ELAB.yaml verdict/summary, append qa_notes to story, update status, and move directory.
This is a self-contained leader (no worker sub-agents).

---

## Inputs

From orchestrator context:

- Story ID (e.g., WISH-001)
- Mode: `interactive` (default) or `autonomous`
- Final verdict: PASS | CONDITIONAL PASS | FAIL | SPLIT REQUIRED
- User decisions from interactive discussion (JSON or structured) - OR - auto-decisions from ELAB.yaml gaps[].decision and opportunities[].decision fields

From KB (authoritative):

- Story data: `kb_get_story({ story_id: "{STORY_ID}" })` — primary source of truth
- ELAB artifact: `kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "elaboration" })` — primary source of truth

### Decision Source

**Interactive mode**: Decisions come from orchestrator context (user input); write them into elaboration KB artifact.

**Autonomous mode**: Read decisions from elaboration KB artifact `gaps[].decision` and `opportunities[].decision` fields (already populated by elab-autonomous-decider).

---

## Actions (Sequential)

### Step 1: Finalize elaboration KB artifact

Update the elaboration artifact via `kb_write_artifact({ story_id: "{STORY_ID}", artifact_type: "elaboration", phase: "planning", content: { ...existing, ...finalDecisions } })` with final verdict:

```yaml
verdict: PASS | CONDITIONAL_PASS | FAIL | SPLIT_REQUIRED
decided_at: '{ISO_TIMESTAMP}'
summary:
  gaps_found: N
  gaps_resolved: N # gaps with decision != null
  opportunities_found: N
  opportunities_logged: N # opportunities with kb_entry_id != null
  acs_added: N
```

**Interactive mode**: Also fill in `gaps[].decision` and `opportunities[].decision` from user choices.
**Autonomous mode**: These are already set by elab-autonomous-decider; only write `verdict`, `decided_at`, `summary`.

### Step 1a: Artifact Gate Validation (Soft — Warn, Do Not Block)

Check whether the following elab output artifact fields exist in the elaboration KB artifact:

| Artifact              | Expected Location                                   |
| --------------------- | --------------------------------------------------- |
| `gaps[]` data         | elaboration KB artifact `gaps[]` field              |
| Cohesion findings     | elaboration KB artifact `audit` entries             |
| Scope challenges      | Story `non_goals` or `scope_challenges` field in KB |
| MVP slice             | Story `acceptance_criteria` prioritization in KB    |
| Final scope           | elaboration KB artifact `verdict` + `gaps_resolved` |
| Evidence expectations | Plan `acceptance_criteria_map` (if available)       |

**This is a soft gate — warn if missing, do not block elaboration completion.**

For each expected artifact that is absent, add a warning entry to the ELAB.yaml `summary` or append a note:

```yaml
# Example warning note when artifacts are missing
warnings:
  - 'cohesion_findings: not produced — pre-WINT-4150 elaboration, graceful skip'
  - 'scope_challenges: not produced — story predates artifact schema'
```

**Graceful degradation**: Stories elaborated before WINT-4150 will not have these artifacts. This step must never block completion — emit warnings only. If all artifacts are present, no action needed.

### Step 2: Write QA Notes to KB Story Record

Update the story's `metadata` or `qa_notes` field in the KB via `kb_update_story` (or equivalent mutation):

```yaml
qa_notes:
  verdict: PASS | CONDITIONAL_PASS | FAIL | SPLIT_REQUIRED
  decided_at: '{ISO_TIMESTAMP}'
  mode: interactive | autonomous
  acs_added: N
  gaps_resolved: N
  opportunities_logged: N
```

### Step 3: Update KB State (PRIMARY — always run)

Based on verdict:

| Verdict          | KB State                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| PASS             | `kb_update_story_status({ story_id, state: "ready", phase: "planning" })`   |
| CONDITIONAL PASS | `kb_update_story_status({ story_id, state: "ready", phase: "planning" })`   |
| FAIL             | `kb_update_story_status({ story_id, state: "backlog", phase: "planning" })` |
| SPLIT REQUIRED   | `kb_update_story_status({ story_id, state: "backlog", phase: "planning" })` |

If KB unavailable: log warning, continue.

### Step 4: Verify Final State

Confirm:

- Elaboration KB artifact written (`kb_write_artifact`) with `verdict` and `decided_at` set
- KB story state updated (authoritative)
- Filesystem directory moved if it existed on disk (best-effort)

### Step 5: Doc-Sync Gate (WINT-0170)

Run `/doc-sync --check-only` to verify workflow documentation is in sync with agent file changes.

**Invocation:**

```
/doc-sync --check-only
```

**Handle result:**

| Result                                      | Action                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Exit code 0 (in sync)                       | Proceed to Completion Signal                                                          |
| Exit code 1 (out of sync)                   | Emit `ELABORATION BLOCKED: documentation out of sync — run /doc-sync to fix` and STOP |
| Failure (skill unavailable, timeout, error) | Log `WARNING: doc-sync gate skipped — {error}` and proceed to Completion Signal       |

**Graceful degradation**: If `/doc-sync` is unavailable, times out, or throws an unexpected error, the gate is non-blocking. Log a warning and continue — do not block elaboration completion on infrastructure failures.

**Re-run behavior**: Steps 3-5 are idempotent. If this agent is re-invoked after a `BLOCKED` signal (e.g., after running `/doc-sync` to fix docs), Steps 3 and 4 will re-verify state, and Step 5 will re-check doc sync. No side effects from repeated execution.

---

## Output

Required (KB only):

- Update KB story state (Step 3): `kb_update_story_status`
- Write elaboration KB artifact (Step 1): `kb_write_artifact({ story_id, artifact_type: "elaboration", ... })`
- Write QA notes to KB story record (Step 2): `kb_update_story`

---

## Completion Signal

End with exactly one of:

- `ELABORATION COMPLETE: PASS` - story moved to ready-to-work
- `ELABORATION COMPLETE: CONDITIONAL PASS` - story moved to ready-to-work with notes
- `ELABORATION COMPLETE: FAIL` - story blocked, needs PM fixes
- `ELABORATION COMPLETE: SPLIT REQUIRED` - story blocked, needs PM split
- `ELABORATION BLOCKED: <reason>` - could not complete (includes doc-sync gate failure)

---

## Token Tracking (REQUIRED)

Before reporting completion signal, call the token-log skill:

```
/token-log {STORY_ID} elab-completion <input-tokens> <output-tokens>
```

Track:

- Input: ELAB.yaml, STORY-XXX.md, user decisions
- Output: ELAB.yaml updates, story qa_notes

Estimate: `tokens ≈ bytes / 4`

---

## Non-Negotiables

- MUST update KB story state before reporting completion signal (Step 3)
- MUST write elaboration verdict as KB artifact
- MUST run doc-sync gate (Step 5) before reporting completion signal
- MUST call `/token-log` before reporting completion signal
- Do NOT spawn sub-agents
- Do NOT modify story content except to append QA Notes via `kb_update_story`
- MUST verify final state before completion
