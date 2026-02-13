---
doc_type: roadmap
title: "WINT — Story Roadmap"
status: active
story_prefix: "WINT"
created_at: "2026-02-09T22:30:00Z"
updated_at: "2026-02-09T22:30:00Z"
---

# WINT — Story Roadmap

Visual representation of story dependencies and execution order across 8 phases with 93 total stories.

---

## Dependency Graph

Shows which stories block downstream work.

```mermaid
flowchart LR
    subgraph Phase0["Phase 0: Bootstrap (Manual Setup)"]
        S0010["{WINT}-0010<br/>Core DB Schemas"]
        S0020["{WINT}-0020<br/>Story Tables"]
        S0030["{WINT}-0030<br/>Cache Tables"]
        S0040["{WINT}-0040<br/>Telemetry Tables"]
        S0050["{WINT}-0050<br/>ML Tables"]
        S0060["{WINT}-0060<br/>Graph Tables"]
        S0070["{WINT}-0070<br/>Workflow Tables"]
        S0080["{WINT}-0080<br/>Seed Data"]
        S0090["{WINT}-0090<br/>Story MCP"]
        S0100["{WINT}-0100<br/>Cache MCP"]
        S0110["{WINT}-0110<br/>Session MCP"]
        S0120["{WINT}-0120<br/>Telemetry MCP"]
        S0130["{WINT}-0130<br/>Graph MCP"]
        S0140["{WINT}-0140<br/>ML MCP"]
        S0150["{WINT}-0150<br/>doc-sync Skill"]
        S0160["{WINT}-0160<br/>doc-sync Agent"]
        S0170["{WINT}-0170<br/>Doc-Sync Gate"]
    end

    subgraph Phase1["Phase 1: Foundation (Single Source of Truth)"]
        S1010["{WINT}-1010<br/>Compatibility Shim"]
        S1020["{WINT}-1020<br/>Flatten Dirs"]
        S1030["{WINT}-1030<br/>Populate Status"]
        S1040["{WINT}-1040<br/>story-status DB"]
        S1050["{WINT}-1050<br/>story-update DB"]
        S1060["{WINT}-1060<br/>story-move DB"]
        S1070["{WINT}-1070<br/>Deprecate Index"]
        S1080["{WINT}-1080<br/>Validate Phase"]
    end

    subgraph Phase2["Phase 2: Context Cache (Token Reduction)"]
        S2010["{WINT}-2010<br/>Project Context"]
        S2020["{WINT}-2020<br/>Agent Missions"]
        S2030["{WINT}-2030<br/>Domain KB"]
        S2040["{WINT}-2040<br/>Library Cache"]
        S2050["{WINT}-2050<br/>Cache Warming"]
        S2060["{WINT}-2060<br/>Warmer Agent"]
        S2070["{WINT}-2070<br/>Session Mgmt"]
        S2080["{WINT}-2080<br/>Session Agent"]
        S2090["{WINT}-2090<br/>5 Agents Cache"]
        S2100["{WINT}-2100<br/>Token Reduction"]
    end

    subgraph Phase3["Phase 3: Telemetry (Full Observability)"]
        S3010["{WINT}-3010<br/>Invocation Log"]
        S3020["{WINT}-3020<br/>Logger Agent"]
        S3030["{WINT}-3030<br/>Decision Log"]
        S3040["{WINT}-3040<br/>Outcome Log"]
        S3050["{WINT}-3050<br/>Telemetry Cmd"]
        S3060["{WINT}-3060<br/>10 Agents Telemetry"]
        S3070["{WINT}-3070<br/>Validate Telemetry"]
    end

    subgraph Phase4["Phase 4: Graph & Cohesion (Completeness Detection)"]
        S4010["{WINT}-4010<br/>Populate Graph"]
        S4020["{WINT}-4020<br/>Infer Caps"]
        S4030["{WINT}-4030<br/>Cohesion Rules"]
        S4040["{WINT}-4040<br/>Checker Agent"]
        S4050["{WINT}-4050<br/>Prosecutor PO"]
        S4060["{WINT}-4060<br/>Defender Agent"]
        S4070["{WINT}-4070<br/>Judge Agent"]
        S4080["{WINT}-4080<br/>Curator Agent"]
        S4090["{WINT}-4090<br/>Cohesion Cmd"]
        S4100["{WINT}-4100<br/>Integrate Checks"]
        S4110["{WINT}-4110<br/>Validate Graph"]
    end

    subgraph Phase5["Phase 5: ML Pipeline (Smart Automation)"]
        S5010["{WINT}-5010<br/>Classifier Agent"]
        S5020["{WINT}-5020<br/>Classify Skill"]
        S5030["{WINT}-5030<br/>Collect Data"]
        S5040["{WINT}-5040<br/>Train Router"]
        S5050["{WINT}-5050<br/>Train Quality"]
        S5060["{WINT}-5060<br/>Train Prefs"]
        S5070["{WINT}-5070<br/>Recommender Ag"]
        S5080["{WINT}-5080<br/>Predictor Agent"]
        S5090["{WINT}-5090<br/>Predict Skill"]
        S5100["{WINT}-5100<br/>Model Cmd"]
        S5110["{WINT}-5110<br/>Preference Cmd"]
        S5120["{WINT}-5120<br/>5 Agents ML"]
        S5130["{WINT}-5130<br/>Measure ML"]
    end

    subgraph Phase6["Phase 6: Batch Mode (Unattended Processing)"]
        S6010["{WINT}-6010<br/>Coordinator Ag"]
        S6020["{WINT}-6020<br/>Batch Cmd"]
        S6030["{WINT}-6030<br/>Status Cmd"]
        S6040["{WINT}-6040<br/>Summary Skill"]
        S6050["{WINT}-6050<br/>Approval Gate"]
        S6060["{WINT}-6060<br/>Analyst Agent"]
        S6070["{WINT}-6070<br/>Report Cmd"]
        S6080["{WINT}-6080<br/>Test 5 Stories"]
        S6090["{WINT}-6090<br/>Test 10 Stories"]
    end

    subgraph Phase7["Phase 7: Migration (Update All Agents)"]
        S7010["{WINT}-7010<br/>Audit Refs"]
        S7020["{WINT}-7020<br/>Migration Plan"]
        S7030["{WINT}-7030<br/>Batch 1 Migration"]
        S7040["{WINT}-7040<br/>Batch 2 Migration"]
        S7050["{WINT}-7050<br/>Batch 3 Migration"]
        S7060["{WINT}-7060<br/>Batch 4 Migration"]
        S7070["{WINT}-7070<br/>Batch 5 Migration"]
        S7080["{WINT}-7080<br/>Batch 6 Migration"]
        S7090["{WINT}-7090<br/>Batch 7 Migration"]
        S7100["{WINT}-7100<br/>Remove Shim"]
        S7110["{WINT}-7110<br/>Test Suite"]
        S7120["{WINT}-7120<br/>Final Doc Sync"]
        S7130["{WINT}-7130<br/>Archive Legacy"]
    end

    %% Phase 0 dependencies
    S0010 --> S0020
    S0010 --> S0030
    S0010 --> S0040
    S0010 --> S0050
    S0010 --> S0060
    S0010 --> S0070
    S0070 --> S0080
    S0060 --> S0080
    S0020 --> S0090
    S0030 --> S0100
    S0030 --> S0110
    S0040 --> S0120
    S0060 --> S0130
    S0050 --> S0140
    S0160 --> S0170

    %% Phase 1 dependencies
    S0090 --> S1010
    S1020 -.parallel.-> S0090
    S1020 --> S1030
    S0020 --> S1030
    S1010 --> S1040
    S1030 --> S1040
    S1010 --> S1050
    S1030 --> S1050
    S1010 --> S1060
    S1030 --> S1060
    S1030 --> S1070
    S1040 --> S1080
    S1050 --> S1080
    S1060 --> S1080
    S1070 --> S1080

    %% Phase 2 dependencies
    S0030 --> S2010
    S0100 --> S2010
    S0030 --> S2020
    S0100 --> S2020
    S0030 --> S2030
    S0100 --> S2030
    S0030 --> S2040
    S0100 --> S2040
    S2010 --> S2050
    S2020 --> S2050
    S2030 --> S2050
    S2040 --> S2050
    S2050 --> S2060
    S0110 --> S2070
    S2070 --> S2080
    S2010 --> S2090
    S2020 --> S2090
    S2030 --> S2090
    S2040 --> S2090
    S0100 --> S2090
    S2090 --> S2100

    %% Phase 3 dependencies
    S0120 --> S3010
    S3010 --> S3020
    S0120 --> S3030
    S0120 --> S3040
    S3010 --> S3050
    S3030 --> S3050
    S3040 --> S3050
    S3020 --> S3060
    S3060 --> S3070

    %% Phase 4 dependencies
    S0060 --> S4010
    S0130 --> S4010
    S4010 --> S4020
    S4020 --> S4030
    S4030 --> S4040
    S0130 --> S4040
    S4040 --> S4050
    S4040 --> S4090
    S4050 --> S4100
    S4090 --> S4100
    S4100 --> S4110

    %% Phase 5 dependencies
    S3030 --> S5010
    S5010 --> S5020
    S3070 --> S5030
    S5030 --> S5040
    S5030 --> S5050
    S5030 --> S5060
    S5040 --> S5070
    S0140 --> S5070
    S5060 --> S5080
    S0140 --> S5080
    S5080 --> S5090
    S5070 --> S5100
    S5080 --> S5110
    S5090 --> S5120
    S5120 --> S5130

    %% Phase 6 dependencies
    S5090 --> S6010
    S6010 --> S6020
    S6020 --> S6030
    S6010 --> S6040
    S6040 --> S6050
    S3070 --> S6060
    S6060 --> S6070
    S6050 --> S6080
    S6080 --> S6090

    %% Phase 7 dependencies
    S7010 --> S7020
    S7020 --> S7030
    S1080 --> S7030
    S7030 --> S7040
    S7040 --> S7050
    S7050 --> S7060
    S7060 --> S7070
    S7070 --> S7080
    S7080 --> S7090
    S7090 --> S7100
    S7100 --> S7110
    S7110 --> S7120
    S7120 --> S7130

    %% Styling
    classDef ready fill:#90EE90,stroke:#228B22
    classDef blocked fill:#FFE4B5,stroke:#FFA500
    classDef done fill:#87CEEB,stroke:#4682B4

    class S0010,S0150,S1020,S4060,S4070,S7010 ready
    class S0020,S0030,S0040,S0050,S0060,S0070,S0080,S0090,S0100,S0110,S0120,S0130,S0140,S0160,S0170 blocked
    class S1010,S1020,S1030,S1040,S1050,S1060,S1070,S1080 blocked
```

**Legend:** Green = Ready | Orange = Blocked | Blue = Done

---

## Completion Order (Gantt View)

```mermaid
gantt
    title WINT Story Execution Order (Simplified)
    dateFormat X
    axisFormat %s

    section Phase 0
    WINT-0010 Schemas    :s0010, 0, 1
    WINT-0020-0070 MCP/Tables    :s0020, after s0010, 2
    WINT-0080-0150 Seeds/Skills    :s0080, after s0020, 2
    WINT-0160-0170 DocSync    :s0160, after s0080, 1

    section Phase 1
    WINT-1010-1030 Foundation    :s1010, after s0160, 2
    WINT-1040-1080 DB Commands    :s1040, after s1010, 2

    section Phase 2
    WINT-2010-2040 Context Cache    :s2010, after s1040, 2
    WINT-2050-2080 Cache Mgmt    :s2050, after s2010, 2
    WINT-2090-2100 Token Reduction    :s2090, after s2050, 2

    section Phase 3
    WINT-3010-3040 Telemetry    :s3010, after s2090, 2
    WINT-3050-3070 Telemetry Validation    :s3050, after s3010, 2

    section Phase 4
    WINT-4010-4030 Graph Setup    :s4010, after s3050, 2
    WINT-4040-4110 Cohesion Checks    :s4040, after s4010, 3

    section Phase 5
    WINT-5010-5030 ML Prep    :s5010, after s4040, 2
    WINT-5040-5090 ML Training    :s5040, after s5010, 2
    WINT-5100-5130 ML Integration    :s5100, after s5040, 2

    section Phase 6
    WINT-6010-6050 Batch Setup    :s6010, after s5100, 2
    WINT-6060-6090 Batch Testing    :s6060, after s6010, 2

    section Phase 7
    WINT-7010-7030 Migration Phase 1    :s7010, after s6060, 2
    WINT-7040-7090 Migration Phase 2    :s7040, after s7010, 3
    WINT-7100-7130 Migration Complete    :s7100, after s7040, 2
```

---

## Critical Path

The longest chain of dependent stories:

```
WINT-0010 → WINT-0020 → WINT-0090 → WINT-1010 →
WINT-1020 → WINT-1030 → WINT-1040 → WINT-1080 →
WINT-2010 → WINT-2090 → WINT-2100 → WINT-3010 →
WINT-3020 → WINT-3060 → WINT-3070 → WINT-5030 →
WINT-5040 → WINT-5070 → WINT-5090 → WINT-5120 →
WINT-5130 → WINT-6010 → WINT-6020 → WINT-6050 →
WINT-6080 → WINT-6090 → WINT-7020 → WINT-7030 →
WINT-7040 → WINT-7050 → WINT-7060 → WINT-7070 →
WINT-7080 → WINT-7090 → WINT-7100 → WINT-7110 →
WINT-7120 → WINT-7130
```

**Critical path length:** 39 stories

---

## Parallel Opportunities

| Parallel Group | Stories | After |
|---|---|---|
| Group 1 | WINT-0010 | — (start) |
| Group 2 | WINT-0020, 0030, 0040, 0050, 0060, 0070 | Group 1 |
| Group 3 | WINT-0080, 0090, 0100, 0110, 0120, 0130, 0140, 0150 | Group 2 |
| Group 4 | WINT-0160, 1020 | Group 3 |
| Group 5 | WINT-0170, 1010, 1030 | Group 4 |
| Group 6 | WINT-1040, 1050, 1060, 1070 | Group 5 |
| Group 7 | WINT-1080 | Group 6 |
| Group 8 | WINT-2010, 2020, 2030, 2040, 2070 | Group 7 |
| Group 9 | WINT-2050, 2080 | Group 8 |
| Group 10 | WINT-2060, 2090 | Group 9 |
| Group 11 | WINT-2100 | Group 10 |

**Maximum parallelization:** 6 stories at once

---

## Risk Indicators

| Story ID | Risk Level | Reason |
|---|---|---|
| WINT-0010 | High | Database migration could break existing KB functionality |
| WINT-5030 | Medium | Need 30-50 stories before ML training, may take weeks |
| WINT-5040, 5050, 5060 | Medium | Model accuracy targets (85% routing, 90% auto-accept) may not be achievable |
| WINT-1010 | Low | Compatibility shim performance during migration period |
| WINT-5090, 5120 | High | Auto-accept safety - must not allow dangerous decisions through |
| WINT-7030 to 7090 | High | 52 agents to migrate - large scope, discovery risk |
| WINT-3010, 3030 | Medium | High-frequency telemetry writes need batching strategy |
| WINT-4040, 4090 | Low | Graph query performance as graph grows |
| WINT-6010, 6020 | Medium | Batch mode error handling and partial failure recovery |
| WINT-0170, 7120 | Low | doc-sync latency could slow workflows |

---

## Quick Reference

| Metric | Value |
|---|---|
| Total Stories | 88 |
| Ready to Start | 6 |
| Critical Path Length | 39 stories |
| Max Parallel | 6 stories |
| Phases | 8 |
| High-Risk Stories | 6 |
| Sizing Warnings | 4 |

---

## Update Log

| Date | Change | Stories Affected |
|---|---|---|
| 2026-02-09 | Initial roadmap | All 93 stories |
