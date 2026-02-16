# Future Opportunities - INFR-0030

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No S3 presigned URLs for direct uploads | Medium | Medium | Add `generatePresignedUrl()` helper for client-side uploads without Lambda proxy |
| 2 | No bucket versioning configuration | Low | Low | Enable versioning in MinIO and S3 for accidental deletion recovery |
| 3 | No S3 lifecycle policies | Low | Medium | Add lifecycle rules to archive old artifacts to Glacier after 90 days |
| 4 | No MinIO access control beyond root | Low | Medium | Create service accounts with bucket-specific permissions |
| 5 | No cross-region replication setup | Low | High | Configure replication for disaster recovery in production |
| 6 | No automated bucket backup strategy | Medium | High | Implement periodic MinIO backup and S3 versioning policy |
| 7 | Edge case: very large files (>5GB) | Low | Medium | Test multipart upload with files >5GB, adjust part size if needed |
| 8 | Edge case: special characters in keys (spaces, unicode) | Low | Low | Add key sanitization or validation to prevent S3 API errors |
| 9 | Edge case: MinIO not running (error handling) | Low | Low | Enhance error messages when MinIO is unreachable during local dev |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Observability: MinIO metrics to Prometheus | Medium | Medium | Export MinIO metrics to Prometheus for monitoring storage usage, API latency |
| 2 | UX: MinIO web console SSO | Low | High | Integrate MinIO console with OAuth/SAML for team access |
| 3 | Performance: CDN integration for public assets | Medium | High | Add CloudFront or similar CDN for frequently accessed artifacts |
| 4 | Performance: S3 Transfer Acceleration | Low | Low | Enable S3 Transfer Acceleration for faster uploads from distant regions |
| 5 | Integration: Artifact catalog indexing | High | Medium | Auto-index uploaded artifacts in OpenSearch for full-text search |
| 6 | Integration: S3 event notifications | Medium | Medium | Trigger Lambda on S3 uploads for automatic processing (thumbnail generation, virus scanning) |
| 7 | Integration: MinIO replication to S3 | Medium | High | Sync local MinIO artifacts to S3 for testing production data flows |
| 8 | Developer UX: CLI tool for MinIO operations | Low | Medium | Create `pnpm minio:upload`, `pnpm minio:download`, `pnpm minio:list` commands |
| 9 | Testing: Integration tests for S3 operations | Medium | Medium | Add Vitest integration tests that run against MinIO in CI |
| 10 | Documentation: Architecture decision record | Low | Low | Create ADR documenting MinIO vs LocalStack vs fake-s3 decision |

## Categories

### Edge Cases
- Very large file handling (>5GB)
- Special character sanitization in keys
- MinIO unreachable error messaging

### UX Polish
- MinIO web console SSO integration
- CLI tool for common operations
- Better error messages for configuration issues

### Performance
- MinIO metrics to Prometheus/Grafana
- CDN integration for public assets
- S3 Transfer Acceleration for distant regions

### Observability
- Prometheus metrics export from MinIO
- Grafana dashboards for storage usage
- Alert on storage quota thresholds

### Integrations
- S3 event notifications for automated processing
- Artifact catalog indexing in OpenSearch
- MinIO-to-S3 replication for production testing

### Security
- MinIO service accounts with limited permissions
- Bucket versioning for accidental deletion recovery
- Regular backup strategy

### Operational Excellence
- Automated lifecycle policies for archival
- Cross-region replication for disaster recovery
- Integration tests in CI pipeline
