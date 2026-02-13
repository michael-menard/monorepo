# Future Opportunities - REPA-004

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No retry mechanism in useUpload hook | Low | Low | Add retry() function to hook return (already documented in story but not in AC) |
| 2 | WebP fallback behavior not tested | Medium | Low | Add E2E test for browsers without WebP support (Safari <14) - verify JPEG fallback works |
| 3 | Concurrent upload isolation not verified | Low | Medium | Story mentions edge case but no test AC - add test for multiple simultaneous uploads with isolated progress tracking |
| 4 | Progress callback contract not documented | Medium | Low | Add JSDoc with explicit contract: `onProgress(percent: number, phase: 'converting' \| 'compressing' \| 'uploading')` |
| 5 | No bundle size impact analysis tool | Low | Medium | Story mentions "Bundle size check: Wishlist app bundle <5% increase" but no automation - create CI job for bundle size comparison |
| 6 | HEIC burst photo handling edge case | Low | Low | convertHEICToJPEG takes first image from burst photos - document this behavior or add option to select which image |
| 7 | Compression result not exposed in hook | Medium | Low | useUpload returns compressionResult but story doesn't show how consuming app displays compression stats (WISH-2022 feature) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Image preview generation | High | Medium | Add optional preview generation to @repo/upload (thumbnail creation before upload for instant feedback) |
| 2 | Multi-file upload orchestration | High | High | Extend useUpload to support batch uploads with overall progress tracking |
| 3 | Upload resume/retry on network failure | Medium | High | Add resumable upload support using multipart upload with S3 (requires backend changes) |
| 4 | Compression worker pool | Medium | Medium | Use multiple web workers for parallel compression in batch uploads |
| 5 | Format detection and conversion | Medium | Medium | Auto-detect optimal format (WebP, AVIF, JPEG) based on browser support and image characteristics |
| 6 | Metadata preservation | Low | Medium | Preserve EXIF data (GPS, orientation) during compression - currently strips all metadata |
| 7 | Server-side compression fallback | Medium | High | If client-side compression fails, send original to backend for processing (requires API changes - out of scope for REPA) |
| 8 | Upload analytics | Low | Low | Track compression ratios, upload speeds, error rates for monitoring dashboard |

## Categories

### Edge Cases
- WebP fallback verification (gap #2)
- Concurrent upload isolation (gap #3)
- HEIC burst photo handling (gap #6)

### UX Polish
- Image preview generation (enhancement #1)
- Compression result display guidance (gap #7)
- Progress callback contract documentation (gap #4)

### Performance
- Compression worker pool for batches (enhancement #4)
- Format detection and optimization (enhancement #5)
- Upload resume on network failure (enhancement #3)

### Observability
- Bundle size impact automation (gap #5)
- Upload analytics tracking (enhancement #8)

### Integrations
- Multi-file batch uploads (enhancement #2)
- Server-side compression fallback (enhancement #7)

---

## Notes

**Priority Ranking for Future Stories**:
1. **High Impact, Low Effort**: Progress callback contract docs (gap #4), Compression result display (gap #7)
2. **High Impact, Medium Effort**: Image preview generation (enhancement #1), WebP fallback test (gap #2)
3. **High Impact, High Effort**: Multi-file batch uploads (enhancement #2), Upload resume (enhancement #3)

**Backend Migration Dependencies** (REPA-005):
- Metadata preservation (enhancement #6) requires coordination with backend Sharp optimizer
- Server-side compression fallback (enhancement #7) blocked until REPA-005 completes backend consolidation

**Monitoring Recommendations**:
- Add Sentry tracking for compression errors (isHEIC detection failures, heic2any errors)
- Add performance marks for compression timing (useful for preset tuning)
- Track WebP fallback usage rate (informs browser support decisions)
