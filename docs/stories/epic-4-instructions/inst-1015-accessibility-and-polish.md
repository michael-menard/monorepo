# Story 3.1.46: Accessibility & Polish

## GitHub Issue
- Issue: #269
- URL: https://github.com/michael-menard/monorepo/issues/269
- Status: Todo

## Status

Draft

## Story

**As a** user with accessibility needs,
**I want** the edit experience to be fully accessible,
**so that** I can edit my MOCs using assistive technologies.

## Epic Context

This is **Story 2.8 of Epic 2: Edit UX & Frontend**.

This is the final story in Epic 2 and the final story in the Edit MOC feature.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- All Epic 1 stories (3.1.33-3.1.38)
- All previous Epic 2 stories (3.1.39-3.1.45)

## Acceptance Criteria

1. All form inputs have visible labels and ARIA attributes
2. File management actions keyboard accessible (add, remove, replace)
3. Drag-and-drop has keyboard alternative (arrow keys to reorder)
4. Live announcements for: upload progress, errors, save status
5. Focus management: auto-focus on first field, return focus after modals
6. Color contrast meets WCAG AA
7. Screen reader announces form validation errors

## Tasks / Subtasks

- [ ] **Task 1: Form Labels & ARIA** (AC: 1)
  - [ ] Verify all inputs have associated `<label>` elements
  - [ ] Add `aria-describedby` for fields with help text
  - [ ] Add `aria-invalid` for fields with errors
  - [ ] Add `aria-required` for required fields

- [ ] **Task 2: Keyboard Navigation for Files** (AC: 2)
  - [ ] File cards focusable with Tab
  - [ ] Actions accessible via Enter/Space
  - [ ] Add keyboard shortcuts (Del for remove?)
  - [ ] Visible focus indicators

- [ ] **Task 3: Keyboard Reorder for Images** (AC: 3)
  - [ ] Add "Move Up" / "Move Down" buttons (visible or on focus)
  - [ ] Arrow keys reorder when file focused
  - [ ] Announce new position after move

- [ ] **Task 4: Live Announcements** (AC: 4)
  - [ ] Use `aria-live` regions for dynamic content
  - [ ] Announce upload progress: "Uploading file 2 of 5"
  - [ ] Announce errors: "Upload failed: file too large"
  - [ ] Announce save status: "Changes saved successfully"

- [ ] **Task 5: Focus Management** (AC: 5)
  - [ ] Auto-focus title field on page load
  - [ ] Return focus to trigger after modal close
  - [ ] Focus first error field on validation failure

- [ ] **Task 6: Color Contrast** (AC: 6)
  - [ ] Audit all text/background combinations
  - [ ] Verify 4.5:1 ratio for normal text
  - [ ] Verify 3:1 ratio for large text
  - [ ] Fix any failing contrast

- [ ] **Task 7: Error Announcements** (AC: 7)
  - [ ] Validation errors announced on form submit
  - [ ] Individual field errors announced on blur
  - [ ] Use `role="alert"` for immediate announcements

## Dev Notes

### ARIA Attributes for Form Fields

```typescript
// Enhanced FormField with accessibility
function AccessibleFormField({
  name,
  label,
  helpText,
  required,
  error,
  children,
}: AccessibleFormFieldProps) {
  const inputId = `field-${name}`
  const helpTextId = helpText ? `${inputId}-help` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div>
      <label htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true">*</span>}
        {required && <span className="sr-only">(required)</span>}
      </label>

      {React.cloneElement(children, {
        id: inputId,
        'aria-describedby': [helpTextId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
      })}

      {helpText && (
        <p id={helpTextId} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
```

### Keyboard Accessible File Card

```typescript
function AccessibleFileCard({ file, onRemove, onReplace, onMoveUp, onMoveDown }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        onRemove(file.id)
        break
      case 'ArrowUp':
        if (e.altKey) {
          e.preventDefault()
          onMoveUp(file.id)
        }
        break
      case 'ArrowDown':
        if (e.altKey) {
          e.preventDefault()
          onMoveDown(file.id)
        }
        break
    }
  }

  return (
    <div
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="focus:ring-2 focus:ring-primary focus:outline-none"
    >
      <div className="flex items-center gap-4">
        <FileThumbnail file={file} />
        <div className="flex-1">
          <p>{file.filename}</p>
        </div>

        <div className="flex gap-2" role="group" aria-label={`Actions for ${file.filename}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveUp(file.id)}
            aria-label={`Move ${file.filename} up`}
          >
            <ChevronUpIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveDown(file.id)}
            aria-label={`Move ${file.filename} down`}
          >
            <ChevronDownIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReplace(file.id)}
            aria-label={`Replace ${file.filename}`}
          >
            Replace
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.filename}`}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Live Announcements

```typescript
// apps/web/main-app/src/components/MocEdit/LiveAnnouncer.tsx
import { useLiveAnnounce } from '@/hooks/useLiveAnnounce'

// Usage in save workflow
const { announce } = useLiveAnnounce()

const handleSave = async () => {
  announce('Saving changes...')

  try {
    if (filesToUpload.length > 0) {
      announce(`Uploading ${filesToUpload.length} files`)

      for (let i = 0; i < filesToUpload.length; i++) {
        await uploadFile(filesToUpload[i])
        announce(`Uploaded file ${i + 1} of ${filesToUpload.length}`)
      }
    }

    await finalize()
    announce('Changes saved successfully')

  } catch (error) {
    announce(`Save failed: ${error.message}`, 'assertive')
  }
}
```

### Live Announce Hook

```typescript
// apps/web/main-app/src/hooks/useLiveAnnounce.ts
export const useLiveAnnounce = () => {
  const politeRef = useRef<HTMLDivElement>(null)
  const assertiveRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const ref = priority === 'assertive' ? assertiveRef : politeRef
    if (ref.current) {
      ref.current.textContent = message
    }
  }, [])

  return { announce, politeRef, assertiveRef }
}

// Component to render the live regions
export function LiveRegions({ politeRef, assertiveRef }) {
  return (
    <>
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  )
}
```

### Focus Management

```typescript
// Auto-focus first field on mount
useEffect(() => {
  const firstInput = document.querySelector<HTMLInputElement>('form input, form textarea')
  firstInput?.focus()
}, [])

// Return focus after modal
const handleModalClose = (triggerRef: React.RefObject<HTMLElement>) => {
  triggerRef.current?.focus()
}

// Focus first error on validation
const focusFirstError = (errors: Record<string, string>) => {
  const firstErrorField = Object.keys(errors)[0]
  const input = document.querySelector<HTMLInputElement>(`[name="${firstErrorField}"]`)
  input?.focus()
}
```

### WCAG Contrast Check

```css
/* Ensure these meet WCAG AA standards */
/* Primary text on background: 4.5:1 minimum */
/* Muted text on background: 4.5:1 minimum */
/* Focus rings: 3:1 minimum against background */

.text-foreground { /* Check: #000 on #fff = 21:1 ✓ */ }
.text-muted-foreground { /* Check: #6b7280 on #fff = 4.6:1 ✓ */ }
.text-destructive { /* Check: #dc2626 on #fff = 4.5:1 ✓ */ }
.ring-primary { /* Check: ring color visible against card background */ }
```

## Testing

### Test Location
- `apps/web/main-app/src/components/MocEdit/__tests__/accessibility.test.tsx`
- `apps/web/playwright/features/moc-edit/accessibility.feature`

### Test Requirements
- Unit: All inputs have labels
- Unit: ARIA attributes present
- Unit: Focus returns after modal
- Unit: Live regions populated
- E2E: axe-core accessibility audit passes
- E2E: Keyboard-only navigation complete workflow
- E2E: Screen reader announces all actions
- Manual: VoiceOver/NVDA testing

### Accessibility Testing Tools

```typescript
// Using @axe-core/react for automated testing
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('should have no accessibility violations', async () => {
  const { container } = render(<InstructionsEditPage />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

N/A

### Debug Log References

N/A

### Completion Notes

N/A

### File List

- `apps/web/main-app/src/components/MocEdit/*.tsx` - Modified (accessibility enhancements)
- `apps/web/main-app/src/hooks/useLiveAnnounce.ts` - New
- `apps/web/main-app/src/components/MocEdit/LiveRegions.tsx` - New
- `apps/web/main-app/src/components/MocEdit/__tests__/accessibility.test.tsx` - New
