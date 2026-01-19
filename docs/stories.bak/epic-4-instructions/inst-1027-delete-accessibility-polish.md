# Story 3.1.58: Delete Accessibility & Polish

## GitHub Issue
- Issue: #282
- URL: https://github.com/michael-menard/monorepo/issues/282
- Status: Todo

## Status

Draft

## Story

**As a** user with accessibility needs,
**I want** the delete flow to be fully accessible,
**so that** I can safely delete and restore MOCs using assistive technology.

## Epic Context

This is **Story 2.6 of Epic 2: Delete UX & Frontend** from the Delete MOC Instructions PRD.

This is the final story in the Delete MOC feature. It ensures all delete components meet WCAG AA standards.

## Blocked By

- Story 3.1.54 (Delete Confirmation Modal)
- Story 3.1.55 (Recently Deleted Section)
- Story 3.1.56 (Restore Flow)
- Story 3.1.57 (Deleted MOC Detail View)

## Acceptance Criteria

1. All delete components pass axe-core audit (WCAG AA)
2. Focus trapped in confirmation modal
3. Focus returns to trigger element on modal close
4. Keyboard navigation: Tab, Shift+Tab, Enter, Escape
5. Screen reader announcements for all state changes
6. Color contrast meets 4.5:1 ratio
7. Touch targets minimum 44x44px on mobile

## Tasks / Subtasks

- [ ] **Task 1: Modal Accessibility** (AC: 2, 3, 4)
  - [ ] Verify focus trap in DeleteConfirmationModal
  - [ ] Implement focus return on close
  - [ ] Test Escape key closes modal
  - [ ] Test Tab cycles through modal elements

- [ ] **Task 2: ARIA Attributes** (AC: 5)
  - [ ] Add ARIA labels per table below
  - [ ] Verify `aria-live` regions for dynamic content
  - [ ] Test with VoiceOver/NVDA

- [ ] **Task 3: Color Contrast Audit** (AC: 6)
  - [ ] Audit destructive button colors
  - [ ] Audit warning/critical badge colors
  - [ ] Audit muted deleted content
  - [ ] Fix any contrast issues

- [ ] **Task 4: Touch Targets** (AC: 7)
  - [ ] Verify all buttons ≥44x44px on mobile
  - [ ] Verify checkbox touch target
  - [ ] Test on actual mobile device

- [ ] **Task 5: Axe Audit** (AC: 1)
  - [ ] Run axe-core on DeleteConfirmationModal
  - [ ] Run axe-core on RecentlyDeletedList
  - [ ] Run axe-core on DeletedBanner
  - [ ] Run axe-core on ExpiringBadge
  - [ ] Fix all violations

- [ ] **Task 6: E2E Accessibility Tests** (AC: 1-7)
  - [ ] Add Playwright accessibility tests
  - [ ] Test keyboard-only navigation
  - [ ] Test screen reader flow

## Dev Notes

### ARIA Attributes Table

[Source: PRD delete-moc-instructions.md#Story-2.6]

| Element | ARIA Attribute | Value |
|---------|----------------|-------|
| Delete button | `aria-label` | `"Delete MOC: [title]"` |
| Delete button | `aria-haspopup` | `"dialog"` |
| Confirmation modal | `role` | `"alertdialog"` |
| Confirmation modal | `aria-modal` | `"true"` |
| Confirmation modal | `aria-labelledby` | `"delete-modal-title"` |
| Confirmation modal | `aria-describedby` | `"delete-modal-description"` |
| Confirmation checkbox | `aria-describedby` | `"delete-warning"` |
| Warning box | `id` | `"delete-warning"` |
| Expiring soon badge | `role` | `"status"` |
| Expiring soon badge | `aria-live` | `"polite"` |
| Critical expiring badge | `role` | `"alert"` |
| Critical expiring badge | `aria-live` | `"assertive"` |
| Restore button | `aria-label` | `"Restore MOC: [title]"` |
| Deleted banner | `role` | `"alert"` |
| Deleted banner | `aria-live` | `"polite"` |
| Success toast | `role` | `"status"` |
| Error toast | `role` | `"alert"` |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift+Tab | Move to previous focusable element |
| Enter | Activate focused button/checkbox |
| Space | Toggle checkbox, activate button |
| Escape | Close modal, cancel action |

### Focus Management

```tsx
// Focus trap in modal
import { FocusTrap } from '@radix-ui/react-focus-trap'

// Focus return on close
const triggerRef = useRef<HTMLButtonElement>(null)

const handleClose = () => {
  setOpen(false)
  triggerRef.current?.focus()
}
```

### Axe-Core Integration

```typescript
// In test file
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('should have no accessibility violations', async () => {
  const { container } = render(<DeleteConfirmationModal {...props} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Testing

### Test Location
- `packages/core/app-component-library/src/DeleteConfirmationModal/__tests__/accessibility.test.tsx`
- `apps/web/playwright/tests/delete-accessibility.spec.ts`

### Test Requirements
- Unit: All components pass axe audit
- Unit: Focus trapped in modal
- Unit: Focus returns on close
- E2E: Keyboard-only delete flow works
- E2E: Screen reader announces all states

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-09 | 0.1 | Initial draft from Delete MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

N/A

### Debug Log References

N/A

### Completion Notes

N/A

### File List

- `packages/core/app-component-library/src/DeleteConfirmationModal/index.tsx` - Modified
- `packages/core/app-component-library/src/RecentlyDeletedList/index.tsx` - Modified
- `packages/core/app-component-library/src/DeletedBanner/index.tsx` - Modified
- `packages/core/app-component-library/src/ExpiringBadge/index.tsx` - Modified
- `apps/web/playwright/tests/delete-accessibility.spec.ts` - New

