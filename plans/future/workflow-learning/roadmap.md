# Workflow Intelligence Program — Roadmap

## Dependency Graph

```mermaid
graph TB
    subgraph Foundation["Foundation (COMPLETE)"]
        WKFL001["WKFL-001<br/>Retro Agent ✓"]
        WKFL004["WKFL-004<br/>Feedback ✓"]
        WKFL005["WKFL-005<br/>Doc Sync"]
    end

    subgraph INFR["INFR: Infrastructure & Persistence (6 stories)"]
        INFR001["INFR-001<br/>Artifact Schemas"]
        INFR002["INFR-002<br/>Writer/Reader"]
        INFR003["INFR-003<br/>MinIO Setup"]
        INFR004["INFR-004<br/>Events Table"]
        INFR005["INFR-005<br/>Event SDK"]
        INFR006["INFR-006<br/>Instrument + Retain"]

        INFR001 --> INFR002
        INFR003 --> INFR002
        INFR004 --> INFR005
        INFR005 --> INFR006
    end

    subgraph AUDT["AUDT: Code Audit Engine (3 stories)"]
        AUDT001["AUDT-001<br/>Graph + Schema"]
        AUDT002["AUDT-002<br/>9 Lens Nodes"]
        AUDT003["AUDT-003<br/>Orchestration"]

        AUDT001 --> AUDT002 --> AUDT003
    end

    subgraph MODL["MODL: Model Experimentation (4 stories)"]
        MODL001["MODL-001<br/>Providers"]
        MODL002["MODL-002<br/>Task Contracts"]
        MODL003["MODL-003<br/>Quality Eval"]
        MODL004["MODL-004<br/>Leaderboards"]

        MODL001 --> MODL002 --> MODL003 --> MODL004
        WKFL004 --> MODL003
    end

    subgraph TELE["TELE: Telemetry (4 stories)"]
        TELE001["TELE-001<br/>Docker Stack"]
        TELE002["TELE-002<br/>Metrics Mapping"]
        TELE003["TELE-003<br/>Dashboards"]
        TELE004["TELE-004<br/>Alerting"]

        TELE001 --> TELE002 --> TELE003
        TELE002 --> TELE004
    end

    subgraph LERN["LERN: Learning Loop (7 stories)"]
        LERN001["LERN-001<br/>Calibration"]
        LERN002["LERN-002<br/>Pattern Mining"]
        LERN003["LERN-003<br/>KB Compress"]
        LERN004["LERN-004<br/>Heuristics"]
        LERN005["LERN-005<br/>Risk Predictor"]
        LERN006["LERN-006<br/>Proposals"]
        LERN007["LERN-007<br/>Experimentation"]

        LERN001 --> LERN004
        LERN002 --> LERN003
        LERN002 --> LERN005
        LERN001 --> LERN006
        LERN002 --> LERN006
    end

    subgraph SDLC["SDLC: Agent Roles (5 stories)"]
        SDLC001["SDLC-001<br/>PLAN Schema"]
        SDLC002["SDLC-002<br/>PO Agent"]
        SDLC003["SDLC-003<br/>PM Agent"]
        SDLC004["SDLC-004<br/>SM Agent"]
        SDLC005["SDLC-005<br/>Decisions + Budgets"]

        SDLC001 --> SDLC002
        SDLC001 --> SDLC003
        SDLC001 --> SDLC004
    end

    %% Cross-epic dependencies
    INFR005 --> TELE002
    INFR005 --> LERN001
    INFR005 --> LERN002
    MODL004 --> LERN001
    MODL004 --> LERN007
    WKFL001 --> LERN001
    WKFL001 --> LERN002

    style WKFL001 fill:#90EE90
    style WKFL004 fill:#90EE90
    style WKFL005 fill:#FFEB3B
```

## Epic Execution Order

```
Phase 0: Foundation ─────────────── COMPLETE
              │
              ├──── Phase 1A: INFR ─── no blockers, start immediately
              ├──── Phase 1B: AUDT ─── no blockers, start immediately
              └──── Phase 1C: MODL ─── no blockers, start immediately
                        │
                        ├── Phase 2: TELE ─── needs INFR events
                        │
                        └── Phase 3: LERN ─── needs INFR + MODL
                                │
                                └── Phase 4: SDLC ─── capstone
```

### Parallelism

INFR, AUDT, and MODL have **no cross-dependencies** and can run simultaneously. This is the biggest time savings — 3 epics in parallel instead of sequential.

| Phase | Epics | Can Parallel? | Depends On |
|-------|-------|--------------|------------|
| 0 | Foundation | N/A | COMPLETE |
| 1 | INFR, AUDT, MODL | Yes (all 3) | Foundation |
| 2 | TELE | No (single) | INFR events |
| 3 | LERN | No (single) | INFR + MODL |
| 4 | SDLC | No (single) | All above |

## Visual Timeline

```mermaid
gantt
    title Workflow Intelligence Program
    dateFormat  YYYY-MM-DD

    section Foundation (COMPLETE)
    WKFL-001 Retro Agent       :done, a1, 2026-02-07, 3d
    WKFL-004 Feedback Capture  :done, a4, 2026-02-07, 1d
    WKFL-005 Doc Sync          :active, a5, 2026-02-08, 2d
    Foundation Complete        :milestone, m0, 2026-02-10, 0d

    section INFR: Infrastructure
    INFR-001 Artifact Schemas  :i1, 2026-02-12, 2d
    INFR-003 MinIO Setup       :i3, 2026-02-12, 1d
    INFR-002 Writer/Reader     :i2, after i1, 2d
    INFR-004 Events Table      :i4, 2026-02-12, 2d
    INFR-005 Event SDK         :i5, after i4, 2d
    INFR-006 Instrument        :i6, after i5, 2d
    INFR Complete              :milestone, mi, 2026-02-22, 0d

    section AUDT: Code Audit
    AUDT-001 Graph + Schema    :u1, 2026-02-12, 2d
    AUDT-002 9 Lens Nodes      :u2, after u1, 3d
    AUDT-003 Orchestration     :u3, after u2, 2d
    AUDT Complete              :milestone, mu, 2026-02-20, 0d

    section MODL: Model Experimentation
    MODL-001 Providers         :m1, 2026-02-12, 2d
    MODL-002 Task Contracts    :m2, after m1, 3d
    MODL-003 Quality Eval      :m3, after m2, 2d
    MODL-004 Leaderboards      :m4, after m3, 2d
    MODL Complete              :milestone, mm, 2026-02-24, 0d

    section TELE: Telemetry
    TELE-001 Docker Stack      :t1, after mi, 2d
    TELE-002 Metrics Mapping   :t2, after t1, 2d
    TELE-003 Dashboards        :t3, after t2, 2d
    TELE-004 Alerting          :t4, after t2, 1d
    TELE Complete              :milestone, mt, 2026-03-01, 0d

    section LERN: Learning Loop
    LERN-001 Calibration       :l1, after mm, 2d
    LERN-002 Pattern Mining    :l2, after mm, 3d
    LERN-003 KB Compress       :l3, after l2, 1d
    LERN-004 Heuristics        :l4, after l1, 2d
    LERN-005 Risk Predictor    :l5, after l2, 2d
    LERN-006 Proposals         :l6, after l4, 2d
    LERN-007 Experimentation   :l7, after mm, 3d
    LERN Complete              :milestone, ml, 2026-03-08, 0d

    section SDLC: Agent Roles
    SDLC-001 PLAN Schema       :s1, after ml, 2d
    SDLC-002 PO Agent          :s2, after s1, 2d
    SDLC-003 PM Agent          :s3, after s1, 2d
    SDLC-004 SM Agent          :s4, after s1, 2d
    SDLC-005 Decisions         :s5, after s2, 2d
    SDLC Complete              :milestone, ms, 2026-03-16, 0d

    section Validation
    10-Story Burn-in           :v1, after ms, 5d
    Metrics Review             :v2, after v1, 2d
    Full Rollout               :milestone, mv, 2026-03-23, 0d
```

## Success Milestones

| Milestone | Criteria | Epic |
|-----------|----------|------|
| M0: Foundation | Data capture working | COMPLETE |
| M1: Infrastructure | Events flow, artifacts persist | INFR |
| M2: Audit Running | Code-only audit produces FINDINGS | AUDT |
| M3: Multi-Model | Providers + selector + leaderboard | MODL |
| M4: Observable | Dashboards + alerts from real events | TELE |
| M5: Learning Active | Calibration + patterns via Task Contract | LERN |
| M6: Self-Improving | First heuristic/improvement proposal | LERN |
| M7: Governed | Agent roles execute within budgets | SDLC |
| M8: Validated | 10 stories, all metrics met | Validation |

## Validation Period

### 10-Story Burn-in

| Story # | Components Active | Expected Outputs |
|---------|------------------|------------------|
| 1-3 | INFR + AUDT (code-only) | Events, artifacts, FINDINGS.yaml |
| 4-6 | + MODL + TELE | Leaderboard entries, dashboards |
| 7-9 | + LERN | Calibration, patterns, convergence |
| 10 | + SDLC | Proposals, predictions, governed runs |

### Target Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Audit findings precision | >80% | Human feedback on findings |
| Model selector convergence | <50 runs | Leaderboard convergence |
| Non-Claude usage | >60% | Leaderboard model distribution |
| Cost reduction | >50% | Provider cost tracking |
| Quality maintained | No degradation | Gate pass rates |
