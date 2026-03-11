# BUGF-018: Fix Memory Leaks from createObjectURL

**Epic:** Bug Fix - Phase 3 (Test Coverage & Quality)
**Status:** backlog
**Risk Level:** Low
**Effort Estimate:** Small (1-2 hours)

## Problem Statement

Components using `URL.createObjectURL()` for file preview functionality are not properly cleaning up blob URLs when the component unmounts or when files are removed. This creates memory leaks as the browser retains these blob URLs indefinitely until manually revoked.

## Current State Analysis

### Affected Components

Based on codebase search, the following components use `createObjectURL` without proper cleanup:

1. **`apps/web/app-inspiration-gallery/src/components/UploadModal/index.tsx`**
   - Line 126: Creates object URL for file preview
   - Line 127: Stores in `previewUrl` state
   - **Missing:** No cleanup in useEffect or when file is removed
   - **Impact:** Memory leak on modal close or file change

2. **`apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`**
   - Line 95: Creates object URL for file preview
   - Line 120: Creates object URL in drag-and-drop handler
   - **Partial cleanup:** Has cleanup in `handleRemove` (line 144)
   - **Missing:** No cleanup on component unmount

3. **`apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`**
   - Uses FileReader with data URLs instead of blob URLs
   - **Not affected** - no createObjectURL usage

4. **`apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`**
   - Line 117: Creates object URLs for multiple image previews
   - **Missing:** No cleanup on component unmount or image removal

### Good Pattern Found

The `ThumbnailUpload` component shows the correct pattern for manual cleanup:

```typescript
// Line 141-147
const handleRemove = useCallback(() => {
  setSelectedFile(null)
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)  // ✅ Correct cleanup
    setPreviewUrl(null)
  }
}, [previewUrl])
```

However, it's still missing cleanup on unmount.

## Solution Requirements

### Acceptance Criteria

1. **AC1:** All components using `URL.createObjectURL()` must add cleanup in a `useEffect` hook
2. **AC2:** Cleanup function must call `URL.revokeObjectURL()` for each blob URL
3. **AC3:** Cleanup must occur on:
   - Component unmount
   - File removal/replacement
   - Preview URL state change
4. **AC4:** No memory leaks detectable in browser DevTools memory profiler
5. **AC5:** Unit tests verify cleanup is called appropriately

### Technical Approach

**Pattern to implement:**

```typescript
// Store the preview URL in state
const [previewUrl, setPreviewUrl] = useState<string | null>(null)

// Create blob URL when file is selected
const handleFileSelect = (file: File) => {
  const url = URL.createObjectURL(file)
  setPreviewUrl(url)
}

// Add cleanup effect
useEffect(() => {
  // Cleanup function that runs on unmount or when previewUrl changes
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
    // Cleanup all blob URLs on unmount
    previewUrls.forEach(url => URL.revokeObjectURL(url))
  }
}, [previewUrls])
```

## Implementation Checklist

### Files to Modify

- [ ] `apps/web/app-inspiration-gallery/src/components/UploadModal/index.tsx`
  - Add useEffect cleanup for `previewUrl`
  - Update `handleClose` to revoke URL before resetting state

- [ ] `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/index.tsx`
  - Add useEffect cleanup for `previewUrl` on unmount
  - Existing `handleRemove` cleanup is correct

- [ ] `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`
  - Add useEffect cleanup for all preview URLs
  - Update `removeImage` to revoke specific URL

### Testing Requirements

- [ ] Add unit test for UploadModal verifying cleanup on unmount
- [ ] Add unit test for UploadModal verifying cleanup on file removal
- [ ] Add unit test for ThumbnailUpload verifying cleanup on unmount
- [ ] Add unit test for ImageUploadZone verifying cleanup for multiple URLs
- [ ] Manual testing: Verify no blob URLs remain in memory after operations

### Documentation

- [ ] Add code comment explaining cleanup pattern
- [ ] Update component JSDoc with memory management notes

## Test Plan

### Unit Tests

```typescript
describe('UploadModal cleanup', () => {
  it('should revoke object URL on unmount', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { unmount } = render(<UploadModal {...props} />)

    // Select a file to create blob URL
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Select image file'), {
      target: { files: [file] },
    })

    unmount()

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
  })

  it('should revoke object URL when removing image', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    render(<UploadModal {...props} />)

    // Select and remove file
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Select image file'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByLabelText('Remove image'))

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
  })
})
```

### Manual Testing

1. Open browser DevTools → Memory tab
2. Take heap snapshot
3. Upload image in each affected component
4. Close/unmount component
5. Force garbage collection
6. Take another heap snapshot
7. Compare - verify no retained blob URLs

## Risk Assessment

**Risk Level: Low**

**Risks:**
- Straightforward fix with well-established pattern
- Only affects client-side memory, no data loss risk
- Changes are isolated to specific components

**Mitigation:**
- Pattern already used correctly in ThumbnailUpload `handleRemove`
- Comprehensive unit tests ensure cleanup is called
- Manual memory profiling validates fix

## Dependencies

- None

## Related Issues

- None identified

## References

- [MDN: URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [MDN: URL.revokeObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL)
- React cleanup pattern: [useEffect cleanup function](https://react.dev/reference/react/useEffect#my-effect-runs-after-every-re-render)

## Success Metrics

- All blob URLs properly revoked (verified via DevTools)
- No memory leaks detectable in profiler
- All unit tests passing with cleanup verification
- Code review confirms pattern consistency across all affected components
