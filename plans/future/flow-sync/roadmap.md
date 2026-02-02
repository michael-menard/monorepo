---
doc_type: roadmap
title: "FLOW — Story Roadmap"
status: active
story_prefix: "FLOW"
created_at: "2026-02-01T14:30:00Z"
updated_at: "2026-02-01T14:30:00Z"
---

# FLOW — Story Roadmap

Visual representation of story dependencies, execution order, and critical path analysis.

---

## Dependency Graph

Shows which stories block downstream work. Green = Ready to start | Yellow = Blocked | Blue = Done

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: Foundation"]
        S001["FLOW-001<br/>State Enum"]
        S002["FLOW-002<br/>Update GraphState"]
        S003["FLOW-003<br/>Story Schema"]
        S004["FLOW-004<br/>Context Schema"]
        S005["FLOW-005<br/>Evidence Schema"]
        S006["FLOW-006<br/>Plan Schema"]
        S007["FLOW-007<br/>Verification"]
    end

    subgraph Phase2["Phase 2: Database"]
        S008["FLOW-008<br/>Story Repo"]
        S009["FLOW-009<br/>Workflow Repo"]
        S010["FLOW-010<br/>Load Node"]
        S011["FLOW-011<br/>Save Node"]
    end

    subgraph Phase3["Phase 3: KB"]
        S012["FLOW-012<br/>Verify KB Read"]
        S013["FLOW-013<br/>KB Write Node"]
    end

    subgraph Phase4["Phase 4: Graph"]
        S014["FLOW-014<br/>Story Creation"]
        S015["FLOW-015<br/>Elaboration"]
        S016["FLOW-016<br/>Exports"]
    end

    subgraph Phase5["Phase 5: Testing"]
        S017["FLOW-017<br/>Story Repo Tests"]
        S018["FLOW-018<br/>Workflow Tests"]
        S019["FLOW-019<br/>KB Write Tests"]
        S020["FLOW-020<br/>E2E Story"]
        S021["FLOW-021<br/>E2E Elaboration"]
    end

    %% Phase 1 dependencies
    S001 --> S002
    S001 --> S003

    %% Phase 2 dependencies
    S001 --> S008
    S003 --> S008
    S004 --> S009
    S005 --> S009
    S006 --> S009
    S007 --> S009
    S008 --> S010
    S008 --> S011
    S009 --> S010
    S009 --> S011

    %% Phase 3 dependencies
    S012 --> S013

    %% Phase 4 dependencies
    S010 --> S014
    S011 --> S014
    S013 --> S014
    S010 --> S015
    S011 --> S015
    S008 --> S016
    S009 --> S016
    S010 --> S016
    S011 --> S016
    S013 --> S016

    %% Phase 5 dependencies
    S008 --> S017
    S009 --> S018
    S013 --> S019
    S014 --> S020
    S017 --> S020
    S018 --> S020
    S015 --> S021
    S017 --> S021
    S018 --> S021

    %% Styling
    classDef ready fill:#90EE90,stroke:#228B22,stroke-width:2px
    classDef blocked fill:#FFE4B5,stroke:#FFA500,stroke-width:2px
    classDef done fill:#87CEEB,stroke:#4682B4,stroke-width:2px

    class S001,S004,S005,S006,S007,S012 ready
    class S002,S003,S008,S009,S010,S011,S013,S014,S015,S016,S017,S018,S019,S020,S021 blocked
```

---

## Completion Order (Gantt View)

Timeline showing realistic story execution sequence with phase boundaries:

```mermaid
gantt
    title FLOW Story Execution Order
    dateFormat YYYY-MM-DD

    section Phase 1: Foundation
    FLOW-001 Enum           :s001, 2026-02-03, 1d
    FLOW-004 Context        :s004, 2026-02-03, 1d
    FLOW-005 Evidence       :s005, 2026-02-03, 1d
    FLOW-006 Plan           :s006, 2026-02-03, 1d
    FLOW-007 Verification   :s007, 2026-02-03, 1d
    FLOW-012 KB Read        :s012, 2026-02-03, 1d

    section Phase 1 Cont
    FLOW-002 GraphState     :s002, after s001, 1d
    FLOW-003 Story Schema   :s003, after s001, 1d

    section Phase 2: Database
    FLOW-008 Story Repo     :s008, after s003, 2d
    FLOW-009 Workflow Repo  :s009, after s007, 2d
    FLOW-010 Load Node      :s010, after s009, 1d
    FLOW-011 Save Node      :s011, after s009, 1d

    section Phase 3: KB
    FLOW-013 KB Write       :s013, after s012, 1d

    section Phase 4: Graph
    FLOW-014 Story Graph    :s014, after s013, 2d
    FLOW-015 Elab Graph     :s015, after s011, 2d
    FLOW-016 Exports        :s016, after s015, 1d

    section Phase 5: Testing
    FLOW-017 Story Tests    :s017, after s008, 2d
    FLOW-018 Workflow Tests :s018, after s009, 2d
    FLOW-019 KB Tests       :s019, after s013, 1d
    FLOW-020 E2E Story      :s020, after s018, 2d
    FLOW-021 E2E Elab       :s021, after s020, 2d
```

---

## Critical Path

The longest chain of dependent stories that determines minimum project duration:

```
FLOW-001 (State Enum)
  ↓
FLOW-003 (Story Schema)
  ↓
FLOW-008 (Story Repository)
  ↓
FLOW-009 (Workflow Repository)
  ↓
FLOW-010 (Load Node)
  ↓
FLOW-014 (Story Creation Graph)
  ↓
FLOW-020 (E2E Story Creation)
```

**Critical path length:** 7 stories
**Estimated duration:** 10-12 working days (assuming 1-2 days per story)

---

## Parallel Opportunities

Stories that can be worked simultaneously (grouped by dependency wave):

| Wave | Group | Stories | After | Max Parallel |
|------|-------|---------|-------|--------------|
| 1 | Group 1 | FLOW-001, FLOW-004, FLOW-005, FLOW-006, FLOW-007, FLOW-012 | — (start) | 6 |
| 2 | Group 2 | FLOW-002, FLOW-003 | Group 1 | 2 |
| 3 | Group 3 | FLOW-008, FLOW-009 | Group 2 | 2 |
| 4 | Group 4 | FLOW-010, FLOW-011, FLOW-013 | Group 3 | 3 |
| 5 | Group 5 | FLOW-014, FLOW-015, FLOW-016 | Group 4 | 3 |
| 6 | Group 6 | FLOW-017, FLOW-018, FLOW-019 | Group 5 | 3 |
| 7 | Group 7 | FLOW-020, FLOW-021 | Group 6 | 2 |

**Maximum parallelization:** 6 stories at once (Phase 1 foundation work)

**Recommended team size:** 3-4 developers for optimal throughput

---

## Risk Indicators

Stories with special concerns requiring attention:

| Story | Risk Level | Risk Description | Mitigation |
|-------|------------|------------------|-----------|
| FLOW-002 | High | Breaking change to GraphState - existing graphs may break | Plan migration strategy; test with actual orchestrator |
| FLOW-003 | High | Breaking change to story artifact schema - data migration needed | Document schema change; create migration tests |
| FLOW-007 | High | Merging two schemas (review.ts + qa-verify.ts) - data consolidation | Plan field mapping; backup before migration |
| FLOW-008 | High | Requires deployed database schema (002_workflow_tables.sql) | Coordinate with infrastructure; unblock before starting |
| FLOW-009 | High | Requires all workflow database tables - blocking for persistence | Verify schema deployment before starting |
| FLOW-013 | Medium | Deduplication threshold (0.85) may need tuning | Use configurable threshold; document tuning process |
| FLOW-014 | Medium | Graph structure changes may break existing workflows | Test with real graph instances; validate transitions |
| FLOW-015 | Medium | State transition logic (PASS→ready-to-work, FAIL→backlog) critical | Test both paths thoroughly; add comprehensive integration tests |
| FLOW-020 | Low | E2E test may be flaky without proper isolation | Use transaction rollback; mock external services |
| FLOW-021 | Low | E2E test must cover both PASS and FAIL flows | Test matrix for both scenarios |

---

## Swimlane View (By Domain)

Story grouping by technical domain:

### Core Schema Updates (Phase 1)
- FLOW-001: State Enum
- FLOW-002: GraphState Schema
- FLOW-003: Story Artifact Schema
- FLOW-004: Context Artifact Schema
- FLOW-005: Evidence Artifact Schema
- FLOW-006: Plan Artifact Schema
- FLOW-007: Verification Artifact Schema

### Database Layer (Phase 2)
- FLOW-008: Story Repository
- FLOW-009: Workflow Repository
- FLOW-010: Load from Database Node
- FLOW-011: Save to Database Node

### Knowledge Base (Phase 3)
- FLOW-012: Verify KB Read Integration
- FLOW-013: KB Write Node (persist learnings)

### Graph Wiring (Phase 4)
- FLOW-014: Update Story Creation Graph
- FLOW-015: Update Elaboration Graph
- FLOW-016: Update Module Exports

### Testing & Validation (Phase 5)
- FLOW-017: Unit Tests - Story Repository
- FLOW-018: Unit Tests - Workflow Repository
- FLOW-019: Unit Tests - KB Write Node
- FLOW-020: Integration Tests - Story Creation
- FLOW-021: Integration Tests - Elaboration

---

## Quick Reference

| Metric | Value | Notes |
|--------|-------|-------|
| Total Stories | 21 | Across 5 phases |
| Ready to Start | 6 | FLOW-001, 004-007, 012 |
| In Flight (Blocked) | 15 | Depend on earlier stories |
| Critical Path Length | 7 stories | FLOW-001 → FLOW-020 |
| Max Parallel | 6 stories | Phase 1 foundation work |
| Phases | 5 | Foundation → Testing |
| High-Risk Stories | 6 | Schema/DB/graph changes |
| Estimated Timeline | 10-12 days | At 1-2 days per story |

---

## Dependencies Summary

### Foundation Dependencies (Phase 1)
- FLOW-001 → FLOW-002, FLOW-003
- FLOW-004, FLOW-005, FLOW-006, FLOW-007, FLOW-012 → no dependencies

### Database Dependencies (Phase 2)
- FLOW-001, FLOW-003 → FLOW-008
- FLOW-004, FLOW-005, FLOW-006, FLOW-007 → FLOW-009
- FLOW-008, FLOW-009 → FLOW-010, FLOW-011

### KB Dependencies (Phase 3)
- FLOW-012 → FLOW-013

### Graph Dependencies (Phase 4)
- FLOW-010, FLOW-011, FLOW-013 → FLOW-014, FLOW-015, FLOW-016

### Testing Dependencies (Phase 5)
- FLOW-008 → FLOW-017
- FLOW-009 → FLOW-018
- FLOW-013 → FLOW-019
- FLOW-014, FLOW-017, FLOW-018 → FLOW-020
- FLOW-015, FLOW-017, FLOW-018 → FLOW-021

---

## Update Log

| Date | Change | Stories Affected | Status |
|------|--------|------------------|--------|
| 2026-02-01 | Initial roadmap from Phase 1 analysis | All | GENERATION COMPLETE |
