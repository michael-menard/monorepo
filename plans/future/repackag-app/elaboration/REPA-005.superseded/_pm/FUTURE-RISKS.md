# Future Risks: REPA-005 - Migrate Upload Components

This file tracks non-MVP risks and concerns that are important but NOT blocking for the core migration story.

---

## Non-MVP Risks

### Risk 1: Component API Fragmentation
**Risk**: As more apps consume upload components from @repo/upload, API inconsistencies or missing props may require breaking changes.

**Impact (if not addressed post-MVP)**:
- Multiple apps request conflicting component enhancements
- Breaking changes required across all consumers
- Migration effort multiplies with each app dependency

**Recommended timeline**: Q1 2026 (3-6 months post-migration)

**Mitigation**:
- Establish component API guidelines in @repo/upload README
- Version components with semantic versioning
- Document deprecation policy for breaking changes
- Collect feedback from app teams on API pain points

---

### Risk 2: Upload Performance at Scale
**Risk**: Upload components not profiled for performance with large file counts (100+ files in queue) or large file sizes (1GB+ files).

**Impact (if not addressed post-MVP)**:
- UI freezes or stutters with large upload queues
- Memory leaks during long-running upload sessions
- Browser tab crashes with very large files

**Recommended timeline**: Q2 2026 (after adoption in all apps)

**Mitigation**:
- Profile upload flows with large file counts using Chrome DevTools
- Implement virtualized list for UploaderList if >50 files
- Add memory monitoring and cleanup for upload session
- Consider Web Workers for file processing (compression, validation)

---

### Risk 3: Upload State Persistence Gaps
**Risk**: SessionProvider uses useUnsavedChangesPrompt for basic persistence, but does not handle browser crashes, network interruptions, or multi-tab scenarios.

**Impact (if not addressed post-MVP)**:
- Users lose upload progress if browser crashes
- Duplicate uploads if user opens multiple tabs
- Confusing UX if session expires mid-upload

**Recommended timeline**: Q2 2026 (user feedback dependent)

**Mitigation**:
- Implement IndexedDB persistence for upload queue
- Add "resume upload" feature after crash/refresh
- Detect multi-tab scenarios with BroadcastChannel API
- Add session heartbeat to prevent mid-upload expiry

---

### Risk 4: Accessibility Testing Coverage
**Risk**: Migration preserves existing accessibility features, but no automated a11y testing in place. Manual testing may miss regressions.

**Impact (if not addressed post-MVP)**:
- Accessibility regressions go undetected until user reports
- WCAG AA compliance at risk
- Legal/compliance issues for enterprise customers

**Recommended timeline**: Q1 2026 (3 months post-migration)

**Mitigation**:
- Add axe-core automated testing to all upload component tests
- Add Playwright a11y assertions for upload flows
- Schedule manual screen reader testing quarterly
- Document a11y test patterns in @repo/upload README

---

### Risk 5: Upload Component Duplication May Recur
**Risk**: Without clear documentation and governance, developers may create new upload components in apps instead of extending @repo/upload.

**Impact (if not addressed post-MVP)**:
- Duplication creeps back in over time
- Fragmented upload UX across apps
- Lost benefit of consolidation effort

**Recommended timeline**: Ongoing (post-merge education)

**Mitigation**:
- Document upload component usage in monorepo wiki
- Add Storybook examples for all upload components
- Code review checklist: "Should this use @repo/upload?"
- Quarterly audit for new upload component duplication

---

### Risk 6: Test Coverage Decay
**Risk**: As components evolve, test coverage may drop below 80% target if new features added without tests.

**Impact (if not addressed post-MVP)**:
- Regressions increase over time
- Confidence in upload flows decreases
- QA cycles lengthen

**Recommended timeline**: Ongoing (enforce in CI)

**Mitigation**:
- Add coverage gates to CI (fail build if coverage <80% for @repo/upload)
- Require tests for all new upload component props
- Monthly coverage report review
- Document test patterns in @repo/upload README

---

### Risk 7: Component-Level Schema Consolidation Deferred
**Risk**: FileValidationResult schema duplicated in ThumbnailUpload and InstructionsUpload. Deferred to REPA-017, but creates maintenance burden if not addressed.

**Impact (if not addressed post-MVP)**:
- Schema changes must be applied in 2 places
- Risk of schema drift (one component updated, other forgotten)
- Increased test surface area

**Recommended timeline**: Q1 2026 (align with REPA-017)

**Mitigation**:
- Track in REPA-017 story
- Move FileValidationResult to @repo/upload/types
- Update ThumbnailUpload and InstructionsUpload to import shared schema
- Add test ensuring schemas are identical until consolidation

---

## Scope Tightening Suggestions

### Consider Splitting If Mid-Implementation Issues Arise

**Split Option 1: SessionProvider to Follow-Up Story**
- If REPA-003 (useUploaderSession hook) completion is delayed
- REPA-005a: AC-1 to AC-6, AC-8 to AC-16 (all except SessionProvider)
- REPA-005b: AC-7 only (SessionProvider after REPA-003 completes)

**Split Option 2: Domain-Specific Components to Follow-Up Story**
- If core Uploader sub-components take longer than estimated
- REPA-005a: AC-1 to AC-7, AC-11 to AC-16 (Uploader sub-components + app migrations)
- REPA-005c: AC-8 to AC-10 (ThumbnailUpload, InstructionsUpload)

**Split Option 3: Reconciliation Story for Divergent Components**
- If file diffs reveal significant divergence (>10% LOC difference)
- REPA-005a: Migrate only EXACT duplicates (ConflictModal, RateLimitBanner)
- REPA-005d: Reconcile and migrate divergent components (SessionProvider, UploaderFileItem)

### Out-of-Scope Candidates for Later

- **Upload resumability**: Requires backend changes, not just component migration
- **Bulk upload optimization**: Profile first, optimize later
- **Upload analytics**: Separate instrumentation story
- **Component API redesign**: Keep backward-compatible for now, redesign in v2 if needed
- **Storybook documentation**: Important but not blocking, can follow migration
- **Upload history UI**: New feature, not consolidation

---

## Future Requirements

### Nice-to-Have Requirements (Post-MVP)

**1. Upload Component Variants**
- Compact mode for tight layouts
- Inline mode for embedded forms
- Full-screen mode for batch uploads

**2. Advanced Drag-and-Drop**
- Multi-target drag zones
- Nested folder support
- Drag reordering within queue

**3. Upload Progress Enhancements**
- Estimated time remaining
- Current upload speed (KB/s, MB/s)
- Pause/resume controls
- Retry count display

**4. Error Recovery Improvements**
- Auto-retry with exponential backoff
- Partial upload recovery (resume from byte offset)
- Detailed error explanations with remediation steps

**5. Mobile Optimizations**
- Camera integration for thumbnail upload
- Mobile-specific touch targets (48x48px minimum)
- Offline queue support (upload when back online)

---

## Polish and Edge Case Handling

### Visual Polish
- Smooth transitions for progress bars (ease-out animation)
- Fade-in animations for success/error states
- Skeleton loaders for thumbnail previews
- Hover effects for drag zones

### Edge Case Handling
- Very long file names (>100 characters)
- Very large file counts (>100 files in queue)
- Very large file sizes (>1GB individual files)
- Network interruptions mid-upload
- Browser crashes during upload
- Multi-tab upload conflicts

### UX Improvements
- Confetti animation on upload success
- Toast notifications for background uploads
- Quick actions after upload (view, upload another)
- Empty state illustrations
- Contextual tips for first-time users

---

## Cross-References

- **Test Plan**: Plans/future/repackag-app/backlog/REPA-005/_pm/TEST-PLAN.md
- **UI/UX Notes**: Plans/future/repackag-app/backlog/REPA-005/_pm/UIUX-NOTES.md
- **Dev Feasibility**: Plans/future/repackag-app/backlog/REPA-005/_pm/DEV-FEASIBILITY.md
- **Future UI/UX**: Plans/future/repackag-app/backlog/REPA-005/_pm/FUTURE-UIUX.md
- **Story File**: Plans/future/repackag-app/backlog/REPA-005/REPA-005.md (to be generated)
- **REPA-017** (Component-Level Schema Consolidation): Plans/future/repackag-app/stories.index.md

---

**Note**: None of these risks block REPA-005 MVP. This file exists to track important considerations for post-MVP planning.
