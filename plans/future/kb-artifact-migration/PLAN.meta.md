---
doc_type: plan_meta
title: "KBAR — Meta Plan"
status: active
story_prefix: "KBAR"
created_at: "2026-02-05T06:30:00Z"
updated_at: "2026-02-05T06:30:00Z"
tags:
  - database
  - mcp
  - agents
  - knowledge-base
---

# KBAR — Meta Plan

## Overview

This meta plan governs the **KB Story & Artifact Migration** (KBAR) epic. The goal is to implement a hybrid storage architecture where files remain human-editable, the database enables fast status/dependency queries, and the knowledge base provides semantic search.

## Story Prefix

All stories in this project use the **KBAR** prefix.
- Story IDs: `KBAR-001`, `KBAR-002`, etc.
- Story folders: `plans/stories/KBAR-XXX/`
- Artifact files: `ELAB-KBAR-XXX.md`, `PROOF-KBAR-XXX.md`, etc.

## Documentation Structure

```
plans/
├── KBAR.stories.index.md          # Master index (regenerated from DB)
├── PLAN.meta.md                   # This file (meta plan and principles)
├── PLAN.exec.md                   # Execution rules and artifact naming
├── roadmap.md                      # Dependencies and completion order
└── stories/
    ├── KBAR-001/
    │   ├── story.yaml
    │   ├── ELAB-KBAR-001.md
    │   ├── PROOF-KBAR-001.md
    │   └── _implementation/
    │       ├── CHECKPOINT.md
    │       ├── BACKEND-LOG.md
    │       └── ...
    ├── KBAR-002/
    │   └── (same structure)
    └── ...
```

## Naming Rule

All docs MUST include a timestamp in the filename where applicable:
- Format: `YYYYMMDD-HHMM` (America/Denver)
- Examples: `CHECKPOINT-20260205-0630.md`, `BACKEND-LOG-20260205-0830.md`

## Principles

### Story Atomicity
- Story folders are atomic and self-contained
- Each story produces a minimal set of artifacts
- No cross-story coupling except via dependencies

### Automation-First Documentation
- Documentation structure must be automation-friendly
- DB-driven index generation replaces manual updates
- All artifacts follow YAML frontmatter conventions

### Stories as Units of Intent
- Each story represents a single unit of intent, validation, and evidence
- Stories map to phases: Database → Sync → MCP Tools → Agent Updates → Index → Lessons
- Story completion triggers automatic lesson extraction

### Reuse First (Non-Negotiable)
- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package
- Shared sync utilities go in `packages/backend/knowledge-base`
- Shared MCP handlers go in `apps/api/knowledge-base/src/mcp-server`

### Package Boundary Rules
- Core knowledge-base logic in `apps/api/knowledge-base`
- Sync utilities in `packages/backend/knowledge-base` (if extracted)
- Agent updates in `.claude/agents`
- Command updates in `.claude/commands`

### Import Policy
- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries
- MCP tools always use the centralized `tool-handlers.ts` approach

## Phases at a Glance

| Phase | Name | Stories | Goal |
|-------|------|---------|------|
| 1 | Database Schema | KBAR-001 to KBAR-002 | Schema foundation |
| 2 | Sync Infrastructure | KBAR-003 to KBAR-006 | File-to-DB sync |
| 3 | MCP Tools - Stories | KBAR-007 to KBAR-010 | Story query/update tools |
| 4 | MCP Tools - Artifacts | KBAR-011 to KBAR-015 | Artifact read/write/search |
| 5 | Agent Updates | KBAR-016 to KBAR-022 | Migrate agents to MCP |
| 6 | Index Generation | KBAR-023 to KBAR-024 | DB-driven index |
| 7 | Lesson Extraction | KBAR-025 to KBAR-027 | Auto-extract learnings |

## Risk Overview

| Risk Level | Count | Key Stories |
|------------|-------|-------------|
| High | 2 | KBAR-001/002 (schema), KBAR-016-021 (agent updates) |
| Medium | 5 | KBAR-003-005 (sync drift), KBAR-011/015 (KB failures) |
| Low | 1 | KBAR-025-027 (lesson extraction) |

---

## Agent Log

Append-only. Records all bootstrap and evolution activities.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-05T06:30:00Z | pm-bootstrap-generation-leader | Initial generation | stories.index.md, PLAN.meta.md, PLAN.exec.md, roadmap.md |
