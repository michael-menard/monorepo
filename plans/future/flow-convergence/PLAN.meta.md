---
doc_type: plan_meta
title: "FLOW — Meta Plan"
status: active
story_prefix: "FLOW"
created_at: "2026-01-31T00:00:00Z"
updated_at: "2026-01-31T00:00:00Z"
tags:
  - workflow
  - langraph
  - metrics
  - convergence
---

# FLOW — Meta Plan

## Overview

Build a decision-centric engineering workflow that optimizes for shared understanding at commitment time through reality-aware story creation, explicit phase contracts, delta-only elaboration, and convergence-focused metrics.

**Project:** flow-convergence
**Prefix:** FLOW
**Total Stories:** 41

---

## Story Prefix

All stories in this project use the **FLOW** prefix.
- Story IDs: `FLOW-001`, `FLOW-002`, etc.
- Story folders: `plans/future/flow-convergence/backlog/FLOW-XXX/`, `plans/future/flow-convergence/elaboration/FLOW-XXX/`, etc.
- Artifact files: `ELAB-FLOW-XXX.md`, `PROOF-FLOW-XXX.md`, etc.

---

## Documentation Structure

- `plans/future/flow-convergence/` contains cross-cutting strategy and execution docs
- `plans/future/flow-convergence/backlog/FLOW-XXX/` contains all per-story artifacts (as stories progress)
- `plans/future/flow-convergence/elaboration/FLOW-XXX/`, `plans/future/flow-convergence/ready-to-work/FLOW-XXX/`, etc. contain stories in various stages

Story workflow stages:
- `backlog/` - Newly created stories
- `elaboration/` - Stories being elaborated
- `ready-to-work/` - Stories ready for implementation
- `in-progress/` - Stories being implemented
- `UAT/` - Stories in QA/verification

---

## Naming Rule

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)
- Example: `ELAB-FLOW-001-20260131-0000.md`

---

## Core Principles

### Core Principle (Non-Negotiable)

We do not optimize for fewer cycles. We optimize for fewer surprises *after commitment*. All metrics, gates, and reviews exist to enforce this boundary.

### Reuse First (Required)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package

### Package Boundary Rules

- Core logic in `packages/core/*`
- Backend utilities and orchestration in `packages/backend/*`
- Frontend components in `packages/core/app-component-library`

### Import Policy

- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries
- Use `@repo/` namespace for workspace packages

---

## Project Phases

| Phase | Name | Description | Stories |
|-------|------|-------------|---------|
| 1 | Foundation & Reality Intake | Reality baseline infrastructure and workflow boundary setup | FLOW-001-002, FLOW-021-022 |
| 2 | Story Creation Flow | Reality-aware story creation with gap analysis and readiness scoring | FLOW-003-008, FLOW-023-030, FLOW-042 |
| 3 | Elaboration & Convergence | Delta-only elaboration with phase contracts and commitment gates | FLOW-009-011, FLOW-031-034, FLOW-043 |
| 4 | Metrics & Instrumentation | Convergence-focused metrics collection and analysis | FLOW-012-017, FLOW-035-041, FLOW-044 |

---

## Two Implementation Tracks

### Track 1: Claude Code Workflow (FLOW-1000 series → FLOW-001 series)

Updates to `.claude/commands/` and `.claude/agents/` to implement:
- Reality Intake phase
- Phase contracts in elaboration
- Delta-only elaboration
- Convergence metrics tracking
- Commitment boundary gates

### Track 2: LangGraph Implementation (FLOW-2000 series → FLOW-021+ series)

Build graph nodes in `packages/backend/orchestrator/`:
- Reality Intake sub-graph
- Story creation nodes (story.seed, story.fanout.*, story.attack, story.synthesize)
- Elaboration nodes (delta-only)
- Metrics collection integration

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-31T00:00:00Z | pm-bootstrap-generation-leader | Phase 2: Generated all bootstrap artifacts | stories.index.md, PLAN.meta.md, PLAN.exec.md, roadmap.md |

---
