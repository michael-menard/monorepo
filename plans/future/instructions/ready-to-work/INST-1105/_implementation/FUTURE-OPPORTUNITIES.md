# Future Opportunities - INST-1105

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Time remaining display ("6 seconds remaining") | Low - Nice UX polish, not critical for MVP | Low (4 hours) | Marked as "Nice-to-Have" in UIUX-NOTES.md line 562. Requires accurate speed calculation, adds visual noise. Defer to Phase 2 |
| 2 | Pause/resume button during upload | Low - Cancel + Retry covers same use case | High (8 hours) | Marked as Phase 2 in UIUX-NOTES.md line 563. XHR pause/resume is complex. Not standard browser API |
| 3 | Batch actions UI (Start All, Cancel All, Retry Failed) | Medium - Reduces clicks for multi-file upload | Medium (6 hours) | Marked as Phase 2 in UIUX-NOTES.md line 564-565. Adds UI complexity, but useful for power users uploading 5+ files |
| 4 | Cancel All confirmation modal | Low - Prevents accidental bulk cancellation | Low (2 hours) | Per UIUX-NOTES.md line 659, modal reduces accidental cancellations but adds friction. Safe to defer |
| 5 | Session expiry countdown timer ("14:30 remaining") | Low - 5-minute warning is sufficient | Low (3 hours) | Per UIUX-NOTES.md line 665, timer adds precision but visual noise. Warning at 5 min is MVP-acceptable |
| 6 | Upload speed units adaptation (KB/s for slow connections) | Low - MB/s simpler for MVP | Low (2 hours) | Per UIUX-NOTES.md line 666, MB/s always shown is simpler. KB/s more accurate for <1 MB/s, but rare edge case |
| 7 | Progress announcement frequency setting (screen readers) | Low - 25% intervals acceptable for MVP | Low (2 hours) | Per UIUX-NOTES.md line 667, 25% intervals more informative, 50% less verbose. User setting deferred to Phase 2 |
| 8 | Keyboard shortcuts modal (Shift + ?) | Low - Basic keyboard nav (Tab, Enter, Escape) covered | Low (3 hours) | Per UIUX-NOTES.md line 460, shortcuts modal is power-user feature. Defer to Phase 2 (INST-2043) |
| 9 | High Contrast Mode support | Low - WCAG AA compliance sufficient | Medium (4 hours) | Per UIUX-NOTES.md line 461, Windows High Contrast Mode requires additional CSS. Defer to accessibility audit |
| 10 | Reduced motion support | Medium - Accessibility enhancement | Low (2 hours) | Per UIUX-NOTES.md line 462, prefers-reduced-motion CSS media query. Good a11y practice, not critical |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Upload history (recently uploaded files) | Medium - Helps users track uploads across sessions | Medium (6 hours) | Store upload metadata in localStorage with timestamps. Display in sidebar or modal. Phase 2 |
| 2 | Session refresh button (manual refresh option) | Low - Auto-refresh handles most cases | Low (2 hours) | Per DEV-FEASIBILITY.md line 710, manual refresh option gives power users control. Nice-to-have |
| 3 | Upload speed optimization (S3 Transfer Acceleration) | Medium - Faster uploads for international users | High (8 hours) | Per DEV-FEASIBILITY.md line 711, S3 Transfer Acceleration requires bucket config change. Evaluate if users report slow uploads |
| 4 | Progress persistence (localStorage) | High - Resume uploads after page reload | High (12 hours) | Per DEV-FEASIBILITY.md line 712, store upload progress + file handles in localStorage. Complex due to File object serialization. Phase 2 (INST-2036) |
| 5 | File size verification with exact match (not 5% tolerance) | Medium - Improves integrity checking | Low (2 hours) | Per DEV-FEASIBILITY.md line 659, reduce tolerance from 5% to 1% or use ETag. Safer for binary PDFs |
| 6 | Unique constraint on moc_files(mocId, s3Key) | Medium - Prevents duplicate file records | Low (1 hour) | Per DEV-FEASIBILITY.md line 701, database unique constraint prevents race condition on duplicate inserts. Add to migration |
| 7 | Session expiry E2E test with time mocking | High - Validates critical flow | Medium (4 hours) | Per DEV-FEASIBILITY.md line 702, mock time to test 15-minute expiry flow. Valuable for CI/CD confidence. Add to INST-1300 |
| 8 | Orphaned file cleanup job reference in story | Low - Cleanup handled by INST-1204 | Low (1 hour) | Per DEV-FEASIBILITY.md line 703, document cleanup in INST-1204 (S3 Cleanup for Failed Uploads). Cross-reference stories |
| 9 | Unsaved uploads guard (page navigation warning) | Medium - Prevents accidental upload loss | Medium (4 hours) | Per UIUX-NOTES.md line 526, warn user before navigating away if uploads in progress. Similar to INST-1200 (Unsaved Changes Guard) |
| 10 | Analytics/monitoring for upload failures | High - Helps diagnose production issues | Medium (6 hours) | CloudWatch metrics for EXPIRED_SESSION, FILE_NOT_IN_S3, SIZE_MISMATCH errors. Track upload completion rate. Phase 2 (INST-1203) |

## Categories

- **Edge Cases**: Upload speed units (finding 6), file handle lost after reload (covered in AC28), concurrent completion (covered in AC64)
- **UX Polish**: Time remaining (1), pause/resume (2), batch actions (3), countdown timer (5), upload history (1), keyboard shortcuts (8)
- **Performance**: Upload speed optimization (3), progress persistence (4)
- **Observability**: Analytics/monitoring (10), session expiry E2E test (7)
- **Integrations**: S3 Transfer Acceleration (3), orphaned file cleanup (8)
- **Accessibility**: High contrast mode (9), reduced motion (10), progress announcement frequency (7)

---

## Deferred Stories

These features are explicitly called out in Non-Goals (lines 91-99) and deferred to future stories:

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Multipart upload (>50MB files) | INST-3010 | Presigned URL handles up to 50MB, which covers 95% of instruction PDFs |
| Chunked upload with resume | INST-2036 | Complex implementation, not MVP-critical. Direct S3 upload is simpler |
| Parallel presigned URL generation for batches | Phase 2 | Sequential generation acceptable for MVP (max 3 concurrent uploads) |
| Server-side virus scanning | INST-2031 | Security enhancement, not blocking for MVP (files scanned post-upload) |
| PDF thumbnail generation | INST-2032 | Nice-to-have for preview, not critical for upload flow |
| Direct S3 upload without API | N/A | Backend session tracking required for security and audit trail |
| WebSocket progress updates | N/A | XHR progress events sufficient for real-time updates |
| File encryption at rest | N/A | S3 bucket default encryption sufficient for MVP |

---

## Knowledge Base Recommendations

Recommend adding these patterns to KB after story completion:

1. **Two-phase presigned URL upload pattern** - Session creation → S3 upload → Completion verification
2. **Session expiry auto-refresh flow** - Local TTL check with 30-second buffer → markExpiredFiles() → updateFileUrls()
3. **XHR-based upload with progress tracking** - uploadToPresignedUrl utility from @repo/upload-client
4. **Concurrent upload limit enforcement** - useUploadManager hook pattern with max 3 simultaneous uploads
5. **S3 verification pattern** - headObject + size verification before database record creation
6. **Idempotent completion endpoint** - Check session.status='completed', return existing record
