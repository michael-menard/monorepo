# UIUX Notes: WISH-2014 Smart Sorting Algorithms (MVP-Critical)

## Verdict

**PASS-WITH-NOTES**

This story touches UI (sort dropdown in gallery page) and requires MVP-critical UX considerations for sort option naming, iconography, and accessibility. Core user journey: discover items using smart sorting modes.

## MVP Component Architecture

### Components Required (Core Journey)

1. **Sort Dropdown Enhancement** (existing component)
   - Location: `apps/web/app-wishlist-gallery/src/components/GalleryHeader.tsx` (or equivalent sort control)
   - Add 3 new options to existing sort dropdown
   - No new components needed - extends existing Select primitive

2. **Sort Option Labels** (user-facing strings)
   - "Best Value" - Sort by price-per-piece ratio
   - "Expiring Soon" - Sort by oldest release dates
   - "Hidden Gems" - Sort by low priority + high piece count

### Reuse Targets (Core Flow)

- **Select Primitive**: `packages/core/app-component-library/_primitives/Select/`
  - Use existing Select component (shadcn/ui)
  - No custom styling beyond token colors
  
- **Icons**: `lucide-react` for sort indicators
  - `TrendingDown` icon for Best Value (low prices)
  - `Clock` icon for Expiring Soon (time-based)
  - `Gem` icon for Hidden Gems (discovery)

### Shadcn Primitives (Core UI)

- Import from `_primitives/Select/index.tsx`
- Token-only colors for dropdown (neutral-100, neutral-700)
- No custom dropdowns - use existing pattern from WISH-2001

## MVP Accessibility (Blocking Only)

### A1: Keyboard Navigation (Core Journey)

- **Requirement**: Sort dropdown must be keyboard navigable (Tab, Arrow keys, Enter)
- **Validation**: Existing Select primitive handles this (shadcn/ui compliant)
- **Test**: Playwright keyboard navigation test required

### A2: Screen Reader Announcements (Core Journey)

- **Requirement**: Sort option labels must be descriptive for screen readers
- **Implementation**:
  ```tsx
  <SelectItem value="bestValue">
    <span className="sr-only">Sort by </span>
    Best Value
  </span>
  ```
- **Test**: Verify screen reader announces "Sort by Best Value"

### A3: Focus Management (Core Journey)

- **Requirement**: Focus returns to dropdown trigger after selection
- **Validation**: Existing Select primitive handles this
- **Test**: Playwright test verifies focus management

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**Dropdown Styling:**
```tsx
// CORRECT - Token-only colors
<Select className="bg-neutral-100 text-neutral-700">
  <SelectTrigger className="border-neutral-300 hover:border-neutral-400">
    Sort: {selectedOption}
  </SelectTrigger>
</Select>

// WRONG - Custom colors
<Select style={{ backgroundColor: '#f0f0f0' }}>
```

**Icon Colors:**
```tsx
// CORRECT - Token colors
<TrendingDown className="text-green-600" />
<Clock className="text-orange-600" />
<Gem className="text-purple-600" />

// WRONG - Hex colors
<TrendingDown style={{ color: '#10b981' }} />
```

### `_primitives` Import Requirement

```tsx
// CORRECT - Import from _primitives
import { Select, SelectTrigger, SelectContent, SelectItem } from '@repo/app-component-library/_primitives/Select'

// WRONG - Direct shadcn import
import { Select } from '@/components/ui/select'
```

## MVP Playwright Evidence

### Core Journey Demonstration

**Test: Smart Sorting Flow** (`smart-sorting.spec.ts`)

1. **Setup**: Load gallery page with 10+ items
2. **Action 1**: Click sort dropdown
3. **Assert**: Dropdown opens with 3 new options visible
4. **Action 2**: Select "Best Value"
5. **Assert**: Items re-order by price-per-piece ratio (verify first item has lowest ratio)
6. **Action 3**: Select "Expiring Soon"
7. **Assert**: Items re-order by oldest release date (verify first item has oldest date)
8. **Action 4**: Select "Hidden Gems"
9. **Assert**: Items re-order by low priority + high piece count (verify logic)
10. **Assert**: No console errors throughout flow

**Evidence Required:**
- Screenshot of dropdown with new options
- Screenshot of gallery after each sort mode
- Network HAR showing API calls with correct sort parameter
- Accessibility audit (axe-core) showing no violations

### Accessibility Evidence

**Test: Keyboard Navigation** (`smart-sorting-a11y.spec.ts`)

1. Press Tab to focus sort dropdown
2. Press Enter to open dropdown
3. Press Arrow Down to navigate options
4. Press Enter to select "Best Value"
5. Verify items re-order
6. Verify focus returns to dropdown trigger

**Evidence Required:**
- Video recording of keyboard-only interaction
- Axe-core audit result (no violations)

## MVP UX Requirements

### Sort Option Naming (MVP-Critical)

**Labels must be user-friendly and descriptive:**

| Backend Value | Frontend Label | Description (Tooltip) |
|---------------|----------------|----------------------|
| `bestValue` | "Best Value" | "Sort by lowest price per piece" |
| `expiringSoon` | "Expiring Soon" | "Sort by oldest release dates" |
| `hiddenGems` | "Hidden Gems" | "Discover overlooked valuable sets" |

**Tooltip Implementation:**
```tsx
<SelectItem value="bestValue">
  <div className="flex items-center gap-2">
    <TrendingDown className="h-4 w-4 text-green-600" />
    <span>Best Value</span>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon className="h-3 w-3 text-neutral-500" />
        </TooltipTrigger>
        <TooltipContent>
          Sort by lowest price per piece
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</SelectItem>
```

### Icon Consistency (MVP-Critical)

**Icons must match semantic meaning:**

- **Best Value**: `TrendingDown` (green-600) - represents low prices/good deals
- **Expiring Soon**: `Clock` (orange-600) - represents time urgency
- **Hidden Gems**: `Gem` (purple-600) - represents discovery/valuable finds

**Icon Positioning:**
```tsx
// Left-aligned with label
<SelectItem value="bestValue" className="flex items-center gap-2">
  <TrendingDown className="h-4 w-4 text-green-600" />
  <span>Best Value</span>
</SelectItem>
```

### Empty States (MVP-Critical)

**Scenario**: User selects "Best Value" but all items have null price or pieceCount

**Expected Behavior:**
```tsx
{items.length === 0 && sortMode === 'bestValue' && (
  <EmptyState
    icon={<TrendingDown />}
    title="No items with pricing data"
    description="Add price and piece count to items to use Best Value sorting"
    action={
      <Button onClick={() => setSortMode('createdAt')}>
        View All Items
      </Button>
    }
  />
)}
```

**Other Empty States:**
- "Expiring Soon" with no release dates: "No items with release dates"
- "Hidden Gems" with all high priority: "No low-priority items found"

## MVP Loading States (Blocking)

**Requirement**: Show loading state during sort API call

**Implementation:**
```tsx
{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <WishlistCardSkeleton key={i} />
    ))}
  </div>
) : (
  <WishlistGallery items={items} />
)}
```

**Evidence**: Playwright test with network throttling to verify skeleton states

## MVP Error States (Blocking)

**Scenario**: API returns 400 for invalid sort parameter

**Expected Behavior:**
```tsx
{error && (
  <Alert variant="destructive">
    <AlertTitle>Sort failed</AlertTitle>
    <AlertDescription>
      Unable to sort items. Please try again.
    </AlertDescription>
  </Alert>
)}
```

**Evidence**: Playwright test with mocked 400 response

## Risks to Call Out

### Risk 1: Sort Option Naming Ambiguity

**Risk**: Users may not understand "Hidden Gems" meaning
**Mitigation**: Add tooltip with description (see table above)
**Blocker**: No - tooltips are MVP-critical for this story

### Risk 2: Icon Overload

**Risk**: Too many icons in dropdown may clutter UI
**Mitigation**: Icons are small (h-4 w-4) and left-aligned, consistent with existing patterns
**Decision**: Icons are MVP-critical for visual distinction

### Risk 3: Mobile Dropdown Size

**Risk**: Tooltips may not work well on mobile (no hover)
**Mitigation**: Use info icon with tap-to-reveal tooltip on mobile
**Test**: Playwright mobile viewport tests required

## Non-MVP Concerns

(See FUTURE-UIUX.md for polish items)
