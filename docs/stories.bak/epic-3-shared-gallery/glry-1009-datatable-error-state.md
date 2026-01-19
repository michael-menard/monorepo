# Story glry-1009: Datatable Error State

## Status

Draft

## Story

**As a** user experiencing a data loading error,
**I want** a clear error message with a retry option,
**so that** I can attempt to reload the data without refreshing the entire page.

## Dependencies

- **glry-1006**: Datatable Foundation - Wishlist Only (REQUIRED)

## Acceptance Criteria

1. `GalleryTableError` component displays when data fetch fails
2. Shows error icon (`AlertCircle` from lucide-react)
3. Displays user-friendly error message (not technical details)
4. "Try Again" button triggers retry via `onRetry` callback
5. Center-aligned in table container
6. Error announced to screen readers via `aria-live="assertive"`
7. Button disabled while retry in progress
8. Maintains table height to prevent layout shift

## Tasks / Subtasks

### Task 1: Create GalleryTableError Component (AC: 1, 2, 3, 4)

- [ ] Create `packages/core/gallery/src/components/GalleryTableError.tsx`
- [ ] Define Zod schema for props:
  - `error: z.instanceof(Error)`
  - `onRetry?: z.function()`
  - `isRetrying?: z.boolean()`
  - `className?: z.string()`
- [ ] Import `AlertCircle` icon from lucide-react
- [ ] Use shadcn `Button` for retry CTA
- [ ] Display generic user-friendly message (don't expose technical details)

### Task 2: Style Error State (AC: 5, 8)

- [ ] Center align with `flex items-center justify-center`
- [ ] Minimum height matching table height
- [ ] Icon: `AlertCircle` in error color (red/destructive)
- [ ] Icon size: 48px (w-12 h-12)
- [ ] Text hierarchy: title (text-lg font-semibold), body (text-sm text-muted-foreground)

### Task 3: Implement Retry Logic (AC: 4, 7)

- [ ] "Try Again" button calls `onRetry()` when clicked
- [ ] Button disabled when `isRetrying={true}`
- [ ] Show loading spinner on button during retry
- [ ] Button hidden if `onRetry` not provided

### Task 4: Add Accessibility (AC: 6)

- [ ] Add `role="alert"` to container
- [ ] Add `aria-live="assertive"` for immediate screen reader announcement
- [ ] Descriptive button label: "Try loading again"
- [ ] Test with screen reader (should announce error immediately)

### Task 5: Integrate with GalleryDataTable (AC: 1)

- [ ] Show error state when `error` prop truthy
- [ ] Replace table body with error component
- [ ] Pass error object and retry handler from parent
- [ ] Clear error state on successful retry

### Task 6: Write Tests (AC: 1-7)

- [ ] Test error component renders with error message
- [ ] Test "Try Again" button calls onRetry
- [ ] Test button disabled during retry
- [ ] Test ARIA attributes present
- [ ] Test loading spinner shows during retry
- [ ] Achieve 80% coverage

## Dev Notes

### Component Pattern

```typescript
import { AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@repo/ui'

const GalleryTableErrorPropsSchema = z.object({
  error: z.instanceof(Error),
  onRetry: z.function().args().returns(z.void()).optional(),
  isRetrying: z.boolean().optional().default(false),
  className: z.string().optional(),
})

type GalleryTableErrorProps = z.infer<typeof GalleryTableErrorPropsSchema>

export function GalleryTableError({
  error,
  onRetry,
  isRetrying = false,
  className,
}: GalleryTableErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="w-12 h-12 text-destructive mb-4" aria-hidden="true" />
      <h3 className="text-lg font-semibold mb-2">Failed to load items</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Something went wrong while loading your wishlist. Please try again.
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          aria-label="Try loading again"
        >
          {isRetrying ? 'Loading...' : 'Try Again'}
        </Button>
      )}
    </div>
  )
}
```

### Error Handling Best Practices

[Source: docs/architecture/coding-standards.md#error-handling]

**Never expose technical details to users:**
```typescript
// ✅ Good - Generic user-friendly message
<p>Something went wrong. Please try again.</p>

// ❌ Bad - Exposes technical details
<p>Error: {error.message}</p> // Could expose stack traces, DB errors
```

**Log errors for debugging:**
```typescript
import { logger } from '@repo/logger'

if (error) {
  logger.error('Failed to fetch wishlist items', {
    error,
    userId,
    timestamp: new Date().toISOString(),
  })
}
```

### Integration Example

```typescript
function WishlistGallery() {
  const { data, error, isLoading, refetch, isFetching } = useGetWishlistQuery()

  if (error) {
    return (
      <GalleryTableError
        error={error}
        onRetry={refetch}
        isRetrying={isFetching}
      />
    )
  }

  // ... rest of component
}
```

## Testing

```typescript
describe('GalleryTableError', () => {
  it('renders error message', () => {
    const error = new Error('Network error')
    render(<GalleryTableError error={error} />)

    expect(screen.getByText(/failed to load items/i)).toBeInTheDocument()
  })

  it('calls onRetry when button clicked', async () => {
    const mockOnRetry = vi.fn()
    const user = userEvent.setup()

    render(
      <GalleryTableError
        error={new Error('test')}
        onRetry={mockOnRetry}
      />
    )

    await user.click(screen.getByRole('button', { name: /try loading again/i }))
    expect(mockOnRetry).toHaveBeenCalled()
  })

  it('disables button during retry', () => {
    render(
      <GalleryTableError
        error={new Error('test')}
        onRetry={vi.fn()}
        isRetrying={true}
      />
    )

    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] `GalleryTableError` component created
- [ ] Retry functionality working
- [ ] User-friendly error messages (no technical details)
- [ ] Accessibility verified (aria-live, role)
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
