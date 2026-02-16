# LangGraph Fast-Track Priority Order

**Goal:** Get LangGraph operational ASAP to transition off Claude Code

## Critical Path to LangGraph Parity (96 stories)

### Phase 1: Foundation & Adapters (Waves 1-2, Stories 1-32)
**Status:** Must do in Claude Code

#### Wave 1 - Foundation (14 stories)
- Keep as-is, all are needed

#### Wave 2 - LNGG & Schema Alignment (18 stories) ⚡ PRIORITY BOOST
Reorder to prioritize:
1. **LNGG-0020** - Index Management Adapter
2. **LNGG-0040** - Stage Movement Adapter
3. **LNGG-0060** - Checkpoint Adapter
4. **WINT-1080** - Reconcile WINT Schema with LangGraph
5. **WINT-0020** - Create Story Management Tables
6. **WINT-0070** - Create Workflow Tracking Tables
7. **WINT-0160** - Create doc-sync Agent
8. INFR-0020 - Artifact Writer/Reader Service
9. KBAR-0020 - Schema Tests & Validation
10. MODL-0020 - Task Contracts & Model Selector
11. Others (defer)

### Phase 2: Types & MCP (Wave 3, Stories 33-46)
**Status:** Must do in Claude Code

#### Wave 3 - Get to WINT-1100 ⚡ CRITICAL
Prioritize:
1. **LNGG-0070** - Integration Test Suite
2. **WINT-1090** - Update LangGraph Repos for Unified Schema
3. **WINT-1100** - Create Shared TypeScript Types ← **ENABLES WINT-9010**
4. **WINT-0090** - Create Story Management MCP Tools
5. KBAR-0030 - Story Sync Functions
6. WINT-1030 - Populate Story Status from Directories
7. Others (defer to post-LangGraph)

### Phase 3: Pre-LangGraph Prep (Wave 4, Stories 47-56)
**Status:** Must do in Claude Code

#### Wave 4 - Database Migration & Shim
Prioritize:
1. **WINT-1110** - Migrate Existing LangGraph Data
2. **WINT-1010** - Create Compatibility Shim Module
3. KBAR-0040 - Artifact Sync Functions
4. WINT-1140/1150 - Worktree integration
5. Others

### Phase 4: Shared Business Logic (Wave 5, Stories 57-63)
**Status:** Must do in Claude Code

#### Wave 5 - **MILESTONE: WINT-9010** 🎯
1. **WINT-9010** - Create Shared Business Logic Package ← **Foundation for all LangGraph nodes**
2. KBAR-0060 - Sync Integration Tests
3. WINT-1120 - Validate Foundation Phase
4. Others

### Phase 5: Initial LangGraph Nodes (Wave 6, Stories 64-71)
**Status:** Must do in Claude Code

#### Wave 6 - First Nodes
1. **WINT-9020** - Create doc-sync LangGraph Node
2. WINT-4080 - Create scope-defender Agent
3. WINT-4090 - Create evidence-judge Agent
4. KBAR-0070/0080 - Story tools

### Phase 6: KBAR Tools (Wave 7, Stories 72-80)
**Status:** Must do in Claude Code

#### Wave 7 - Complete KBAR Tooling ⚡
All KBAR stories are critical:
1. KBAR-0090 - story_ready_to_start Tool
2. KBAR-0100 - Story Tools Integration Tests
3. KBAR-0110 - artifact_write Tool
4. KBAR-0120 - artifact_read Tool
5. KBAR-0130 - artifact_search Tool
6. KBAR-0140 - Artifact Summary Extraction
7. KBAR-0150 - Artifact Tools Integration Tests

### Phase 7: Workflow Nodes (Wave 8, Stories 81-90)
**Status:** Must do in Claude Code

#### Wave 8 - Context & Session
1. **WINT-2090** - Implement Session Context Management
2. **WINT-2100** - Create session-manager Agent
3. **WINT-9090** - Create Context Cache LangGraph Nodes
4. KBAR-0160-0220 - Agent updates

### Phase 8: Complete LangGraph (Wave 9, Stories 91-96)
**Status:** Must do in Claude Code

#### Wave 9 - **MILESTONE: LangGraph Operational** 🎉
1. **WINT-9110** - Create Full Workflow LangGraph Graphs ← **THE BIG ONE**
2. **WINT-9120** - Create Workflow Parity Test Suite
3. **WINT-9130** - Document Migration Path
4. **WINT-9140** - Validate LangGraph Parity Phase
5. KBAR-0230/0240 - Index generation

---

## 🎉 TRANSITION POINT (Story #96)

**LangGraph is now operational!**

All remaining 140 stories can be completed FROM LangGraph instead of Claude Code.

---

## Deferred Work (Stories 97-236) - Do FROM LangGraph

### Can Complete in LangGraph:
- **Wave 10-11:** Context caching, graph & cohesion (23 stories)
- **Wave 12:** Remaining LangGraph nodes (4 stories)
- **Wave 13:** Telemetry deep dive (12 stories)
- **Wave 14:** ML pipeline (15 stories)
- **Wave 15-16:** Batch processing (12 stories)
- **Wave 17:** Backlog management (10 stories)
- **Wave 18:** Agent migration (13 stories)
- **Wave 19-20:** LERN & SDLC epics (12 stories)
- **Wave 21-22:** Telemetry stack & misc (7 stories)
- **Wave 23-27:** AUTO epic - autonomous development (32 stories)

---

## Summary

**Critical Path Length:** 96 stories (must do in Claude Code)
**Deferred Work:** 140 stories (do in LangGraph)
**Efficiency:** 60% of work done in your own workflow! 🚀

## Key Dependencies for LangGraph Parity

```
WINT-0010 (schemas)
  └─> WINT-1080 (reconcile with LangGraph)
       └─> WINT-1090 (update repos)
            └─> WINT-1100 (shared TypeScript types)
                 └─> WINT-9010 (shared business logic) ← **CRITICAL**
                      └─> WINT-9020/9090/etc (LangGraph nodes)
                           └─> WINT-9110 (full workflow graphs) ← **GOAL**
                                └─> WINT-9120/9130/9140 (validation)
```

## Recommended Implementation Order

1. **Start NOW:** Wave 1 stories (already in progress)
2. **Next:** Complete LNGG adapters (Wave 2, stories 15-17)
3. **Then:** Fast-track to WINT-1100 (Wave 3, story 35)
4. **Build:** WINT-9010 shared business logic (Wave 5, story 57)
5. **Create:** Basic LangGraph nodes (Waves 6-8)
6. **Complete:** Full workflow (Wave 9, story 91)
7. **🎉 Switch to LangGraph** for all remaining work!
