# Story insp-2017: MOC Linking

## Status

Draft

## Consolidates

- insp-1039.link-inspiration-to-moc-endpoint
- insp-1040.link-album-to-moc-endpoint
- insp-1041.moc-link-ui
- insp-1042.unlink-moc

## Story

**As a** user,
**I want** to link inspirations and albums to my MOC Instructions,
**so that** I can connect visual references to my build projects.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - Core Concepts > MOC Link, CRUD Operations > Update > Link to MOC

## Dependencies

- **insp-2000**: Database Schema & Shared Types (junction tables)
- **insp-2002**: Inspiration Gallery MVP
- **insp-2007**: Album Gallery & View
- MOC Instructions CRUD (Epic 4 - existing)

## Acceptance Criteria

### Link Inspiration to MOC

1. POST /api/inspirations/:id/mocs links to MOC
2. Accepts { mocId }
3. Creates entry in inspiration_mocs junction table
4. Returns updated inspiration with mocIds
5. Idempotent: re-linking existing MOC is no-op

### Unlink Inspiration from MOC

6. DELETE /api/inspirations/:id/mocs/:mocId unlinks
7. Removes entry from inspiration_mocs
8. Returns 204 No Content
9. No error if not linked

### Link Album to MOC

10. POST /api/albums/:id/mocs links album to MOC
11. DELETE /api/albums/:id/mocs/:mocId unlinks
12. Same behavior as inspiration linking

### Link UI

13. "Link to MOC" action in inspiration detail view
14. Opens MOC picker dialog
15. Shows user's MOCs with search/filter
16. Can select multiple MOCs
17. Shows which MOCs are already linked
18. Save adds/removes links

### Linked MOCs Display

19. Detail view shows "Linked MOCs:" section
20. Each MOC shown as clickable badge
21. Clicking navigates to MOC detail
22. "Unlink" action on each badge
23. "Link to MOC" action to add more

## Tasks / Subtasks

### Task 1: Create Link Inspiration Endpoints (AC: 1-5)

- [ ] Create `apps/api/endpoints/inspirations/mocs/link/handler.ts`
- [ ] Create `apps/api/endpoints/inspirations/mocs/unlink/handler.ts`
- [ ] Validate user owns inspiration
- [ ] Validate MOC exists and user owns it
- [ ] Insert/delete from inspiration_mocs

### Task 2: Create Link Album Endpoints (AC: 10-12)

- [ ] Create `apps/api/endpoints/albums/mocs/link/handler.ts`
- [ ] Create `apps/api/endpoints/albums/mocs/unlink/handler.ts`
- [ ] Same validation and logic

### Task 3: Add RTK Mutations

- [ ] Add linkInspirationToMoc mutation
- [ ] Add unlinkInspirationFromMoc mutation
- [ ] Add linkAlbumToMoc mutation
- [ ] Add unlinkAlbumFromMoc mutation

### Task 4: Create MOC Picker Modal (AC: 13-18)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/MocPickerModal/index.tsx`
- [ ] Fetch user's MOCs
- [ ] Search/filter MOCs
- [ ] Multi-select with checkboxes
- [ ] Show current links
- [ ] Save updates

### Task 5: Update Detail Views (AC: 19-23)

- [ ] Add "Linked MOCs" section to inspiration detail
- [ ] Add "Linked MOCs" section to album detail
- [ ] MOC badges with navigation
- [ ] Unlink action per badge
- [ ] "Link to MOC" trigger

## Dev Notes

### Link Endpoint

```typescript
// apps/api/endpoints/inspirations/mocs/link/handler.ts
import { db } from '@/database'
import { inspirations, inspirationMocs, mocs } from '@/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const LinkMocSchema = z.object({
  mocId: z.string().uuid(),
})

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  const inspirationId = event.pathParameters?.id

  // Verify inspiration ownership
  const inspiration = await db
    .select()
    .from(inspirations)
    .where(and(eq(inspirations.id, inspirationId), eq(inspirations.userId, userId)))
    .limit(1)
    .then(r => r[0])

  if (!inspiration) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Inspiration not found' }) }
  }

  const body = LinkMocSchema.parse(JSON.parse(event.body || '{}'))

  // Verify MOC ownership
  const moc = await db
    .select()
    .from(mocs)
    .where(and(eq(mocs.id, body.mocId), eq(mocs.userId, userId)))
    .limit(1)
    .then(r => r[0])

  if (!moc) {
    return { statusCode: 404, body: JSON.stringify({ error: 'MOC not found' }) }
  }

  // Check if already linked
  const existing = await db
    .select()
    .from(inspirationMocs)
    .where(and(
      eq(inspirationMocs.inspirationId, inspirationId),
      eq(inspirationMocs.mocId, body.mocId)
    ))
    .limit(1)
    .then(r => r[0])

  if (!existing) {
    await db.insert(inspirationMocs).values({
      inspirationId,
      mocId: body.mocId,
    })
  }

  // Get all linked MOCs
  const linkedMocs = await db
    .select({ mocId: inspirationMocs.mocId })
    .from(inspirationMocs)
    .where(eq(inspirationMocs.inspirationId, inspirationId))

  return {
    statusCode: 200,
    body: JSON.stringify({
      inspirationId,
      mocIds: linkedMocs.map(m => m.mocId),
    }),
  }
}
```

### Unlink Endpoint

```typescript
// apps/api/endpoints/inspirations/mocs/unlink/handler.ts
export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  const { id: inspirationId, mocId } = event.pathParameters

  // Verify inspiration ownership
  const inspiration = await db
    .select()
    .from(inspirations)
    .where(and(eq(inspirations.id, inspirationId), eq(inspirations.userId, userId)))
    .limit(1)
    .then(r => r[0])

  if (!inspiration) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Inspiration not found' }) }
  }

  // Delete link (no error if doesn't exist)
  await db.delete(inspirationMocs).where(
    and(
      eq(inspirationMocs.inspirationId, inspirationId),
      eq(inspirationMocs.mocId, mocId)
    )
  )

  return { statusCode: 204, body: '' }
}
```

### MOC Picker Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/MocPickerModal/index.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Checkbox,
  ScrollArea,
} from '@repo/ui'
import { Search, FileText, Check } from 'lucide-react'
import { useGetMocsQuery, useLinkInspirationToMocMutation, useUnlinkInspirationFromMocMutation } from '@repo/api-client/rtk'

interface MocPickerModalProps {
  inspirationId: string
  currentMocIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MocPickerModal({
  inspirationId,
  currentMocIds,
  open,
  onOpenChange,
  onSuccess,
}: MocPickerModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const { data: mocs } = useGetMocsQuery({ limit: 100 }, { skip: !open })
  const [linkMoc] = useLinkInspirationToMocMutation()
  const [unlinkMoc] = useUnlinkInspirationFromMocMutation()

  // Initialize with current links
  useEffect(() => {
    if (open) {
      setSelected(new Set(currentMocIds))
    }
  }, [open, currentMocIds])

  const filteredMocs = mocs?.items.filter(
    moc => moc.title.toLowerCase().includes(search.toLowerCase())
  ) || []

  const toggleMoc = (mocId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(mocId)) {
      newSelected.delete(mocId)
    } else {
      newSelected.add(mocId)
    }
    setSelected(newSelected)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const toLink = [...selected].filter(id => !currentMocIds.includes(id))
      const toUnlink = currentMocIds.filter(id => !selected.has(id))

      await Promise.all([
        ...toLink.map(mocId => linkMoc({ inspirationId, mocId }).unwrap()),
        ...toUnlink.map(mocId => unlinkMoc({ inspirationId, mocId }).unwrap()),
      ])

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to update MOC links:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to MOC</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search MOCs..."
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredMocs.map((moc) => (
                <button
                  key={moc.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  onClick={() => toggleMoc(moc.id)}
                >
                  <Checkbox
                    checked={selected.has(moc.id)}
                    onCheckedChange={() => toggleMoc(moc.id)}
                  />
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{moc.title}</p>
                  </div>
                  {currentMocIds.includes(moc.id) && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}

              {filteredMocs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {search ? 'No MOCs match your search' : 'No MOCs yet'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Linked MOCs Section

```typescript
// In inspiration detail view
{inspiration.mocIds.length > 0 && (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-muted-foreground">Linked MOCs</h3>
      <Button variant="ghost" size="sm" onClick={() => setMocPickerOpen(true)}>
        Edit
      </Button>
    </div>
    <div className="flex flex-wrap gap-2">
      {/* Would need to fetch MOC titles */}
      {inspiration.mocIds.map((mocId) => (
        <div key={mocId} className="group flex items-center">
          <Link to="/mocs/$id" params={{ id: mocId }}>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              <FileText className="w-3 h-3 mr-1" />
              MOC
            </Badge>
          </Link>
          <button
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleUnlinkMoc(mocId)}
          >
            <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
    </div>
  </div>
)}

<Button variant="outline" size="sm" onClick={() => setMocPickerOpen(true)}>
  <Link2 className="w-4 h-4 mr-2" />
  Link to MOC
</Button>
```

## Testing

### API Tests

- [ ] POST /api/inspirations/:id/mocs creates link
- [ ] Idempotent: re-linking returns success
- [ ] DELETE /api/inspirations/:id/mocs/:id removes link
- [ ] No error unlinking non-existent link
- [ ] Returns 404 for invalid inspiration/MOC
- [ ] Returns 403 for unowned resources
- [ ] Same tests for album endpoints

### Component Tests

- [ ] MOC picker shows user's MOCs
- [ ] Search filters MOCs
- [ ] Shows current links
- [ ] Can add and remove links
- [ ] Save updates correctly

### Integration Tests

- [ ] Link inspiration to MOC, view in MOC detail
- [ ] Unlink from inspiration detail
- [ ] Linked MOC navigable

## Definition of Done

- [ ] Link/unlink endpoints working
- [ ] MOC picker modal functional
- [ ] Linked MOCs display in detail views
- [ ] Navigation to linked MOCs works
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1039-1042               | Claude   |
