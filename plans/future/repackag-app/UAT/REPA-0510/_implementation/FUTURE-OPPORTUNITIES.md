# Future Opportunities - REPA-0510

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Storybook documentation not included | Medium - Developers must read code to learn component APIs | High - Full Storybook setup + 8 component stories | Defer to follow-up story. Add after MVP when component APIs stabilize. Priority: P3 after initial adoption. |
| 2 | Other apps (dashboard, wishlist, sets) not migrated | Medium - Other apps continue using local components or don't have upload features yet | Medium - Per-app migration effort | Defer to per-app adoption stories. Only migrate when apps need upload features. Not all apps require upload components. |
| 3 | FileValidationResult schema duplication | Low - Technical debt, 2 components have identical schemas | Low - Move to @repo/upload/types | Correctly deferred to REPA-017. Not MVP-blocking since schemas are identical and local to components. |
| 4 | Test setup complexity not explicit | Low - MSW handlers must be set up before test migration | Low - Create test/setup.ts with handlers | Add to AC-14 or create explicit test setup sub-task. Mentioned in Dev Feasibility but not formal AC. |
| 5 | Upload client function migration | Low - Already completed in REPA-002 | N/A | No action needed. REPA-002 completed. Verify useS3Upload available from REPA-004. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Component playground for development | Medium - Faster iteration when building apps | Medium - Create dev environment in package | Add Storybook or dev page for isolated component testing. Useful for future component enhancements. Priority: P3. |
| 2 | Automated visual regression testing | Medium - Catch UI changes in component migrations | High - Percy/Chromatic integration | Consider after MVP if visual regressions become issue. Current Playwright tests may be sufficient. |
| 3 | Component composition guide | Low - Help developers understand when to use each component | Low - Documentation + examples | Add to package README after initial adoption. Show common patterns (e.g., ConflictModal + UploaderList). |
| 4 | Error component catalog | Low - Central reference for all error UI patterns | Low - Documentation page | Document ConflictModal, RateLimitBanner, SessionExpiredBanner patterns for reuse in other domains. |
| 5 | Accessibility audit | Medium - Verify WCAG 2.1 AA compliance beyond basics | Medium - Full audit + fixes | Components already have focus management, ARIA, keyboard nav. Full audit can wait until post-MVP. |
| 6 | Performance optimization | Low - Component render optimization | Medium - React.memo, useMemo analysis | Only optimize if performance issues arise. Premature optimization risk. Monitor after adoption. |
| 7 | Internationalization (i18n) | Low - Components use hardcoded English strings | High - Full i18n setup + translations | Not MVP requirement. Add when platform adds i18n support. Affects all components, not just upload. |
| 8 | Component analytics | Low - Track upload component usage, errors | Medium - Analytics integration | Defer to platform analytics strategy. Not component-specific concern. |

## Categories

### Edge Cases
- Large file handling (>100MB) in UploaderFileItem progress tracking
- Countdown timer edge cases (RateLimitBanner with retryAfter >1 hour)
- Conflict resolution with missing suggested slug (ConflictModal fallback)
- Drag-and-drop on mobile devices (ThumbnailUpload touch support)

### UX Polish
- Animated transitions between upload states (idle → uploading → success)
- Drag-and-drop visual feedback improvements (ghost images, drop zones)
- Progress bar animations (smooth transitions, reduced-motion respect)
- Empty state illustrations (UploaderList with zero files)
- Batch operation feedback (cancel all, retry all confirmation)

### Performance
- Virtualized file lists for >100 files (UploaderList)
- Debounced progress updates (avoid excessive re-renders)
- Image preview lazy loading (ThumbnailUpload)
- Countdown timer optimization (RateLimitBanner uses setInterval)

### Observability
- Component error logging (integrate with @repo/logger)
- Upload analytics (track success rates, file types, errors)
- Performance metrics (upload duration, file size distribution)

### Integrations
- Clipboard paste support (ThumbnailUpload, InstructionsUpload)
- Camera capture integration (mobile photo uploads)
- Cloud storage integrations (Google Drive, Dropbox)
- Webhook notifications for long uploads

### Future-Proofing
- Multi-language file support (non-English filenames)
- Chunked upload support (resume failed uploads)
- Progressive enhancement (work without JavaScript)
- Web Worker upload processing (off main thread)

## Notes

**Split Context**: This story is split 1 of 2 from parent REPA-005. The sibling story REPA-0520 handles SessionProvider migration (depends on REPA-003).

**Divergence Risk**: If component divergence verification reveals significant differences (>10% LOC), some "future opportunities" may become MVP-critical reconciliation tasks.

**Adoption Strategy**: This story migrates only main-app and app-instructions-gallery. Other apps adopt on-demand when they need upload features.

**Test Coverage**: 80%+ target exceeds global 45% minimum. Any coverage below this threshold should be flagged as quality issue, not future opportunity.
