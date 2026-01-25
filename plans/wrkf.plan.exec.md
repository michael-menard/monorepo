---
doc_type: plan_exec
title: "wrkf — LangGraph Orchestrator Execution Plan"
status: active
story_prefix: "wrkf"
created_at: "2026-01-22T10:00:00-07:00"
updated_at: "2026-01-22T10:00:00-07:00"
tags:
  - langgraph
  - orchestrator
  - agent-swarm
  - typescript
---

# wrkf — LangGraph Orchestrator Execution Plan

## Story Prefix

All stories use the **wrkf** prefix (lowercase). Commands use the full prefixed ID:
- `/pm-generate-story wrkf-1000`
- `/elab-story wrkf-1000`
- `/dev-implement-story wrkf-1000`

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/wrkf-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

All artifacts use the story prefix (lowercase):

| Artifact | Filename |
|----------|----------|
| Story file | `wrkf-XXX.md` |
| Elaboration | `elab-wrkf-XXX.md` |
| Proof | `proof-wrkf-XXX.md` |
| Code Review | `code-review-wrkf-XXX.md` |
| QA Verify | `qa-verify-wrkf-XXX.md` |
| QA Gate | `qa-gate-wrkf-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

## Naming Rule (timestamps in filenames)

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Execution Phases

### Phase 1: Foundation (wrkf-1000 → wrkf-1020)

Sequential execution - each story depends on the previous:

1. **wrkf-1000: Package Scaffolding**
   - Create `packages/orchestrator`
   - Configure workspace, tsconfig, dependencies
   - Unblocks: wrkf-1010

2. **wrkf-1010: GraphState Schema**
   - Define Zod schemas for graph state
   - Implement state validation utilities
   - Unblocks: wrkf-1020

3. **wrkf-1020: Node Runner Infrastructure**
   - Build node factory and execution helpers
   - Implement error handling, logging
   - Unblocks: All subgraphs and adapters

### Phase 2: Adapters (wrkf-1110 → wrkf-1130)

Can run in parallel with early subgraphs:

4. **wrkf-1110: OpenCode Adapter**
   - Scoped context injection
   - Diff-based edit protocol
   - Unblocks: wrkf-1060

5. **wrkf-1120: MCP Read Tools**
   - repo, files, git, ci tools
   - Read-only access patterns
   - Unblocks: wrkf-1130

6. **wrkf-1130: MCP Write Tools**
   - Gated write operations
   - Publisher-only access control

### Phase 3: Subgraphs (wrkf-1030 → wrkf-1100)

Subgraphs can be developed in dependency order:

**Independent (after wrkf-1020):**
- wrkf-1030: bootstrap_graph
- wrkf-1040: pm_generate_graph
- wrkf-1050: elab_graph
- wrkf-1090: uiux_review_graph

**Depends on OpenCode (after wrkf-1110):**
- wrkf-1060: dev_implement_graph

**Depends on Evidence (after wrkf-1140):**
- wrkf-1070: code_review_graph
- wrkf-1080: qa_verify_graph
- wrkf-1100: qa_gate_graph

### Phase 4: Evidence System (wrkf-1140)

7. **wrkf-1140: Evidence Bundle**
   - EVIDENCE.md schema and generation
   - Bundle reader utilities
   - Unblocks: wrkf-1070, wrkf-1080, wrkf-1100

## Dependency Graph (Visual)

```
wrkf-1000 (scaffolding)
    │
    ▼
wrkf-1010 (graphstate)
    │
    ▼
wrkf-1020 (node runner)
    │
    ├──────────────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌─────────────────────────────────┐    ┌─────────────────────────┐
│ subgraphs (independent)         │    │ adapters                │
│ • wrkf-1030 bootstrap_graph     │    │ • wrkf-1110 opencode    │
│ • wrkf-1040 pm_generate_graph   │    │ • wrkf-1120 mcp read    │
│ • wrkf-1050 elab_graph          │    │     │                   │
│ • wrkf-1090 uiux_review_graph   │    │     ▼                   │
└─────────────────────────────────┘    │ • wrkf-1130 mcp write   │
                                       └─────────────────────────┘
                                                   │
                                                   ▼
                                       ┌─────────────────────────┐
                                       │ wrkf-1060               │
                                       │ dev_implement_graph     │
                                       └─────────────────────────┘
                                                   │
                                                   ▼
                                       ┌─────────────────────────┐
                                       │ wrkf-1140               │
                                       │ evidence bundle         │
                                       └─────────────────────────┘
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        ▼                          ▼                          ▼
            ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
            │ wrkf-1070           │    │ wrkf-1080           │    │ wrkf-1100           │
            │ code_review_graph   │    │ qa_verify_graph     │    │ qa_gate_graph       │
            └─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Artifact Rules (Project-Specific)

### Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

### Prohibited Patterns

- ❌ `console.log` - use `@repo/logger`
- ❌ TypeScript interfaces without Zod - use `z.infer<>`
- ❌ Barrel files (index.ts re-exports)
- ❌ Per-story one-off utilities - extend shared packages

### Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

## Recommended Execution Order

For maximum parallelism:

| Wave | Stories | Can Start After |
|------|---------|-----------------|
| 1 | wrkf-1000 | — |
| 2 | wrkf-1010 | Wave 1 |
| 3 | wrkf-1020 | Wave 2 |
| 4 | wrkf-1030, wrkf-1040, wrkf-1050, wrkf-1090, wrkf-1110, wrkf-1120 | Wave 3 |
| 5 | wrkf-1060, wrkf-1130 | Wave 4 |
| 6 | wrkf-1140 | wrkf-1060 |
| 7 | wrkf-1070, wrkf-1080, wrkf-1100 | Wave 6 |

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-22 10:00 | bootstrap | Initial execution plan | wrkf.plan.exec.md |
