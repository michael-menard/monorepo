# Claude Commands Reference

This document describes all available slash commands in `.claude/commands/`. These commands implement a structured story-driven development workflow.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORY LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐    │
│  │ PM Generate  │────▶│ QA Elaborate │────▶│ Dev Implement            │    │
│  │              │     │              │     │                          │    │
│  │ /pm-generate │     │ /elab-story  │     │ /dev-implement-story     │    │
│  │ -story       │     │              │     │                          │    │
│  └──────────────┘     └──────────────┘     └────────────┬─────────────┘    │
│                              │                          │                   │
│                              │ FAIL                     ▼                   │
│                              ▼                   ┌──────────────────────┐   │
│                       ┌──────────────┐           │ Dev Code Review      │   │
│                       │ PM Fix Story │           │                      │   │
│                       │              │           │ /dev-code-review     │   │
│                       │ /pm-fix-story│           │                      │   │
│                       └──────────────┘           └────────────┬─────────┘   │
│                                                               │             │
│                                                  FAIL         │ PASS        │
│                                                  ┌────────────┴───────┐     │
│                                                  ▼                    ▼     │
│                                           ┌──────────────┐    ┌───────────┐ │
│                                           │ Dev Fix      │    │ QA Verify │ │
│                                           │              │    │           │ │
│                                           │ /dev-fix-    │◀───│ /qa-verify│ │
│                                           │ story        │FAIL│ -story    │ │
│                                           └──────────────┘    └───────────┘ │
│                                                                     │       │
│                                                                     │ PASS  │
│                                                                     ▼       │
│                                                              ┌────────────┐ │
│                                                              │  UI/UX     │ │
│                                                              │  Review    │ │
│                                                              │            │ │
│                                                              │ /ui-ux-    │ │
│                                                              │ review     │ │
│                                                              └────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Command Categories

| Category | Commands | Purpose |
|----------|----------|---------|
| **PM (Product)** | `/pm-generate-story`, `/pm-fix-story`, `/pm-generate-ad-hoc-story`, `/pm-generate-bug-story`, `/pm-generate-story-000-harness` | Story creation and refinement |
| **QA** | `/elab-story`, `/qa-verify-story` | Pre-implementation audit, post-implementation verification |
| **Dev** | `/dev-implement-story`, `/dev-code-review`, `/dev-fix-story` | Implementation, code review, fixes |
| **UI/UX** | `/ui-ux-review` | Design system and accessibility review |

---

## PM Commands

### `/pm-generate-story`

**Usage:** `/pm-generate-story STORY-XXX | next`

Generates a single story file from the story index. This is the primary command for creating implementable stories.

**Arguments:**
- `STORY-XXX` - Explicit story ID (e.g., STORY-001, STORY-012)
- `next` - Auto-select the first READY story (pending + no dependencies)

**Preconditions:**
- `plans/stories/stories.index.md` exists and includes the story
- Story has `**Status:** pending`

**Pipeline Phases:**
1. **Setup** - Validate index, create artifact directories
2. **Draft Test Plan** - Sub-agent creates `_pm/TEST-PLAN.md`
3. **UI/UX Recommendations** - Sub-agent creates `_pm/UIUX-NOTES.md` (if UI touched)
4. **Dev Feasibility Review** - Sub-agent creates `_pm/DEV-FEASIBILITY.md`
5. **Synthesize Story** - PM writes final `STORY-XXX.md`
6. **Update Index** - Change status to `generated`

**Output:**
- `plans/stories/STORY-XXX/STORY-XXX.md`
- Supporting artifacts in `plans/stories/STORY-XXX/_pm/`

---

### `/pm-fix-story`

**Usage:** `/pm-fix-story STORY-XXX`

Revises a story that FAILED or received CONDITIONAL PASS during QA Audit.

**Preconditions:**
- `QA-AUDIT-STORY-XXX.md` exists with verdict FAIL or CONDITIONAL PASS
- Story has `status: needs-refinement`

**Task:**
- Address ALL Critical and High issues from the QA audit
- Make blocking design decisions (no deferred TBDs)
- Update Acceptance Criteria and Local Testing Plan

**Status Transition:**
- `needs-refinement` → `backlog` (on completion)

**Next Step:** `/elab-story STORY-XXX` (re-audit)

---

### `/pm-generate-ad-hoc-story`

**Usage:** `/pm-generate-ad-hoc-story [optional: STORY-XXX]`

Generates a one-off story NOT listed in `plans/stories/stories.index.md`.

**Use Cases:**
- Missing functionality discovered mid-migration
- Corrective or enabling work
- Foundational refactors to unblock indexed stories
- Cross-cutting concerns

**Required Sections:**
- **Story Type:** AD-HOC
- **Reason:** Why not in the index
- **Impact:** Which indexed stories are affected
- Standard story structure (Goal, Non-goals, Scope, AC, etc.)

**Output:** Single story markdown file

---

### `/pm-generate-bug-story`

**Usage:** `/pm-generate-bug-story [optional: BUG-XXX]`

Generates a BUG story to fix a defect.

**Use Cases:**
- Story Elaboration fails due to a true defect
- Regression found after a story was marked DONE
- Production/preview/local bug discovered
- Design-system or accessibility violation

**Required Sections:**
- **Story Type:** BUG
- **Severity:** P0 / P1 / P2 / P3
- **Area:** Backend / Frontend / Shared Package / Infra
- **Detected In:** local / preview / prod / QA
- Reproduction steps, Root cause hypothesis, Fix plan

**Output:** Single bug story markdown file

---

### `/pm-generate-story-000-harness`

**Usage:** `/pm-generate-story-000-harness`

Generates STORY-000: the Story Harness. This is a prerequisite for all future refactor stories.

**Purpose:**
- Prove the story workflow
- Validate QA gates
- Establish dev proof artifact standards
- Enforce local-first verification
- Define reuse-first requirements

**Output:** `STORY-000-HARNESS.md`

---

## QA Commands

### `/elab-story`

**Usage:** `/elab-story STORY-XXX`

Performs Story Elaboration/Audit on a PM-generated story BEFORE implementation.

**Preconditions:**
- Story file exists
- Story has `status: backlog`

**Audit Checklist:**
1. Scope Alignment - Matches index exactly
2. Internal Consistency - Goals, Non-goals, AC, Testing Plan aligned
3. Reuse-First Enforcement - Uses `packages/**`
4. Ports & Adapters Compliance - Core logic is transport-agnostic
5. Local Testability - .http files for backend, Playwright for frontend
6. Decision Completeness - No blocking TBDs
7. Risk Disclosure - Auth, DB, uploads, caching risks explicit
8. Story Sizing - Detects stories that are too large

**Discovery Phase:**
- Identifies gaps and blind spots
- Suggests enhancement opportunities
- Interactive discussion with user

**Verdicts:** PASS / CONDITIONAL PASS / FAIL / SPLIT REQUIRED

**Status Transitions:**
- PASS/CONDITIONAL PASS: `backlog` → `ready-to-work`
- FAIL: `backlog` → `needs-refinement`
- SPLIT REQUIRED: `backlog` → `needs-split`

**Output:** `ELAB-STORY-XXX.md`

---

### `/qa-verify-story`

**Usage:** `/qa-verify-story STORY-XXX`

Performs Post-Implementation Verification. This is the FINAL quality gate before DONE.

**Preconditions:**
- Story PASSED elaboration
- Story has `status: ready-for-qa`
- `PROOF-STORY-XXX.md` exists

**Verification Checklist:**
1. **AC Verification** - Every AC mapped to concrete evidence
2. **Test Implementation Quality** - Meaningful tests, no anti-patterns
3. **Test Coverage** - New code: 80% min, critical paths: 90%
4. **Test Execution** - Run all tests, execute .http files for backend
5. **Proof Quality** - Complete and verifiable
6. **Architecture Compliance** - No reuse or boundary violations

**Fail Conditions:**
- Any AC unmet
- Any test fails
- Any .http request fails
- Coverage below threshold
- Proof incomplete

**Status Transitions:**
- PASS: `ready-for-qa` → `uat`, then update index
- FAIL: `ready-for-qa` → `needs-work`

**Output:** `QA-VERIFY-STORY-XXX.md`

---

## Dev Commands

### `/dev-implement-story`

**Usage:** `/dev-implement-story STORY-XXX`

Implements a story using a multi-agent pipeline. This is the primary implementation command.

**Preconditions:**
- Story has `status: ready-to-work`
- Story has `**Depends On:** none` in index
- No prior implementation artifacts exist

**Pipeline Phases:**

| Phase | Agent | Output |
|-------|-------|--------|
| 0 - Setup | Orchestrator | `SCOPE.md` |
| 1A - Plan | Planner | `IMPLEMENTATION-PLAN.md` |
| 1B - Validate | Plan Validator | `PLAN-VALIDATION.md` |
| 2 - Backend | Backend Coder | `BACKEND-LOG.md` |
| 2 - Frontend | Frontend Coder | `FRONTEND-LOG.md` |
| 2B - Contracts | Contracts | `CONTRACTS.md` |
| 3A - Verify | Verifier | `VERIFICATION.md` |
| 3B - Playwright | Playwright | Appends to `VERIFICATION.md` |
| 4 - Proof | Proof Writer | `PROOF-STORY-XXX.md` |
| 5 - Learnings | Learnings | `LESSONS-LEARNED.md` |
| 6 - Aggregate | Orchestrator | `TOKEN-SUMMARY.md` |

**Parallelization:**
- Backend + Frontend run in parallel
- Contracts runs after Backend completes
- Verifier + Playwright run in parallel

**Status Transition:** `ready-to-work` → `in-progress` → `ready-for-code-review`

**Next Step:** `/dev-code-review STORY-XXX`

---

### `/dev-code-review`

**Usage:** `/dev-code-review STORY-XXX`

Performs code review using parallel specialist sub-agents.

**Preconditions:**
- Story has `status: ready-for-code-review`
- `PROOF-STORY-XXX.md` exists
- `_implementation/VERIFICATION.md` exists

**Review Sub-Agents (run in parallel):**
1. **Lint Check** - ESLint on touched files only
2. **Style Compliance** - Tailwind/@repo/app-component-library (HARD GATE)
3. **Syntax Check** - ES7+ patterns
4. **Security Review** - OWASP patterns

**Hard Rules:**
- Style Compliance is MANDATORY - any custom CSS = FAIL
- Lint only touched files
- ES7+ syntax required

**Verdicts:** PASS / PASS-WITH-WARNINGS / FAIL

**Status Transitions:**
- PASS: `ready-for-code-review` → `ready-for-qa`
- FAIL: `ready-for-code-review` → `code-review-failed`

**Output:** `CODE-REVIEW-STORY-XXX.md`

**Next Step:**
- PASS: `/qa-verify-story STORY-XXX`
- FAIL: `/dev-fix-story STORY-XXX`

---

### `/dev-fix-story`

**Usage:** `/dev-fix-story STORY-XXX`

Fixes issues found during code review or QA verification.

**Preconditions (one of):**
- Story has `status: code-review-failed`
- Story has `status: needs-work`

**Task:**
1. Read the failure report (CODE-REVIEW or QA-VERIFY)
2. Address EVERY blocking issue
3. Update implementation code
4. Re-run verification (`pnpm check-types`, `pnpm test`, `pnpm lint`)
5. Update `PROOF-STORY-XXX.md`

**Constraints:**
- Must NOT change Acceptance Criteria
- Must NOT redefine scope
- Must NOT add new features

**Status Transition:** `code-review-failed`/`needs-work` → `in-progress` → `ready-for-code-review`

**Next Step:** `/dev-code-review STORY-XXX`

---

## UI/UX Commands

### `/ui-ux-review`

**Usage:** `/ui-ux-review STORY-XXX`

Performs UI/UX review AFTER implementation, focused on design system compliance and accessibility.

**Preconditions:**
- Story touches UI
- UI is runnable locally (`pnpm dev`)
- PROOF file exists

**Required Tooling:**
- Chrome DevTools (Lighthouse + metrics)
- Playwright MCP (navigation, screenshots, axe scans)

**Review Categories:**

**A) Design System Compliance (HARD GATE):**
- Tailwind token colors only (no arbitrary colors)
- No custom fonts
- No inline styles
- shadcn via `_primitives` pattern
- TypeScript + Tailwind required

**B) Accessibility (HARD GATE):**
- axe accessibility scan
- Keyboard navigation + focus states
- Labels/roles for interactive elements

**C) Performance & Web Metrics:**
- Lighthouse scores
- FCP, LCP, CLS, TTI/INP

**D) Visual/Interaction Sanity:**
- Screenshots for affected views
- No layout breakage

**Verdicts:** PASS / PASS-WITH-WARNINGS / FAIL / SKIPPED

**Output:** `UI-UX-REVIEW-STORY-XXX.md`

---

## Status Reference

| Status | Meaning | Valid Transitions |
|--------|---------|-------------------|
| `pending` | In index, not yet generated | → `generated` |
| `generated` | Story file created | → `backlog` |
| `backlog` | Ready for QA audit | → `ready-to-work`, `needs-refinement`, `needs-split` |
| `needs-refinement` | Failed QA audit | → `backlog` |
| `needs-split` | Story too large | → `superseded` |
| `ready-to-work` | Passed QA audit | → `in-progress` |
| `in-progress` | Dev implementing | → `ready-for-code-review` |
| `ready-for-code-review` | Implementation complete | → `ready-for-qa`, `code-review-failed` |
| `code-review-failed` | Code review failed | → `in-progress` |
| `ready-for-qa` | Code review passed | → `in-qa` |
| `in-qa` | QA verification in progress | → `uat`, `needs-work` |
| `needs-work` | QA verification failed | → `in-progress` |
| `uat` | QA passed, user acceptance | → `completed` |
| `completed` | Done | — |
| `superseded` | Replaced by split stories | — |

---

## Quick Reference

| Task | Command |
|------|---------|
| Generate next ready story | `/pm-generate-story next` |
| Generate specific story | `/pm-generate-story STORY-XXX` |
| Audit story before dev | `/elab-story STORY-XXX` |
| Fix failed audit | `/pm-fix-story STORY-XXX` |
| Implement story | `/dev-implement-story STORY-XXX` |
| Run code review | `/dev-code-review STORY-XXX` |
| Fix code review issues | `/dev-fix-story STORY-XXX` |
| Final QA verification | `/qa-verify-story STORY-XXX` |
| UI/UX review | `/ui-ux-review STORY-XXX` |
| Create ad-hoc story | `/pm-generate-ad-hoc-story` |
| Create bug story | `/pm-generate-bug-story` |
| Create harness story | `/pm-generate-story-000-harness` |
