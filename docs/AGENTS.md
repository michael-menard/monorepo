# Agents Documentation

This document catalogs all agents in `.claude/agents/` with their roles, responsibilities, and relationships.

## Agent Hierarchy

```
Orchestrator (top-level, user-facing command entry points)
  └── Leader (phase coordinators, spawn workers)
        └── Worker (specialized task executors)

Reference (rules/policies read by other agents, not spawned)
```

---

## Quick Reference

| Count | Type |
|-------|------|
| 2 | Orchestrators |
| 30 | Leaders |
| 25 | Workers |
| 2 | Reference Documents |
| 2 | Archived (legacy) |
| **61** | **Total Active** |

---

## Orchestrators

Orchestrators are top-level agents triggered by user commands. They coordinate entire workflows by spawning Leaders.

| Agent | File | Triggers | Description |
|-------|------|----------|-------------|
| **PM** | `pm.agent.md` | `/pm-story`, `/pm-fix-story`, `/pm-refine-story` | Product Manager orchestrator - owns story definition, scope, and acceptance criteria |
| **Scrum Master** | `scrum-master-*.agent.md` | `/scrum-master` | Orchestrates full story workflow execution (facilitates process, not implementation) |

---

## Reference Documents

Reference documents contain rules and policies that workers READ for context. They are not spawnable agents.

| Reference | File | Read By | Description |
|-----------|------|---------|-------------|
| **QA Role Context** | `qa.agent.md` | `elab-analyst` | QA verification policies and acceptance criteria standards |
| **UI/UX Design Rules** | `uiux.agent.md` | `ui-ux-review-reviewer` | Design system rules, accessibility requirements, UX patterns |

---

## Leaders by Workflow

Leaders coordinate specific phases within a workflow. They spawn and orchestrate Workers.

### PM Workflow Leaders

| Agent | File | Model | Trigger | Description |
|-------|------|-------|---------|-------------|
| **PM Story Generation** | `pm-story-generation-leader.agent.md` | — | `/pm-story generate` | Orchestrates Test Plan, UI/UX Advisor, and Dev Feasibility workers |
| **PM Story Fix** | `pm-story-fix-leader.agent.md` | — | `/pm-fix-story` | Addresses QA feedback, refines stories that failed audit |
| **PM Triage** | `pm-triage-leader.agent.md` | sonnet | `/pm-refine-story` | Interactive feature prioritization and backlog grooming |
| **PM Bootstrap Setup** | `pm-bootstrap-setup-leader.agent.md` | haiku | `/pm-bootstrap-workflow` | Validates inputs, creates bootstrap context |
| **PM Bootstrap Analysis** | `pm-bootstrap-analysis-leader.agent.md` | sonnet | `/pm-bootstrap-workflow` | Extracts stories from raw plan/PRD |
| **PM Bootstrap Generation** | `pm-bootstrap-generation-leader.agent.md` | haiku | `/pm-bootstrap-workflow` | Generates index, meta, exec, roadmap files |
| **PM Harness Setup** | `pm-harness-setup-leader.agent.md` | haiku | `/pm-generate-story-000-harness` | Creates directory structure for harness story |
| **PM Harness Generation** | `pm-harness-generation-leader.agent.md` | haiku | `/pm-generate-story-000-harness` | Generates harness story file and PM artifacts |
| **PM Story Ad-Hoc** | `pm-story-adhoc-leader.agent.md` | sonnet | `/pm-story generate --ad-hoc` | Generates one-off stories not in the index |
| **PM Story Bug** | `pm-story-bug-leader.agent.md` | sonnet | `/pm-story bug` | Generates bug fix stories |
| **PM Story Follow-up** | `pm-story-followup-leader.agent.md` | sonnet | `/pm-story followup` | Generates follow-up stories from QA Elaboration findings |
| **PM Story Split** | `pm-story-split-leader.agent.md` | sonnet | `/pm-story split` | Splits oversized stories based on ELAB recommendations |

### Dev Workflow Leaders

These leaders are **parameterized by mode** (`implement` or `fix`) and used by both `/dev-implement-story` and `/dev-fix-story`.

| Agent | File | Model | Modes | Description |
|-------|------|-------|-------|-------------|
| **Dev Setup** | `dev-setup-leader.agent.md` | haiku | implement, fix | Validates preconditions, creates SCOPE.md or FIX-CONTEXT.md |
| **Dev Planning** | `dev-implement-planning-leader.agent.md` | — | implement | Orchestrates Planner and Validator workers |
| **Dev Implementation** | `dev-implement-implementation-leader.agent.md` | — | implement | Spawns Backend/Frontend Coders in parallel, handles retry logic |
| **Dev Fix** | `dev-fix-fix-leader.agent.md` | sonnet | fix | Applies fixes using Backend/Frontend Coders with retry |
| **Dev Verification** | `dev-verification-leader.agent.md` | haiku | implement, fix | Orchestrates Verifier (+ Playwright for implement mode) |
| **Dev Documentation** | `dev-documentation-leader.agent.md` | haiku | implement, fix | Spawns Proof Writer (+ Learnings for implement mode) |

### Elaboration Workflow Leaders (Story)

| Agent | File | Model | Description |
|-------|------|-------|-------------|
| **Elab Setup** | `elab-setup-leader.agent.md` | haiku | Moves story from backlog to elaboration directory |
| **Elab Completion** | `elab-completion-leader.agent.md` | haiku | Writes ELAB report, updates status, moves directory |

### Elaboration Workflow Leaders (Epic)

| Agent | File | Model | Description |
|-------|------|-------|-------------|
| **Elab Epic Setup** | `elab-epic-setup-leader.agent.md` | haiku | Validates epic artifacts, creates output directory |
| **Elab Epic Reviews** | `elab-epic-reviews-leader.agent.md` | haiku | Spawns 6 parallel stakeholder review workers |
| **Elab Epic Aggregation** | `elab-epic-aggregation-leader.agent.md` | haiku | Merges 6 review outputs into unified EPIC-REVIEW.yaml |
| **Elab Epic Interactive** | `elab-epic-interactive-leader.agent.md` | sonnet | Presents findings to user, collects decisions |
| **Elab Epic Updates** | `elab-epic-updates-leader.agent.md` | haiku | Applies accepted decisions to epic artifacts |

### QA Workflow Leaders

| Agent | File | Model | Description |
|-------|------|-------|-------------|
| **QA Verify Setup** | `qa-verify-setup-leader.agent.md` | haiku | Validates preconditions, moves story to QA directory |
| **QA Verify Verification** | `qa-verify-verification-leader.agent.md` | sonnet | Executes all verification checks, runs tests |
| **QA Verify Completion** | `qa-verify-completion-leader.agent.md` | haiku | Updates status based on verdict, spawns index updater |

### UI/UX Workflow Leaders

| Agent | File | Model | Description |
|-------|------|-------|-------------|
| **UI/UX Review Setup** | `ui-ux-review-setup-leader.agent.md` | haiku | Validates preconditions, determines if story touches UI |
| **UI/UX Review Report** | `ui-ux-review-report-leader.agent.md` | haiku | Compiles findings into final UI-UX-REVIEW report |

### Scrum Master Leaders

| Agent | File | Model | Description |
|-------|------|-------|-------------|
| **Scrum Master Setup** | `scrum-master-setup-leader.agent.md` | haiku | Parses flags, validates story state, determines phase range |
| **Scrum Master Loop** | `scrum-master-loop-leader.agent.md` | sonnet | Executes phase sequence, handles checkpoints and errors |

---

## Workers by Domain

Workers are specialized executors that perform specific tasks under Leader coordination.

### PM Workers

| Agent | File | Model | Output | Description |
|-------|------|-------|--------|-------------|
| **Test Plan Writer** | `pm-draft-test-plan.agent.md` | haiku | `_pm/TEST-PLAN.md` | Drafts runnable test plans |
| **UI/UX Advisor** | `pm-uiux-recommendations.agent.md` | haiku | `_pm/UIUX-NOTES.md` | Provides UI/UX compliance guidance |
| **Dev Feasibility** | `pm-dev-feasibility-review.agent.md` | haiku | `_pm/DEV-FEASIBILITY.md` | Reviews scope for feasibility and risk |

### Dev Workers

| Agent | File | Model | Output | Description |
|-------|------|-------|--------|-------------|
| **Planner** | `dev-implement-planner.agent.md` | — | `IMPLEMENTATION-PLAN.md` | Creates step-by-step implementation plan |
| **Plan Validator** | `dev-implement-plan-validator.agent.md` | — | `PLAN-VALIDATION.md` | Validates implementation plan before coding |
| **Backend Coder** | `dev-implement-backend-coder.agent.md` | — | `BACKEND-LOG.md` | Implements backend portions in auditable chunks |
| **Frontend Coder** | `dev-implement-frontend-coder.agent.md` | — | `FRONTEND-LOG.md` | Implements frontend portions in auditable chunks |
| **Contracts** | `dev-implement-contracts.agent.md` | — | `CONTRACTS.md` | Ensures Swagger and .http files are accurate |
| **Verifier** | `dev-implement-verifier.agent.md` | — | `VERIFICATION.md` | Runs build, type check, lint, and tests |
| **Playwright** | `dev-implement-playwright.agent.md` | — | Appends to `VERIFICATION.md` | Runs Playwright tests, captures video |
| **Proof Writer** | `dev-implement-proof-writer.agent.md` | — | `PROOF-STORY-XXX.md` | Creates final proof mapping AC to evidence |
| **Learnings** | `dev-implement-learnings.agent.md` | — | `LESSONS-LEARNED.md` | Extracts lessons learned for future stories |

### Elaboration Workers

| Agent | File | Model | Output | Description |
|-------|------|-------|--------|-------------|
| **Elab Analyst** | `elab-analyst.agent.md` | sonnet | `ANALYSIS.md` | Performs 8-point audit and discovery analysis |

### Epic Review Workers (6 Perspectives)

| Agent | File | Model | Output | Description |
|-------|------|-------|--------|-------------|
| **Engineering** | `elab-epic-engineering.agent.md` | haiku | `REVIEW-ENGINEERING.yaml` | Architecture, feasibility, effort, tech debt |
| **Product** | `elab-epic-product.agent.md` | haiku | `REVIEW-PRODUCT.yaml` | Scope, value, prioritization, user impact |
| **QA** | `elab-epic-qa.agent.md` | haiku | `REVIEW-QA.yaml` | Testability, quality gates, risk coverage |
| **UX** | `elab-epic-ux.agent.md` | haiku | `REVIEW-UX.yaml` | User experience, accessibility, design consistency |
| **Platform** | `elab-epic-platform.agent.md` | haiku | `REVIEW-PLATFORM.yaml` | Infrastructure, deployment, observability |
| **Security** | `elab-epic-security.agent.md` | haiku | `REVIEW-SECURITY.yaml` | OWASP, compliance, data handling |

### Code Review Workers

| Agent | File | Model | Output | Description |
|-------|------|-------|--------|-------------|
| **Lint** | `code-review-lint.agent.md` | sonnet | YAML findings | Runs ESLint on touched files |
| **Style Compliance** | `code-review-style-compliance.agent.md` | sonnet | YAML findings | Verifies Tailwind + app component library only |
| **Syntax** | `code-review-syntax.agent.md` | sonnet | YAML findings | Verifies ES7+ syntax compliance |
| **Security** | `code-review-security.agent.md` | sonnet | YAML findings | OWASP top 10 vulnerability scan |
| **Type Check** | `code-review-typecheck.agent.md` | sonnet | YAML findings | Runs TypeScript type checking |
| **Build** | `code-review-build.agent.md` | sonnet | YAML findings | Verifies production build succeeds |

### UI/UX Workers

| Agent | File | Model | Output | Description |
|-------|------|-------|--------|-------------|
| **UI/UX Reviewer** | `ui-ux-review-reviewer.agent.md` | sonnet | `UI-UX-FINDINGS.yaml` | Executes design system, a11y, and performance checks |

---

## Archived Agents

Legacy agents that have been superseded by the current phase-leader pattern. Located in `.claude/agents/_archive/`.

| Agent | File | Replaced By |
|-------|------|-------------|
| **Code Review (legacy)** | `_archive/code-review.agent.md` | 4 specialized workers (lint, style, syntax, security) |
| **Dev (legacy)** | `_archive/dev.agent.md` | Phase-leader pattern (setup, planning, implementation, verification, documentation) |

---

## Workflow Diagrams

### Story Implementation Flow (v5.0 - Integrated Review/Fix Loop)

```
/dev-implement-story STORY-XXX [--max-iterations=N] [--force-continue]

ORCHESTRATOR (minimal context, manages loop)
    │
    ├─► IMPLEMENTATION AGENT (spawned fresh)
    │     └── dev-setup-leader (Phase 0, mode: implement)
    │     └── dev-implement-planning-leader (Phase 1)
    │           ├── dev-implement-planner (worker)
    │           └── dev-implement-plan-validator (worker)
    │     └── dev-implement-implementation-leader (Phase 2)
    │           ├── dev-implement-backend-coder (worker, parallel)
    │           ├── dev-implement-frontend-coder (worker, parallel)
    │           └── dev-implement-contracts (worker, after backend)
    │     └── dev-verification-leader (Phase 3, mode: implement)
    │           ├── dev-implement-verifier (worker)
    │           └── dev-implement-playwright (worker, if UI)
    │     └── dev-documentation-leader (Phase 4, mode: implement)
    │           ├── dev-implement-proof-writer (worker)
    │           └── dev-implement-learnings (worker)
    │
    └─► REVIEW/FIX LOOP (max N iterations, default 3)
          │
          ├─► REVIEW AGENT (spawned fresh each iteration)
          │     └── 6 parallel workers:
          │           ├── code-review-lint
          │           ├── code-review-style-compliance
          │           ├── code-review-syntax
          │           ├── code-review-security
          │           ├── code-review-typecheck
          │           └── code-review-build
          │     └── Aggregate → VERIFICATION.yaml
          │
          │   PASS → exit loop, status: ready-for-qa
          │   FAIL ↓
          │
          └─► FIX AGENT (spawned fresh each iteration)
                └── dev-fix-fix-leader (Phase 7)
                └── dev-verification-leader (Phase 8, mode: fix)
                └── dev-documentation-leader (Phase 9, mode: fix)
                └── Loop back to REVIEW AGENT

Context cleared between Implementation, Review, and Fix agents.
Auto-detects existing artifacts and resumes from appropriate stage.
```

### Story Fix Flow

```
/dev-fix-story STORY-XXX
  └── dev-setup-leader (Phase 0, mode: fix)
  └── dev-fix-fix-leader (Phase 1)
        ├── dev-implement-backend-coder (worker, if backend fix)
        └── dev-implement-frontend-coder (worker, if frontend fix)
  └── dev-verification-leader (Phase 2, mode: fix)
        └── dev-implement-verifier (worker)
  └── dev-documentation-leader (Phase 3, mode: fix)
        └── dev-implement-proof-writer (worker, update mode)
```

### Story Generation Flow

```
/pm-story generate
  └── pm-story-generation-leader
        ├── pm-draft-test-plan (worker, parallel)
        ├── pm-uiux-recommendations (worker, parallel, if UI)
        └── pm-dev-feasibility-review (worker, parallel)
```

### Epic Elaboration Flow

```
/elab-epic {PREFIX}
  └── elab-epic-setup-leader (Phase 0)
  └── elab-epic-reviews-leader (Phase 1)
        ├── elab-epic-engineering (worker, parallel)
        ├── elab-epic-product (worker, parallel)
        ├── elab-epic-qa (worker, parallel)
        ├── elab-epic-ux (worker, parallel)
        ├── elab-epic-platform (worker, parallel)
        └── elab-epic-security (worker, parallel)
  └── elab-epic-aggregation-leader (Phase 2)
  └── elab-epic-interactive-leader (Phase 3)
  └── elab-epic-updates-leader (Phase 4)
```

### QA Verification Flow

```
/qa-verify-story STORY-XXX
  └── qa-verify-setup-leader
  └── qa-verify-verification-leader
  └── qa-verify-completion-leader
```

### Code Review Flow

```
/dev-code-review STORY-XXX (standalone, or integrated into /dev-implement-story)
  ├── code-review-lint (worker, parallel)
  ├── code-review-style-compliance (worker, parallel)
  ├── code-review-syntax (worker, parallel)
  ├── code-review-security (worker, parallel)
  ├── code-review-typecheck (worker, parallel)
  └── code-review-build (worker, parallel)

All 6 workers run in parallel. Any FAIL → overall FAIL.
```

---

## Consolidated Leaders

Three leaders now support both implement and fix workflows via a `mode` parameter:

| Leader | Modes | Implement Behavior | Fix Behavior |
|--------|-------|-------------------|--------------|
| `dev-setup-leader` | implement, fix | Validates QA-AUDIT, moves to in-progress, creates SCOPE.md | Parses failure report, creates FIX-CONTEXT.md |
| `dev-verification-leader` | implement, fix | Runs Verifier + Playwright, full VERIFICATION-SUMMARY.md | Runs Verifier only, compact FIX-VERIFICATION-SUMMARY.md |
| `dev-documentation-leader` | implement, fix | Proof Writer + Learnings + token-report | Proof Writer only (update mode), adds Fix Cycle section |

---

## Model Usage Summary

| Model | Use Cases | Cost Tier |
|-------|-----------|-----------|
| **haiku** | Simple validation, setup phases, file operations, most workers | Low |
| **sonnet** | Complex analysis, code review, interactive sessions, triage | Medium |
| **opus** | Not explicitly specified in agents | High |

Most workers use haiku for efficiency. Leaders handling complex orchestration or analysis use sonnet.

---

## Token Tracking

All agents are required to call `/token-log` before completion signals:

```
/token-log STORY-XXX <phase> <input-tokens> <output-tokens>
```

Workers report token summaries to leaders for aggregation.

Estimate formula: `tokens ≈ bytes / 4`

---

## Refactoring History

### January 2026 Consolidation

**Changes Made:**
- Archived 2 legacy orchestrators (`code-review.agent.md`, `dev.agent.md`)
- Reclassified 2 agents as reference documents (`qa.agent.md`, `uiux.agent.md`)
- Consolidated 6 leaders into 3 parameterized versions (setup, verification, documentation)
- Added frontmatter to 5 active agents that were missing it
- Net result: 61 → 59 active agents

**Files Consolidated:**
- `dev-implement-setup-leader` + `dev-fix-setup-leader` → `dev-setup-leader`
- `dev-implement-verification-leader` + `dev-fix-verification-leader` → `dev-verification-leader`
- `dev-implement-documentation-leader` + `dev-fix-documentation-leader` → `dev-documentation-leader`
