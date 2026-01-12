# Story glry-1002: Gallery Multi-Column Sorting

## Status

Needs Revision

## Story

**As a** user browsing galleries,
**I want** to sort items by multiple columns with different directions,
**so that** I can find items using complex sort criteria (e.g., cheapest large sets, newest low-priority items).

## PRD Reference

Epic 3 - Shared Gallery Components
- Advanced sorting capabilities for all gallery views
- User-friendly sorting controls

## Dependencies

- **glry-1000**: Gallery Package Scaffolding (package structure exists)
- **glry-1001a**: Generic Filter State Management (FilterContext/generic state hooks provide foundation for sort state)

## Acceptance Criteria

### Multi-Column Sort Configuration

1. Users can add up to 3 sort columns
2. Each sort column has independent direction (ascending/descending)
3. Sort priority determined by order (primary, secondary, tertiary)
4. Visual indicators show active sort columns and priority
5. Users can remove individual sort columns
6. "Clear all sorts" button resets to default sort

### Sort UI/UX

7. Sort button opens popover with sort configuration
8. Drag handles allow reordering sort priority
9. Sort badge shows active sort count (e.g., "Sort (2)")
10. Popover displays: column dropdown, direction toggle, remove button
11. Add sort button appears after each sort row (max 3)
12. Keyboard accessible (Tab, Enter, Arrow keys)

### Supported Column Types

13. Text columns: alphabetical (A→Z, Z→A)
14. Number columns: numeric (lowest→highest, highest→lowest)
15. Date columns: chronological (oldest→newest, newest→oldest)
16. Enum columns: predefined order or alphabetical

### Performance

17. Sorting debounced by 200ms to avoid excessive re-renders
18. Sort applied in-memory for datasets <1000 items
19. Sort state persists in URL query params
20. Sort works across all view modes (grid, list, datatable)

## Tasks / Subtasks

### Task 1: Create Sort State Management

- [ ] Create `SortContext` for managing multi-column sort state
- [ ] Export `useSortContext()` hook from @repo/gallery
- [ ] Support sort state: `{ sorts: SortColumn[], addSort, updateSort, removeSort, clearSorts }`
- [ ] Persist sort state in URL query params

### Task 2: Create SortColumn Type

- [ ] Define `SortColumn` interface with field, direction, priority
- [ ] Define `SortDirection` as 'asc' | 'desc'
- [ ] Export types from @repo/gallery

### Task 3: Create useMultiSort Hook

- [ ] Accept items array and sort configuration
- [ ] Return sorted items based on priority order
- [ ] Support string, number, date, and custom comparators
- [ ] Debounce sort recalculation by 200ms
- [ ] Handle null/undefined values (push to end)

### Task 4: Create SortButton Component

- [ ] Button shows sort icon and active count badge
- [ ] Opens popover with sort configuration UI
- [ ] Integrates with SortContext
- [ ] Export from @repo/gallery

### Task 5: Create SortPopover Component

- [ ] Displays list of active sort columns
- [ ] Each row: column dropdown, direction toggle, remove button
- [ ] Drag handles for reordering (using @dnd-kit/core)
- [ ] "Add sort" button (max 3 columns)
- [ ] "Clear all" button
- [ ] Export from @repo/gallery

### Task 6: Integrate with GalleryFilterBar

- [ ] Add optional `sortable` prop to GalleryFilterBar
- [ ] Add optional `sortColumns` prop for available sort fields
- [ ] Render SortButton when sortable=true
- [ ] Position sort button next to view mode toggle

### Task 7: Update Gallery Components

- [ ] Wrap Gallery components with SortContext provider
- [ ] Apply multi-sort to items before rendering
- [ ] Maintain sort state when switching views
- [ ] Show visual sort indicators in datatable headers

## Dev Notes

### SortColumn Interface

```typescript
// packages/core/gallery/src/types/sort.ts
export type SortDirection = 'asc' | 'desc'

export interface SortColumn<TItem = unknown> {
  field: keyof TItem
  direction: SortDirection
  priority: number // 0 = primary, 1 = secondary, 2 = tertiary
}

export type SortComparator<TItem = unknown> = (a: TItem, b: TItem) => number
```

### Sort Context

```typescript
// packages/core/gallery/src/contexts/SortContext.tsx
import { createContext, useContext, useState, useCallback } from 'react'
import { SortColumn } from '../types/sort'

interface SortContextValue<TItem = unknown> {
  sorts: SortColumn<TItem>[]
  addSort: (column: Omit<SortColumn<TItem>, 'priority'>) => void
  updateSort: (index: number, updates: Partial<SortColumn<TItem>>) => void
  removeSort: (index: number) => void
  reorderSorts: (fromIndex: number, toIndex: number) => void
  clearSorts: () => void
}

const SortContext = createContext<SortContextValue | null>(null)

export function SortProvider<TItem>({
  children,
  initialSorts = [],
  maxSorts = 3,
}: {
  children: React.ReactNode
  initialSorts?: SortColumn<TItem>[]
  maxSorts?: number
}) {
  const [sorts, setSorts] = useState<SortColumn<TItem>[]>(initialSorts)

  const addSort = useCallback((column: Omit<SortColumn<TItem>, 'priority'>) => {
    setSorts(prev => {
      if (prev.length >= maxSorts) return prev
      return [...prev, { ...column, priority: prev.length }]
    })
  }, [maxSorts])

  const updateSort = useCallback((index: number, updates: Partial<SortColumn<TItem>>) => {
    setSorts(prev => prev.map((sort, i) => i === index ? { ...sort, ...updates } : sort))
  }, [])

  const removeSort = useCallback((index: number) => {
    setSorts(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Recalculate priorities
      return updated.map((sort, i) => ({ ...sort, priority: i }))
    })
  }, [])

  const reorderSorts = useCallback((fromIndex: number, toIndex: number) => {
    setSorts(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      // Recalculate priorities
      return updated.map((sort, i) => ({ ...sort, priority: i }))
    })
  }, [])

  const clearSorts = useCallback(() => {
    setSorts([])
  }, [])

  return (
    <SortContext.Provider value={{ sorts, addSort, updateSort, removeSort, reorderSorts, clearSorts }}>
      {children}
    </SortContext.Provider>
  )
}

export function useSortContext<TItem = unknown>() {
  const context = useContext(SortContext) as SortContextValue<TItem> | null
  if (!context) {
    throw new Error('useSortContext must be used within SortProvider')
  }
  return context
}
```

### Multi-Sort Hook

```typescript
// packages/core/gallery/src/hooks/useMultiSort.ts
import { useMemo } from 'react'
import { useDebouncedValue } from '@repo/ui/hooks'
import { SortColumn, SortDirection } from '../types/sort'

type Comparator<T> = (a: T, b: T) => number

function createComparator<TItem>(
  field: keyof TItem,
  direction: SortDirection
): Comparator<TItem> {
  return (a, b) => {
    const aVal = a[field]
    const bVal = b[field]

    // Handle null/undefined - push to end
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    let comparison = 0

    // Type-specific comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal)
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime()
    } else {
      // Fallback to string comparison
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return direction === 'asc' ? comparison : -comparison
  }
}

export function useMultiSort<TItem extends Record<string, unknown>>(
  items: TItem[],
  sorts: SortColumn<TItem>[]
) {
  const debouncedSorts = useDebouncedValue(sorts, 200)

  return useMemo(() => {
    if (debouncedSorts.length === 0) return items

    // Sort by priority order
    const sortedColumns = [...debouncedSorts].sort((a, b) => a.priority - b.priority)

    return [...items].sort((a, b) => {
      for (const sortCol of sortedColumns) {
        const comparator = createComparator<TItem>(sortCol.field, sortCol.direction)
        const result = comparator(a, b)
        if (result !== 0) return result
      }
      return 0
    })
  }, [items, debouncedSorts])
}
```

### SortButton Component

```typescript
// packages/core/gallery/src/components/SortButton.tsx
import { ArrowUpDown } from 'lucide-react'
import { Button, Badge, Popover, PopoverTrigger, PopoverContent } from '@repo/ui'
import { useSortContext } from '../contexts/SortContext'
import { SortPopover } from './SortPopover'

interface SortButtonProps<TItem> {
  sortableFields: {
    field: keyof TItem
    label: string
    type?: 'text' | 'number' | 'date'
  }[]
}

export function SortButton<TItem>({ sortableFields }: SortButtonProps<TItem>) {
  const { sorts } = useSortContext<TItem>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Sort
          {sorts.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5">
              {sorts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <SortPopover sortableFields={sortableFields} />
      </PopoverContent>
    </Popover>
  )
}
```

### SortPopover Component

```typescript
// packages/core/gallery/src/components/SortPopover.tsx
import { GripVertical, ArrowUp, ArrowDown, X, Plus } from 'lucide-react'
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@repo/ui'
import { useSortContext } from '../contexts/SortContext'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortPopoverProps<TItem> {
  sortableFields: {
    field: keyof TItem
    label: string
  }[]
}

function SortRow<TItem>({
  index,
  field,
  direction,
  sortableFields,
  onUpdate,
  onRemove,
}: {
  index: number
  field: keyof TItem
  direction: 'asc' | 'desc'
  sortableFields: { field: keyof TItem; label: string }[]
  onUpdate: (index: number, updates: any) => void
  onRemove: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `sort-${index}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priorityLabels = ['Primary', 'Secondary', 'Tertiary']

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-lg bg-background">
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Priority Label */}
      <div className="text-xs font-medium text-muted-foreground min-w-[4rem]">
        {priorityLabels[index]}
      </div>

      {/* Field Selector */}
      <Select value={String(field)} onValueChange={(val) => onUpdate(index, { field: val })}>
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortableFields.map(f => (
            <SelectItem key={String(f.field)} value={String(f.field)}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Direction Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onUpdate(index, { direction: direction === 'asc' ? 'desc' : 'asc' })}
      >
        {direction === 'asc' ? (
          <>
            <ArrowUp className="h-4 w-4 mr-1" />
            Asc
          </>
        ) : (
          <>
            <ArrowDown className="h-4 w-4 mr-1" />
            Desc
          </>
        )}
      </Button>

      {/* Remove Button */}
      <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function SortPopover<TItem>({ sortableFields }: SortPopoverProps<TItem>) {
  const { sorts, addSort, updateSort, removeSort, reorderSorts, clearSorts } = useSortContext<TItem>()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = Number(String(active.id).split('-')[1])
    const newIndex = Number(String(over.id).split('-')[1])
    reorderSorts(oldIndex, newIndex)
  }

  const canAddSort = sorts.length < 3

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Sort by</h3>
        {sorts.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearSorts}>
            Clear all
          </Button>
        )}
      </div>

      {sorts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sort applied</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorts.map((_, i) => `sort-${i}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sorts.map((sort, index) => (
                <SortRow
                  key={index}
                  index={index}
                  field={sort.field}
                  direction={sort.direction}
                  sortableFields={sortableFields}
                  onUpdate={updateSort}
                  onRemove={removeSort}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {canAddSort && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSort({ field: sortableFields[0].field, direction: 'asc' })}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add sort column
        </Button>
      )}
    </div>
  )
}
```

### Example Usage in Wishlist Gallery

```typescript
// apps/web/app-wishlist-gallery/src/pages/gallery-page.tsx
import { GalleryFilterBar, SortButton, SortProvider, useMultiSort } from '@repo/gallery'
import { WishlistItem } from '@repo/api-client/schemas/wishlist'

const SORTABLE_FIELDS = [
  { field: 'title' as keyof WishlistItem, label: 'Title', type: 'text' as const },
  { field: 'price' as keyof WishlistItem, label: 'Price', type: 'number' as const },
  { field: 'pieceCount' as keyof WishlistItem, label: 'Piece Count', type: 'number' as const },
  { field: 'releaseDate' as keyof WishlistItem, label: 'Release Date', type: 'date' as const },
  { field: 'priority' as keyof WishlistItem, label: 'Priority', type: 'number' as const },
  { field: 'createdAt' as keyof WishlistItem, label: 'Date Added', type: 'date' as const },
]

function WishlistGalleryPage() {
  const { data } = useGetWishlistQuery()
  const { sorts } = useSortContext<WishlistItem>()
  const sortedItems = useMultiSort(data?.items ?? [], sorts)

  return (
    <SortProvider<WishlistItem>>
      <div>
        <GalleryFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        >
          {/* Custom filters */}
          <SortButton sortableFields={SORTABLE_FIELDS} />
        </GalleryFilterBar>

        <GalleryGrid items={sortedItems} />
      </div>
    </SortProvider>
  )
}
```

### Testing Standards

From `/docs/architecture/coding-standards.md`:

- Test framework: Vitest + React Testing Library
- Test files: `__tests__/ComponentName.test.tsx`
- Minimum coverage: 45% global
- Use semantic queries: `getByRole`, `getByLabelText`

### File Structure

```
packages/core/gallery/src/
  components/
    SortButton.tsx
    SortPopover.tsx
    __tests__/
      SortButton.test.tsx
      SortPopover.test.tsx
  contexts/
    SortContext.tsx
    __tests__/
      SortContext.test.tsx
  hooks/
    useMultiSort.ts
    __tests__/
      useMultiSort.test.ts
  types/
    sort.ts
  index.ts
```

## Testing

### SortContext Tests

- [ ] Adds sort column with correct priority
- [ ] Prevents adding more than max sorts (3)
- [ ] Updates sort column field and direction
- [ ] Removes sort column and recalculates priorities
- [ ] Reorders sorts and recalculates priorities
- [ ] Clears all sorts
- [ ] Throws error when used outside provider

### useMultiSort Tests

- [ ] Returns original items when no sorts applied
- [ ] Sorts by single column ascending
- [ ] Sorts by single column descending
- [ ] Sorts by multiple columns with priority
- [ ] Handles null/undefined values (pushes to end)
- [ ] Sorts strings alphabetically
- [ ] Sorts numbers numerically
- [ ] Sorts dates chronologically
- [ ] Debounces sort recalculation by 200ms

### SortButton Tests

- [ ] Shows sort icon and count badge
- [ ] Badge displays correct active sort count
- [ ] Opens popover on click
- [ ] Renders SortPopover in popover content

### SortPopover Tests

- [ ] Shows "No sort applied" when sorts empty
- [ ] Renders all active sort rows
- [ ] Each row shows priority label (Primary, Secondary, Tertiary)
- [ ] Field dropdown shows all sortable fields
- [ ] Direction toggle switches between asc/desc
- [ ] Remove button removes sort column
- [ ] Drag-and-drop reorders sort priority
- [ ] "Add sort column" button adds new sort
- [ ] "Add sort column" disabled when max sorts reached (3)
- [ ] "Clear all" button clears all sorts

## Definition of Done

- [ ] Users can add up to 3 sort columns
- [ ] Sort priority reorderable via drag-and-drop
- [ ] Each column has independent direction toggle
- [ ] Visual indicators show active sorts and priority
- [ ] SortButton integrated with GalleryFilterBar
- [ ] All tests pass (minimum 45% coverage)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Code reviewed and merged

## Review Concerns

> **Review Date:** 2025-12-28
> **Reviewed By:** PM (John), UX (Sally), SM (Bob)
> **Decision:** FAIL

### Blocking Issues

**[1] PM - dependencies:** RESOLVED - glry-1001 split into focused stories (glry-1001a/b/c)
- *Update 2025-12-28:* Original glry-1001 has been split into three focused stories:
  - **glry-1001a**: Generic Filter State Management (useGalleryState, FilterContext, URL sync) - Foundation for both filtering and sorting
  - **glry-1001b**: Filter Helper Components (TextFilter, NumberFilter, etc.)
  - **glry-1001c**: Datatable Column Filtering (advanced filtering with operators)
- *Recommendation:* glry-1002 now depends on **glry-1001a only**. Story can proceed once glry-1001a reaches READY status. Sort state can leverage FilterContext or use separate SortContext as designed below.

**[2] PM - requirements:** Relationship to existing useGalleryState hook is unclear
- *Current Reality:* useGalleryState currently only supports single field/direction sort. New SortContext adds multi-sort.
- *Update 2025-12-28:* glry-1001a will enhance useGalleryState to support generic state including sorts. This story should align with glry-1001a's approach.
- *Suggestion:* Clarify strategy: Will glry-1002 extend the enhanced useGalleryState from glry-1001a or introduce separate SortContext? Document backwards compatibility and migration path for existing consumers.

**[3] SM - technical:** VERIFY - useDebouncedValue hook must exist in @repo/ui/hooks
- *Suggestion:* Confirm @repo/ui exports useDebouncedValue before implementation begins. If not, add implementation to story scope or create blocking dependency task.

**[4] UX - accessibility:** No ARIA labels on SortButton - screen readers cannot announce sort state
- *Suggestion:* Add aria-label="Sort by (2 active)" and aria-expanded when popover open. Badge should be aria-label="2 sorts active".

**[5] UX - accessibility:** Popover content has no semantic structure
- *Suggestion:* Wrap SortPopover in `<div role="dialog" aria-labelledby="sort-title">`. Add `<h3 id="sort-title">Sort by</h3>`.

**[6] UX - accessibility:** Drag handle lacks keyboard alternative - keyboard users cannot reorder
- *Suggestion:* Provide keyboard shortcut buttons (up/down arrows) beside drag handle. Or use button with aria-label="Move Primary sort up".

**[7] UX - accessibility:** Direction toggle missing aria-pressed and aria-label
- *Suggestion:* Add aria-label="Sort ascending" or "Sort descending" and aria-pressed="true/false" to direction button.

**[8] UX - accessibility:** Keyboard navigation order undefined - Tab order through controls
- *Suggestion:* Document Tab order: SortButton → Field dropdown → Direction button → Remove button → Add sort button (per sort row). Drag handle after button focus.

**[9] UX - interaction:** Drag-and-drop reordering interaction details missing
- *Suggestion:* Specify grab cursor appearance, drop zone feedback (visual insertion line), and animation on drop. Define touch drag on mobile.

**[10] UX - interaction:** No feedback specified for sort application
- *Suggestion:* Add visual feedback in sort row showing preview of sort order (e.g., "Ascending: A→Z" icon) and count badge update animation.

**[11] UX - responsive:** Mobile touch target sizes not specified - buttons may be too small
- *Suggestion:* Enforce minimum 44x44px for all buttons (Remove, Direction, Field dropdown trigger) on touch devices per WCAG standards.

**[12] UX - responsive:** Popover width w-96 (384px) exceeds many mobile screens
- *Suggestion:* Make popover responsive: w-full max-w-96 on mobile, ensure 16px padding inside narrow viewports. Stack elements vertically below 640px.

**[13] UX - state:** Loading state completely absent - no isFiltering indicator
- *Suggestion:* Add loading spinner/skeleton to sort rows during 200ms debounce window. Update button to show "Sorting..." or spinner.

**[14] UX - state:** Error state undefined - no handling for invalid sort configurations
- *Suggestion:* Define error scenarios: field not found, type mismatch, null comparisons. Show error message in sort row with recovery action.

### Should-Fix Issues

**[15] PM - scope:** Story scope too large for single implementation
- *Suggestion:* Consider splitting into 2 stories: (1) glry-1002A: Core sort state/components (independent), (2) glry-1002B: Integration with GalleryFilterBar/Gallery (depends on glry-1001 completion).

**[16] PM - requirements:** AC #19 mentions URL query params but format not specified
- *Suggestion:* Document URL structure: ?sorts=name:asc,price:desc or similar. Show example URL in Dev Notes. Clarify integration with useGalleryUrl hook.

**[17] PM - acceptance_criteria:** AC #17-18 are implementation details, not user outcomes
- *Suggestion:* Reframe as: "Sorting performance is fast enough that users perceive instant updates for datasets up to 1000 items." Move debounce/memory sort to Dev Notes.

**[18] PM - acceptance_criteria:** AC #20 "Sort works across all view modes" contradicts glry-1001 AC about filter mode switching
- *Suggestion:* Document explicit behavior: "Sorts persist independently of filter mode. Switching from full-text search to column filters does not affect active sorts."

**[19] PM - acceptance_criteria:** Missing AC for maximum sort columns enforcement UI feedback
- *Suggestion:* Add AC: "When 3 sorts are active, the Add Sort button is disabled with tooltip explaining limit"

**[20] PM - acceptance_criteria:** No AC for fallback/error handling if sort operation fails
- *Suggestion:* Add AC: "Invalid sort configurations gracefully degrade to no sort; errors logged to console"

**[21] PM - acceptance_criteria:** No AC for sort badge accessibility
- *Suggestion:* Add AC: "Sort button shows aria-label with count (e.g., "Sort, 2 columns active") and updates dynamically"

**[22] UX - user_flow:** Happy path unclear for first-time users
- *Suggestion:* Add visual diagram showing SortButton location in GalleryFilterBar toolbar. Define entry point prominence.

**[23] UX - interaction:** Direction toggle interaction unclear - icons may confuse users
- *Suggestion:* Clarify visual treatment - consider using sort order preview (A→Z vs Z→A icons) or modal confirmation of direction change impact.

**[24] UX - interaction:** Drag handles not described for mobile touch targets
- *Suggestion:* Specify minimum 44x44px touch target size for drag handle. Define if full row is draggable or handle only.

**[25] UX - interaction:** Field dropdown interaction - no guidance on duplicate sorts
- *Suggestion:* Define if duplicate sorts are allowed/prevented. If prevented, disable already-selected fields in dropdown or show error.

**[26] UX - visual:** Popover width fixed at w-96 - may be too wide on tablet/mobile
- *Suggestion:* Make popover width responsive: w-full on mobile, w-96 on desktop. Max-width constraint for readability on large screens.

**[27] UX - state:** URL persistence mentioned but format not specified
- *Suggestion:* Document URL structure: ?sorts=name:asc,price:desc or similar. Show example URL in Dev Notes.

**[28] UX - accessibility:** Badge count lacks aria-live announcement
- *Suggestion:* Wrap badge in `<span aria-live="polite" aria-atomic="true">2</span>` to announce sort count changes to screen readers.

**[29] UX - accessibility:** Focus management on remove - where does focus move after deleting?
- *Suggestion:* Focus should move to next sort remove button, or to Add Sort button if it was last sort. Document this behavior.

**[30] UX - accessibility:** Remove button (X) lacks descriptive aria-label
- *Suggestion:* Change aria-label from empty to "Remove primary sort" based on priority and field name.

**[31] UX - responsive:** SortRow layout with gap-2 may crowd on mobile
- *Suggestion:* Stack row elements vertically on mobile (flex-col), keep horizontal on desktop (flex-row). Test at 320px, 375px, 768px widths.

**[32] UX - responsive:** Drag handle grab cursor less discoverable on touch
- *Suggestion:* Add visual indicator (dots icon ≡ instead of GripVertical, or light background highlight on hover). Test touch drag on iPad.

**[33] SM - references:** Reference format inconsistent
- *Suggestion:* Replace "Epic 3 - Shared Gallery Components" with actual file path: docs/stories/epic-3-shared-gallery/README.md or similar.

**[34] SM - references:** Critical info from glry-1000 and glry-1001 not summarized
- *Suggestion:* Add brief summary (1-2 sentences each) of what glry-1000 and glry-1001 deliver for context.

**[35] SM - self_containment:** Max 3 columns choice not explained
- *Suggestion:* Explicitly state why max is 3 columns (UX complexity, performance consideration?).

**[36] SM - self_containment:** Sort priority behavior when removing column unclear
- *Suggestion:* Add one sentence: "Priority determines sort order application: 0=applied first (primary), 1=applied second (secondary), 2=applied third (tertiary). When removing a column, remaining columns automatically shift priorities down."

**[37] SM - testing:** Missing browser compatibility test for drag-drop
- *Suggestion:* Add test: "DragEndEvent behavior works across browsers (Chrome, Firefox, Safari)"

**[38] SM - testing:** Missing URL persistence integration test
- *Suggestion:* Add test: "URL persistence: sort state survives page reload"

**[39] SM - testing:** Missing keyboard accessibility test
- *Suggestion:* Add test: "Keyboard accessibility: Tab through popover, Enter to toggle direction, Escape to close"

**[40] SM - testing:** Missing performance test
- *Suggestion:* Add test: "Performance: sorting 1000+ items completes within 200ms debounce window"

### Notes

**[41] PM - user_value:** Story framed from developer vs end-user perspective
- *Observation:* While developer-focused is acceptable for infrastructure, consider emphasizing user benefit (better search/discovery)

**[42] UX - component_reuse:** SortButton and SortPopover could be split differently
- *Observation:* Current separation is good, but consider extracting SortRow as independent component for testing/reuse.

---

## Change Log

| Date       | Version | Description | Author   |
| ---------- | ------- | ----------- | -------- |
| 2025-12-28 | 0.1     | Initial draft from wish-2005 note | SM Agent |
| 2025-12-28 | 0.2     | Review: FAIL - 14 blocking, 26 should-fix concerns identified | PM/UX/SM Review |
