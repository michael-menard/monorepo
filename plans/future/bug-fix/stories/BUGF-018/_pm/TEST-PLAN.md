# Test Plan: BUGF-018

**Story:** Fix Memory Leaks from createObjectURL
**Type:** bug_fix
**Phase:** 3 (Test Coverage & Quality)

---

## Test Strategy

This story requires both **unit tests** to verify cleanup behavior programmatically and **manual memory profiling** to validate that blob URLs are actually released.

---

## Unit Tests

### 1. UploadModal Cleanup Tests

**File:** `apps/web/app-inspiration-gallery/src/components/UploadModal/__tests__/UploadModal.test.tsx`

```typescript
describe('UploadModal - Memory Cleanup', () => {
  it('should revoke object URL on component unmount', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { unmount } = render(<UploadModal {...defaultProps} />)

    // Select a file to create blob URL
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Select image file'), {
      target: { files: [file] },
    })

    unmount()

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    revokeObjectURLSpy.mockRestore()
  })

  it('should revoke object URL when removing image', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    render(<UploadModal {...defaultProps} />)

    // Select and remove file
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Select image file'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByLabelText('Remove image'))

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    revokeObjectURLSpy.mockRestore()
  })

  it('should revoke old URL when replacing with new file', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    render(<UploadModal {...defaultProps} />)

    const file1 = new File(['test1'], 'test1.png', { type: 'image/png' })
    const file2 = new File(['test2'], 'test2.png', { type: 'image/png' })

    // Select first file
    fireEvent.change(screen.getByLabelText('Select image file'), {
      target: { files: [file1] },
    })

    // Replace with second file
    fireEvent.change(screen.getByLabelText('Select image file'), {
      target: { files: [file2] },
    })

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1) // Called once for old URL
    revokeObjectURLSpy.mockRestore()
  })
})
```

### 2. ThumbnailUpload Cleanup Tests

**File:** `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__tests__/ThumbnailUpload.test.tsx`

```typescript
describe('ThumbnailUpload - Memory Cleanup', () => {
  it('should revoke object URL on component unmount', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { unmount } = render(<ThumbnailUpload {...defaultProps} />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/upload/i), {
      target: { files: [file] },
    })

    unmount()

    expect(revokeObjectURLSpy).toHaveBeenCalled()
    revokeObjectURLSpy.mockRestore()
  })

  it('should verify existing handleRemove cleanup still works', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    render(<ThumbnailUpload {...defaultProps} />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/upload/i), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByLabelText(/remove/i))

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    revokeObjectURLSpy.mockRestore()
  })
})
```

### 3. ImageUploadZone Cleanup Tests

**File:** `apps/web/app-sets-gallery/src/components/ImageUploadZone/__tests__/ImageUploadZone.test.tsx`

```typescript
describe('ImageUploadZone - Memory Cleanup', () => {
  it('should revoke all object URLs on component unmount', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { unmount } = render(<ImageUploadZone {...defaultProps} />)

    const files = [
      new File(['test1'], 'test1.png', { type: 'image/png' }),
      new File(['test2'], 'test2.png', { type: 'image/png' }),
      new File(['test3'], 'test3.png', { type: 'image/png' }),
    ]

    fireEvent.change(screen.getByLabelText(/upload/i), {
      target: { files },
    })

    unmount()

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(3) // Once per file
    revokeObjectURLSpy.mockRestore()
  })

  it('should revoke URL when removing individual image', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    render(<ImageUploadZone {...defaultProps} />)

    const files = [
      new File(['test1'], 'test1.png', { type: 'image/png' }),
      new File(['test2'], 'test2.png', { type: 'image/png' }),
    ]

    fireEvent.change(screen.getByLabelText(/upload/i), {
      target: { files },
    })

    const removeButtons = screen.getAllByLabelText(/remove/i)
    fireEvent.click(removeButtons[0])

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    revokeObjectURLSpy.mockRestore()
  })
})
```

---

## Manual Memory Profiling

**Goal:** Verify no blob URLs remain in memory after component unmount.

### Steps

1. Open browser DevTools → Memory tab
2. Take baseline heap snapshot
3. Navigate to affected component (UploadModal, ThumbnailUpload, or ImageUploadZone)
4. Upload an image file to create blob URL
5. Close/unmount the component
6. Click "Collect garbage" button in Memory tab
7. Take another heap snapshot
8. Compare snapshots:
   - Filter by "blob:" prefix
   - Verify all blob URLs from step 4 have been released
   - Check for retained objects referencing old blob URLs

### Expected Results

- No blob URLs matching the pattern from step 4 appear in the second snapshot
- Memory usage returns to baseline levels
- No detached DOM nodes holding blob URL references

---

## Test Coverage Goals

- **UploadModal:** 3 new tests (unmount, remove, replace)
- **ThumbnailUpload:** 2 new tests (unmount, verify existing handleRemove)
- **ImageUploadZone:** 2 new tests (unmount multiple, remove individual)

**Total:** 7 new unit tests + manual memory profiling validation

---

## Acceptance Criteria Mapping

| AC | Test Coverage |
|----|---------------|
| AC1 | All 7 unit tests verify useEffect cleanup present |
| AC2 | All 7 unit tests verify URL.revokeObjectURL is called |
| AC3 | Unit tests cover unmount, removal, replacement scenarios |
| AC4 | Manual memory profiling steps validate no leaks |
| AC5 | 7 unit tests added with vi.spyOn verification |

---

## Notes

- Use `vi.spyOn(URL, 'revokeObjectURL')` to verify cleanup is called
- Always restore spies with `.mockRestore()` after tests
- ThumbnailUpload already has cleanup in `handleRemove` - add unmount test
- ImageUploadZone handles multiple URLs - test batch cleanup on unmount
