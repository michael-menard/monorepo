# Platform Stories — Parallel Work Order

Stories grouped by dependencies showing what can be worked in parallel.

**Legend:**
- ✅ = Done (UAT verified)
- 🔍 = Ready for QA
- 🚧 = In Progress
- ⏸️ = Blocked
- ⏳ = Ready to Start
- 📝 = In Elaboration

---

## Batch 1 — Foundation (14 stories, all parallel)

**All can start immediately. Work on highest priority first.**

### Priority P0 (Do these first):

| ☑ | # | Story ID | Title | Status | Notes |
|---|---|----------|-------|--------|-------|

### Priority P1:

| ☑ | # | Story ID | Title | Status | Notes |
|---|---|----------|-------|--------|-------|

### Priority P2:

| ☑ | # | Story ID | Title | Status | Notes |
|---|---|----------|-------|--------|-------|

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G1 | GATE-01 | E2E: Validate Foundation | ⏸️ | All Batch 1 stories | **HARD GATE** — DB schemas exist, adapters load, doc-sync skill runs, migrations apply. Blocks Batch 2. |

---

## Batch 2 — LNGG Adapters (3 stories, all parallel)

**⚡ CRITICAL PATH - Wait for Story #5 (LNGG-0010), then do all in parallel**

| ☑ | # | Story ID | Title | Status | Blocks | Dependencies |
|---|---|----------|-------|--------|--------|--------------|

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G2 | GATE-02 | E2E: Validate LNGG Adapters | ⏸️ | GATE-01, all Batch 2 | Read/write YAML stories, move stages, create checkpoints against real files. Blocks Batch 3. |

---

## Batch 3 — Schema & Core Services (8 stories)

**Wait for WINT-0010 (#4), then all can be done in parallel**

### Sub-batch 3A — Schema Alignment (Priority P0):

| ☑ | # | Story ID | Title | Status | Dependencies | Blocks |
|---|---|----------|-------|--------|--------------|--------|

### Sub-batch 3B — Additional Tables (Priority P1):

| ☑ | # | Story ID | Title | Status | Dependencies | Blocks |
|---|---|----------|-------|--------|--------------|--------|
| [❌] | 31 | ~~WINT-0050~~ | ~~ML Pipeline Tables~~ | ❌ CANCELLED | WINT-0010 (#4) | Duplicate of WINT-0010 |

### Sub-batch 3C — Model Interface (Priority P2):

| ☑ | # | Story ID | Title | Status | Dependencies |
|---|---|----------|-------|--------|--------------|

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G3 | GATE-03 | E2E: Validate Schema & Services | ⏸️ | GATE-02, all Batch 3 | All DB tables created, migrations run clean, schema types compile, model interface resolves providers. Blocks Batch 4. |

---

## Batch 4 — Agent & Services (4 stories)

**Can start after respective Batch 1 completions**

| ☑ | # | Story ID | Title | Status | Dependencies | Priority |
|---|---|----------|-------|--------|--------------|----------|

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G4 | GATE-04 | E2E: Validate Agents & Services | ⏸️ | GATE-03, all Batch 4 | doc-sync agent runs end-to-end, KBAR schema validates, model selector picks providers, MiniMax adapter connects. Blocks Batch 5. |

---

## Batch 5 — User Flows & Infrastructure (3 stories)

**Lower priority, can be deferred**

| ☑ | # | Story ID | Title | Status | Dependencies | Priority |
|---|---|----------|-------|--------|--------------|----------|

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G5 | GATE-05 | E2E: Validate User Flows & Infra | ⏸️ | GATE-04, all Batch 5 | User flow schema loads, event SDK fires events, S3/MinIO client reads/writes objects. Blocks Batch 6. |

---

## Batch 6 — LangGraph Types Foundation (4 stories)

**⚡ CRITICAL - Must complete in sequence**

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G6 | GATE-06 | E2E: Validate LangGraph Types | ⏸️ | GATE-05, all Batch 6 | LNGG integration tests pass, shared TS types compile across packages, MCP story tools CRUD operations work. Blocks Batch 7. |

---

## Batch 7 — MCP Tools & Status (8 stories)

**Can start after respective table stories complete**

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | 43 | WINT-0170 | Add Doc-Sync Gate | ⏳ | WINT-0160 (#21) | |
| [ ] | 44 | WINT-1130 | Track Worktree-to-Story Mapping in DB | ⏳ | WINT-0020 (#19) | |

**Lower priority:**

| ☑ | # | Story ID | Title | Status | Dependencies |
|---|---|----------|-------|--------|--------------|
| [ ] | 45 | WINT-0210 | Populate Role Pack Templates | ⏸️ | #11, #25 |

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G7 | GATE-07 | E2E: Validate MCP Tools | ⏸️ | GATE-06, all Batch 7 | All MCP tools respond to real queries, story status populates from dirs, context cache reads/writes, worktree mapping tracks. Blocks Batch 8. |

---

## Batch 8 — Pre-LangGraph Prep (8 stories)

**Wait for WINT-1100 (#35) to complete first**

| ☑ | # | Story ID | Title | Status | Dependencies | Priority |
|---|---|----------|-------|--------|--------------|----------|
| [ ] | 47 | WINT-1110 | Migrate Existing LangGraph Data ⚡ | ⏳ | WINT-1090 (#34) | P0 |
| [ ] | 48 | WINT-1010 | Create Compatibility Shim Module ⚡ | ⏳ | WINT-0090 (#36) | P0 |
| [ ] | 49 | KBAR-0040 | Artifact Sync Functions | ⏳ | KBAR-0030 (#37) | P1 |
| [ ] | 50 | WINT-1140 | Integrate Worktree into dev-implement-story | ⏸️ | WINT-1130 (#44) | P1 |
| [ ] | 51 | WINT-1150 | Integrate Worktree Cleanup into Completion | ⏸️ | WINT-1130 (#44) | P1 |
| [ ] | 52 | WINT-1070 | Deprecate stories.index.md | ⏳ | WINT-1030 (#38) | P2 |
| [ ] | 53 | WINT-1040 | Update story-status to Use DB | ⏸️ | #48, #38 | P2 |
| [ ] | 54 | WINT-1050 | Update story-update to Use DB | ⏸️ | #48, #38 | P2 |
| [ ] | 55 | WINT-1060 | Update story-move to Use DB | ⏸️ | #48, #38 | P2 |
| [ ] | 56 | KBAR-0050 | CLI Sync Commands | ⏸️ | KBAR-0040 (#49) | P2 |

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G8 | GATE-08 | E2E: Validate Pre-LangGraph Prep | ⏸️ | GATE-07, all Batch 8 | LangGraph data migrated, compat shim resolves old → new, story-status/update/move work via DB, worktree integrations function. Blocks Batch 9. |

---

## Batch 9 — Shared Business Logic (7 stories)

**🎯 MILESTONE: Foundation for all LangGraph nodes**

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | 57 | WINT-9010 | Create Shared Business Logic Package ⚡ 🎯 | ⏳ | WINT-1100 (#35) | **CRITICAL - Blocks all LangGraph nodes** |

**Can do in parallel after dependencies:**

| ☑ | # | Story ID | Title | Status | Dependencies | Priority |
|---|---|----------|-------|--------|--------------|----------|
| [ ] | 58 | KBAR-0060 | Sync Integration Tests | ⏸️ | KBAR-0050 (#56) | P1 |
| [ ] | 59 | WINT-1160 | Add Parallel Work Conflict Prevention | ⏸️ | #50, #51 | P2 |
| [ ] | 60 | WINT-1120 | Validate Foundation Phase | ⏸️ | #53-55, #47, #59, #52 | P2 |
| [ ] | 61 | WINT-7020 | Create Agent Migration Plan | ⏳ | WINT-7010 (#14) 🚧 | P3 |
| [ ] | 62 | MODL-0040 | Model Leaderboards | ⏳ | MODL-0030 (#46) | P3 |
| [ ] | 63 | AUDT-0020 | 9 Audit Lens Nodes | ⏳ | AUDT-0010 (#9) ✅ | P3 |

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G9 | GATE-09 | E2E: Validate Business Logic | ⏸️ | GATE-08, all Batch 9 | Shared business logic package imports clean, foundation phase validated, parallel conflict prevention works, audit lens nodes execute. Blocks Batch 10. |

---

## Batch 10 — First LangGraph Nodes (8 stories)

**Wait for WINT-9010 (#57)**

| ☑ | # | Story ID | Title | Status | Dependencies | Priority |
|---|---|----------|-------|--------|--------------|----------|
| [ ] | 64 | WINT-9020 | Create doc-sync LangGraph Node ⚡ | ⏸️ | #57, #21 | P0 |
| [ ] | 65 | WINT-4080 | Create scope-defender Agent (DA) | ⏳ | None (can start anytime) | P1 |
| [ ] | 66 | WINT-4090 | Create evidence-judge Agent | ⏳ | None (can start anytime) | P1 |
| [ ] | 67 | KBAR-0070 | story_get Tool | ⏸️ | KBAR-0060 (#58) | P2 |
| [ ] | 68 | KBAR-0080 | story_list & story_update Tools | ⏸️ | KBAR-0070 (#67) | P2 |
| [ ] | 69 | WINT-0190 | Create Patch Queue Pattern and Schema | ⏳ | WINT-0180 (#11) | P3 |
| [ ] | 70 | WINT-0240 | Configure Ollama Model Fleet | ⏳ | WINT-0220 (#12) | P3 |
| [ ] | 71 | WINT-0250 | Define Escalation Triggers | ⏸️ | #12, #28 | P3 |

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G10 | GATE-10 | E2E: Validate First LangGraph Nodes | ⏸️ | GATE-09, all Batch 10 | doc-sync LangGraph node processes real file changes, scope-defender and evidence-judge agents produce verdicts, KBAR story tools CRUD. Blocks Batch 11. |

---

## Batch 11 — KBAR Tools (9 stories)

**⚡ CRITICAL PATH - Sequential chain, then parallel**

### Sequential KBAR Tool Chain:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | 72 | KBAR-0090 | story_ready_to_start Tool ⚡ | ⏸️ | KBAR-0080 (#68) | Step 1 |
| [ ] | 73 | KBAR-0100 | Story Tools Integration Tests ⚡ | ⏸️ | KBAR-0090 (#72) | Step 2 |
| [ ] | 74 | KBAR-0110 | artifact_write Tool ⚡ | ⏸️ | KBAR-0100 (#73) | Step 3 |
| [ ] | 75 | KBAR-0120 | artifact_read Tool ⚡ | ⏸️ | KBAR-0110 (#74) | Step 4 |
| [ ] | 76 | KBAR-0130 | artifact_search Tool ⚡ | ⏸️ | KBAR-0110 (#74) | Step 4 (parallel with #75) |
| [ ] | 77 | KBAR-0140 | Artifact Summary Extraction ⚡ | ⏸️ | #75, #76 | Step 5 |
| [ ] | 78 | KBAR-0150 | Artifact Tools Integration Tests ⚡ | ⏸️ | KBAR-0140 (#77) | Step 6 |

### Parallel (lower priority):

| ☑ | # | Story ID | Title | Status | Dependencies |
|---|---|----------|-------|--------|--------------|
| [ ] | 79 | AUDT-0030 | Audit Orchestration Nodes | ⏸️ | AUDT-0020 (#63) |
| [ ] | 80 | TELE-0010 | Docker Telemetry Stack | ⏳ | INFR-0040 (#2) |

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G11 | GATE-11 | E2E: Validate KBAR Tools | ⏸️ | GATE-10, all Batch 11 | Full KBAR tool chain: story_get → story_list → story_ready_to_start → artifact_write → artifact_read → artifact_search all work against real DB. Blocks Batch 12. |

---

## Batch 12 — Context & Session (10 stories)

**Two parallel tracks**

### Track A — Context/Session LangGraph (Sequential):

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | 81 | WINT-2090 | Implement Session Context Management ⚡ | ⏳ | WINT-0110 (#40) | Step 1 |
| [ ] | 82 | WINT-2100 | Create session-manager Agent ⚡ | ⏸️ | WINT-2090 (#81) | Step 2 |
| [ ] | 83 | WINT-9090 | Create Context Cache LangGraph Nodes ⚡ | ⏸️ | #57, #82 | Step 3 |

### Track B — KBAR Agent Updates (Sequential):

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | 84 | KBAR-0160 | Update Setup & Plan Leaders | ⏸️ | KBAR-0150 (#78) | Step 1 |
| [ ] | 85 | KBAR-0170 | Update Execute & Worker Agents | ⏸️ | KBAR-0160 (#84) | Step 2 |
| [ ] | 86 | KBAR-0180 | Update Code Review Agents | ⏸️ | KBAR-0160 (#84) | Step 2 (parallel with #85) |
| [ ] | 87 | KBAR-0190 | Update QA & Fix Agents | ⏸️ | #85, #86 | Step 3 |
| [ ] | 88 | KBAR-0200 | Update Knowledge Context Loader | ⏸️ | KBAR-0190 (#87) | Step 4 |
| [ ] | 89 | KBAR-0210 | Update Orchestrator Commands | ⏸️ | KBAR-0200 (#88) | Step 5 |
| [ ] | 90 | KBAR-0220 | Agent Migration Testing | ⏸️ | KBAR-0210 (#89) | Step 6 |

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G12 | GATE-12 | E2E: Validate Context & Session | ⏸️ | GATE-11, all Batch 12 | Session context persists across invocations, cache nodes warm/read, all migrated agents pass their existing test suites. Blocks Batch 13. |

---

## Batch 13 — LangGraph Operational! (6 stories)

**🎉 FINAL PUSH before transition to LangGraph**

### Sequential LangGraph Validation:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | 91 | WINT-9110 | Create Full Workflow LangGraph Graphs ⚡ 🎯 | ⏸️ | Requires 9020-9100 nodes | **THE BIG ONE** |
| [ ] | 92 | WINT-9120 | Create Workflow Parity Test Suite ⚡ | ⏸️ | WINT-9110 (#91) | Validate workflow |
| [ ] | 93 | WINT-9130 | Document Migration Path ⚡ | ⏸️ | WINT-9120 (#92) | Documentation |
| [ ] | 94 | WINT-9140 | Validate LangGraph Parity Phase ⚡ 🎉 | ⏸️ | #92, #93 | **TRANSITION POINT** |

### Parallel:

| ☑ | # | Story ID | Title | Status | Dependencies |
|---|---|----------|-------|--------|--------------|
| [ ] | 95 | KBAR-0230 | DB-Driven Index Generation | ⏸️ | KBAR-0220 (#90) |
| [ ] | 96 | KBAR-0240 | Regenerate Index CLI | ⏸️ | KBAR-0230 (#95) |

### E2E Gate:

| ☑ | # | Story ID | Title | Status | Dependencies | Notes |
|---|---|----------|-------|--------|--------------|-------|
| [ ] | G13 | GATE-13 | E2E: Validate LangGraph Operational | ⏸️ | GATE-12, all Batch 13 | **FINAL GATE** — Full workflow runs E2E in LangGraph: story creation → elaboration → implementation → QA → completion. Parity with Claude Code workflow confirmed. |

---

# 🎉 TRANSITION: Stories 97-236 can now be done in LangGraph!

Once story #94 (WINT-9140) is complete and validated, you can switch to working FROM the LangGraph workflow for all remaining stories!

---

## Progress Tracking

**Current Status Summary:**
- ✅ UAT Verified: 46 stories (AUDT-0010, INFR-0020, INFR-0030, INFR-0040, INFR-0041, INFR-0050, INFR-0110, INFR-0120, KBAR-0010, KBAR-0020, KBAR-0030, LNGG-0010, LNGG-0020, LNGG-0030, LNGG-0040, LNGG-0050, LNGG-0060, LNGG-0070, MODL-0010, MODL-0011, MODL-0020, MODL-0030, MODL-0050, WINT-0010, WINT-0020, WINT-0030, WINT-0040, WINT-0060, WINT-0070, WINT-0080, WINT-0090, WINT-0100, WINT-0110, WINT-0130, WINT-0150, WINT-0160, WINT-0180, WINT-0200, WINT-0220, WINT-0230, WINT-1020, WINT-1030, WINT-1080, WINT-1090, WINT-1100, WINT-7010)
- 🔍 Ready for QA: 0 stories
- 🚧 In Progress: 0 stories
- ⏸️ Blocked: remaining stories (waiting on dependencies)

**Active Stories: 46 tracked**

**Critical Path Tracking:**
- [~] LNGG-0010 in progress → Unblocks Batch 2 (3 stories)
- [🔍] WINT-0010 ready for QA → Once verified, unblocks Batch 3 (8 stories)
- [ ] WINT-1100 complete → Unblocks WINT-9010 (CRITICAL)
- [ ] WINT-9010 complete → Unblocks all LangGraph nodes
- [ ] WINT-9110 complete → LangGraph operational! 🎉

**Next Actions:**
1. Complete QA on WINT-0010 → unblocks Batch 3 (8 stories)
2. Complete LNGG-0010 implementation → unblocks Batch 2 (3 stories)
3. Complete QA on WINT-0150 → unblocks WINT-0160 (doc-sync Agent)
4. Start KBAR-0020 (now unblocked by KBAR-0010 ✅)
5. Start WINT-0230 (now unblocked by WINT-0220 ✅)
6. Start INFR-0120 (Review/QA Artifact Schemas - second part of INFR-0010 split, INFR-0110 complete ✅)

---

## Quick Reference: Maximum Parallelism

| Phase | Max Parallel | Bottleneck | Notes |
|-------|--------------|------------|-------|
| Batch 1 | 14 stories | None | Start all P0 first |
| Batch 4-5 | 4-7 stories | Various | Staggered starts |
| Batch 7 | 8 stories | Table completions | Multiple parallel tracks |
| Batch 9 | 1 + 6 | WINT-9010 first | Then 6 parallel |
| Batch 10 | 3-5 stories | WINT-9010 | Some ready immediately |
| Batch 11 | 1-2 stories | Sequential chain | 7-story sequence |
| Batch 12 | 2 tracks | Parallel tracks | 3 + 7 stories |
| Batch 13 | 2 tracks | WINT-9110 | 4 sequential + 2 parallel |
