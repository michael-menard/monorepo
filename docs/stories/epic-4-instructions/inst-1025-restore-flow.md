# Story 3.1.56: Restore Flow

## GitHub Issue
- Issue: #280
- URL: https://github.com/michael-menard/monorepo/issues/280
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** to restore a deleted MOC with one click,
**so that** I can recover from accidental deletion.

## Epic Context

This is **Story 2.4 of Epic 2: Delete UX & Frontend** from the Delete MOC Instructions PRD.

## Blocked By

- Story 3.1.49 (Restore Endpoint)
- Story 3.1.55 (Recently Deleted Section)

## Acceptance Criteria

1. "Restore" button on each deleted MOC in Recently Deleted list
2. Restore triggers API call with loading state
3. On success: remove from deleted list, show success toast
4. On error: show error toast with retry option
5. Restored MOC appears in My Instructions immediately
6. Inline undo option in success toast (optional enhancement)

## Tasks / Subtasks

- [ ] **Task 1: Create useRestore Hook** (AC: 2, 3, 4)
  - [ ] Create in `/packages` for reuse
  - [ ] Generic hook: accepts entity type and API endpoint
  - [ ] Handle loading, success, error states
  - [ ] Return `{ restore, isRestoring, error }`

- [ ] **Task 2: Wire Up Restore Button** (AC: 1, 2)
  - [ ] Connect RecentlyDeletedList restore button to hook
  - [ ] Show loading spinner during API call
  - [ ] Disable button while restoring

- [ ] **Task 3: Optimistic UI Update** (AC: 3, 5)
  - [ ] Remove item from deleted list immediately on click
  - [ ] Invalidate My Instructions query cache
  - [ ] Rollback on error

- [ ] **Task 4: Toast Notifications** (AC: 3, 4)
  - [ ] Success toast: "MOC restored successfully!" with [View MOC] link
  - [ ] Error toast: "Couldn't restore MOC. Please try again." with [Retry] button

- [ ] **Task 5: Inline Undo (Optional)** (AC: 6)
  - [ ] Add "Undo" action to success toast
  - [ ] Undo calls delete API to re-delete
  - [ ] Toast auto-dismisses after 5 seconds

## Dev Notes

### Hook Location

```
packages/core/app-component-library/src/
└── hooks/
    └── useRestore.ts    # Generic restore hook
```

### useRestore Hook Pattern

[Source: PRD delete-moc-instructions.md#Story-2.4]

```typescript
// packages/core/app-component-library/src/hooks/useRestore.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export const useRestore = <T extends { id: string }>(options: {
  restoreEndpoint: (id: string) => Promise<T>
  queryKeyToInvalidate: string[]
  entityType: string
}) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: options.restoreEndpoint,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: options.queryKeyToInvalidate })
      queryClient.invalidateQueries({ queryKey: ['deleted', options.entityType] })
      toast({
        title: `${options.entityType} restored!`,
        action: <ToastAction altText="View">View</ToastAction>,
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: `Couldn't restore ${options.entityType}`,
        description: 'Please try again.',
        action: <ToastAction altText="Retry">Retry</ToastAction>,
      })
    },
  })
}
```

### Usage in RecentlyDeletedList

```tsx
const { mutate: restore, isPending } = useRestore({
  restoreEndpoint: (id) => api.post(`/mocs/${id}/restore`),
  queryKeyToInvalidate: ['mocs'],
  entityType: 'MOC',
})

<Button
  variant="outline"
  size="sm"
  onClick={() => restore(item.id)}
  disabled={isPending}
>
  {isPending ? <Spinner /> : 'Restore'}
</Button>
```

### Toast Content

[Source: PRD delete-moc-instructions.md#Section-3]

| Scenario | Toast Content |
|----------|---------------|
| Success | "MOC restored successfully!" + [View MOC] link |
| Error | "Couldn't restore MOC. Please try again." + [Retry] button |
| Undo (optional) | Success toast includes [Undo] action for 5 seconds |

## Testing

### Test Location
- `packages/core/app-component-library/src/hooks/__tests__/useRestore.test.ts`
- `apps/web/main-app/src/pages/Dashboard/__tests__/RecentlyDeletedSection.test.tsx`

### Test Requirements
- Unit: Hook calls restore endpoint
- Unit: Hook invalidates queries on success
- Unit: Hook shows success toast
- Unit: Hook shows error toast on failure
- Unit: Button shows loading state
- Unit: Item removed from list on success

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

- `packages/core/app-component-library/src/hooks/useRestore.ts` - New
- `apps/web/main-app/src/pages/Dashboard/components/RecentlyDeletedSection.tsx` - Modified

