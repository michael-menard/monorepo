# Story sets-1016: MOC Linking

## Status

Draft

## Story

**As a** user,
**I want** to link my sets to MOC Instructions,
**So that** I can track which sets I used for which builds.

## Acceptance Criteria

1. [ ] Link MOC button on set detail page
2. [ ] MOC picker modal with search
3. [ ] Multi-select support (can link multiple MOCs)
4. [ ] Linked MOCs display on set detail page
5. [ ] Unlink action on each linked MOC
6. [ ] Bidirectional: MOC detail also shows linked sets
7. [ ] Toast confirmation on link/unlink

## Pre-Conditions

**This story is conditional on MOC Instructions (Epic 4) being implemented.**

Before implementing:
- [ ] Verify MOC Instructions API exists (GET /api/instructions)
- [ ] Verify MOC detail page exists
- [ ] Verify useGetInstructionsQuery hook exists
- [ ] If any are missing, defer this story

## Tasks

- [ ] **Task 1: Create linking endpoints**
  - [ ] POST /api/sets/:id/mocs - link MOC
  - [ ] DELETE /api/sets/:id/mocs/:mocId - unlink MOC
  - [ ] Create set_moc_links junction table if not exists

- [ ] **Task 2: Create LinkMocDialog component**
  - [ ] Search input for MOCs
  - [ ] List of available MOCs (exclude already linked)
  - [ ] Selection with checkboxes
  - [ ] Confirm links selected MOCs

- [ ] **Task 3: Create LinkedMocsSection component**
  - [ ] Grid of linked MOC cards
  - [ ] Each card shows thumbnail, name, piece count
  - [ ] Unlink button on hover
  - [ ] Click navigates to MOC detail

- [ ] **Task 4: Add to set detail page**
  - [ ] Add LinkedMocsSection below images
  - [ ] "Link MOC" button opens dialog

- [ ] **Task 5: Bidirectional display**
  - [ ] Update MOC detail to show linked sets
  - [ ] (May need coordination with Epic 4)

## Dev Notes

### Junction Table

```typescript
// apps/api/src/db/schema/set-moc-links.ts
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
    { type: 'Instruction', id: 'LIST' }, // Also refresh MOC list
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

  // ... dialog UI with search, checkbox list, confirm button
}
```

### LinkedMocsSection Component

```typescript
function LinkedMocsSection({ set }: { set: Set }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

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
        {set.linkedMocs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No MOCs linked to this set yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {set.linkedMocs.map((moc) => (
              <LinkedMocCard key={moc.id} moc={moc} setId={set.id} />
            ))}
          </div>
        )}
      </CardContent>

      <LinkMocDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        setId={set.id}
        existingMocIds={set.linkedMocs.map(m => m.id)}
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

## Dependencies

- sets-1000: Database Schema
- sets-1009: Detail Page
- **Epic 4: MOC Instructions** (must be implemented)

## References

- PRD: docs/prd/epic-7-sets-gallery.md (MOC Linking)
- PRD: "Many-to-many relationship: One set can be linked to multiple MOCs"
