# INFRA Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Pending | 6 |
| **Total** | **6** |

## Ready to Start (No Blockers)

- INFR-001: Postgres Artifact Schemas
- INFR-004: Workflow Events Table

---

### INFR-001: Postgres Artifact Schemas

**Status:** `pending`
**Priority:** P0
**Dependencies:** None
**Blocks:** INFR-002, INFR-003

**Description:**
Create `work.artifacts`, `work.artifact_versions`, and `work.artifact_links` tables with indexes.

**Key Deliverables:**
- Drizzle migration for `work` schema
- `artifacts` table (artifact_id ULID, type, latest_version, tags JSONB, owner_item_id, owner_run_id)
- `artifact_versions` table (artifact_id FK, version int, mime_type, size_bytes, content_hash sha256, storage_backend enum, storage_key, inline_content_text, inline_content_json JSONB, preview_text, extracted_fields JSONB, is_kb_ingested)
- `artifact_links` table (artifact_id, version, link_type, item_id, run_id, event_id, workflow_name)
- Indexes per SCHEMAS.md spec

**Acceptance Criteria:**
- [ ] All 3 tables created with correct column types
- [ ] Indexes on (type, created_at), (owner_item_id), (content_hash)
- [ ] Primary key on artifact_versions is (artifact_id, version)
- [ ] Migration runs cleanly on fresh DB and existing DB

---

### INFR-002: Artifact Writer/Reader Service

**Status:** `pending`
**Priority:** P0
**Dependencies:** INFR-001
**Blocks:** INFR-003

**Description:**
Service layer for storing and retrieving artifacts. Inline storage for small artifacts, offload to object storage for large ones.

**Key Deliverables:**
- `packages/backend/artifact-service/` or similar
- `writeArtifact()` — stores inline if < threshold, offloads to S3 otherwise
- `readArtifact()` — fetches metadata + preview, full content on demand
- `createVersion()` — immutable versioning, sha256 content hash
- Zod schemas for all inputs/outputs

**Acceptance Criteria:**
- [ ] Artifacts < 500KB stored inline in Postgres
- [ ] Artifacts > 500KB offloaded to object storage
- [ ] Content hash computed and stored (sha256)
- [ ] New version created on content change (never mutate)
- [ ] Reader returns preview_text + extracted_fields without fetching blob

---

### INFR-003: MinIO/S3 Docker Setup + Client Adapter

**Status:** `pending`
**Priority:** P1
**Dependencies:** INFR-001
**Blocks:** None

**Description:**
Add MinIO to Docker Compose for local S3 semantics. Create S3 client adapter that works with both MinIO (local) and real S3 (production).

**Key Deliverables:**
- MinIO service in Docker Compose (API on 9000, Console on 9001)
- `artifacts` bucket auto-created on startup
- S3 client adapter with `forcePathStyle` for local
- Key convention: `artifacts/{type}/{artifact_id}/v{version}/{content_hash}.{ext}`

**Acceptance Criteria:**
- [ ] `docker compose up` starts MinIO alongside existing services
- [ ] Bucket `artifacts` created automatically
- [ ] Client adapter works with MinIO locally and S3 in production
- [ ] Upload/download/delete operations working
- [ ] Env vars for endpoint, credentials, region

---

### INFR-004: Workflow Events Table + Ingestion

**Status:** `pending`
**Priority:** P0
**Dependencies:** None
**Blocks:** INFR-005, INFR-006

**Description:**
Append-only `telemetry.workflow_events` table with idempotent ingestion endpoint.

**Key Deliverables:**
- Drizzle migration for `telemetry` schema
- `workflow_events` table (event_id ULID PK, event_version int, event_name, ts, run_id, item_id, workflow_name, agent_role, payload JSONB)
- Unique index on event_id for dedupe
- Ingestion endpoint in `apps/api` (POST /telemetry/events)
- Partition by month (or plan for it)

**Acceptance Criteria:**
- [ ] Events stored append-only (no updates, no deletes)
- [ ] Duplicate event_id rejected silently (idempotent)
- [ ] All 5 core event types storable
- [ ] Ingestion endpoint returns 201 on new, 200 on dupe
- [ ] Indexes on (event_name, ts), (item_id, ts), (run_id, ts)

---

### INFR-005: Event SDK (Shared Telemetry Hooks)

**Status:** `pending`
**Priority:** P1
**Dependencies:** INFR-004
**Blocks:** INFR-006

**Description:**
Shared package for emitting workflow events from anywhere in the monorepo. Type-safe event builders with Zod schemas.

**Key Deliverables:**
- `packages/telemetry/` (or `packages/core/telemetry/`)
- Zod schemas for all 5 core events + 6 learning events
- Event builder functions: `emitStateChanged()`, `emitStepCompleted()`, etc.
- Transport layer: HTTP POST to ingestion endpoint
- Correlation ID helpers (run_id, item_id propagation)

**Acceptance Criteria:**
- [ ] Type-safe event builders for all 11 event types
- [ ] Zod validation before emit (fail fast on bad data)
- [ ] Automatic ULID generation for event_id
- [ ] Configurable endpoint (env var)
- [ ] Batch emit support (optional)

---

### INFR-006: Instrument Orchestrator + Retention

**Status:** `pending`
**Priority:** P1
**Dependencies:** INFR-005
**Blocks:** None

**Description:**
Wire the event SDK into the existing LangGraph orchestrator so every graph run emits events. Add retention/pruning for old events.

**Key Deliverables:**
- Orchestrator nodes emit `workflow.step_completed` with tokens, cost, model info
- State transitions emit `workflow.item_state_changed`
- Retention policy: raw events 90 days, aggregates indefinitely
- Pruning job (partition drop or scheduled delete)

**Acceptance Criteria:**
- [ ] Every LangGraph node execution emits step_completed
- [ ] State changes tracked via item_state_changed
- [ ] Events include run_id, item_id, agent_role, cost_usd_est
- [ ] Retention job configured and tested
- [ ] No performance degradation from event emission
