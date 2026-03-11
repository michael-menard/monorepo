# Future Risks: INFR-0030

These risks are important for long-term quality but do not block MVP delivery.

---

## Non-MVP Risks

### 1. MinIO Web Console Security

**Risk:**
MinIO web console (port 9001) exposed without authentication in local development. If developers expose their local environment (ngrok, VPN), console is publicly accessible.

**Impact (if not addressed post-MVP):**
- Security vulnerability in developer environments
- Potential data exposure if local environment misconfigured

**Recommended Timeline:**
- Document security best practices in README (immediate)
- Consider disabling web console in future iteration (P3)

---

### 2. Port Conflicts with Existing Services

**Risk:**
Developers may have existing services on ports 9000 or 9001 (e.g., other MinIO instances, SonarQube, custom apps).

**Impact (if not addressed post-MVP):**
- Docker Compose fails to start MinIO
- Confusing error messages for developers
- Workaround: manual port remapping

**Recommended Timeline:**
- Document port conflict resolution in README (immediate)
- Make ports configurable via environment variables (INFR follow-up story, P3)

---

### 3. MinIO Version Pinning

**Risk:**
Using `minio/minio:latest` tag in Docker Compose means version changes unexpectedly, potentially introducing breaking changes.

**Impact (if not addressed post-MVP):**
- Inconsistent behavior across developer machines
- Potential S3 API compatibility issues after MinIO upgrade
- Difficult to reproduce bugs

**Recommended Timeline:**
- Pin to specific MinIO version in follow-up (Q1 2026)
- Document version upgrade process

---

### 4. Observability Gap

**Risk:**
No metrics or logs integration for MinIO (Prometheus, Grafana, OTel Collector exist in stack but not configured for MinIO).

**Impact (if not addressed post-MVP):**
- Difficult to debug MinIO performance issues locally
- No visibility into storage usage or request patterns
- Missing development parity with production S3 monitoring

**Recommended Timeline:**
- Add MinIO metrics exporter (TELE epic, P2)
- Integrate with existing Prometheus/Grafana (TELE epic, P2)

---

### 5. Bucket Lifecycle Policies

**Risk:**
No automatic cleanup of old artifacts in local MinIO. Test data accumulates indefinitely.

**Impact (if not addressed post-MVP):**
- MinIO volume grows unbounded
- Slower queries for bucket listings
- Developer disk space consumed

**Recommended Timeline:**
- Document manual cleanup procedure (immediate)
- Add bucket lifecycle policies (INFR follow-up story, P3)
- Consider TTL-based auto-deletion for test artifacts

---

### 6. Multi-Bucket Strategy

**Risk:**
Single bucket (`workflow-artifacts`) for all artifact types. No separation by environment, feature, or artifact category.

**Impact (if not addressed post-MVP):**
- Difficult to isolate test data from real artifacts
- No clear deletion strategy (delete entire bucket?)
- Naming conflicts if multiple developers use same keys

**Recommended Timeline:**
- Define bucket naming strategy (immediate documentation)
- Implement multi-bucket support (INFR-0020 integration, P2)
- Example buckets: `workflow-artifacts-dev`, `workflow-artifacts-test`

---

### 7. S3 Presigned URLs

**Risk:**
Current S3 client does not support presigned URLs. Future use cases (direct browser uploads, temporary download links) will require this.

**Impact (if not addressed post-MVP):**
- Cannot implement browser-to-S3 direct uploads
- All file transfers must proxy through backend
- Increased Lambda costs and latency

**Recommended Timeline:**
- Add presigned URL support when needed (INFR follow-up story, P2)
- Document use cases requiring presigned URLs

---

### 8. Cross-Region Replication

**Risk:**
No replication strategy for MinIO data. If MinIO volume corrupted, all local artifact data lost.

**Impact (if not addressed post-MVP):**
- Developer data loss risk (low impact: local development only)
- No backup/restore mechanism

**Recommended Timeline:**
- Document backup recommendations (immediate)
- Implement volume backup script (INFR follow-up story, P3)
- Example: `docker run --rm -v minio_data:/data -v /backup:/backup alpine tar czf /backup/minio-backup.tar.gz /data`

---

### 9. Connection Pool Tuning

**Risk:**
S3Client uses default AWS SDK connection pooling. May not be optimal for high-throughput local development scenarios (batch artifact uploads).

**Impact (if not addressed post-MVP):**
- Slower than necessary batch operations
- Potential connection exhaustion under load

**Recommended Timeline:**
- Measure current performance (INFR-0020 integration testing)
- Tune connection pool if bottleneck identified (P3)

---

### 10. MinIO Access Policies

**Risk:**
MinIO uses root credentials for all operations. No IAM-like policies or access control.

**Impact (if not addressed post-MVP):**
- Cannot test S3 IAM policies locally
- Development/production parity gap for security testing
- All operations have full admin access

**Recommended Timeline:**
- Document IAM parity gap (immediate)
- Implement MinIO policies for testing (INFR follow-up story, P3)
- Example: Create read-only user for testing restricted access

---

## Scope Tightening Suggestions

### Defer to INFR-0020 (Artifact Writer/Reader Service)

**Items to exclude from INFR-0030:**
- Automatic artifact migration from filesystem to MinIO
- Integration with orchestrator artifact writers
- Artifact metadata synchronization between Postgres and MinIO
- Multi-file upload/download abstractions

**Rationale:**
INFR-0030 provides infrastructure only. INFR-0020 will implement business logic for artifact storage decisions.

### Defer to Future Stories

**Items to exclude from INFR-0030:**
- Grafana dashboards for MinIO metrics
- CloudFormation templates for production S3 buckets
- Artifact encryption at rest (beyond S3 default)
- Content-addressable storage or deduplication
- Artifact versioning or soft-delete

**Rationale:**
These are polish/optimization concerns, not core infrastructure requirements.

---

## Future Requirements

### Nice-to-Have Requirements

1. **MinIO TLS/HTTPS Support**
   - Enables testing SSL certificate handling
   - Development parity with production S3 (always HTTPS)
   - Requirement: Generate self-signed cert for local MinIO

2. **Bucket Tagging and Metadata**
   - Test S3 object tagging features locally
   - Enable filtering and organization of test artifacts
   - Requirement: Extend `uploadToS3()` to support tags parameter

3. **Parallel Upload Optimization**
   - Batch upload multiple artifacts concurrently
   - Requirement: Promise.all wrapper around uploadToS3()

4. **MinIO Admin CLI Integration**
   - Helper scripts for common MinIO operations
   - Requirement: Document `mc` commands for developers

5. **Docker Compose Profiles**
   - Optional MinIO service (not started by default)
   - Requirement: Add `profiles: [storage]` to MinIO service
   - Usage: `docker compose --profile storage up -d`

---

## Polish and Edge Case Handling

### Error Message Improvements

**Current (assumed):**
```
Error: connect ECONNREFUSED 127.0.0.1:9000
```

**Future (improved):**
```
MinIO connection failed (http://localhost:9000)
Ensure MinIO is running: docker compose up -d minio
Check health status: docker ps | grep minio
```

### Developer Experience Enhancements

1. **Automatic bucket creation script**
   - Run on first `docker compose up`
   - Eliminates manual initialization step

2. **Test data seeders**
   - Populate MinIO with sample artifacts for testing
   - Useful for integration test fixtures

3. **Docker Compose health check output**
   - Show MinIO startup progress in logs
   - Clear indication when ready to accept connections

4. **README quick start section**
   - One-liner to start entire stack: `docker compose up -d`
   - Verification commands: health checks, bucket listing

---

## Impact Assessment

### Cumulative Risk if All Future Risks Unaddressed

- **Local Development Experience:** Minor degradation (port conflicts, manual cleanup)
- **Security:** Low risk (local development only, no production exposure)
- **Performance:** Minimal impact (connection pooling not critical for dev)
- **Observability:** Moderate gap (no metrics, harder to debug)
- **Operational Complexity:** Low (simple Docker service)

**Recommendation:** Address risks incrementally based on developer feedback and usage patterns. None are urgent post-MVP.
