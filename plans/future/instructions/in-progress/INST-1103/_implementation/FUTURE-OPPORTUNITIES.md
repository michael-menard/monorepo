# Future Opportunities - INST-1103

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **No image optimization** - Story doesn't include image resize/compression before S3 upload. 9MB images uploaded as-is could slow page loads. | Medium - affects performance but not core functionality | Medium (2-3 days) - Add Sharp library for resize to 800x800px, WebP conversion | Defer to INST-2033 (Image Optimization). Optional enhancement, not MVP-blocking. |
| 2 | **No virus scanning** - Accepting user-uploaded files without ClamAV or AWS scanning | Low - risk is minimal for authenticated users, MIME validation provides basic protection | High (5-7 days) - Integrate ClamAV or AWS Malware Protection | Defer to INST-2031 (File Virus Scanning). Low priority for MVP. |
| 3 | **No S3 orphan cleanup** - If DB update fails after S3 upload, object remains in S3 (story mentions transaction but doesn't specify cleanup job) | Low - transaction rollback deletes object immediately, but network failures could leave orphans | Medium (3-4 days) - Background Lambda to scan for orphaned objects older than 24h | Defer to INST-1204 (S3 Cleanup for Failed Uploads). |
| 4 | **No progress indicator for large files** - 10MB upload on slow connection could take 10+ seconds with no feedback beyond "Uploading..." text | Medium - UX issue, not functional blocker | Low (1-2 days) - Add progress bar using XMLHttpRequest or Fetch API progress events | Defer to INST-2036 (Chunked Upload Progress). Nice-to-have for MVP. |
| 5 | **No concurrent upload handling** - If user uploads Image A, then Image B before A completes, race condition could occur (story mentions "last write wins" but doesn't specify implementation) | Low - rare edge case, last write wins is acceptable | Low (1 day) - Add upload queue or cancel previous upload on new upload start | Track as enhancement. Edge case, not MVP-critical. |
| 6 | **No image cropping** - Users cannot crop or rotate image before upload | Medium - UX enhancement, not blocker | High (5-7 days) - Integrate Cropper.js or react-easy-crop | Defer to INST-2037 (File Preview Before Upload). Power-user feature. |
| 7 | **No auto-thumbnail from PDF** - Users must manually upload thumbnail, cannot auto-generate from instructions PDF first page | Medium - UX convenience, not blocker | High (7-10 days) - PDF parsing with pdf-lib, image generation | Defer to INST-2032 (File Preview/Thumbnails). Future automation. |
| 8 | **Mobile camera access edge case** - Story doesn't test iOS Safari camera access (accept="image/*" may not trigger camera) | Low - most mobile browsers support, fallback to file picker works | Low (1 day) - Add explicit `capture="environment"` attribute for camera | Track as mobile polish. E2E test gap. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Multiple thumbnail sizes** - Generate small (200x200), medium (800x800), large (1600x1600) for responsive images | High - significant performance improvement for gallery page | Medium (3-4 days) - Generate multiple sizes on upload, store all in S3, return srcset | Track as INST-XXXX (Responsive Thumbnails). High value post-MVP. |
| 2 | **WebP conversion** - Convert all uploaded images to WebP for 25-35% size reduction | Medium - performance optimization | Low (1-2 days) - Add Sharp WebP conversion pipeline | Add to INST-2033 (Image Optimization). Bundle with resize. |
| 3 | **Thumbnail templates** - Predefined aspect ratios (1:1, 16:9, 4:3) with crop guides | Medium - UX polish | Medium (3-4 days) - UI for aspect ratio selection, crop overlay | Track as UX enhancement. Power-user feature. |
| 4 | **Bulk thumbnail upload** - Upload thumbnails for multiple MOCs at once | Low - convenience feature, not common workflow | Medium (4-5 days) - Multi-select file picker, batch upload queue | Low priority. Rare use case (initial import only). |
| 5 | **Undo thumbnail change** - Restore previous thumbnail if new upload was mistake | Medium - UX safety net | Medium (2-3 days) - Store previous thumbnailUrl in version history table | Track as UX polish. Nice-to-have. |
| 6 | **Thumbnail rotation/flip** - Rotate or flip image before saving (common for phone camera uploads) | Medium - UX convenience | Low (1-2 days) - Add rotation buttons, EXIF auto-rotation | Track as mobile UX enhancement. Common pain point. |
| 7 | **Client-side compression** - Compress images client-side before upload to reduce network usage | Medium - performance for slow connections | Medium (3-4 days) - Browser-image-compression library | Track as performance optimization. Helps mobile users. |
| 8 | **Upload analytics** - Track upload success rate, file sizes, MIME types for insights | Low - observability, not user-facing | Low (1 day) - CloudWatch custom metrics | Track as observability enhancement. Useful for debugging. |
| 9 | **Drag-to-reorder thumbnails** - If multiple gallery images added (INST-2030), allow reordering | Low - blocked by INST-2030 (not relevant for single thumbnail) | Medium (3-4 days) - DnD Kit library, displayOrder field in DB | Defer to INST-2030. Not applicable for single thumbnail. |
| 10 | **Thumbnail preview in upload button** - Show mini preview in "Change Thumbnail" button | Low - minor UX polish | Low (1 day) - Add thumbnail image to button background | Track as UI polish. Low priority. |

## Categories

### Edge Cases
- Mobile camera access edge case (#8 in Gaps)
- Concurrent upload handling (#5 in Gaps)
- Zero-byte file validation (covered in story AC 28, but no integration test)
- Session expiry during upload (story doesn't address - user gets 401 mid-upload)
- High-resolution image validation (story accepts up to 10MB but doesn't limit dimensions - 20000x20000 1MB PNG could crash browser)

### UX Polish
- Image cropping before upload (#6 in Gaps)
- Thumbnail rotation/flip (#6 in Enhancements)
- Multiple aspect ratio templates (#3 in Enhancements)
- Undo thumbnail change (#5 in Enhancements)
- Thumbnail preview in button (#10 in Enhancements)

### Performance
- Image optimization (resize, WebP conversion) (#1, #2 in Enhancements)
- Multiple thumbnail sizes for responsive images (#1 in Enhancements)
- Client-side compression (#7 in Enhancements)
- Progress indicator for large uploads (#4 in Gaps)

### Observability
- Upload analytics (#8 in Enhancements)
- CloudWatch dashboard for upload success rate
- Alert on >10% upload failure rate
- Track MIME type distribution (are users mostly uploading JPEG vs PNG?)

### Integrations
- Auto-thumbnail from PDF instructions (#7 in Gaps)
- Integration with INST-2030 (Gallery Image Uploads) for drag-to-reorder
- Integration with INST-2031 (Virus Scanning) for malware protection
- Integration with INST-1204 (S3 Cleanup) for orphan removal

### Security
- Virus scanning (#2 in Gaps)
- EXIF data stripping (privacy concern - GPS coordinates in photos)
- Rate limiting per user (prevent abuse - 100 uploads/hour limit)
- File hash storage (detect duplicate thumbnails, save S3 storage)

### Mobile Optimization
- Camera access improvements (#8 in Gaps)
- Client-side compression for slow connections (#7 in Enhancements)
- Reduce max file size on mobile (10MB → 5MB on 3G/4G)
- Progressive upload with resume on network failure

### Testing Gaps (Non-Blocking)
- No E2E test for mobile camera access
- No E2E test for session expiry during upload
- No E2E test for concurrent uploads
- No load test for 100 simultaneous uploads
- No performance test for 10MB upload time
- No accessibility test with JAWS/NVDA (story only mentions VoiceOver)

---

## Prioritization for Post-MVP

### High Priority (Next Sprint)
1. Multiple thumbnail sizes (#1 in Enhancements) - significant performance win
2. Image optimization (resize + WebP) (#1 in Gaps + #2 in Enhancements) - bundle together
3. Progress indicator (#4 in Gaps) - UX improvement for slow connections

### Medium Priority (Sprint +2)
4. Thumbnail rotation/flip (#6 in Enhancements) - common pain point for mobile uploads
5. Undo thumbnail change (#5 in Enhancements) - safety net for mistakes
6. Client-side compression (#7 in Enhancements) - helps mobile users

### Low Priority (Backlog)
7. Virus scanning (#2 in Gaps) - security hardening
8. S3 cleanup job (#3 in Gaps) - cost optimization
9. Image cropping (#6 in Gaps) - power-user feature
10. Upload analytics (#8 in Enhancements) - observability

### Blocked by Other Stories
- Drag-to-reorder (#9 in Enhancements) - blocked by INST-2030
- Auto-thumbnail from PDF (#7 in Gaps) - blocked by INST-2032

---

## Recommendations

1. **Address story sizing** - Split INST-1103 into INST-1103-A (core upload) and INST-1103-B (display integration) before implementation.

2. **Fix architecture** - Define service layer, ports, and adapters before starting development (see ANALYSIS.md).

3. **Post-MVP roadmap** - After INST-1103-A/B completion:
   - Sprint N+1: Image optimization (resize, WebP, multiple sizes)
   - Sprint N+2: UX polish (rotation, undo, progress bar)
   - Sprint N+3: Security hardening (virus scanning, EXIF stripping)

4. **Testing strategy** - Focus MVP tests on happy path + critical error cases (validation, auth). Defer edge cases (concurrent uploads, session expiry) to post-MVP.

5. **Performance monitoring** - Add CloudWatch metrics for upload success rate, average file size, average upload time. Alert on anomalies.

6. **Documentation** - Document image size recommendations for users ("For best results, upload 800x800px images in WebP format").
