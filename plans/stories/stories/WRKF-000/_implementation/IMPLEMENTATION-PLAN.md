# Implementation Plan: WRKF-000 Story Workflow Harness

**Date:** 2026-01-22
**Planner:** dev-implement-planner
**Story:** WRKF-000-HARNESS.md

---

# Scope Surface

```
backend/API: false
frontend/UI: false
infra/config: false
```

**Notes:** WRKF-000 is a workflow harness story. Its purpose is to validate the story lifecycle process machinery, not to implement features. The only "code" change is a trivial comment added to `CLAUDE.md`. All surfaces are false per SCOPE.md.

---

# Acceptance Criteria Checklist

| AC | Criterion | Verification Method |
|----|-----------|---------------------|
| AC1 | All 7 phases execute in sequence | Artifact existence check |
| AC2 | Each artifact contains substantive content (not placeholders) | Manual review |
| AC3 | QA Gate decision is determinable from evidence alone | Gate file inspection |
| AC4 | No new utility files created; imports use `@repo/*` | Git diff inspection |
| AC5 | Local verification executable on fresh clone | pnpm commands pass |
| AC6 | Core logic transport-agnostic (Ports & Adapters) | N/A - no code |
| AC7 | YAML frontmatter with id, title, status, created_at | File inspection |
| AC8 | `## Reuse Plan` section in story file | File inspection |
| AC9 | Templates generated in `_templates/` directory | File existence check |
| AC10 | `LESSONS-LEARNED.md` documents workflow friction | File inspection |

---

# Files To Touch (Expected)

## Files to Modify (1)
| File | Change |
|------|--------|
| `CLAUDE.md` | Add trivial comment: `<!-- WRKF-000 Harness Validation: 2026-01-22 -->` |

## Files to Create (Implementation Artifacts)
| File | Purpose |
|------|---------|
| `plans/stories/WRKF-000/_implementation/IMPLEMENTATION-PLAN.md` | This file |
| `plans/stories/WRKF-000/_implementation/IMPLEMENTATION-LOG.md` | Execution log |
| `plans/stories/WRKF-000/_implementation/VERIFICATION.md` | How to verify locally |
| `plans/stories/WRKF-000/PROOF-WRKF-000.md` | Evidence of completion |

## Files to Create (Templates)
| File | Purpose |
|------|---------|
| `plans/stories/WRKF-000/_templates/PROOF-TEMPLATE.md` | Reusable proof template |
| `plans/stories/WRKF-000/_templates/QA-VERIFY-TEMPLATE.md` | Reusable QA verify template |
| `plans/stories/WRKF-000/_templates/ELAB-TEMPLATE.md` | Reusable elaboration template |

## Files to Create (Post-Dev Phases)
| File | Created By |
|------|------------|
| `plans/stories/WRKF-000/CODE-REVIEW-WRKF-000.md` | `/review` skill |
| `plans/stories/WRKF-000/QA-VERIFY-WRKF-000.md` | QA Verify agent |
| `plans/stories/WRKF-000/QA-GATE-WRKF-000.yaml` | `/qa-gate` skill |
| `plans/stories/WRKF-000/LESSONS-LEARNED.md` | Dev Learnings agent |

---

# Reuse Targets

## Existing Packages Used
- **pnpm** - Package management (project standard)
- **git** - Version control and worktrees
- Standard CLI tools for evidence capture

## Existing Artifact Examples (Templates Reference)
| Source | Use For |
|--------|---------|
| `plans/stories/STORY-016/PROOF-STORY-016.md` | PROOF-TEMPLATE.md structure |
| `plans/stories/STORY-016/QA-VERIFY-STORY-016.md` | QA-VERIFY-TEMPLATE.md structure |
| `plans/stories/WRKF-000/ELAB-WRKF-000.md` | ELAB-TEMPLATE.md structure |

## New Packages Required
- **None** - This harness validates process, not code

---

# Architecture Notes (Ports & Adapters)

**Not Applicable** - WRKF-000 does not introduce any code changes that require architectural considerations.

The only change is a comment in `CLAUDE.md`, which:
- Is not executable code
- Does not affect build, lint, or test
- Is trivially reversible
- Has no runtime impact

---

# Step-by-Step Plan (Small Steps)

## Step 1: Add Trivial Comment to CLAUDE.md
**Objective:** Make the minimal code change documented in DEV-FEASIBILITY.md
**Files:** `CLAUDE.md`
**Action:** Add HTML comment at end of file: `<!-- WRKF-000 Harness Validation: 2026-01-22 -->`
**Verification:** `git diff CLAUDE.md` shows only the comment addition

## Step 2: Create IMPLEMENTATION-LOG.md
**Objective:** Document what was actually done during implementation
**Files:** `plans/stories/WRKF-000/_implementation/IMPLEMENTATION-LOG.md`
**Action:** Create implementation log documenting Step 1 completion
**Verification:** File exists with substantive content

## Step 3: Run Verification Commands
**Objective:** Prove the trivial change does not break anything
**Files:** None (command execution only)
**Action:** Execute `pnpm lint && pnpm check-types && pnpm test`
**Verification:** All commands pass (exit code 0)

## Step 4: Create VERIFICATION.md
**Objective:** Document how to verify the story locally
**Files:** `plans/stories/WRKF-000/_implementation/VERIFICATION.md`
**Action:** Document verification commands and expected outputs
**Verification:** File exists with commands that can be copy-pasted

## Step 5: Create PROOF-TEMPLATE.md
**Objective:** Provide reusable template for future proof files (AC9)
**Files:** `plans/stories/WRKF-000/_templates/PROOF-TEMPLATE.md`
**Action:** Abstract STORY-016's PROOF structure into a parameterized template
**Verification:** Template has placeholder sections for: Summary, AC Evidence, Reuse, Verification, Files Changed, Token Log

## Step 6: Create QA-VERIFY-TEMPLATE.md
**Objective:** Provide reusable template for future QA verification files (AC9)
**Files:** `plans/stories/WRKF-000/_templates/QA-VERIFY-TEMPLATE.md`
**Action:** Abstract STORY-016's QA-VERIFY structure into a parameterized template
**Verification:** Template has placeholder sections for: Verdict, AC Verification Table, Test Execution, Architecture Compliance, Summary

## Step 7: Create ELAB-TEMPLATE.md
**Objective:** Provide reusable template for future elaboration files (AC9)
**Files:** `plans/stories/WRKF-000/_templates/ELAB-TEMPLATE.md`
**Action:** Abstract WRKF-000's ELAB structure into a parameterized template
**Verification:** Template has placeholder sections for: Verdict, Audit Checklist, Issues Found, Discovery Findings, Token Log

## Step 8: Create PROOF-WRKF-000.md
**Objective:** Document evidence of implementation completion (Dev phase artifact)
**Files:** `plans/stories/WRKF-000/PROOF-WRKF-000.md`
**Action:** Document AC evidence, files changed, verification results
**Verification:** File contains actual command output, not prose

## Step 9: Update LESSONS-LEARNED.md (Learnings Agent)
**Objective:** Capture workflow friction for process improvement (AC10)
**Files:** `plans/stories/WRKF-000/LESSONS-LEARNED.md`
**Action:** Document any friction encountered during workflow execution
**Verification:** File contains observations about the workflow process

---

# Test Plan

## Universal Verification (Step 3)
```bash
# These commands validate the trivial change does not break anything
pnpm lint
pnpm check-types
pnpm test
```

**Expected:** All pass. WRKF-000's comment change should have zero impact.

## Artifact Verification
```bash
# Verify all required artifacts exist
ls -la plans/stories/WRKF-000/_implementation/
ls -la plans/stories/WRKF-000/_templates/
ls -la plans/stories/WRKF-000/
```

**Expected:**
- `_implementation/`: IMPLEMENTATION-PLAN.md, IMPLEMENTATION-LOG.md, VERIFICATION.md, SCOPE.md
- `_templates/`: PROOF-TEMPLATE.md, QA-VERIFY-TEMPLATE.md, ELAB-TEMPLATE.md
- Root: WRKF-000-HARNESS.md, ELAB-WRKF-000.md, PROOF-WRKF-000.md (plus CODE-REVIEW, QA-VERIFY, QA-GATE after subsequent phases)

## HTTP Contract Testing
**NOT APPLICABLE** - No API endpoints involved

## Playwright E2E Testing
**NOT APPLICABLE** - No UI changes involved

---

# Stop Conditions / Blockers

## Current Status: NO BLOCKERS

The story is well-defined:
- DEV-FEASIBILITY.md specifies the exact trivial change
- ELAB-WRKF-000.md has PASS verdict
- All required PM artifacts exist
- Template source files exist for reference (STORY-016 PROOF/QA-VERIFY, WRKF-000 ELAB)

## Potential Issues (Acceptable)
| Issue | Impact | Resolution |
|-------|--------|------------|
| Pre-existing monorepo build/test failures | Low | Use scoped verification per LESSONS-LEARNED.md patterns |
| pnpm lint/check-types may fail on unrelated files | Low | Document as pre-existing; WRKF-000 change is verified clean |

---

# Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: WRKF-000-HARNESS.md | input | 17,160 | ~4,290 |
| Read: SCOPE.md | input | 1,520 | ~380 |
| Read: LESSONS-LEARNED.md | input | 15,880 | ~3,970 |
| Read: _token-logging.md | input | 3,360 | ~840 |
| Read: DEV-FEASIBILITY.md | input | 3,400 | ~850 |
| Read: TEST-PLAN.md | input | 4,760 | ~1,190 |
| Read: ELAB-WRKF-000.md | input | 4,920 | ~1,230 |
| Read: CLAUDE.md | input | 8,600 | ~2,150 |
| Read: PROOF-STORY-016.md | input | 13,680 | ~3,420 |
| Read: QA-VERIFY-STORY-016.md | input | 12,360 | ~3,090 |
| Glob operations (5) | input | ~500 | ~125 |
| Write: IMPLEMENTATION-PLAN.md | output | ~8,000 | ~2,000 |
| **Total Input** | — | ~85,640 | **~21,410** |
| **Total Output** | — | ~8,000 | **~2,000** |
| **Grand Total** | — | ~93,640 | **~23,410** |
