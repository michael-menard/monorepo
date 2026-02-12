# Workflow Intelligence Program — Story Index

This is the master story index. Each epic maintains its own detailed story index.

## Program Summary

| Epic | Prefix | Stories | Path |
|------|--------|---------|------|
| Infrastructure & Persistence | INFR | 6 | [infra-persistence](../infra-persistence/stories.index.md) |
| Code Audit Engine | AUDT | 3 | [code-audit](../code-audit/stories.index.md) |
| Model Experimentation Platform | MODL | 4 | [model-experimentation](../model-experimentation/stories.index.md) |
| Telemetry & Observability | TELE | 4 | [telemetry](../telemetry/stories.index.md) |
| Learning & Self-Optimization | LERN | 7 | [learning-loop](../learning-loop/stories.index.md) |
| SDLC Agent Roles | SDLC | 5 | [sdlc-agents](../sdlc-agents/stories.index.md) |

**Total: 29 stories across 6 epics.**

## Completed Foundation (from original WKFL epic)

| ID | Component | Status | Feeds Into |
|----|-----------|--------|-----------|
| WKFL-001 | Meta-Learning Loop (Retro Agent) | completed | LERN |
| WKFL-004 | Human Feedback Capture | completed | MODL, LERN |
| WKFL-005 | Doc Sync Agent | uat | SDLC |

## Ready to Start (No Cross-Epic Blockers)

- **INFR-001**: Postgres Artifact Schemas — no dependencies
- **INFR-003**: MinIO/S3 Docker Setup — no dependencies
- **AUDT-001**: Audit Graph & Artifact Schema — already scaffolded
- **MODL-001**: Provider Adapters — no dependencies
