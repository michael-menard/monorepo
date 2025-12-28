# Story sets-1008: Set Card Component

## Status

Draft

## Story

**As a** user,
**I want** set items displayed as informative cards,
**So that** I can quickly see key details about each set.

## Acceptance Criteria

1. [ ] SetCard component displays set image thumbnail
2. [ ] Shows title and set number
3. [ ] Shows piece count
4. [ ] Shows theme badge
5. [ ] Shows build status indicator (Built/In Pieces)
6. [ ] Shows quantity badge if > 1
7. [ ] Hover shows action menu (view, edit, delete)
8. [ ] Click navigates to detail page

## Tasks

- [ ] **Task 1: Create SetCard component**
  - [ ] Create routes/sets/-components/SetCard/index.tsx
  - [ ] Use GalleryCard from @repo/gallery as base (if available)
  - [ ] Define SetCardProps interface

- [ ] **Task 2: Card content layout**
  - [ ] Image thumbnail (aspect ratio 4:3)
  - [ ] Title with truncation
  - [ ] Set number formatted (#12345)
  - [ ] Piece count with icon

- [ ] **Task 3: Status indicators**
  - [ ] Build status badge (icon + text)
  - [ ] Quantity badge overlay (if quantity > 1)
  - [ ] Theme tag

- [ ] **Task 4: Hover actions**
  - [ ] Dropdown menu on hover
  - [ ] View Details action
  - [ ] Edit action
  - [ ] Delete action (destructive styling)

## Dev Notes

### Component Structure

```typescript
// routes/sets/-components/SetCard/index.tsx
import { Set } from '@repo/api-client'

interface SetCardProps {
  set: Set
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function SetCard({ set, onClick, onEdit, onDelete }: SetCardProps) {
  return (
    <div
      className="group relative cursor-pointer rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
        {set.images[0] ? (
          <img
            src={set.images[0].thumbnailUrl ?? set.images[0].imageUrl}
            alt={set.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Quantity Badge */}
        {set.quantity > 1 && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            x{set.quantity}
          </Badge>
        )}

        {/* Hover Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.() }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.() }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete?.() }}
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium truncate">{set.title}</h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {set.setNumber && <span>#{set.setNumber}</span>}
          {set.pieceCount && (
            <span className="flex items-center gap-1">
              <Blocks className="h-3 w-3" />
              {set.pieceCount.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {set.theme && (
            <Badge variant="outline" className="text-xs">
              {set.theme}
            </Badge>
          )}

          {/* Build Status */}
          <BuildStatusBadge isBuilt={set.isBuilt} />
        </div>
      </div>
    </div>
  )
}
```

### Build Status Badge

```typescript
function BuildStatusBadge({ isBuilt }: { isBuilt: boolean }) {
  return (
    <Badge
      variant={isBuilt ? 'default' : 'secondary'}
      className="text-xs"
    >
      {isBuilt ? (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Built
        </>
      ) : (
        <>
          <Blocks className="h-3 w-3 mr-1" />
          In Pieces
        </>
      )}
    </Badge>
  )
}
```

### Accessibility

- Card is focusable and clickable
- Actions have aria-labels
- Build status uses both color AND icon per PRD

## Testing

- [ ] Unit test: renders set title
- [ ] Unit test: renders set number with # prefix
- [ ] Unit test: renders piece count formatted
- [ ] Unit test: shows theme badge
- [ ] Unit test: shows "Built" badge when isBuilt=true
- [ ] Unit test: shows "In Pieces" badge when isBuilt=false
- [ ] Unit test: shows quantity badge when quantity > 1
- [ ] Unit test: hides quantity badge when quantity = 1
- [ ] Unit test: shows placeholder when no images
- [ ] Unit test: dropdown actions call correct handlers
- [ ] Unit test: click calls onClick handler

## Dependencies

- sets-1001: Zod Schemas (Set type)
- @repo/ui: Button, Badge, DropdownMenu components

## References

- PRD: docs/prd/epic-7-sets-gallery.md (User Interface - Gallery View)
- PRD: "Build status uses both color AND icon"
