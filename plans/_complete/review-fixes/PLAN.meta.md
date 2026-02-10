---
doc_type: plan_meta
title: REVI — Meta Plan
status: active
story_prefix: REVI
created_at: 2026-02-01T00:00:00Z
updated_at: 2026-02-01T00:00:00Z
tags:
  - workflow-hardening
  - claude-workflow
  - langgraph-orchestrator
---

# REVI — Meta Plan

## Story Prefix

All stories in this project use the **REVI** prefix.
- Story IDs: `REVI-001`, `REVI-002`, etc.
- Story folders: `plans/stories/REVI-XXX/`
- Artifact files: `ELAB-REVI-XXX.md`, `PROOF-REVI-XXX.md`, etc.

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/REVI-XXX/` contains all per-story artifacts
- `plans/future/review-fixes/` contains bootstrap, roadmap, and meta/exec plans

## Naming Rule

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

Example: `ELAB-REVI-001-20260201-0800.md`

## Principles

- Story folders are atomic and self-contained
- Documentation structure must be automation-friendly
- Stories represent units of intent, validation, and evidence

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package
- This epic focuses on hardening two systems: Claude workflow markdown and LangGraph TypeScript orchestrator

### Package Boundary Rules

- Core workflow logic in `packages/backend/orchestrator/`
- Scripts in `scripts/` directory at root
- Documentation in `docs/` directory at root
- Claude config in `.claude/` directory at root

### Import Policy

- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries
- All error schemas centralized in orchestrator
- All state machine schemas centralized in orchestrator

## System Scope

This epic hardens two interconnected systems:

### System 1: Claude Workflow (Markdown-based)

**Files:**
- `docs/FULL_WORKFLOW.md` - Master documentation
- `.claude/commands/*.md` - Command orchestrators
- `.claude/agents/*.agent.md` - Phase leaders and workers

**Responsibility:** Define contracts, semantics, and operational procedures

### System 2: LangGraph Orchestrator (TypeScript-based)

**Files:**
- `packages/backend/orchestrator/src/` - TypeScript implementation
  - `errors/` - Error schema definitions
  - `state/` - State machine implementations
  - `utils/` - Utility schemas and validators
  - `observability/` - Tracing and metrics

**Responsibility:** Implement schemas, validators, and enforcement logic

## Synchronization Requirements

The critical requirement is that these two systems remain **synchronized**:

1. **Source of Truth:** TypeScript schemas in orchestrator are authoritative
2. **Documentation:** Claude workflow markdown reflects current schema behavior
3. **Automation:** Pre-commit hook and CI verify sync every commit
4. **Generation:** Scripts auto-generate markdown tables from Zod schemas

This epic's foundational story (REVI-001) establishes this synchronization infrastructure.

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-01T00:00:00Z | pm-bootstrap-generation-leader | Initial bootstrap generation | REVI.stories.index.md, REVI.plan.meta.md, REVI.plan.exec.md, REVI.roadmap.md, _bootstrap/SUMMARY.yaml |
