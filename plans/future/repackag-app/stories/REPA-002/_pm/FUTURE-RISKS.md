# Future Risks: REPA-002 - Migrate Upload Client Functions

## Non-MVP Risks

### Risk 1: Old Package Removal Timeline
**Impact (if not addressed post-MVP)**: The deprecated `@repo/upload-client` package will remain in the repository indefinitely, causing confusion for new developers who may not realize it's deprecated.

**Recommended timeline**: Remove package 2-3 sprints after REPA-002 deployment, once deprecation period complete and no rollback needed.

**Mitigation plan**:
- Add follow-up story: "Remove deprecated @repo/upload-client package"
- Wait for at least 2 production deployments to verify no issues
- Add automated check to prevent new imports of deprecated package (ESLint rule)

---

### Risk 2: Test Coverage Gaps for Edge Cases
**Impact (if not addressed post-MVP)**: Some edge cases may not be covered by tests (e.g., Unicode filenames, very large files, exotic MIME types). These could cause issues in production but don't block core upload flow.

**Recommended timeline**: Add comprehensive edge case tests in next sprint after REPA-002.

**Mitigation plan**:
- Create follow-up story: "Add comprehensive edge case tests for upload client"
- Focus on:
  - Unicode filename handling (Chinese, Russian, emoji)
  - Very large files (>100MB)
  - Exotic file types (HEIC, WebP, AVIF)
  - Network edge cases (slow connections, intermittent failures)
  - Browser compatibility (Safari, Firefox, Edge)

---

### Risk 3: Performance Monitoring for Upload Progress
**Impact (if not addressed post-MVP)**: Upload progress callbacks may fire too frequently for very large files, causing UI performance issues. Not critical for MVP since most uploads are <10MB.

**Recommended timeline**: Add performance monitoring and optimization in 2-3 sprints.

**Mitigation plan**:
- Add telemetry to track upload progress callback frequency
- Implement throttling for progress callbacks (max 10 updates/second)
- Add performance test with 100MB+ files
- Create follow-up story: "Optimize upload progress callback performance"

---

### Risk 4: Error Message Internationalization
**Impact (if not addressed post-MVP)**: Error messages from finalize client are currently in English only. If app expands to international markets, these need localization. Not blocking MVP since primary market is English-speaking.

**Recommended timeline**: Address when i18n is implemented across the app (future epic).

**Mitigation plan**:
- Use error codes (not messages) as primary error identifier
- Keep error messages generic enough to be user-friendly
- Add follow-up story: "Internationalize upload error messages"
- Coordinate with broader i18n effort

---

### Risk 5: Upload Analytics and Observability
**Impact (if not addressed post-MVP)**: Currently no tracking of upload success/failure rates, average upload times, or error frequency. Makes it hard to diagnose production issues or optimize performance.

**Recommended timeline**: Add analytics in 1-2 sprints after REPA-002.

**Mitigation plan**:
- Add telemetry for:
  - Upload success rate (per app, per file type)
  - Average upload time (by file size bucket)
  - Error rate by type (network, validation, conflict, rate limit)
  - Retry frequency (if retry logic added)
- Integrate with existing observability stack (DataDog, Sentry, etc.)
- Create dashboard for upload health metrics
- Follow-up story: "Add upload analytics and observability"

---

### Risk 6: Retry Logic for Transient Failures
**Impact (if not addressed post-MVP)**: Currently no automatic retry for transient network failures (e.g., 500 errors, timeouts). Users must manually retry uploads. Degrades user experience but doesn't block core functionality.

**Recommended timeline**: Add retry logic in 2-3 sprints after REPA-002.

**Mitigation plan**:
- Implement exponential backoff retry for:
  - 500/502/503/504 server errors
  - Network timeout errors
  - Transient S3 upload failures
- Respect 429 rate limit responses (no retry, show retry-after)
- Add max retry limit (3 attempts)
- Add retry telemetry to track effectiveness
- Follow-up story: "Add automatic retry for transient upload failures"

---

### Risk 7: Progress Persistence Across Page Reload
**Impact (if not addressed post-MVP)**: If user refreshes page during upload, progress is lost and upload must restart. Not critical for MVP since most uploads complete quickly (<30 seconds).

**Recommended timeline**: Add progress persistence in future enhancement epic.

**Mitigation plan**:
- Store upload state in localStorage or IndexedDB
- On page load, check for in-progress uploads and resume
- Handle edge cases:
  - Expired presigned URLs (require new URL from backend)
  - Partially uploaded files (resume from last byte)
  - Session expiration (require re-authentication)
- Follow-up story: "Add upload progress persistence across page reload"

---

### Risk 8: Concurrent Upload Limit Tuning
**Impact (if not addressed post-MVP)**: Current concurrent upload limit (likely 3) may not be optimal for all network conditions. Some users may benefit from higher concurrency (fast connections) or lower concurrency (slow connections). Not blocking MVP.

**Recommended timeline**: Add dynamic tuning based on network conditions in 2-3 sprints.

**Mitigation plan**:
- Add telemetry to track upload throughput by concurrency level
- Implement adaptive concurrency based on:
  - Network speed detection (navigator.connection.effectiveType)
  - Upload success rate (reduce concurrency if failures increase)
  - Device capabilities (reduce on low-end devices)
- Add user preference setting for manual override
- Follow-up story: "Optimize concurrent upload limits based on network conditions"

---

### Risk 9: File Validation Before Upload
**Impact (if not addressed post-MVP)**: Currently file validation happens during finalize (server-side). Users may upload large files only to discover they're invalid (too large, wrong type, etc.). Wastes bandwidth and time. Not blocking MVP but degrades UX.

**Recommended timeline**: Add client-side validation in next sprint after REPA-002.

**Mitigation plan**:
- Add pre-upload validation:
  - File size limits (check before upload starts)
  - File type validation (MIME type + extension check)
  - File count limits (max files per session)
- Show validation errors immediately (before upload starts)
- Reduce server load by catching validation errors early
- Follow-up story: "Add client-side file validation before upload"

---

### Risk 10: Upload Resumability (S3 Multipart)
**Impact (if not addressed post-MVP)**: For very large files (>100MB), uploads may fail mid-transfer due to network issues. Currently user must restart entire upload. Not blocking MVP since most files are <10MB.

**Recommended timeline**: Add multipart upload support in future epic (if large file uploads become common).

**Mitigation plan**:
- Implement S3 multipart upload for files >50MB:
  - Split file into 5MB chunks
  - Upload chunks sequentially or in parallel
  - Track uploaded chunks (for resume)
  - Complete multipart upload on finalize
- Handle chunk failures gracefully (retry individual chunks)
- Add UI progress indicator for multipart uploads (show chunks completed)
- Follow-up story: "Add S3 multipart upload support for large files"

---

## Scope Tightening Suggestions

### Suggestion 1: Defer Package Removal
**Clarification**: REPA-002 should ONLY deprecate `@repo/upload-client`, not remove it. Removal should be a separate story after deprecation period (2-3 sprints).

**Rationale**: Allows rollback if issues discovered in production. Gives team time to verify no hidden dependencies on old package.

**OUT OF SCOPE for REPA-002**:
- Deleting `packages/core/upload-client/` directory
- Removing `@repo/upload-client` from app `package.json` dependencies
- Cleaning up Git history to remove old package

**IN SCOPE for follow-up story (REPA-007 or similar)**:
- Remove deprecated package after deprecation period
- Clean up workspace dependencies
- Update documentation to remove all references

---

### Suggestion 2: Defer Test Coverage Expansion
**Clarification**: REPA-002 should migrate existing tests and add tests for finalize functionality. Comprehensive edge case tests can be added later.

**Rationale**: Keeps scope focused on migration. Edge case tests are valuable but not MVP-blocking.

**OUT OF SCOPE for REPA-002**:
- Testing all file types (HEIC, WebP, AVIF, etc.)
- Testing all browsers (Safari, Firefox, Edge, etc.)
- Performance testing with 100MB+ files
- Network condition testing (slow 3G, packet loss, etc.)

**IN SCOPE for REPA-002**:
- Migrate existing tests from `@repo/upload-client`
- Add tests for finalize functionality (happy path, 409, 429, 400)
- Verify test coverage meets 45% minimum
- Integration tests for import site updates

---

### Suggestion 3: Defer Analytics and Observability
**Clarification**: REPA-002 should focus on code migration only. Analytics and telemetry can be added in follow-up story.

**Rationale**: Keeps story small and focused. Analytics are valuable but not blocking upload functionality.

**OUT OF SCOPE for REPA-002**:
- Adding telemetry events (upload success, failure, duration)
- Creating analytics dashboard
- Integrating with DataDog/Sentry
- Adding performance monitoring

**IN SCOPE for follow-up story (coordinate with observability team)**:
- Add telemetry for upload metrics
- Track error rates by type
- Monitor upload performance
- Create alerts for high error rates

---

## Future Requirements

### Future Requirement 1: Progress Callback Customization
**Description**: Allow consumers to customize progress callback behavior (frequency, format, debouncing).

**Use case**: Some UIs may want high-frequency updates (every 1%), others may want low-frequency (every 10%). Some may want percentage, others want bytes uploaded.

**API suggestion**:
```typescript
uploadFile(file, url, {
  progressCallback: {
    frequency: 'percent' | 'bytes' | 'time',
    interval: 10, // every 10% or 10KB or 10ms
    debounce: 100, // ms debounce
    format: (progress) => `${progress.loaded}/${progress.total}`
  }
})
```

**Timeline**: Add if requested by consumers (not proactive).

---

### Future Requirement 2: Upload Queue Priority
**Description**: Allow consumers to specify upload priority (high, normal, low) so critical uploads process first.

**Use case**: User uploads multiple files, marks one as "featured image" (high priority). That file should upload first even if other files queued earlier.

**API suggestion**:
```typescript
uploadManager.addTask(file, url, { priority: 'high' | 'normal' | 'low' })
```

**Timeline**: Add if upload queue grows complex (unlikely for MVP).

---

### Future Requirement 3: Upload Lifecycle Hooks
**Description**: Allow consumers to hook into upload lifecycle events (beforeUpload, afterUpload, onError, etc.) for custom logic.

**Use case**: Consumer wants to show custom UI during upload (e.g., blur/grayscale preview until upload completes), or track analytics events.

**API suggestion**:
```typescript
uploadFile(file, url, {
  hooks: {
    beforeUpload: (file) => { /* validate, transform, etc. */ },
    afterUpload: (result) => { /* update UI, analytics, etc. */ },
    onError: (error) => { /* custom error handling */ },
    onProgress: (progress) => { /* custom progress UI */ }
  }
})
```

**Timeline**: Add if consumers have complex use cases (not needed for MVP).

---

### Future Requirement 4: Upload Caching/Deduplication
**Description**: Detect duplicate files (by content hash) and skip upload if already uploaded.

**Use case**: User accidentally uploads same file twice. System detects duplicate and reuses existing upload, saving bandwidth and time.

**Implementation**:
- Calculate file hash client-side (SHA-256)
- Check backend API for existing file with same hash
- If exists, skip upload and use existing key
- If not exists, proceed with upload

**Timeline**: Add if duplicate uploads become common (not MVP priority).

---

### Future Requirement 5: Upload Bandwidth Throttling
**Description**: Allow limiting upload bandwidth to avoid consuming all available network (useful on slow connections).

**Use case**: User on slow connection wants to upload files while continuing to browse app. Throttling prevents uploads from blocking other network requests.

**API suggestion**:
```typescript
uploadFile(file, url, {
  bandwidth: {
    limit: 1024 * 1024, // 1MB/s max
    adaptive: true // reduce limit if other requests detected
  }
})
```

**Timeline**: Add if users report upload blocking other app functionality (unlikely for <10MB files).

---

**FUTURE-RISKS COMPLETE** - Non-MVP risks documented with clear timelines and mitigation plans. Scope tightening suggestions provided to keep REPA-002 focused.
