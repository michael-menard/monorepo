# Story sets-1018: Empty States

## Status

Draft

## Story

**As a** user,
**I want** helpful empty states throughout the Sets Gallery,
**So that** I understand what to do when there's no content.

## Acceptance Criteria

1. [ ] Empty collection (new user): Friendly message with Add CTA
2. [ ] Empty collection with Wishlist items: Suggest checking Wishlist
3. [ ] No search/filter results: Clear filters button
4. [ ] No built sets (filtered): Encouraging message
5. [ ] No images on set: Placeholder with upload prompt
6. [ ] No MOC links: Prompt to link MOC
7. [ ] Each empty state has appropriate icon and action

## Tasks

- [ ] **Task 1: Create EmptyState components**
  - [ ] Reusable EmptyState base component
  - [ ] Specific variants for each scenario

- [ ] **Task 2: Gallery empty states**
  - [ ] New user: no sets at all
  - [ ] No filter results
  - [ ] Filtered to "Built" with none built

- [ ] **Task 3: Detail page empty states**
  - [ ] No images
  - [ ] No MOC links
  - [ ] No notes

- [ ] **Task 4: Integrate into existing components**
  - [ ] Gallery page
  - [ ] Detail page sections

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
    // Check if this is a filtered empty state or truly empty
    if (hasFilters) {
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

    // Truly empty - check if user has wishlist items
    // This would require a separate query or be passed as prop
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
  if (state.isBuilt === true && data?.items.length === 0) {
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
function ImagesSection({ set }: { set: Set }) {
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
              onClick: () => navigate({ to: '/sets/$setId/edit', params: { setId: set.id } }),
              variant: 'outline',
            }}
          />
        </CardContent>
      </Card>
    )
  }

  // ... render images
}

// No MOC links (in sets-1016, but empty state here)
function LinkedMocsSection({ set }: { set: Set }) {
  if (set.linkedMocs?.length === 0) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Linked MOCs</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
            <Link className="w-4 h-4 mr-2" />
            Link MOC
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Blocks className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>This set isn't linked to any MOCs.</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setLinkDialogOpen(true)}
            >
              Link to a MOC
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ... render linked MOCs
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

## Dependencies

- sets-1007: Gallery Page
- sets-1009: Detail Page

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Empty States section)
