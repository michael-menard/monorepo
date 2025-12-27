# Story 3.1.53: Delete Entry Points

## GitHub Issue
- Issue: #277
- URL: https://github.com/michael-menard/monorepo/issues/277
- Status: Todo

## Status

Draft

## Story

**As an** owner of a MOC instruction package,
**I want** Delete buttons on my MOC detail page and My Instructions list,
**so that** I can initiate deletion from multiple locations.

## Epic Context

This is **Story 2.1 of Epic 2: Delete UX & Frontend** from the Delete MOC Instructions PRD.

This story adds the UI entry points for delete. The actual confirmation modal is in Story 3.1.54.

## Blocked By

- Story 3.1.48 (Delete Endpoint)
- All Epic 1 backend stories complete

## Acceptance Criteria

1. "Delete" button on MOC detail page (owner-only, destructive variant)
2. "Delete" action in My Instructions list item menu (in "More" dropdown)
3. Both open DeleteConfirmationModal
4. Non-owners see no delete option
5. Unauthenticated users don't see delete option

## Tasks / Subtasks

- [ ] **Task 1: MOC Detail Page Delete Button** (AC: 1, 3, 4, 5)
  - [ ] Add "Delete" to "More" dropdown on MOC detail page
  - [ ] Use destructive text color (red-600)
  - [ ] Only render if `isOwner` is true
  - [ ] Wire up to open DeleteConfirmationModal

- [ ] **Task 2: My Instructions List Delete Action** (AC: 2, 3, 4, 5)
  - [ ] Add "Delete" to list item's "More" dropdown menu
  - [ ] Use destructive text color
  - [ ] Only render if user is owner (always true in My Instructions)
  - [ ] Wire up to open DeleteConfirmationModal with MOC data

- [ ] **Task 3: Hook Up Modal Trigger** (AC: 3)
  - [ ] Create state for modal visibility and selected MOC
  - [ ] Pass MOC data (id, title, stats) to modal
  - [ ] Import DeleteConfirmationModal from `@repo/ui` or `@repo/delete-components`

## Dev Notes

### Component Locations

```
packages/core/app-component-library/src/    # OR @repo/delete-components
└── DeleteConfirmationModal/
    └── index.tsx

apps/web/main-app/src/
├── pages/MocDetail/
│   └── index.tsx                    # Add delete to More dropdown
└── pages/MyInstructions/
    └── components/
        └── InstructionCard.tsx      # Add delete to card menu
```

### Delete Button Placement

[Source: PRD delete-moc-instructions.md#Section-3]

Delete button is in "More" dropdown to prevent accidental clicks:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      <MoreHorizontalIcon /> More
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleEdit}>
      <EditIcon /> Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleShare}>
      <ShareIcon /> Share
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onClick={() => setDeleteModalOpen(true)}
      className="text-destructive focus:text-destructive"
    >
      <TrashIcon /> Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Owner Check Pattern

```tsx
// From auth context
const { user } = useAuth()
const isOwner = moc.ownerId === user?.id

// Only show delete if owner
{isOwner && (
  <DropdownMenuItem onClick={openDeleteModal} className="text-destructive">
    Delete
  </DropdownMenuItem>
)}
```

### Modal State Management

```tsx
const [deleteModalOpen, setDeleteModalOpen] = useState(false)
const [selectedMoc, setSelectedMoc] = useState<{ id: string; title: string } | null>(null)

const handleDeleteClick = (moc: Moc) => {
  setSelectedMoc({ id: moc.id, title: moc.title })
  setDeleteModalOpen(true)
}
```

## Testing

### Test Location
- `apps/web/main-app/src/pages/MocDetail/__tests__/MocDetail.test.tsx`
- `apps/web/main-app/src/pages/MyInstructions/__tests__/MyInstructions.test.tsx`

### Test Requirements
- Unit: Delete button visible for owner
- Unit: Delete button hidden for non-owner
- Unit: Delete button hidden for unauthenticated
- Unit: Clicking delete opens modal
- Unit: Modal receives correct MOC data

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

- `apps/web/main-app/src/pages/MocDetail/index.tsx` - Modified
- `apps/web/main-app/src/pages/MyInstructions/components/InstructionCard.tsx` - Modified

