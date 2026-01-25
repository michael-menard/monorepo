---
doc_type: plan_meta
title: "wrkf — LangGraph Orchestrator Meta Plan"
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

# wrkf — LangGraph Orchestrator Meta Plan

## Story Prefix

All stories in this project use the **wrkf** prefix (lowercase).
- Story IDs: `wrkf-1000`, `wrkf-1010`, etc.
- Story folders: `plans/stories/wrkf-XXX/`
- Artifact files: `elab-wrkf-XXX.md`, `proof-wrkf-XXX.md`, etc.

## Project Goal

Implement a TypeScript-based LangGraph orchestration runtime that executes the existing story-driven workflow using subgraphs, OpenCode/Claude adapters, and MCP tools.

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/wrkf-XXX/` contains all per-story artifacts
- `plans/stories/wrkf.stories.index.md` is the master story index

## Naming Rule (timestamps in filenames)

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles

### Story folders are atomic and self-contained
Each story folder contains all artifacts for that story:
- Story document
- Elaboration
- Proof
- Code review
- QA verification
- QA gate

### Documentation structure must be automation-friendly
- YAML front matter for metadata
- Consistent section headers
- Machine-parseable artifact references

### Stories represent units of intent, validation, and evidence
- Intent: What should be built
- Validation: How to verify it works
- Evidence: Proof that it was built correctly

## Principles (Project-Specific)

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package

### Package Boundary Rules

| Package | Purpose | Stories |
|---------|---------|---------|
| `packages/orchestrator` | LangGraph runtime, nodes, state | All wrkf stories |
| `packages/orchestrator/adapters` | OpenCode, MCP adapters | wrkf-1110, wrkf-1120, wrkf-1130 |
| `packages/orchestrator/graphs` | Subgraph definitions | wrkf-1030 through wrkf-1100 |

### Import Policy

- Shared code MUST be imported via workspace package names
- Use `@repo/orchestrator` for internal imports
- Use `@repo/logger` for logging (never console.log)

### LangGraphJS Conventions

- Use typed state with Zod schemas
- Nodes are pure functions: `(state) => state`
- Edges define control flow
- Subgraphs compose via state projection

### Zod-First Types (Required)

All types MUST be defined as Zod schemas with inferred types:

```typescript
import { z } from 'zod'

const GraphStateSchema = z.object({
  epicPrefix: z.string(),
  storyId: z.string(),
  // ...
})

type GraphState = z.infer<typeof GraphStateSchema>
```

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-22 10:00 | bootstrap | Initial plan creation | wrkf.stories.index.md, wrkf.plan.meta.md, wrkf.plan.exec.md |
