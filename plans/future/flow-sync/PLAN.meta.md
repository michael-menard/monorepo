---
doc_type: plan_meta
title: "FLOW — Meta Plan"
status: active
story_prefix: "FLOW"
created_at: "2026-02-01T14:30:00Z"
updated_at: "2026-02-01T14:30:00Z"
tags:
  - orchestrator
  - workflow-alignment
  - database-integration
---

# FLOW — Meta Plan

## Story Prefix

All stories in this project use the **FLOW** prefix.
- Story IDs: `FLOW-001`, `FLOW-002`, etc.
- Story folders: `plans/future/flow-sync/backlog/FLOW-XXX/` (initially)
- Artifact files: `ELAB-FLOW-XXX.md`, `PROOF-FLOW-XXX.md`, etc.

## Project Overview

**Goal:** Align LangGraph orchestrator with Claude workflow by implementing simplified state model, Knowledge Base integration, YAML artifact schemas, and PostgreSQL persistence.

**Scope:**
- 21 stories across 5 phases
- Foundation state model changes
- Database persistence layer
- Knowledge Base read/write integration
- Graph node wiring and testing

## Documentation Structure

- `plans/future/flow-sync/` contains the feature directory
- `plans/future/flow-sync/stories.index.md` - master story index
- `plans/future/flow-sync/PLAN.meta.md` - this file (principles and structure)
- `plans/future/flow-sync/PLAN.exec.md` - execution rules and naming conventions
- `plans/future/flow-sync/roadmap.md` - visual dependency graphs
- Story stage directories: `backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, `UAT/`

## Naming Rules

All artifacts must include a timestamp in metadata using ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`

Example:
- File: `stories.index.md`
- Frontmatter: `created_at: "2026-02-01T14:30:00Z"`

## Principles

### 1. Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package
- Update workspace exports after adding new shared code

### 2. Package Boundaries

Core logic organization:
- `packages/core/*` - Shared core utilities
- `packages/backend/*` - Backend utilities and orchestrator
- `packages/backend/orchestrator/src/` - Main LangGraph orchestrator

For this project:
- New Zod schemas go in `packages/backend/orchestrator/src/schemas/`
- Repository implementations in `packages/backend/orchestrator/src/repositories/`
- Graph nodes in `packages/backend/orchestrator/src/nodes/`
- Tests in `__tests__/` alongside implementation

### 3. Import Policy

- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries
- All exports go through `packages/backend/orchestrator/src/index.ts`

### 4. Schema Management

- **ALWAYS use Zod schemas** - never TypeScript interfaces
- Schemas are source of truth for types: `z.infer<typeof Schema>`
- Align all artifact schemas with Claude workflow YAML formats
- Schema changes require migration planning (especially for breaking changes)

### 5. State Model

- Story state is the single source of truth: one `state` field (enum)
- Remove redundant fields: `phase`, `stage`, `status`
- GraphState simplified: add `storyState` and `blockedBy` fields
- Database schema must support state transitions and state queries

### 6. Database-First

- PostgreSQL is primary persistent store
- All workflow artifacts stored in database tables
- Load/save nodes at graph phase boundaries
- Schema: `packages/api/knowledge-base/src/db/migrations/002_workflow_tables.sql`

### 7. Knowledge Base Integration

- KB read: Query domain-specific lessons and blockers (verify existing patterns)
- KB write: Persist learnings after story completion with deduplication
- Deduplication threshold: >0.85 similarity (tunable)
- KB service integration: `packages/backend/orchestrator/src/nodes/`

---

## Agent Log

Append-only. Records all generation and updates.

| Timestamp | Agent | Action | Outputs | Status |
|-----------|-------|--------|---------|--------|
| 2026-02-01T14:30:00Z | pm-bootstrap-generation-leader | Bootstrap Phase 2: Generate all artifacts | stories.index.md, PLAN.meta.md, PLAN.exec.md, roadmap.md, SUMMARY.yaml, 21 story.yaml files | GENERATION COMPLETE |
