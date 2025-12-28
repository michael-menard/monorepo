# Story sets-2008: Empty States & Loading

## Status

Draft

## Consolidates

- sets-1018: Empty States

## Story

**As a** user,
**I want** helpful empty states and loading indicators throughout the Sets Gallery,
**So that** I understand what's happening and what to do when there's no content.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - Empty States section

## Dependencies

- **sets-2001**: Sets Gallery MVP (for integration points)

## Acceptance Criteria

### Empty States

1. [ ] Empty collection (new user): Friendly message with Add CTA
2. [ ] Empty collection with Wishlist items: Suggest checking Wishlist
3. [ ] No search/filter results: Clear filters button
4. [ ] No built sets (filtered): Encouraging message
5. [ ] No images on set: Placeholder with upload prompt
6. [ ] No MOC links: Prompt to link MOC
7. [ ] Each empty state has appropriate icon and action

### Loading States

8. [ ] Gallery skeleton while fetching
9. [ ] Detail page skeleton
10. [ ] Form skeleton on edit page
11. [ ] Smooth transitions between states

## Tasks / Subtasks

### Task 1: Create EmptyState Base Component (AC: 7)

- [ ] Reusable EmptyState component
- [ ] Props: icon, title, description, action, secondaryAction
- [ ] Consistent styling

### Task 2: Gallery Empty States (AC: 1-4)

- [ ] New user: no sets at all
- [ ] No filter results
- [ ] Filtered to "Built" with none built

### Task 3: Detail Page Empty States (AC: 5, 6)

- [ ] No images section
- [ ] No MOC links section

### Task 4: Loading Skeletons (AC: 8-10)

- [ ] GallerySkeleton for gallery page
- [ ] DetailPageSkeleton for detail page
- [ ] FormSkeleton for edit page

### Task 5: Integrate into Pages (AC: 11)

- [ ] Add skeletons to loading states
- [ ] Add empty states to appropriate components
- [ ] Ensure smooth transitions

## Dev Notes

### Base EmptyState Component

```typescript
// components/EmptyState/index.tsx
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button
          variant={action.variant ?? 'default'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button
          variant="link"
          onClick={secondaryAction.onClick}
          className="mt-2"
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  )
}
```

### Gallery Empty States

```typescript
// In SetsGalleryPage
function GalleryContent({ data, state, updateUrl }: GalleryContentProps) {
  const navigate = useNavigate()
  const hasFilters = state.search || state.theme || state.isBuilt !== undefined

  if (data?.items.length === 0) {
    if (hasFilters) {
      // No filter results
      return (
        <EmptyState
          icon={SearchX}
          title="No sets match your filters"
          description="Try adjusting your search or filters to find what you're looking for."
          action={{
            label: 'Clear Filters',
            onClick: () => updateUrl({
              search: undefined,
              theme: undefined,
              isBuilt: undefined,
              tags: undefined,
            }),
            variant: 'outline',
          }}
        />
      )
    }

    // Truly empty collection
    return (
      <EmptyState
        icon={Package}
        title="Your collection is empty"
        description="Add your first LEGO or alt-brick set to start tracking your collection."
        action={{
          label: 'Add Set',
          onClick: () => navigate({ to: '/sets/add' }),
        }}
        secondaryAction={{
          label: 'Check your Wishlist',
          onClick: () => navigate({ to: '/wishlist' }),
        }}
      />
    )
  }

  // Special case: filtered to "Built" but none are built
  if (state.isBuilt === true && data?.pagination.total === 0) {
    return (
      <EmptyState
        icon={Hammer}
        title="None of your sets are currently built"
        description="Time to start building! Mark a set as built when you complete it."
        action={{
          label: 'View All Sets',
          onClick: () => updateUrl({ isBuilt: undefined }),
          variant: 'outline',
        }}
      />
    )
  }

  // Render gallery grid
  return (
    <GalleryGrid>
      {data?.items.map((set) => (
        <SetCard key={set.id} set={set} />
      ))}
    </GalleryGrid>
  )
}
```

### Detail Page Empty States

```typescript
// No images
function ImagesSection({ set, onEdit }: { set: Set; onEdit: () => void }) {
  if (set.images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ImageIcon}
            title="No images yet"
            description="Add photos of your set to make it easier to identify."
            action={{
              label: 'Add Images',
              onClick: onEdit,
              variant: 'outline',
            }}
          />
        </CardContent>
      </Card>
    )
  }

  // Render images...
}

// No notes
function NotesSection({ set }: { set: Set }) {
  if (!set.notes) {
    return null // Just don't render the section
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{set.notes}</p>
      </CardContent>
    </Card>
  )
}
```

### Gallery Skeleton

```typescript
export function GallerySkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card overflow-hidden">
          <Skeleton className="aspect-[4/3]" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Detail Page Skeleton

```typescript
export function DetailPageSkeleton() {
  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-20" />
        <div className="flex-1">
          <Skeleton className="h-8 w-64 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Images */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

### Form Skeleton

```typescript
export function FormSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="space-y-6">
        {/* Form sections */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-4 justify-end">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}
```

### Empty States Summary Table

| Scenario | Icon | Title | Description | Action |
|----------|------|-------|-------------|--------|
| Empty collection (new) | Package | "Your collection is empty" | "Add your first set..." | Add Set + Check Wishlist |
| No filter results | SearchX | "No sets match your filters" | "Try adjusting..." | Clear Filters |
| No built sets | Hammer | "None of your sets are built" | "Time to start building!" | View All Sets |
| No images | Image | "No images yet" | "Add photos..." | Add Images |
| No MOC links | Blocks | "Not linked to any MOCs" | - | Link to MOC |

## Testing

- [ ] Empty collection shows Add Set CTA
- [ ] Empty collection shows Wishlist link
- [ ] No filter results shows Clear Filters
- [ ] Clear Filters resets all filters
- [ ] No built sets shows encouraging message
- [ ] No images shows upload prompt
- [ ] No MOC links shows link button
- [ ] Each empty state has appropriate icon
- [ ] Actions navigate correctly
- [ ] Gallery skeleton shows while loading
- [ ] Detail skeleton shows while loading
- [ ] Form skeleton shows while loading
- [ ] Transitions are smooth (no jarring flashes)

## Definition of Done

- [ ] All empty states provide clear guidance
- [ ] Loading skeletons match content layout
- [ ] Transitions are smooth
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1018              | Claude |
