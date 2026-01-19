# Story glry-1008: Datatable Empty States

## Status

Draft

## Story

**As a** user viewing an empty datatable,
**I want** clear messaging about why there's no data,
**so that** I understand what to do next (add items or clear filters).

## Dependencies

- **glry-1006**: Datatable Foundation - Wishlist Only (REQUIRED)

## Acceptance Criteria

1. `GalleryTableEmpty` component with two variants: `no-items` and `no-results`
2. **No-items variant**: "Your wishlist is empty" with "Add Item" CTA
3. **No-results variant**: "No results match your filters" with "Clear Filters" CTA
4. Icons: `Inbox` for no-items, `SearchX` for no-results (lucide-react)
5. Center-aligned in table container
6. Maintains consistent height to prevent layout shift
7. CTAs trigger appropriate actions (`onAddItem`, `onClearFilters`)
8. Accessible with proper ARIA labels

## Tasks / Subtasks

### Task 1: Create GalleryTableEmpty Component (AC: 1, 2, 3, 4)

- [ ] Create `packages/core/gallery/src/components/GalleryTableEmpty.tsx`
- [ ] Define Zod schema for props:
  - `variant: z.enum(['no-items', 'no-results'])`
  - `onClearFilters?: z.function()`
  - `onAddItem?: z.function()`
  - `className?: z.string()`
- [ ] Conditionally render based on variant
- [ ] Import `Inbox`, `SearchX` from lucide-react
- [ ] Use shadcn `Button` for CTAs

### Task 2: Style Empty State (AC: 5, 6)

- [ ] Center align with `flex items-center justify-center`
- [ ] Set minimum height matching table height
- [ ] Icon size: 48px (w-12 h-12)
- [ ] Text hierarchy: title (text-lg font-semibold), body (text-sm text-muted-foreground)
- [ ] CTA button: primary for no-items, secondary for no-results

### Task 3: Wire Up Actions (AC: 7)

- [ ] "Add Item" button calls `onAddItem()`
- [ ] "Clear Filters" button calls `onClearFilters()`
- [ ] Buttons disabled when handlers not provided
- [ ] Add proper button labels and ARIA

### Task 4: Add Accessibility (AC: 8)

- [ ] Add `role="status"` to container
- [ ] Add `aria-live="polite"` for screen reader announcements
- [ ] Descriptive button labels
- [ ] Test with screen reader

### Task 5: Integrate with GalleryDataTable (AC: 1-7)

- [ ] Show `no-items` variant when `items.length === 0` and no filters active
- [ ] Show `no-results` variant when `items.length === 0` and filters active
- [ ] Replace table body with empty state component
- [ ] Pass appropriate handlers from parent

### Task 6: Write Tests (AC: 1-8)

- [ ] Test no-items variant renders correctly
- [ ] Test no-results variant renders correctly
- [ ] Test "Add Item" button calls onAddItem
- [ ] Test "Clear Filters" button calls onClearFilters
- [ ] Test ARIA labels present
- [ ] Achieve 80% coverage

## Dev Notes

### Component Pattern

```typescript
const GalleryTableEmptyPropsSchema = z.object({
  variant: z.enum(['no-items', 'no-results']),
  onClearFilters: z.function().args().returns(z.void()).optional(),
  onAddItem: z.function().args().returns(z.void()).optional(),
  className: z.string().optional(),
})

type GalleryTableEmptyProps = z.infer<typeof GalleryTableEmptyPropsSchema>

export function GalleryTableEmpty({
  variant,
  onClearFilters,
  onAddItem,
  className,
}: GalleryTableEmptyProps) {
  if (variant === 'no-items') {
    return (
      <div className="flex flex-col items-center justify-center py-16" role="status">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start adding items to organize your LEGO wish list
        </p>
        {onAddItem && (
          <Button onClick={onAddItem}>Add Your First Item</Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16" role="status">
      <SearchX className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
      <h3 className="text-lg font-semibold mb-2">No results found</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Try adjusting your filters to find what you're looking for
      </p>
      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>Clear Filters</Button>
      )}
    </div>
  )
}
```

## Testing

```typescript
describe('GalleryTableEmpty', () => {
  it('renders no-items variant', () => {
    render(<GalleryTableEmpty variant="no-items" />)
    expect(screen.getByText(/your wishlist is empty/i)).toBeInTheDocument()
  })

  it('calls onAddItem when button clicked', async () => {
    const mockOnAddItem = vi.fn()
    const user = userEvent.setup()

    render(<GalleryTableEmpty variant="no-items" onAddItem={mockOnAddItem} />)
    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(mockOnAddItem).toHaveBeenCalled()
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] `GalleryTableEmpty` component created
- [ ] Both variants implemented
- [ ] CTAs wired up correctly
- [ ] Accessibility verified
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
