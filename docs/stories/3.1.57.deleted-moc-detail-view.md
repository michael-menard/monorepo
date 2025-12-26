# Story 3.1.57: Deleted MOC Detail View

## GitHub Issue
- Issue: #281
- URL: https://github.com/michael-menard/monorepo/issues/281
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** to see a deleted MOC's detail page with a restore banner,
**so that** I can review it before deciding to restore.

## Epic Context

This is **Story 2.5 of Epic 2: Delete UX & Frontend** from the Delete MOC Instructions PRD.

## Blocked By

- Story 3.1.49 (Restore Endpoint)
- Story 3.1.56 (Restore Flow)

## Acceptance Criteria

1. Deleted MOC detail page shows "Deleted" banner at top (owner-only)
2. Banner shows: "This MOC was deleted on [date]. You have [X] days to restore it."
3. Banner has "Restore" button
4. Non-owners see 404 for deleted MOCs
5. All content visible but actions disabled (edit, share, etc.)
6. Visual treatment: muted/grayed content to indicate deleted state

## Tasks / Subtasks

- [ ] **Task 1: Create DeletedBanner Component** (AC: 1, 2, 3)
  - [ ] Create in `/packages` for reuse
  - [ ] Props: `deletedAt`, `daysRemaining`, `onRestore`, `entityType`
  - [ ] Use `role="alert"` and `aria-live="polite"`

- [ ] **Task 2: MOC Detail Page Integration** (AC: 1, 4, 5, 6)
  - [ ] Check if MOC has `deletedAt` set
  - [ ] If deleted AND owner: show banner, mute content
  - [ ] If deleted AND not owner: return 404
  - [ ] Disable action buttons (edit, share, download)

- [ ] **Task 3: Visual Treatment** (AC: 6)
  - [ ] Apply `opacity-60` or similar to content area
  - [ ] Keep banner at full opacity
  - [ ] Disable interactive elements

- [ ] **Task 4: Restore from Banner** (AC: 3)
  - [ ] Wire up restore button to useRestore hook
  - [ ] On success: remove banner, restore full opacity
  - [ ] Show success toast

## Dev Notes

### Package Location

```
packages/core/app-component-library/src/
└── DeletedBanner/
    ├── index.tsx
    ├── __tests__/
    └── __types__/
```

### DeletedBanner Component

[Source: PRD delete-moc-instructions.md#Section-3]

```tsx
// packages/core/app-component-library/src/DeletedBanner/index.tsx
export function DeletedBanner({
  deletedAt,
  daysRemaining,
  onRestore,
  entityType = 'item',
  isRestoring = false,
}: DeletedBannerProps) {
  const formattedDate = format(new Date(deletedAt), 'MMM d, yyyy')

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrashIcon className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              This {entityType} was deleted on {formattedDate}
            </p>
            <p className="text-sm text-muted-foreground">
              You have {daysRemaining} days to restore it before permanent deletion.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onRestore}
          disabled={isRestoring}
        >
          {isRestoring ? <Spinner /> : 'Restore'}
        </Button>
      </div>
    </div>
  )
}
```

### MOC Detail Page Integration

```tsx
// apps/web/main-app/src/pages/MocDetail/index.tsx
const { data: moc } = useMocQuery(mocId)
const { user } = useAuth()
const isOwner = moc?.ownerId === user?.id
const isDeleted = !!moc?.deletedAt

// Non-owner viewing deleted MOC → 404
if (isDeleted && !isOwner) {
  return <NotFound />
}

return (
  <div className={isDeleted ? 'opacity-60' : ''}>
    {isDeleted && isOwner && (
      <DeletedBanner
        deletedAt={moc.deletedAt}
        daysRemaining={calculateDaysRemaining(moc.deletedAt)}
        onRestore={() => restore(moc.id)}
        entityType="MOC"
      />
    )}
    
    {/* Rest of MOC detail content */}
    <MocContent moc={moc} actionsDisabled={isDeleted} />
  </div>
)
```

### Disabled Actions

When `isDeleted` is true, disable:
- Edit button
- Share button
- Download button
- Add to collection
- Any other mutating actions

## Testing

### Test Location
- `packages/core/app-component-library/src/DeletedBanner/__tests__/`
- `apps/web/main-app/src/pages/MocDetail/__tests__/`

### Test Requirements
- Unit: Banner renders with correct date and days
- Unit: Restore button calls onRestore
- Unit: Non-owner sees 404 for deleted MOC
- Unit: Owner sees banner for deleted MOC
- Unit: Actions disabled when deleted
- Unit: Content has muted styling when deleted

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

- `packages/core/app-component-library/src/DeletedBanner/` - New
- `apps/web/main-app/src/pages/MocDetail/index.tsx` - Modified

