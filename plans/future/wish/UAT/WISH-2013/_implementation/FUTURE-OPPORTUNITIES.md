# Future Opportunities - WISH-2013

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Double extension attack (e.g., `image.jpg.exe`) | Low | Low | Add regex validation for multiple extensions. Defer to security hardening phase. |
| 2 | Content-Type header spoofing in S3 PUT | Medium | Medium | S3 bucket policy can enforce Content-Type header matches allowed MIME types. Defer to infrastructure story. |
| 3 | Presigned URL replay attack window | Low | Medium | Add one-time use token or request signature to presign response. Defer to security phase 2. |
| 4 | Missing rate limiting on presign endpoint | Medium | Medium | Add rate limiting to prevent presign spam. Covered in WISH-2008 (Authorization layer). |
| 5 | No monitoring for virus scan failures | Medium | Low | Add CloudWatch alarm for scan failure rate > 1%. Defer to observability story. |
| 6 | ClamAV virus definition updates not automated | High | Medium | CI job to weekly update Lambda layer with latest virus definitions. Defer to DevOps story. |
| 7 | No image dimension validation | Low | Low | Reject images < 100px or > 10000px width/height. Defer to UX polish story. |
| 8 | S3 lifecycle policy not configured | Low | Low | Auto-delete orphaned uploads after 7 days (no DB record). Defer to cost optimization story. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Client-side file hash validation | Medium | Medium | Generate SHA-256 hash on client, verify post-upload. Prevents upload corruption. Defer to integrity story. |
| 2 | Progressive upload with multipart S3 | High | High | For files > 5MB, use S3 multipart upload for resume capability. Defer to upload UX story. |
| 3 | Image thumbnail generation | High | Medium | Auto-generate 200px thumbnail for gallery performance. Defer to image optimization story (WISH-2016). |
| 4 | WebP conversion for legacy formats | Medium | Medium | Auto-convert JPEG/PNG to WebP for smaller file sizes. Defer to WISH-2016. |
| 5 | Virus scan result notification | Medium | Low | Email/toast notification when virus detected. Defer to notification story. |
| 6 | Admin virus scan override | Low | Low | Admin UI to manually approve quarantined files (false positive handling). Defer to admin dashboard story. |
| 7 | S3 Transfer Acceleration | Medium | High | Enable S3 Transfer Acceleration for faster uploads from distant regions. Defer to performance story. |
| 8 | Client-side image compression | High | Medium | Compress images on client before upload to reduce bandwidth. Defer to upload UX story. |
| 9 | Upload progress real-time updates | Medium | Medium | WebSocket progress updates for large files. Defer to real-time features story. |
| 10 | Content-based image deduplication | Low | High | SHA-256 hash check before upload to dedupe identical images. Defer to storage optimization story. |

## Categories

### Edge Cases
- **Double Extension Attacks** (Gap #1): Handle `file.jpg.exe` by validating only the final extension matches whitelist
- **Content-Type Spoofing** (Gap #2): Enforce S3 bucket policy requires Content-Type header matches file extension
- **Presigned URL Replay** (Gap #3): One-time use tokens to prevent URL sharing/replay
- **Image Dimension Edge Cases** (Gap #7): Reject images smaller than 100px or larger than 10000px

### UX Polish
- **Progressive Upload** (Enhancement #2): Multipart upload for large files with pause/resume capability
- **Upload Progress Real-time** (Enhancement #9): WebSocket progress updates for better UX on slow connections
- **Client-side Compression** (Enhancement #8): Compress images before upload to save bandwidth and time
- **Virus Scan Notifications** (Enhancement #5): User-friendly notifications when virus detected

### Performance
- **Image Thumbnails** (Enhancement #3): Auto-generate thumbnails for faster gallery rendering
- **WebP Conversion** (Enhancement #4): Convert legacy formats to WebP for smaller file sizes
- **S3 Transfer Acceleration** (Enhancement #7): Faster uploads from distant AWS regions
- **Content Deduplication** (Enhancement #10): Avoid storing duplicate images

### Observability
- **Virus Scan Failure Monitoring** (Gap #5): CloudWatch alarms for scan failure rate
- **Upload Failure Analytics** (Not listed): Track upload failure reasons for UX improvement
- **Cost Monitoring** (Not listed): Track S3 storage costs per user for quota management

### Integrations
- **ClamAV Auto-Updates** (Gap #6): Automate virus definition updates via CI/CD pipeline
- **Admin Override UI** (Enhancement #6): Admin dashboard to review quarantined files
- **Rate Limiting** (Gap #4): Integrate with WISH-2008 rate limiting for presign endpoint

### Security Enhancements
- **File Hash Validation** (Enhancement #1): SHA-256 hash verification to prevent upload corruption/tampering
- **S3 Lifecycle Policies** (Gap #8): Auto-delete orphaned uploads to prevent storage bloat and cost overruns
- **One-time Presigned URLs** (Gap #3): Prevent URL sharing and replay attacks

---

## Notes for Future Implementation

### High-Priority Future Work (Should happen before GA):
1. **ClamAV Auto-Updates** (Gap #6): Critical for maintaining virus detection effectiveness. Weekly CI job recommended.
2. **Virus Scan Failure Monitoring** (Gap #5): Needed for production reliability. Add CloudWatch alarm.
3. **Rate Limiting** (Gap #4): Prevent presign spam attacks. Covered in WISH-2008 authorization story.

### Medium-Priority Enhancements (Phase 2-3):
1. **Image Thumbnails** (Enhancement #3): Improves gallery performance significantly. Defer to WISH-2016 image optimization.
2. **Progressive Upload** (Enhancement #2): Better UX for large files. Defer to upload UX story.
3. **Client-side Compression** (Enhancement #8): Reduces bandwidth and upload time. Defer to upload UX story.
4. **Content-Type Spoofing Prevention** (Gap #2): S3 bucket policy enforcement for added security.

### Low-Priority Enhancements (Phase 4+):
1. **WebP Conversion** (Enhancement #4): Nice-to-have for storage optimization.
2. **Content Deduplication** (Enhancement #10): Complex feature with marginal benefit for MVP.
3. **Admin Override UI** (Enhancement #6): Needed only if false positive rate is high.

### Dependencies for Future Stories:
- **WISH-2016 (Image Optimization):** Thumbnails, WebP conversion, client-side compression
- **WISH-2008 (Authorization):** Rate limiting, ownership verification
- **Upload UX Story (TBD):** Progressive upload, real-time progress, client-side compression
- **Cost Optimization Story (TBD):** S3 lifecycle policies, content deduplication
- **Observability Story (TBD):** Virus scan monitoring, upload failure analytics

---

## Risk Analysis for Future Work

### ClamAV Auto-Updates (Gap #6)
- **Risk:** Outdated virus definitions reduce detection effectiveness
- **Mitigation:** Weekly CI job to rebuild Lambda layer with latest definitions
- **Fallback:** Manual quarterly updates if CI automation fails

### Progressive Upload (Enhancement #2)
- **Risk:** Multipart upload complexity increases error surface area
- **Mitigation:** Use AWS SDK multipart upload client (well-tested)
- **Fallback:** Keep single-part upload for files < 5MB

### Content Deduplication (Enhancement #10)
- **Risk:** SHA-256 hashing adds CPU overhead on client
- **Mitigation:** Use Web Crypto API (hardware-accelerated)
- **Fallback:** Skip deduplication check for low-bandwidth users
