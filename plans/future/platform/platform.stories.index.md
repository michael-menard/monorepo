---
doc_type: stories_index
title: "Platform — Unified Future Stories Index"
status: active
story_prefix: PLATFORM
created_at: "2026-02-13T00:00:00Z"
updated_at: "2026-02-13T00:00:00Z"
---

# Unified Future Stories Index — Work Order

235 stories across 11 epics. Topologically sorted — start at #1, work down.
Every story's dependencies appear above it in the list.

**Legend:** `[ ]` pending · `[~]` ready-to-work · `[x]` done · `←` depends on

---

## Wave 1 — No Dependencies (14 stories)

These can all start immediately. Ordered by downstream impact.

| # | Story | Title | Blocks | Epic |
|---|-------|-------|--------|------|
| 1 | INFR-0010 | Postgres Artifact Schemas | INFR-0020, INFR-0030 | INFR |
| 2 | INFR-0040 | Workflow Events Table + Ingestion `[~]` **elaborated** | INFR-0050, TELE-0010 | INFR |
| 3 | MODL-0010 | Provider Adapters (OpenRouter/Ollama/Anthropic) `[~]` **ready-to-work** | MODL-0020 | MODL |
| 4 | WINT-0010 | Create Core Database Schemas (6 schemas) | WINT-0020–0070, AUTO-0010/0020 | WINT |
| 5 | LNGG-0010 | Story File Adapter — YAML Read/Write `[In Elaboration]` | LNGG-0020, LNGG-0040, LNGG-0060, LNGG-0070 | LNGG |
| 6 | LNGG-0030 | Decision Callback System `[x]` **completed** | LNGG-0070 | LNGG |
| 7 | LNGG-0050 | KB Writing Adapter `[~]` **elaborated** | LNGG-0070 | LNGG |
| 8 | KBAR-0010 | Database Schema Migrations `[Created]` | KBAR-0020 | KBAR |
| 9 | AUDT-0010 | Audit Graph & Artifact Schema `[Created]` | AUDT-0020 | AUDT |
| 10 | WINT-0150 | Create doc-sync Skill | WINT-0160 | WINT |
| 11 | WINT-0180 | Define Examples + Negative Examples Framework | WINT-0190, 0200, 0210 | WINT |
| 12 | WINT-0220 | Define Model-per-Task Strategy | WINT-0230, 0240, 0250 | WINT |
| 13 | WINT-1020 | Flatten Story Directories | WINT-1030 | WINT |
| 14 | WINT-7010 | Audit Agent Directory References | WINT-7020 | WINT |

---

## Wave 2 — Depth 1 (26 stories)

← All dependencies are in Wave 1.

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 15 | INFR-0020 | Artifact Writer/Reader Service | ← INFR-0010 | INFR |
| 16 | INFR-0050 | Event SDK (Shared Telemetry Hooks) | ← INFR-0040 | INFR |
| 17 | MODL-0020 | Task Contracts & Model Selector | ← MODL-0010 | MODL |
| 18 | AUDT-0020 | 9 Audit Lens Nodes | ← AUDT-0010 | AUDT |
| 19 | LNGG-0020 | Index Management Adapter | ← LNGG-0010 | LNGG |
| 20 | LNGG-0040 | Stage Movement Adapter | ← LNGG-0010 | LNGG |
| 21 | LNGG-0060 | Checkpoint Adapter | ← LNGG-0010 | LNGG |
| 22 | KBAR-0020 | Schema Tests & Validation | ← KBAR-0010 | KBAR |
| 23 | WINT-0020 | Create Story Management Tables | ← WINT-0010 | WINT |
| 24 | WINT-0030 | Create Context Cache Tables | ← WINT-0010 | WINT |
| 25 | WINT-0040 | Create Telemetry Tables | ← WINT-0010 | WINT |
| 26 | WINT-0050 | Create ML Pipeline Tables | ← WINT-0010 | WINT |
| 27 | WINT-0060 | Create Graph Relational Tables | ← WINT-0010 | WINT |
| 28 | WINT-0070 | Create Workflow Tracking Tables | ← WINT-0010 | WINT |
| 29 | WINT-0160 | Create doc-sync Agent | ← WINT-0150 | WINT |
| 30 | WINT-0190 | Create Patch Queue Pattern and Schema | ← WINT-0180 | WINT |
| 31 | WINT-0200 | Create User Flows Schema | ← WINT-0180 | WINT |
| 32 | WINT-0230 | Create Unified Model Interface | ← WINT-0220 | WINT |
| 33 | WINT-0240 | Configure Ollama Model Fleet | ← WINT-0220 | WINT |
| 34 | INFR-0030 | MinIO/S3 Docker Setup + Client Adapter | ← INFR-0010 | INFR |
| 35 | WINT-1080 | Reconcile WINT Schema with LangGraph | ← WINT-0010 | WINT |

---

## Wave 3 — Depth 2 (24 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 36 | INFR-0060 | Instrument Orchestrator + Retention | ← INFR-0050 | INFR |
| 37 | MODL-0030 | Quality Evaluator | ← MODL-0020 | MODL |
| 38 | TELE-0010 | Docker Telemetry Stack | ← INFR-0040 | TELE |
| 39 | AUDT-0030 | Audit Orchestration Nodes | ← AUDT-0020 | AUDT |
| 40 | LNGG-0070 | Integration Test Suite | ← LNGG-0010, LNGG-0020, LNGG-0030, LNGG-0040 | LNGG |
| 41 | KBAR-0030 | Story Sync Functions | ← KBAR-0020 | KBAR |
| 42 | WINT-0080 | Seed Initial Workflow Data | ← WINT-0070, 0060 | WINT |
| 43 | WINT-0090 | Create Story Management MCP Tools | ← WINT-0020 | WINT |
| 44 | WINT-0100 | Create Context Cache MCP Tools | ← WINT-0030 | WINT |
| 45 | WINT-0110 | Create Session Management MCP Tools | ← WINT-0030 | WINT |
| 46 | WINT-0120 | Create Telemetry MCP Tools | ← WINT-0040 | WINT |
| 47 | WINT-0130 | Create Graph Query MCP Tools | ← WINT-0060 | WINT |
| 48 | WINT-0140 | Create ML Pipeline MCP Tools | ← WINT-0050 | WINT |
| 49 | WINT-0170 | Add Doc-Sync Gate | ← WINT-0160 | WINT |
| 50 | WINT-0210 | Populate Role Pack Templates | ← WINT-0180, 0190, 0200 | WINT |
| 51 | WINT-0250 | Define Escalation Triggers | ← WINT-0220, 0230 | WINT |
| 52 | WINT-0260 | Create Model Cost Tracking | ← WINT-0230, 0040 | WINT |
| 53 | WINT-0270 | Benchmark Local Models on Codebase | ← WINT-0240 | WINT |
| 54 | WINT-1030 | Populate Story Status from Directories | ← WINT-1020, 0020 | WINT |
| 55 | WINT-1090 | Update LangGraph Repos for Unified Schema | ← WINT-1080 | WINT |
| 56 | WINT-1100 | Create Shared TypeScript Types | ← WINT-1080 | WINT |
| 57 | WINT-1130 | Track Worktree-to-Story Mapping in DB | ← WINT-0020 | WINT |
| 58 | WINT-7020 | Create Agent Migration Plan | ← WINT-7010 | WINT |

---

## Wave 4 — Depth 3 (17 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 59 | MODL-0040 | Model Leaderboards | ← MODL-0030 | MODL |
| 60 | TELE-0020 | Prometheus Metrics Mapping | ← TELE-0010, INFR-0050 | TELE |
| 61 | KBAR-0040 | Artifact Sync Functions | ← KBAR-0030 | KBAR |
| 62 | WINT-1010 | Create Compatibility Shim Module | ← WINT-0090 | WINT |
| 63 | WINT-1070 | Deprecate stories.index.md | ← WINT-1030 | WINT |
| 64 | WINT-1110 | Migrate Existing LangGraph Data | ← WINT-1090 | WINT |
| 65 | WINT-1140 | Integrate Worktree into dev-implement-story | ← WINT-1130 | WINT |
| 66 | WINT-1150 | Integrate Worktree Cleanup into Completion | ← WINT-1130 | WINT |

**LERN unlocks here** (once INFR + MODL complete):

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 67 | LERN-0010 | Confidence Calibration | ← INFR done, MODL done | LERN |
| 68 | LERN-0020 | Cross-Story Pattern Mining | ← INFR done, MODL done | LERN |
| 69 | LERN-0070 | Workflow Experimentation + Replay | ← INFR done, MODL done | LERN |

**SDLC partially unlocks** (once INFR complete):

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 70 | SDLC-0010 | Machine-Readable PLAN.md Schema | ← INFR done | SDLC |
| 71 | SDLC-0050 | DecisionRecord + Budgets + Confidence | ← INFR done | SDLC |
| 72 | SDLC-0040 | SM Agent (Scrum Master) | ← SDLC-0010, INFR done | SDLC |

---

## Wave 5 — Depth 4 (15 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 73 | TELE-0030 | Dashboards-as-Code | ← TELE-0020 | TELE |
| 74 | KBAR-0050 | CLI Sync Commands | ← KBAR-0040 | KBAR |
| 75 | WINT-1040 | Update story-status to Use DB | ← WINT-1010, 1030 | WINT |
| 76 | WINT-1050 | Update story-update to Use DB | ← WINT-1010, 1030 | WINT |
| 77 | WINT-1060 | Update story-move to Use DB | ← WINT-1010, 1030 | WINT |
| 78 | WINT-1160 | Add Parallel Work Conflict Prevention | ← WINT-1130, 1140 | WINT |
| 79 | LERN-0030 | KB Compression | ← LERN-0020 | LERN |
| 80 | LERN-0040 | Emergent Heuristic Discovery | ← LERN-0010 | LERN |
| 81 | LERN-0050 | Story Risk Predictor | ← LERN-0020 | LERN |
| 82 | LERN-0060 | Improvement Proposals | ← LERN-0010, LERN-0020 | LERN |

**SDLC completes** (once MODL + TELE done):

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 83 | SDLC-0020 | PO Agent (Product Owner) | ← SDLC-0010, MODL done, TELE done | SDLC |
| 84 | SDLC-0030 | PM Agent (Project Manager) | ← SDLC-0010, MODL done, TELE done | SDLC |

---

## Wave 6 — Depth 5 (5 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 85 | TELE-0040 | Alerting Rules | ← TELE-0030 | TELE |
| 86 | KBAR-0060 | Sync Integration Tests | ← KBAR-0050 | KBAR |

**WINT Foundation validation:**

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 87 | WINT-1120 | Validate Foundation Phase | ← WINT-1040, 1050, 1060, 1070, 1110, 1160 | WINT |

---

## Wave 7 — KBAR Phase 3 + WINT Phase 2 Start (16 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 88 | KBAR-0070 | story_get Tool | ← KBAR-0060 | KBAR |
| 89 | WINT-2010 | Create Role Pack Sidecar | ← WINT-1120 | WINT |
| 90 | WINT-2090 | Implement Session Context Management | ← WINT-0110 | WINT |
| 91 | KBAR-0080 | story_list & story_update Tools | ← KBAR-0070 | KBAR |
| 92 | WINT-2020 | Create Context Pack Sidecar | ← WINT-2010 | WINT |
| 93 | KBAR-0090 | story_ready_to_start Tool | ← KBAR-0080 | KBAR |
| 94 | WINT-2030 | Populate Project Context Cache | ← WINT-2020, 0030, 0100 | WINT |
| 95 | WINT-2040 | Populate Agent Mission Cache | ← WINT-2020, 0030, 0100 | WINT |
| 96 | WINT-2050 | Populate Domain Knowledge Cache | ← WINT-2020, 0030, 0100 | WINT |
| 97 | WINT-2060 | Populate Library Cache | ← WINT-2020, 0030, 0100 | WINT |
| 98 | KBAR-0100 | Story Tools Integration Tests | ← KBAR-0090 | KBAR |
| 99 | WINT-2100 | Create session-manager Agent | ← WINT-2090 | WINT |
| 100 | WINT-2070 | Implement Cache Warming Strategy | ← WINT-2030, 2040, 2050, 2060 | WINT |
| 101 | WINT-2110 | Update 5 High-Volume Agents to Use Cache | ← WINT-2030–2060, 0100 | WINT |
| 102 | WINT-2080 | Create context-warmer Agent | ← WINT-2070 | WINT |
| 103 | WINT-2120 | Measure Token Reduction | ← WINT-2110 | WINT |

---

## Wave 8 — KBAR Phase 4 + WINT Phase 3 (15 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 104 | KBAR-0110 | artifact_write Tool | ← KBAR-0100 | KBAR |
| 105 | WINT-3010 | Create Gatekeeper Sidecar | ← WINT-2020 | WINT |
| 106 | WINT-3020 | Implement Invocation Logging | ← WINT-0120 | WINT |
| 107 | WINT-3040 | Decision Logging with Embeddings | ← WINT-0120 | WINT |
| 108 | WINT-3050 | Implement Outcome Logging | ← WINT-0120 | WINT |
| 109 | WINT-3100 | Create State Transition Event Log | ← WINT-0040 | WINT |
| 110 | KBAR-0120 | artifact_read Tool | ← KBAR-0110 | KBAR |
| 111 | KBAR-0130 | artifact_search Tool | ← KBAR-0110 | KBAR |
| 112 | WINT-3030 | Create telemetry-logger Agent | ← WINT-3010 | WINT |
| 113 | WINT-3070 | Update 10 Core Agents with Telemetry | ← WINT-3020 | WINT |
| 114 | WINT-3090 | Add Scoreboard Metrics | ← WINT-3020, 3050 | WINT |
| 115 | KBAR-0140 | Artifact Summary Extraction | ← KBAR-0120, KBAR-0130 | KBAR |
| 116 | WINT-3060 | Create Telemetry Query Command | ← WINT-3010, 3030, 3040 | WINT |
| 117 | WINT-3080 | Validate Telemetry Collection | ← WINT-3060 | WINT |
| 118 | KBAR-0150 | Artifact Tools Integration Tests | ← KBAR-0140 | KBAR |

---

## Wave 9 — KBAR Phase 5 + WINT Phase 4 (22 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 119 | KBAR-0160 | Update Setup & Plan Leaders | ← KBAR-0150 | KBAR |
| 120 | WINT-4010 | Create Cohesion Sidecar | ← WINT-2020, 1080 | WINT |
| 121 | WINT-4020 | Create Rules Registry Sidecar | ← WINT-2020 | WINT |
| 122 | WINT-4030 | Populate Graph with Existing Features | ← WINT-0060, 0130 | WINT |
| 123 | WINT-4080 | Create scope-defender Agent (DA) | ← none (standalone) | WINT |
| 124 | WINT-4090 | Create evidence-judge Agent | ← none (standalone) | WINT |
| 125 | KBAR-0170 | Update Execute & Worker Agents | ← KBAR-0160 | KBAR |
| 126 | KBAR-0180 | Update Code Review Agents | ← KBAR-0160 | KBAR |
| 127 | WINT-4040 | Infer Existing Capabilities | ← WINT-4010 | WINT |
| 128 | WINT-4050 | Create Cohesion Rules | ← WINT-4020 | WINT |
| 129 | WINT-4060 | Create graph-checker Agent | ← WINT-4030, 0130 | WINT |
| 130 | WINT-4070 | Create cohesion-prosecutor Agent (PO) | ← WINT-4040 | WINT |
| 131 | KBAR-0190 | Update QA & Fix Agents | ← KBAR-0170, KBAR-0180 | KBAR |
| 132 | WINT-4100 | Create backlog-curator Agent | ← WINT-4060 | WINT |
| 133 | WINT-4110 | Create Cohesion Check Command | ← WINT-4040 | WINT |
| 134 | WINT-4120 | Integrate Cohesion into Workflow | ← WINT-4050, 4090 | WINT |
| 135 | WINT-4140 | Create Round Table Agent | ← WINT-4070, 4080 | WINT |
| 136 | WINT-4130 | Validate Graph & Cohesion System | ← WINT-4100 | WINT |
| 137 | WINT-4150 | Standardize Elab Output Artifacts | ← WINT-4140, 0200 | WINT |
| 138 | KBAR-0200 | Update Knowledge Context Loader | ← KBAR-0190 | KBAR |
| 139 | KBAR-0210 | Update Orchestrator Commands | ← KBAR-0200 | KBAR |
| 140 | KBAR-0220 | Agent Migration Testing | ← KBAR-0210 | KBAR |

---

## Wave 10 — KBAR Phase 6 + WINT Phase 5 (18 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 141 | KBAR-0230 | DB-Driven Index Generation | ← KBAR-0220 | KBAR |
| 142 | WINT-5010 | Create HiTL Interview Sidecar | ← WINT-2020, 3040 | WINT |
| 143 | WINT-5020 | Create Classification Agent | ← WINT-3030 | WINT |
| 144 | WINT-5040 | Collect ML Training Data | ← WINT-3070 | WINT |
| 145 | KBAR-0240 | Regenerate Index CLI | ← KBAR-0230 | KBAR |
| 146 | WINT-5030 | Create classify-decision Skill | ← WINT-5010 | WINT |
| 147 | WINT-5050 | Train Model Router (LightGBM) | ← WINT-5030 | WINT |
| 148 | WINT-5060 | Train Quality Predictor (XGBoost) | ← WINT-5030 | WINT |
| 149 | WINT-5070 | Train Preference Learner (Random Forest) | ← WINT-5030 | WINT |
| 150 | WINT-5080 | Create model-recommender Agent | ← WINT-5040, 0140 | WINT |
| 151 | WINT-5090 | Create preference-predictor Agent | ← WINT-5060, 0140 | WINT |
| 152 | WINT-5100 | Create predict-preference Skill | ← WINT-5080 | WINT |
| 153 | WINT-5110 | Create Model Recommendation Command | ← WINT-5070 | WINT |
| 154 | WINT-5120 | Create Preference Check Command | ← WINT-5080 | WINT |
| 155 | WINT-5130 | Integrate ML into 5 Workflows | ← WINT-5090 | WINT |
| 156 | WINT-5140 | Measure ML Effectiveness | ← WINT-5120 | WINT |

---

## Wave 11 — KBAR Phase 7 + WINT Phase 6 (12 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 157 | KBAR-0250 | Lesson Extraction from Evidence | ← KBAR-0240 | KBAR |
| 158 | WINT-6010 | Create batch-coordinator Agent | ← WINT-5090 | WINT |
| 159 | WINT-6060 | Create weekly-analyst Agent | ← WINT-3070 | WINT |
| 160 | KBAR-0260 | Architectural Decision Extraction | ← KBAR-0250 | KBAR |
| 161 | WINT-6020 | Create Batch Process Command | ← WINT-6010 | WINT |
| 162 | WINT-6070 | Create Weekly Report Command | ← WINT-6060 | WINT |
| 163 | KBAR-0270 | Lesson Extraction Integration | ← KBAR-0260 | KBAR |
| 164 | WINT-6030 | Create Batch Status Command | ← WINT-6020 | WINT |
| 165 | WINT-6040 | Create batch-summary Skill | ← WINT-6010 | WINT |
| 166 | WINT-6050 | Batch Queue with Approval Gate | ← WINT-6040 | WINT |
| 167 | WINT-6080 | Test Batch Processing on 5 Stories | ← WINT-6050 | WINT |
| 168 | WINT-6090 | Test Batch Processing on 10 Stories | ← WINT-6080 | WINT |

---

## Wave 12 — WINT Phase 7: Migration (13 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 169 | WINT-7030 | Migrate Batch 1: Story Management | ← WINT-7020, 1080 | WINT |
| 170 | WINT-7040 | Migrate Batch 2: Workflow Orchestration | ← WINT-7030 | WINT |
| 171 | WINT-7050 | Migrate Batch 3: Development | ← WINT-7040 | WINT |
| 172 | WINT-7060 | Migrate Batch 4: QA | ← WINT-7050 | WINT |
| 173 | WINT-7070 | Migrate Batch 5: Review | ← WINT-7060 | WINT |
| 174 | WINT-7080 | Migrate Batch 6: Reporting | ← WINT-7070 | WINT |
| 175 | WINT-7090 | Migrate Batch 7: Utility | ← WINT-7080 | WINT |
| 176 | WINT-7100 | Remove Compatibility Shim | ← WINT-7090 | WINT |
| 177 | WINT-7110 | Run Full Workflow Test Suite | ← WINT-7100 | WINT |
| 178 | WINT-7120 | Final Documentation Sync | ← WINT-7110 | WINT |
| 179 | WINT-7130 | Archive Legacy Directory Structure | ← WINT-7120 | WINT |

---

## Wave 13 — WINT Phase 8: Backlog Management (9 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 180 | WINT-8010 | Add Backlog Status to Stories Schema | ← WINT-1010 | WINT |
| 181 | WINT-8020 | Create Backlog MCP Tools | ← WINT-8010 | WINT |
| 182 | WINT-8030 | Create /backlog-add Command | ← WINT-8020 | WINT |
| 183 | WINT-8040 | Create /backlog-review Command | ← WINT-8020 | WINT |
| 184 | WINT-8070 | Create backlog-curator Agent | ← WINT-8020 | WINT |
| 185 | WINT-8050 | Create /backlog-promote Command | ← WINT-8040 | WINT |
| 186 | WINT-8060 | Integrate scope-defender with Backlog | ← WINT-8030, 4060 | WINT |
| 187 | WINT-8080 | Import FUTURE-ROADMAP Items | ← WINT-8010 | WINT |
| 188 | WINT-8090 | Add Backlog Metrics to Dashboard | ← WINT-8070 | WINT |

---

## Wave 14 — WINT Phase 9: LangGraph Parity (14 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 189 | WINT-9010 | Create Shared Business Logic Package | ← WINT-1100 | WINT |
| 190 | WINT-9020 | Create doc-sync LangGraph Node | ← WINT-9010, 0160 | WINT |
| 191 | WINT-9030 | Create cohesion-prosecutor LangGraph Node | ← WINT-9010, 4010 | WINT |
| 192 | WINT-9040 | Create scope-defender LangGraph Node | ← WINT-9010, 4060 | WINT |
| 193 | WINT-9050 | Create evidence-judge LangGraph Node | ← WINT-9010, 4070 | WINT |
| 194 | WINT-9060 | Create batch-coordinator LangGraph Graph | ← WINT-9020–9050 | WINT |
| 195 | WINT-9070 | Create backlog-curator LangGraph Node | ← WINT-9010, 8070 | WINT |
| 196 | WINT-9080 | Create ML Pipeline LangGraph Nodes | ← WINT-9010, 5070 | WINT |
| 197 | WINT-9090 | Create Context Cache LangGraph Nodes | ← WINT-9010, 2100 | WINT |
| 198 | WINT-9100 | Create Telemetry LangGraph Nodes | ← WINT-9010, 3070 | WINT |
| 199 | WINT-9110 | Create Full Workflow LangGraph Graphs | ← WINT-9060–9100 | WINT |
| 200 | WINT-9120 | Create Workflow Parity Test Suite | ← WINT-9110 | WINT |
| 201 | WINT-9130 | Document Migration Path | ← WINT-9120 | WINT |
| 202 | WINT-9140 | Validate LangGraph Parity Phase | ← WINT-9120, 9130 | WINT |

---

## Wave 15 — AUTO Phase 0: Infrastructure (7 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 203 | AUTO-0010 | Create Execution State Schema | ← WINT-0010 | AUTO |
| 204 | AUTO-0020 | Create Work Queue Schema | ← WINT-0010 | AUTO |
| 205 | AUTO-0030 | Create Daemon Skeleton | ← AUTO-0010, 0020 | AUTO |
| 206 | AUTO-0040 | Create Budget Enforcement Module | ← AUTO-0020, WINT-3020 | AUTO |
| 207 | AUTO-0050 | Create Health Monitor | ← AUTO-0030 | AUTO |
| 208 | AUTO-0060 | Create Cron/Scheduled Execution | ← AUTO-0030, 0050 | AUTO |
| 209 | AUTO-0070 | Create Wake-on-Schedule Integration | ← AUTO-0060 | AUTO |

---

## Wave 16 — AUTO Phase 1: Execution Engine (6 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 210 | AUTO-1010 | Create LangGraph Story Executor | ← AUTO-0030, WINT-9110 | AUTO |
| 211 | AUTO-1020 | Integrate Worktree Manager | ← AUTO-1010, WINT-1140 | AUTO |
| 212 | AUTO-1030 | Create Parallel Executor | ← AUTO-1020 | AUTO |
| 213 | AUTO-1040 | Create Decision Queue | ← AUTO-1010 | AUTO |
| 214 | AUTO-1050 | Create Auto-PR Generator | ← AUTO-1010 | AUTO |
| 215 | AUTO-1060 | Implement Confidence-Based Pause | ← AUTO-1010, WINT-5100 | AUTO |

---

## Wave 17 — AUTO Phase 2: Monitoring (7 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 216 | AUTO-2010 | Create Dashboard Backend | ← AUTO-0030, 1010 | AUTO |
| 217 | AUTO-2050 | Create Slack Notifications | ← AUTO-0030 | AUTO |
| 218 | AUTO-2060 | Create Email Notifications | ← AUTO-0030 | AUTO |
| 219 | AUTO-2020 | Create Dashboard Frontend | ← AUTO-2010 | AUTO |
| 220 | AUTO-2030 | Create Execution Timeline View | ← AUTO-2020 | AUTO |
| 221 | AUTO-2040 | Create Decision Review UI | ← AUTO-2020, 1040 | AUTO |
| 222 | AUTO-2070 | Create Execution Replay | ← AUTO-2020, WINT-3020 | AUTO |

---

## Wave 18 — AUTO Phase 3: Controls (7 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 223 | AUTO-3010 | Create Remote Pause/Resume | ← AUTO-2010 | AUTO |
| 224 | AUTO-3030 | Create Story Reprioritization | ← AUTO-2010 | AUTO |
| 225 | AUTO-3040 | Create Budget Adjustment | ← AUTO-2010, 0040 | AUTO |
| 226 | AUTO-3050 | Create Schedule Management | ← AUTO-2010 | AUTO |
| 227 | AUTO-3060 | Create Emergency Panic Button | ← AUTO-2010, 0030 | AUTO |
| 228 | AUTO-3070 | Create Cost Anomaly Detection | ← AUTO-0040, WINT-3020 | AUTO |
| 229 | AUTO-3020 | Create Remote Abort | ← AUTO-3010 | AUTO |

---

## Wave 19 — AUTO Phase 4: Intelligence (5 stories)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 230 | AUTO-4010 | Create Smart Prioritization | ← AUTO-1030, WINT-5060 | AUTO |
| 231 | AUTO-4030 | Create Failure Pattern Detection | ← AUTO-1010, WINT-3090 | AUTO |
| 232 | AUTO-4040 | Create Optimal Schedule Learning | ← AUTO-3050, WINT-3020 | AUTO |
| 233 | AUTO-4020 | Create Cost Estimation | ← AUTO-4010, WINT-3050 | AUTO |
| 234 | AUTO-4050 | Create Weekly Improvement Report | ← AUTO-4010, WINT-6060 | AUTO |

---

## Wave 20 — Worktree Batch (late dependency)

| # | Story | Title | ← Depends On | Epic |
|---|-------|-------|---------------|------|
| 235 | WINT-1170 | Add Worktree-Aware Batch Processing | ← WINT-1160, 6010 | WINT |

---

## Quick Reference

| Wave | Stories | What Unlocks |
|------|---------|-------------|
| 1 | #1–14 | Everything starts here |
| 2 | #15–35 | Core services, tables, adapters |
| 3 | #36–58 | Telemetry stack, MCP tools, LangGraph tests |
| 4 | #59–72 | LERN + SDLC unlock, leaderboards |
| 5 | #73–84 | DB commands, SDLC agents, learning |
| 6 | #85–87 | Foundation validated |
| 7–8 | #88–118 | Context cache, telemetry, KBAR tools |
| 9 | #119–140 | Graph/cohesion, agent migration |
| 10 | #141–156 | ML pipeline, index generation |
| 11 | #157–168 | Batch mode, knowledge extraction |
| 12 | #169–179 | Full agent migration |
| 13 | #180–188 | Backlog management |
| 14 | #189–202 | LangGraph parity |
| 15–20 | #203–235 | Autonomous development |
