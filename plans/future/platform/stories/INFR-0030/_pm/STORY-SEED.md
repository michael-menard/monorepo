---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INFR-0030

## Reality Context

### Baseline Status
- Loaded: Yes
- Date: 2026-02-13
- Gaps: None - baseline is active and current

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Docker Compose Stack | `infra/compose.lego-app.yaml` | Active | Current stack has PostgreSQL, Redis, Prometheus, Grafana, OTel Collector - INFR-0030 adds MinIO |
| Existing S3 Client | `packages/backend/s3-client/` | Active | AWS S3 client exists for production - needs MinIO compatibility for local dev |
| Knowledge Base Docker | `apps/api/knowledge-base/docker-compose.yml` | Active | Separate Docker Compose file pattern for pgvector on port 5433 |
| Orchestrator Persistence | `packages/backend/orchestrator/src/persistence/` | Active | YAML artifact writer/reader - will eventually use MinIO for large files |
| Drizzle Schemas | `packages/backend/database-schema/` | Protected | Postgres schemas for metadata - blob storage complements this |

### Active In-Progress Work

| Story | Phase | Overlap Risk |
|-------|-------|--------------|
| None | N/A | No conflicts - INFR-0030 is Wave 2 infrastructure work |

### Constraints to Respect

**From Baseline:**
- Docker Compose stack is at `infra/compose.lego-app.yaml` (centralized location)
- All services must have health checks and persistent volumes
- Protected: Existing PostgreSQL, Redis, Prometheus, Grafana, OTel services
- Established pattern: Knowledge Base uses separate Docker Compose for service-specific needs

**From Story Dependencies:**
- **Depends on**: INFR-0010 (Postgres Artifact Schemas) - artifact metadata will live in Postgres, blobs in MinIO
- **Blocks**: None directly, but enables future artifact storage (INFR-0020 will use this for large artifacts)
- **Priority**: P3 (lower priority than schema/adapter work in Wave 2)

**From Architecture:**
- Three-tier persistence: (1) Postgres for metadata, (2) MinIO/S3 for blobs, (3) pgvector for KB
- Inline-first strategy: Store artifacts in Postgres if under ~500KB, offload to MinIO/S3 otherwise
- Client must work with MinIO locally AND S3 in production (single abstraction)

---

## Retrieved Context

### Existing S3 Client Implementation

**Location**: `packages/backend/s3-client/src/s3-client.ts`

**Current Features:**
- Uses AWS SDK v3 (`@aws-sdk/client-s3`)
- Singleton S3Client with connection reuse (optimized for Lambda)
- `uploadToS3()` - single file upload with encryption
- `deleteFromS3()` - file deletion
- `uploadToS3Multipart()` - large file upload (>5MB) with multipart API
- Environment-driven region configuration (`AWS_REGION`)

**Current Limitations:**
- Hardcoded for AWS S3 (uses default AWS credentials)
- No `forcePathStyle` option (required for MinIO)
- No endpoint override (required for local MinIO on port 9000)
- No bucket creation/initialization logic

**What Needs to Change:**
- Add MinIO-compatible configuration (endpoint, forcePathStyle)
- Environment detection: use MinIO locally, S3 in production
- Optional bucket initialization on first use
- Preserve existing AWS Lambda optimization patterns

### Docker Compose Stack Pattern

**Current Stack** (`infra/compose.lego-app.yaml`):
```yaml
services:
  postgres:     # port 5432
  redis:        # port 6379
  prometheus:   # port 9090
  grafana:      # port 3003
  otel-collector: # ports 4317, 4318
```

**All services have:**
- Health checks with retry logic
- Persistent named volumes
- `restart: unless-stopped` policy
- Environment variable configuration
- Container naming convention: `monorepo-{service}`

**MinIO Integration Pattern:**
- Add `minio` service to existing compose file
- Port 9000 for S3 API, port 9001 for web console
- Named volume: `minio_data`
- Environment variables: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- Health check using `mc ready` (MinIO client)
- Create default buckets on startup via entrypoint script

### Orchestrator Artifact Patterns

**Current Artifact Storage** (`packages/backend/orchestrator/src/persistence/`):
- `yaml-artifact-writer.ts` - writes YAML to filesystem with atomic operations
- `yaml-artifact-reader.ts` - reads YAML from filesystem
- `path-resolver.ts` - resolves artifact paths (story directory structure)
- All artifacts currently stored as files in `plans/` directory tree

**Future Vision (from INFR PLAN.md):**
- Small artifacts (<500KB): inline in Postgres as JSONB
- Large artifacts (>500KB): blob storage (MinIO/S3) with Postgres metadata
- Artifact table has `content_inline` (JSONB) and `content_location` (S3 key) columns
- INFR-0020 (Artifact Writer/Reader Service) will implement this split

**INFR-0030's Role:**
- Provide MinIO infrastructure for local development
- Provide S3-compatible client that works in both environments
- Enable INFR-0020 to write large artifacts to blob storage

### Reuse Candidates

**Must Reuse:**
- Docker Compose structure from `infra/compose.lego-app.yaml`
- Health check patterns (CMD, interval, retries)
- Named volume patterns
- Environment variable configuration pattern
- Existing S3 client singleton pattern from `@repo/s3-client`

**Should Create:**
- MinIO service definition in compose file
- MinIO initialization script (create default buckets)
- Environment detection logic in S3 client (local vs production)
- Configuration schema for S3/MinIO client (Zod)
- Adapter pattern with `forcePathStyle` and endpoint override

---

## Knowledge Context

### Lessons Learned
- Lessons loaded: No (INFR-0030 is Wave 2 foundation - no prior MinIO/Docker stories in KB)
- No known blockers from past infrastructure work

### Blockers to Avoid (from ADRs)
- None directly applicable - this is infrastructure/Docker setup work

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code | Use CloudFormation for AWS infrastructure (MinIO is local dev only) |
| ADR-005 | Testing Strategy | If adding tests, must use real services (not mocks) |

**Key Constraints:**
- MinIO is for local development only (production uses real S3)
- Client must be environment-aware (detect local vs production)
- No hardcoded credentials in compose files (use environment variables)

### Patterns to Follow
- Zod-first configuration schemas
- Environment variable defaults with override capability
- Health checks for all Docker services
- Persistent volumes for stateful data
- Single client abstraction for both MinIO and S3

### Patterns to Avoid
- Hardcoded credentials in compose files
- Service-specific clients (need unified S3-compatible interface)
- Ignoring health checks or restart policies
- Mixing local-only config into production code paths

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
MinIO/S3 Docker Setup + Client Adapter

### Description

**Context:**

The INFR epic establishes a three-tier persistence architecture:
1. **Postgres** - structured metadata, state, events
2. **MinIO/S3** - large artifact blobs (>500KB)
3. **pgvector** - embeddings for knowledge base

Currently, all orchestrator artifacts (YAML files, evidence, plans) are stored as files in the `plans/` directory tree. This works for small artifacts but doesn't scale for large files or distributed workflows.

INFR-0010 (Postgres Artifact Schemas) defines artifact metadata tables. INFR-0020 (Artifact Writer/Reader Service) will implement the inline vs blob storage split. INFR-0030 provides the infrastructure and client for blob storage.

**Problem:**

- No local S3-compatible blob storage for development (production has AWS S3)
- Existing `@repo/s3-client` is AWS-only (no MinIO support)
- No bucket initialization or environment-aware client configuration
- Large artifacts (>500KB) can't be offloaded from Postgres without blob storage
- Developers need consistent local/production experience for artifact storage

**Proposed Solution:**

1. Add MinIO to Docker Compose stack at `infra/compose.lego-app.yaml`
   - S3 API on port 9000, web console on port 9001
   - Persistent volume for data
   - Health checks and auto-restart
   - Default bucket creation on startup (`workflow-artifacts`)

2. Enhance `@repo/s3-client` with MinIO compatibility
   - Environment detection (local vs production)
   - `forcePathStyle: true` for MinIO
   - Endpoint override for local development
   - Bucket initialization helper
   - Preserve existing AWS Lambda optimization (connection reuse)

3. Create unified S3StorageAdapter interface
   - `uploadArtifact(key, content, metadata)` - upload blob
   - `downloadArtifact(key)` - retrieve blob
   - `deleteArtifact(key)` - remove blob
   - `listArtifacts(prefix)` - list artifacts with prefix
   - Works with both MinIO (local) and S3 (production)

### Initial Acceptance Criteria

**Docker Infrastructure:**
- [ ] AC-1: MinIO service added to `infra/compose.lego-app.yaml` with health check
- [ ] AC-2: MinIO data persisted in named volume `minio_data`
- [ ] AC-3: MinIO S3 API accessible on `localhost:9000` after `docker compose up`
- [ ] AC-4: MinIO web console accessible on `localhost:9001` (optional convenience)
- [ ] AC-5: Default bucket `workflow-artifacts` created automatically on startup

**S3 Client Adapter:**
- [ ] AC-6: S3Client enhanced with environment detection (local vs production)
- [ ] AC-7: When `NODE_ENV=development` and `S3_ENDPOINT` set, client uses MinIO endpoint with `forcePathStyle: true`
- [ ] AC-8: When production, client uses standard AWS S3 (existing behavior preserved)
- [ ] AC-9: `initializeBucket(bucketName)` helper creates bucket if it doesn't exist
- [ ] AC-10: Existing S3 functions (`uploadToS3`, `deleteFromS3`, `uploadToS3Multipart`) work with both MinIO and S3

**Integration:**
- [ ] AC-11: README updated with MinIO setup instructions (`docker compose up` starts MinIO)
- [ ] AC-12: Environment variable documentation added (`.env.example` shows S3/MinIO config)
- [ ] AC-13: S3 client adapter tested against local MinIO (manual smoke test: upload, download, delete)

### Non-Goals

- Artifact Writer/Reader Service implementation (INFR-0020)
- Postgres artifact schema implementation (INFR-0010)
- Automatic artifact migration from filesystem to MinIO
- S3 bucket lifecycle policies or retention rules
- MinIO multi-tenancy or access control beyond root credentials
- Production S3 bucket creation (handled by IaC/CloudFormation)
- Grafana/Prometheus metrics for MinIO
- S3 presigned URLs or public access configuration
- Cross-region replication or backup strategies
- Integration with orchestrator artifact writers (comes in INFR-0020)

### Reuse Plan

**Components:**
- Existing S3 client structure in `packages/backend/s3-client/`
- Docker Compose pattern from `infra/compose.lego-app.yaml`
- Health check patterns from existing services
- Named volume patterns for data persistence

**Patterns:**
- Singleton S3Client pattern with connection reuse (Lambda optimization)
- Environment-driven configuration (following existing `@repo/observability` patterns)
- Zod schema validation for client configuration
- Atomic operations and error handling from `yaml-artifact-writer.ts`

**Packages:**
- `@aws-sdk/client-s3` (already in `@repo/s3-client`)
- MinIO official Docker image (`minio/minio:latest`)
- MinIO Client (`mc`) for health checks

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Manual Testing Focus:**
- Test MinIO startup: `docker compose -f infra/compose.lego-app.yaml up -d minio`
- Verify health check passes: `docker ps` shows healthy status
- Test bucket creation: `mc ls local/workflow-artifacts` shows bucket exists
- Test S3 client: Upload file to MinIO, download, delete, verify

**Automated Testing:**
- Integration test: S3 client against local MinIO (requires Docker running)
- Unit test: Configuration loading and environment detection
- Follow ADR-005: use real MinIO, not mocks

**Edge Cases:**
- MinIO not running (client should fail gracefully with clear error)
- Bucket already exists (idempotent bucket creation)
- Large file upload (test multipart upload against MinIO)

### For UI/UX Advisor

Not applicable - this is backend infrastructure work with no UI surface.

**Developer Experience Notes:**
- Clear documentation for starting MinIO: `docker compose up -d`
- Environment variable examples in `.env.example`
- Error messages should distinguish between MinIO (local) and S3 (production) issues
- Web console at `localhost:9001` for manual inspection (nice-to-have)

### For Dev Feasibility

**Implementation Path:**

1. **Docker Setup (Low Risk)**
   - Add MinIO service to `infra/compose.lego-app.yaml`
   - Create initialization script for bucket creation
   - Test health check and volume persistence
   - Estimated: 1-2 hours

2. **S3 Client Enhancement (Medium Risk)**
   - Add configuration schema with Zod
   - Implement environment detection logic
   - Add `forcePathStyle` and `endpoint` configuration
   - Test against both MinIO and mock S3
   - Estimated: 2-3 hours

3. **Integration & Documentation (Low Risk)**
   - Update README with MinIO instructions
   - Create `.env.example` with S3/MinIO variables
   - Manual smoke test against local MinIO
   - Estimated: 1 hour

**Technical Risks:**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MinIO version incompatibility with S3 SDK | Low | Medium | Use latest stable MinIO image, test with current SDK version |
| Bucket creation race condition on startup | Medium | Low | Use `mc mb --ignore-existing` command |
| Connection reuse conflicts between MinIO/S3 | Low | High | Separate S3Client instances per environment, test thoroughly |
| Health check flakiness | Low | Low | Use MinIO's built-in health endpoint, set reasonable timeout |

**Dependencies:**
- Docker installed and running
- MinIO image pullable from Docker Hub
- No code dependencies (INFR-0010 is parallel work, not blocking)

**Complexity:**
- Low - straightforward Docker service addition
- Low-Medium - S3 client enhancement requires careful testing but follows established patterns
- Total Estimate: 4-6 hours implementation + 2 hours testing
