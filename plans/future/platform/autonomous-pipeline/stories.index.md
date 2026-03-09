# autonomous-pipeline Story Index

**Plan Slug**: autonomous-pipeline
**Feature Directory**: plans/future/platform/autonomous-pipeline
**Prefix**: APIP
**Project Name**: autonomous-pipeline
**Generated**: 2026-02-25T00:00:00Z
**Last Reconciled**: 2026-03-02

## Progress Summary

| Phase | Name | Total Stories | Completed | In Progress | Remaining | Status |
|-------|------|---------------|-----------|-------------|-----------|--------|
| 0 | Foundation | 10 | 7 | 0 | 3 | near-complete |
| 1 | Full Worker Graphs | 10 | 7 | 0 | 3 | near-complete |
| 2 | Resilience & Monitoring | 3 | 3 | 0 | 0 | complete |
| 3 | Learning System & Optimization | 9 | 9 | 0 | 0 | complete |
| 4 | Long-Term Quality | 7 | 6 | 0 | 1 | near-complete |
| 5 | Pipeline Resilience | 3 | 2 | 0 | 1 | near-complete |
| **TOTAL** | | **42** | **34** | **0** | **8** | |

## Phase 0: Foundation (10 stories)

Minimal autonomous loop: Work queue, supervisor loop (plain TypeScript), LangGraph deployment, model router, and supporting infrastructure (test framework, test database, secrets engine, server provisioning, schema versioning).

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-0010 | BullMQ Work Queue Setup | none | UAT |
| APIP-0020 | Supervisor Loop (Plain TypeScript) | APIP-0010 | ✅ Completed |
| APIP-0030 | LangGraph Platform Docker Deployment | APIP-5006 | ✅ Completed |
| APIP-0040 | Model Router v1 with Rate Limiting and Token Budgets | APIP-0010 | UAT |
| APIP-5000 | Test Infrastructure Setup for Autonomous Pipeline Unit Testing (Phase 0) | APIP-0010 | UAT |
| APIP-5001 | Test Database Setup and Migration Testing | none | ✅ Completed |
| APIP-5003 | LangGraph Platform Security Hardening and Network Boundary Documentation | none | ✅ Completed |
| APIP-5004 | Secrets Engine and API Key Management | none | ✅ Completed |
| APIP-5006 | LangGraph Server Infrastructure Baseline | none | UAT |
| APIP-5007 | Database Schema Versioning and Migration Strategy | APIP-0010 | ✅ Completed |

## Phase 1: Full Worker Graphs (10 stories)

Structured stories, diff planner, implementation loop, review, QA, merge, documentation graphs, E2E testing, and minimal operator CLI.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-1010 | Structurer Node in Elaboration Graph | none | ✅ Completed |
| APIP-1020 | ChangeSpec Schema Design and Validation Spike | APIP-1010 | ✅ Completed |
| APIP-1031 | Implementation Graph Skeleton with Worktree and Evidence Infrastructure | APIP-1020, APIP-0040 | ✅ UAT |
| APIP-1032 | Change Loop with Model Dispatch, Micro-Verify, and Atomic Commits | APIP-1031, APIP-1020, APIP-0040 | ✅ UAT |
| APIP-1040 | Documentation Graph (Post-Merge) | APIP-1032 | ✅ Completed |
| APIP-1050 | Review Graph with Parallel Fan-Out Workers | APIP-1032 | ✅ Completed |
| APIP-1060 | QA Graph with Autonomous Verdict | none | ✅ Completed |
| APIP-1070 | Merge Graph with Learnings Extraction | none | UAT |
| APIP-5002 | E2E Test Plan and Playwright Framework Setup | APIP-0010, APIP-1010, APIP-1020, APIP-1032, APIP-1070 | 🧪 UAT |
| APIP-5005 | Minimal Operator Visibility CLI | APIP-0010, APIP-1070 | UAT |

## Phase 2: Resilience & Monitoring (3 stories)

Blocked queue handling, monitor dashboard UI, and graceful shutdown.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-2010 | Blocked Queue and Notification System | none | ✅ Completed |
| APIP-2020 | Monitor UI v1 (Read-Only Dashboard) | APIP-2010 | ✅ Completed |
| APIP-2030 | Graceful Shutdown, Health Check, and Deployment Hardening | none | ✅ Completed |

## Phase 3: Learning System & Optimization (9 stories)

Change telemetry, model affinity profiles, smart routing, bake-off engine, concurrency, and cron infrastructure.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-3010 | Change Telemetry Table and Instrumentation | APIP-1032 | ✅ Completed |
| APIP-3020 | Model Affinity Profiles Table and Pattern Miner Cron | APIP-3010 | ✅ Completed |
| APIP-3030 | Learning-Aware Diff Planner | APIP-3020, APIP-1020 | ✅ Completed |
| APIP-3040 | Learning-Aware Model Router | APIP-3020 | ✅ Completed |
| APIP-3050 | Story Structurer Feedback (Affinity-Guided) | APIP-3020, APIP-1010 | UAT |
| APIP-3060 | Bake-Off Engine for Model Experiments | APIP-3020, APIP-3010 | UAT |
| APIP-3070 | Cold Start Bootstrapping and Exploration Budget | APIP-3040 | ✅ UAT |
| APIP-3080 | Parallel Story Concurrency (2-3 Worktrees) | none | ✅ Completed |
| APIP-3090 | Cron Job Infrastructure | APIP-3020 | ✅ Completed |

## Phase 4: Long-Term Quality (7 stories)

Codebase health gate, cohesion scanner, dependency auditor, test quality monitor, dead code reaper, KB freshness, and weekly reports.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-4010 | Codebase Health Gate | — | ✅ Completed |
| APIP-4020 | Cohesion Scanner | APIP-3090 | UAT |
| APIP-4030 | Dependency Auditor | — | ✅ Completed |
| APIP-4040 | Test Quality Monitor | APIP-3090 | UAT |
| APIP-4050 | Dead Code Reaper | APIP-3090 | ✅ Completed |
| APIP-4060 | KB Freshness Check and Stale Entry Archival | APIP-3090 | ✅ Completed |
| APIP-4070 | Weekly Pipeline Health Report | APIP-3020, APIP-2010 | ✅ Completed |

## Phase 5: Pipeline Resilience (3 stories)

Artifact validation gates, stuck story recovery, and KB-filesystem state reconciliation to eliminate stories getting permanently stuck in the pipeline.

| ID | Title | Dependencies | Status |
|---|---|---|---|
| APIP-6001 | Pipeline Phase Gate Validation | none | 🧪 UAT |
| APIP-6002 | Stuck Story Recovery Loop | APIP-6001 | ✅ UAT |
| APIP-6003 | KB-Filesystem State Reconciliation | APIP-6001 | 🔧 Ready to Work |

## Metrics Summary

- **Total Stories**: 42
- **Completed**: 34 (81%)
- **UAT**: 10 (APIP-0010, APIP-0040, APIP-1031, APIP-1032, APIP-1070, APIP-3050, APIP-3060, APIP-3070, APIP-4020, APIP-4040, APIP-5000, APIP-5002, APIP-5006, APIP-6001, APIP-6002)
- **Ready to Work**: 1 (APIP-6003)
- **Cancelled**: 1 (APIP-1030, superseded by APIP-1031/1032)

## Critical Path (Remaining)

The only remaining work to reach full autonomous pipeline:

1. APIP-6003 — KB-Filesystem State Reconciliation (ready to work, blocked by APIP-6001 UAT acceptance)
