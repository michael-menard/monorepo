# Story sets-2005: Build Status & Quantity Controls

## Status

Draft

## Consolidates

- sets-1013: Build Status Toggle
- sets-1014: Quantity Stepper

## Story

**As a** user,
**I want** quick controls to toggle build status and adjust quantity,
**So that** I can easily track the current state of my collection.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - Interaction Patterns > Build Status Toggle, Quantity Adjustment

## Dependencies

- **sets-2000**: Database Schema & Shared Types
- **sets-2001**: Sets Gallery MVP (for integration points)
- **sets-2003**: Edit Set Flow (for updateSet mutation)

## Acceptance Criteria

### Build Status Toggle

1. [ ] Toggle on card view (quick action)
2. [ ] Toggle on detail view (segmented control)
3. [ ] Optimistic update (UI updates immediately)
4. [ ] Toast notification with Undo action (5 seconds)
5. [ ] Brief celebration animation on "Built" transition
6. [ ] Reverts on API failure with error toast
7. [ ] Uses both color AND icon per accessibility requirements
8. [ ] Keyboard shortcut B on detail page

### Quantity Stepper

9. [ ] Quantity stepper on detail page with +/- buttons
10. [ ] Direct edit by clicking/tapping the number
11. [ ] Minimum quantity is 1 (cannot go below)
12. [ ] "-" button disabled at quantity 1
13. [ ] Prompt "Delete this set instead?" if user tries to go below 1
14. [ ] Optimistic update with toast and Undo
15. [ ] Quantity badge on card when quantity > 1
16. [ ] Keyboard shortcuts +/- on detail page
17. [ ] Detail page shows a combined "Build & quantity" card that groups status and quantity controls
18. [ ] Card visually groups controls with a clear title and helper text
19. [ ] Build & quantity card uses `AppCounterCard` from `@repo/app-component-library` for quantity/built counters
20. [ ] Build & quantity card updates built quantity via optimistic, debounced API calls (for example with a `useSetOwnershipCounter` hook)

## Tasks / Subtasks

### Task 1: Create BuildStatusToggle Component (AC: 1-7)

- [ ] Create component with button and segmented variants
- [ ] Icon + color for both states (Built/In Pieces)
- [ ] Optimistic update on click
- [ ] Toast with Undo button
- [ ] Celebration animation on "Built"
- [ ] Respect reduced motion preference
- [ ] Revert on API failure

### Task 2: Create QuantityStepper Component (AC: 9-15)

- [ ] +/- buttons with number display
- [ ] Direct edit mode on number click
- [ ] Minimum value enforcement (1)
- [ ] Touch-friendly sizing (44px targets)
- [ ] Optimistic update with Undo toast
- [ ] "Delete instead?" prompt at minimum

### Task 3: Create Celebration Animation (AC: 5)

- [ ] Brief glow or confetti animation
- [ ] Respects prefers-reduced-motion
- [ ] Non-blocking, subtle

### Task 4: Integrate into Card and Detail (AC: 1, 2, 8, 9, 16-18)

- [ ] Add BuildStatusToggle to SetCard in gallery
- [ ] Add BuildStatusToggle to "Build & quantity" card on set detail page
- [ ] Add QuantityStepper to "Build & quantity" card on set detail page
- [ ] Add keyboard shortcuts on set detail page

## Dev Notes

### BuildStatusToggle Component

```typescript
// components/BuildStatusToggle/index.tsx
interface BuildStatusToggleProps {
  setId: string
  isBuilt: boolean
  variant?: 'button' | 'segmented'
  onOptimisticUpdate?: (isBuilt: boolean) => void
}

export function BuildStatusToggle({
  setId,
  isBuilt,
  variant = 'button',
  onOptimisticUpdate,
}: BuildStatusToggleProps) {
  const [updateSet] = useUpdateSetMutation()
  const { toast, dismiss } = useToast()
  const [localIsBuilt, setLocalIsBuilt] = useState(isBuilt)
  const [showCelebration, setShowCelebration] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Sync with prop changes
  useEffect(() => {
    setLocalIsBuilt(isBuilt)
  }, [isBuilt])

  const handleToggle = async () => {
    const newValue = !localIsBuilt
    const previousValue = localIsBuilt

    // Optimistic update
    setLocalIsBuilt(newValue)
    onOptimisticUpdate?.(newValue)

    // Celebration animation for "Built"
    if (newValue && !prefersReducedMotion) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 1500)
    }

    // Toast with Undo
    const { id: toastId } = toast({
      title: newValue ? 'Marked as built' : 'Marked as in pieces',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLocalIsBuilt(previousValue)
            onOptimisticUpdate?.(previousValue)
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
        data: { isBuilt: newValue },
      }).unwrap()
    } catch (error) {
      // Revert on failure
      setLocalIsBuilt(previousValue)
      onOptimisticUpdate?.(previousValue)
      dismiss(toastId)
      toast({
        title: "Couldn't update status",
        description: 'Please try again',
        variant: 'destructive',
        action: (
          <Button variant="outline" size="sm" onClick={handleToggle}>
            Retry
          </Button>
        ),
      })
    }
  }

  if (variant === 'segmented') {
    return (
      <div className="relative">
        <SegmentedControl
          value={localIsBuilt ? 'built' : 'pieces'}
          onChange={handleToggle}
          options={[
            {
              value: 'pieces',
              label: (
                <span className="flex items-center gap-1">
                  <Blocks className="h-4 w-4" />
                  In Pieces
                </span>
              ),
            },
            {
              value: 'built',
              label: (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Built
                </span>
              ),
            },
          ]}
        />
        {showCelebration && <CelebrationAnimation />}
      </div>
    )
  }

  // Button variant for card
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          handleToggle()
        }}
        className={cn(
          'text-xs',
          localIsBuilt ? 'text-green-600' : 'text-muted-foreground'
        )}
        aria-label={`Build status: ${localIsBuilt ? 'Built' : 'In Pieces'}. Press to change.`}
        aria-pressed={localIsBuilt}
      >
        {localIsBuilt ? (
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
      </Button>
      {showCelebration && <CelebrationAnimation />}
    </div>
  )
}
```

### Celebration Animation

```typescript
function CelebrationAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 pointer-events-none"
    >
      <div className="absolute inset-0 bg-green-500/20 rounded-lg animate-pulse" />
    </motion.div>
  )
}
```

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

### Quantity Control with Optimistic Update

```typescript
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

    setLocalQuantity(newQuantity)

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
              <Button variant="destructive">Delete Set</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

### Build & Quantity Counter Card (AppCounterCard + useSetOwnershipCounter)

The "Build & quantity" card on the set detail page should use the shared `AppCounterCard` from `@repo/app-component-library` to display and adjust the built quantity out of the total copies owned. The card remains API-agnostic and delegates optimistic + debounced updates to a feature hook (for example, `useSetOwnershipCounter`).

```typescript
function BuildAndQuantityCard({ setId, total, built }: { setId: string; total: number; built: number }) {
  const { built: builtCopies, total: totalCopies, isSaving, error, updateBuilt } = useSetOwnershipCounter({
    setId,
    initialTotal: total,
    initialBuilt: built,
    debounceMs: 500,
  })

  return (
    <AppCounterCard
      title="Copies built"
      total={totalCopies}
      value={builtCopies}
      showFraction
      showPercentageBar
      showPercentageLabel
      onChange={updateBuilt}
    >
      {isSaving
        ? 'Saving…'
        : error
        ? "We couldn't sync changes yet. Your local count will retry."
        : 'Track how many copies of this set you have built.'}
    </AppCounterCard>
  )
}
```

### Keyboard Shortcuts on Detail Page

```typescript
// In SetDetailPage
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      case 'b':
      case 'B':
        e.preventDefault()
        toggleBuildStatus()
        break
      case '+':
      case '=':
        e.preventDefault()
        incrementQuantity()
        break
      case '-':
        e.preventDefault()
        decrementQuantity()
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

## Testing

### Build Status Tests

- [ ] Toggle changes UI immediately (optimistic)
- [ ] Toast shows with correct message
- [ ] Undo reverts the change
- [ ] API failure reverts UI
- [ ] Error toast shows retry button
- [ ] Celebration animation plays on "Built"
- [ ] Reduced motion disables animation
- [ ] Button variant works on card
- [ ] Segmented variant works on detail
- [ ] Screen reader announces state change
- [ ] Keyboard B triggers toggle on detail page
- [ ] Uses both color AND icon

### Quantity Tests

- [ ] + button increments quantity
- [ ] - button decrements quantity
- [ ] - button triggers delete prompt at quantity 1
- [ ] Clicking number enters edit mode
- [ ] Edit mode accepts valid numbers
- [ ] Edit mode rejects invalid input
- [ ] Enter confirms edit
- [ ] Escape cancels edit
- [ ] Toast shows on change with Undo
- [ ] Undo reverts change
- [ ] API failure reverts UI
- [ ] Touch targets are 44px minimum
- [ ] Screen reader announces quantity
- [ ] Keyboard +/- work on detail page

## Definition of Done

- [ ] Build status can be toggled with optimistic updates
- [ ] Quantity can be adjusted with optimistic updates
- [ ] Undo functionality works reliably
- [ ] Keyboard shortcuts implemented
- [ ] Accessibility requirements met
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1013, 1014        | Claude |
