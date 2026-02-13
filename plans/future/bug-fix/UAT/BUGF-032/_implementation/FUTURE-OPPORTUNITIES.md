# Future Opportunities - BUGF-032

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Session refresh flow not implemented | Medium | Medium | Tracked in BUGF-004 - enables seamless recovery from expired sessions |
| 2 | No retry-after countdown timer in RateLimitBanner | Low | Low | Enhancement for BUGF-019 - improve UX during rate limiting |
| 3 | No upload progress persistence | Low | Medium | If user closes tab during upload, progress is lost. Consider using service worker for background uploads |
| 4 | Duplicate file detection not implemented | Low | Low | Warn user if uploading file with identical name/size to existing upload |
| 5 | No client-side pre-validation UI | Low | Low | Show file type/size errors immediately on file selection before API call |
| 6 | No batch upload optimization | Low | Medium | Multiple files request N presigned URLs sequentially. Could batch into single API call |
| 7 | No upload analytics | Low | Low | Track upload success/failure rates, average upload times, common error types |
| 8 | Network quality detection missing | Low | Medium | Detect slow/poor network and suggest waiting or reducing file sizes |
| 9 | No upload cancellation confirmation | Low | Low | Confirm before canceling large file uploads (>50% complete) |
| 10 | Missing upload queue visualization | Low | Low | Show "Uploading file X of Y" status for multi-file uploads |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Success animation | Medium | Low | Add celebratory animation on successful upload completion (line 311 of story: "Optional: Add success animation (future enhancement)") |
| 2 | Drag-and-drop file selection | High | Medium | Allow drag-and-drop files directly onto upload area for improved UX |
| 3 | Image preview before upload | Medium | Low | Show thumbnail preview for image files before upload starts |
| 4 | Upload speed indicator | Medium | Low | Show MB/s upload speed alongside progress percentage |
| 5 | Automatic retry on network recovery | Medium | Medium | Auto-resume uploads when network connection is restored |
| 6 | Upload history/recent files | Medium | Medium | Show recently uploaded files for quick re-selection |
| 7 | Multipart upload support | High | High | Support files >100MB using S3 multipart upload API (future story) |
| 8 | Progressive image optimization | Medium | High | Auto-compress large images before upload using @repo/upload/image compression utilities |
| 9 | Camera/photo capture integration | Low | Medium | Allow direct photo capture from device camera (mobile enhancement) |
| 10 | Accessibility: Upload progress announcements | Medium | Low | Improve screen reader announcements for upload progress milestones (25%, 50%, 75%, 100%) |
| 11 | Offline queue | High | High | Queue uploads when offline, auto-upload when connection restored (service worker) |
| 12 | Upload templates/presets | Low | Medium | Save common upload configurations (file types, categories) as presets |
| 13 | Bulk file operations | Medium | Medium | Allow bulk retry/cancel/remove operations on multiple selected files |
| 14 | Upload verification | High | Medium | Verify uploaded file integrity by comparing local hash with S3 ETag |
| 15 | Upload resumption after refresh | Medium | High | Resume interrupted uploads after page refresh using file handles API |
| 16 | Custom error messages per file category | Low | Low | Tailor error messages based on file category (e.g., "PDF instructions must be...") |
| 17 | Upload conflict resolution | Low | Medium | If file with same name exists, offer rename/replace/skip options |
| 18 | Upload size estimation | Low | Low | Show estimated upload time based on file size and connection speed |
| 19 | Upload to CDN edge locations | High | High | Optimize upload speed by routing to nearest AWS edge location |
| 20 | Virus scanning integration | High | High | Scan uploaded files for malware before finalizing (deferred from BUGF-031, line 81) |

## Categories

### Edge Cases
- **Gap #4**: Duplicate file detection - rare but confusing UX
- **Gap #9**: Upload cancellation confirmation - prevents accidental data loss
- **Enhancement #17**: Upload conflict resolution - edge case for same filenames

### UX Polish
- **Enhancement #1**: Success animation - delighter for positive reinforcement
- **Enhancement #2**: Drag-and-drop - modern expected UX pattern
- **Enhancement #3**: Image preview - visual confirmation before upload
- **Enhancement #4**: Upload speed indicator - progress transparency
- **Enhancement #6**: Upload history - convenience for power users
- **Enhancement #10**: Improved accessibility announcements - WCAG AAA compliance
- **Enhancement #12**: Upload templates - productivity enhancement
- **Enhancement #16**: Custom error messages - clarity and guidance
- **Enhancement #18**: Upload size estimation - set user expectations

### Performance
- **Gap #6**: Batch upload optimization - reduce API round-trips
- **Gap #8**: Network quality detection - proactive UX
- **Enhancement #5**: Automatic retry on network recovery - resilience
- **Enhancement #7**: Multipart upload - support larger files (BUGF-001 deferred)
- **Enhancement #8**: Progressive image optimization - reduce upload time
- **Enhancement #11**: Offline queue - resilience and UX
- **Enhancement #14**: Upload verification - data integrity
- **Enhancement #15**: Upload resumption - user convenience
- **Enhancement #19**: CDN edge uploads - global performance

### Observability
- **Gap #7**: Upload analytics - product insights and monitoring
- **Gap #10**: Upload queue visualization - transparency for multi-file uploads

### Integrations
- **Gap #1**: Session refresh flow (BUGF-004) - seamless auth integration
- **Enhancement #9**: Camera capture - mobile platform integration
- **Enhancement #20**: Virus scanning - security service integration (deferred from BUGF-031)

## Implementation Priority

**High-Impact, Low-Effort (Quick Wins):**
1. Enhancement #1: Success animation
2. Enhancement #3: Image preview before upload
3. Enhancement #4: Upload speed indicator
4. Gap #5: Client-side pre-validation UI
5. Enhancement #10: Improved accessibility announcements
6. Enhancement #16: Custom error messages per file category

**High-Impact, Medium-Effort (Next Quarter):**
1. Enhancement #2: Drag-and-drop file selection
2. Enhancement #5: Automatic retry on network recovery
3. Enhancement #6: Upload history/recent files
4. Enhancement #14: Upload verification
5. Gap #3: Upload progress persistence

**High-Impact, High-Effort (Future Roadmap):**
1. Enhancement #7: Multipart upload support (dedicated story)
2. Enhancement #11: Offline queue (service worker)
3. Enhancement #15: Upload resumption after refresh
4. Enhancement #19: Upload to CDN edge locations
5. Enhancement #20: Virus scanning integration (security initiative)

**Notes:**
- Gap #1 (Session refresh) already tracked in BUGF-004
- Gap #2 (Rate limit countdown) already tracked in BUGF-019
- Enhancement #7 (Multipart upload) was explicitly deferred from BUGF-001/BUGF-031 scope
- Enhancement #20 (Virus scanning) was explicitly deferred from BUGF-031 scope (line 81)

## Cross-Story Opportunities

### BUGF-004 Integration (Session Refresh API)
When BUGF-004 is implemented:
- Remove TODO comment from line 272 of InstructionsNewPage.tsx
- Call session refresh API in `handleRefreshSession`
- Auto-refresh expired files without user action
- Update E2E Test Case 4 to verify automatic refresh flow

### BUGF-028 Integration (MSW Mocking)
When BUGF-028 is implemented:
- Update unit tests to use MSW handlers for presigned URL responses
- Mock S3 upload responses for integration tests
- Test error scenarios without hitting real API

### BUGF-030 Integration (E2E Test Suite)
When BUGF-030 is implemented:
- Incorporate upload flow E2E tests from BUGF-032 (lines 213-285)
- Reuse Playwright page objects for upload components
- Share test data seeding utilities

### Upload Feature Enhancements
- **Image Processing Integration**: Use `@repo/upload/image` compression utilities for Enhancement #8
- **File Validation Library**: Create shared validation utilities for Gap #5 and Enhancement #16
- **Upload Analytics Service**: Centralize metrics collection for Gap #7 across all upload features

## Security Considerations (Future)

While not MVP-critical, consider these security enhancements for production:

1. **Client-side file hash verification** (Enhancement #14) - Prevents corrupted uploads
2. **Rate limiting on client side** (Gap #2 enhancement) - Prevent API abuse
3. **Virus scanning** (Enhancement #20) - Security best practice for user-uploaded content
4. **File metadata stripping** - Remove EXIF/metadata from images before upload (privacy)
5. **Upload quota enforcement** - Per-user storage limits (business logic)
6. **Presigned URL one-time use** - Prevent URL reuse after successful upload (backend enhancement)

## Technical Debt

### Current Implementation Limitations
1. **Upload manager concurrency** - Fixed at 3 concurrent uploads (line 37 of useUploadManager.ts). Could be made dynamic based on network conditions.
2. **Session expiry buffer hardcoded** - 30 seconds (line 43 of useUploadManager.ts). Could be configurable.
3. **Error message mapping** - Hardcoded in upload manager (line 215-236). Could be extracted to shared error mapping service.
4. **File handle persistence** - Lost on page refresh. Could use File System Access API for resumption (Enhancement #15).

### Refactoring Opportunities (Post-MVP)
1. **Extract upload state machine** - Current state transitions are implicit. Could use XState for explicit state management.
2. **Separate API integration from UI logic** - Upload pages have mixed concerns (lines 148-169, 268-277 of InstructionsNewPage.tsx).
3. **Create upload orchestrator service** - Coordinate between API calls, upload manager, and session management.
4. **Standardize error handling** - Consolidate error mapping across all error sources (API, S3, network).

## Lessons Learned (Post-Implementation)

**To be filled in after story completion:**
- What worked well in the integration?
- What was more complex than expected?
- What would we do differently next time?
- What patterns should be applied to other upload integrations?
