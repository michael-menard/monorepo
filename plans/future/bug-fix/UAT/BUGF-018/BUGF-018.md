---
id: BUGF-018
title: "Fix Memory Leaks from createObjectURL"
status: in-qa
priority: P2
phase: 3
epic: bug-fix
story_type: bug
points: 1
experiment_variant: control
created_at: "2026-02-13T00:00:00Z"
updated_at: "2026-02-14T00:00:00Z"
---

# BUGF-018: Fix Memory Leaks from createObjectURL

## Context

Components using `URL.createObjectURL()` for file preview functionality are not properly cleaning up blob URLs when components unmount or when files are removed. This creates memory leaks as the browser retains these blob URLs indefinitely until manually revoked.

### Current State

Based on codebase analysis, three components use `createObjectURL` without proper cleanup:

1. **UploadModal** (`apps/web/app-inspiration-gallery/src/components/UploadModal/index.tsx`)
   - Line 126: Creates object URL for file preview
   - Line 127: Stores in `previewUrl` state
   - Missing: No cleanup in useEffect or when file is removed
   - Impact: Memory leak on modal close or file change

2. **ThumbnailUpload** (`apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`)
   - Line 95: Creates object URL for file preview
   - Line 120: Creates object URL in drag-and-drop handler
   - Partial cleanup: Has cleanup in `handleRemove` (line 144) ✅
   - Missing: No cleanup on component unmount

3. **ImageUploadZone** (`apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`)
   - Line 117: Creates object URLs for multiple image previews
   - Missing: No cleanup on component unmount or image removal

### Good Pattern Found

The `ThumbnailUpload` component demonstrates the correct cleanup pattern in its `handleRemove` function (lines 141-147):

```typescript
const handleRemove = useCallback(() => {
  setSelectedFile(null)
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)  // ✅ Correct cleanup
    setPreviewUrl(null)
  }
}, [previewUrl])
```

This pattern needs to be extended to unmount cleanup and applied to other components.

---

## Goal

Prevent memory leaks from blob URLs in file upload components by implementing proper cleanup using React's `useEffect` cleanup pattern.

---

## Non-Goals

- Replacing `createObjectURL` with `FileReader` (performance regression)
- Creating a custom `useObjectURL` hook (over-engineering for 3 components)
- Modifying `WishlistForm` component (uses FileReader with data URLs, not affected)

---

## Scope

### Files to Modify

1. `apps/web/app-inspiration-gallery/src/components/UploadModal/index.tsx`
2. `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`
3. `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`

### Test Files to Create

1. `apps/web/app-inspiration-gallery/src/components/UploadModal/__tests__/UploadModal.test.tsx` (memory cleanup tests)
2. `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__tests__/ThumbnailUpload.test.tsx` (memory cleanup tests)
3. `apps/web/app-sets-gallery/src/components/ImageUploadZone/__tests__/ImageUploadZone.test.tsx` (memory cleanup tests)

---

## Acceptance Criteria

### AC1: useEffect Cleanup Implementation
All components using `URL.createObjectURL()` must add cleanup in a `useEffect` hook with a return function that revokes blob URLs.

**Verification:**
- UploadModal has `useEffect` with cleanup
- ThumbnailUpload has `useEffect` with cleanup (in addition to existing `handleRemove`)
- ImageUploadZone has `useEffect` with cleanup for all preview URLs

### AC2: URL.revokeObjectURL Called
Cleanup function must call `URL.revokeObjectURL()` for each blob URL before component unmount or state change.

**Verification:**
- Code review confirms `URL.revokeObjectURL()` is called in useEffect cleanup
- Unit tests verify the function is called (using `vi.spyOn`)

### AC3: Cleanup on All Lifecycle Events
Cleanup must occur on:
- Component unmount
- File removal/replacement
- Preview URL state change

**Verification:**
- Unit tests cover unmount scenario
- Unit tests cover file removal scenario
- Unit tests cover file replacement scenario

### AC4: No Memory Leaks Detectable
No memory leaks detectable in browser DevTools memory profiler after fix.

**Verification:**
- Manual memory profiling shows no retained blob URLs after operations
- Heap snapshots confirm memory is released after component unmount

### AC5: Unit Tests Verify Cleanup
Unit tests verify cleanup is called appropriately using `vi.spyOn`.

**Verification:**
- 7 new unit tests added (3 for UploadModal, 2 for ThumbnailUpload, 2 for ImageUploadZone)
- All tests use `vi.spyOn(URL, 'revokeObjectURL')` to verify cleanup calls
- All tests pass

---

## Reuse Plan

### Existing Pattern
Reuse the cleanup pattern from `ThumbnailUpload.handleRemove` (lines 141-147) and extend it to `useEffect` hooks.

### Standard Implementation Pattern

**Single file preview:**
```typescript
const [previewUrl, setPreviewUrl] = useState<string | null>(null)

// Cleanup effect
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }
}, [previewUrl])
```

**Multiple file previews (ImageUploadZone):**
```typescript
const [previewUrls, setPreviewUrls] = useState<string[]>([])

useEffect(() => {
  return () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url))
  }
}, [previewUrls])
```

---

## Architecture Notes

### Memory Management Pattern

React's `useEffect` cleanup function runs:
1. Before the component unmounts
2. Before re-running the effect (if dependencies change)

This ensures blob URLs are revoked when:
- Component is removed from DOM
- Preview URL changes (file replacement)
- Component re-renders with new preview URL

### Why createObjectURL Instead of FileReader?

`URL.createObjectURL()` is preferred over `FileReader.readAsDataURL()` because:
- Better performance (no base64 encoding)
- Smaller memory footprint (reference vs. copy)
- Immediate synchronous result

The tradeoff is manual cleanup, which this story addresses.

---

## Test Plan

See: `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-018/_pm/TEST-PLAN.md`

### Unit Tests Summary

**UploadModal:**
- Test: Revoke URL on unmount
- Test: Revoke URL when removing image
- Test: Revoke old URL when replacing with new file

**ThumbnailUpload:**
- Test: Revoke URL on unmount
- Test: Verify existing handleRemove cleanup still works

**ImageUploadZone:**
- Test: Revoke all URLs on unmount (multiple files)
- Test: Revoke URL when removing individual image

**Total:** 7 new unit tests

### Manual Memory Profiling

1. Open browser DevTools → Memory tab
2. Take baseline heap snapshot
3. Upload image in affected component
4. Close/unmount component
5. Force garbage collection
6. Take another heap snapshot
7. Compare - verify no retained blob URLs

**Expected Result:** No blob URLs remain in memory after component unmount.

---

## Dev Feasibility Assessment

See: `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-018/_pm/DEV-FEASIBILITY.md`

**Verdict:** ✅ FEASIBLE

**Effort Estimate:** 1-2 hours
- Implementation: 45 minutes (15 min + 10 min + 20 min)
- Testing: 30 minutes (unit tests + manual profiling)

**Risk Level:** Low
- Standard React pattern
- No dependencies
- No integration risks
- Isolated component changes

---

## Risk Predictions

**Split Risk:** 0.1 (Low)
- Well-defined scope with 3 files to modify
- Established pattern already in codebase
- No dependencies or cross-component impacts

**Review Cycles:** 1 (Expected)
- Simple pattern application with clear ACs
- Existing pattern to follow in ThumbnailUpload
- Minimal integration complexity

**Token Estimate:** 60,000
- Implementation: ~20K
- Testing: ~15K
- Review: ~15K
- Documentation: ~10K

**Confidence:** Medium (heuristics-only mode, KB unavailable)

---

## Implementation Checklist

### Code Changes

- [ ] **UploadModal** - Add useEffect cleanup for `previewUrl`
- [ ] **UploadModal** - Update `handleClose` to revoke URL before resetting state
- [ ] **ThumbnailUpload** - Add useEffect cleanup for `previewUrl` on unmount
- [ ] **ThumbnailUpload** - Keep existing `handleRemove` cleanup (already correct)
- [ ] **ImageUploadZone** - Add useEffect cleanup for all preview URLs
- [ ] **ImageUploadZone** - Update `removeImage` to revoke specific URL

### Documentation

- [ ] Add JSDoc comments explaining cleanup pattern in each component
- [ ] Update component documentation with memory management notes

### Testing

- [ ] Add 3 unit tests for UploadModal
- [ ] Add 2 unit tests for ThumbnailUpload
- [ ] Add 2 unit tests for ImageUploadZone
- [ ] Run manual memory profiling in browser DevTools
- [ ] Verify no blob URLs remain in heap snapshots

---

## References

- [MDN: URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [MDN: URL.revokeObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL)
- [React: useEffect cleanup function](https://react.dev/reference/react/useEffect#my-effect-runs-after-every-re-render)

---

## Success Metrics

- All blob URLs properly revoked (verified via DevTools)
- No memory leaks detectable in profiler
- All 7 unit tests passing with cleanup verification
- Code review confirms pattern consistency across all affected components

---

## Reality Baseline

### Established Patterns
- ThumbnailUpload component has correct cleanup in `handleRemove` (line 144)
- Pattern: Check if URL exists before revoking
- Pattern: Set state to null after revoking

### Changed Constraints
- None

### Active Stories
- None blocking this work

### Protected Features
- WishlistForm component uses FileReader (not affected, do not modify)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-13_

### MVP Gaps Resolved

No MVP-critical gaps identified - story is implementation-ready.

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Resolution |
|---|---------|----------|------------|
| 1 | Test setup inconsistency between apps | edge-case | app-sets-gallery has URL.createObjectURL stub in setup.ts, app-inspiration-gallery does not. Tests can handle per-test spyOn pattern. |
| 2 | No automated memory leak detection in CI | observability | Manual memory profiling is sufficient for current scale. Future enhancement when CI automation becomes priority. |
| 3 | Manual memory profiling is tedious | ux-polish | Browser DevTools manual profiling is acceptable for 3 components. Automation only needed if pattern expands significantly. |
| 4 | Custom hook could centralize pattern | future-work | Only 3 components currently use createObjectURL. Wait until 5+ components before abstracting to custom hook (YAGNI principle). |
| 5 | No ESLint rule for createObjectURL without cleanup | code-quality | Current code review process can catch this. Consider if pattern becomes more prevalent or leaks recur. |
| 6 | FileReader alternative not evaluated | performance | createObjectURL is appropriate choice for performance. Document comparison only if use case emerges requiring FileReader. |
| 7 | No TypeScript guard for blob URL types | code-quality | Runtime cleanup pattern is sufficient. Branded types add type safety but require ecosystem support. |
| 8 | Cleanup pattern not documented in CLAUDE.md | documentation | Should document after pattern is validated in production. **Recommended for post-implementation follow-up.** |
| 9 | No runtime warning in development | observability | Dev-mode runtime checks would help catch future issues. Consider if createObjectURL usage expands. |
| 10 | ImageUploadZone cleanup timing unclear | documentation | Current implementation assumes component-owned cleanup, which is correct since component creates the blob URLs. |
| 11 | Multiple createObjectURL calls in ThumbnailUpload | code-quality | Consolidate file select (line 95) and drag-drop (line 120) handlers to reduce duplication. |
| 12 | No usage metrics for blob URL lifecycles | observability | Telemetry would help debug future issues but not needed for current fix. Consider if memory issues persist. |
| 13 | Test coverage doesn't verify concurrent cleanup | edge-case | Rapid file selection test would verify race condition handling. React's batching makes this unlikely but worth documenting. |

### Summary

- **ACs added:** 0
- **KB entries deferred:** 13 (autonomous mode - kb-writer tool not available)
- **MVP-critical gaps:** 0
- **Non-blocking findings:** 13
- **Mode:** Autonomous (autonomous-decider verdict applied)
- **Verdict:** PASS - Story ready for implementation
