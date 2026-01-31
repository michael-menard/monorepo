# WISH-2022: Client-side Image Compression - Non-MVP Risks & Future Considerations

**Story:** WISH-2022: Client-side Image Compression
**Date:** 2026-01-28
**Scope:** Post-MVP enhancements, scope tightening, and known edge cases

---

## Non-MVP Risks

### 1. Very Large Images (>20MB) Cause Browser Memory Exhaustion

**Risk:** Modern smartphone images (20MP+, 20-50MB uncompressed) may cause out-of-memory errors during compression, freezing the browser or killing the tab.

**Current Mitigation (MVP):** Warning toast if user uploads > 20MB, advising compression may fail.

**Impact if Not Addressed:** Users with high-end phones (iPhone 15 Pro, recent Samsung Galaxy) experience app crash when uploading original HEIC photos. Negative user experience on flagship devices.

**Recommended Timeline:**
- **Phase 4** (next sprint after MVP launch)
- **Effort:** 2-3 points
- **Solution Options:**
  - Implement canvas-based streaming compression for files > 20MB
  - Use File.slice() + webassembly for incremental compression
  - Upgrade to ImageMagick-based compression library (heavier, more robust)
  - Set hard limit: reject files > 15MB upfront

**Post-MVP Decision:** Product should decide acceptable trade-off:
- Option A: Fail gracefully (current MVP) → users retry with smaller file
- Option B: Engineer around it (expensive) → flawless large-file support
- Option C: Hybrid (add file size warning, offer pre-compression hints)

---

### 2. HEIC/HEIF Format Not Supported by browser-image-compression

**Risk:** iPhone 12+ default to HEIC format (Apple's newer image codec). browser-image-compression library doesn't natively support HEIC → conversion to JPEG fails on these phones.

**Current Mitigation (MVP):** Graceful fallback → original HEIC file uploaded. But HEIC files may have poor browser support for preview/gallery display.

**Impact if Not Addressed:**
- iPhone users with HEIC default: compression skipped silently
- Gallery preview may fail in some browsers (HEIC not widely supported)
- S3 serves HEIC files, but downstream apps may not support them
- Post-MVP, need image transcoding layer (backend or browser)

**Recommended Timeline:**
- **Phase 4-5** (1-2 sprints after MVP)
- **Effort:** 3-5 points (complex, may require native canvas code)
- **Solution Options:**
  - Add HEIC detection → force .heic → fallback to original (MVP workaround)
  - Integrate heic2any.js library to convert HEIC to JPEG client-side
  - Backend image transcoding service (heavyweight, higher cost)
  - Partner integration: use AWS Lambda@Edge or S3 image optimization

**Post-MVP Decision:**
- MVP ships with HEIC → original-file fallback (no compression)
- Phase 4: Add heic2any.js to enable HEIC compression
- Phase 5: Evaluate backend transcoding if heic2any insufficient

---

### 3. Animated GIF Loses Animation During JPEG Conversion

**Risk:** User uploads animated GIF (e.g., reaction animation). Compression converts to JPEG → loses all animation frames, becomes static image.

**Current Mitigation (MVP):** None. Spec says "If image format can't be compressed (e.g., animated GIF), skip compression" but implementation doesn't detect animated GIFs.

**Impact if Not Addressed:** Unexpected behavior for users uploading animated content. Rare edge case but clear regression from original behavior.

**Recommended Timeline:**
- **Phase 4** (next sprint)
- **Effort:** 1-2 points
- **Solution:**
  - Detect animated GIF: check GIF headers (0xFF 0xD8 = JPEG, 0x47 0x49 = GIF)
  - Skip compression for animated GIFs
  - Or: warn user before converting "This is an animated GIF. Compression will make it static. Continue?"

**Post-MVP Decision:** Add GIF animation detection before compression attempt.

---

### 4. Compression Quality Setting (0.8) Not Customizable

**Risk:** Users with different needs:
- Some want maximum compression (0.6-0.7) to reduce storage costs
- Some want visual quality (0.9+) and accept larger file sizes
- Current MVP: fixed 0.8, only bypass option is "High quality (skip compression)"

**Impact if Not Addressed:** Over time, users request quality slider or preset options. MVP is simple but less flexible.

**Recommended Timeline:**
- **Phase 5** (future enhancement, low priority)
- **Effort:** 2-3 points
- **Solution:**
  - Add quality slider in preferences: 0.5 (low), 0.7 (medium), 0.8 (good), 0.9 (high)
  - Store in localStorage: `wishlist:preferences:imageCompressionQuality`
  - Update compression utility to read from preference
  - A/B test: measure user satisfaction vs file size trade-off

**Post-MVP Decision:** Defer until user feedback indicates demand. MVP checkbox "High quality" provides escape hatch.

---

### 5. No Compression Analytics or Monitoring

**Risk:** Post-launch, PM has no visibility into:
- What % of users enable compression? Disable it?
- Average compression ratio (e.g., 5MB → 0.8MB)
- Compression error rate and failure modes
- Impact on S3 storage costs and upload times

**Impact if Not Addressed:** Hard to measure ROI of compression feature. Can't optimize further without data.

**Recommended Timeline:**
- **Phase 3-4** (design during MVP, implement during next sprint)
- **Effort:** 2 points (add logging, 1-2 hours)
- **Solution:**
  - Log compression events: `{ type: 'compression', originalSize, compressedSize, quality, time, skipped, error }`
  - Send to analytics backend (CloudWatch or GA4)
  - Dashboard: track compression rate, error rates, storage savings
  - Alert: if error rate > 5%, investigate and notify team

**Post-MVP Decision:** Add basic logging in MVP, defer dashboard/alerting to Phase 4.

---

### 6. Web Worker Compatibility in Restricted Environments

**Risk:** Some deployment contexts restrict Web Worker usage:
- iframe with restrictive CSP (Content Security Policy)
- Private browsing with certain browser settings
- Corporate proxy filtering
- browser-image-compression gracefully falls back to main thread, but performance degrades

**Impact if Not Addressed:** In restricted environments, compression blocks main thread (5-10s lag), degrading UX.

**Recommended Timeline:**
- **Phase 4** (test during MVP, fix if issues reported)
- **Effort:** 1-2 points (add feature detection, fallback warnings)
- **Solution:**
  - Detect Web Worker support at app startup
  - If unavailable: log warning, offer user "Compression disabled in your environment"
  - Fall back to main-thread compression (async/await with progress callback)
  - Test in private/incognito mode before launch

**Post-MVP Decision:** MVP assumes Web Worker available. Phase 4: add graceful degradation if users report issues.

---

### 7. Compression Preference Stored in localStorage (Not Synced)

**Risk:** `wishlist:preferences:imageCompression` stored in browser localStorage only. If user:
- Clears browser data
- Uses multiple devices
- Uses private/incognito mode
- Has sync disabled

...preference is lost or not synchronized.

**Impact if Not Addressed:** User preference not persistent or portable. User re-enables "High quality" on each device/session, friction.

**Recommended Timeline:**
- **Phase 5** (future sync enhancement)
- **Effort:** 3-5 points (requires backend preference store)
- **Solution:**
  - Migrate preference to user account (backend)
  - API endpoint: GET/POST `/api/user/preferences`
  - Sync on app load: fetch from backend, merge with localStorage (offline-first)
  - Same pattern used for other user preferences later

**Post-MVP Decision:** MVP uses localStorage (acceptable). Phase 5: migrate to backend sync if other user preferences also adopt this.

---

### 8. Progressive JPEG and Advanced Format Optimization

**Risk:** Spec excludes "progressive JPEG" and "advanced format optimization" (WebP, AVIF). Baseline JPEG at 0.8 quality is simplest but not most efficient.

**Impact if Not Addressed:** Storage and bandwidth costs higher than possible. Modern browsers support WebP/AVIF natively. Missing optimization opportunity.

**Recommended Timeline:**
- **Phase 5-6** (low priority, nice-to-have)
- **Effort:** 3-5 points (requires feature detection and fallback)
- **Solution:**
  - Detect browser support: `new Image().onload = function() { supportsWebP = true; }`
  - Generate both JPEG and WebP, measure size, use smaller
  - Store format preference in localStorage: `wishlist:preferences:imageFormat`
  - Backend can serve via content-type negotiation

**Post-MVP Decision:** Defer. JPEG at 0.8 is good enough for MVP. Revisit if storage costs become significant.

---

## Scope Tightening Suggestions

### Consider OUT OF SCOPE for MVP (Already Correct)

The MVP correctly excludes:
- Server-side image resizing (keep simple)
- Multiple size variants (thumbnail, medium, large)
- Progressive JPEG optimization
- Advanced format selection
- Image cropping/editing UI
- Compression quality customization
- User preference sync across devices

**Verdict:** Scope is well-defined and appropriately tight for MVP.

---

### Ambiguities to Clarify (Already Clarified in Spec)

**Already clear in spec:**
1. ✓ Max compression settings (1MB, 1920px, quality 0.8)
2. ✓ Skip logic (< 500KB)
3. ✓ Fallback behavior (graceful on error)
4. ✓ Checkbox label ("High quality (skip compression)")
5. ✓ localStorage key name

**No clarifications needed.** Spec is detailed and implementable.

---

## Future Requirements (Nice-to-Have)

### Phase 4 Enhancements (Next Sprint)

1. **File Size Limits & Warnings**
   - Reject files > 20MB with clear error message
   - Warn on files > 10MB: "This is a large file. Compression may take a minute."
   - Provide "Troubleshooting" link for users with large files

2. **Compression Analytics**
   - Log compression events to CloudWatch
   - Dashboard: daily/weekly compression stats
   - Alert: if error rate spikes

3. **HEIC Support**
   - Add heic2any.js dependency
   - Detect HEIC by MIME type → convert to JPEG before compression
   - Test on iPhone 12+ devices

4. **GIF Animation Detection**
   - Check GIF header before compression
   - Skip compression for animated GIFs
   - Show user: "Animated GIF detected. Compression would make it static."

### Phase 5 Enhancements (Future Sprint)

1. **User Preference Sync**
   - Migrate `imageCompression` preference to backend user profile
   - API: `GET/POST /api/user/preferences`
   - Sync on app startup

2. **Quality Customization**
   - Add settings UI: quality slider (0.5-0.9)
   - Store per-user preference
   - A/B test different defaults

3. **Advanced Format Support**
   - Detect WebP/AVIF browser support
   - Generate multiple formats, use smallest
   - Add format preference to user settings

### Phase 6+ Future (Long-term)

1. **Server-side Image Optimization**
   - AWS Lambda@Edge image processing
   - Automatic AVIF/WebP generation at S3 upload
   - CDN delivery with format negotiation

2. **Image Editor**
   - Client-side crop/rotate before compression
   - "Edit image" UI modal in form
   - Apply filters (brightness, saturation)

---

## Known Limitations (Accepted for MVP)

| Limitation | Impact | Workaround | Priority |
|-----------|--------|-----------|----------|
| No HEIC support | iPhone users get no compression | Use "High quality" toggle | Phase 4 |
| No GIF animation support | Animated GIFs become static | User must convert before upload | Phase 4 |
| No quality customization | Users can't adjust trade-off | Use toggle: compress or skip | Phase 5 |
| No preference sync | Settings not portable | Will sync in Phase 5 | Phase 5 |
| No compression analytics | Can't measure impact | Add logging in Phase 4 | Phase 4 |
| Large files may crash | > 20MB on low-end devices | Warn user, allow fallback | Phase 4 |
| CSP/Web Worker conflicts | May block main thread | Test in Phase 4 | Phase 4 |
| No WebP/AVIF support | Slightly larger files | Use JPEG baseline | Phase 5 |

---

## Risk Mitigation Order (Recommended)

1. **Phase 3 (MVP Launch)** → Accept risks, ship MVP
2. **Phase 4 (Weeks 2-3 after MVP)** → Address high-impact: file size warning, HEIC, GIF detection, analytics
3. **Phase 5 (Month 2)** → Nice-to-have: quality customization, preference sync, advanced formats
4. **Phase 6+ (Long-term)** → Server-side optimization, image editor

---

## Summary: Risk Heat Map

| Risk | Severity | Likelihood | MVP Impact | Timeline |
|------|----------|-----------|-----------|----------|
| Large files (>20MB) crash | HIGH | MEDIUM | FUTURE | Phase 4 |
| HEIC not supported | HIGH | HIGH (iPhones) | FUTURE | Phase 4 |
| GIF animation lost | MEDIUM | LOW | FUTURE | Phase 4 |
| Quality not customizable | LOW | MEDIUM | FUTURE | Phase 5 |
| No analytics | MEDIUM | CERTAIN | FUTURE | Phase 4 |
| Web Worker issues | LOW | VERY LOW | FUTURE | Phase 4 |
| Preference sync missing | MEDIUM | MEDIUM | FUTURE | Phase 5 |
| No WebP/AVIF | LOW | MEDIUM | FUTURE | Phase 5 |

---

## Conclusion

**MVP is safe to launch** with identified post-MVP risks clearly documented and prioritized. No showstoppers. High-impact risks (HEIC, analytics) targeted for Phase 4. Lower-priority enhancements deferred to Phase 5+.
