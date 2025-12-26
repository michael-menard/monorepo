# Story 3.1.55: Recently Deleted Section

## GitHub Issue
- Issue: #279
- URL: https://github.com/michael-menard/monorepo/issues/279
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** to see my recently deleted MOCs in a dedicated section,
**so that** I can decide which ones to restore before they're permanently deleted.

## Epic Context

This is **Story 2.3 of Epic 2: Delete UX & Frontend** from the Delete MOC Instructions PRD.

**⚠️ PACKAGE REQUIREMENT:** `RecentlyDeletedList` and `ExpiringBadge` MUST be created in `/packages` for reuse.

## Blocked By

- Story 3.1.50 (List Deleted Endpoint)
- Story 3.1.53 (Delete Entry Points)

## Acceptance Criteria

1. "Recently Deleted" section in Dashboard (hidden if empty)
2. Shows list of soft-deleted MOCs with: title, deleted date, days remaining
3. Visual warning for items expiring soon (three-tier: normal/warning/critical)
4. "Restore" button for each item
5. Link to full "Recently Deleted" page if > 3 items
6. Empty state: "No recently deleted MOCs"

## Tasks / Subtasks

- [ ] **Task 1: Create RecentlyDeletedList Component** (AC: 1, 2, 6)
  - [ ] Create in `/packages` (CRITICAL — not in app)
  - [ ] Generic component: accepts `items[]` with entity metadata
  - [ ] Props: `items`, `onRestore`, `entityType`, `maxItems`
  - [ ] Render empty state if no items

- [ ] **Task 2: Create ExpiringBadge Component** (AC: 3)
  - [ ] Create in `/packages` as reusable badge
  - [ ] Three-tier visual treatment based on `daysRemaining`:
    - Normal (>7 days): gray text, no badge
    - Warning (3-7 days): amber badge "Expiring soon"
    - Critical (<3 days): red badge "Expires tomorrow!" / "Expires in X days"

- [ ] **Task 3: Dashboard Integration** (AC: 1, 5)
  - [ ] Add section to Dashboard page
  - [ ] Fetch data from GET `/mocs/deleted`
  - [ ] Show max 3 items with "View all" link
  - [ ] Hide section entirely if no deleted MOCs

- [ ] **Task 4: Restore Button** (AC: 4)
  - [ ] Add restore button to each item
  - [ ] Wire up to restore API (Story 3.1.56)
  - [ ] Optimistic UI: remove from list on click

- [ ] **Task 5: Full Page Route** (AC: 5)
  - [ ] Create `/my-instructions/deleted` route
  - [ ] Use same RecentlyDeletedList with pagination
  - [ ] Back link to Dashboard

## Dev Notes

### Package Location (CRITICAL)

[Source: PRD delete-moc-instructions.md#Section-3]

```
packages/core/app-component-library/src/
├── RecentlyDeletedList/
│   ├── index.tsx
│   ├── __tests__/
│   └── __types__/
└── ExpiringBadge/
    ├── index.tsx
    ├── __tests__/
    └── __types__/
```

### ExpiringBadge Three-Tier Treatment

[Source: PRD delete-moc-instructions.md#Section-3]

```tsx
// packages/core/app-component-library/src/ExpiringBadge/index.tsx
export function ExpiringBadge({ daysRemaining }: { daysRemaining: number }) {
  if (daysRemaining > 7) return null  // Normal: no badge

  if (daysRemaining <= 2) {
    // Critical
    return (
      <Badge variant="destructive" role="alert" aria-live="assertive">
        🔴 {daysRemaining <= 1 ? 'Expires tomorrow!' : `Expires in ${daysRemaining} days`}
      </Badge>
    )
  }

  // Warning (3-7 days)
  return (
    <Badge variant="warning" role="status" aria-live="polite">
      ⚠️ Expiring soon
    </Badge>
  )
}
```

### RecentlyDeletedList Generic Props

```typescript
export const RecentlyDeletedListPropsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    deletedAt: z.string(),
    daysRemaining: z.number(),
    thumbnailUrl: z.string().optional(),
  })),
  onRestore: z.function(),
  entityType: z.string().default('item'),
  maxItems: z.number().optional(),
  showViewAll: z.boolean().default(false),
  viewAllHref: z.string().optional(),
})
```

### Dashboard Section

```tsx
// apps/web/main-app/src/pages/Dashboard/components/RecentlyDeletedSection.tsx
const { data } = useGetDeletedMocsQuery({ limit: 3 })

if (!data?.items?.length) return null

return (
  <section>
    <h2>Recently Deleted</h2>
    <RecentlyDeletedList
      items={data.items}
      onRestore={handleRestore}
      entityType="MOC"
      showViewAll={data.hasMore}
      viewAllHref="/my-instructions/deleted"
    />
  </section>
)
```

## Testing

### Test Location
- `packages/core/app-component-library/src/RecentlyDeletedList/__tests__/`
- `packages/core/app-component-library/src/ExpiringBadge/__tests__/`

### Test Requirements
- Unit: Renders empty state when no items
- Unit: Renders items with correct data
- Unit: ExpiringBadge shows correct tier
- Unit: Restore button calls onRestore
- Unit: View all link shown when hasMore

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

- `packages/core/app-component-library/src/RecentlyDeletedList/` - New
- `packages/core/app-component-library/src/ExpiringBadge/` - New
- `apps/web/main-app/src/pages/Dashboard/` - Modified
- `apps/web/main-app/src/pages/MyInstructions/Deleted.tsx` - New

