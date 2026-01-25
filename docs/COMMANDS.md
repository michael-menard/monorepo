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
│  │              │     │              │     │ (includes code review    │    │
│  │ /pm-story    │     │ /elab-story  │     │  + fix loop)             │    │
│  │ generate     │     │              │     │                          │    │
│  └──────────────┘     └──────────────┘     │ /dev-implement-story     │    │
│                              │              │   [--max-iterations=N]   │    │
│                              │ FAIL         │   [--force-continue]     │    │
│                              ▼              └────────────┬─────────────┘    │
│                       ┌──────────────┐                   │                  │
│                       │ PM Fix Story │      ┌────────────┴────────────┐     │
│                       │              │      │  Internal review/fix    │     │
│                       │ /pm-fix-story│      │  loop (automatic,       │     │
│                       └──────────────┘      │  max N iterations)      │     │
│                                             └────────────┬────────────┘     │
│                                                          │                  │
│                                                          │ PASS or          │
│                                                          │ --force-continue │
│                                                          ▼                  │
│                                                   ┌───────────┐             │
│                                                   │ QA Verify │             │
│                                                   │           │             │
│                                                   │ /qa-verify│             │
│                                                   │ -story    │             │
│                                                   └─────┬─────┘             │
│                                            FAIL ◀───────┴───────▶ PASS      │
│                                              │                     │        │
│                                              ▼                     ▼        │
│                                   ┌──────────────┐          ┌────────────┐  │
│                                   │ Dev Implement│          │  UI/UX     │  │
│                                   │ (re-run)     │          │  Review    │  │
│                                   └──────────────┘          │ /ui-ux-    │  │
│                                                             │ review     │  │
│                                                             └────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

Note: /dev-code-review and /dev-fix-story still exist as standalone commands
but are now integrated into /dev-implement-story's review/fix loop.
```

## Command Categories

| Category | Commands | Purpose |
|----------|----------|---------|
| **PM (Product)** | `/pm-story`, `/pm-fix-story`, `/pm-refine-story`, `/pm-generate-story-000-harness`, `/pm-bootstrap-workflow` | Story creation, refinement, and backlog triage |
| **Epic** | `/elab-epic` | Multi-stakeholder epic review before story work |
| **QA** | `/elab-story`, `/qa-verify-story` | Pre-implementation audit, post-implementation verification |
| **Dev** | `/dev-implement-story`, `/dev-code-review`*, `/dev-fix-story`* | Implementation with integrated review/fix loop |
| **UI/UX** | `/ui-ux-review` | Design system and accessibility review |

*`/dev-code-review` and `/dev-fix-story` are now integrated into `/dev-implement-story` but remain available as standalone commands.

---

## PM Commands

### `/pm-story` (Unified)

**Usage:** `/pm-story <action> [args]`

Unified command for all story generation and transformation operations.

**Actions:**

| Action | Usage | Purpose |
|--------|-------|---------|
| `generate` | `/pm-story generate STORY-XXX \| next` | Create story from index |
| `generate --ad-hoc` | `/pm-story generate --ad-hoc [ID]` | Create emergent/one-off story |
| `bug` | `/pm-story bug [BUG-XXX]` | Create bug/defect story |
| `followup` | `/pm-story followup STORY-XXX [#]` | Create follow-up from QA findings |
| `split` | `/pm-story split STORY-XXX` | Split oversized story |

**Pipeline Phases (per action):**

| Action | Agent | Output |
|--------|-------|--------|
| generate | `pm-story-generation-leader.agent.md` | Story + PM artifacts |
| generate --ad-hoc | `pm-story-adhoc-leader.agent.md` | Ad-hoc story |
| bug | `pm-story-bug-leader.agent.md` | Bug story |
| followup | `pm-story-followup-leader.agent.md` | Follow-up story + index update |
| split | `pm-story-split-leader.agent.md` | Split stories + index update |

**Status Transitions:**
- generate: `pending` (index) → `backlog`
- generate --ad-hoc: → `backlog`
- bug: → `backlog`
- followup: → `backlog` (new story)
- split: `needs-split` → `superseded` (parent), `backlog` (splits)

**Next Step by action:**
- generate/ad-hoc/bug/followup/split → `/elab-story {STORY_ID}`

**Reference:** `.claude/docs/pm-story-reference.md`

---

### `/pm-fix-story`

**Usage:** `/pm-fix-story STORY-XXX`

Revises a story that FAILED or received CONDITIONAL PASS during QA Elaboration.

**Preconditions:**
- `ELAB-STORY-XXX.md` exists with verdict FAIL or CONDITIONAL PASS
- Story has `status: needs-refinement`

**Pipeline Phases:**

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `pm-story-fix-leader.agent.md` | Updated `STORY-XXX.md` |

**Task:**
- Address ALL Critical and High issues from the QA audit
- Make blocking design decisions (no deferred TBDs)
- Update Acceptance Criteria and Local Testing Plan

**Status Transition:** `needs-refinement` → `backlog`

**Next Step:** `/elab-story STORY-XXX` (re-audit)

---

### `/pm-generate-ad-hoc-story` (Deprecated)

> **Note:** Use `/pm-story generate --ad-hoc` instead.

---

### `/pm-generate-bug-story` (Deprecated)

> **Note:** Use `/pm-story bug` instead.

---

### `/pm-generate-story-000-harness`

**Usage:** `/pm-generate-story-000-harness {PREFIX}`

Generates the Story Workflow Harness (STORY-000). This is a prerequisite for all future feature stories.

**Arguments:**
- `{PREFIX}` - Story prefix from bootstrap (e.g., "WRKF", "STORY", "AUTH")

**Preconditions:**
- Bootstrap completed (`/pm-bootstrap-workflow`)
- Harness not already created

**Pipeline Phases:**

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `pm-harness-setup-leader.agent.md` | `AGENT-CONTEXT.md` |
| 1 | `pm-harness-generation-leader.agent.md` | `{PREFIX}-000-HARNESS.md`, `_pm/*.md` |

**Purpose:**
- Prove the story workflow mechanics work
- Validate QA gates can objectively PASS/FAIL
- Establish dev proof artifact standards
- Enforce local-first verification
- Define reuse-first requirements
- Create reusable templates for future stories

**Output:**
- `plans/stories/{PREFIX}-000/{PREFIX}-000-HARNESS.md`
- `plans/stories/{PREFIX}-000/_pm/TEST-PLAN.md`
- `plans/stories/{PREFIX}-000/_pm/DEV-FEASIBILITY.md`
- `plans/stories/{PREFIX}-000/_pm/BLOCKERS.md`

**Status Transition:** Creates story with `status: backlog`

**Next Step:** `/elab-story {PREFIX}-000`

---

### `/pm-bootstrap-workflow`

**Usage:** `/pm-bootstrap-workflow`

Converts raw plans (from PRDs, migration outlines, or feature descriptions) into structured planning artifacts. This is a one-time command run at the start of each epic.

**Inputs Required:**
- **Raw Plan/PRD** - The unstructured plan content
- **Project Name** - Short identifier (e.g., "vercel-migration")
- **Story Prefix** - UPPERCASE, 2-6 chars (e.g., "STORY", "WRKF", "AUTH")

**Pipeline Phases:**

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `pm-bootstrap-setup-leader.agent.md` | `AGENT-CONTEXT.md`, `CHECKPOINT.md` |
| 1 | `pm-bootstrap-analysis-leader.agent.md` | `ANALYSIS.yaml` |
| 2 | `pm-bootstrap-generation-leader.agent.md` | All artifact files |

**Output:**
- `plans/stories/{PREFIX}.stories.index.md` - Master story index
- `plans/{PREFIX}.plan.meta.md` - Documentation principles
- `plans/{PREFIX}.plan.exec.md` - Execution rules
- `plans/{PREFIX}.roadmap.md` - Visual dependency graphs

**Features:**
- `--dry-run` - Run analysis only, don't generate files
- Checkpoint & resume on interruption

**Next Step:** `/elab-epic {PREFIX}` (recommended) or `/pm-generate-story {PREFIX}-001`

---

### `/pm-refine-story`

**Usage:** `/pm-refine-story [FEAT-ID | all | top <N>]`

Interactive PM-led brainstorming session to vet, refine, and prioritize feature ideas in the backlog.

**Arguments:**

| Argument | Mode | Description |
|----------|------|-------------|
| `FEAT-XXX` | single | Triage specific feature |
| `all` | batch | Review all pending features |
| `top <N>` | batch | Review top N pending features |
| (none) | batch | Default: top 5 |

**Pipeline Phases:**

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | (orchestrator) | Setup, bootstrap FEATURES.md if needed |
| 1 | `pm-triage-leader.agent.md` | Interactive triage conversation |

**Conversation Phases (per feature):**
1. **Understanding** - Learn about the feature and problem it solves
2. **Challenge** - Stress-test assumptions and necessity
3. **Scope** - Define MVP and non-goals
4. **Prioritize** - Assess and set priority

**Quick Commands During Session:**

| Command | Action |
|---------|--------|
| `skip` | Move to next feature without changes |
| `stop` | End session, save progress |
| `promote` | Mark feature ready for story generation |
| `archive` | Mark as not doing |
| `back` | Return to previous feature |

**Output:**
- `plans/future/FEATURES.md` - Updated feature backlog
- `plans/future/triage-sessions/<date>.yaml` - Session log

**Features:**
- Bootstraps `FEATURES.md` if missing
- Saves triage session logs as YAML
- Offers to chain to `/pm-story generate` for promoted features

**Next Step:** `/pm-story generate` (for promoted features)

**Reference:** `.claude/docs/pm-refine-story-reference.md`

---

## Epic Commands

### `/elab-epic`

**Usage:** `/elab-epic {PREFIX}`

Multi-stakeholder review of an entire epic before story work begins. This is a strategic gate that identifies gaps, risks, and improvements at the epic level.

**When:** After `/pm-bootstrap-workflow`, before starting individual stories.

**Preconditions:**
- `plans/stories/{PREFIX}.stories.index.md` exists
- `plans/{PREFIX}.plan.meta.md` exists
- `plans/{PREFIX}.plan.exec.md` exists
- `plans/{PREFIX}.roadmap.md` exists

**Pipeline Phases:**

| Phase | Agent | Output |
|-------|-------|--------|
| 0 | `elab-epic-setup-leader.agent.md` | `AGENT-CONTEXT.md`, `CHECKPOINT.md` |
| 1 | `elab-epic-reviews-leader.agent.md` | 6 parallel perspective reviews |
| 2 | `elab-epic-aggregation-leader.agent.md` | `EPIC-REVIEW.yaml` |
| 3 | `elab-epic-interactive-leader.agent.md` | `DECISIONS.yaml` |
| 4 | `elab-epic-updates-leader.agent.md` | `UPDATES-LOG.yaml` |

**Stakeholder Perspectives (6 parallel reviews):**
- Engineering Lead - Architecture, feasibility, effort
- Product Manager - Scope, value, prioritization
- QA Lead - Testability, quality gates, risk coverage
- UX Lead - User experience, accessibility, design
- Platform/DevOps - Infrastructure, deployment, observability
- Security - OWASP coverage, compliance, data handling

**Verdicts:**
- `READY` - No critical issues, can start stories
- `CONCERNS` - Minor issues, proceed with awareness
- `BLOCKED` - Critical issues prevent starting

**Output:** `plans/{PREFIX}.epic-elab/EPIC-REVIEW.yaml`

**Next Step by verdict:**
- `READY` → `/pm-generate-story {PREFIX}-001`
- `CONCERNS` → `/pm-generate-story {PREFIX}-001` (with notes)
- `BLOCKED` → Address critical findings

**Resume:** If interrupted, reads `CHECKPOINT.md` and resumes from last completed phase.

---

## QA Commands

### `/elab-story`

**Usage:** `/elab-story STORY-XXX`

Performs Story Elaboration/Audit on a PM-generated story BEFORE implementation.

**Preconditions:**
- Story file exists in `backlog/` or `elaboration/`
- Story has `status: backlog`

**Pipeline Phases:**

| Phase | Agent | Model | Output |
|-------|-------|-------|--------|
| 0 | `elab-setup-leader.agent.md` | haiku | Story moved to `elaboration/` |
| 1 | `elab-analyst.agent.md` | sonnet | `_implementation/ANALYSIS.md` |
| — | (Interactive) | — | User decisions collected |
| 2 | `elab-completion-leader.agent.md` | haiku | `ELAB-STORY-XXX.md` |

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

**Next Step:** `/dev-implement-story STORY-XXX` (on PASS)

---

### `/qa-verify-story`

**Usage:** `/qa-verify-story STORY-XXX`

Performs Post-Implementation Verification. This is the FINAL quality gate before DONE.

**Preconditions:**
- Story PASSED elaboration
- Story has `status: ready-for-qa`
- `PROOF-STORY-XXX.md` exists
- Code review passed (`VERIFICATION.yaml` has `code_review.verdict: PASS`)

**Pipeline Phases:**

| Phase | Agent | Model | Output |
|-------|-------|-------|--------|
| 0 | `qa-verify-setup-leader.agent.md` | haiku | Story moved to `QA/`, status `in-qa` |
| 1 | `qa-verify-verification-leader.agent.md` | sonnet | `VERIFICATION.yaml` (qa_verify section) |
| 2 | `qa-verify-completion-leader.agent.md` | haiku | Gate decision, index update |

**Verification Checklist (6 Hard Gates):**
1. **AC Verification** - Every AC mapped to concrete evidence
2. **Test Implementation Quality** - Meaningful tests, no anti-patterns
3. **Test Coverage** - New code: 80% min, critical paths: 90%
4. **Test Execution** - Run all tests, execute .http files for backend
5. **Proof Quality** - Complete and verifiable
6. **Architecture Compliance** - No reuse or boundary violations

**Status Transitions:**
- PASS: `ready-for-qa` → `in-qa` → `uat`, story moves to `UAT/`, index updated
- FAIL: `ready-for-qa` → `in-qa` → `needs-work`, story moves back to `in-progress/`

**Output:** Updates `VERIFICATION.yaml` (qa_verify + gate sections)

**Next Step:**
- PASS: Manual UAT review
- FAIL: `/dev-fix-story STORY-XXX`

**Reference:** `.claude/docs/qa-verify-story-reference.md`

---

## Dev Commands

### `/dev-implement-story`

**Usage:** `/dev-implement-story STORY-XXX [--max-iterations=N] [--force-continue] [--dry-run]`

Implements a story using a multi-agent pipeline with **integrated code review and fix loop**. Runs until code review passes (or max iterations reached).

**Flags:**

| Flag | Default | Purpose |
|------|---------|---------|
| `--max-iterations=N` | 3 | Max review/fix loop iterations before blocking |
| `--force-continue` | false | Proceed to QA with warnings after max iterations |
| `--dry-run` | — | Analyze story, show plan without executing |

**Preconditions:**
- Story has `status: ready-to-work`
- Story has `**Depends On:** none` in index

**Auto-Resume:**

No `--resume` flag needed. Automatically detects existing artifacts:
1. `CHECKPOINT.md` → Resume from checkpoint stage
2. `VERIFICATION.yaml` with FAIL → Skip to Fix
3. `VERIFICATION.yaml` with PASS → Done
4. `PROOF` + LOGs exist → Skip to Review
5. Nothing → Start from Implementation

**Architecture (Context Boundaries):**

```
ORCHESTRATOR (minimal context, manages loop)
    │
    ├─► IMPLEMENTATION AGENT (spawned fresh)
    │     Phases 0-4: Setup, Planning, Implementation, Verification, Documentation
    │
    └─► REVIEW/FIX LOOP (max N iterations)
          │
          ├─► REVIEW AGENT (spawned fresh each iteration)
          │     6 parallel workers: lint, style, syntax, security, typecheck, build
          │
          │   PASS → exit loop
          │   FAIL ↓
          │
          └─► FIX AGENT (spawned fresh each iteration)
                Phases 7-9: Fix, Verify, Document
                └─► Loop back to REVIEW AGENT
```

**Pipeline Phases:**

| Stage | Phase | Agent | Output |
|-------|-------|-------|--------|
| Implementation | 0 | Setup Leader | `SCOPE.md`, `CHECKPOINT.md` |
| Implementation | 1A | Planner | `IMPLEMENTATION-PLAN.md` |
| Implementation | 1B | Plan Validator | `PLAN-VALIDATION.md` |
| Implementation | 2 | Backend/Frontend Coders | `BACKEND-LOG.md`, `FRONTEND-LOG.md` |
| Implementation | 2B | Contracts | `CONTRACTS.md` |
| Implementation | 3 | Verifier + Playwright | `VERIFICATION.md` |
| Implementation | 4 | Proof Writer + Learnings | `PROOF-STORY-XXX.md`, `LESSONS-LEARNED.md` |
| Review | 5-6 | 6 Code Review Workers | `VERIFICATION.yaml` |
| Fix | 7-9 | Fix Leader, Verifier, Docs | Updated artifacts |

**Status Transitions:**
- **Clean pass:** `ready-to-work` → `in-progress` → `ready-for-qa`
- **Forced continue:** `ready-to-work` → `in-progress` → `ready-for-qa-with-warnings`
- **Blocked:** `ready-to-work` → `in-progress` → `blocked` (after max iterations)

**Next Step:** `/qa-verify-story STORY-XXX`

---

### `/dev-code-review` (Standalone - Usually Integrated)

**Usage:** `/dev-code-review STORY-XXX`

Performs code review using parallel specialist sub-agents.

> **Note:** Code review is now **integrated into `/dev-implement-story`** with an automatic fix loop. This standalone command is available for:
> - Re-running code review manually after external changes
> - Running code review on stories implemented outside the workflow
> - Debugging specific review failures

**Preconditions:**
- Story has `status: ready-for-code-review`
- `PROOF-STORY-XXX.md` exists
- `_implementation/VERIFICATION.md` exists

**Review Sub-Agents (6 workers, run in parallel):**
1. **Lint Check** - ESLint on touched files only
2. **Style Compliance** - Tailwind/@repo/app-component-library (HARD GATE)
3. **Syntax Check** - ES7+ patterns
4. **Security Review** - OWASP patterns
5. **Type Check** - TypeScript compilation (`pnpm check-types`)
6. **Build Check** - Production build (`pnpm build`)

**Hard Rules:**
- Style Compliance is MANDATORY - any custom CSS = FAIL
- Lint only touched files
- ES7+ syntax required
- All 6 workers must PASS for overall PASS

**Verdicts:** PASS / FAIL (any worker FAIL = overall FAIL)

**Status Transitions:**
- PASS: `ready-for-code-review` → `ready-for-qa`
- FAIL: `ready-for-code-review` → `code-review-failed`

**Output:** `VERIFICATION.yaml` (schema v3)

**Next Step:**
- PASS: `/qa-verify-story STORY-XXX`
- FAIL: `/dev-fix-story STORY-XXX`

---

### `/dev-fix-story` (Standalone - Usually Integrated)

**Usage:** `/dev-fix-story STORY-XXX`

Fixes issues found during code review or QA verification.

> **Note:** Fix operations are now **integrated into `/dev-implement-story`** via the automatic review/fix loop. This standalone command is available for:
> - Fixing stories that failed QA verification (not just code review)
> - Manual fix runs after external changes
> - Debugging specific fix failures

**Preconditions (one of):**
- Story has `status: code-review-failed`
- Story has `status: needs-work`

**Task:**
1. Read the failure report (`VERIFICATION.yaml` or QA-VERIFY)
2. Address EVERY blocking issue
3. Update implementation code
4. Re-run verification (`pnpm check-types`, `pnpm test`, `pnpm lint`, `pnpm build`)
5. Update `PROOF-STORY-XXX.md`

**Constraints:**
- Must NOT change Acceptance Criteria
- Must NOT redefine scope
- Must NOT add new features

**Status Transition:** `code-review-failed`/`needs-work` → `in-progress` → `ready-for-code-review`

**Next Step:** `/dev-code-review STORY-XXX` (or re-run `/dev-implement-story` to use integrated loop)

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
- Chrome DevTools MCP (Lighthouse + metrics)
- Playwright MCP (navigation, screenshots, axe scans)

**Pipeline Phases:**

| Phase | Agent | Model | Output |
|-------|-------|-------|--------|
| 0 | `ui-ux-review-setup-leader.agent.md` | haiku | `AGENT-CONTEXT.md` |
| 1 | `ui-ux-review-reviewer.agent.md` | sonnet | `UI-UX-FINDINGS.yaml` |
| 2 | `ui-ux-review-report-leader.agent.md` | haiku | `UI-UX-REVIEW-STORY-XXX.md` |

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

**Reference:** `.claude/docs/ui-ux-review-reference.md`

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
| `in-progress` | Dev implementing | → `ready-for-qa`, `ready-for-qa-with-warnings`, `blocked` |
| `ready-for-code-review` | Implementation complete (legacy) | → `ready-for-qa`, `code-review-failed` |
| `code-review-failed` | Code review failed (legacy) | → `in-progress` |
| `ready-for-qa` | Code review passed | → `in-qa` |
| `ready-for-qa-with-warnings` | Forced continue after max iterations | → `in-qa` |
| `blocked` | Max iterations exhausted, needs intervention | → `in-progress` |
| `in-qa` | QA verification in progress | → `uat`, `needs-work` |
| `needs-work` | QA verification failed | → `in-progress` |
| `uat` | QA passed, user acceptance | → `completed` |
| `completed` | Done | — |
| `superseded` | Replaced by split stories | — |

**Note:** With integrated review/fix loop in `/dev-implement-story`, the `ready-for-code-review` and `code-review-failed` statuses are now legacy. Stories typically transition directly from `in-progress` to `ready-for-qa`.

---

## Workflow Commands

### `/workflow-run`

**Usage:** `/workflow-run STORY-XXX [--from=<phase>] [--to=<phase>] [--approve=<phases>] [--dry-run]`

Meta-orchestrator for full story lifecycle. Runs each phase as an isolated Task subagent with fresh context, enabling checkpoint/resume on failure.

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `STORY-XXX` | Yes | Story identifier |
| `--from=N` | No | Start at phase N (skip earlier phases) |
| `--to=N` | No | Stop after phase N |
| `--approve=phases` | No | Pause for approval at specified phases (comma-separated: elab,implement,qa) |
| `--dry-run` | No | Show planned phases without executing |

**Pipeline Phases:**

| Phase | Agent | Model | Output |
|-------|-------|-------|--------|
| 0 | `workflow-run-setup-leader.agent.md` | haiku | `_workflow/STATE.md`, `_workflow/AGENT-CONTEXT.md` |
| 1 | `workflow-run-loop-leader.agent.md` | sonnet | `_workflow/PHASE-N-OUTPUT.md` (per phase) |

**Workflow Phases Executed:**

| # | Phase Name | Command | Success Signal |
|---|------------|---------|----------------|
| 1 | PM Generate | `/pm-story generate` | `PM COMPLETE` |
| 2 | Elaboration | `/elab-story` | `ELAB PASS` |
| 3 | Implementation + Review | `/dev-implement-story` | `REVIEW PASS` (includes code review loop) |
| 4 | QA Verify | `/qa-verify-story` | `QA PASS` |
| 5 | Done | (status update) | `WORKFLOW COMPLETE` |

**Note:** Phase 3 now includes the integrated code review and fix loop. No separate code review phase needed.

**Context Isolation:**

Each workflow phase runs as an isolated Task with fresh 200k token context, preventing context bloat and enabling resume after failure.

**Features:**
- Checkpoint & resume via `STATE.md`
- Dry-run mode for planning
- Approval gates at critical phases
- Token tracking per phase
- Phase output capture for debugging

**Resume After Failure:**

```bash
# If stopped at phase 4 (code review failed):
/workflow-run STORY-XXX --from=4
```

**Reference:** `.claude/docs/workflow-run-reference.md`

---

## Utility Commands

### `/story-status`

**Usage:** `/story-status [STORY-ID]`

Check story status across index files and status directories. Read-only utility.

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `STORY-ID` | No | Story identifier (e.g., STORY-007, WRKF-1020) |

**Modes:**
- **With argument**: Show single story status (index, status, feature, dependencies)
- **Without argument**: Show summary of all stories by status + directory contents

**Inputs:**
- Index files: `plans/stories/*.stories.index.md`
- Status directories: `backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, `QA/`, `UAT/`

**Output:** Markdown tables (index counts) + box-drawing table (directory contents)

---

## Quick Reference

| Task | Command |
|------|---------|
| Generate next ready story | `/pm-story generate next` |
| Generate specific story | `/pm-story generate STORY-XXX` |
| Create ad-hoc story | `/pm-story generate --ad-hoc` |
| Create bug story | `/pm-story bug` |
| Create follow-up story | `/pm-story followup STORY-XXX` |
| Split oversized story | `/pm-story split STORY-XXX` |
| Audit story before dev | `/elab-story STORY-XXX` |
| Fix failed audit | `/pm-fix-story STORY-XXX` |
| Implement story (with review loop) | `/dev-implement-story STORY-XXX` |
| Implement with more iterations | `/dev-implement-story STORY-XXX --max-iterations=5` |
| Force continue despite failures | `/dev-implement-story STORY-XXX --force-continue` |
| Standalone code review | `/dev-code-review STORY-XXX` |
| Standalone fix | `/dev-fix-story STORY-XXX` |
| Final QA verification | `/qa-verify-story STORY-XXX` |
| UI/UX review | `/ui-ux-review STORY-XXX` |
| Create harness story | `/pm-generate-story-000-harness` |
| Check story status | `/story-status [STORY-ID]` |
