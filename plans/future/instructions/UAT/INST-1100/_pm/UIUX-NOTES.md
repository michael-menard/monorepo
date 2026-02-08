# UI/UX Notes: INST-1100 - View MOC Gallery

## Verdict
**PASS-WITH-NOTES**

The gallery UI story is implementable and follows established patterns from wishlist-gallery. Minor notes on component reuse and accessibility below.

---

## MVP Component Architecture

### Components Required for Core Journey

1. **GalleryPage** (`apps/web/app-instructions-gallery/src/pages/GalleryPage.tsx`)
   - Main page component (may already exist as `main-page.tsx`)
   - Orchestrates layout, data fetching, and state management

2. **InstructionCard** (`apps/web/app-instructions-gallery/src/components/InstructionCard`)
   - **Reuse existing** component
   - May need minor updates for gallery context
   - Should display: thumbnail, title, piece count, theme

3. **@repo/gallery components** (reuse from existing package):
   - `GalleryGrid` - Responsive grid layout
   - `GalleryEmptyState` - Empty state with CTA
   - `GallerySkeleton` - Loading skeleton during fetch
   - `GalleryFilterBar` - Filter/sort controls (optional for MVP)
   - `GalleryViewToggle` - Grid/datatable view toggle (optional for MVP)

### Reuse Targets in packages/**

- **@repo/gallery**: All layout components
- **@repo/app-component-library**: `CustomButton` for CTA, `Card` for wrappers
- **@repo/ui** (shadcn primitives): Do NOT import directly - use via @repo/app-component-library

### shadcn Primitives for Core UI

**CRITICAL IMPORT RULE**: Do NOT import shadcn primitives directly. Always use `@repo/app-component-library`.

```typescript
// CORRECT
import { CustomButton, Card } from '@repo/app-component-library'

// WRONG
import { Button } from '@repo/ui/button'
import { Card } from '@repo/ui/card'
```

Primitives used (via @repo/app-component-library):
- `Button` (wrapped as `CustomButton`)
- `Card` (for card wrappers if needed)

---

## MVP Accessibility (Blocking Only)

### Requirements That Prevent Core Journey Usage

1. **Keyboard Navigation**
   - **REQUIRED**: Gallery must be navigable via `Tab` key
   - **REQUIRED**: MOC cards must be focusable and activate with `Enter` or `Space`
   - **Pattern**: Reuse from wishlist-gallery keyboard nav

2. **Screen Reader Requirements**
   - **REQUIRED**: Gallery region has `role="region"` and `aria-label="MOC Gallery"`
   - **REQUIRED**: Empty state message announced to screen readers
   - **REQUIRED**: Loading state announced: "Loading MOCs..."
   - **REQUIRED**: Each card has accessible name: `aria-label="{MOC title}, {piece count} pieces, {theme} theme"`

3. **Focus Management**
   - **REQUIRED**: When page loads, focus moves to gallery heading or first card
   - **REQUIRED**: Loading skeleton does not trap focus

### Implementation Checks

```typescript
// Example accessible gallery structure
<div role="region" aria-label="MOC Gallery">
  <h1 id="gallery-heading">My MOCs</h1>

  {isLoading && <div aria-live="polite">Loading MOCs...</div>}

  {isEmpty && (
    <div role="status" aria-live="polite">
      <p>No MOCs found. Create your first MOC to get started.</p>
      <CustomButton aria-label="Create your first MOC">Create MOC</CustomButton>
    </div>
  )}

  <GalleryGrid>
    {mocs.map(moc => (
      <InstructionCard
        key={moc.id}
        moc={moc}
        aria-label={`${moc.title}, ${moc.partsCount} pieces, ${moc.theme} theme`}
        tabIndex={0}
      />
    ))}
  </GalleryGrid>
</div>
```

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**CRITICAL**: All colors must use design tokens from Tailwind config. NO hard-coded hex values or rgb() functions.

```typescript
// CORRECT - Using design tokens
className="bg-lego-sky-100 text-lego-teal-700 border-lego-sky-300"

// WRONG - Hard-coded colors
className="bg-[#e0f2fe] text-[#0e7490]"
style={{ backgroundColor: '#e0f2fe', color: '#0e7490' }}
```

**Allowed Token Categories**:
- `lego-sky-{50-950}` - Primary background and surfaces
- `lego-teal-{50-950}` - Accents and interactive elements
- `lego-gray-{50-950}` - Text and borders
- Semantic tokens: `bg-background`, `text-foreground`, `border-border`, etc.

### _primitives Import Requirement

All base UI components MUST be imported from `@repo/app-component-library`, which wraps shadcn primitives from `_primitives/`.

**Directory structure expectation**:
```
packages/core/app-component-library/
  _primitives/          # Raw shadcn components (Button, Card, etc.)
  buttons/              # App-level wrappers (CustomButton)
  cards/                # App-level card components
  index.ts              # Barrel export ONLY for this package
```

**Import pattern**:
```typescript
// CORRECT
import { CustomButton } from '@repo/app-component-library'

// WRONG - Never import from _primitives directly
import { Button } from '@repo/app-component-library/_primitives/button'
```

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

**Journey**: User views their MOC collection in a gallery

**Steps**:
1. **Setup**: User authenticated, 5 MOCs seeded in database
2. **Navigate**: User goes to `/mocs` route
3. **Verify Loading**: Loading skeletons appear briefly
4. **Verify Display**: 5 MOC cards render in responsive grid
5. **Verify Card Content**: Each card shows thumbnail, title, piece count, theme
6. **Verify Responsiveness**: Grid adapts to viewport (1/2/3-4 columns)
7. **Verify Empty State**: User with 0 MOCs sees empty state with CTA

**Playwright Assertions**:
```typescript
// Test: Gallery displays MOCs
await expect(page.locator('[data-testid="moc-card"]')).toHaveCount(5)
await expect(page.locator('text=King\'s Castle')).toBeVisible()
await expect(page.locator('text=2500 pieces')).toBeVisible()

// Test: Responsive grid
await page.setViewportSize({ width: 375, height: 667 })
await expect(page.locator('.gallery-grid')).toHaveCSS('grid-template-columns', /^1fr$/)

await page.setViewportSize({ width: 1024, height: 768 })
await expect(page.locator('.gallery-grid')).toHaveCSS('grid-template-columns', /repeat\(3,/)

// Test: Empty state
await expect(page.locator('text=No MOCs found')).toBeVisible()
await expect(page.locator('button:has-text("Create your first MOC")')).toBeVisible()
```

**Evidence Artifacts**:
- Screenshot: Gallery with 5 MOCs in 3-column grid
- Screenshot: Empty state with CTA button
- Screenshot: Loading skeleton state
- Video: Full user journey from navigation to viewing MOCs

---

## Notes for Implementation

### Component Reuse Assessment

**InstructionCard** - Existing component needs review:
- **Current location**: `apps/web/app-instructions-gallery/src/components/InstructionCard`
- **Action**: Verify it displays thumbnail, title, piece count, theme
- **If missing**: Add props for `partsCount` and `theme` display

**GalleryGrid** - From @repo/gallery:
- **Reuse as-is**: Should work with InstructionCard as children
- **Responsive config**: Ensure breakpoints match design (1/2/3-4 cols)

**GalleryEmptyState** - From @repo/gallery:
- **Customization**: Pass custom message and CTA button
- **Pattern from wishlist**: `<GalleryEmptyState message="No MOCs found" action={<CustomButton>Create</CustomButton>} />`

### Design Consistency with Wishlist Gallery

**Match these patterns**:
- Card hover state: `hover:shadow-lg transition-shadow`
- Card border: `border border-lego-sky-300 rounded-lg`
- Grid gap: `gap-4 md:gap-6`
- Heading style: `text-3xl font-bold text-lego-teal-700`
- Empty state style: `text-center py-12 text-lego-gray-500`

**Divergence acceptable for**:
- Card content layout (MOC-specific vs wishlist-specific fields)
- Icon choices (BookOpen for instructions vs Heart for wishlist)

---

## Future Enhancements (Out of MVP Scope)

See `FUTURE-UIUX.md` for:
- Advanced filtering (by theme, piece count range)
- Sorting options (newest, oldest, name, piece count)
- View mode toggle (grid vs datatable)
- Card animations on hover/click
- Drag-to-reorder (similar to wishlist)
- Bulk actions (select multiple, delete)
- Quick actions on card (edit, delete icons)
