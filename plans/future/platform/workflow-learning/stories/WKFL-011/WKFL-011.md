---
story_id: WKFL-011
title: Pre-Review Hygiene Gate - Eliminate "Not My Job" Churn
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: high
---

# WKFL-011: Pre-Review Hygiene Gate - Eliminate "Not My Job" Churn

## Context

A significant source of dev↔code-review↔QA churn is mechanical hygiene failures — lint errors, type errors, and formatting issues — that dev agents either introduce or observe in adjacent code but do not fix because it falls outside their perceived task scope ("not my job" syndrome).

These issues cause downstream failures:
1. Dev agent completes implementation
2. Code review agent identifies lint/type errors — marks FAIL but does not fix them
3. Dev agent is re-engaged via `dev-fix-story` for issues that could have been caught pre-review
4. Fix agent resolves mechanical issues, resubmits
5. Code review runs again — consuming tokens and time on issues that a single automated step would have caught

The root cause is that mechanical hygiene is nobody's explicit responsibility in the current workflow — it falls in the gap between "implementation complete" and "ready for review."

## Goal

Insert a mandatory **pre-review hygiene step** into the dev implementation workflow that runs lint, type-check, and format checks immediately after implementation completes and *before* the story is handed to code review. If the hygiene step finds failures, a focused fix agent resolves them automatically — without requiring a full code review round-trip.

## Non-goals

- Replacing code review (hygiene covers mechanical issues only; code review covers logic, architecture, and security)
- Fixing issues in files unrelated to the current story (scope is limited to touched files)
- Running the full test suite (hygiene step is fast — lint + type-check + format only)

## Scope

### New Workflow Step: `dev-hygiene-gate`

Inserted by the dev implementation orchestrator between "implementation complete" and "move to `needs-code-review`":

```
dev-implement-story
  └── Phase 4: Hygiene Gate (NEW)
        1. Run: pnpm lint --filter={affected packages}
        2. Run: pnpm check-types --filter={affected packages}
        3. Run: pnpm format --check
        4. If all pass → proceed to code review
        5. If any fail → spawn dev-hygiene-fix agent
              └── Auto-fix lint (eslint --fix), format (prettier --write)
              └── For type errors: attempt fix, if unresolvable → BLOCKED signal
              └── Re-run checks
              └── If clean → proceed to code review
              └── If still failing → HALT, report to orchestrator
```

### New Agent: `dev-hygiene-fix.agent.md`

A focused, low-token agent that:
- Runs `eslint --fix` and `prettier --write` on touched files
- Attempts to resolve simple type errors (missing imports, obvious type mismatches)
- Does NOT touch implementation logic — mechanical fixes only
- Produces a brief report: N lint issues auto-fixed, N format issues auto-fixed, N type errors resolved, N type errors unresolvable

### Churn Metric Integration (requires KNOW-024)

When `dev-hygiene-fix` resolves issues that would otherwise have caused a code review failure, log to `story_state_transitions` with:
```
reason_category: 'pre-review-hygiene-fix'
reason_notes: 'N lint, N format, N type issues auto-resolved before review'
```

This makes hygiene-prevented churn visible in metrics — we want to track how many code review round-trips are being prevented by this gate.

### Files Affected

- `.claude/commands/dev-implement-story.md` — insert hygiene gate phase
- `.claude/agents/dev-hygiene-fix.agent.md` — new agent
- `.claude/agents/dev-implement-completion-leader.agent.md` — trigger hygiene gate before status transition

## Acceptance Criteria

- [ ] Hygiene gate runs lint, type-check, and format check on all files touched by the story
- [ ] If all checks pass, story proceeds to code review with no delay
- [ ] If hygiene fails, `dev-hygiene-fix` agent is spawned automatically — no human intervention required
- [ ] `dev-hygiene-fix` resolves lint and format issues via `--fix` and `--write` flags
- [ ] After auto-fix, hygiene checks re-run to confirm clean
- [ ] If hygiene cannot be resolved automatically (complex type errors), the orchestrator halts and reports — it does NOT silently hand a broken story to code review
- [ ] Token usage for the hygiene step is logged separately so its cost is trackable
- [ ] Stories that required a hygiene fix are distinguishable in metrics from stories that passed hygiene on first attempt
