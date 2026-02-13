# Future Opportunities - INST-1107

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Presigned URL Caching Consideration**: Story says "no caching" but doesn't explain why URLs expire in 15 minutes. Future optimization could cache for 10 minutes with refresh mechanism. | Low | Medium | Document reasoning: security vs UX tradeoff. Consider longer expiry (30-60 min) for large files in future story. |
| 2 | **Download Analytics Missing**: No metrics for which files are downloaded, failure rates, or popular content. | Low | Low | Add CloudWatch metrics in INST-3082 (Download History/Analytics). Track: download count per file, success rate, average presigned URL generation time. |
| 3 | **Rate Limiting Not Specified**: Story doesn't mention rate limits on download endpoint. Could be abused for DDoS or cost attacks. | Medium | Low | Add rate limiting in Phase 2 (INST-1203: Rate Limiting & Observability). Suggest: 100 downloads per user per 5 minutes. |
| 4 | **CORS Edge Case**: Story mentions "verify S3 CORS" but doesn't provide CORS config. New deployment environments might miss this. | Medium | Low | Document S3 CORS config in infrastructure notes or deployment checklist. Headers: `GET` allowed, `Access-Control-Allow-Origin` set. |
| 5 | **Content-Type Handling**: Story uses `ResponseContentDisposition` for filename but doesn't set `ResponseContentType`. Browser may guess incorrectly. | Low | Low | Future: Set `ResponseContentType` based on file.mimeType in presigned URL. Ensures PDFs open correctly, CSVs download. |
| 6 | **Download Link Expiry Warning**: User has no indication that presigned URL expires in 15 minutes. Could lead to confusion if shared or delayed. | Low | Medium | INST-3081: Show countdown timer or warning if URL older than 10 minutes. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Copy Download Link Feature**: Power users might want to share presigned URLs within org (expires in 15 min). | Medium | Low | INST-3083: Add "Copy Link" button next to Download. Shows expiry time. Useful for team collaboration. |
| 2 | **QR Code for Mobile Downloads**: Scan QR code on desktop, download on phone. | Low | Low | INST-3084: Generate QR code from presigned URL. Useful for large files easier to handle on mobile. |
| 3 | **Batch Download (ZIP)**: Mentioned as non-goal but highly requested feature. Users want "Download All Files" button. | High | High | INST-3080: Backend generates ZIP file from multiple S3 objects, returns presigned URL for ZIP. Requires S3 Lambda or streaming ZIP generation. |
| 4 | **Download Progress Tracking**: Story says "browser handles this" but no custom progress UI. Large files (50MB) would benefit from in-app progress. | Medium | Medium | INST-3081: Track download progress using Fetch API with progress events. Show percentage and speed. |
| 5 | **File Preview Before Download**: PDF thumbnails or previews would improve UX. User confirms correct file before downloading. | Medium | High | INST-3085: Generate PDF thumbnails (first page) on upload. Display in file list. Click to preview, button to download. |
| 6 | **Download Speed Optimization**: S3 direct download is fine but could use CloudFront for global users. | Low | Medium | INST-3086: Route downloads through CloudFront signed URLs instead of S3 presigned URLs. Faster for international users. |
| 7 | **Download Notifications**: Email or push notification when large file ready (if async processing added). | Low | Low | INST-3087: If file processing (compression, format conversion) added, notify user when ready. Not needed for direct downloads. |
| 8 | **File Integrity Check**: Verify file not corrupted with checksum (MD5 or SHA256). | Low | Medium | INST-3088: Store file checksum in database during upload. Display checksum on download page. User can verify after download. |
| 9 | **Download History Tracking**: Track which files user downloaded and when. Useful for auditing or recommendations. | Medium | Low | INST-3082: Store download events in database. Show "Downloaded 2 days ago" in file list. Privacy consideration: PII. |
| 10 | **Partial Downloads / Resume Support**: S3 supports range requests. Could enable resume for interrupted downloads. | Low | Medium | INST-3089: Add `Accept-Ranges` header to presigned URL. Browser handles resume automatically. Useful for large files on unstable connections. |

## Categories

### Edge Cases
- **Filename Encoding Edge Cases** (EDGE-2 in TEST-PLAN): Unicode, quotes, special chars tested but could expand to more languages (Chinese, Arabic, emoji in filenames).
- **Expired URL Handling** (EDGE-3): Currently user gets S3 403. Could intercept and auto-regenerate fresh URL with user confirmation.
- **S3 Outage Handling**: If S3 unavailable, presigning fails with 500. Could add retry logic or fallback message: "Downloads temporarily unavailable. Try again in a few minutes."

### UX Polish
- **Success Animation**: Checkmark animation when download starts (vs just browser download bar).
- **Download Button States**: Currently only "ready" and "loading". Could add "success" state (brief checkmark) before returning to ready.
- **Filename Truncation in UI**: Long filenames might overflow. Truncate with ellipsis, show full name on hover/tooltip.
- **Icon by File Type**: Different icons for PDF vs CSV vs XML. Currently uses generic Download icon.
- **Mobile Download UX**: On mobile, downloads go to browser's default location. Could show instructions: "Check your Downloads folder."

### Performance
- **Presigned URL Generation Time**: Currently synchronous. Could pregenerate URLs for all files on detail page load (background) to eliminate click-to-download latency.
- **Parallel Download Support**: Browser limits concurrent downloads. If user clicks multiple Download buttons rapidly, queue them or show limit warning.
- **S3 Transfer Acceleration**: For global users, enable S3 Transfer Acceleration on bucket for faster downloads.

### Observability
- **Download Success Rate**: Track how many presigned URLs are generated vs how many S3 GET requests succeed.
- **File Type Popularity**: Which file types are downloaded most (PDF vs CSV vs XML)? Informs future features.
- **Average Download Time**: Track time from presigned URL generation to S3 download completion (if possible via CloudWatch logs).
- **Error Rate by Type**: 404 vs 500 vs 403 (expired). Identify common failure modes.

### Integrations
- **Rebrickable Export**: If user downloads parts list, offer to import into Rebrickable account (future INST-3050).
- **Cloud Storage Sync**: Option to sync downloaded files to Google Drive / Dropbox automatically (future INST-3090).
- **Email File Link**: Instead of downloading, email presigned URL to self or friend (security consideration: short expiry).

### Security Enhancements
- **Audit Log for Downloads**: Log all download attempts (success/fail) for security auditing. Who downloaded what, when.
- **Download Permissions**: Currently owner-only. Future: share MOC with collaborators who can also download files.
- **Watermarking**: Add user ID watermark to PDF downloads to prevent unauthorized sharing (advanced, INST-3091).
- **Download Limits**: Daily/monthly download quota per user to prevent abuse or cost overruns.

---

## Deferred Features (Cross-Reference)

Per story Non-Goals section, these are explicitly deferred:

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Multi-file zip downloads | INST-3080 | Single file only for MVP |
| Download progress tracking | INST-3081 | Browser handles this, custom UI is nice-to-have |
| Download history/analytics | INST-3082 | Not blocking core journey |
| Virus scanning before download | INST-2031 | Assumes files already scanned on upload |
| CDN delivery (CloudFront) | INST-3086 | S3 direct is sufficient for MVP |
| Thumbnail downloads | INST-1103 | Different story (thumbnail upload/display) |

---

## Notes for Future Story Planning

1. **INST-3080 (Batch Download)** will require significant backend work: ZIP generation (streaming or Lambda), presigned URL for ZIP, cleanup of temp files.
2. **INST-3081 (Download Progress)** depends on frontend framework capabilities (Fetch API progress events) and may conflict with `window.location.href` download method.
3. **INST-3082 (Analytics)** should reuse existing CloudWatch metrics infrastructure (INST-1203).
4. **Performance optimizations** (CloudFront, pregeneration) are low-hanging fruit for Phase 2 once MVP is stable.
5. **Security enhancements** (audit logs, permissions) should be prioritized if MOC sharing features are added.
