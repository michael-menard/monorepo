# Future Risks: REPA-004 - Migrate Image Processing

## Non-MVP Risks

### Risk 1: Backend Sharp consolidation deferred
**Impact (if not addressed post-MVP)**:
- Backend image processing remains fragmented across `apps/api/lego-api/core/image-processing/` and `packages/backend/image-processing/`
- Future apps may implement duplicate backend logic
- Inconsistent watermarking/thumbnail generation

**Recommended timeline**: Follow-up story within same sprint (REPA-005 candidate)

### Risk 2: Limited adoption across other apps
**Impact (if not addressed post-MVP)**:
- Instructions gallery, inspiration gallery still implement custom compression
- Presets not standardized across upload surfaces
- User experience inconsistent (different compression quality)

**Recommended timeline**: Incremental adoption over next 2 sprints as apps add upload features

### Risk 3: No versioning strategy for API changes
**Impact (if not addressed post-MVP)**:
- Breaking changes to `useUpload` hook force all consumers to update simultaneously
- Can't A/B test new compression presets
- Difficult to roll back changes

**Recommended timeline**: Implement semver for package by Q2 2026

### Risk 4: Limited observability for compression failures
**Impact (if not addressed post-MVP)**:
- No metrics on compression failure rates
- Can't detect browser-specific issues
- Hard to debug user-reported upload problems

**Recommended timeline**: Add error telemetry in Q2 2026 (with analytics story)

### Risk 5: No progressive enhancement for older browsers
**Impact (if not addressed post-MVP)**:
- Users on older iOS/Safari may get failed HEIC conversions
- No graceful fallback to server-side conversion
- Poor user experience for <5% of users

**Recommended timeline**: Add feature detection + fallback in Q3 2026

## Scope Tightening Suggestions

### Clarification 1: Backend migration explicitly deferred
Ensure story clearly marks backend Sharp consolidation as NON-GOAL to avoid scope creep

### Clarification 2: Single consumer migration only
Story should only migrate wishlist app, not attempt to adopt package in other apps yet

### Clarification 3: No new presets
Do not add new compression presets in this story - only migrate existing ones

### Clarification 4: No performance optimization
Migration should preserve existing compression times, not optimize them

## Future Requirements

### Nice-to-have 1: Background compression worker
Use Web Workers for compression to avoid blocking main thread on large files

### Nice-to-have 2: Compression preview
Show before/after file sizes in UI before upload

### Nice-to-have 3: Smart preset selection
Auto-select preset based on network speed (navigator.connection API)

### Nice-to-have 4: Server-side HEIC conversion fallback
If browser HEIC conversion fails, fall back to Lambda-based conversion

### Nice-to-have 5: Compression cancellation
Allow users to cancel in-progress compression/upload
