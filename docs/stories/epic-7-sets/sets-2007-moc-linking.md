# Story sets-2007: MOC Linking

## Status

Draft

## Consolidates

- sets-1016: MOC Linking

## Story

**As a** user,
**I want** to link my sets to MOC Instructions,
**So that** I can track which sets I used for which builds.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - MOC Linking

## Dependencies

- **sets-2000**: Database Schema & Shared Types
- **sets-2001**: Sets Gallery MVP (for detail page)
- **Epic 4: MOC Instructions** (cross-epic dependency - must be implemented)

## Pre-Conditions

**This story is conditional on MOC Instructions (Epic 4) being implemented.**

Before implementing:
- [ ] Verify MOC Instructions API exists (GET /api/instructions)
- [ ] Verify MOC detail page exists
- [ ] Verify useGetInstructionsQuery hook exists
- [ ] If any are missing, defer this story

## Acceptance Criteria

1. [ ] Link MOC button on set detail page
2. [ ] MOC picker modal with search
3. [ ] Multi-select support (can link multiple MOCs)
4. [ ] Linked MOCs display on set detail page
5. [ ] Unlink action on each linked MOC
6. [ ] Bidirectional: MOC detail also shows linked sets
7. [ ] Toast confirmation on link/unlink
8. [ ] Junction table created for many-to-many relationship

## Tasks / Subtasks

### Task 1: Create Junction Table (AC: 8)

- [ ] Create `set_moc_links` table in schema
- [ ] Fields: id, setId, mocId, createdAt
- [ ] Unique constraint on (setId, mocId)
- [ ] Indexes on setId and mocId
- [ ] Run migration

### Task 2: Create Link Endpoint (AC: 1, 7)

- [ ] Create `apps/api/endpoints/sets/mocs/link/handler.ts`
- [ ] POST /api/sets/:id/mocs
- [ ] Verify set ownership
- [ ] Verify MOC ownership
- [ ] Create link (upsert for idempotency)

### Task 3: Create Unlink Endpoint (AC: 5, 7)

- [ ] Create `apps/api/endpoints/sets/mocs/unlink/handler.ts`
- [ ] DELETE /api/sets/:id/mocs/:mocId
- [ ] Verify set ownership
- [ ] Remove link

### Task 4: Update Get Set Endpoint (AC: 4)

- [ ] Include linked MOCs in set response
- [ ] Join with instructions table
- [ ] Return basic MOC info (id, title, thumbnail)

### Task 5: Create LinkMocDialog Component (AC: 2, 3)

- [ ] Search input for MOCs
- [ ] List of available MOCs (exclude already linked)
- [ ] Selection with checkboxes
- [ ] Confirm links selected MOCs

### Task 6: Create LinkedMocsSection Component (AC: 4, 5)

- [ ] Grid of linked MOC cards
- [ ] Each card shows thumbnail, name
- [ ] Unlink button on hover
- [ ] Click navigates to MOC detail

### Task 7: Add to Set Detail Page

- [ ] Add LinkedMocsSection below images
- [ ] "Link MOC" button opens dialog

### Task 8: Bidirectional Display (AC: 6)

- [ ] Update MOC detail to show linked sets
- [ ] Coordinate with Epic 4

## Dev Notes

### Junction Table

```typescript
// apps/api/database/schema/set-moc-links.ts
export const setMocLinks = pgTable('set_moc_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id').references(() => sets.id, { onDelete: 'cascade' }).notNull(),
  mocId: uuid('moc_id').references(() => instructions.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueLink: unique().on(table.setId, table.mocId),
  setIdIdx: index('set_moc_links_set_id_idx').on(table.setId),
  mocIdIdx: index('set_moc_links_moc_id_idx').on(table.mocId),
}))
```

### Link Endpoint

```typescript
// apps/api/endpoints/sets/mocs/link/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id
  const { mocId } = JSON.parse(event.body || '{}')

  // Verify set ownership
  const set = await getSetById(setId)
  if (!set || set.userId !== userId) {
    return forbidden()
  }

  // Verify MOC ownership
  const moc = await getMocById(mocId)
  if (!moc || moc.userId !== userId) {
    return forbidden()
  }

  // Create link (upsert to handle duplicates gracefully)
  await db.insert(setMocLinks)
    .values({ setId, mocId })
    .onConflictDoNothing()

  return created({ setId, mocId })
}
```

### Unlink Endpoint

```typescript
// apps/api/endpoints/sets/mocs/unlink/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id
  const mocId = event.pathParameters?.mocId

  // Verify set ownership
  const set = await getSetById(setId)
  if (!set || set.userId !== userId) {
    return forbidden()
  }

  await db.delete(setMocLinks)
    .where(and(
      eq(setMocLinks.setId, setId),
      eq(setMocLinks.mocId, mocId)
    ))

  return noContent()
}
```

### RTK Query Mutations

```typescript
linkMocToSet: builder.mutation<void, { setId: string; mocId: string }>({
  query: ({ setId, mocId }) => ({
    url: `/sets/${setId}/mocs`,
    method: 'POST',
    body: { mocId },
  }),
  invalidatesTags: (result, error, { setId }) => [
    { type: 'Set', id: setId },
    { type: 'Instruction', id: 'LIST' },
  ],
}),

unlinkMocFromSet: builder.mutation<void, { setId: string; mocId: string }>({
  query: ({ setId, mocId }) => ({
    url: `/sets/${setId}/mocs/${mocId}`,
    method: 'DELETE',
  }),
  invalidatesTags: (result, error, { setId }) => [
    { type: 'Set', id: setId },
  ],
}),
```

### LinkMocDialog Component

```typescript
interface LinkMocDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setId: string
  existingMocIds: string[]
}

function LinkMocDialog({ open, onOpenChange, setId, existingMocIds }: LinkMocDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedMocIds, setSelectedMocIds] = useState<string[]>([])
  const debouncedSearch = useDebounce(search, 300)

  const { data: mocs } = useGetInstructionsQuery({ search: debouncedSearch, limit: 20 })
  const [linkMoc, { isLoading }] = useLinkMocToSetMutation()
  const { toast } = useToast()

  const availableMocs = mocs?.items.filter(m => !existingMocIds.includes(m.id)) ?? []

  const toggleMoc = (mocId: string) => {
    setSelectedMocIds(prev =>
      prev.includes(mocId)
        ? prev.filter(id => id !== mocId)
        : [...prev, mocId]
    )
  }

  const handleLink = async () => {
    try {
      await Promise.all(
        selectedMocIds.map(mocId => linkMoc({ setId, mocId }).unwrap())
      )
      toast({ title: `Linked ${selectedMocIds.length} MOC(s)` })
      onOpenChange(false)
      setSelectedMocIds([])
    } catch (error) {
      toast({ title: 'Failed to link MOCs', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link MOC Instructions</DialogTitle>
          <DialogDescription>
            Select MOCs to link to this set
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search MOCs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {availableMocs.map((moc) => (
              <div
                key={moc.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer',
                  selectedMocIds.includes(moc.id) && 'border-primary bg-primary/5'
                )}
                onClick={() => toggleMoc(moc.id)}
              >
                <Checkbox
                  checked={selectedMocIds.includes(moc.id)}
                  onCheckedChange={() => toggleMoc(moc.id)}
                />
                {moc.thumbnail && (
                  <img
                    src={moc.thumbnail}
                    alt={moc.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{moc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {moc.pieceCount} pieces
                  </p>
                </div>
              </div>
            ))}

            {availableMocs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {search ? 'No MOCs found' : 'All MOCs already linked'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={selectedMocIds.length === 0 || isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Link {selectedMocIds.length > 0 && `(${selectedMocIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### LinkedMocsSection Component

```typescript
function LinkedMocsSection({ set }: { set: Set }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [unlinkMoc] = useUnlinkMocFromSetMutation()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleUnlink = async (mocId: string) => {
    try {
      await unlinkMoc({ setId: set.id, mocId }).unwrap()
      toast({ title: 'MOC unlinked' })
    } catch (error) {
      toast({ title: 'Failed to unlink MOC', variant: 'destructive' })
    }
  }

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
        {set.linkedMocs?.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {set.linkedMocs?.map((moc) => (
              <div
                key={moc.id}
                className="group relative rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => navigate({ to: '/instructions/$mocId', params: { mocId: moc.id } })}
              >
                {moc.thumbnail && (
                  <img
                    src={moc.thumbnail}
                    alt={moc.title}
                    className="w-full aspect-square rounded object-cover mb-2"
                  />
                )}
                <p className="font-medium text-sm truncate">{moc.title}</p>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUnlink(moc.id)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <LinkMocDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        setId={set.id}
        existingMocIds={set.linkedMocs?.map(m => m.id) ?? []}
      />
    </Card>
  )
}
```

## Testing

- [ ] Link MOC button opens dialog
- [ ] Search filters available MOCs
- [ ] Already linked MOCs excluded from list
- [ ] Can select multiple MOCs
- [ ] Confirm links selected MOCs
- [ ] Linked MOCs appear on detail page
- [ ] Clicking linked MOC navigates to MOC detail
- [ ] Unlink removes association
- [ ] Toast confirms link/unlink
- [ ] Bidirectional: MOC detail shows linked sets
- [ ] API test: link endpoint creates junction record
- [ ] API test: unlink endpoint removes junction record
- [ ] API test: duplicate link is idempotent
- [ ] API test: unauthorized user cannot link

## Definition of Done

- [ ] Sets can be linked to multiple MOCs
- [ ] Linking is bidirectional (visible from both sides)
- [ ] UI provides search and multi-select
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1016              | Claude |
