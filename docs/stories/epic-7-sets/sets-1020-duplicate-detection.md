# Story sets-1020: Duplicate Set Detection

## Status

Draft

## Story

**As a** user,
**I want** to be prompted when adding a set I already own,
**So that** I can choose to increment quantity or create a separate entry.

## Acceptance Criteria

1. [ ] On add, check if setNumber already exists in collection
2. [ ] If duplicate found, show choice dialog
3. [ ] Option 1: Add to existing quantity (no separate purchase tracking)
4. [ ] Option 2: Add as new entry (separate purchase details)
5. [ ] Choice is clear about trade-offs
6. [ ] Works for manual entry

## Tasks

- [ ] **Task 1: Create duplicate check endpoint**
  - [ ] GET /api/sets/check-duplicate?setNumber=xxx
  - [ ] Returns existing set(s) if found

- [ ] **Task 2: Create DuplicateSetDialog component**
  - [ ] Shows existing set info
  - [ ] Two clear options with explanations
  - [ ] Cancel to go back

- [ ] **Task 3: Integrate into add form**
  - [ ] Check on setNumber blur or form submit
  - [ ] Show dialog if duplicate found
  - [ ] Handle user choice

- [ ] **Task 4: Handle "Add to quantity" option**
  - [ ] Call updateSet to increment quantity
  - [ ] Navigate to gallery with success toast

## Dev Notes

### Duplicate Check Endpoint

```typescript
// apps/api/endpoints/sets/check-duplicate/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setNumber = event.queryStringParameters?.setNumber

  if (!setNumber) {
    return badRequest('setNumber required')
  }

  const existingSets = await db
    .select()
    .from(sets)
    .where(and(
      eq(sets.userId, userId),
      eq(sets.setNumber, setNumber)
    ))

  return success({
    hasDuplicate: existingSets.length > 0,
    existingSets: existingSets.map(s => ({
      id: s.id,
      title: s.title,
      setNumber: s.setNumber,
      quantity: s.quantity,
      purchaseDate: s.purchaseDate,
      purchasePrice: s.purchasePrice,
    })),
  })
}
```

### DuplicateSetDialog Component

```typescript
interface DuplicateSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSet: {
    id: string
    title: string
    setNumber: string
    quantity: number
    purchasePrice?: number
  }
  newSetData: CreateSetInput
  onAddToQuantity: () => void
  onCreateNew: () => void
}

function DuplicateSetDialog({
  open,
  onOpenChange,
  existingSet,
  newSetData,
  onAddToQuantity,
  onCreateNew,
}: DuplicateSetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>You already own this set!</DialogTitle>
          <DialogDescription>
            You have {existingSet.quantity} of Set #{existingSet.setNumber} in your collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Option 1: Add to quantity */}
          <button
            className="w-full p-4 border rounded-lg text-left hover:bg-muted transition-colors"
            onClick={onAddToQuantity}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  Add to existing quantity (+1 = {existingSet.quantity + 1} total)
                </p>
                <p className="text-sm text-muted-foreground">
                  Purchase details won't be tracked separately
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Create new entry */}
          <button
            className="w-full p-4 border rounded-lg text-left hover:bg-muted transition-colors"
            onClick={onCreateNew}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-secondary p-2">
                <Copy className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Add as new entry</p>
                <p className="text-sm text-muted-foreground">
                  Track separate purchase details for this copy
                </p>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Integration in Add Form

```typescript
function AddSetPage() {
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [existingSet, setExistingSet] = useState<ExistingSet | null>(null)
  const [pendingData, setPendingData] = useState<CreateSetInput | null>(null)

  const [checkDuplicate] = useCheckDuplicateMutation()
  const [addSet] = useAddSetMutation()
  const [updateSet] = useUpdateSetMutation()

  const onSubmit = async (data: CreateSetInput) => {
    // Check for duplicate if setNumber provided
    if (data.setNumber) {
      const result = await checkDuplicate({ setNumber: data.setNumber }).unwrap()

      if (result.hasDuplicate) {
        setExistingSet(result.existingSets[0])
        setPendingData(data)
        setDuplicateDialogOpen(true)
        return
      }
    }

    // No duplicate, proceed with creation
    await createSet(data)
  }

  const handleAddToQuantity = async () => {
    if (!existingSet) return

    await updateSet({
      id: existingSet.id,
      data: { quantity: existingSet.quantity + 1 },
    }).unwrap()

    toast({ title: `Quantity updated to ${existingSet.quantity + 1}` })
    setDuplicateDialogOpen(false)
    navigate({ to: '/sets' })
  }

  const handleCreateNew = async () => {
    if (!pendingData) return

    await createSet(pendingData)
    setDuplicateDialogOpen(false)
  }

  const createSet = async (data: CreateSetInput) => {
    await addSet(data).unwrap()
    toast({ title: 'Set added to collection' })
    navigate({ to: '/sets' })
  }

  return (
    <>
      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* ... form fields ... */}
        </form>
      </Form>

      {/* Duplicate Dialog */}
      {existingSet && pendingData && (
        <DuplicateSetDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          existingSet={existingSet}
          newSetData={pendingData}
          onAddToQuantity={handleAddToQuantity}
          onCreateNew={handleCreateNew}
        />
      )}
    </>
  )
}
```

### RTK Query Hook

```typescript
checkDuplicate: builder.mutation<
  { hasDuplicate: boolean; existingSets: ExistingSet[] },
  { setNumber: string }
>({
  query: ({ setNumber }) => ({
    url: '/sets/check-duplicate',
    params: { setNumber },
  }),
}),
```

## Testing

- [ ] Duplicate check called on submit with setNumber
- [ ] Dialog shows when duplicate found
- [ ] "Add to quantity" increments existing set
- [ ] "Add as new entry" creates separate set
- [ ] Cancel closes dialog without action
- [ ] No dialog when no setNumber provided
- [ ] No dialog when setNumber is unique
- [ ] Toast confirms action taken
- [ ] Navigation to gallery after either choice

## Dependencies

- sets-1004: Create Set Endpoint
- sets-1005: Update Set Endpoint
- sets-1010: Add Set Form

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Interaction Patterns - Same Set, Different Purchase)
