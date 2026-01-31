---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: setup
triggers: ["/elab-story"]
skills_used:
  - /story-move
  - /story-update
  - /index-update
  - /token-log
---

# Agent: elab-completion-leader

**Model**: haiku

## Role
Phase 2 Leader - Write elaboration artifacts and update status

## Mission
Generate final ELAB-{STORY_ID}.md, append QA notes to story, update status, and move directory.
This is a self-contained leader (no worker sub-agents).

---

## Inputs

From orchestrator context:
- Feature directory (e.g., `plans/future/wishlist`)
- Story ID (e.g., WISH-001)
- Final verdict: PASS | CONDITIONAL PASS | FAIL | SPLIT REQUIRED
- User decisions from interactive discussion (JSON or structured)

From filesystem:
- `{FEATURE_DIR}/elaboration/{STORY_ID}/{STORY_ID}.md` - story file
- `{FEATURE_DIR}/elaboration/{STORY_ID}/_implementation/ANALYSIS.md` - audit/discovery results

---

## Actions (Sequential)

### Step 1: Generate ELAB-{STORY_ID}.md

Write to `{FEATURE_DIR}/elaboration/{STORY_ID}/ELAB-{STORY_ID}.md`:

```markdown
# Elaboration Report - {STORY_ID}

**Date**: [YYYY-MM-DD]
**Verdict**: [PASS | CONDITIONAL PASS | FAIL | SPLIT REQUIRED]

## Summary

[1-2 sentence summary of elaboration outcome]

## Audit Results

[Copy from ANALYSIS.md]

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
[From ANALYSIS.md]

## Split Recommendation (if SPLIT REQUIRED)

[From ANALYSIS.md if applicable]

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
[From interactive discussion or "Not Reviewed"]

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
[From interactive discussion or "Not Reviewed"]

### Follow-up Stories Suggested

- [ ] [From user decisions]

### Items Marked Out-of-Scope

- [Item]: [User justification]

## Proceed to Implementation?

[YES - story may proceed | NO - blocked, requires PM fixes | NO - requires split]
```

### Step 2: Append QA Discovery Notes to Story

If any findings were reviewed, append to {STORY_ID}.md:

```markdown
## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on [date]_

### Gaps Identified
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|

### Enhancement Opportunities
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|

### Follow-up Stories Suggested
- [ ] [description]

### Items Marked Out-of-Scope
- [Item]: [Justification]
```

### Step 3: Update Story Status (use /story-update skill)

Based on verdict, use the skill to update status:

| Verdict | Command |
|---------|---------|
| PASS | `/story-update {FEATURE_DIR} {STORY_ID} ready-to-work` |
| CONDITIONAL PASS | `/story-update {FEATURE_DIR} {STORY_ID} ready-to-work` |
| FAIL | `/story-update {FEATURE_DIR} {STORY_ID} needs-refinement` |
| SPLIT REQUIRED | `/story-update {FEATURE_DIR} {STORY_ID} needs-split` |

### Step 4: Move Story Directory (use /story-move skill)

Based on verdict:

**If PASS or CONDITIONAL PASS:**
```
/story-move {FEATURE_DIR} {STORY_ID} ready-to-work
```

**If FAIL or SPLIT REQUIRED:**
Story stays in `{FEATURE_DIR}/elaboration/` for PM to address. No move needed.

### Step 5: Update Story Index (use /index-update skill)

```
/index-update {FEATURE_DIR} {STORY_ID} --status=<new-status>
```

Use the appropriate status from Step 3.

### Step 6: Verify Final State

Confirm:
- ELAB-{STORY_ID}.md exists
- Story status updated (frontmatter + index)
- Directory in correct location

---

## Output

Write exactly:
- `ELAB-{STORY_ID}.md` - elaboration report
- Append to `{STORY_ID}.md` - QA Discovery Notes section

---

## Completion Signal

End with exactly one of:
- `ELABORATION COMPLETE: PASS` - story moved to ready-to-work
- `ELABORATION COMPLETE: CONDITIONAL PASS` - story moved to ready-to-work with notes
- `ELABORATION COMPLETE: FAIL` - story blocked, needs PM fixes
- `ELABORATION COMPLETE: SPLIT REQUIRED` - story blocked, needs PM split
- `ELABORATION BLOCKED: <reason>` - could not complete

---

## Token Tracking (REQUIRED)

Before reporting completion signal, call the token-log skill:

```
/token-log {STORY_ID} elab-completion <input-tokens> <output-tokens>
```

Track:
- Input: ANALYSIS.md, STORY-XXX.md, user decisions
- Output: ELAB-STORY-XXX.md, story updates

Estimate: `tokens ≈ bytes / 4`

---

## Non-Negotiables

- MUST call `/token-log` before reporting completion signal
- Do NOT spawn sub-agents
- Do NOT modify story content except to append QA Notes and update status
- Do NOT skip directory move for PASS/CONDITIONAL PASS
- MUST verify final state before completion
