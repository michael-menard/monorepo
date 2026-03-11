# REPA-008: Add Gallery Keyboard Hooks - Story Seed

**Story ID:** REPA-008
**Status:** pending
**Epic:** REPACK - App Consolidation & Repackaging
**Phase:** Phase 2 - Gallery Enhancement
**Dependencies:** None
**Priority:** P1 - High
**Estimate:** 2 story points

---

## Overview

Extract and standardize keyboard navigation hooks for galleries. Currently, both `app-wishlist-gallery` and `app-inspiration-gallery` maintain duplicate implementations of keyboard navigation hooks (`useRovingTabIndex`, `useAnnouncer`) and divergent implementations of keyboard shortcuts (`useKeyboardShortcuts` vs `useGalleryKeyboard`). This story consolidates these hooks into shared packages to establish a single source of truth for keyboard accessibility across all gallery apps.

## Goal

Shared keyboard navigation hooks for all gallery apps, eliminating duplication and providing a consistent keyboard accessibility experience.

---

## Current State Analysis

### Duplicate Implementations

#### 1. useRovingTabIndex Hook (EXACT DUPLICATE)

**Locations:**
- `/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/hooks/useRovingTabIndex.ts` (363 lines)
- `/Users/michaelmenard/Development/monorepo/apps/web/app-inspiration-gallery/src/hooks/useRovingTabIndex.ts` (325 lines)

**Key Features:**
- Implements WAI-ARIA roving tabindex pattern for 2D grid keyboard navigation
- Only one item has `tabIndex="0"` at a time (single Tab stop entry)
- Arrow key navigation (Up/Down/Left/Right) within grid
- Home/End key support
- Automatic column detection via ResizeObserver
- Manual column configuration option
- Horizontal wrapping (default: true)
- Vertical wrapping (default: false)
- Bounds checking when item count changes
- Returns container props and item props for easy integration

**Differences:**
- Line 332 (wishlist): `'aria-label': 'Wishlist items'`
- Line 294 (inspiration): `'aria-label': 'Inspiration items'`
- Otherwise IDENTICAL implementation

**Usage Pattern:**
```typescript
const { activeIndex, getItemProps, containerProps } = useRovingTabIndex(
  items.length,
  containerRef,
  { columns: 3 }
)

<div ref={containerRef} {...containerProps}>
  {items.map((item, index) => (
    <div {...getItemProps(index)}>
      {item.name}
    </div>
  ))}
</div>
```

**Test Coverage:**
- Full test suite exists in wishlist gallery: `__tests__/useRovingTabIndex.test.tsx`
- Tests cover tabIndex management, arrow navigation, wrapping behavior

---

#### 2. useAnnouncer Hook (EXACT DUPLICATE)

**Locations:**
- `/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/hooks/useAnnouncer.tsx` (180 lines)
- `/Users/michaelmenard/Development/monorepo/apps/web/app-inspiration-gallery/src/hooks/useAnnouncer.tsx` (154 lines)

**Key Features:**
- Manages screen reader live region for dynamic announcements
- Supports 'polite' and 'assertive' priority levels
- Auto-clear mechanism with configurable delay (default: 100ms)
- Prevents duplicate announcements via RAF + clear cycle
- Provides both hook and component (`Announcer`)
- Cleanup on unmount

**Differences:**
- Wishlist version has more detailed JSDoc comments
- Otherwise FUNCTIONALLY IDENTICAL

**Usage Pattern:**
```typescript
const { announcement, priority, announce } = useAnnouncer()

// In component
<Announcer announcement={announcement} priority={priority} />

// To announce
announce('Item added to wishlist.')
announce('Error occurred!', 'assertive')
```

**Test Coverage:**
- Full test suite exists in wishlist gallery: `__tests__/useAnnouncer.test.tsx`

---

### Divergent Implementations

#### 3. useKeyboardShortcuts vs useGalleryKeyboard

**Wishlist Implementation: useKeyboardShortcuts**
- Location: `/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts` (212 lines)
- **Architecture:** Generic, reusable shortcut manager
- **Scoping:** Container-based (only triggers within container element)
- **Configuration:** Array of shortcut objects with key/handler/description/disabled
- **Key Features:**
  - Ignores shortcuts when focus is in INPUT/TEXTAREA/contentEditable
  - Case-insensitive letter keys
  - Key normalization (Backspace → Delete, Esc → Escape, Space handling)
  - Configurable preventDefault and stopPropagation
  - Enable/disable all shortcuts
  - Helper function `getShortcutHints()` for generating help text
  - Container-scoped event listener

**Example Usage:**
```typescript
useKeyboardShortcuts(
  [
    { key: 'a', handler: openAddModal, description: 'Add item' },
    { key: 'g', handler: openGotItModal, description: 'Got it' },
    { key: 'Delete', handler: openDeleteModal, description: 'Delete' },
    { key: 'Enter', handler: openDetailView, description: 'View details' },
    { key: 'Escape', handler: closeModal, description: 'Close' },
  ],
  containerRef,
  { enabled: !modalOpen }
)
```

**Inspiration Implementation: useGalleryKeyboard**
- Location: `/Users/michaelmenard/Development/monorepo/apps/web/app-inspiration-gallery/src/hooks/useGalleryKeyboard.ts` (186 lines)
- **Architecture:** Gallery-specific with predefined shortcuts
- **Scoping:** Document-level or container-based
- **Configuration:** Options object with handler callbacks
- **Key Features:**
  - Fixed set of gallery shortcuts (Escape, Delete, Enter, Ctrl+A, etc.)
  - Action-specific shortcuts (a, m, e, u, n)
  - Modifier key support (Ctrl/Cmd)
  - Returns shortcuts array for display
  - Optional container-based scoping
  - Ignores shortcuts in input elements

**Example Usage:**
```typescript
const { shortcuts } = useGalleryKeyboard({
  enabled: true,
  onEscape: clearSelection,
  onDelete: deleteSelected,
  onEnter: openSelected,
  onSelectAll: selectAll,
  onAddToAlbum: addToAlbum,
  onLinkToMoc: linkToMoc,
  onEdit: editSelected,
  onUpload: uploadNew,
  onNewAlbum: newAlbum,
  containerRef,
})
```

**Key Differences:**
| Feature | useKeyboardShortcuts | useGalleryKeyboard |
|---------|---------------------|-------------------|
| Flexibility | Generic, any shortcuts | Fixed gallery shortcuts |
| Configuration | Array of shortcuts | Options with callbacks |
| Scoping | Container-only | Document or container |
| Modifier keys | No built-in support | Ctrl/Cmd built-in |
| Help text | `getShortcutHints()` helper | Returns shortcuts array |
| Best for | Reusable across contexts | Gallery-specific apps |

---

## Proposed Solution

### Package Structure

#### 1. Move useRovingTabIndex to @repo/gallery

**Target Location:** `packages/core/gallery/src/hooks/useRovingTabIndex.ts`

**Rationale:**
- Core gallery navigation primitive
- Already has existing hooks directory with gallery-specific hooks
- Used by both gallery apps for grid navigation

**Changes Required:**
- Accept `ariaLabel` as an optional parameter (instead of hardcoding)
- Add default: `'Gallery items'`
- Move tests to `packages/core/gallery/src/hooks/__tests__/useRovingTabIndex.test.ts`
- Export from `packages/core/gallery/src/index.ts`

**Updated API:**
```typescript
export function useRovingTabIndex(
  itemCount: number,
  containerRef: React.RefObject<HTMLElement | null>,
  options: Partial<RovingTabIndexOptions> = {},
): UseRovingTabIndexReturn

// Options now include:
export const RovingTabIndexOptionsSchema = z.object({
  columns: z.number().positive().optional(),
  wrapHorizontal: z.boolean().optional().default(true),
  wrapVertical: z.boolean().optional().default(false),
  initialIndex: z.number().nonnegative().optional().default(0),
  ariaLabel: z.string().optional().default('Gallery items'), // NEW
})
```

---

#### 2. Move useAnnouncer to @repo/accessibility

**Target Location:** `packages/core/accessibility/src/hooks/useAnnouncer.tsx`

**Rationale:**
- General accessibility utility, not gallery-specific
- Follows existing package structure (accessibility already has hooks directory)
- Can be reused across any app needing screen reader announcements
- Part of broader accessibility toolkit

**Changes Required:**
- Move hook and component to accessibility package
- Move tests to `packages/core/accessibility/src/hooks/__tests__/useAnnouncer.test.tsx`
- Export from `packages/core/accessibility/src/index.ts`
- No API changes needed (already generic)

---

#### 3. Create useGalleryKeyboard in @repo/gallery

**Target Location:** `packages/core/gallery/src/hooks/useGalleryKeyboard.ts`

**Rationale:**
- Combines best of both implementations
- Provides opinionated gallery-specific shortcuts
- Built on top of generic `useKeyboardShortcuts` primitive

**Design Approach:**
Create TWO hooks:

**a) useKeyboardShortcuts (Generic Primitive)**
- Move wishlist's `useKeyboardShortcuts` to `@repo/gallery/hooks/useKeyboardShortcuts.ts`
- Keep generic, reusable architecture
- Export for advanced use cases

**b) useGalleryKeyboard (Opinionated Wrapper)**
- Create new implementation combining inspiration's action-specific shortcuts
- Built on top of `useKeyboardShortcuts`
- Provides gallery-standard shortcuts with sensible defaults
- Easier API for common gallery scenarios

**New API Design:**
```typescript
// Generic primitive (from wishlist)
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  containerRef: React.RefObject<HTMLElement | null>,
  options?: Partial<KeyboardShortcutsOptions>
): void

// Gallery-specific wrapper (inspired by inspiration)
export function useGalleryKeyboard(
  options: UseGalleryKeyboardOptions
): UseGalleryKeyboardReturn

export interface UseGalleryKeyboardOptions {
  enabled?: boolean
  containerRef?: React.RefObject<HTMLElement | null>

  // Navigation shortcuts
  onEscape?: () => void
  onEnter?: () => void

  // Selection shortcuts
  onSelectAll?: () => void

  // Action shortcuts (customizable)
  actions?: Array<{
    key: string
    handler: () => void
    description: string
    requiresModifier?: boolean
  }>

  // Built-in action overrides
  onDelete?: () => void
  onAddToAlbum?: () => void
  onLinkToMoc?: () => void
  onEdit?: () => void
  onUpload?: () => void
  onNewAlbum?: () => void
}

export interface UseGalleryKeyboardReturn {
  shortcuts: Array<{
    key: string
    description: string
    modifier?: string
  }>
}
```

**Implementation Strategy:**
```typescript
export function useGalleryKeyboard(
  options: UseGalleryKeyboardOptions
): UseGalleryKeyboardReturn {
  const {
    enabled = true,
    containerRef,
    onEscape,
    onEnter,
    onSelectAll,
    onDelete,
    onAddToAlbum,
    onLinkToMoc,
    onEdit,
    onUpload,
    onNewAlbum,
    actions = [],
  } = options

  // Build shortcuts array from options
  const shortcuts: KeyboardShortcut[] = []

  if (onEscape) {
    shortcuts.push({ key: 'Escape', handler: onEscape, description: 'Clear selection' })
  }

  if (onDelete) {
    shortcuts.push({ key: 'Delete', handler: onDelete, description: 'Delete selected' })
  }

  if (onEnter) {
    shortcuts.push({ key: 'Enter', handler: onEnter, description: 'Open selected' })
  }

  if (onSelectAll) {
    // Handle Ctrl/Cmd+A manually in handler
    const selectAllHandler = (event: KeyboardEvent) => {
      if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        onSelectAll()
      }
    }
    // Register via useKeyboardShortcuts
  }

  // Add custom actions
  actions.forEach(action => {
    shortcuts.push({
      key: action.key,
      handler: action.handler,
      description: action.description,
    })
  })

  // Add gallery-standard action shortcuts
  if (onAddToAlbum) {
    shortcuts.push({ key: 'a', handler: onAddToAlbum, description: 'Add to album' })
  }

  if (onLinkToMoc) {
    shortcuts.push({ key: 'm', handler: onLinkToMoc, description: 'Link to MOC' })
  }

  if (onEdit) {
    shortcuts.push({ key: 'e', handler: onEdit, description: 'Edit selected' })
  }

  if (onUpload) {
    shortcuts.push({ key: 'u', handler: onUpload, description: 'Upload new' })
  }

  if (onNewAlbum) {
    shortcuts.push({ key: 'n', handler: onNewAlbum, description: 'New album' })
  }

  // Use generic useKeyboardShortcuts
  useKeyboardShortcuts(shortcuts, containerRef, { enabled })

  // Return shortcuts for help UI
  return {
    shortcuts: getShortcutHints(shortcuts).split(', ').map(hint => {
      const [key, description] = hint.split(': ')
      return { key, description }
    }),
  }
}
```

---

#### 4. Create useGallerySelection (NEW)

**Target Location:** `packages/core/gallery/src/hooks/useGallerySelection.ts`

**Rationale:**
- Both gallery apps have multi-select functionality
- Currently implemented inline in components
- Should be reusable hook for consistency

**API Design:**
```typescript
export interface UseGallerySelectionOptions {
  items: string[] // Array of item IDs
  multiSelect?: boolean // Default: true
  initialSelection?: string[]
}

export interface UseGallerySelectionReturn {
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  toggleSelection: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  selectRange: (fromId: string, toId: string) => void // Shift+click support
  selectedCount: number
  hasSelection: boolean
}

export function useGallerySelection(
  options: UseGallerySelectionOptions
): UseGallerySelectionReturn
```

**Features:**
- Single/multi-select support
- Shift+click range selection
- Ctrl/Cmd+click toggle selection
- Select all / clear all
- Works with roving tabindex

---

### Migration Path

#### Phase 1: Move Core Hooks (NO BREAKING CHANGES)

1. Move `useRovingTabIndex` to `@repo/gallery`
   - Add `ariaLabel` option
   - Keep default behavior
   - Export from package index

2. Move `useAnnouncer` to `@repo/accessibility`
   - No changes needed
   - Export from package index

3. Move `useKeyboardShortcuts` to `@repo/gallery`
   - No changes needed
   - Export from package index

#### Phase 2: Create New Hooks

4. Create `useGalleryKeyboard` in `@repo/gallery`
   - Built on `useKeyboardShortcuts`
   - Gallery-specific shortcuts
   - Add tests

5. Create `useGallerySelection` in `@repo/gallery`
   - Multi-select logic
   - Range selection
   - Add tests

#### Phase 3: Update Apps

6. Update `app-wishlist-gallery` imports:
   ```typescript
   // OLD
   import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
   import { useAnnouncer } from '../../hooks/useAnnouncer'
   import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

   // NEW
   import { useRovingTabIndex, useKeyboardShortcuts } from '@repo/gallery'
   import { useAnnouncer } from '@repo/accessibility'
   ```

7. Update `app-inspiration-gallery` imports:
   ```typescript
   // OLD
   import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
   import { useAnnouncer } from '../../hooks/useAnnouncer'
   import { useGalleryKeyboard } from '../../hooks/useGalleryKeyboard'

   // NEW
   import { useRovingTabIndex, useGalleryKeyboard } from '@repo/gallery'
   import { useAnnouncer } from '@repo/accessibility'
   ```

8. (Optional) Refactor inspiration gallery to use new `useGalleryKeyboard`

#### Phase 4: Cleanup

9. Delete duplicate hook files from both apps
10. Delete old test files from apps (tests moved to packages)

---

## Implementation Tasks

### Task 1: Move useRovingTabIndex to @repo/gallery

**Files:**
- Create: `packages/core/gallery/src/hooks/useRovingTabIndex.ts`
- Create: `packages/core/gallery/src/hooks/__tests__/useRovingTabIndex.test.ts`
- Update: `packages/core/gallery/src/index.ts` (add export)

**Changes:**
- Copy implementation from wishlist (most comprehensive docs)
- Add `ariaLabel` option to `RovingTabIndexOptionsSchema`
- Update `containerProps` to use `ariaLabel` from options
- Move tests from wishlist
- Update test imports

**Verification:**
- Run tests: `pnpm test packages/core/gallery`
- Build package: `pnpm build --filter=@repo/gallery`

---

### Task 2: Move useAnnouncer to @repo/accessibility

**Files:**
- Create: `packages/core/accessibility/src/hooks/useAnnouncer.tsx`
- Create: `packages/core/accessibility/src/hooks/__tests__/useAnnouncer.test.tsx`
- Update: `packages/core/accessibility/src/index.ts` (add export)

**Changes:**
- Copy implementation from wishlist (better docs)
- Move tests from wishlist
- Update test imports
- Export both hook and component

**Verification:**
- Run tests: `pnpm test packages/core/accessibility`
- Build package: `pnpm build --filter=@repo/accessibility`

---

### Task 3: Move useKeyboardShortcuts to @repo/gallery

**Files:**
- Create: `packages/core/gallery/src/hooks/useKeyboardShortcuts.ts`
- Create: `packages/core/gallery/src/hooks/__tests__/useKeyboardShortcuts.test.ts`
- Update: `packages/core/gallery/src/index.ts` (add export)

**Changes:**
- Copy implementation from wishlist (no changes)
- Move tests from wishlist
- Update test imports
- Export hook and helper function

**Verification:**
- Run tests: `pnpm test packages/core/gallery`
- Build package: `pnpm build --filter=@repo/gallery`

---

### Task 4: Create useGalleryKeyboard

**Files:**
- Create: `packages/core/gallery/src/hooks/useGalleryKeyboard.ts`
- Create: `packages/core/gallery/src/hooks/__tests__/useGalleryKeyboard.test.ts`
- Update: `packages/core/gallery/src/index.ts` (add export)

**Changes:**
- Implement new hook built on `useKeyboardShortcuts`
- Support modifier keys (Ctrl/Cmd+A for select all)
- Return shortcuts array for help UI
- Add comprehensive tests

**Test Coverage:**
- Basic shortcuts work
- Modifier key shortcuts work
- Container scoping works
- Enable/disable works
- Shortcuts array returned correctly

**Verification:**
- Run tests: `pnpm test packages/core/gallery`
- Build package: `pnpm build --filter=@repo/gallery`

---

### Task 5: Create useGallerySelection

**Files:**
- Create: `packages/core/gallery/src/hooks/useGallerySelection.ts`
- Create: `packages/core/gallery/src/hooks/__tests__/useGallerySelection.test.ts`
- Update: `packages/core/gallery/src/index.ts` (add export)

**Changes:**
- Implement multi-select logic
- Support single/multi mode
- Support range selection (Shift+click)
- Support toggle selection (Ctrl/Cmd+click)
- Add select all / clear all
- Add comprehensive tests

**Test Coverage:**
- Single select mode
- Multi select mode
- Select all / clear all
- Range selection
- Toggle selection
- Selected count tracking

**Verification:**
- Run tests: `pnpm test packages/core/gallery`
- Build package: `pnpm build --filter=@repo/gallery`

---

### Task 6: Update app-wishlist-gallery imports

**Files to Update:**
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
- Any other files using these hooks

**Changes:**
- Update imports to use `@repo/gallery` and `@repo/accessibility`
- Add `ariaLabel: 'Wishlist items'` to `useRovingTabIndex` options
- Verify functionality

**Verification:**
- Run app: `pnpm dev --filter=app-wishlist-gallery`
- Test keyboard navigation
- Test screen reader announcements
- Run app tests: `pnpm test --filter=app-wishlist-gallery`

---

### Task 7: Update app-inspiration-gallery imports

**Files to Update:**
- `apps/web/app-inspiration-gallery/src/components/DraggableInspirationGallery/index.tsx`
- `apps/web/app-inspiration-gallery/src/pages/main-page.tsx`
- `apps/web/app-inspiration-gallery/src/hooks/index.ts` (remove old exports)
- Any other files using these hooks

**Changes:**
- Update imports to use `@repo/gallery` and `@repo/accessibility`
- Add `ariaLabel: 'Inspiration items'` to `useRovingTabIndex` options
- Consider refactoring to use new `useGalleryKeyboard` (optional)
- Verify functionality

**Verification:**
- Run app: `pnpm dev --filter=app-inspiration-gallery`
- Test keyboard navigation
- Test screen reader announcements
- Run app tests: `pnpm test --filter=app-inspiration-gallery`

---

### Task 8: Delete old hook files

**Files to Delete (wishlist):**
- `apps/web/app-wishlist-gallery/src/hooks/useRovingTabIndex.ts`
- `apps/web/app-wishlist-gallery/src/hooks/useAnnouncer.tsx`
- `apps/web/app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts`
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useRovingTabIndex.test.tsx`
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useAnnouncer.test.tsx`
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useKeyboardShortcuts.test.tsx`

**Files to Delete (inspiration):**
- `apps/web/app-inspiration-gallery/src/hooks/useRovingTabIndex.ts`
- `apps/web/app-inspiration-gallery/src/hooks/useAnnouncer.tsx`
- `apps/web/app-inspiration-gallery/src/hooks/useGalleryKeyboard.ts`
- `apps/web/app-inspiration-gallery/src/hooks/__tests__/useGalleryKeyboard.test.ts`

**Verification:**
- Ensure no imports reference deleted files
- Run full test suite: `pnpm test`
- Run full build: `pnpm build`

---

### Task 9: Update package dependencies

**Update package.json files:**

`packages/core/gallery/package.json`:
```json
{
  "dependencies": {
    // ... existing deps ...
    "@repo/accessibility": "workspace:*"  // NEW (for useAnnouncer if needed)
  }
}
```

No other dependency changes needed (React already in both packages).

**Verification:**
- Run `pnpm install` to update lockfile
- Verify no circular dependencies
- Build all packages: `pnpm build`

---

### Task 10: Documentation

**Files to Create/Update:**
- Create: `packages/core/gallery/src/hooks/README.md` - Document all gallery hooks
- Create: `packages/core/accessibility/src/hooks/README.md` - Document accessibility hooks
- Update: `packages/core/gallery/README.md` - Add hooks section
- Update: `packages/core/accessibility/README.md` - Add hooks section

**Documentation Should Include:**
- Hook purpose and use cases
- API reference (parameters, return values)
- Usage examples
- Migration guide (from app-specific implementations)
- Accessibility considerations
- Common patterns

---

## Acceptance Criteria

### Functional Requirements

- [ ] `useRovingTabIndex` exists in `@repo/gallery/hooks`
  - [ ] Accepts `ariaLabel` option
  - [ ] Works with automatic column detection
  - [ ] Works with manual column configuration
  - [ ] Supports horizontal/vertical wrapping
  - [ ] All tests pass

- [ ] `useAnnouncer` exists in `@repo/accessibility/hooks`
  - [ ] Provides hook and component
  - [ ] Supports polite/assertive priorities
  - [ ] Prevents duplicate announcements
  - [ ] All tests pass

- [ ] `useKeyboardShortcuts` exists in `@repo/gallery/hooks`
  - [ ] Container-scoped shortcuts
  - [ ] Ignores input elements
  - [ ] Configurable preventDefault/stopPropagation
  - [ ] Helper function for shortcut hints
  - [ ] All tests pass

- [ ] `useGalleryKeyboard` exists in `@repo/gallery/hooks`
  - [ ] Built on `useKeyboardShortcuts`
  - [ ] Supports standard gallery shortcuts
  - [ ] Supports modifier keys (Ctrl/Cmd)
  - [ ] Returns shortcuts array
  - [ ] All tests pass

- [ ] `useGallerySelection` exists in `@repo/gallery/hooks`
  - [ ] Single/multi-select modes
  - [ ] Range selection support
  - [ ] Select all / clear all
  - [ ] All tests pass

### Integration Requirements

- [ ] `app-wishlist-gallery` uses shared hooks
  - [ ] Imports from `@repo/gallery` and `@repo/accessibility`
  - [ ] Keyboard navigation works correctly
  - [ ] Screen reader announcements work
  - [ ] All app tests pass

- [ ] `app-inspiration-gallery` uses shared hooks
  - [ ] Imports from `@repo/gallery` and `@repo/accessibility`
  - [ ] Keyboard navigation works correctly
  - [ ] Screen reader announcements work
  - [ ] All app tests pass

### Cleanup Requirements

- [ ] No duplicate hook files in app directories
- [ ] No duplicate test files in app directories
- [ ] All imports updated to shared packages
- [ ] Package dependencies correct
- [ ] No circular dependencies

### Quality Requirements

- [ ] All tests pass: `pnpm test`
- [ ] All packages build: `pnpm build`
- [ ] No TypeScript errors: `pnpm check-types:all`
- [ ] No linting errors: `pnpm lint:all`
- [ ] Test coverage maintained (minimum 45%)

### Documentation Requirements

- [ ] Hook documentation created
- [ ] API reference complete
- [ ] Usage examples provided
- [ ] Migration guide written
- [ ] Package READMEs updated

---

## Testing Strategy

### Unit Tests (Hooks)

**useRovingTabIndex:**
- tabIndex management (0 for active, -1 for others)
- Arrow key navigation (up, down, left, right)
- Home/End keys
- Wrapping behavior (horizontal/vertical)
- Column detection
- Bounds checking on item count changes
- Container/item props generation

**useAnnouncer:**
- Announcement state updates
- Priority levels (polite/assertive)
- Clear delay mechanism
- Duplicate announcement prevention
- Cleanup on unmount
- Component rendering

**useKeyboardShortcuts:**
- Shortcut registration and triggering
- Case-insensitive letter keys
- Special key handling (Delete, Escape, Enter)
- Input element filtering
- Container scoping
- Enable/disable
- preventDefault/stopPropagation

**useGalleryKeyboard:**
- Standard shortcut registration
- Modifier key support
- Callback triggering
- Shortcuts array generation
- Container scoping
- Enable/disable

**useGallerySelection:**
- Single select mode
- Multi select mode
- Toggle selection
- Select all / clear all
- Range selection
- Selected count tracking

### Integration Tests (Apps)

**app-wishlist-gallery:**
- Keyboard navigation in gallery grid
- Screen reader announcements on actions
- Keyboard shortcuts (A, G, Delete, Enter, Escape)
- Multi-select with keyboard

**app-inspiration-gallery:**
- Keyboard navigation in gallery grid
- Screen reader announcements on actions
- Keyboard shortcuts (Ctrl+A, Delete, Enter, etc.)
- Multi-select with keyboard

### E2E Tests (Playwright)

Consider adding E2E tests for:
- Full keyboard navigation flow
- Multi-select + keyboard shortcuts
- Screen reader announcements (via aria-live)

---

## Technical Considerations

### Breaking Changes

**None.** This is a pure consolidation with backward-compatible APIs.

### Performance

- No performance impact (same implementations)
- Potential slight improvement from shared bundle code

### Accessibility

- WCAG 2.1 compliant keyboard navigation
- Screen reader support via aria-live regions
- Roving tabindex pattern (single Tab stop)

### Browser Compatibility

- All hooks work in React 19+ environments
- ResizeObserver used (supported in all modern browsers)
- No IE11 support needed

### Dependencies

**New Dependencies Added:**
- None (all dependencies already exist in respective packages)

**Dependency Relationships:**
- `@repo/gallery` may optionally depend on `@repo/accessibility` (for useAnnouncer convenience export)
- No circular dependencies

---

## Risk Assessment

### Low Risk Items

- Moving hooks to shared packages (well-tested code)
- Updating imports (straightforward refactor)
- Hook APIs are stable and proven

### Medium Risk Items

- Creating new `useGalleryKeyboard` (new implementation)
  - **Mitigation:** Build on proven `useKeyboardShortcuts` base
  - **Mitigation:** Comprehensive tests
  - **Mitigation:** Optional adoption (apps can keep current implementations)

- Creating new `useGallerySelection` (new hook)
  - **Mitigation:** Based on existing multi-select implementations
  - **Mitigation:** Comprehensive tests
  - **Mitigation:** Optional for this story (can defer to REPA-009)

### High Risk Items

- None identified

---

## Future Enhancements (Out of Scope)

### REPA-009: Gallery Selection Enhancements
- Visual selection states
- Bulk action bar integration
- Keyboard shortcuts for bulk actions
- Selection persistence

### REPA-010: Advanced Keyboard Navigation
- Focus trap utilities
- Modal keyboard management
- Focus restoration
- Skip links

### REPA-011: Keyboard Shortcuts Help Panel
- Display all active shortcuts
- Searchable shortcut list
- Keyboard shortcut customization
- Conflict detection

---

## References

### Related Stories
- WISH-2006: Wishlist Accessibility (original implementation)
- INSP-019: Inspiration Keyboard Navigation & A11y
- REPACK-201: Add SortableGallery Component (depends on these hooks)
- REPACK-203: Enhance GalleryCard with Selection & Drag

### Standards
- [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WAI-ARIA Live Regions](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19)
- [WCAG 2.1 Keyboard Accessible](https://www.w3.org/WAI/WCAG21/quickref/#keyboard-accessible)

### Existing Implementations
- `app-wishlist-gallery/src/hooks/useRovingTabIndex.ts`
- `app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts`
- `app-wishlist-gallery/src/hooks/useAnnouncer.tsx`
- `app-inspiration-gallery/src/hooks/useRovingTabIndex.ts`
- `app-inspiration-gallery/src/hooks/useGalleryKeyboard.ts`
- `app-inspiration-gallery/src/hooks/useAnnouncer.tsx`

---

## Story Metadata

**Created:** 2026-02-10
**Author:** Claude (PM Story Seed Agent)
**Epic:** REPACK - App Consolidation & Repackaging
**Phase:** Phase 2 - Gallery Enhancement
**Package Scope:** `@repo/gallery`, `@repo/accessibility`
**App Scope:** `app-wishlist-gallery`, `app-inspiration-gallery`

---

## Next Steps

1. Review story seed with team
2. Validate technical approach
3. Approve for elaboration phase
4. Create detailed implementation tasks
5. Assign to developer
6. Begin implementation

---

## Open Questions

1. Should `useGallerySelection` be included in this story or deferred to REPA-009?
   - **Recommendation:** Include basic implementation, defer enhancements

2. Should `@repo/gallery` re-export `useAnnouncer` for convenience?
   - **Recommendation:** No, keep separation of concerns. Apps import from `@repo/accessibility`

3. Should we deprecate the old `useGalleryKeyboard` or keep both?
   - **Recommendation:** Keep both initially, deprecate after apps migrate

4. Do we need a migration script for automated refactoring?
   - **Recommendation:** No, manual migration is straightforward (few files)

---

## Appendix A: File Size Analysis

| File | Lines | Package | Status |
|------|-------|---------|--------|
| `useRovingTabIndex.ts` (wishlist) | 363 | @repo/gallery | Move |
| `useRovingTabIndex.ts` (inspiration) | 325 | @repo/gallery | DELETE |
| `useKeyboardShortcuts.ts` | 212 | @repo/gallery | Move |
| `useGalleryKeyboard.ts` | 186 | @repo/gallery | Refactor or Keep |
| `useAnnouncer.tsx` (wishlist) | 180 | @repo/accessibility | Move |
| `useAnnouncer.tsx` (inspiration) | 154 | @repo/accessibility | DELETE |
| `useGallerySelection.ts` | NEW | @repo/gallery | Create |

**Total Lines to Consolidate:** ~1,420 lines
**Total Lines After Consolidation:** ~950 lines (33% reduction)
**Duplicate Lines Eliminated:** ~470 lines

---

## Appendix B: Import Changes

### Before (app-wishlist-gallery)
```typescript
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
import { useAnnouncer, Announcer } from '../../hooks/useAnnouncer'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
```

### After (app-wishlist-gallery)
```typescript
import { useRovingTabIndex, useKeyboardShortcuts } from '@repo/gallery'
import { useAnnouncer, Announcer } from '@repo/accessibility'
```

### Before (app-inspiration-gallery)
```typescript
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
import { useAnnouncer } from '../../hooks/useAnnouncer'
import { useGalleryKeyboard } from '../../hooks/useGalleryKeyboard'
```

### After (app-inspiration-gallery)
```typescript
import { useRovingTabIndex, useGalleryKeyboard } from '@repo/gallery'
import { useAnnouncer } from '@repo/accessibility'
```

---

## Appendix C: Test Migration Checklist

- [ ] `useRovingTabIndex.test.tsx` → `packages/core/gallery/src/hooks/__tests__/`
- [ ] `useAnnouncer.test.tsx` → `packages/core/accessibility/src/hooks/__tests__/`
- [ ] `useKeyboardShortcuts.test.tsx` → `packages/core/gallery/src/hooks/__tests__/`
- [ ] `useGalleryKeyboard.test.ts` → `packages/core/gallery/src/hooks/__tests__/` (new implementation)
- [ ] Create `useGallerySelection.test.ts` in `packages/core/gallery/src/hooks/__tests__/`

**Test Suite Coverage:**
- Existing tests: ~95% coverage on moved hooks
- New tests needed: `useGalleryKeyboard` (new), `useGallerySelection` (new)
- Total estimated test lines: ~800 lines

---

*End of Story Seed*
