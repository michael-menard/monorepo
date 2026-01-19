# Story glry-1005: View Toggle UI Component

## Status

Draft

## Story

**As a** user viewing a gallery on desktop or tablet,
**I want** a visual toggle button to switch between grid and table views,
**so that** I can choose the view mode that best suits my browsing needs.

## Dependencies

- **glry-1004**: View Mode State Infrastructure (REQUIRED - provides `useViewMode` hook and ViewMode types)

## Acceptance Criteria

1. `GalleryViewToggle` component renders two-button toggle (Grid icon | Table icon)
2. Toggle visible on tablet/desktop (>= 768px breakpoint)
3. Toggle hidden on mobile (< 768px) - component not rendered
4. Clicking toggle switches between grid and datatable modes
5. Active view icon highlighted with accent color
6. Minimum 44x44px touch target for accessibility
7. First-time users see dismissible tooltip hint ("Try table view!")
8. Tooltip dismissal stored in localStorage, never shown again
9. Component uses shadcn `ToggleGroup` from `@repo/ui`
10. Icons from lucide-react (`LayoutGrid`, `Table`)
11. Smooth view transition animation (Framer Motion)
12. Scroll position resets to top when switching views
13. Component integrated with existing `GalleryFilterBar`

## Tasks / Subtasks

### Task 1: Create GalleryViewToggle Component (AC: 1, 5, 6, 9, 10)

- [ ] Create `packages/core/gallery/src/components/GalleryViewToggle.tsx`
- [ ] Define Zod schema for component props:
  - `currentView: ViewMode`
  - `onViewChange: (mode: ViewMode) => void`
  - `showFirstTimeHint?: boolean`
  - `onDismissHint?: () => void`
  - `className?: string`
- [ ] Infer props type from schema
- [ ] Import `ToggleGroup`, `ToggleGroupItem` from `@repo/ui`
- [ ] Import `LayoutGrid`, `Table` icons from `lucide-react`
- [ ] Render toggle with two items (grid, datatable)
- [ ] Apply accent color to active view
- [ ] Ensure 44x44px minimum size with Tailwind classes
- [ ] Add ARIA labels for accessibility

### Task 2: Add Responsive Behavior (AC: 2, 3)

- [ ] Wrap component in responsive container
- [ ] Use Tailwind `hidden md:flex` to hide on mobile
- [ ] Verify toggle not rendered below 768px
- [ ] Test on various screen sizes (mobile, tablet, desktop)

### Task 3: Implement First-Time Hint Tooltip (AC: 7, 8)

- [ ] Create `useFirstTimeHint` custom hook
- [ ] Check localStorage for `gallery_tooltip_dismissed` key
- [ ] Return `[showHint, dismissHint]` tuple
- [ ] `dismissHint` function sets flag in localStorage
- [ ] Wrap toggle with shadcn `Tooltip` component
- [ ] Show tooltip only when `showHint` is true
- [ ] Tooltip content: "Try table view!"
- [ ] Add close button or auto-dismiss after 5 seconds
- [ ] Mark tooltip as dismissible with `X` icon

### Task 4: Add View Transition Animation (AC: 11)

- [ ] Wrap toggle with Framer Motion `<motion.div>`
- [ ] Add entrance animation on mount (fade in)
- [ ] Add click feedback animation (subtle scale)
- [ ] Respect `prefers-reduced-motion` media query
- [ ] Use Tailwind `transition-colors` for icon color change
- [ ] Animation duration: 150-200ms

### Task 5: Implement Scroll Reset (AC: 12)

- [ ] Create `scrollToTop` utility function
- [ ] Call `window.scrollTo({ top: 0, behavior: 'smooth' })` on view change
- [ ] Add to `onViewChange` callback
- [ ] Test scroll reset works on view toggle

### Task 6: Integrate with GalleryFilterBar (AC: 13)

- [ ] Update `GalleryFilterBar` to accept `children` prop
- [ ] Place `GalleryViewToggle` in right-aligned section
- [ ] Filters on left, view toggle on right
- [ ] Use Tailwind `justify-between` for spacing
- [ ] Verify responsive layout (stacks on mobile if needed)

### Task 7: Connect to View Mode State (AC: 4)

- [ ] Create example usage in gallery component
- [ ] Use `useViewMode('wishlist')` hook from glry-1004
- [ ] Pass `viewMode` to `currentView` prop
- [ ] Pass setter to `onViewChange` prop
- [ ] Verify state persistence works (localStorage)
- [ ] Test view switching updates gallery display

### Task 8: Write Comprehensive Tests (AC: 1-13)

- [ ] Create `__tests__/GalleryViewToggle.test.tsx`
- [ ] Test component renders with grid mode active
- [ ] Test component renders with datatable mode active
- [ ] Test clicking grid icon calls onViewChange with 'grid'
- [ ] Test clicking table icon calls onViewChange with 'datatable'
- [ ] Test active view has accent color styling
- [ ] Test component has minimum 44x44px touch targets
- [ ] Test tooltip shows on first visit
- [ ] Test tooltip dismissal persists to localStorage
- [ ] Test tooltip doesn't show after dismissal
- [ ] Test scroll resets to top on view change
- [ ] Test responsive behavior (hidden on mobile)
- [ ] Test ARIA labels present and correct
- [ ] Achieve minimum 80% coverage

## Dev Notes

### Technology Stack

[Source: docs/architecture/tech-stack.md]

- **React**: 19.0.0 - Functional components
- **shadcn/ui**: Component library built on Radix UI
- **Framer Motion**: 12.23.24 - Animations
- **lucide-react**: 0.476.0 - Icons
- **Tailwind CSS**: 4.1.11 - Styling
- **Zod**: Schema validation and type inference

### Component Architecture

[Source: docs/architecture/coding-standards.md#react-standards]

**File Structure:**
```typescript
// GalleryViewToggle.tsx

// 1. Imports
import { motion } from 'framer-motion'
import { LayoutGrid, Table } from 'lucide-react'
import { z } from 'zod'

import { ToggleGroup, ToggleGroupItem, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui'

// 2. Zod schema
const GalleryViewTogglePropsSchema = z.object({
  currentView: z.enum(['grid', 'datatable']),
  onViewChange: z.function().args(z.enum(['grid', 'datatable'])).returns(z.void()),
  showFirstTimeHint: z.boolean().optional(),
  onDismissHint: z.function().args().returns(z.void()).optional(),
  className: z.string().optional(),
})

type GalleryViewToggleProps = z.infer<typeof GalleryViewTogglePropsSchema>

// 3. Component
export function GalleryViewToggle({
  currentView,
  onViewChange,
  showFirstTimeHint = false,
  onDismissHint,
  className,
}: GalleryViewToggleProps) {
  const handleViewChange = (value: string | undefined) => {
    if (value === 'grid' || value === 'datatable') {
      onViewChange(value)
      // Scroll to top on view change
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('hidden md:flex', className)}
    >
      <Tooltip open={showFirstTimeHint}>
        <TooltipTrigger asChild>
          <ToggleGroup
            type="single"
            value={currentView}
            onValueChange={handleViewChange}
            aria-label="View mode selector"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="min-w-[44px] min-h-[44px]"
            >
              <LayoutGrid className="h-5 w-5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="datatable"
              aria-label="Table view"
              className="min-w-[44px] min-h-[44px]"
            >
              <Table className="h-5 w-5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex items-center gap-2">
            <span>Try table view!</span>
            <button
              onClick={onDismissHint}
              className="ml-2 text-xs hover:text-accent"
              aria-label="Dismiss hint"
            >
              ✕
            </button>
          </div>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  )
}
```

### First-Time Hint Hook Pattern

```typescript
// hooks/useFirstTimeHint.ts
import { useState, useCallback } from 'react'

const HINT_STORAGE_KEY = 'gallery_tooltip_dismissed'

export const useFirstTimeHint = (): [boolean, () => void] => {
  const [showHint, setShowHint] = useState(() => {
    try {
      return !localStorage.getItem(HINT_STORAGE_KEY)
    } catch {
      return false
    }
  })

  const dismissHint = useCallback(() => {
    try {
      localStorage.setItem(HINT_STORAGE_KEY, 'true')
      setShowHint(false)
    } catch (error) {
      logger.warn('Failed to save hint dismissal', { error })
      setShowHint(false)
    }
  }, [])

  return [showHint, dismissHint]
}
```

### shadcn/ui Components

[Source: docs/architecture/coding-standards.md#package-import-patterns]

**REQUIRED Import Pattern:**
```typescript
// ✅ Correct - Import from @repo/ui package
import { ToggleGroup, ToggleGroupItem, Tooltip } from '@repo/ui'

// ❌ Wrong - Individual path imports
import { ToggleGroup } from '@repo/ui/toggle-group'
```

### Responsive Design

[Source: docs/front-end-spec-gallery-datatable.md#spacing--layout]

**Breakpoints:**
- Mobile: `< 768px` - Toggle hidden
- Tablet: `>= 768px` - Toggle visible
- Desktop: `>= 1024px` - Toggle visible

**Tailwind Classes:**
```tsx
<div className="hidden md:flex">
  {/* Component only renders on tablet+ */}
</div>
```

### Accessibility Requirements

[Source: docs/front-end-spec-gallery-datatable.md#accessibility-requirements]

**WCAG 2.1 Level AA Compliance:**
- Minimum 44x44px touch targets
- ARIA labels on all interactive elements
- `aria-pressed="true"` on active view
- `role="group"` with `aria-label="View mode selector"`
- Keyboard navigation (Tab, Enter, Space, Arrow keys)
- Focus-visible states with ring

**Example ARIA:**
```tsx
<ToggleGroup
  type="single"
  value={currentView}
  onValueChange={handleViewChange}
  aria-label="View mode selector"
>
  <ToggleGroupItem
    value="grid"
    aria-label="Grid view"
    aria-pressed={currentView === 'grid'}
  >
    <LayoutGrid className="h-5 w-5" aria-hidden="true" />
  </ToggleGroupItem>
</ToggleGroup>
```

### Animation with Framer Motion

[Source: docs/front-end-spec-gallery-datatable.md#animation--micro-interactions]

**Required Patterns:**
```typescript
import { motion } from 'framer-motion'

// Entrance animation
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>

// Respect prefers-reduced-motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{
    duration: 0.2,
    ease: 'easeOut',
  }}
  // Framer Motion automatically respects prefers-reduced-motion
>
```

### Integration with Existing Components

**GalleryFilterBar Update:**
```tsx
// Before (glry-1004):
<GalleryFilterBar>
  <SearchInput />
  <StoreFilter />
  <PriorityFilter />
</GalleryFilterBar>

// After (glry-1005):
<GalleryFilterBar>
  <div className="flex items-center gap-2">
    <SearchInput />
    <StoreFilter />
    <PriorityFilter />
  </div>
  <GalleryViewToggle
    currentView={viewMode}
    onViewChange={setViewMode}
  />
</GalleryFilterBar>
```

### Previous Story Context

**glry-1004 (View Mode State Infrastructure):**
- Created `ViewMode` type and Zod schema
- Created `useViewMode(galleryType)` hook
- localStorage persistence with `gallery_view_mode_{type}` keys
- Fallback chain: localStorage → URL → default 'grid'

**Use these in glry-1005:**
```typescript
import { useViewMode, ViewMode } from '@repo/gallery'

function WishlistGallery() {
  const [viewMode, setViewMode] = useViewMode('wishlist')
  const [showHint, dismissHint] = useFirstTimeHint()

  return (
    <div>
      <GalleryFilterBar>
        {/* filters */}
        <GalleryViewToggle
          currentView={viewMode}
          onViewChange={setViewMode}
          showFirstTimeHint={showHint}
          onDismissHint={dismissHint}
        />
      </GalleryFilterBar>
      {viewMode === 'grid' ? <GalleryGrid /> : <div>Datatable coming next</div>}
    </div>
  )
}
```

## Testing

[Source: docs/architecture/testing-strategy.md]

### Test Framework

- **Vitest** with React Testing Library
- Test files: `__tests__/GalleryViewToggle.test.tsx`
- Minimum coverage: 80%
- Mock localStorage and Framer Motion

### Required Test Cases

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GalleryViewToggle } from '../GalleryViewToggle'

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('GalleryViewToggle', () => {
  const mockOnViewChange = vi.fn()
  const mockOnDismissHint = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders with grid mode active', () => {
    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
      />
    )

    const gridButton = screen.getByRole('button', { name: /grid view/i })
    expect(gridButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onViewChange when table icon clicked', async () => {
    const user = userEvent.setup()
    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /table view/i }))
    expect(mockOnViewChange).toHaveBeenCalledWith('datatable')
  })

  it('shows first-time hint when showFirstTimeHint is true', () => {
    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
        showFirstTimeHint={true}
        onDismissHint={mockOnDismissHint}
      />
    )

    expect(screen.getByText(/try table view/i)).toBeInTheDocument()
  })

  it('calls onDismissHint when hint close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
        showFirstTimeHint={true}
        onDismissHint={mockOnDismissHint}
      />
    )

    await user.click(screen.getByRole('button', { name: /dismiss hint/i }))
    expect(mockOnDismissHint).toHaveBeenCalled()
  })

  it('has minimum 44x44px touch targets', () => {
    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
      />
    )

    const gridButton = screen.getByRole('button', { name: /grid view/i })
    const computedStyle = window.getComputedStyle(gridButton)

    expect(parseInt(computedStyle.minWidth)).toBeGreaterThanOrEqual(44)
    expect(parseInt(computedStyle.minHeight)).toBeGreaterThanOrEqual(44)
  })

  it('scrolls to top when view changes', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo')
    const user = userEvent.setup()

    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] `GalleryViewToggle` component created and exported
- [ ] Component uses shadcn `ToggleGroup` from `@repo/ui`
- [ ] Icons from lucide-react (`LayoutGrid`, `Table`)
- [ ] Responsive behavior (hidden on mobile < 768px)
- [ ] First-time hint tooltip with dismissal
- [ ] Framer Motion animations implemented
- [ ] Scroll reset on view change
- [ ] Integrated with `GalleryFilterBar`
- [ ] All tests passing (minimum 80% coverage)
- [ ] TypeScript compilation succeeds
- [ ] ARIA labels and accessibility verified
- [ ] 44x44px minimum touch targets confirmed
- [ ] Code follows functional programming paradigm

---

## Change Log

| Date       | Version | Description                       | Author |
| ---------- | ------- | --------------------------------- | ------ |
| 2025-12-28 | 0.1     | Initial draft for glry-1005 story | Bob (SM) |
