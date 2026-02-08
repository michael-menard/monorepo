---
doc_type: plan_exec
title: "COGN — Execution Plan"
status: active
story_prefix: "COGN"
created_at: "2026-02-03T23:10:00Z"
updated_at: "2026-02-03T23:10:00Z"
tags:
  - authorization
  - cognito
  - jwt
  - quotas
  - freemium
---

# COGN — Execution Plan

## Story Prefix

All stories use the **COGN** prefix. Commands use the full prefixed ID:
- `/elab-story COGN-001`
- `/dev-implement-story COGN-001`
- `/pm-refine-story COGN`

## Artifact Rules

- Each story outputs artifacts under the appropriate stage directory: `plans/future/cognito-scopes/{stage}/COGN-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `COGN-XXX.md` |
| Elaboration | `ELAB-COGN-XXX.md` |
| Proof | `PROOF-COGN-XXX.md` |
| Code Review | `CODE-REVIEW-COGN-XXX.md` |
| QA Verify | `QA-VERIFY-COGN-XXX.md` |
| QA Gate | `QA-GATE-COGN-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

## Story Movement Workflow

Stories progress through these stages:

1. **backlog/** — Stories not yet elaborated
2. **elaboration/** — Stories being elaborated (PM & UX work)
3. **ready-to-work/** — Stories ready for implementation (all ACs clear, design reviewed)
4. **in-progress/** — Stories currently being implemented by dev
5. **UAT/** — Stories in QA/verification phase

Use `/story-move COGN-XXX {stage}` to move stories between stages.

## Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

### Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

## Development Workflow

### Step 1: Elaboration
```
/elab-story COGN-XXX
→ Creates: ELAB-COGN-XXX.md with ACs, designs, dependencies
→ Moves: backlog/COGN-XXX → elaboration/COGN-XXX
```

### Step 2: Ready to Work
```
/pm-refine-story COGN-XXX  (if needs refinement)
/story-move COGN-XXX ready-to-work
→ Story is design-complete, ready for implementation
```

### Step 3: Implementation
```
/dev-implement-story COGN-XXX
→ Creates: implementation branch, PROOF-COGN-XXX.md
→ Moves: ready-to-work/COGN-XXX → in-progress/COGN-XXX
```

### Step 4: Code Review & QA
```
/dev-code-review COGN-XXX  (self + peer review)
/qa-verify-story COGN-XXX  (QA verification)
→ Creates: CODE-REVIEW-COGN-XXX.md, QA-VERIFY-COGN-XXX.md
```

### Step 5: QA Gate & Launch
```
/qa-gate COGN-XXX
→ Creates: QA-GATE-COGN-XXX.yaml (PASS/CONCERNS/FAIL)
→ Moves: in-progress/COGN-XXX → UAT/COGN-XXX
```

## Critical Path Dependencies

The longest chain of dependent stories (11 stories total):

```
COGN-001 → COGN-004 → COGN-005 → COGN-006 → COGN-007 → COGN-008 →
COGN-010 → COGN-015 → COGN-016 → COGN-025 → COGN-027
```

**Minimize blocking:** Parallelize non-dependent stories from different groups.

## Parallel Execution Groups

Maximum parallelization opportunities:

| Group | Stories | After | Phase |
|-------|---------|-------|-------|
| G1 | COGN-001, COGN-003 | — | Foundation |
| G2 | COGN-002, COGN-004 | G1 | Foundation |
| G3 | COGN-005 | G2 | API Auth |
| G4 | COGN-006, COGN-007 | G3 | API Auth |
| G5 | COGN-008, COGN-009 | G4 | API Auth |
| G6 | COGN-010 through COGN-014 | G5 | API Auth |
| G7 | COGN-015 | G3 | Frontend |
| G8 | COGN-016 | G7 | Frontend |
| G9 | COGN-017, COGN-018 | G8 | Frontend |
| G10 | COGN-019 | G1 | Age Restrictions |
| G11 | COGN-020 | G2 | Age Restrictions |
| G12 | COGN-021 | G9 | Age Restrictions |
| G13 | COGN-022, COGN-023 | G4 | Monitoring |
| G14 | COGN-024 | G5 | Monitoring |
| G15 | COGN-025 | G6 | Testing |
| G16 | COGN-026 | — | Testing |
| G17 | COGN-027 | G15 + G13 | Launch |

**Max parallel:** 4 stories at once (best case)

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-03T23:10:00Z | pm-bootstrap-generation | Initial execution plan | COGN.plan.exec.md |
