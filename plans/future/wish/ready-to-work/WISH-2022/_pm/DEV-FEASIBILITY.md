# WISH-2022: Client-side Image Compression - Feasibility Analysis

**Story:** WISH-2022: Client-side Image Compression
**Date:** 2026-01-28
**Reviewer:** PM-Dev-Feasibility-Review Agent
**Status:** Ready for Development

---

## Feasibility Summary

- **Feasible for MVP:** YES
- **Confidence:** HIGH
- **Why:** The feature integrates cleanly into existing WISH-2002 upload flow with a single third-party library (browser-image-compression). No changes to backend API, no breaking changes to existing components. All compression logic is client-side and fails gracefully to original upload flow. The presigned URL flow remains unchanged.

---

## Likely Change Surface (Core Journey)

### Files Modified (Client-side Only)

**Must Modify:**
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
  - Add compression step before file upload
  - Preserve filename and MIME type handling
  - Add optional compression bypass logic
  - Update progress states to include "Compressing..." state

- `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`
  - Add "High quality (skip compression)" checkbox
  - Show compression progress in upload overlay
  - Update progress message to distinguish compression vs upload
  - Show compression result toast

**New Files:**
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`
  - Compression utility wrapper around browser-image-compression
  - Configuration constants (maxSizeMB, maxWidthOrHeight, quality)
  - Compression skip logic (< 500KB and < 1920x1920)
  - Size comparison for edge case (compression increases size)

**Optionally Modify:**
- `apps/web/app-wishlist-gallery/src/test/setup.ts`
  - Add mock for browser-image-compression in tests (optional, can test with real library)

### Package Dependencies

**New Dependency:**
- `browser-image-compression` (MIT license, ~10KB gzipped)
  - No peer dependency risks
  - Well-maintained, 1M+ weekly npm downloads
  - No backend changes required

### Backend/Infrastructure

**ZERO changes required.**
- API endpoints unchanged
- S3 bucket configuration unchanged
- Presigned URL flow unchanged
- Database schema unchanged

---

## MVP-Critical Risks

### 1. Browser Canvas API Not Available

**Risk:** Some browsers (very old or restricted environments) may not support Canvas/Blob APIs required for compression.

**Why It Blocks MVP:** Compression fails → fallback to original upload → feature still works but compression disabled for that user. **NOT blocking** because:
- Graceful fallback is in spec: "falls back to original image"
- User can still upload (core journey not blocked)
- Post-MVP: Add feature detection and warning

**MVP Mitigation:**
- Wrap compression in try/catch
- Fallback to original file on any error
- Log errors for monitoring

**Evidence Needed:**
- Unit test: compression failure → original upload succeeds
- Integration test: happy path with real browser-image-compression
- Error boundary test: compression throws error, form still submits

---

### 2. Web Worker Overhead Causes Perceptible Delay

**Risk:** Compression in web worker adds 2-5s latency for large images, creating poor perceived performance.

**Why It Blocks MVP:** If compression takes > 10s, user may assume app frozen and abandon upload. **Actually LOW risk** because:
- browser-image-compression's web worker is async (non-blocking UI)
- User sees "Compressing image... X%" progress indicator
- Progress updates every 100-200ms keep feedback alive
- Spec includes timeout handling: "show warning and allow skip"

**MVP Mitigation:**
- Set reasonable timeout (10s per spec)
- Show progress percentage as feedback
- Allow user to cancel/skip compression
- Log timing data for analysis

**Evidence Needed:**
- Performance test: measure compression time on 5MB+ images
- Manual test: verify UI stays responsive during compression
- Timer test: cancellation works before upload starts

---

### 3. Filename or MIME Type Lost During Compression

**Risk:** browser-image-compression outputs blob without metadata; code must preserve original filename and type.

**Why It Blocks MVP:** Presigned URL request requires correct filename and MIME type. Wrong values → 400 Bad Request. **Moderate risk, but mitigable.**

**MVP Mitigation:**
- Store original filename before compression
- Always use `image/jpeg` as output MIME (per spec)
- Create new File object with preserved filename and JPEG MIME
- Test with actual presigned URL flow

**Evidence Needed:**
- Unit test: filename preserved through compression
- Unit test: MIME type is image/jpeg after compression
- Integration test: presigned URL request succeeds with compressed file

---

### 4. Quality 0.8 JPEG Causes Visible Compression Artifacts

**Risk:** JPEG quality 0.8 shows visible artifacts on high-quality source images; users perceive "loss of quality."

**Why Doesn't Block MVP:** Wishlist images are visual references, not archival. Most users accept 80% quality for 60-80% size reduction. **Not MVP-critical** because:
- User can disable compression via checkbox: "High quality (skip compression)"
- Artifact quality acceptable for thumbnail-size display
- Post-MVP can adjust quality threshold based on user feedback

**MVP Mitigation:**
- Document quality setting in UI hint text
- Allow easy bypass with checkbox
- Store preference in localStorage for consistency
- Log user preference choices for analytics

**Evidence Needed:**
- Manual visual test: compare original vs compressed side-by-side
- Checkbox toggle test: verify skip-compression works
- localStorage test: preference persists across sessions

---

### 5. S3 Presigned URL Validation Rejects Compressed MIME Type

**Risk:** Presigned URL request says `mimeType: image/jpeg` for all files. Endpoint validation may reject if original was PNG or GIF.

**Why It Blocks MVP:** All files converted to JPEG, but backend may expect original format. **Actually LOW risk** because:
- Presigned URL endpoint (`getWishlistImagePresignUrl`) accepts `mimeType` as parameter
- Spec explicitly says: "convert all to JPEG for consistency"
- Backend accepts any valid image MIME type (per WISH-2002 spec: "JPEG, PNG, GIF, WebP")
- Test this explicitly before deployment

**MVP Mitigation:**
- Always pass `mimeType: 'image/jpeg'` to presigned URL endpoint (not original MIME)
- Verify backend accepts this in pre-deployment testing
- Add integration test: PNG input → JPEG mime type → S3 success

**Evidence Needed:**
- Integration test: PNG → JPEG conversion → presigned URL → S3 upload succeeds
- Endpoint test: presigned URL endpoint accepts image/jpeg for all cases

---

## Missing Requirements for MVP

**None identified.** Story spec is complete and self-contained.

The story clearly specifies:
- Compression settings (maxSizeMB: 1, maxWidthOrHeight: 1920, quality: 0.8)
- Skip logic (< 500KB)
- UI signals (progress, toast, checkbox)
- Error handling (graceful fallback)
- localStorage key for preferences

**Decision Required:** None - proceed with spec as written.

---

## MVP Evidence Expectations

### Core Journey Tests (Required)

1. **Happy Path: High-Resolution Image**
   - User uploads 5MB, 4032x3024 image
   - Compression starts (show "Compressing image... X%")
   - Compression completes in < 10s
   - Toast shows "Image compressed: 5.2 MB → 0.8 MB"
   - Preview updates with compressed image
   - Form submission succeeds
   - Compressed image visible in wishlist

2. **Skip-Compression Path**
   - User checks "High quality (skip compression)"
   - User uploads 5MB image
   - NO compression occurs
   - File uploads as-is
   - Toast shows upload progress only
   - Form submission succeeds

3. **Already-Small Image**
   - User uploads 200KB, 1024x768 image
   - Compression skipped (already small)
   - File uploads immediately
   - No toast about compression
   - Form submission succeeds

4. **Compression Failure Path**
   - Mock compression to throw error
   - Error caught silently
   - Original file uploaded instead
   - Form submission succeeds (fallback works)
   - No user-visible error

### Critical CI/Deploy Checkpoints

1. **Bundle Size Check**
   - browser-image-compression adds < 50KB gzipped to bundle
   - Build pipeline must enforce bundle size budget

2. **Presigned URL Integration**
   - Test presigned URL endpoint with image/jpeg MIME
   - Verify S3 accepts compressed JPEG from presigned URL
   - Pre-deployment: test PNG→JPEG conversion end-to-end

3. **localStorage Compatibility**
   - Preference key `wishlist:preferences:imageCompression` persists
   - Test in private/incognito mode (graceful degradation)
   - Test across app restarts

4. **Web Worker Polyfill**
   - Verify browser-image-compression fallback if Web Worker unavailable
   - Test in restricted environments (iframe, CSP with no-worker)

### Acceptance Criteria Checklist

- [ ] Images automatically compressed before S3 upload
- [ ] Compression settings: max 1920px, quality 0.8, max 1MB
- [ ] Progress: "Compressing image... X%"
- [ ] Original filename and MIME type preserved
- [ ] Skip if < 500KB
- [ ] Graceful fallback on failure
- [ ] "High quality (skip compression)" checkbox functional
- [ ] Compression before presigned URL request
- [ ] Toast: "Image compressed: X MB → Y MB"
- [ ] Preview updates with compressed image

---

## Risk Summary Table

| Risk | Impact | Likelihood | MVP Blocking | Mitigation | Test Gate |
|------|--------|------------|--------------|------------|-----------|
| Canvas/Blob unavailable | Compression fails | Very Low | NO | Graceful fallback | Unit: error handling |
| Web Worker delay | Poor UX | Low | NO | Progress indicator, timeout | Perf: timing <10s |
| Filename lost | 400 Bad Request | Low | YES | Store filename before compress | Integration: presigned URL |
| Quality degradation | Visual artifacts | Medium | NO | Checkbox to skip | Manual: visual test |
| MIME type mismatch | Upload fails | Low | YES | Always use image/jpeg | Integration: S3 upload |
| Bundle size bloat | Build fails | Very Low | NO | Monitor <50KB gzip | CI: bundle check |
| Preferences not persisting | Friction | Very Low | NO | localStorage polyfill | Unit: persistence |

---

## Deployment & Rollout Plan

### Pre-Deployment Testing
1. End-to-end test: PNG/GIF input → JPEG output → presigned URL → S3 success
2. Bundle size check: build optimized, measure gzip size
3. Performance profile: compression time on 1MB, 5MB, 10MB images
4. Browser support: test in Chrome, Firefox, Safari (recent 2 versions)

### Rollout
- **Feature Flag:** Not required (no backend changes, no breaking changes)
- **Gradual Rollout:** Full deploy OK, feature is opt-in (users choose to upload)
- **Monitoring:** Log compression timings and fallback rates
- **Rollback:** Safe to rollback, no data migration concerns

### Post-Deployment Monitoring
- Track compression skip rate (if high, may need quality adjustment)
- Monitor compression error rates (fallback activation)
- Measure upload time reduction (goal: 60-80% reduction)
- Watch bundle size impact (ensure < 50KB gzip)

---

## Sign-Off

**MVP-Critical Risks:** All identified and mitigated. No blockers.

**Recommended Action:** Proceed to development. Implementation is straightforward:
1. Add browser-image-compression dependency
2. Wrap compression in `src/utils/imageCompression.ts`
3. Integrate into useS3Upload hook (before presigned URL)
4. Update WishlistForm UI (checkbox, progress, toast)
5. Write integration tests

**Effort Estimate:** 3 story points (as specified). Likely 2-3 days implementation + review.

**Quality Gates Before Merge:**
- All 10 acceptance criteria passing
- Bundle size < 3.5MB (main app)
- Integration test: PNG/GIF → JPEG → S3 success
- Performance test: compression < 10s on 5MB images
- Linting and type checking pass
