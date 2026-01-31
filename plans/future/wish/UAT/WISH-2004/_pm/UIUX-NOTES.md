# WISH-2004: Modals & Transitions - UI/UX Notes

## Verdict

**PASS** - Core journey components already implemented with good accessibility patterns.

---

## MVP Component Architecture

### Components Required for Core Journey

| Component | Location | Status |
|-----------|----------|--------|
| DeleteConfirmModal | `apps/web/app-wishlist-gallery/src/components/DeleteConfirmModal/` | Implemented |
| GotItModal | `apps/web/app-wishlist-gallery/src/components/GotItModal/` | Implemented |

### Reuse Targets

| Source | Usage |
|--------|-------|
| `@repo/app-component-library` | AppAlertDialog, AppDialog, Button, Input, Checkbox, LoadingSpinner |
| `sonner` | Toast notifications |
| `lucide-react` | AlertTriangle, CheckCircle, Package, Undo2 icons |

### shadcn Primitives Used

- **AlertDialog** (via `AppAlertDialog*`) - For delete confirmation (destructive action)
- **Dialog** (via `AppDialog*`) - For GotItModal form
- **Button** - Primary and secondary actions
- **Input** - Form fields (price, tax, shipping, date)
- **Checkbox** - "Keep on wishlist" toggle

---

## MVP Accessibility (Blocking Only)

### Focus Management (via Radix primitives)

- **DeleteConfirmModal:**
  - Focus trap during modal open (Radix AlertDialog)
  - Return focus to trigger element on close
  - ESC key closes modal (when not loading)

- **GotItModal:**
  - Focus trap during modal open (Radix Dialog)
  - Return focus to trigger element on close
  - ESC key closes modal (when not loading)
  - Escape prevented during loading state

### Basic Keyboard Navigation

| Key | DeleteConfirmModal | GotItModal |
|-----|-------------------|------------|
| ESC | Close (if not loading) | Close (if not loading) |
| Tab | Navigate Cancel/Delete | Navigate form fields |
| Enter | Activate focused button | Submit form |
| Space | Activate focused button | Toggle checkbox |

### Critical Screen Reader Requirements

- **Status regions:** Loading indicators use `role="status"` with descriptive text
- **Alert regions:** Success/error toasts use `role="alert"` and `aria-live="polite"`
- **Labels:** All form fields have associated `<label>` elements
- **Icons:** Decorative icons have `aria-hidden="true"`

---

## MVP Design System Rules

### Token-Only Colors (ENFORCED)

| Usage | Token | Compliant |
|-------|-------|-----------|
| Delete button | `bg-destructive text-destructive-foreground` | Yes |
| Primary button | default Button styling | Yes |
| Loading spinner | inherited from LoadingSpinner | Yes |
| Muted backgrounds | `bg-muted/50` | Yes |
| Error text | `text-red-500` (needs migration to `text-destructive`) | Review |

### `_primitives` Import Requirement

All components correctly import from `@repo/app-component-library` which wraps shadcn primitives.

---

## MVP Playwright Evidence

### Delete Flow Demo Steps

1. Navigate to `/wishlist`
2. Locate a WishlistCard with title "LEGO Star Wars Millennium Falcon"
3. Click delete icon on card
4. **Assert:** DeleteConfirmModal appears with item preview
5. **Assert:** Modal title is "Delete Item?"
6. **Assert:** Cancel and Delete buttons visible
7. Click "Delete" button
8. **Assert:** Loading state shows "Deleting..."
9. **Assert:** Modal closes on success
10. **Assert:** Item no longer in gallery
11. **Assert:** Toast notification appears

### Purchase Flow Demo Steps

1. Navigate to `/wishlist`
2. Locate a WishlistCard
3. Click "Got It" button on card
4. **Assert:** GotItModal appears with item title
5. **Assert:** Price field pre-filled from wishlist item
6. **Assert:** Quantity defaults to 1
7. **Assert:** Purchase date defaults to today
8. Fill in tax: `64.00`, shipping: `15.00`
9. Click "Add to Collection"
10. **Assert:** Loading state shows progress messages
11. **Assert:** Modal closes on success
12. **Assert:** Success toast with "View in Sets" button
13. **Assert:** Item removed from wishlist gallery

---

## Implementation Notes

### DeleteConfirmModal

**Current implementation (WISH-2041):**
- Uses `AppAlertDialog` (appropriate for destructive confirmation)
- Shows item preview (thumbnail + title + set number + store)
- Destructive styling on confirm button
- Loading state disables all buttons
- Status role on loading indicator

### GotItModal

**Current implementation (WISH-2042):**
- Uses `AppDialog` (appropriate for form modal)
- Pre-fills price from wishlist item
- Form validation with inline error messages
- Quantity stepper with min=1
- Date input with max=today
- "Keep on wishlist" checkbox with description
- Progress messages cycle during loading
- Success toast with custom content (undo + view buttons)

### Toast System

**Current implementation (sonner):**
- Custom toast component for success state
- Error toasts via `toast.error()`
- Info toasts via `toast.info()`
- Position: bottom-right
- Duration: 5 seconds

---

## Migration Recommendations

### Color Token Migration

The following should be migrated in a future polish pass:

```tsx
// Current
className="text-red-500"

// Should be
className="text-destructive"
```

### Undo Feature

The current "Undo" button shows "Coming soon". A dedicated story should implement:
- Soft delete with TTL (5 seconds)
- Backend undo endpoint
- Optimistic UI rollback
