---
doc_type: stories_index
title: "Platform — LangGraph Fast-Track Work Order"
status: active
story_prefix: PLATFORM
created_at: "2026-02-13T00:00:00Z"
updated_at: "2026-02-17T13:00:00Z"
reorganization: "LangGraph Fast-Track: Prioritizes stories that enable LangGraph workflow"
---

# Unified Future Stories Index — LangGraph Fast-Track

**STRATEGY:** Complete stories 1-97 in Claude Code to make LangGraph operational, then complete stories 98-237 FROM LangGraph.

237 stories across 11 epics. Reorganized to prioritize LangGraph critical path.

**Legend:** **S** = started · **Status** in bold after title · `←` depends on · `⚡` critical for LangGraph

---

## 🎯 Goal: Complete stories 1-97 in Claude Code → Stories 98-237 in LangGraph (59% efficiency gain!)

---

## Wave 1 — Foundation (15 stories)

All can start immediately. Ordered by downstream impact.

**Note:** INFR-0010 split into INFR-0110 (core workflow artifacts) and INFR-0120 (review/QA artifacts) on 2026-02-14.

| # | S | Story | Title | Blocks | Epic |
|---|---|-------|-------|--------|------|
| 1 | x | INFR-0110 | Core Workflow Artifact Schemas (Story, Checkpoint, Scope, Plan) **uat** | INFR-0120, INFR-0020 | INFR |
| 2 | x | INFR-0120 | Review/QA Artifact Schemas (Evidence, Review, QA-Verify) **uat** | INFR-0020 | INFR |
| 3 | x | INFR-0040 | Workflow Events Table + Ingestion **uat** | INFR-0050, TELE-0010 | INFR |
| 4 | x | MODL-0010 | Provider Adapters (OpenRouter/Ollama/Anthropic) **completed** | MODL-0020 | MODL |
| 5 | | WINT-0010 | Create Core Database Schemas (6 schemas) ⚡ | WINT-0020–0070, AUTO-0010/0020, INFR-0110 | WINT |
| 6 | x | LNGG-0010 | Story File Adapter — YAML Read/Write ⚡ **uat** | LNGG-0020, LNGG-0040, LNGG-0060, LNGG-0070 | LNGG |
| 7 | x | LNGG-0030 | Decision Callback System **completed** | LNGG-0070 | LNGG |
| 8 | x | LNGG-0050 | KB Writing Adapter **uat** | LNGG-0070 | LNGG |
| 9 | x | KBAR-0010 | Database Schema Migrations **uat** | KBAR-0020 | KBAR |
| 10 | x | AUDT-0010 | Audit Graph & Artifact Schema **uat** | AUDT-0020 | AUDT |
| 11 | | WINT-0150 | Create doc-sync Skill ⚡ | WINT-0160 | WINT |
| 12 | | WINT-0180 | Define Examples + Negative Examples Framework **created** | WINT-0190, 0200, 0210 | WINT |
| 13 | | WINT-0220 | Define Model-per-Task Strategy **created** | WINT-0230, 0240, 0250 | WINT |
| 14 | x | WINT-1020 | Flatten Story Directories **completed** | WINT-1030 | WINT |
| 15 | x | WINT-7010 | Audit Agent Directory References **uat** | WINT-7020 | WINT |
| G1 | | GATE-01 | **E2E: Validate Foundation** | ← all Wave 1 | GATE | **HARD GATE → blocks Wave 2** |

---

## Wave 2 — LangGraph Adapters & Schema (18 stories)

⚡ **CRITICAL:** LNGG adapters + schema alignment prioritized

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 15 | x | LNGG-0020 | Index Management Adapter ⚡ **uat** | ← LNGG-0010 ✓ | LNGG | **P0** |
| 16 | x | LNGG-0040 | Stage Movement Adapter ⚡ **uat** | ← LNGG-0010 ✓ | LNGG | **P0** |
| 17 | x | LNGG-0060 | Checkpoint Adapter ⚡ **in-qa** | ← LNGG-0010 ✓ | LNGG | **P0** |
| 18 | x | WINT-1080 | Reconcile WINT Schema with LangGraph ⚡ **uat** | ← WINT-0010 | WINT | **P0** |
| 19 | x | WINT-0020 | Create Story Management Tables ⚡ **uat** | ← WINT-0010 | WINT | **P0** |
| 20 | x | WINT-0070 | Create Workflow Tracking Tables ⚡ **uat** | ← WINT-0010 | WINT | **P0** |
| 21 | | WINT-0160 | Create doc-sync Agent ⚡ **ready-to-work** | ← WINT-0150 | WINT | **P0** |
| 22 | x | INFR-0020 | Artifact Writer/Reader Service **uat** | ← INFR-0110 ✓, INFR-0120 ✓ | INFR | P1 |
| 23 | x | KBAR-0020 | Schema Tests & Validation **completed** | ← KBAR-0010 | KBAR | P1 |
| 24 | x | MODL-0020 | Task Contracts & Model Selector **uat** | — | MODL | P1 |
| 24b | x | MODL-0050 | Add MiniMax Model Provider to LangGraph **uat** | — | MODL | P1 |
| 25 | | WINT-0200 | Create User Flows Schema **ready-to-work** | ← WINT-0180 | WINT | P2 |
| 26 | x | WINT-0030 | Create Context Cache Tables **UAT** | ← WINT-0010 | WINT | P2 |
| 27 | x | WINT-0060 | Create Graph Relational Tables **uat** | ← WINT-0010 | WINT | P2 |
| 28 | x | WINT-0230 | Create Unified Model Interface **uat** | ← WINT-0220 | WINT | P2 |
| 29 | x | INFR-0041 | Workflow Event SDK - Typed Schemas & Validation **uat** | ← INFR-0040 | INFR | P1 |
| 30 | x | INFR-0050 | Event SDK (Shared Telemetry Hooks) **completed** | ← none | INFR | P3 |
| 31 | x | WINT-0040 | Create Telemetry Tables **ready-to-work** | ← WINT-0010 | WINT | P3 |
| 32 | | ~~WINT-0050~~ | ~~Create ML Pipeline Tables~~ **DUPLICATE** (completed in WINT-0010 AC-005) | ← WINT-0010 | WINT | ~~P3~~ |
| 34 | x | INFR-0030 | MinIO/S3 Docker Setup + Client Adapter **uat** | ← INFR-0110 ✓, INFR-0120 ✓ | INFR | P3 |
| G2 | | GATE-02 | **E2E: Validate LNGG Adapters** | ← GATE-01, LNGG-0020/0040/0060 | GATE | **HARD GATE** |
| G3 | | GATE-03 | **E2E: Validate Schema & Services** | ← GATE-02, all schema stories | GATE | **HARD GATE** |
| G4 | | GATE-04 | **E2E: Validate Agents & Services** | ← GATE-03, WINT-0160, KBAR-0020 | GATE | **HARD GATE** |
| G5 | | GATE-05 | **E2E: Validate User Flows & Infra** | ← GATE-04, WINT-0200 | GATE | **HARD GATE** |

---

## Wave 3 — Shared TypeScript Types (14 stories)

⚡ **CRITICAL:** WINT-1100 enables WINT-9010 (foundation for all LangGraph nodes)

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 34 | x | LNGG-0070 | Integration Test Suite ⚡ **uat** | ← LNGG-0010 ✓, 0020, 0030 | LNGG | **P0** |
| 35 | x | WINT-1090 | Update LangGraph Repos for Unified Schema ⚡ **uat** | ← WINT-1080 | WINT | **P0** |
| 36 | x | WINT-1100 | Create Shared TypeScript Types ⚡ 🎯 **completed** | ← WINT-1080 | WINT | **P0** |
| 37 | x | WINT-0090 | Create Story Management MCP Tools ⚡ **uat** | ← WINT-0020 | WINT | **P0** |
| 38 | x | KBAR-0030 | Story Sync Functions **done** | ← KBAR-0020 | KBAR | P1 |
| 39 | x | WINT-1030 | Populate Story Status from Directories **uat** | ← WINT-1020, 0020 | WINT | P1 |
| 40 | x | WINT-0100 | Create Context Cache MCP Tools **uat** | none | WINT | P2 |
| 41 | x | WINT-0110 | Create Session Management MCP Tools **completed** | none | WINT | P2 |
| 42 | x | WINT-0130 | Create Graph Query MCP Tools **uat** | ← WINT-0060 | WINT | P2 |
| 43 | x | WINT-0080 | Seed Initial Workflow Data **uat** | ← WINT-0070, 0060 | WINT | P2 |
| 44 | | WINT-0170 | Add Doc-Sync Gate | ← WINT-0160 | WINT | P2 |
| 45 | | WINT-1130 | Track Worktree-to-Story Mapping in DB | ← WINT-0020 | WINT | P2 |
| 46 | | WINT-0210 | Populate Role Pack Templates | ← WINT-0180, 0190, 0200 | WINT | P3 |
| 47 | x | MODL-0030 | Quality Evaluator **uat** | ← MODL-0020 | MODL | P3 |
| G6 | | GATE-06 | **E2E: Validate LangGraph Types** | ← GATE-05, LNGG-0070, WINT-1100 | GATE | **HARD GATE** |
| G7 | | GATE-07 | **E2E: Validate MCP Tools** | ← GATE-06, all MCP tool stories | GATE | **HARD GATE** |

---

## Wave 4 — Pre-LangGraph Prep (10 stories)

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 48 | | WINT-1110 | Migrate Existing LangGraph Data ⚡ | ← WINT-1090 | WINT | **P0** |
| 49 | | WINT-1010 | Create Compatibility Shim Module ⚡ | ← WINT-0090 | WINT | **P0** |
| 50 | x | KBAR-0040 | Artifact Sync Functions **uat** | ← KBAR-0030 | KBAR | P1 |
| 51 | | WINT-1140 | Integrate Worktree into dev-implement-story | ← WINT-1130 | WINT | P1 |
| 52 | | WINT-1150 | Integrate Worktree Cleanup into Completion | ← WINT-1130 | WINT | P1 |
| 53 | | WINT-1070 | Deprecate stories.index.md | ← WINT-1030 | WINT | P2 |
| 54 | | WINT-1040 | Update story-status to Use DB | ← WINT-1010, 1030 | WINT | P2 |
| 55 | | WINT-1050 | Update story-update to Use DB | ← WINT-1010, 1030 | WINT | P2 |
| 56 | x | WINT-1060 | Update story-move to Use DB **uat** | ← WINT-1010, 1030 | WINT | P2 |
| 57 | | KBAR-0050 | CLI Sync Commands | ← KBAR-0040 | KBAR | P2 |
| G8 | | GATE-08 | **E2E: Validate Pre-LangGraph Prep** | ← GATE-07, all Wave 4 | GATE | **HARD GATE** |

---

## Wave 5 — Shared Business Logic (7 stories)

🎯 **MILESTONE:** Foundation for all LangGraph nodes

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 58 | | WINT-9010 | Create Shared Business Logic Package ⚡ 🎯 | ← WINT-1100 | WINT | **P0** |
| 59 | | KBAR-0060 | Sync Integration Tests | ← KBAR-0050 | KBAR | P1 |
| 60 | | WINT-1160 | Add Parallel Work Conflict Prevention | ← WINT-1130, 1140 | WINT | P2 |
| 61 | | WINT-1120 | Validate Foundation Phase | ← WINT-1040, 1050, 1060, 1070, 1110, 1160 | WINT | P2 |
| 62 | | WINT-7020 | Create Agent Migration Plan | ← WINT-7010 | WINT | P3 |
| 63 | | MODL-0040 | Model Leaderboards | ← MODL-0030 | MODL | P3 |
| 64 | x | AUDT-0020 | 9 Audit Lens Nodes **created** | ← AUDT-0010 | AUDT | P3 |
| G9 | | GATE-09 | **E2E: Validate Business Logic** | ← GATE-08, WINT-9010 | GATE | **HARD GATE** |

---

## Wave 6 — Initial LangGraph Nodes (8 stories)

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 65 | x | WINT-9020 | Create doc-sync LangGraph Node ⚡ **created** | ← WINT-9010, 0160 | WINT | **P0** |
| 66 | | WINT-4080 | Create scope-defender Agent (DA) | ← none | WINT | P1 |
| 67 | | WINT-4090 | Create evidence-judge Agent | ← none | WINT | P1 |
| 68 | | KBAR-0070 | story_get Tool | ← KBAR-0060 | KBAR | P2 |
| 69 | | KBAR-0080 | story_list & story_update Tools | ← KBAR-0070 | KBAR | P2 |
| 70 | | WINT-0190 | Create Patch Queue Pattern and Schema | ← WINT-0180 | WINT | P3 |
| 71 | x | WINT-0240 | Configure Ollama Model Fleet **created** | ← WINT-0220 | WINT | P3 |
| 72 | x | WINT-0250 | Define Escalation Triggers **created** | ← WINT-0220, 0230 | WINT | P3 |
| G10 | | GATE-10 | **E2E: Validate First LangGraph Nodes** | ← GATE-09, all Wave 6 | GATE | **HARD GATE** |

---

## Wave 7 — KBAR Tooling (9 stories)

⚡ **CRITICAL:** Complete KBAR tools for LangGraph

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 73 | | KBAR-0090 | story_ready_to_start Tool ⚡ | ← KBAR-0080 | KBAR | **P0** |
| 74 | | KBAR-0100 | Story Tools Integration Tests ⚡ | ← KBAR-0090 | KBAR | **P0** |
| 75 | | KBAR-0110 | artifact_write Tool ⚡ | ← KBAR-0100 | KBAR | **P0** |
| 76 | | KBAR-0120 | artifact_read Tool ⚡ | ← KBAR-0110 | KBAR | **P0** |
| 77 | | KBAR-0130 | artifact_search Tool ⚡ | ← KBAR-0110 | KBAR | **P0** |
| 78 | | KBAR-0140 | Artifact Summary Extraction ⚡ | ← KBAR-0120, KBAR-0130 | KBAR | **P0** |
| 79 | | KBAR-0150 | Artifact Tools Integration Tests ⚡ | ← KBAR-0140 | KBAR | **P0** |
| 80 | | AUDT-0030 | Audit Orchestration Nodes | ← AUDT-0020 | AUDT | P3 |
| 81 | x | TELE-0010 | Docker Telemetry Stack **created** | ← none | TELE | P3 |
| G11 | | GATE-11 | **E2E: Validate KBAR Tooling** | ← GATE-10, all Wave 7 | GATE | **HARD GATE** |

---

## Wave 8 — Context & Session (10 stories)

⚡ Build session/context LangGraph nodes

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 82 | x | WINT-2090 | Implement Session Context Management ⚡ **created** | ← WINT-0110 | WINT | **P0** |
| 83 | | WINT-2100 | Create session-manager Agent ⚡ | ← WINT-2090 | WINT | **P0** |
| 84 | | WINT-9090 | Create Context Cache LangGraph Nodes ⚡ | ← WINT-9010, 2100 | WINT | **P0** |
| 85 | | KBAR-0160 | Update Setup & Plan Leaders | ← KBAR-0150 | KBAR | P1 |
| 86 | | KBAR-0170 | Update Execute & Worker Agents | ← KBAR-0160 | KBAR | P1 |
| 87 | | KBAR-0180 | Update Code Review Agents | ← KBAR-0160 | KBAR | P1 |
| 88 | | KBAR-0190 | Update QA & Fix Agents | ← KBAR-0170, KBAR-0180 | KBAR | P2 |
| 89 | | KBAR-0200 | Update Knowledge Context Loader | ← KBAR-0190 | KBAR | P2 |
| 90 | | KBAR-0210 | Update Orchestrator Commands | ← KBAR-0200 | KBAR | P2 |
| 91 | | KBAR-0220 | Agent Migration Testing | ← KBAR-0210 | KBAR | P2 |
| G12 | | GATE-12 | **E2E: Validate Context & Session** | ← GATE-11, all Wave 8 | GATE | **HARD GATE** |

---

## Wave 9 — LangGraph Operational! (6 stories)

🎉 **FINAL PUSH:** LangGraph becomes operational!

| # | S | Story | Title | ← Depends On | Epic | Priority |
|---|---|-------|-------|---------------|------|----------|
| 92 | | WINT-9110 | Create Full Workflow LangGraph Graphs ⚡ 🎯 | ← WINT-9060–9100 | WINT | **P0** |
| 93 | | WINT-9120 | Create Workflow Parity Test Suite ⚡ | ← WINT-9110 | WINT | **P0** |
| 94 | | WINT-9130 | Document Migration Path ⚡ | ← WINT-9120 | WINT | **P0** |
| 95 | | WINT-9140 | Validate LangGraph Parity Phase ⚡ 🎉 | ← WINT-9120, 9130 | WINT | **P0** |
| 96 | | KBAR-0230 | DB-Driven Index Generation | ← KBAR-0220 | KBAR | P2 |
| 97 | | KBAR-0240 | Regenerate Index CLI | ← KBAR-0230 | KBAR | P2 |
| G13 | | GATE-13 | **E2E: Validate LangGraph Operational** | ← GATE-12, all Wave 9 | GATE | **HARD GATE** |

---

# 🎉 TRANSITION POINT: LangGraph is Now Operational!

**Stories 1-97 complete = LangGraph workflow ready**
**Stories 98-237 = Work FROM LangGraph (59% of total work!)**

---

## Wave 10 — Context Caching (13 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 98 | | WINT-2010 | Create Role Pack Sidecar | ← WINT-1120 | WINT |
| 99 | | WINT-2020 | Create Context Pack Sidecar | ← WINT-2010 | WINT |
| 100 | | WINT-2030 | Populate Project Context Cache | ← WINT-2020, 0100 | WINT |
| 101 | | WINT-2040 | Populate Agent Mission Cache | ← WINT-2020, 0100 | WINT |
| 102 | | WINT-2050 | Populate Domain Knowledge Cache | ← WINT-2020, 0100 | WINT |
| 103 | | WINT-2060 | Populate Library Cache | ← WINT-2020, 0100 | WINT |
| 104 | | WINT-2070 | Implement Cache Warming Strategy | ← WINT-2030, 2040, 2050, 2060 | WINT |
| 105 | | WINT-2080 | Create context-warmer Agent | ← WINT-2070 | WINT |
| 106 | | WINT-2110 | Update 5 High-Volume Agents to Use Cache | ← WINT-2030–2060, 0100 | WINT |
| 107 | | WINT-2120 | Measure Token Reduction | ← WINT-2110 | WINT |
| 108 | | WINT-4010 | Create Cohesion Sidecar | ← WINT-2020, 1080 | WINT |
| 109 | | WINT-4020 | Create Rules Registry Sidecar | ← WINT-2020 | WINT |
| 110 | | WINT-4030 | Populate Graph with Existing Features | ← WINT-0060, 0130 | WINT |

---

## Wave 11 — Graph & Cohesion (10 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 111 | | WINT-4040 | Infer Existing Capabilities | ← WINT-4010 | WINT |
| 112 | | WINT-4050 | Create Cohesion Rules | ← WINT-4020 | WINT |
| 113 | | WINT-4060 | Create graph-checker Agent | ← WINT-4030, 0130 | WINT |
| 114 | | WINT-4070 | Create cohesion-prosecutor Agent (PO) | ← WINT-4040 | WINT |
| 115 | | WINT-4100 | Create backlog-curator Agent | ← WINT-4060 | WINT |
| 116 | | WINT-4110 | Create Cohesion Check Command | ← WINT-4040 | WINT |
| 117 | | WINT-4120 | Integrate Cohesion into Workflow | ← WINT-4050, 4090 | WINT |
| 118 | | WINT-4130 | Validate Graph & Cohesion System | ← WINT-4100 | WINT |
| 119 | | WINT-4140 | Create Round Table Agent | ← WINT-4070, 4080 | WINT |
| 120 | | WINT-4150 | Standardize Elab Output Artifacts | ← WINT-4140, 0200 | WINT |

---

## Wave 12 — Additional LangGraph Nodes (4 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 121 | | WINT-9030 | Create cohesion-prosecutor LangGraph Node | ← WINT-9010, 4010 | WINT |
| 122 | | WINT-9040 | Create scope-defender LangGraph Node | ← WINT-9010, 4060 | WINT |
| 123 | | WINT-9050 | Create evidence-judge LangGraph Node | ← WINT-9010, 4070 | WINT |
| 124 | | WINT-9060 | Create batch-coordinator LangGraph Graph | ← WINT-9020–9050 | WINT |

---

## Wave 13 — Telemetry (12 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 125 | | WINT-0120 | Create Telemetry MCP Tools | ← WINT-0040 | WINT |
| 126 | | WINT-3010 | Create Gatekeeper Sidecar | ← WINT-2020 | WINT |
| 127 | | WINT-3020 | Implement Invocation Logging | ← WINT-0120 | WINT |
| 128 | | WINT-3030 | Create telemetry-logger Agent | ← WINT-3010 | WINT |
| 129 | | WINT-3040 | Decision Logging with Embeddings | ← WINT-0120 | WINT |
| 130 | | WINT-3050 | Implement Outcome Logging | ← WINT-0120 | WINT |
| 131 | | WINT-3060 | Create Telemetry Query Command | ← WINT-3010, 3030, 3040 | WINT |
| 132 | | WINT-3070 | Update 10 Core Agents with Telemetry | ← WINT-3020 | WINT |
| 133 | | WINT-3080 | Validate Telemetry Collection | ← WINT-3060 | WINT |
| 134 | | WINT-3090 | Add Scoreboard Metrics | ← WINT-3020, 3050 | WINT |
| 135 | | WINT-3100 | Create State Transition Event Log | ← WINT-0040 | WINT |
| 136 | | WINT-9100 | Create Telemetry LangGraph Nodes | ← WINT-9010, 3070 | WINT |

---

## Wave 14 — ML Pipeline (15 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 137 | | WINT-0140 | Create ML Pipeline MCP Tools | ← WINT-0010 | WINT |
| 138 | | WINT-5010 | Create HiTL Interview Sidecar | ← WINT-2020, 3040 | WINT |
| 139 | | WINT-5020 | Create Classification Agent | ← WINT-3030 | WINT |
| 140 | | WINT-5030 | Create classify-decision Skill | ← WINT-5010 | WINT |
| 141 | | WINT-5040 | Collect ML Training Data | ← WINT-3070 | WINT |
| 142 | | WINT-5050 | Train Model Router (LightGBM) | ← WINT-5030 | WINT |
| 143 | | WINT-5060 | Train Quality Predictor (XGBoost) | ← WINT-5030 | WINT |
| 144 | | WINT-5070 | Train Preference Learner (Random Forest) | ← WINT-5030 | WINT |
| 145 | | WINT-5080 | Create model-recommender Agent | ← WINT-5040, 0140 | WINT |
| 146 | | WINT-5090 | Create preference-predictor Agent | ← WINT-5060, 0140 | WINT |
| 147 | | WINT-5100 | Create predict-preference Skill | ← WINT-5080 | WINT |
| 148 | | WINT-5110 | Create Model Recommendation Command | ← WINT-5070 | WINT |
| 149 | | WINT-5120 | Create Preference Check Command | ← WINT-5080 | WINT |
| 150 | | WINT-5130 | Integrate ML into 5 Workflows | ← WINT-5090 | WINT |
| 151 | | WINT-5140 | Measure ML Effectiveness | ← WINT-5120 | WINT |

---

## Wave 15 — Batch Processing (7 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 152 | | WINT-6010 | Create batch-coordinator Agent | ← WINT-5090 | WINT |
| 153 | | WINT-6020 | Create Batch Process Command | ← WINT-6010 | WINT |
| 154 | | WINT-6030 | Create Batch Status Command | ← WINT-6020 | WINT |
| 155 | | WINT-6040 | Create batch-summary Skill | ← WINT-6010 | WINT |
| 156 | | WINT-6050 | Batch Queue with Approval Gate | ← WINT-6040 | WINT |
| 157 | | WINT-6060 | Create weekly-analyst Agent | ← WINT-3070 | WINT |
| 158 | | WINT-6070 | Create Weekly Report Command | ← WINT-6060 | WINT |

---

## Wave 16 — Batch Testing & ML Nodes (5 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 159 | | WINT-6080 | Test Batch Processing on 5 Stories | ← WINT-6050 | WINT |
| 160 | | WINT-6090 | Test Batch Processing on 10 Stories | ← WINT-6080 | WINT |
| 161 | | WINT-9080 | Create ML Pipeline LangGraph Nodes | ← WINT-9010, 5070 | WINT |
| 162 | | WINT-1170 | Add Worktree-Aware Batch Processing | ← WINT-1160, 6010 | WINT |
| 163 | | KBAR-0250 | Lesson Extraction from Evidence | ← KBAR-0240 | KBAR |

---

## Wave 17 — Backlog Management (10 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 164 | | WINT-8010 | Add Backlog Status to Stories Schema | ← WINT-1010 | WINT |
| 165 | | WINT-8020 | Create Backlog MCP Tools | ← WINT-8010 | WINT |
| 166 | | WINT-8030 | Create /backlog-add Command | ← WINT-8020 | WINT |
| 167 | | WINT-8040 | Create /backlog-review Command | ← WINT-8020 | WINT |
| 168 | | WINT-8050 | Create /backlog-promote Command | ← WINT-8040 | WINT |
| 169 | | WINT-8060 | Integrate scope-defender with Backlog | ← WINT-8030, 4060 | WINT |
| 170 | | WINT-8070 | Create backlog-curator Agent | ← WINT-8020 | WINT |
| 171 | | WINT-8080 | Import FUTURE-ROADMAP Items | ← WINT-8010 | WINT |
| 172 | | WINT-8090 | Add Backlog Metrics to Dashboard | ← WINT-8070 | WINT |
| 173 | | WINT-9070 | Create backlog-curator LangGraph Node | ← WINT-9010, 8070 | WINT |

---

## Wave 18 — Agent Migration (13 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 174 | | WINT-7030 | Migrate Batch 1: Story Management | ← WINT-7020, 1080 | WINT |
| 175 | | WINT-7040 | Migrate Batch 2: Workflow Orchestration | ← WINT-7030 | WINT |
| 176 | | WINT-7050 | Migrate Batch 3: Development | ← WINT-7040 | WINT |
| 177 | | WINT-7060 | Migrate Batch 4: QA | ← WINT-7050 | WINT |
| 178 | | WINT-7070 | Migrate Batch 5: Review | ← WINT-7060 | WINT |
| 179 | | WINT-7080 | Migrate Batch 6: Reporting | ← WINT-7070 | WINT |
| 180 | | WINT-7090 | Migrate Batch 7: Utility | ← WINT-7080 | WINT |
| 181 | | WINT-7100 | Remove Compatibility Shim | ← WINT-7090 | WINT |
| 182 | | WINT-7110 | Run Full Workflow Test Suite | ← WINT-7100 | WINT |
| 183 | | WINT-7120 | Final Documentation Sync | ← WINT-7110 | WINT |
| 184 | | WINT-7130 | Archive Legacy Directory Structure | ← WINT-7120 | WINT |
| 185 | | KBAR-0260 | Architectural Decision Extraction | ← KBAR-0250 | KBAR |
| 186 | | KBAR-0270 | Lesson Extraction Integration | ← KBAR-0260 | KBAR |

---

## Wave 19 — LERN Epic (6 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 187 | | LERN-0010 | Confidence Calibration | ← INFR done, MODL done | LERN |
| 188 | | LERN-0020 | Cross-Story Pattern Mining | ← INFR done, MODL done | LERN |
| 189 | | LERN-0030 | KB Compression | ← LERN-0020 | LERN |
| 190 | | LERN-0040 | Emergent Heuristic Discovery | ← LERN-0010 | LERN |
| 191 | | LERN-0050 | Story Risk Predictor | ← LERN-0020 | LERN |
| 192 | | LERN-0060 | Improvement Proposals | ← LERN-0010, LERN-0020 | LERN |

---

## Wave 20 — SDLC Epic (6 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 193 | | LERN-0070 | Workflow Experimentation + Replay | ← INFR done, MODL done | LERN |
| 194 | | SDLC-0010 | Machine-Readable PLAN.md Schema | ← INFR done | SDLC |
| 195 | | SDLC-0040 | SM Agent (Scrum Master) | ← SDLC-0010, INFR done | SDLC |
| 196 | | SDLC-0050 | DecisionRecord + Budgets + Confidence | ← INFR done | SDLC |
| 197 | | SDLC-0020 | PO Agent (Product Owner) | ← SDLC-0010, MODL/TELE done | SDLC |
| 198 | | SDLC-0030 | PM Agent (Project Manager) | ← SDLC-0010, MODL/TELE done | SDLC |

---

## Wave 21 — Telemetry Stack (5 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 199 | | INFR-0060 | Instrument Orchestrator + Retention | ← none | INFR |
| 200 | | TELE-0020 | Prometheus Metrics Mapping | ← TELE-0010 | TELE |
| 201 | | TELE-0030 | Dashboards-as-Code | ← TELE-0020 | TELE |
| 202 | | TELE-0040 | Alerting Rules | ← TELE-0030 | TELE |
| 203 | | WINT-0260 | Create Model Cost Tracking | ← WINT-0230, 0040 | WINT |

---

## Wave 22 — Misc (2 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 204 | | WINT-0270 | Benchmark Local Models on Codebase | ← WINT-0240 | WINT |
| 205 | | (Reserved) | (Future expansion) | TBD | TBD |

---

## Wave 23 — AUTO Epic: Infrastructure (7 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 206 | | AUTO-0010 | Create Execution State Schema | ← WINT-0010 | AUTO |
| 207 | | AUTO-0020 | Create Work Queue Schema | ← WINT-0010 | AUTO |
| 208 | | AUTO-0030 | Create Daemon Skeleton | ← AUTO-0010, 0020 | AUTO |
| 209 | | AUTO-0040 | Create Budget Enforcement Module | ← AUTO-0020, WINT-3020 | AUTO |
| 210 | | AUTO-0050 | Create Health Monitor | ← AUTO-0030 | AUTO |
| 211 | | AUTO-0060 | Create Cron/Scheduled Execution | ← AUTO-0030, 0050 | AUTO |
| 212 | | AUTO-0070 | Create Wake-on-Schedule Integration | ← AUTO-0060 | AUTO |

---

## Wave 24 — AUTO Epic: Execution (6 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 213 | | AUTO-1010 | Create LangGraph Story Executor | ← AUTO-0030, WINT-9110 | AUTO |
| 214 | | AUTO-1020 | Integrate Worktree Manager | ← AUTO-1010, WINT-1140 | AUTO |
| 215 | | AUTO-1030 | Create Parallel Executor | ← AUTO-1020 | AUTO |
| 216 | | AUTO-1040 | Create Decision Queue | ← AUTO-1010 | AUTO |
| 217 | | AUTO-1050 | Create Auto-PR Generator | ← AUTO-1010 | AUTO |
| 218 | | AUTO-1060 | Implement Confidence-Based Pause | ← AUTO-1010, WINT-5100 | AUTO |

---

## Wave 25 — AUTO Epic: Monitoring (7 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 219 | | AUTO-2010 | Create Dashboard Backend | ← AUTO-0030, 1010 | AUTO |
| 220 | | AUTO-2020 | Create Dashboard Frontend | ← AUTO-2010 | AUTO |
| 221 | | AUTO-2030 | Create Execution Timeline View | ← AUTO-2020 | AUTO |
| 222 | | AUTO-2040 | Create Decision Review UI | ← AUTO-2020, 1040 | AUTO |
| 223 | | AUTO-2050 | Create Slack Notifications | ← AUTO-0030 | AUTO |
| 224 | | AUTO-2060 | Create Email Notifications | ← AUTO-0030 | AUTO |
| 225 | | AUTO-2070 | Create Execution Replay | ← AUTO-2020, WINT-3020 | AUTO |

---

## Wave 26 — AUTO Epic: Controls (7 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 226 | | AUTO-3010 | Create Remote Pause/Resume | ← AUTO-2010 | AUTO |
| 227 | | AUTO-3020 | Create Remote Abort | ← AUTO-3010 | AUTO |
| 228 | | AUTO-3030 | Create Story Reprioritization | ← AUTO-2010 | AUTO |
| 229 | | AUTO-3040 | Create Budget Adjustment | ← AUTO-2010, 0040 | AUTO |
| 230 | | AUTO-3050 | Create Schedule Management | ← AUTO-2010 | AUTO |
| 231 | | AUTO-3060 | Create Emergency Panic Button | ← AUTO-2010, 0030 | AUTO |
| 232 | | AUTO-3070 | Create Cost Anomaly Detection | ← AUTO-0040, WINT-3020 | AUTO |

---

## Wave 27 — AUTO Epic: Intelligence (5 stories) ✨ Work FROM LangGraph

| # | S | Story | Title | ← Depends On | Epic |
|---|---|-------|-------|---------------|------|
| 233 | | AUTO-4010 | Create Smart Prioritization | ← AUTO-1030, WINT-5060 | AUTO |
| 234 | | AUTO-4020 | Create Cost Estimation | ← AUTO-4010, WINT-3050 | AUTO |
| 235 | | AUTO-4030 | Create Failure Pattern Detection | ← AUTO-1010, WINT-3090 | AUTO |
| 236 | | AUTO-4040 | Create Optimal Schedule Learning | ← AUTO-3050, WINT-3020 | AUTO |
| 237 | | AUTO-4050 | Create Weekly Improvement Report | ← AUTO-4010, WINT-6060 | AUTO |

---

## Quick Reference

| Wave | Stories | Status | What Happens |
|------|---------|--------|--------------|
| 1 | #1–14 | Claude Code | Foundation |
| 2 | #15–33 | Claude Code | ⚡ LNGG adapters + schema |
| 3 | #34–47 | Claude Code | ⚡ WINT-1100 Shared Types |
| 4 | #48–57 | Claude Code | Pre-LangGraph prep |
| 5 | #58–64 | Claude Code | 🎯 WINT-9010 Business Logic |
| 6 | #65–72 | Claude Code | First LangGraph nodes |
| 7 | #73–81 | Claude Code | ⚡ KBAR tools |
| 8 | #82–91 | Claude Code | Context/session |
| 9 | #92–97 | Claude Code | 🎉 WINT-9110 Full Workflow |
| 10–27 | #98–237 | **LangGraph** ✨ | **Everything else!** |

**Efficiency:** 97 stories (41%) in Claude Code → 140 stories (59%) in LangGraph! 🚀
