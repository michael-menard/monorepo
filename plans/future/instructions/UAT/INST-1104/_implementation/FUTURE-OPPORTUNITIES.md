# Future Opportunities - INST-1104

**Story**: Upload Instructions (Direct ≤10MB)
**Date**: 2026-02-06
**Analyst**: elab-analyst v3.0.0

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No explicit accessibility ACs | Low | Low | Add 2-3 ACs for keyboard navigation and screen reader support to main AC list (currently only in UI/UX Notes section). QA needs explicit ACs to verify. Suggest: "AC72: File picker opens with Enter/Space key", "AC73: Screen reader announces file selection", "AC74: Focus returns to upload button after file picker closes". |
| 2 | Zero-byte file handling | Low | Low | Story doesn't explicitly test zero-byte file rejection. Backend validateFileSize() handles this (MIN_FILE_SIZE = 1), but no E2E test case. Consider adding to edge case tests. |
| 3 | File extension spoofing | Low | Medium | Story validates MIME type and extension separately but doesn't test mismatched scenarios (e.g., malicious.exe renamed to malicious.pdf). Backend should validate both MIME and extension match. Add to security test suite. |
| 4 | Duplicate filename handling | Low | Low | Story doesn't specify behavior when user uploads "instructions.pdf" twice. Backend uses UUID prefix (line 255) which prevents collisions, but UI doesn't warn user. Consider showing "instructions (2).pdf" or similar in UI. |
| 5 | Upload cancellation edge case | Low | Low | AC18 specifies cancel button aborts remaining uploads, but doesn't specify cleanup behavior (e.g., what if file 2 of 5 is mid-upload?). Consider adding AbortController for fetch cancellation. |
| 6 | File list ordering | Low | Low | Story doesn't specify sort order for uploaded files in list. Backend likely returns by uploadedAt DESC (services.ts pattern), but not explicit. Consider adding sortBy parameter to GET /mocs/:id/files endpoint. |
| 7 | Mobile upload considerations | Medium | High | Story doesn't address mobile file picker limitations (iOS file access restrictions, Android permissions). Consider testing on real devices, add mobile-specific error messages. Deferred to INST-3060 (Mobile-Optimized Upload). |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Parallel upload for multiple files | Medium | Medium | Story AC14 specifies sequential upload (one at a time) which may feel slow for 5+ files. Consider parallel upload with Promise.all() and progress tracking per file. Deferred to INST-2036 (Chunked Upload Progress). Estimated 8 hours. |
| 2 | Drag-and-drop upload zone | High | Medium | Story AC5 uses standard file picker. Users expect drag-and-drop for file uploads in 2026. Consider adding ImageUploadZone-style drag-drop. Deferred to INST-2035 (Drag-and-Drop Upload Zone). Estimated 12 hours. |
| 3 | PDF thumbnail preview | High | High | Story uploads PDF but shows no preview in file list. Users expect to see first page thumbnail for visual confirmation. Requires backend thumbnail generation (ImageMagick or pdfjs). Deferred to INST-2032 (File Preview/Thumbnails). Estimated 16 hours. |
| 4 | Progress bar with percentage | Medium | Low | Story AC15-16 shows simple spinner and "Uploading 2 of 5..." text. Modern UX expects percentage-based progress bar. Consider ProgressEvent tracking on fetch(). Deferred per Non-Goals (simple spinner sufficient for MVP). Estimated 4 hours. |
| 5 | Batch upload with single request | Low | Low | Story uploads files sequentially with individual POST requests. Consider batching into single multipart request to reduce latency. Deferred per Non-Goals (sequential acceptable for MVP). Estimated 6 hours. |
| 6 | File metadata editing | Medium | Medium | Story uploads files but no ability to edit filename or add description post-upload. Consider adding inline edit or modal for file metadata. Useful for organizing multiple instruction PDFs (Part 1, Part 2, etc.). Estimated 8 hours. |
| 7 | Virus scanning integration | High | High | Story defers virus scanning to INST-2031. For production launch, integrate ClamAV or AWS GuardDuty for malware detection. Critical for user-generated content platform. Estimated 20 hours. |
| 8 | Upload quota enforcement | Medium | Medium | Story uses MOC quota (AC92) but doesn't enforce per-user file storage quota. Consider adding storage quota check (e.g., 500MB per user) before upload. Requires new quota type in authorization service. Estimated 12 hours. |
| 9 | Retry with exponential backoff | Medium | Low | Story AC23 shows network error toast with generic "try again" message. Consider automatic retry with exponential backoff for transient failures (503, timeout). Deferred to INST-1201 (Session Persistence & Error Recovery). Estimated 4 hours. |
| 10 | Upload analytics | Low | Low | Story has no analytics events. Consider tracking: upload_started, upload_completed, upload_failed, file_type_rejected. Useful for monitoring adoption and error rates. Estimated 2 hours. |
| 11 | CloudFront signed URLs for downloads | Medium | Medium | Story AC21 adds download button but doesn't specify if CloudFront URLs are public or signed. Consider signed URLs with expiration for private MOCs. Requires CloudFront key pair setup. Estimated 8 hours. |
| 12 | PDF page count validation | Low | Medium | Story validates file size and type but doesn't validate PDF page count. Consider rejecting PDFs with 0 pages (corrupted) or excessive pages (>500, likely scans). Requires PDF parsing library. Estimated 6 hours. |

---

## Categories

### Edge Cases

**Non-Blocking but worth testing**:
- Zero-byte file rejection (Gap #2)
- File extension spoofing (Gap #3)
- Duplicate filename handling (Gap #4)
- Upload cancellation mid-flight (Gap #5)
- Mobile file picker limitations (Gap #7)
- PDF page count validation (Enhancement #12)

**Recommendation**: Add to integration test suite post-MVP.

### UX Polish

**Delighters and power-user features**:
- Parallel upload (Enhancement #1)
- Drag-and-drop (Enhancement #2) - HIGH IMPACT
- PDF thumbnail preview (Enhancement #3) - HIGH IMPACT
- Progress bar with percentage (Enhancement #4)
- File metadata editing (Enhancement #6)
- Retry with exponential backoff (Enhancement #9)

**Recommendation**: Prioritize Enhancements #2 and #3 for next iteration. High user impact, moderate effort.

### Performance

**Optimizations for speed and scale**:
- Batch upload with single request (Enhancement #5)
- Parallel upload with Promise.all() (Enhancement #1)

**Recommendation**: Low priority. Sequential upload acceptable for MVP (most users upload 1-2 files).

### Observability

**Monitoring and analytics**:
- Upload analytics events (Enhancement #10)
- CloudWatch metrics for upload failures
- Security event logging (already in story AC36)

**Recommendation**: Add analytics events in Phase 2 (INST-1203: Rate Limiting & Observability).

### Integrations

**Future connection points**:
- Virus scanning integration (Enhancement #7) - HIGH PRIORITY for production
- Upload quota enforcement (Enhancement #8)
- CloudFront signed URLs (Enhancement #11)

**Recommendation**: Prioritize Enhancement #7 (virus scanning) before production launch. Enhancement #8 (quota) is nice-to-have.

---

## Security Considerations (Non-Blocking)

### File Extension Spoofing (Gap #3)

**Issue**: Story validates MIME type (AC31) and extension (AC35) separately but doesn't test mismatched scenarios.

**Attack Vector**: Malicious user uploads `malicious.exe` renamed to `malicious.pdf` with spoofed MIME type.

**Mitigation**: Backend should validate both MIME and extension match expected PDF patterns. Consider magic byte validation (PDF files start with `%PDF-`).

**Effort**: 4 hours (add magic byte validation to validatePdfFile())

**Priority**: Medium (defense-in-depth, not critical if MIME validation is strict)

### Virus Scanning (Enhancement #7)

**Issue**: Story defers virus scanning to INST-2031. User-uploaded PDFs could contain malware.

**Risk**: High - User-generated content platform must scan files before serving to other users.

**Mitigation**: Integrate ClamAV (open-source) or AWS GuardDuty (managed service).

**Effort**: 20 hours (infrastructure setup, Lambda integration, error handling)

**Priority**: HIGH - Required before production launch.

### Upload Quota (Enhancement #8)

**Issue**: Story uses MOC quota but not file storage quota. User could upload 1000 PDFs, exhaust storage.

**Risk**: Medium - Storage costs could escalate.

**Mitigation**: Add per-user storage quota (e.g., 500MB) and quota check before upload.

**Effort**: 12 hours (new quota type, middleware, UI messaging)

**Priority**: Medium - Can launch without this, monitor usage first.

---

## Accessibility Enhancements (Gap #1)

### Missing Explicit ACs

**Issue**: Accessibility requirements are documented in UI/UX Notes section (lines 428-432) but not in main AC list. QA needs explicit ACs to verify keyboard navigation and screen reader support.

**Recommendation**: Add these ACs in refinement session:

**AC72**: File picker opens with Enter or Space key on "Add Instructions" button
**AC73**: Screen reader announces file selection count: "3 files selected"
**AC74**: Focus returns to upload button after file picker closes
**AC75**: Error messages read by screen reader with role="alert"
**AC76**: Upload progress announced by screen reader: "Uploading file 2 of 5"

**Effort**: 2 hours (add ARIA attributes, focus management, live region for progress)

**Priority**: Low - Story already has accessibility requirements in UI/UX Notes, but explicit ACs help QA.

---

## Mobile Considerations (Gap #7)

### iOS File Picker Limitations

**Issue**: iOS restricts file access to Photos and iCloud Drive by default. Users may not be able to select PDFs from Files app depending on browser.

**Impact**: Medium - iOS users are significant portion of user base.

**Testing Required**:
- Safari on iOS (WebKit)
- Chrome on iOS (also WebKit due to Apple restrictions)
- File picker from iCloud Drive vs. local Files vs. third-party cloud storage

**Recommendation**: Add mobile E2E test suite (real device testing). Consider adding help text: "On iOS, save PDFs to iCloud Drive or Files app before uploading."

**Effort**: 8 hours (mobile testing, help text, error handling)

**Priority**: Medium - Not blocking MVP but should be tested before launch. Deferred to INST-3060 (Mobile-Optimized Upload).

### Android File Picker Permissions

**Issue**: Android file picker may require storage permissions depending on Android version and file location.

**Testing Required**:
- Android 11+ (scoped storage)
- Android 10 and below (legacy storage)
- File picker from Downloads vs. Google Drive vs. third-party apps

**Recommendation**: Test on real Android devices. Consider requesting MANAGE_EXTERNAL_STORAGE permission for Android 11+ if file picker has issues.

**Effort**: 6 hours (Android testing, permissions handling)

**Priority**: Medium - Deferred to INST-3060.

---

## Performance Optimizations (Low Priority)

### Parallel Upload (Enhancement #1)

**Current**: Sequential upload (AC14) - files upload one at a time
**Proposed**: Parallel upload with Promise.all()

**Pros**:
- Faster for multiple files (5 files: 50 seconds → 10 seconds with 5x parallelism)
- Modern UX expectation

**Cons**:
- More complex error handling (partial failures)
- Higher server load (need rate limiting)
- Progress tracking per file (more UI complexity)

**Effort**: 8 hours
**Priority**: Low - Most users upload 1-2 files. Deferred to INST-2036.

### Batch Upload (Enhancement #5)

**Current**: Individual POST requests per file
**Proposed**: Single multipart POST with all files

**Pros**:
- Reduced HTTP overhead (fewer round trips)
- Lower Lambda invocations (cost savings)

**Cons**:
- Larger request payload (timeout risk)
- More complex backend parsing
- Less granular progress tracking

**Effort**: 6 hours
**Priority**: Low - Sequential acceptable for MVP. Deferred per Non-Goals.

---

## Long-Term Enhancements (Post-MVP)

### 1. PDF Viewer Component (INST-3070)

**Description**: In-app PDF viewer instead of download-to-view workflow.

**Benefits**:
- Better UX (no leaving app)
- Mobile-friendly (no relying on device PDF viewer)
- Page navigation, zoom, print from app

**Technology**: pdfjs-dist or react-pdf

**Effort**: 24 hours

**Priority**: Low - Browser PDF viewer is fine for MVP. Deferred to INST-3070.

### 2. Instructions Multi-Version Support

**Description**: Upload multiple versions of instructions (v1.0, v1.1, v2.0) with changelog.

**Benefits**:
- Users can improve instructions over time
- Version history for rollback
- Changelog shows what changed

**Effort**: 32 hours (versioning logic, UI, migration)

**Priority**: Low - Single version sufficient for MVP.

### 3. Collaborative Editing

**Description**: Allow multiple users to edit MOC and upload instructions (shared ownership).

**Benefits**:
- Team builds (AFOL groups)
- Co-authoring instructions

**Effort**: 80 hours (permissions model, invitations, audit log)

**Priority**: Low - Personal use case sufficient for MVP.

---

## Summary

**Total Gaps**: 7 (all non-blocking)
**Total Enhancements**: 12

**High Priority for Next Iteration**:
1. Enhancement #2: Drag-and-drop upload zone (HIGH IMPACT, MEDIUM EFFORT)
2. Enhancement #3: PDF thumbnail preview (HIGH IMPACT, HIGH EFFORT)
3. Enhancement #7: Virus scanning (HIGH PRIORITY for production)

**Low Priority**:
- Performance optimizations (Enhancements #1, #5) - Sequential acceptable
- Analytics (Enhancement #10) - Add in Phase 2
- Mobile polish (Gap #7) - Defer to INST-3060

**Recommendation**: Ship INST-1104 as-is after fixing MVP-critical gaps in ANALYSIS.md. Prioritize Enhancements #2, #3, #7 for next sprint.

---

**Agent**: elab-analyst v3.0.0
**Date**: 2026-02-06
