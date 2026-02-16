# Dev Feasibility Review: INFR-0030

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Docker Compose pattern well-established in codebase
- S3 client already exists with working AWS integration
- MinIO is S3-compatible and widely used for local development
- Environment detection pattern exists in other packages (@repo/observability)
- No complex cross-package dependencies
- Clear scope with 13 testable acceptance criteria

---

## Likely Change Surface (Core Only)

### Packages Modified
1. **`infra/compose.lego-app.yaml`**
   - Add MinIO service definition
   - Configure ports, volumes, health checks
   - Estimated: 40-50 lines

2. **`packages/backend/s3-client/src/s3-client.ts`**
   - Add configuration schema (Zod)
   - Add environment detection logic
   - Add `initializeBucket()` helper
   - Estimated: 80-100 lines

3. **`packages/backend/s3-client/src/config.ts`** (new file)
   - S3/MinIO configuration loading
   - Environment variable parsing
   - Estimated: 40-50 lines

### Configuration Files
- **`.env.example`** - Add S3/MinIO variables
- **`README.md`** (root or infra/) - MinIO setup instructions

### Infrastructure Touchpoints
- Docker Compose stack (no migration required)
- Named volumes (new: `minio_data`)
- No database schema changes
- No API changes

---

## MVP-Critical Risks

### 1. MinIO S3 API Compatibility

**Why it blocks MVP:**
If MinIO's S3 API implementation has breaking differences from AWS S3, the S3 client adapter will fail for core operations (upload, download, delete).

**Required Mitigation:**
- Use latest stable MinIO Docker image (tested with AWS SDK v3)
- Test multipart upload explicitly (known edge case)
- Validate against MinIO compatibility matrix before implementation
- Fallback: Document any MinIO-specific limitations

**Likelihood:** Low (MinIO is production-grade S3 clone)

### 2. Docker Volume Persistence Configuration

**Why it blocks MVP:**
If named volume is not correctly configured, MinIO data will be lost on container restart, breaking the local development workflow.

**Required Mitigation:**
- Use Docker named volume (not bind mount) per existing pattern
- Test volume persistence explicitly (restart MinIO, verify data)
- Document volume management in README

**Likelihood:** Low (pattern exists for PostgreSQL volume)

### 3. Environment Detection Logic Errors

**Why it blocks MVP:**
If environment detection fails, developers will either:
- Use MinIO in production (data loss risk)
- Use S3 locally (connection errors, AWS charges)

**Required Mitigation:**
- Explicit environment variable checks (`NODE_ENV`, `S3_ENDPOINT`)
- Fail-safe defaults (production = AWS S3, local = error if no endpoint)
- Clear error messages for misconfiguration
- Unit tests for all environment combinations

**Likelihood:** Medium (logic complexity)

---

## Missing Requirements for MVP

### Bucket Creation Strategy

**Decision needed:**
Should bucket creation happen automatically on first upload, or require manual initialization?

**Concrete decision text:**
```
AC-9 clarification: initializeBucket() is a helper function that:
- MUST be called explicitly by developers (not automatic on first upload)
- Creates bucket only if it doesn't exist (idempotent)
- Throws clear error if bucket creation fails
- Used in test scripts and setup documentation

OR

AC-9 clarification: Client auto-creates bucket on first upload:
- uploadToS3() calls ensureBucketExists() internally
- No explicit initialization required
- Bucket creation errors logged but not thrown (best-effort)
```

**Recommendation:** Explicit initialization (clearer contract, less magic)

### MinIO Credentials Configuration

**Decision needed:**
Should MinIO use default credentials (`minioadmin:minioadmin`) or require custom credentials?

**Concrete decision text:**
```
MinIO credentials strategy:
- Default: minioadmin:minioadmin (for local development only)
- Environment variables: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
- Override defaults in .env.local if needed
- README includes security warning: Never use default credentials in production
```

### Health Check Timeout

**Decision needed:**
What is acceptable startup time for MinIO health check?

**Concrete decision text:**
```
MinIO health check configuration:
- Interval: 10s
- Timeout: 5s
- Retries: 3
- Start period: 30s (allows MinIO to initialize buckets)
```

---

## MVP Evidence Expectations

### Core Journey Evidence

**Scenario:** Developer starts local environment, uploads artifact to MinIO, restarts Docker, retrieves artifact

**Required Evidence:**

1. **MinIO Startup:**
   ```bash
   docker compose up -d minio
   docker ps | grep minio
   # Output shows: STATUS = healthy
   ```

2. **Bucket Initialization:**
   ```bash
   docker exec monorepo-minio mc ls local/
   # Output shows: workflow-artifacts/
   ```

3. **Upload Operation:**
   ```typescript
   // Script output shows:
   ✓ Uploaded test-artifact.txt to workflow-artifacts
   ETag: "abc123..."
   ```

4. **Persistence Verification:**
   ```bash
   docker compose restart minio
   # Wait for healthy status
   docker exec monorepo-minio mc cat local/workflow-artifacts/test-artifact.txt
   # Output: "Hello MinIO"
   ```

5. **Environment Detection:**
   ```typescript
   // Log output shows:
   S3 Client initialized:
   - Mode: local (MinIO)
   - Endpoint: http://localhost:9000
   - ForcePathStyle: true
   - Region: us-east-1
   ```

### Critical CI/Deploy Checkpoints

**Not applicable for INFR-0030:**
- MinIO is local development only (not deployed)
- No CI changes required
- No production infrastructure changes

**Documentation checkpoint:**
- README must include MinIO setup steps
- `.env.example` must include all required variables
- Clear distinction between local (MinIO) and production (S3) configuration

---

## Implementation Path

### Phase 1: Docker Setup (1-2 hours)

**Tasks:**
1. Add MinIO service to `infra/compose.lego-app.yaml`
2. Configure health check and named volume
3. Create bucket initialization script (entrypoint or init container)
4. Test: `docker compose up -d minio && docker ps`
5. Verify bucket creation: `docker exec ... mc ls`

**Validation:**
- MinIO container starts and becomes healthy
- Default bucket exists
- Data persists across restarts

### Phase 2: S3 Client Enhancement (2-3 hours)

**Tasks:**
1. Create configuration schema with Zod
2. Add environment detection logic (`getS3ClientConfig()`)
3. Update S3Client initialization with conditional `forcePathStyle`
4. Implement `initializeBucket()` helper
5. Update existing functions to use new config pattern

**Validation:**
- Unit tests: config loading for all environments
- Integration test: upload/download against local MinIO
- Existing AWS S3 behavior unchanged (regression test)

### Phase 3: Integration & Documentation (1 hour)

**Tasks:**
1. Update `.env.example` with S3/MinIO variables
2. Add MinIO section to README
3. Manual smoke test: full workflow (start MinIO, upload, restart, download)
4. Create test script for future developers

**Validation:**
- Fresh developer can follow README and start MinIO
- Test script runs successfully
- Documentation is clear and complete

---

## Total Estimate

**Implementation:** 4-6 hours
**Testing & Documentation:** 2 hours
**Buffer for edge cases:** 2 hours

**Total:** 8-10 hours (1-1.5 days)

---

## Dependencies

**No code dependencies:**
- INFR-0010 (Postgres Artifact Schemas) is parallel work
- INFR-0020 (Artifact Writer/Reader Service) depends on INFR-0030

**External dependencies:**
- Docker installed and running
- MinIO Docker image pullable from Docker Hub
- AWS SDK v3 already in package.json

---

## Complexity Assessment

**Technical Complexity:** Low-Medium

**Breakdown:**
- Docker service addition: **Low** (established pattern)
- Environment detection: **Medium** (requires careful testing)
- S3 client enhancement: **Low** (straightforward SDK configuration)
- Bucket initialization: **Low** (idempotent operation)
- Integration testing: **Medium** (requires Docker, multiple scenarios)

**Risk Factors:**
- Environment detection logic correctness (mitigated by unit tests)
- MinIO S3 API compatibility (mitigated by using stable API subset)
- Health check reliability (mitigated by conservative timeouts)

---

## Reuse Opportunities

### Existing Patterns to Follow

1. **Docker Compose structure** from `infra/compose.lego-app.yaml`:
   - Service naming: `monorepo-{service}`
   - Health checks with retries
   - Named volumes for persistence
   - Restart policy: `unless-stopped`

2. **Environment configuration** from `@repo/observability`:
   - Zod schema for config validation
   - Environment variable loading with defaults
   - Clear error messages for misconfiguration

3. **S3 client singleton** from `packages/backend/s3-client/`:
   - Connection reuse (Lambda optimization)
   - Error handling patterns
   - TypeScript types for SDK operations

### Components to Reuse

- Existing S3Client initialization pattern
- Existing Docker health check patterns
- Existing environment variable patterns
- Existing integration test structure (Vitest + Docker)

---

## Post-MVP Considerations

(See `FUTURE-RISKS.md` for non-blocking enhancements)
