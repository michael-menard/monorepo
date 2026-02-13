# INFRA — Infrastructure & Persistence

## Goal

Replace YAML-files-on-disk with a real persistence layer. Postgres for structured data + state machines. MinIO/S3 for large blobs. Structured workflow events as the source of truth for everything downstream (telemetry, learning, agent decisions).

## Why This Is First

Every other epic depends on this:
- **AUDIT** needs somewhere to persist findings beyond flat files
- **MODL** needs to store leaderboard data and quality scores
- **TELE** needs structured events to build dashboards from
- **LEARN** needs event history to mine patterns from
- **SDLC** needs artifacts, events, and state tracking

## Architecture (Three Tiers)

### 1) Operational DB (Postgres)
- Backlog items, stories, state transitions, decisions
- Workflow events (append-only, dedupe on event_id)
- Artifact metadata (index card)
- Small artifacts inline (< 500KB)

### 2) Artifact Blob Store (MinIO/S3)
- Large markdown, JSON reports, debug bundles
- Run transcripts
- Anything large or binary

### 3) Knowledge Base (pgvector)
- Embeddings for selected artifacts only
- Metadata traces back to artifact_id + version

## Key Design Decisions

- **No MongoDB.** Postgres JSONB gives document-shape without a second datastore.
- **Inline by default, offload when big.** Store artifacts in Postgres if under ~500KB, MinIO/S3 otherwise.
- **Normalize what you query often.** Type, run_id, item_id, status, severity = columns. Everything else = JSONB.
- **Immutable versioning.** Artifacts have versions; updates create new version rows. Content-addressed via sha256.
- **Idempotent event ingestion.** Every event has a ULID event_id; unique index prevents duplicates.

## Postgres Schema Separation

```
kb.*           — knowledge base (existing pgvector)
work.*         — artifacts, items, state
telemetry.*    — workflow events, metrics
ai.*           — model scores, leaderboards (for MODL epic)
```

## Event Model (5 Core Events)

| Event | Purpose |
|-------|---------|
| `workflow.item_state_changed` | State transitions, cycle time, bounce detection |
| `workflow.step_completed` | Agent/step execution tracking, cost, tokens |
| `workflow.story_changed` | Post-ready churn detection |
| `workflow.gap_found` | Missed requirements, quality gaps |
| `workflow.flow_issue` | Process friction, handoff problems |

All events include: `event_id` (ULID), `event_version`, `ts`, and optional `run_id`, `item_id`, `workflow_name`, `agent_role`.

## References

- Detailed schemas: artifact-storage-plan `SCHEMAS.md`
- Query patterns: artifact-storage-plan `QUERY_PATTERNS.md`
- Event contracts: workflow-automation-plan `EVENT_CONTRACTS.md`
- MinIO setup: artifact-storage-plan `MINIO_SETUP.md`
- Retention strategy: workflow-automation-plan `RETENTION.md`
