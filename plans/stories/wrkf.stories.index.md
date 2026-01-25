# wrkf Stories Index — LangGraph Orchestrator

All stories in this epic use the `wrkf-XXXX` naming convention starting at 1000 and incrementing by 10.

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 4 |
| generated | 4 |
| ready-for-code-review | 0 |
| pending | 10 |
| superseded | 1 |

---

## Ready to Start

Stories with all dependencies satisfied (can be worked in parallel):

| Story | Feature | Status |
|-------|---------|--------|
| wrkf-1022-A | Core Middleware Infrastructure | generated |
| wrkf-1030 | bootstrap_graph Subgraph | generated |
| wrkf-1040 | pm_generate_graph Subgraph | pending |
| wrkf-1050 | elab_graph Subgraph | pending |
| wrkf-1090 | uiux_review_graph Subgraph | pending |
| wrkf-1110 | OpenCode Adapter | pending |
| wrkf-1120 | MCP Read Tools | pending |

---

## Waiting On

### Waiting on wrkf-1022-A
| Story | Feature |
|-------|---------|
| wrkf-1022-B | Middleware Extensions & Utilities |

### Waiting on wrkf-1110
| Story | Feature |
|-------|---------|
| wrkf-1060 | dev_implement_graph Subgraph |

### Waiting on wrkf-1120
| Story | Feature |
|-------|---------|
| wrkf-1130 | MCP Write Tools (Gated) |

### Waiting on wrkf-1060
| Story | Feature |
|-------|---------|
| wrkf-1140 | Evidence Bundle |

### Waiting on wrkf-1140
| Story | Feature |
|-------|---------|
| wrkf-1070 | code_review_graph Subgraph |
| wrkf-1080 | elaboration Subgraph |
| wrkf-1100 | qa_gate_graph Subgraph |

---

## wrkf-1000: Package Scaffolding
**Status:** completed
**Depends On:** none
**Feature:** Create `packages/orchestrator` workspace package

**Infrastructure:**
- TypeScript package with proper tsconfig
- Workspace integration (pnpm, turborepo)
- LangGraphJS dependency
- Zod for schema validation

**Goal:** Establish the orchestrator package foundation with proper monorepo integration

**Risk Notes:** Minimal risk - standard package scaffolding

---

## wrkf-1010: GraphState Schema
**Status:** completed
**Depends On:** none
**Feature:** Define typed GraphState with Zod

**Infrastructure:**
- Zod schemas for all state fields
- Type inference for TypeScript
- State validation utilities

**State Fields:**
- `epicPrefix` - Story prefix identifier
- `storyId` - Current story being processed
- `artifactPaths` - Map of artifact file locations
- `routingFlags` - Control flow decisions
- `evidenceRefs` - References to evidence bundle
- `gateDecisions` - QA gate pass/fail decisions

**Goal:** Create a fully-typed, validated graph state that all nodes can consume

**Risk Notes:** Schema design is critical - affects all downstream nodes

---

## wrkf-1020: Node Runner Infrastructure
**Status:** completed
**Depends On:** none
**Feature:** Base node execution infrastructure

**Infrastructure:**
- Node factory pattern
- Error handling and retry logic
- Logging integration (@repo/logger)
- State mutation helpers

**Goal:** Provide reusable infrastructure for all graph nodes

**Risk Notes:** Must be flexible enough for diverse node types (LLM, tool, routing)

---

## wrkf-1030: bootstrap_graph Subgraph
**Status:** generated
**Depends On:** none
**Feature:** Subgraph for `/pm-bootstrap-workflow` command

**Nodes:**
- Plan analyzer node
- Story splitter node
- Index generator node
- Meta/exec plan generator node

**Goal:** Convert raw plans into structured story artifacts

**Risk Notes:** First subgraph - establishes patterns for others

---

## wrkf-1040: pm_generate_graph Subgraph
**Status:** pending
**Depends On:** none
**Feature:** Subgraph for `/pm-generate-story` command

**Nodes:**
- Story template loader
- Context gatherer node
- Story writer node (Claude)
- Validation node

**Goal:** Generate individual story documents from index entries

**Risk Notes:** LLM node integration patterns established here

---

## wrkf-1050: elab_graph Subgraph
**Status:** pending
**Depends On:** none
**Feature:** Subgraph for `/elab-story` command

**Nodes:**
- Story reader node
- Codebase explorer node
- Elaboration writer node (Claude)
- Acceptance criteria validator

**Goal:** Produce detailed elaboration documents with implementation guidance

**Risk Notes:** Requires codebase exploration - MCP read tools integration

---

## wrkf-1060: dev_implement_graph Subgraph
**Status:** pending
**Depends On:** wrkf-1110
**Feature:** Subgraph for `/dev-implement-story` command

**Nodes:**
- Elaboration reader node
- Planning node (Claude)
- Coder node (OpenCode)
- Proof writer node
- Evidence collector node

**Goal:** Execute implementation with diff-based edits and evidence capture

**Risk Notes:** Most complex subgraph - OpenCode integration critical

---

## wrkf-1070: code_review_graph Subgraph
**Status:** pending
**Depends On:** wrkf-1140
**Feature:** Subgraph for `/dev-code-review` command

**Nodes:**
- Evidence reader node
- Diff analyzer node
- Review criteria checker (Claude)
- Findings writer node

**Goal:** Review implementation against standards using evidence bundle

**Risk Notes:** Consumes EVIDENCE.md - must handle missing/incomplete evidence

---

## wrkf-1080: elaboration Subgraph
**Status:** pending
**Depends On:** wrkf-1140
**Feature:** Subgraph for `/elab-story` command

**Nodes:**
- Evidence reader node
- Test runner node
- Verification checker (Claude)
- QA report writer node

**Goal:** Verify implementation meets acceptance criteria

**Risk Notes:** Consumes EVIDENCE.md - must coordinate with test infrastructure

---

## wrkf-1090: uiux_review_graph Subgraph
**Status:** pending
**Depends On:** none
**Feature:** Subgraph for `/ui-ux-review` command

**Nodes:**
- Component scanner node
- Screenshot analyzer node (if available)
- UX criteria checker (Claude)
- Review writer node

**Goal:** Review UI/UX implementation against design standards

**Risk Notes:** May require visual analysis capabilities

---

## wrkf-1100: qa_gate_graph Subgraph
**Status:** pending
**Depends On:** wrkf-1140
**Feature:** Subgraph for `/qa-gate` command

**Nodes:**
- Evidence aggregator node
- Review collector node
- Gate decision node (Claude)
- Gate file writer node

**Goal:** Produce final QA gate decision (PASS/CONCERNS/FAIL/WAIVED)

**Risk Notes:** Terminal subgraph - must have complete evidence

---

## wrkf-1110: OpenCode Adapter
**Status:** pending
**Depends On:** none
**Feature:** Adapter for coder nodes with OpenCode integration

**Infrastructure:**
- Scoped context injection
- Diff-based edit protocol
- Patch summary extraction
- Expected verification output

**Goal:** Enable coder nodes to operate via OpenCode with controlled context

**Risk Notes:** OpenCode API stability, diff parsing accuracy

---

## wrkf-1120: MCP Read Tools
**Status:** pending
**Depends On:** none
**Feature:** MCP read tools integration

**Tools:**
- `repo` - Repository metadata
- `files` - File read operations
- `git` - Git status/log/diff
- `ci` - CI status checks

**Goal:** Provide read-only access to codebase and infrastructure state

**Risk Notes:** MCP tool registration, permission boundaries

---

## wrkf-1130: MCP Write Tools (Gated)
**Status:** pending
**Depends On:** wrkf-1120
**Feature:** Gated MCP write tools with publisher-only access

**Tools:**
- File write operations (gated)
- Git commit operations (gated)
- Artifact publishing (gated)

**Policy:**
- Publisher-only access control
- Audit logging
- Rollback capability

**Goal:** Enable controlled write operations with proper authorization

**Risk Notes:** Security critical - must enforce gating policy strictly

---

## wrkf-1140: Evidence Bundle
**Status:** pending
**Depends On:** wrkf-1060
**Feature:** EVIDENCE.md generation and consumption

**Infrastructure:**
- Evidence schema definition
- Bundle generator (during dev_implement)
- Bundle reader (for review/verify/gate)
- Evidence validation

**Consumers:**
- code_review_graph
- qa_verify_graph
- qa_gate_graph

**Goal:** Create reusable evidence bundle for downstream verification stages

**Risk Notes:** Must capture sufficient detail for all consumers

---

## wrkf-1021: Node Execution Metrics
**Status:** completed
**Depends On:** none
**Follow-up From:** wrkf-1020
**Feature:** Structured metrics capture for node execution

**Infrastructure:**
- NodeMetricsCollector class
- Per-node metrics (success/failure counts, durations)
- Duration percentiles (p50, p90, p99)
- Optional integration with node factory

**Goal:** Enable observability of node execution patterns

**Risk Notes:** Follow-up from wrkf-1020 QA Elaboration

---

## wrkf-1022: Node Middleware Hooks (SUPERSEDED)
**Status:** superseded
**Depends On:** none
**Follow-up From:** wrkf-1020
**Feature:** Extensible middleware pattern for node lifecycle

**Superseded By:** wrkf-1022-A, wrkf-1022-B (split required due to size)

**Infrastructure:**
- NodeMiddleware type with beforeNode, afterNode, onError hooks
- Middleware composition utilities
- Optional integration with node factory

**Goal:** Enable custom behavior injection at node execution lifecycle points

**Risk Notes:** Follow-up from wrkf-1020 QA Elaboration

---

## wrkf-1022-A: Core Middleware Infrastructure
**Status:** generated
**Depends On:** none
**Split From:** wrkf-1022
**Feature:** Foundational middleware types, hooks, composition, and node factory integration

**Infrastructure:**
- NodeMiddleware Zod schema/type with beforeNode, afterNode, onError, shouldRun hooks
- MiddlewareContext for cross-hook data sharing
- composeMiddleware() composition utility
- Middleware executor with ordering (beforeNode first→last, afterNode last→first)
- Integration with createNode() factory
- State protection via deep cloning
- Async shouldRun support

**Goal:** Provide the core middleware infrastructure enabling custom behavior injection at node execution lifecycle points

**Risk Notes:** Depends on wrkf-1020 for NodeConfigSchema and node factory

---

## wrkf-1022-B: Middleware Extensions & Utilities
**Status:** generated
**Depends On:** wrkf-1022-A
**Split From:** wrkf-1022
**Feature:** Built-in middleware, convenience utilities, and testing helpers

**Infrastructure:**
- Built-in loggingMiddleware and validationMiddleware
- filterMiddleware utility for removing middleware
- Middleware naming (unique/auto-generated)
- skipClone configuration option for performance
- Pattern factories (forNodes, whenFlag)
- Testing utilities (createMockMiddleware)

**Goal:** Provide production-ready built-in middleware and developer utilities for middleware authoring

**Risk Notes:** Depends on wrkf-1022-A for core infrastructure
