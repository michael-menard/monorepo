# Dev Feasibility Review: BUGF-018

**Story:** Fix Memory Leaks from createObjectURL
**Reviewer:** PM Dev Feasibility Agent
**Date:** 2026-02-13

---

## Feasibility Assessment

**Overall Verdict:** ✅ **FEASIBLE**

**Risk Level:** Low
**Effort Estimate:** Small (1-2 hours)
**Implementation Complexity:** Low

---

## Technical Approach

### Pattern to Implement

The solution follows a well-established React cleanup pattern using `useEffect` hooks. This pattern is already partially implemented in `ThumbnailUpload` component.

**Standard cleanup pattern:**

```typescript
const [previewUrl, setPreviewUrl] = useState<string | null>(null)

// Create blob URL when file is selected
const handleFileSelect = (file: File) => {
  const url = URL.createObjectURL(file)
  setPreviewUrl(url)
}

// Add cleanup effect
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }
}, [previewUrl])
```

**For multiple images (ImageUploadZone):**

```typescript
const [previewUrls, setPreviewUrls] = useState<string[]>([])

useEffect(() => {
  return () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url))
  }
}, [previewUrls])
```

---

## Reuse Opportunities

### Existing Pattern in Codebase

**File:** `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`

Lines 141-147 show the correct cleanup pattern in `handleRemove`:

```typescript
const handleRemove = useCallback(() => {
  setSelectedFile(null)
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)  // ✅ Correct
    setPreviewUrl(null)
  }
}, [previewUrl])
```

**Action:** Extend this pattern to unmount cleanup by adding a `useEffect` hook.

---

## Files to Modify

### 1. UploadModal (app-inspiration-gallery)

**File:** `apps/web/app-inspiration-gallery/src/components/UploadModal/index.tsx`

**Current Issue:**
- Line 126: Creates blob URL
- Line 127: Stores in `previewUrl` state
- **Missing:** No cleanup on unmount or when modal closes

**Required Changes:**
1. Add `useEffect` hook with cleanup function
2. Update `handleClose` to revoke URL before resetting state

**Estimated Effort:** 15 minutes

---

### 2. ThumbnailUpload (app-instructions-gallery)

**File:** `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`

**Current State:**
- ✅ Has cleanup in `handleRemove` (line 144)
- ❌ Missing cleanup on unmount

**Required Changes:**
1. Add `useEffect` hook with cleanup function to handle unmount
2. Keep existing `handleRemove` cleanup

**Estimated Effort:** 10 minutes

---

### 3. ImageUploadZone (app-sets-gallery)

**File:** `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`

**Current Issue:**
- Line 117: Creates blob URLs for multiple images
- **Missing:** No cleanup on unmount or image removal

**Required Changes:**
1. Add `useEffect` hook to cleanup all preview URLs on unmount
2. Update `removeImage` handler to revoke specific URL when removing individual image

**Estimated Effort:** 20 minutes

---

## Dependencies

### External Dependencies
- None - uses native Web APIs (`URL.createObjectURL`, `URL.revokeObjectURL`)

### Internal Dependencies
- None - changes are isolated to individual components
- No cross-component impacts

---

## Implementation Constraints

### Must Follow
1. **React cleanup pattern:** Use `useEffect` return function
2. **Null checks:** Always check if URL exists before revoking
3. **State dependencies:** Include preview URL(s) in `useEffect` dependency array

### Must Avoid
1. **Double revocation:** Don't call `revokeObjectURL` on already-revoked URLs
2. **Stale closures:** Ensure effect dependency array includes all preview URLs

---

## Testing Feasibility

### Unit Testing
- ✅ Straightforward - use `vi.spyOn(URL, 'revokeObjectURL')`
- ✅ Can verify cleanup is called on unmount
- ✅ Can verify cleanup is called on file removal

### Manual Testing
- ✅ Browser DevTools Memory tab can verify blob URLs are released
- ✅ Heap snapshots can confirm no memory leaks

---

## Risk Analysis

### Technical Risks
- **None** - Standard React pattern with no edge cases

### Integration Risks
- **None** - Changes are isolated to component lifecycle hooks

### Performance Risks
- **None** - Cleanup is synchronous and lightweight

---

## Alternative Approaches Considered

### 1. Custom Hook
Create a `useObjectURL` hook to encapsulate the pattern.

**Pros:**
- Reusable across components
- Centralized cleanup logic

**Cons:**
- Over-engineering for 3 components
- Adds abstraction layer

**Decision:** Not recommended - inline implementation is clearer for this scope.

### 2. FileReader with Data URLs
Replace `createObjectURL` with `FileReader.readAsDataURL`.

**Pros:**
- No manual cleanup required

**Cons:**
- Slower performance (base64 encoding)
- Larger memory footprint
- Breaking change to existing functionality

**Decision:** Not recommended - cleanup fix is simpler and maintains performance.

---

## Implementation Readiness

| Criteria | Status |
|----------|--------|
| Pattern established | ✅ Yes (ThumbnailUpload handleRemove) |
| Dependencies available | ✅ Yes (native Web APIs) |
| Testing approach defined | ✅ Yes (unit tests + manual profiling) |
| No blocking issues | ✅ Confirmed |
| Clear acceptance criteria | ✅ Defined in seed |

---

## Recommendations

1. **Start with ThumbnailUpload** - already has partial cleanup, easiest to complete
2. **Apply to UploadModal next** - single file scenario, similar to ThumbnailUpload
3. **Finish with ImageUploadZone** - multiple files, slightly more complex
4. **Add JSDoc comments** - document the cleanup pattern for future developers
5. **Run manual memory profiling** - validate fix in browser DevTools

---

## Conclusion

This story is **ready for implementation** with no blockers. The cleanup pattern is well-established, already partially implemented in the codebase, and requires only minor additions to existing components. Estimated total effort is 45 minutes of implementation + 30 minutes of testing = 1-2 hours total.
