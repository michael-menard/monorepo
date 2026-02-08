---
doc_type: plan_exec
title: "INSP — Execution Plan"
status: active
story_prefix: "INSP"
created_at: "2026-02-04T00:00:00Z"
updated_at: "2026-02-04T00:00:00Z"
tags:
  - inspiration-gallery
  - execution
---

# INSP — Execution Plan

## Story Prefix

All stories use the **INSP** prefix. Commands use the full prefixed ID:
- `/elab-story INSP-001`
- `/dev-implement-story INSP-001`
- `/qa-verify-story INSP-001`

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/INSP-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status and timestamps
  - A `## Token Budget` section (see template below)
  - An append-only `## Agent Log` section
  - Status fields for automation

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `INSP-XXX.md` |
| Elaboration | `ELAB-INSP-XXX.md` |
| Proof | `PROOF-INSP-XXX.md` |
| Code Review | `CODE-REVIEW-INSP-XXX.md` |
| QA Verify | `QA-VERIFY-INSP-XXX.md` |
| QA Gate | `QA-GATE-INSP-XXX.yaml` |

## Token Budget Rule

Each story MUST include a `## Token Budget` section with:

### Phase Summary Table

| Phase | Estimated | Actual | Delta | Notes |
|-------|-----------|--------|-------|-------|
| Story Gen | ~10k | — | — | — |
| Elaboration | ~15k | — | — | — |
| Implementation | ~50k | — | — | — |
| Code Review | ~20k | — | — | — |
| QA Verify | ~15k | — | — | — |
| **Total** | ~110k | — | — | — |

### Actual Measurements Table

| Date | Phase | Before | After | Delta | Notes |
|------|-------|--------|-------|-------|-------|
| (recorded after phase) | | | | | |

**Gate Rule:** Before starting next phase, update `Actual` column from session cost report.

## Story Workflow

### Phase 1: Story Generation (PM-led)
- Output: `INSP-XXX.md` with acceptance criteria
- Command: `/pm-story create INSP-XXX`

### Phase 2: Elaboration (PM-led)
- Output: `ELAB-INSP-XXX.md` with detailed design
- Command: `/elab-story INSP-XXX`

### Phase 3: Implementation (Dev-led)
- Output: `PROOF-INSP-XXX.md` with code evidence
- Command: `/dev-implement-story INSP-XXX`

### Phase 4: Code Review (Architect-led)
- Output: `CODE-REVIEW-INSP-XXX.md` with findings
- Command: `/architect-review INSP`

### Phase 5: QA Verification (QA-led)
- Output: `QA-VERIFY-INSP-XXX.md` and `QA-GATE-INSP-XXX.yaml`
- Command: `/qa-verify-story INSP-XXX`

## Reuse Gate (Required for QA PASS)

For each story, verification checklist:

| Gate | PM Requirement | Dev Requirement |
|------|---|---|
| Reuse Plan | Story doc MUST include: `## Reuse Plan` section | Implementation MUST include: `## Reuse Verification` section |
| Shared Packages | Design leverages `packages/core/*` or `packages/backend/*` | Code imports from workspace package names (`@repo/...`) |
| No One-Offs | No per-story utilities designed | No per-story utilities created |
| Accept/Reject | Cannot PASS if reuse undocumented | Cannot PASS if reuse not verified |

## Story Acceptance Rule

A story may be marked "Done" (QA-GATE status: PASS) only if:

1. Implementation reuses shared packages where applicable, OR
2. Justification is documented for why reuse was not possible, AND
3. A new shared package was created instead of one-off code

---

## Execution Phases

### Phase 1: Foundation (INSP-001, 003, 007)
- Set up gallery scaffolding
- Initial API endpoints
- Album data model with cycle detection

**Start Condition:** Immediate
**Dependencies:** None

### Phase 2: Gallery & Upload (INSP-002, 004, 008, 020)
- Card components
- Upload page and modal
- Loading states

**Start Condition:** After Phase 1 complete
**Dependencies:** INSP-001, INSP-003, INSP-007

### Phase 3: Album Management (INSP-005, 006, 009, 010, 011, 012, 013)
- Collection management UI
- Album CRUD endpoints
- Inspiration CRUD endpoints
- Drag-and-drop reordering
- Stack-to-create gesture
- Album navigation

**Start Condition:** After Phase 2 complete
**Dependencies:** INSP-002, INSP-004, INSP-008

### Phase 4: Integration & Polish (INSP-014-021)
- MOC linking
- Delete flows
- Metadata editing
- Tag management
- Empty states
- Accessibility
- Bulk operations

**Start Condition:** After Phase 3 complete
**Dependencies:** INSP-009, INSP-010, INSP-011, INSP-012

---

## Agent Log

Append-only record of all agents executing this plan.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-04 | pm-bootstrap-generation-leader | Initial execution plan | PLAN.exec.md |

---
