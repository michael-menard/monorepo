# Workflow Intelligence Program — Master Index

## Vision

Build a self-improving development platform on LangGraph that learns which models, agents, and workflows produce the best results — then automatically optimizes itself.

## Strategic Principles

1. **LangGraph is the production target.** Claude Code agents are prototypes.
2. **Model choice is a learned parameter.** Task Contracts + multi-armed bandit, not hard-coded assignments.
3. **Events are the source of truth.** Structured workflow events feed everything: dashboards, learning, decisions.
4. **Postgres is the brain.** Artifacts, events, and state in one DB. MinIO/S3 for large blobs.
5. **Code first, models later.** Start Tier 0 (code-only), add models only when needed.

## Program Structure

This program is split into 6 focused epics with clear dependency ordering:

```
                         INFRA
                    (Persistence +
                     Event Backbone)
                          |
            +-------------+-------------+
            |             |             |
            v             v             v
         AUDIT          MODL          TELE
      (Code Audit)   (Model Exp.)  (Telemetry +
                                    Dashboards)
            |             |             |
            +------+------+             |
                   |                    |
                   v                    |
                LEARN                   |
            (Learning +                 |
            Self-Optimization)          |
                   |                    |
                   +--------+-----------+
                            |
                            v
                          SDLC
                    (Agent Roles +
                     Decision Loops)
```

| Epic | Prefix | Path | Stories | Dependencies |
|------|--------|------|---------|-------------|
| Infrastructure & Persistence | INFR | `plans/future/infra-persistence/` | 6 | None |
| Code Audit Engine | AUDT | `plans/future/code-audit/` | 3 | None (scaffolded) |
| Model Experimentation Platform | MODL | `plans/future/model-experimentation/` | 4 | None |
| Telemetry & Observability | TELE | `plans/future/telemetry/` | 4 | INFRA |
| Learning & Self-Optimization | LERN | `plans/future/learning-loop/` | 7 | INFRA, MODL |
| SDLC Agent Roles | SDLC | `plans/future/sdlc-agents/` | 5 | All above |

**Total: 29 stories across 6 epics.**

## Parallelism

INFRA, AUDIT, and MODL have **no cross-dependencies** and can run simultaneously. TELE starts once INFRA events are flowing. LEARN starts once INFRA + MODL are complete. SDLC is the capstone.

## Completed Foundation (from original WKFL epic)

These stories are done and feed into multiple epics:

| ID | Component | Status | Feeds Into |
|----|-----------|--------|-----------|
| WKFL-001 | Meta-Learning Loop (Retro Agent) | completed | LEARN |
| WKFL-004 | Human Feedback Capture | completed | MODL, LEARN |
| WKFL-005 | Doc Sync Agent | uat | SDLC |

## Source Materials

- Artifact storage plan: `artifact-storage-plan/` bundle
- Dev team automation: `dev-team-automation-bundle/`
- Workflow automation: `workflow-automation-plan/` bundle
- Original WKFL plan: this directory (historical)
- Existing LangGraph scaffolds: `packages/backend/orchestrator/src/nodes/audit/`
