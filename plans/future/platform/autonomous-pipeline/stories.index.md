# autonomous-pipeline Story Index

**Plan Slug**: autonomous-pipeline
**Feature Directory**: plans/future/platform/autonomous-pipeline
**Prefix**: APIP
**Project Name**: autonomous-pipeline
**Generated**: 2026-02-25T00:00:00Z

## Progress Summary

| Phase | Name | Total Stories | Ready | In Progress | Completed | Status |
|-------|------|---------------|-------|-------------|-----------|--------|
| 0 | Foundation | 11 | 5 | 0 | 2 | backlog |
| 1 | Full Worker Graphs | 10 | 2 | 2 | 0 | in-progress |
| 2 | Resilience & Monitoring | 3 | 0 | 0 | 0 | backlog |
| 3 | Learning System & Optimization | 5 | 0 | 0 | 1 | in-progress |
| 4 | Long-Term Quality | 3 | 0 | 0 | 0 | backlog |
| **TOTAL** | | **32** | **7** | **2** | **3** | |

## Phase 0: Foundation (11 stories)

Minimal autonomous loop: Work queue, supervisor loop (plain TypeScript), LangGraph deployment, model router, and supporting infrastructure (test framework, test database, secrets engine, server provisioning, schema versioning).

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-0010 | BullMQ Work Queue Setup | none | In QA |
| APIP-0020 | Supervisor Loop (Plain TypeScript) | APIP-0010 | uat |
| APIP-0030 | LangGraph Platform Docker Deployment | APIP-5006 | Ready to Work |
| APIP-0040 | Model Router v1 with Rate Limiting and Token Budgets | APIP-0010 | uat |
| APIP-5000 | Test Infrastructure Setup for Autonomous Pipeline Unit Testing (Phase 0) | APIP-0010 | ✅ uat |
| APIP-5001 | Test Database Setup and Migration Testing | none | ✅ UAT |
| APIP-5003 | LangGraph Platform Security Hardening and Network Boundary Documentation | APIP-0030 | ✅ uat |
| APIP-5004 | Secrets Engine and API Key Management | none | In QA |
| APIP-5006 | LangGraph Server Infrastructure Baseline | none | 🔴 Failed Code Review |
| APIP-5007 | Database Schema Versioning and Migration Strategy | APIP-0010 | Created |

## Phase 1: Full Worker Graphs (9 stories)

Structured stories, diff planner, implementation loop, review, QA, merge, documentation graphs, E2E testing, and minimal operator CLI.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-1010 | Structurer Node in Elaboration Graph | none | Ready for Code Review |
| APIP-1020 | ChangeSpec Schema Design and Validation Spike | APIP-1010 | Created |
| APIP-1031 | Implementation Graph Skeleton with Worktree and Evidence Infrastructure | APIP-1020, APIP-0040 | Ready to Work |
| APIP-1032 | Change Loop with Model Dispatch, Micro-Verify, and Atomic Commits | APIP-1031, APIP-1020, APIP-0040 | Backlog |
| APIP-1040 | Documentation Graph (Post-Merge) | APIP-1032 | In Progress |
| APIP-1050 | Review Graph with Parallel Fan-Out Workers | APIP-1032 | 🔍 Ready for QA |
| APIP-1060 | QA Graph with Autonomous Verdict | APIP-1050 | Created |
| APIP-1070 | Merge Graph with Learnings Extraction | APIP-1060 | In Elaboration |
| APIP-5002 | E2E Test Plan and Playwright Framework Setup | APIP-0010, APIP-1010, APIP-1020, APIP-1032, APIP-1050, APIP-1060, APIP-1070 | Ready to Work |
| APIP-5005 | Minimal Operator Visibility CLI | APIP-0010, APIP-1070 | In Elaboration |

## Phase 2: Resilience & Monitoring (3 stories)

Blocked queue handling, monitor dashboard UI, and graceful shutdown.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-2010 | Blocked Queue and Notification System | none | Ready to Work |
| APIP-2020 | Monitor UI v1 (Read-Only Dashboard) | APIP-2010 | 🔍 Ready for QA |
| APIP-2030 | Graceful Shutdown, Health Check, and Deployment Hardening | APIP-0030 | 🔍 Ready for QA |

## Phase 3: Learning System & Optimization (5 stories)

Change telemetry, model affinity profiles, smart routing, bake-off engine, concurrency, and cron infrastructure.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-3010 | Change Telemetry Table and Instrumentation | APIP-1032 | Ready for Code Review |
| APIP-3020 | Model Affinity Profiles Table and Pattern Miner Cron | APIP-3010 | 🔍 Ready for QA |
| APIP-3030 | Learning-Aware Diff Planner | APIP-3020, APIP-1020 | 🔍 Ready for QA |
| APIP-3040 | Learning-Aware Model Router | APIP-3020 | 🔴 Failed Code Review |
| APIP-3050 | Story Structurer Feedback (Affinity-Guided) | APIP-3020, APIP-1010 | In Progress |
| APIP-3060 | Bake-Off Engine for Model Experiments | APIP-3020, APIP-3010 | 🔍 Ready for QA |
| APIP-3070 | Cold Start Bootstrapping and Exploration Budget | APIP-3040 | Ready to Work |
| APIP-3080 | Parallel Story Concurrency (2-3 Worktrees) | none | In Elaboration |
| APIP-3090 | Cron Job Infrastructure | APIP-0030, APIP-3020 | ✅ uat |

## Phase 4: Long-Term Quality (3 stories)

Codebase health gate, cohesion scanner, dependency auditor, test quality monitor, dead code reaper, KB freshness, and weekly reports.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-4010 | Codebase Health Gate | APIP-1070, APIP-3090 | Ready to Work |
| APIP-4020 | Cohesion Scanner | APIP-4010, APIP-3090 | Ready to Work |
| APIP-4030 | Dependency Auditor | APIP-2010 | Ready to Work |
| APIP-4040 | Test Quality Monitor | APIP-3090 | Ready to Work |
| APIP-4050 | Dead Code Reaper | APIP-3090 | Ready to Work |
| APIP-4060 | KB Freshness Check and Stale Entry Archival | APIP-3090 | Ready to Work |
| APIP-4070 | Weekly Pipeline Health Report | APIP-4010, APIP-3020, APIP-2010 | Ready to Work |

## Metrics Summary

- **Total Stories**: 32
- **Critical Path Length**: 13 stories
- **Maximum Parallelization**: 4 stories at once
- **Stories with Sizing Warnings**: 1 (APIP-1040)
- **High-Risk Stories**: 3 (RISK-001, RISK-002, RISK-009)
- **New Stories Added**: 8 (infrastructure, testing, security, platform)

## Critical Path (12 stories)

Minimum dependency chain for full autonomous pipeline operation:

1. APIP-0010 — BullMQ Work Queue Setup
2. APIP-0020 — Supervisor Loop (Plain TypeScript)
3. APIP-1010 — Structurer Node in Elaboration Graph
4. APIP-1020 — ChangeSpec Schema Design and Validation Spike
5. APIP-1031 — Implementation Graph Skeleton
5a. APIP-1032 — Change Loop with Model Dispatch
6. APIP-1050 — Review Graph with Parallel Fan-Out Workers
7. APIP-1060 — QA Graph with Autonomous Verdict
8. APIP-1070 — Merge Graph with Learnings Extraction
9. APIP-3010 — Change Telemetry Table and Instrumentation
10. APIP-3020 — Model Affinity Profiles Table and Pattern Miner Cron
11. APIP-3040 — Learning-Aware Model Router
12. APIP-3070 — Cold Start Bootstrapping and Exploration Budget

## Key Risks

| Risk ID | Description | Severity | Affected Stories |
|---------|-------------|----------|------------------|
| RISK-001 | Cheap models produce incorrect code that passes micro-verify but fails QA | high | APIP-1032, APIP-3040, APIP-3030 |
| RISK-002 | Diff Planner produces poor ChangeSpec decompositions | high | APIP-1020, APIP-1032 |
| RISK-009 | Runaway token costs per story without budget hard-cap | high | APIP-0040, APIP-1032 |

## Next Steps

1. Begin Phase 0: Foundation work with story APIP-0010
2. Establish work queue and supervisor graph
3. Deploy LangGraph platform
4. Implement model router with cost controls
5. Proceed to Phase 1: Full Worker Graphs
