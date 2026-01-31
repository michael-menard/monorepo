# Future UIUX: WISH-2014 Smart Sorting Algorithms (Polish)

## UX Polish Opportunities

### P1: Sort Mode Persistence

**Enhancement**: Remember user's last selected sort mode in localStorage

**Implementation:**
```tsx
useEffect(() => {
  const savedSort = localStorage.getItem('wishlist_sort_mode')
  if (savedSort) {
    setSortMode(savedSort)
  }
}, [])

useEffect(() => {
  localStorage.setItem('wishlist_sort_mode', sortMode)
}, [sortMode])
```

**Impact**: Reduces cognitive load - users don't need to re-select sort on each visit

**Effort**: Small (1-2 hours)

### P2: Sort Mode Analytics

**Enhancement**: Track which sort modes are most popular

**Implementation:**
```tsx
const handleSortChange = (newSort: string) => {
  analytics.track('wishlist_sort_changed', {
    from: currentSort,
    to: newSort,
    itemCount: items.length,
  })
  setSortMode(newSort)
}
```

**Impact**: Understand user behavior and feature usage

**Effort**: Small (1 hour)

### P3: Visual Sort Indicators on Cards

**Enhancement**: Show visual indicators on cards matching current sort mode

**Example**: When "Best Value" selected, show badge on cards with best ratios:
```tsx
{sortMode === 'bestValue' && pricePerPiece < 0.15 && (
  <Badge variant="success" className="absolute top-2 right-2">
    <TrendingDown className="h-3 w-3" />
    Best Value
  </Badge>
)}
```

**Impact**: Reinforces sort logic visually

**Effort**: Medium (4-6 hours)

### P4: Animated Re-ordering

**Enhancement**: Animate cards when sort order changes

**Implementation**: Use Framer Motion's `AnimatePresence` and `layout` prop:
```tsx
<motion.div
  layout
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
  <WishlistCard {...item} />
</motion.div>
```

**Impact**: Smooth visual feedback for sort changes

**Effort**: Medium (3-4 hours)

### P5: Sort Preview/Tooltip Examples

**Enhancement**: Show example calculation in tooltip

**Example**:
```tsx
<TooltipContent>
  <div className="space-y-1">
    <p className="font-medium">Best Value</p>
    <p className="text-sm text-neutral-500">
      Sort by lowest price per piece
    </p>
    <p className="text-xs text-neutral-400 mt-2">
      Example: $100 ÷ 1000 pieces = $0.10/piece
    </p>
  </div>
</TooltipContent>
```

**Impact**: Educates users on algorithm logic

**Effort**: Small (2 hours)

### P6: Multiple Sort Modes (Secondary Sort)

**Enhancement**: Allow users to select secondary sort (e.g., "Best Value, then Newest")

**Implementation**: Add secondary dropdown or multi-select

**Impact**: Advanced power user feature

**Effort**: Large (12+ hours) - deferred to future story

## Accessibility Enhancements

### A1: High Contrast Mode Support

**Enhancement**: Test and optimize for Windows High Contrast Mode

**Implementation**: Use CSS custom properties for borders and backgrounds

**Impact**: Improves usability for visually impaired users

**Effort**: Medium (4-6 hours)

### A2: Reduced Motion Support

**Enhancement**: Respect `prefers-reduced-motion` for sort animations (P4)

**Implementation:**
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
>
```

**Impact**: WCAG AAA compliance

**Effort**: Small (1 hour) - implement with P4

### A3: Screen Reader Sort Announcements

**Enhancement**: Announce sort completion to screen readers

**Implementation:**
```tsx
<div role="status" aria-live="polite" className="sr-only">
  {isLoading ? 'Sorting items...' : `Sorted by ${sortMode}. ${items.length} items.`}
</div>
```

**Impact**: Better screen reader feedback

**Effort**: Small (1-2 hours)

### A4: Keyboard Shortcuts for Sort Modes

**Enhancement**: Add keyboard shortcuts (e.g., Alt+1 for Best Value)

**Implementation**: Use keyboard event listeners

**Impact**: Power user efficiency

**Effort**: Medium (3-4 hours)

## UI Improvements

### UI1: Sort Mode Header Indicator

**Enhancement**: Show current sort mode in gallery header

**Implementation:**
```tsx
<div className="flex items-center gap-2 text-sm text-neutral-600">
  <span>Sorted by:</span>
  <Badge variant="secondary">
    <TrendingDown className="h-3 w-3 mr-1" />
    Best Value
  </Badge>
</div>
```

**Impact**: Clearer context for current view

**Effort**: Small (1-2 hours)

### UI2: Sort Direction Toggle (Ascending/Descending)

**Enhancement**: Add toggle button next to sort dropdown for direction

**Implementation:**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
>
  {order === 'asc' ? <ArrowUp /> : <ArrowDown />}
</Button>
```

**Impact**: More control over sort direction

**Effort**: Small (2-3 hours)

### UI3: Sort Mode Info Modal

**Enhancement**: Add help icon that opens modal explaining each sort mode

**Implementation**: Modal with detailed descriptions and examples

**Impact**: User education

**Effort**: Medium (4-6 hours)

### UI4: Empty State Illustrations

**Enhancement**: Custom illustrations for each empty state

**Implementation**: Use SVG illustrations matching sort mode theme

**Impact**: Delightful UX

**Effort**: Medium (6-8 hours) - requires design collaboration

## Responsive Refinements

### R1: Mobile Sort Drawer

**Enhancement**: Use drawer/bottom sheet for sort selection on mobile instead of dropdown

**Implementation**: Use `@repo/app-component-library/_primitives/Drawer`

**Impact**: Better mobile UX (larger touch targets)

**Effort**: Medium (4-6 hours)

### R2: Desktop Sort Sidebar Filter Panel

**Enhancement**: Dedicated filter sidebar on desktop with sort options + filters

**Implementation**: Collapsible sidebar with all filtering/sorting controls

**Impact**: Better desktop UX for power users

**Effort**: Large (12+ hours) - deferred to future story

### R3: Tablet Landscape Optimization

**Enhancement**: Optimize card grid layout for tablet landscape (4 columns instead of 3)

**Impact**: Better tablet experience

**Effort**: Small (1 hour)

## Design System Extensions

### DS1: Sort Mode Icon Component

**Enhancement**: Create reusable `SortModeIcon` component

**Implementation:**
```tsx
export function SortModeIcon({ mode }: { mode: SortMode }) {
  const config = {
    bestValue: { icon: TrendingDown, color: 'text-green-600' },
    expiringSoon: { icon: Clock, color: 'text-orange-600' },
    hiddenGems: { icon: Gem, color: 'text-purple-600' },
  }
  const { icon: Icon, color } = config[mode]
  return <Icon className={cn('h-4 w-4', color)} />
}
```

**Impact**: Consistency across sort UI

**Effort**: Small (1 hour)

### DS2: Sort Mode Badge Component

**Enhancement**: Create reusable `SortModeBadge` component for P3

**Impact**: Reusable pattern for future features

**Effort**: Small (2 hours)

## Testing Enhancements

### T1: Visual Regression Tests

**Enhancement**: Snapshot tests for each sort mode

**Implementation**: Percy or Playwright screenshots

**Impact**: Catch UI regressions

**Effort**: Medium (3-4 hours)

### T2: Performance Testing

**Enhancement**: Test sort performance with 1000+ items

**Implementation**: Lighthouse CI integration

**Impact**: Ensure smooth UX at scale

**Effort**: Medium (4-6 hours)

### T3: Cross-browser Testing

**Enhancement**: Test on Safari, Firefox, Chrome, Edge

**Impact**: Compatibility assurance

**Effort**: Small (2-3 hours)

## Future Story Candidates

### FS1: Advanced Filtering with Sort

**Story**: Combine smart sorting with multi-filter (store + tags + priority)

**Effort**: Large

**Priority**: Medium

### FS2: Sort Presets/Saved Views

**Story**: Allow users to save sort+filter combinations as named views

**Effort**: Large

**Priority**: Low

### FS3: Sort Mode Recommendations

**Story**: AI-powered recommendations for best sort mode based on user behavior

**Effort**: Large

**Priority**: Low
