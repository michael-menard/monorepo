---
id: WRKF-000
title: "Story Workflow Harness"
status: ready-for-code-review
created_at: "2026-01-22"
updated_at: "2026-01-22"
---

# WRKF-000: Story Workflow Harness

## Goal

Validate the end-to-end story workflow by executing a trivial, non-functional change through all lifecycle phases. This harness proves the process machinery works before applying it to real feature work.

## Non-Goals

- **NO** feature migration or endpoint conversion
- **NO** production behavior changes
- **NO** new business logic
- **NO** database schema changes
- **NO** UI modifications
- **NO** external service integrations

## Definitions

### What is a "Harness"?

A **harness** is a controlled execution environment that validates process mechanics without introducing functional risk. WRKF-000 exists solely to:

1. Prove artifacts flow correctly between phases
2. Verify QA gates can objectively PASS or FAIL
3. Confirm tooling (worktrees, review, verification) operates as documented
4. Establish baseline evidence formats for future stories

### What This Harness Validates

| Concern | Validation Method |
|---------|-------------------|
| Story lifecycle | Artifact presence at each phase transition |
| QA gates | Binary PASS/FAIL determination from evidence |
| Dev proof artifacts | Verifiable command output, not prose claims |
| Local-first verification | `.http` files execute without external dependencies |
| Reuse-first enforcement | No new utilities created; shared packages used |

## Scope

### In Scope

1. Create a trivial code change (e.g., add a comment to an existing file)
2. Execute full lifecycle: PM → Elab → Dev → Code Review → QA Verify → QA Gate
3. Produce all required artifacts at each phase
4. Document any workflow friction or tooling gaps
5. Generate reusable artifact templates for future stories

### Out of Scope

- Any change that affects runtime behavior
- Any change requiring tests to be added or modified
- Any change to API contracts or schemas
- Any infrastructure or deployment changes

## Story Lifecycle

```
PM Generate Story
       ↓
Elab (Elaboration/Audit)
       ↓
Dev Implementation
       ↓
Code Review
       ↓
QA Verification
       ↓
QA Gate (PASS/FAIL)
       ↓
Merge & Cleanup
```

### Phase Transitions

| From | To | Gate Condition |
|------|----|----------------|
| PM Generate | Elab | Story file exists with all required sections |
| Elab | Dev | ELAB file exists with PASS or CONDITIONAL PASS verdict |
| Dev | Code Review | Code changes committed, PROOF file exists |
| Code Review | QA Verify | CODE-REVIEW file exists, no blocking issues |
| QA Verify | QA Gate | QA-VERIFY file exists with evidence |
| QA Gate | Merge | Gate decision is PASS |

## Required Artifacts per Phase

### PM Phase
- `WRKF-000-HARNESS.md` (this file)
- `_pm/TEST-PLAN.md` - How QA will verify
- `_pm/DEV-FEASIBILITY.md` - Technical approach notes
- `_pm/BLOCKERS.md` - Known blockers (empty if none)

### Elab Phase
- `ELAB-WRKF-000.md` - Elaboration/audit with PASS/FAIL verdict

### Dev Phase
- `_implementation/IMPLEMENTATION-PLAN.md` - Step-by-step approach
- `_implementation/IMPLEMENTATION-LOG.md` - What was actually done
- `_implementation/CONTRACTS.md` - API/interface contracts (if any)
- `_implementation/VERIFICATION.md` - How to verify locally
- `PROOF-WRKF-000.md` - Evidence of completion

### Code Review Phase
- `CODE-REVIEW-WRKF-000.md` - Review findings and disposition

### QA Verify Phase
- `QA-VERIFY-WRKF-000.md` - Verification results with evidence

### QA Gate Phase
- `QA-GATE-WRKF-000.yaml` - Final gate decision (PASS/FAIL/CONCERNS/WAIVED)

### Templates Phase (New)
- `_templates/PROOF-TEMPLATE.md` - Reusable proof template
- `_templates/QA-VERIFY-TEMPLATE.md` - Reusable QA verify template
- `_templates/ELAB-TEMPLATE.md` - Reusable elaboration template

### Lessons Learned Phase (New)
- `LESSONS-LEARNED.md` - Workflow friction and improvement suggestions

## Reuse Plan

### Existing Packages Used
- `pnpm` - Package management (project standard)
- `git` - Version control and worktrees
- Standard CLI tools for evidence capture

### New Packages Required
- **None** - This harness validates process, not code

### Shared Utilities
- No new shared utilities will be created
- All tooling already exists in the repository

## Acceptance Criteria

### AC1: Lifecycle Completeness
- [ ] All 7 phases execute in sequence (PM → Elab → Dev → Review → QA Verify → QA Gate → Merge)
- [ ] Each phase produces its required artifacts
- [ ] No phase is skipped or bypassed

### AC2: Artifact Validity
- [ ] Each artifact contains substantive content (not placeholders)
- [ ] Artifacts reference each other correctly (traceability)
- [ ] Evidence sections contain actual command output, not prose

### AC3: QA Gate Objectivity
- [ ] QA Gate decision is determinable from evidence alone
- [ ] No subjective judgment required for PASS/FAIL
- [ ] Gate file contains explicit pass/fail for each criterion

### AC4: Reuse-First Compliance
- [ ] No new utility files created
- [ ] All imports use existing `@repo/*` packages
- [ ] Shared logic placed in `packages/**` (if any logic added)

### AC5: Local Verification
- [ ] `.http` file (if applicable) runs without external auth
- [ ] Verification steps executable on fresh clone
- [ ] No "works on my machine" dependencies

### AC6: Ports & Adapters Compliance
- [ ] Core logic (if any) is transport-agnostic
- [ ] No runtime-specific code in business logic
- [ ] Adapters clearly separated from core

### AC7: YAML Frontmatter (Added from Elab)
- [x] Story file includes YAML frontmatter with `id`, `title`, `status`, and `created_at` fields

### AC8: Reuse Plan Documentation (Added from Elab)
- [x] Story file includes `## Reuse Plan` section
- [x] Section documents that no new packages are required

### AC9: Template Generation (Added from Elab)
- [ ] Harness produces reusable artifact templates in `_templates/` directory
- [ ] Templates include: PROOF-TEMPLATE.md, QA-VERIFY-TEMPLATE.md, ELAB-TEMPLATE.md

### AC10: Lessons Learned Documentation (Added from Elab)
- [ ] `LESSONS-LEARNED.md` artifact produced documenting workflow friction
- [ ] Captures pain points, tooling gaps, and improvement suggestions

## Required Tooling

| Tool | Purpose | Validation |
|------|---------|------------|
| Git worktrees | Isolated development | `git worktree list` shows WRKF-000 branch |
| `/review` skill | Code review feedback | CODE-REVIEW artifact generated |
| `/qa-gate` skill | Gate decision | QA-GATE YAML generated |
| `.http` files | Local API testing | Requests execute successfully |
| `pnpm` commands | Build/test/lint | All pass on harness changes |

## Local Testing Expectations

### Backend (if applicable)
```bash
# .http file must be runnable
httpyac send __http__/wrkf-000.http --all

# Or via VS Code REST Client extension
# Expected: All requests return documented responses
```

### Frontend (if applicable)
```bash
# Playwright tests must pass
pnpm --filter playwright test wrkf-000

# Expected: All scenarios pass
```

### Universal
```bash
# Type check
pnpm check-types

# Lint
pnpm lint

# Test
pnpm test

# Expected: All pass with zero errors
```

## QA Gate Rules

### Automatic PASS Conditions
All of the following must be true:
1. All required artifacts exist and contain substantive content
2. All acceptance criteria have evidence
3. `pnpm build && pnpm lint && pnpm test` pass
4. No unresolved blocking issues in CODE-REVIEW
5. Templates generated and validated
6. Lessons learned documented

### Automatic FAIL Conditions
Any of the following triggers FAIL:
1. Missing required artifact
2. Artifact contains only placeholders/TODOs
3. Evidence is prose instead of command output
4. Build, lint, or test failures
5. Blocking issue unresolved from code review
6. New utility file created outside `packages/**`
7. Templates not generated
8. YAML frontmatter missing or malformed

### CONCERNS (Advisory)
Non-blocking issues that should be addressed:
- Minor style inconsistencies
- Documentation improvements suggested
- Future technical debt identified

### WAIVED (Exception)
Requires explicit justification:
- Known tooling limitation documented
- Intentional deviation with rationale
- Deferred to follow-up story with tracking

## Failure Conditions

| Failure | Detection | Resolution |
|---------|-----------|------------|
| Artifact missing | Phase gate check | Create missing artifact |
| Placeholder content | QA review | Replace with substantive content |
| Evidence is prose | QA review | Re-run commands, capture output |
| Build failure | CI/local check | Fix code issues |
| Test failure | CI/local check | Fix or update tests |
| Lint failure | CI/local check | Fix lint issues |
| Reuse violation | Code review | Move to shared package |

## Deliverables Checklist

### Phase: PM Generate
- [x] `WRKF-000-HARNESS.md` created (this file)
- [x] `_pm/TEST-PLAN.md` created
- [x] `_pm/DEV-FEASIBILITY.md` created
- [x] `_pm/BLOCKERS.md` created
- [x] YAML frontmatter with status field
- [x] `## Reuse Plan` section included

### Phase: Elab
- [x] `ELAB-WRKF-000.md` created
- [x] All acceptance criteria are testable
- [x] Verdict: CONDITIONAL PASS → Fixes applied

### Phase: Dev Implementation
- [ ] Trivial code change committed
- [ ] `_implementation/IMPLEMENTATION-PLAN.md` created
- [ ] `_implementation/IMPLEMENTATION-LOG.md` created
- [ ] `_implementation/VERIFICATION.md` created
- [ ] `PROOF-WRKF-000.md` created with evidence

### Phase: Code Review
- [ ] `/review` skill executed
- [ ] `CODE-REVIEW-WRKF-000.md` created
- [ ] All blocking issues resolved

### Phase: QA Verify
- [ ] `QA-VERIFY-WRKF-000.md` created
- [ ] All acceptance criteria verified with evidence

### Phase: QA Gate
- [ ] `/qa-gate` skill executed
- [ ] `QA-GATE-WRKF-000.yaml` created
- [ ] Gate decision is PASS

### Phase: Templates
- [ ] `_templates/PROOF-TEMPLATE.md` created
- [ ] `_templates/QA-VERIFY-TEMPLATE.md` created
- [ ] `_templates/ELAB-TEMPLATE.md` created

### Phase: Lessons Learned
- [ ] `LESSONS-LEARNED.md` created with workflow friction notes

### Phase: Merge & Cleanup
- [ ] Changes merged to main
- [ ] Worktree cleaned up
- [ ] Branch deleted (if applicable)

## Evidence Requirements

### Command Output
```
# BAD - Prose claim
"The tests passed successfully."

# GOOD - Actual output
$ pnpm test
 PASS  packages/core/logger/src/__tests__/logger.test.ts
 PASS  apps/api/core/utils/__tests__/slug.test.ts
Test Suites: 47 passed, 47 total
Tests:       312 passed, 312 total
```

### Request/Response Samples
```
# BAD - Description only
"GET /api/health returns 200 OK"

# GOOD - Actual capture
### GET /api/health
GET http://localhost:3000/api/health

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "timestamp": "2026-01-22T10:30:00Z"
}
```

### Screenshots (when applicable)
- Must show actual UI state
- Must include browser dev tools if relevant
- Must have timestamp visible or filename with date

---

## Token Budget

| Phase | Agent | Est. Tokens | Actual | Notes |
|-------|-------|-------------|--------|-------|
| PM Generate | PM | 2,000 | ~2,000 | This file |
| Elab | QA | 1,500 | ~10,500 | Initial elaboration (CONDITIONAL PASS) |
| Elab (Re-run) | QA | 1,500 | ~12,570 | Re-elaboration (PASS) |
| Dev: Plan | Planner | 3,000 | ~23,410 | Implementation planning |
| Dev: Validate | Validator | 1,000 | ~9,700 | Plan validation |
| Dev: Implement | Impl | 3,000 | ~21,560 | Templates + trivial change |
| Dev: Verify | Verifier | 2,000 | ~15,500 | Build/lint/test verification |
| Dev: Proof | Proof | 2,000 | ~22,500 | Proof synthesis |
| Code Review | Review | 2,000 | — | Pending |
| QA Verify | QA | 1,500 | — | Pending |
| QA Gate | QA | 500 | — | Pending |
| **Total** | — | **20,000** | **~117,740** | Dev complete |

---

## Status

**Current Phase:** Dev Complete → Ready for Code Review
**Status:** ready-for-code-review
**Created:** 2026-01-22
**Last Updated:** 2026-01-22

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-22_

### Gaps Identified

| # | Finding | User Decision | Resolution |
|---|---------|---------------|------------|
| 1 | Missing YAML frontmatter with status field | Added as AC | **FIXED** - Frontmatter added |
| 2 | Incorrect lifecycle phase order | Required fix | **FIXED** - Corrected to PM → Elab → Dev → Review → QA |
| 3 | Missing Reuse Plan section | Added as AC | **FIXED** - Section added |

### Enhancement Opportunities

| # | Finding | User Decision | Resolution |
|---|---------|---------------|------------|
| 1 | Template generation for future stories | Added as AC9 | **ADDED** - Templates deliverable |
| 2 | Dedicated lessons-learned documentation | Added as AC10 | **ADDED** - LESSONS-LEARNED.md deliverable |

### Follow-up Stories Suggested

- None. All improvements incorporated into current story.

### Items Marked Out-of-Scope

- None.

---

## PM Fix Log

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-01-22 | Missing YAML frontmatter | Added frontmatter with id, title, status, created_at, updated_at |
| 2026-01-22 | Incorrect lifecycle order | Corrected to: PM → Elab → Dev → Code Review → QA Verify → QA Gate |
| 2026-01-22 | Missing Reuse Plan | Added `## Reuse Plan` section |
| 2026-01-22 | New ACs from Elab | Added AC7-AC10 for frontmatter, reuse plan, templates, lessons learned |
| 2026-01-22 | Phase transitions table | Updated to match corrected lifecycle |
| 2026-01-22 | Deliverables checklist | Added Templates and Lessons Learned phases |
| 2026-01-22 | QA Gate rules | Added template and frontmatter checks |
