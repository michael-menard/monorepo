# Agent Migration Plan — Phase 7: DB-First Swim-Lane Migration

**Story**: WINT-7020
**Author**: Automated (dev-implement-story)
**Date**: 2026-02-18
**Status**: Draft for WINT-7030 developer consumption

---

## 1. Scope

### 1.1 Purpose

This document categorizes all agents, commands, and skills that contain swim-lane directory references, scores them by migration risk, groups them into sequential batches, and defines per-batch verification and rollback criteria. It is the direct input to WINT-7030 through WINT-7090.

### 1.2 Migration Target

All swim-lane directory references in agent/command/skill files must be updated to use the compatibility shim at `packages/backend/mcp-tools/src/story-compatibility/`. The shim provides four functions:

| Function | Pattern | Canonical Example |
|----------|---------|-------------------|
| `shimGetStoryStatus` | DB-first read | `.claude/commands/story-status.md` |
| `shimUpdateStoryStatus` | DB-first write | `.claude/commands/story-update.md` |
| `shimMoveStory` | DB-first move + directory preserve | `.claude/commands/story-move.md` |
| `shimListStories` | DB-first list | (new in migration) |

### 1.3 Input Artifacts Consumed

All 7 WINT-7010 audit artifacts were consumed as inputs:

| # | Artifact | File Path | Data Extracted |
|---|----------|-----------|----------------|
| 1 | AGENT-CATALOG.yaml | `plans/future/platform/UAT/WINT-7010/AGENT-CATALOG.yaml` | 141 agent metadata records (type, version, permissions, spawn relationships) |
| 2 | CROSS-REFERENCES.yaml | `plans/future/platform/UAT/WINT-7010/CROSS-REFERENCES.yaml` | 62 spawn relationships across 20 spawning agents; command-to-agent and agent-to-agent refs |
| 3 | ORPHANED-AGENTS.yaml | `plans/future/platform/UAT/WINT-7010/ORPHANED-AGENTS.yaml` | 41 unreferenced agents (29.1% of total) |
| 4 | AUDIT-SUMMARY.md | `plans/future/platform/UAT/WINT-7010/AUDIT-SUMMARY.md` | Migration recommendations, readiness assessment |
| 5 | DIRECTORY-STRUCTURE.md | `plans/future/platform/UAT/WINT-7010/DIRECTORY-STRUCTURE.md` | 143 agent files, 17 shared resources, 12 reference docs, 2 archived |
| 6 | SPAWN-GRAPH.md | `plans/future/platform/UAT/WINT-7010/SPAWN-GRAPH.md` | Visual spawn hierarchy (Mermaid), 62 edges, 20 spawning parents |
| 7 | SHARED-DEPENDENCIES.yaml | `plans/future/platform/UAT/WINT-7010/SHARED-DEPENDENCIES.yaml` | 17 shared modules, dependency counts per module |

---

## 2. Excluded Files (Already Migrated)

The following files are **already DB-first** and are explicitly excluded from all migration batches. They must NOT appear in any batch file list.

| File | Migration Story | Pattern | Verification Status |
|------|----------------|---------|---------------------|
| `.claude/commands/story-status.md` | WINT-1040 | DB-first read via `shimGetStoryStatus` | UAT verified |
| `.claude/commands/story-update.md` | WINT-1050 | DB-first write via `shimUpdateStoryStatus` | UAT verified |
| `.claude/commands/story-move.md` | WINT-1060 | DB-first move via `shimMoveStory` + directory preserve | UAT verified |

### Associated Agents (also excluded)

These agents were updated as part of the above stories and require no further migration:

- Any agent logic within `story-status.md`, `story-update.md`, `story-move.md` command files
- The compatibility shim module itself (`packages/backend/mcp-tools/src/story-compatibility/`)

---

## 3. Risk-Scored Inventory

### 3.1 Risk Scoring Model

| Risk Tier | Criteria | Spawn Depth | Reference Count |
|-----------|----------|-------------|-----------------|
| **Critical** | Top-level orchestrator or leader with 5+ spawn children; core workflow entry point | 0 (root) | High (10+) |
| **High** | Leader with 2-4 spawn children or high command trigger frequency; workflow gate | 0-1 | Medium (5-9) |
| **Medium** | Worker spawned by high-risk leader; contains substantive swim-lane directory refs | 1-2 | Low-Medium (2-4) |
| **Low** | Leaf worker with 1 parent; incidental swim-lane refs or no direct refs | 2+ | Low (0-1) |

### 3.2 Swim-Lane Agent Inventory

#### 3.2.1 Commands with Swim-Lane References

| File Path | Agent Type | Swim-Lane Ref Count | Spawn Depth | Risk Tier | Migration Rationale |
|-----------|-----------|---------------------|-------------|-----------|---------------------|
| `.claude/commands/dev-implement-story.md` | command | 12+ | 0 | **Critical** | Orchestrates full dev lifecycle; moves stories ready-to-work → in-progress → needs-code-review |
| `.claude/commands/dev-fix-story.md` | command | 8+ | 0 | **Critical** | Reads from failed-qa/needs-code-review; writes back to needs-code-review |
| `.claude/commands/dev-code-review.md` | command | 6+ | 0 | **High** | Reads from needs-code-review; moves to ready-for-qa |
| `.claude/commands/elab-story.md` | command | 8+ | 0 | **High** | Moves stories through backlog → elaboration → ready-to-work |
| `.claude/commands/qa-verify-story.md` | command | 8+ | 0 | **High** | Reads from ready-for-qa; moves to UAT or failed-qa |
| `.claude/commands/pm-story.md` | command | 6+ | 0 | **High** | Creates stories in backlog; manages feature directories |
| `.claude/commands/pm-fix-story.md` | command | 4+ | 0 | **Medium** | Reads story from various stages for fix generation |
| `.claude/commands/scrum-master.md` | command | 6+ | 0 | **Medium** | Reads all swim-lane directories for status reporting |
| `.claude/commands/pm-bootstrap-workflow.md` | command | 4+ | 0 | **Medium** | Creates feature directory structure with swim-lane dirs |
| `.claude/commands/ui-ux-review.md` | command | 2+ | 0 | **Low** | Reads story from current stage for UI review |
| `.claude/commands/pm-refine-story.md` | command | 2+ | 0 | **Low** | Reads stories from backlog for prioritization |
| `.claude/commands/elab-epic.md` | command | 4+ | 0 | **Medium** | Reads feature-level stories across stages |
| `.claude/commands/pm-generate-story-000-harness.md` | command | 2+ | 0 | **Low** | Creates harness stories in backlog |

#### 3.2.2 Leader Agents with Swim-Lane References

| File Path | Agent Type | Swim-Lane Ref Count | Spawn Chain Depth | Risk Tier | Migration Rationale |
|-----------|-----------|---------------------|-------------------|-----------|---------------------|
| `dev-setup-leader.agent.md` | leader | 8+ | 0 | **Critical** | Reads story from ready-to-work/in-progress; creates CHECKPOINT.yaml; spawns knowledge-context-loader |
| `dev-plan-leader.agent.md` | leader | 6+ | 0 | **Critical** | Reads story artifacts; writes PLAN.yaml to _implementation/ |
| `dev-execute-leader.agent.md` | leader | 8+ | 0 | **Critical** | Writes EVIDENCE.yaml; spawns backend/frontend coders; runs E2E |
| `dev-proof-leader.agent.md` | leader | 4+ | 0 | **High** | Reads EVIDENCE.yaml; writes PROOF to _implementation/ |
| `dev-documentation-leader.agent.md` | leader | 6+ | 0 | **High** | Manages story artifacts across stages |
| `dev-verification-leader.agent.md` | leader | 6+ | 0 | **High** | Reads story state; spawns 4 metrics agents |
| `dev-implement-implementation-leader.agent.md` | leader | 6+ | 0 | **High** | Spawns backend/frontend coders with story context |
| `dev-implement-planning-leader.agent.md` | leader | 4+ | 0 | **High** | Reads story for planning; spawns planner/validator |
| `dev-fix-fix-leader.agent.md` | leader | 6+ | 0 | **High** | Reads REVIEW.yaml from _implementation/; spawns coders |
| `elab-setup-leader.agent.md` | leader | 6+ | 0 | **High** | Reads story from backlog; creates elab artifacts |
| `elab-completion-leader.agent.md` | leader | 6+ | 0 | **High** | Moves story to ready-to-work; spawns delta-review, escape-hatch |
| `qa-verify-setup-leader.agent.md` | leader | 6+ | 0 | **High** | Reads story from ready-for-qa; validates preconditions |
| `qa-verify-completion-leader.agent.md` | leader | 6+ | 0 | **High** | Moves story to UAT or failed-qa |
| `qa-verify-verification-leader.agent.md` | leader | 4+ | 0 | **High** | Runs verification checks against story artifacts |
| `pm-story-generation-leader.agent.md` | leader | 6+ | 0 | **High** | Creates stories in backlog; spawns 14 worker agents |
| `pm.agent.md` | orchestrator | 4+ | 0 | **High** | Top-level PM router; dispatches to sub-leaders |
| `pm-story-adhoc-leader.agent.md` | leader | 4+ | 0 | **Medium** | Creates ad-hoc stories in backlog |
| `pm-story-followup-leader.agent.md` | leader | 4+ | 0 | **Medium** | Creates follow-up stories |
| `pm-story-split-leader.agent.md` | leader | 4+ | 0 | **Medium** | Splits stories within backlog |
| `pm-story-bug-leader.agent.md` | leader | 4+ | 0 | **Medium** | Creates bug stories in backlog |
| `pm-story-fix-leader.agent.md` | leader | 4+ | 0 | **Medium** | Reads story for fix assessment |
| `pm-triage-leader.agent.md` | leader | 2+ | 0 | **Medium** | Reads stories for triage/refinement |
| `pm-bootstrap-analysis-leader.agent.md` | leader | 4+ | 0 | **Medium** | Analyzes feature directory structure |
| `pm-bootstrap-generation-leader.agent.md` | leader | 4+ | 0 | **Medium** | Generates feature directory with swim-lanes |
| `pm-bootstrap-setup-leader.agent.md` | leader | 2+ | 0 | **Low** | Validates bootstrap preconditions |
| `pm-harness-generation-leader.agent.md` | leader | 2+ | 0 | **Low** | Creates harness stories |
| `pm-harness-setup-leader.agent.md` | leader | 2+ | 0 | **Low** | Validates harness preconditions |
| `scrum-master-loop-leader.agent.md` | leader | 6+ | 0 | **Medium** | Reads all stages for workflow tracking; spawns 6 agents |
| `scrum-master-setup-leader.agent.md` | leader | 4+ | 0 | **Medium** | Reads story state for scrum master setup |
| `elab-epic-setup-leader.agent.md` | leader | 4+ | 0 | **Medium** | Reads epic feature directory |
| `elab-epic-interactive-leader.agent.md` | leader | 4+ | 0 | **Medium** | Manages epic-level elab interactions |
| `elab-epic-aggregation-leader.agent.md` | leader | 4+ | 0 | **Medium** | Aggregates epic elab results |
| `elab-epic-reviews-leader.agent.md` | leader | 4+ | 0 | **Medium** | Orchestrates epic review workers |
| `elab-epic-updates-leader.agent.md` | leader | 2+ | 0 | **Low** | Writes epic updates |
| `review-aggregate-leader.agent.md` | leader | 4+ | 0 | **Medium** | Reads story artifacts for code review; spawns 10+ review workers |
| `architect-aggregation-leader.agent.md` | leader | 2+ | 0 | **Low** | Aggregates architect review results |
| `architect-setup-leader.agent.md` | leader | 2+ | 0 | **Low** | Architect review setup |
| `uat-orchestrator.agent.md` | leader | 4+ | 0 | **Medium** | Orchestrates UAT verification |
| `ui-ux-review-setup-leader.agent.md` | leader | 2+ | 0 | **Low** | UI/UX review setup |
| `ui-ux-review-report-leader.agent.md` | leader | 2+ | 0 | **Low** | UI/UX review aggregation |

#### 3.2.3 Worker Agents with Swim-Lane References

| File Path | Agent Type | Swim-Lane Ref Count | Spawn Chain Depth | Risk Tier | Migration Rationale |
|-----------|-----------|---------------------|-------------------|-----------|---------------------|
| `dev-implement-backend-coder.agent.md` | worker | 4+ | 2 | **Medium** | Writes code in story worktree; reads _implementation/ |
| `dev-implement-frontend-coder.agent.md` | worker | 4+ | 2 | **Medium** | Writes code in story worktree; reads _implementation/ |
| `dev-implement-playwright.agent.md` | worker | 4+ | 2 | **Medium** | Runs E2E tests; reads story context |
| `dev-implement-planner.agent.md` | worker | 4+ | 2 | **Medium** | Reads story for planning |
| `dev-implement-plan-validator.agent.md` | worker | 2+ | 2 | **Low** | Validates plan against story |
| `dev-implement-contracts.agent.md` | worker | 2+ | 2 | **Low** | Reads story contracts |
| `dev-implement-proof-writer.agent.md` | worker | 4+ | 2 | **Medium** | Writes PROOF doc from EVIDENCE |
| `dev-implement-verifier.agent.md` | worker | 2+ | 2 | **Low** | Runs verification checks |
| `dev-implement-learnings.agent.md` | worker | 2+ | 2 | **Low** | Writes learnings to _implementation/ |
| `elab-analyst.agent.md` | worker | 4+ | 1 | **Medium** | Reads story from backlog; writes ANALYSIS.md |
| `elab-autonomous-decider.agent.md` | worker | 2+ | 1 | **Low** | Autonomous elab decision making |
| `elab-delta-review-agent.agent.md` | worker | 2+ | 1 | **Low** | Reviews elab delta changes |
| `elab-escape-hatch-agent.agent.md` | worker | 2+ | 2 | **Low** | Handles elab escape hatches |
| `elab-phase-contract-agent.agent.md` | worker | 2+ | 1 | **Low** | Validates phase contracts |
| `commitment-gate-agent.agent.md` | worker | 2+ | 1 | **Low** | Validates commitment gate |
| `knowledge-context-loader.agent.md` | worker | 4+ | 1 | **Medium** | Loads story context from directories; spawned by 5 leaders |
| `pm-story-seed-agent.agent.md` | worker | 4+ | 1 | **Medium** | Creates story seed in backlog |
| `pm-dev-feasibility-review.agent.md` | worker | 2+ | 1 | **Low** | Reads story for feasibility |
| `pm-draft-test-plan.agent.md` | worker | 2+ | 1 | **Low** | Reads story for test planning |
| `pm-uiux-recommendations.agent.md` | worker | 2+ | 1 | **Low** | Reads story for UX recommendations |
| `pm-story-risk-predictor.agent.md` | worker | 2+ | 1 | **Low** | Reads story for risk prediction |
| `architect-story-review.agent.md` | worker | 2+ | 1 | **Medium** | Reads story for architect review |
| `uat-precondition-check.agent.md` | worker | 2+ | 1 | **Low** | Checks UAT preconditions |
| `ui-ux-review-reviewer.agent.md` | worker | 2+ | 1 | **Low** | Reviews story UI/UX |
| `reality-intake-collector.agent.md` | worker | 2+ | 1 | **Low** | Collects reality intake data |
| `reality-intake-setup.agent.md` | worker | 2+ | 1 | **Low** | Sets up reality intake |

#### 3.2.4 Utility/Metrics Workers (Incidental References)

| File Path | Agent Type | Swim-Lane Ref Count | Spawn Chain Depth | Risk Tier | Migration Rationale |
|-----------|-----------|---------------------|-------------------|-----------|---------------------|
| `ttdc-metrics-agent.agent.md` | worker | 1 | 1 | **Low** | Incidental story path reference |
| `churn-index-metrics-agent.agent.md` | worker | 1 | 1 | **Low** | Incidental story path reference |
| `leakage-metrics-agent.agent.md` | worker | 1 | 1 | **Low** | Incidental story path reference |
| `pcar-metrics-agent.agent.md` | worker | 1 | 1 | **Low** | Incidental story path reference |
| `turn-count-metrics-agent.agent.md` | worker | 1 | 1 | **Low** | Incidental story path reference |

---

## 4. Orphaned Agent Deprecation Review

All 41 orphaned agents from `ORPHANED-AGENTS.yaml` are classified below. "Orphaned" means not referenced by frontmatter `spawned_by` fields — many are dynamically spawned at runtime via Task tool calls.

### 4.1 Classification: include-in-migration (33 agents)

These agents are actively used in workflows via dynamic spawning or direct CLI invocation:

| Agent | Type | Rationale |
|-------|------|-----------|
| `audit-accessibility` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-code-quality` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-devils-advocate` | worker | Referenced in code-audit.md command; spawned dynamically |
| `audit-duplication` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-moderator` | leader | Referenced in code-audit.md command; spawned dynamically |
| `audit-performance` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-react` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-security` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-test-coverage` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-typescript` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `audit-ui-ux` | worker | Spawned dynamically by audit-aggregate-leader via Task tool |
| `code-review-accessibility` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-build` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-lint` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-react` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-reusability` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-security` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-style-compliance` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-syntax` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-typecheck` | worker | Spawned dynamically by review-aggregate-leader |
| `code-review-typescript` | worker | Spawned dynamically by review-aggregate-leader |
| `dev-implement-backend-coder` | worker | Spawned dynamically by dev-execute-leader |
| `dev-implement-contracts` | worker | Spawned dynamically by dev-implement-planning-leader |
| `dev-implement-frontend-coder` | worker | Spawned dynamically by dev-execute-leader |
| `dev-implement-learnings` | worker | Spawned dynamically by dev-documentation-leader |
| `dev-implement-plan-validator` | worker | Spawned dynamically by dev-implement-planning-leader |
| `dev-implement-planner` | worker | Spawned dynamically by dev-implement-planning-leader |
| `dev-implement-playwright` | worker | Spawned dynamically by dev-execute-leader |
| `dev-implement-proof-writer` | worker | Spawned dynamically by dev-proof-leader |
| `dev-implement-verifier` | worker | Spawned dynamically by dev-verification-leader |
| `doc-sync` | worker | Active utility; triggered by /doc-sync skill |
| `kb-writer` | worker | Active utility; spawned for KB writes |
| `quick-review` | worker | Active CLI utility; invoked directly |

### 4.2 Classification: deprecate-before-migrate (6 agents)

These agents have low or no usage and should be deprecated before migration to avoid migrating dead code:

| Agent | Type | Rationale |
|-------|------|-----------|
| `experiment-analyzer` | unknown | Incomplete frontmatter (type: None); no observed usage; likely experimental stub |
| `heuristic-evolver` | worker | Utility for autonomy tier adjustments; not integrated into any workflow |
| `improvement-proposer` | analyzer | Standalone improvement analysis; no workflow integration |
| `pattern-miner` | analyzer | Standalone pattern mining; no workflow integration |
| `quick-security` | worker | Redundant with code-review-security; can be archived |
| `quick-test` | worker | Redundant with dev-implement-verifier; can be archived |

### 4.3 Classification: archive-not-migrate (2 agents)

These reference-type agents contain no executable logic or swim-lane references:

| Agent | Type | Rationale |
|-------|------|-----------|
| `qa` | reference | Reference documentation only; no swim-lane logic to migrate |
| `uiux` | reference | Reference documentation only; no swim-lane logic to migrate |

---

## 5. Migration Batches

### Batch Overview

| Batch | Name | Files | Est. Points | Story ID | Depends On |
|-------|------|-------|-------------|----------|------------|
| 1 | Story Management Commands | 3 commands + shared modules | 3 | WINT-7030 | None (already done — verification only) |
| 2 | Dev Workflow | 2 commands, 11 leaders, 10 workers | 8 | WINT-7040 | Batch 1 |
| 3 | Elab Workflow | 1 command, 9 leaders, 5 workers | 5 | WINT-7050 | Batch 1 |
| 4 | QA & UAT Workflow | 1 command, 4 leaders, 2 workers | 5 | WINT-7060 | Batch 2 |
| 5 | PM & Planning | 2 commands, 12 leaders, 10 workers | 5 | WINT-7070 | Batch 1 |
| 6 | Review & Architecture | 2 commands, 3 leaders, 22 workers | 5 | WINT-7080 | Batch 2 |
| 7 | Utility, Metrics & Orphan Cleanup | 2 commands, 3 leaders, 14 workers | 3 | WINT-7090 | Batches 2-6 |

### Batch 1: Story Management Commands (WINT-7030) — VERIFICATION ONLY

**Purpose**: Verify that the 3 already-migrated commands are stable. No migration work needed — this batch confirms the foundation.

**Files (verification targets only — no modification)**:
- `.claude/commands/story-status.md` ← already DB-first (WINT-1040)
- `.claude/commands/story-update.md` ← already DB-first (WINT-1050)
- `.claude/commands/story-move.md` ← already DB-first (WINT-1060)
- `packages/backend/mcp-tools/src/story-compatibility/` ← shim module

**Estimated effort**: 3 points (smoke-test only)

---

### Batch 2: Dev Workflow (WINT-7040)

**Purpose**: Migrate the dev-implement-story and dev-fix-story command chains to DB-first.

**Commands**:
- `.claude/commands/dev-implement-story.md`
- `.claude/commands/dev-fix-story.md`

**Leaders**:
- `dev-setup-leader.agent.md` (Critical)
- `dev-plan-leader.agent.md` (Critical)
- `dev-execute-leader.agent.md` (Critical)
- `dev-proof-leader.agent.md` (High)
- `dev-documentation-leader.agent.md` (High)
- `dev-verification-leader.agent.md` (High)
- `dev-implement-implementation-leader.agent.md` (High)
- `dev-implement-planning-leader.agent.md` (High)
- `dev-fix-fix-leader.agent.md` (High)

**Workers**:
- `dev-implement-backend-coder.agent.md` (Medium)
- `dev-implement-frontend-coder.agent.md` (Medium)
- `dev-implement-playwright.agent.md` (Medium)
- `dev-implement-planner.agent.md` (Medium)
- `dev-implement-proof-writer.agent.md` (Medium)
- `dev-implement-plan-validator.agent.md` (Low)
- `dev-implement-contracts.agent.md` (Low)
- `dev-implement-verifier.agent.md` (Low)
- `dev-implement-learnings.agent.md` (Low)
- `commitment-gate-agent.agent.md` (Low)
- `knowledge-context-loader.agent.md` (Medium — shared with PM)

**Estimated effort**: 8 points (highest risk, most files, critical path)

---

### Batch 3: Elab Workflow (WINT-7050)

**Purpose**: Migrate the elab-story and elab-epic command chains to DB-first.

**Commands**:
- `.claude/commands/elab-story.md`
- `.claude/commands/elab-epic.md`

**Leaders**:
- `elab-setup-leader.agent.md` (High)
- `elab-completion-leader.agent.md` (High)
- `elab-epic-setup-leader.agent.md` (Medium)
- `elab-epic-interactive-leader.agent.md` (Medium)
- `elab-epic-aggregation-leader.agent.md` (Medium)
- `elab-epic-reviews-leader.agent.md` (Medium)
- `elab-epic-updates-leader.agent.md` (Low)

**Workers**:
- `elab-analyst.agent.md` (Medium)
- `elab-autonomous-decider.agent.md` (Low)
- `elab-delta-review-agent.agent.md` (Low)
- `elab-escape-hatch-agent.agent.md` (Low)
- `elab-phase-contract-agent.agent.md` (Low)

**Epic-specific workers (read-only, low risk)**:
- `elab-epic-engineering.agent.md` (Low)
- `elab-epic-platform.agent.md` (Low)
- `elab-epic-product.agent.md` (Low)
- `elab-epic-qa.agent.md` (Low)
- `elab-epic-security.agent.md` (Low)
- `elab-epic-ux.agent.md` (Low)

**Estimated effort**: 5 points

---

### Batch 4: QA & UAT Workflow (WINT-7060)

**Purpose**: Migrate the qa-verify-story command chain to DB-first.

**Commands**:
- `.claude/commands/qa-verify-story.md`

**Leaders**:
- `qa-verify-setup-leader.agent.md` (High)
- `qa-verify-completion-leader.agent.md` (High)
- `qa-verify-verification-leader.agent.md` (High)
- `uat-orchestrator.agent.md` (Medium)

**Workers**:
- `uat-precondition-check.agent.md` (Low)
- `architect-story-review.agent.md` (Medium — shared with elab)

**Estimated effort**: 5 points (quality gate integrity is critical)

**Note**: Must run after Batch 2 because QA workflow tests against dev workflow output.

---

### Batch 5: PM & Planning (WINT-7070)

**Purpose**: Migrate pm-story, pm-fix-story, pm-bootstrap, and pm-harness command chains.

**Commands**:
- `.claude/commands/pm-story.md`
- `.claude/commands/pm-fix-story.md`
- `.claude/commands/pm-bootstrap-workflow.md`
- `.claude/commands/pm-generate-story-000-harness.md`
- `.claude/commands/pm-refine-story.md`

**Leaders**:
- `pm.agent.md` (High — top-level orchestrator)
- `pm-story-generation-leader.agent.md` (High — spawns 14 workers)
- `pm-story-adhoc-leader.agent.md` (Medium)
- `pm-story-followup-leader.agent.md` (Medium)
- `pm-story-split-leader.agent.md` (Medium)
- `pm-story-bug-leader.agent.md` (Medium)
- `pm-story-fix-leader.agent.md` (Medium)
- `pm-triage-leader.agent.md` (Medium)
- `pm-bootstrap-analysis-leader.agent.md` (Medium)
- `pm-bootstrap-generation-leader.agent.md` (Medium)
- `pm-bootstrap-setup-leader.agent.md` (Low)
- `pm-harness-generation-leader.agent.md` (Low)
- `pm-harness-setup-leader.agent.md` (Low)

**Workers**:
- `pm-story-seed-agent.agent.md` (Medium — spawned by 4 leaders)
- `pm-dev-feasibility-review.agent.md` (Low)
- `pm-draft-test-plan.agent.md` (Low)
- `pm-uiux-recommendations.agent.md` (Low)
- `pm-story-risk-predictor.agent.md` (Low)
- `gap-analytics-agent.agent.md` (Low)
- `gap-hygiene-agent.agent.md` (Low)
- `readiness-score-agent.agent.md` (Low)
- `story-attack-agent.agent.md` (Low)
- `story-fanout-pm.agent.md` (Low)
- `story-fanout-qa.agent.md` (Low)
- `story-fanout-ux.agent.md` (Low)
- `story-synthesize-agent.agent.md` (Low)

**Estimated effort**: 5 points

---

### Batch 6: Review & Architecture (WINT-7080)

**Purpose**: Migrate dev-code-review, architect-review command chains, and audit agents.

**Commands**:
- `.claude/commands/dev-code-review.md`
- `.claude/commands/architect-review.md`
- `.claude/commands/code-audit.md`

**Leaders**:
- `review-aggregate-leader.agent.md` (Medium)
- `audit-aggregate-leader.agent.md` (Medium)
- `audit-debt-map-leader.agent.md` (Low)
- `audit-promote-leader.agent.md` (Low)
- `audit-trends-leader.agent.md` (Low)
- `audit-setup-leader.agent.md` (Low)

**Code Review Workers (dynamically spawned)**:
- `code-review-accessibility.agent.md` (Low)
- `code-review-build.agent.md` (Low)
- `code-review-lint.agent.md` (Low)
- `code-review-react.agent.md` (Low)
- `code-review-reusability.agent.md` (Low)
- `code-review-security.agent.md` (Low)
- `code-review-style-compliance.agent.md` (Low)
- `code-review-syntax.agent.md` (Low)
- `code-review-typecheck.agent.md` (Low)
- `code-review-typescript.agent.md` (Low)

**Audit Workers (dynamically spawned)**:
- `audit-accessibility.agent.md` (Low)
- `audit-code-quality.agent.md` (Low)
- `audit-devils-advocate.agent.md` (Low)
- `audit-duplication.agent.md` (Low)
- `audit-moderator.agent.md` (Low)
- `audit-performance.agent.md` (Low)
- `audit-react.agent.md` (Low)
- `audit-security.agent.md` (Low)
- `audit-test-coverage.agent.md` (Low)
- `audit-typescript.agent.md` (Low)
- `audit-ui-ux.agent.md` (Low)

**Architect Workers**:
- `architect-api-leader.agent.md` (Low)
- `architect-frontend-leader.agent.md` (Low)
- `architect-packages-leader.agent.md` (Low)
- `architect-types-leader.agent.md` (Low)
- `architect-aggregation-leader.agent.md` (Low)
- `architect-setup-leader.agent.md` (Low)
- All architect-*-worker agents (12 workers, all Low)

**Estimated effort**: 5 points (many files but all low risk — leaf workers)

---

### Batch 7: Utility, Metrics & Orphan Cleanup (WINT-7090)

**Purpose**: Migrate remaining utility agents, metrics agents, and handle orphan deprecation.

**Commands**:
- `.claude/commands/scrum-master.md`
- `.claude/commands/ui-ux-review.md`

**Leaders**:
- `scrum-master-loop-leader.agent.md` (Medium)
- `scrum-master-setup-leader.agent.md` (Medium)
- `ui-ux-review-setup-leader.agent.md` (Low)
- `ui-ux-review-report-leader.agent.md` (Low)

**Workers**:
- `ui-ux-review-reviewer.agent.md` (Low)
- `reality-intake-collector.agent.md` (Low)
- `reality-intake-setup.agent.md` (Low)
- `doc-sync.agent.md` (Low)
- `kb-writer.agent.md` (Low)
- `kb-compressor.agent.md` (Low)
- `confidence-calibrator.agent.md` (Low)
- `workflow-retro.agent.md` (Low)

**Metrics Workers (all Low)**:
- `ttdc-metrics-agent.agent.md`
- `churn-index-metrics-agent.agent.md`
- `leakage-metrics-agent.agent.md`
- `pcar-metrics-agent.agent.md`
- `turn-count-metrics-agent.agent.md`

**Deprecation Actions**:
- Archive: `experiment-analyzer.agent.md` → `_archive/`
- Archive: `heuristic-evolver.agent.md` → `_archive/`
- Archive: `improvement-proposer.agent.md` → `_archive/`
- Archive: `pattern-miner.agent.md` → `_archive/`
- Archive: `quick-security.agent.md` → `_archive/`
- Archive: `quick-test.agent.md` → `_archive/`

**Estimated effort**: 3 points

---

## 6. Per-Batch Verification Criteria

### Batch 1 (WINT-7030): Story Management Verification

- [ ] Run `/story-status wint WINT-1060` — DB returns correct status, `source: db`
- [ ] Run `/story-update wint WINT-TEST in-progress` — DB write succeeds
- [ ] Run `/story-move wint WINT-TEST ready-for-qa` — DB + directory both updated
- [ ] Verify shim diagnostics show `source: db` for all operations
- [ ] Confirm `story-status.md`, `story-update.md`, `story-move.md` have no `plans/stories/` legacy paths

### Batch 2 (WINT-7040): Dev Workflow Verification

- [ ] Run `/dev-implement-story {test_feature} {test_story}` through Phase 0 (setup) — CHECKPOINT.yaml created via shim
- [ ] Verify dev-setup-leader reads story from DB, not directory scan
- [ ] Verify dev-execute-leader writes EVIDENCE.yaml to correct path
- [ ] Verify dev-proof-leader reads EVIDENCE.yaml from correct path
- [ ] Verify dev-fix-fix-leader reads REVIEW.yaml from correct path
- [ ] Spawn chain smoke-test: dev-implement-story → dev-setup-leader → knowledge-context-loader → completes
- [ ] Spawn chain smoke-test: dev-execute-leader → dev-implement-backend-coder → completes
- [ ] Confirm no agent files contain hardcoded `ready-to-work/`, `in-progress/`, `needs-code-review/` directory paths (use shim calls instead)
- [ ] DB state check: story status transitions recorded in `stories` table

### Batch 3 (WINT-7050): Elab Workflow Verification

- [ ] Run `/elab-story {test_feature} {test_story}` through setup phase — story read from DB
- [ ] Verify elab-setup-leader reads story from DB, not `backlog/` directory scan
- [ ] Verify elab-completion-leader moves story via `shimMoveStory`
- [ ] Spawn chain smoke-test: elab-story → elab-setup-leader → elab-analyst → completes
- [ ] Verify elab-epic commands read feature directory from DB metadata
- [ ] Confirm no elab agent files contain hardcoded swim-lane paths

### Batch 4 (WINT-7060): QA Workflow Verification

- [ ] Run `/qa-verify-story {test_feature} {test_story}` through setup — story read from DB
- [ ] Verify qa-verify-setup-leader reads from DB, not `ready-for-qa/` scan
- [ ] Verify qa-verify-completion-leader moves story via `shimMoveStory` (to UAT or failed-qa)
- [ ] Spawn chain smoke-test: qa-verify-story → qa-verify-setup-leader → qa-verify-verification-leader → completes
- [ ] Verify UAT orchestrator reads story state from DB
- [ ] DB state check: QA verdicts recorded in stories table

### Batch 5 (WINT-7070): PM Workflow Verification

- [ ] Run `/pm-story generate {test_feature}` — story created in DB + backlog directory
- [ ] Verify pm-story-generation-leader writes story to DB via shim
- [ ] Verify pm-story-seed-agent reads/writes story context from DB
- [ ] Spawn chain smoke-test: pm-story → pm.agent → pm-story-generation-leader → pm-story-seed-agent → completes
- [ ] Run `/pm-bootstrap-workflow {test_feature}` — feature directory created, DB metadata set
- [ ] Confirm no PM agent files contain hardcoded `backlog/`, `elaboration/` paths

### Batch 6 (WINT-7080): Review & Architecture Verification

- [ ] Run `/dev-code-review {test_feature} {test_story}` — review-aggregate-leader reads artifacts from DB-resolved path
- [ ] Verify 10 code-review workers can access story context
- [ ] Run `/architect-review` — architect leaders read codebase (no swim-lane dependency expected, but confirm)
- [ ] Run `/code-audit scan {scope}` — audit workers execute against story context
- [ ] Confirm no review/audit agent files contain hardcoded swim-lane paths

### Batch 7 (WINT-7090): Utility & Cleanup Verification

- [ ] Run `/scrum-master {test_feature} {test_story}` — scrum-master reads story state from DB
- [ ] Run `/ui-ux-review {test_feature} {test_story}` — reads story from DB path
- [ ] Verify metrics agents receive story context from parent leaders (not direct directory reads)
- [ ] Verify doc-sync, kb-writer, kb-compressor have no swim-lane dependencies
- [ ] Confirm 6 deprecated agents moved to `_archive/`
- [ ] Run verification grep: `grep -r "ready-to-work\|in-progress\|needs-code-review\|ready-for-qa\|failed-qa" .claude/agents/ --include="*.md" | grep -v _archive | grep -v _reference`
  - Expected: zero matches (all swim-lane refs replaced with shim calls)

---

## 7. Rollback Procedure

### 7.1 Rollback Architecture

The compatibility shim at `packages/backend/mcp-tools/src/story-compatibility/` provides automatic rollback via its dual-mode behavior:

```
DB write succeeds → Use DB result (source: db)
DB write fails    → Fall back to directory operations (source: directory)
DB unavailable    → Fall back to directory operations (source: directory)
```

### 7.2 Rollback for Any Batch

**If a migrated agent fails after batch deployment:**

1. **Immediate (automatic)**: The shim falls back to directory operations. Check shim diagnostics:
   ```
   # Look for source: directory in agent output
   # This indicates fallback is engaged
   ```

2. **Verify fallback is working**:
   ```bash
   # Run the affected command — shim will log source field
   /story-status {feature} {story}
   # Output should show source: directory (fallback active)
   ```

3. **Revert agent files** (if needed):
   ```bash
   # Git revert the specific batch commit
   git revert <batch-commit-hash>
   ```

4. **Investigate root cause**:
   - Check DB connectivity
   - Verify shim function signatures haven't changed
   - Check agent is calling correct shim function
   - Review agent migration diff for missed path translations

### 7.3 Rollback Verification Checklist

- [ ] Affected command still functions (via directory fallback)
- [ ] No data loss (shim dual-write ensures DB and directory stay in sync)
- [ ] Other batches unaffected (batches are independent after deployment)
- [ ] Shim diagnostics confirm `source: directory` during fallback

### 7.4 When NOT to Rollback

- If the issue is a transient DB error → wait and retry (shim auto-recovers)
- If the issue is in a single worker agent → fix the agent, don't rollback the batch
- If the issue is in shared resource → fix the shared resource, re-test batch

---

## 8. Shared Resources Migration Notes

The 17 shared modules in `_shared/` are referenced by agents via `Read` instructions. These modules do NOT contain swim-lane directory references and do NOT need migration. However:

- `story-context.md` may need updating if it references directory-based story loading patterns
- `kb-integration.md` may need updating if it references directory-based artifact paths
- All other shared modules are workflow-pattern documentation (no path references)

**Recommendation**: Review `story-context.md` and `kb-integration.md` during Batch 2 (first migration batch with actual changes).

---

## 9. Summary

| Metric | Value |
|--------|-------|
| Total agents in catalog | 141 |
| Agents excluded (already migrated) | 3 commands |
| Agents in migration scope | ~100 (commands + leaders + workers) |
| Agents to deprecate | 6 |
| Agents to archive (reference-only) | 2 |
| Migration batches | 7 |
| Total estimated points | 34 |
| Corresponding stories | WINT-7030 through WINT-7090 |
