# Future Opportunities - BUGF-031

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No rate limiting on presigned URL generation | Medium | Medium | Add rate limiting to prevent abuse of presigned URL endpoint (e.g., 100 requests per minute per user). Not MVP-blocking as auth requirement provides basic protection. |
| 2 | No magic number validation for file types | Low | Low | Add magic number checks to validate PDF signature beyond MIME type. Current MIME type validation is sufficient for MVP. |
| 3 | No S3 lifecycle policies for cleanup | Low | Medium | Add lifecycle policy to delete orphaned uploads after 30 days if not associated with instruction record. Not MVP-blocking as storage cost is minimal. |
| 4 | No file size validation in IAM policy | Low | Low | IAM policy could enforce max file size (100MB) via s3:PutObject condition. Current server-side validation is sufficient for MVP. |
| 5 | No presigned URL usage tracking | Low | Low | Track which presigned URLs are actually used for analytics. Not needed for core functionality. |
| 6 | S3 bucket name not validated at startup | Low | Low | Add startup validation that UPLOAD_BUCKET_NAME env var exists and bucket is accessible. Current error handling catches missing bucket at runtime. |
| 7 | No content-length enforcement in presigned URL | Low | Low | Presigned URL could include content-length condition to prevent oversized uploads. Current API validation is sufficient. |
| 8 | No ETL for failed uploads | Low | Medium | Track failed uploads in database for debugging and retry. Not needed for MVP as client-side retry handles transient failures. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Multipart upload support for large files | Medium | High | Support multipart uploads for files >100MB. Story explicitly excludes this as instruction PDFs are <100MB. Future enhancement if file size requirements change. |
| 2 | Virus scanning integration | High | High | Integrate with AWS S3 virus scanning (e.g., ClamAV Lambda). Deferred to future story per non-goals. High impact for security but not MVP-blocking. |
| 3 | CDN integration for downloads | Medium | Medium | Add CloudFront distribution for faster downloads with edge caching. Separate story per non-goals. |
| 4 | Image thumbnail generation for PDFs | Medium | Medium | Generate thumbnail images of PDF first page for preview. Nice-to-have for UX but not MVP-critical. |
| 5 | Progress tracking for uploads | Low | Medium | Add server-side progress tracking (currently client-side only via XHR). Not needed as frontend already has full progress UI. |
| 6 | Upload analytics and monitoring | Medium | Low | Add CloudWatch metrics for upload success rate, file sizes, and latency. Good for observability but not MVP-blocking. |
| 7 | Presigned URL caching | Low | Medium | Cache presigned URLs for same file request within expiry window. Premature optimization as presigned URL generation is fast. |
| 8 | Multiple file categories per upload | Low | High | Support uploading multiple file types in single request (instruction + thumbnail + parts list). Current single-file-per-request is simpler and sufficient. |
| 9 | Webhook notifications on upload completion | Low | High | Send webhook/event when file upload completes successfully. Not needed for MVP as frontend polls or uses sync flow. |
| 10 | S3 Transfer Acceleration | Low | Low | Enable S3 Transfer Acceleration for faster uploads from distant regions. Not needed for MVP as standard S3 PUT is sufficient. |
| 11 | Pre-flight validation endpoint | Low | Medium | Add endpoint to validate file metadata before generating presigned URL. Current validation in presigned URL endpoint is sufficient. |
| 12 | Upload quota enforcement | Medium | Medium | Enforce per-user upload quotas (e.g., 100 files per month). Not needed for MVP but important for cost control at scale. |

## Categories

### Edge Cases
- File with same name uploaded twice (current fileId prevents overwrites)
- User requests presigned URL but never uploads (expires after 15 minutes, no cleanup needed)
- User uploads file after presigned URL expires (client should detect expiry and request new URL)
- Network failure during S3 upload (client should retry with exponential backoff)

### UX Polish
- Real-time upload speed indication (currently progress percentage only)
- Estimated time remaining for uploads (frontend feature, not backend)
- Drag-and-drop validation before upload starts (frontend feature)
- Auto-retry on transient S3 errors (client-side XHR should handle)

### Performance
- Presigned URL generation latency < 100ms (current implementation likely meets this)
- S3 PUT latency optimization via region selection (depends on user location)
- Parallel upload support for multiple files (frontend feature with batch presigned URLs)
- Compression before upload (client-side, not backend concern)

### Observability
- CloudWatch metrics for presigned URL generation rate
- CloudWatch metrics for upload success/failure rate
- Tracing with X-Ray for presigned URL endpoint
- Alerts on high error rates or IAM policy failures

### Integrations
- Integration with virus scanning service (mentioned above)
- Integration with document processing pipeline (extract metadata from PDFs)
- Integration with search indexing (Elasticsearch/OpenSearch for uploaded files)
- Integration with backup/disaster recovery system

## Implementation Notes

### Rate Limiting
When implementing rate limiting (post-MVP):
- Use API Gateway rate limiting (e.g., 100 requests per minute per user)
- Or implement in middleware with Redis/DynamoDB for distributed counter
- Return 429 Too Many Requests with Retry-After header
- Frontend should display rate limit message to user

### Virus Scanning
When implementing virus scanning (future story):
- Use AWS Lambda with ClamAV or third-party service
- Scan files after upload completes (async process)
- Update file status in database (pending -> scanned/quarantined)
- Send notification to user if file fails scan
- Consider S3 event trigger for automatic scanning

### Multipart Upload
When implementing multipart upload (future story):
- Use `createMultipartUpload` and `uploadPart` from AWS SDK
- Generate presigned URLs for each part
- Frontend should manage part uploads and completion
- Add endpoint to complete multipart upload with part ETags
- Consider automatic cleanup of incomplete multipart uploads

### Upload Quotas
When implementing quotas (future story):
- Define quota limits per user tier (free/paid)
- Check quota before generating presigned URL
- Store upload counts in database or Redis
- Return 403 Forbidden with quota exceeded message
- Consider soft limits with warnings before hard limits

## Monitoring Recommendations

Key metrics to add post-MVP:
1. **Presigned URL generation latency** (p50, p95, p99)
2. **Upload success rate** (successful S3 PUTs / total presigned URLs generated)
3. **File size distribution** (histogram of uploaded file sizes)
4. **Error rate by type** (401, 400, 413, 500 counts)
5. **IAM policy denials** (track S3 PutObject access denied errors)

## Security Enhancements

Post-MVP security considerations:
1. **Magic number validation** - Verify PDF signature bytes (not just MIME type)
2. **Content inspection** - Scan PDFs for embedded malware
3. **Rate limiting** - Prevent presigned URL generation abuse
4. **Audit logging** - Log all presigned URL generation requests
5. **File hash verification** - Compare client-provided hash with uploaded file hash
