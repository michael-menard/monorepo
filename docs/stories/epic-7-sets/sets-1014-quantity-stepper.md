# Story sets-1014: Quantity Stepper

## Status

Draft

## Story

**As a** user,
**I want** to adjust the quantity of sets I own,
**So that** I can track multiples of the same set.

## Acceptance Criteria

1. [ ] Quantity stepper on detail page with +/- buttons
2. [ ] Direct edit by clicking/tapping the number
3. [ ] Minimum quantity is 1 (cannot go below)
4. [ ] "-" button disabled at quantity 1
5. [ ] Prompt "Delete this set instead?" if user tries to go below 1
6. [ ] Optimistic update with toast and Undo
7. [ ] Quantity badge on card when quantity > 1

## Tasks

- [ ] **Task 1: Create QuantityStepper component**
  - [ ] +/- buttons with number display
  - [ ] Direct edit mode on number click
  - [ ] Minimum value enforcement
  - [ ] Touch-friendly sizing (44px targets)

- [ ] **Task 2: Implement optimistic update**
  - [ ] Immediate UI update
  - [ ] Toast with Undo
  - [ ] Revert on failure

- [ ] **Task 3: Handle minimum boundary**
  - [ ] Disable "-" at quantity 1
  - [ ] Show prompt if user tries to go below
  - [ ] Prompt offers delete option

- [ ] **Task 4: Integrate into detail page**
  - [ ] Add to SetDetailsCard
  - [ ] Wire up mutation

## Dev Notes

### QuantityStepper Component

```typescript
// components/QuantityStepper/index.tsx
interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  onDeletePrompt?: () => void
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  onDeletePrompt,
}: QuantityStepperProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDecrement = () => {
    if (value <= min) {
      // At minimum, prompt for delete
      onDeletePrompt?.()
      return
    }
    onChange(value - 1)
  }

  const handleIncrement = () => {
    if (value >= max) return
    onChange(value + 1)
  }

  const handleEditStart = () => {
    setEditValue(value.toString())
    setIsEditing(true)
    // Focus input after render
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleEditComplete = () => {
    const newValue = parseInt(editValue, 10)
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditComplete()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {/* Decrement Button */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={handleDecrement}
        disabled={disabled}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* Quantity Display / Edit */}
      {isEditing ? (
        <Input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditComplete}
          onKeyDown={handleKeyDown}
          className="w-16 h-10 text-center"
          min={min}
          max={max}
        />
      ) : (
        <button
          className="w-16 h-10 text-center font-semibold text-lg hover:bg-muted rounded-md transition-colors"
          onClick={handleEditStart}
          disabled={disabled}
          aria-label={`Quantity: ${value}. Click to edit.`}
        >
          {value}
        </button>
      )}

      {/* Increment Button */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

### Quantity with Optimistic Update

```typescript
// In detail page or as wrapper component
function SetQuantityControl({ setId, quantity }: { setId: string; quantity: number }) {
  const [updateSet] = useUpdateSetMutation()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast, dismiss } = useToast()
  const [localQuantity, setLocalQuantity] = useState(quantity)

  useEffect(() => {
    setLocalQuantity(quantity)
  }, [quantity])

  const handleChange = async (newQuantity: number) => {
    const previousQuantity = localQuantity

    // Optimistic update
    setLocalQuantity(newQuantity)

    // Toast with Undo
    const { id: toastId } = toast({
      title: `Quantity: ${newQuantity}`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLocalQuantity(previousQuantity)
            dismiss(toastId)
          }}
        >
          Undo
        </Button>
      ),
      duration: 5000,
    })

    // API call
    try {
      await updateSet({
        id: setId,
        data: { quantity: newQuantity },
      }).unwrap()
    } catch (error) {
      setLocalQuantity(previousQuantity)
      dismiss(toastId)
      toast({
        title: "Couldn't update quantity",
        variant: 'destructive',
        action: (
          <Button variant="outline" size="sm" onClick={() => handleChange(newQuantity)}>
            Retry
          </Button>
        ),
      })
    }
  }

  return (
    <>
      <QuantityStepper
        value={localQuantity}
        onChange={handleChange}
        onDeletePrompt={() => setDeleteDialogOpen(true)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this set instead?</AlertDialogTitle>
            <AlertDialogDescription>
              You can't have less than 1 of a set. Would you like to delete it from your collection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Set</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive">
                Delete Set
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

### Quantity Badge on Card

Already implemented in sets-1008, but verify:

```typescript
{set.quantity > 1 && (
  <Badge className="absolute top-2 left-2" variant="secondary">
    x{set.quantity}
  </Badge>
)}
```

## Testing

- [ ] + button increments quantity
- [ ] - button decrements quantity
- [ ] - button disabled at quantity 1
- [ ] Clicking number enters edit mode
- [ ] Edit mode accepts valid numbers
- [ ] Edit mode rejects invalid input
- [ ] Enter confirms edit
- [ ] Escape cancels edit
- [ ] Toast shows on change
- [ ] Undo reverts change
- [ ] API failure reverts UI
- [ ] Delete prompt shows when trying to go below 1
- [ ] Touch targets are 44px minimum
- [ ] Screen reader announces quantity

## Dependencies

- sets-1005: Update Set Endpoint
- sets-1009: Detail Page

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Interaction Patterns - Quantity Adjustment)
- PRD: "Minimum: 1 (can't decrement to 0; must delete explicitly)"
