# Story sets-1013: Build Status Toggle

## Status

Draft

## Story

**As a** user,
**I want** to quickly toggle whether a set is built or in pieces,
**So that** I can track the current state of my collection.

## Acceptance Criteria

1. [ ] Toggle on card view (quick action)
2. [ ] Toggle on detail view (segmented control)
3. [ ] Optimistic update (UI updates immediately)
4. [ ] Toast notification with Undo action (5 seconds)
5. [ ] Brief celebration animation on "Built" transition
6. [ ] Reverts on API failure with error toast
7. [ ] Uses both color AND icon per accessibility requirements

## Tasks

- [ ] **Task 1: Create BuildStatusToggle component**
  - [ ] Segmented control variant (for detail view)
  - [ ] Button variant (for card quick action)
  - [ ] Icon + color for both states

- [ ] **Task 2: Implement optimistic update**
  - [ ] Immediate UI update on click
  - [ ] API call in background
  - [ ] Revert on failure

- [ ] **Task 3: Toast with Undo**
  - [ ] Show toast on toggle
  - [ ] "Marked as built" / "Marked as in pieces"
  - [ ] Undo button reverts change
  - [ ] 5 second timeout

- [ ] **Task 4: Celebration animation**
  - [ ] Brief confetti or glow on "Built"
  - [ ] Subtle, not distracting
  - [ ] Respects reduced motion preference

- [ ] **Task 5: Integrate into card and detail views**
  - [ ] Add toggle to SetCard
  - [ ] Add segmented control to detail page

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
            // Revert
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
      {/* Simple glow effect */}
      <div className="absolute inset-0 bg-green-500/20 rounded-lg animate-pulse" />
      {/* Or use a confetti library like canvas-confetti */}
    </motion.div>
  )
}
```

### Integration in SetCard

```typescript
// In SetCard component
<div className="flex items-center justify-between">
  {set.theme && <Badge variant="outline">{set.theme}</Badge>}
  <BuildStatusToggle
    setId={set.id}
    isBuilt={set.isBuilt}
    variant="button"
  />
</div>
```

### Integration in Detail Page

```typescript
// In SetDetailsCard component
<div>
  <Label className="text-muted-foreground">Build Status</Label>
  <BuildStatusToggle
    setId={set.id}
    isBuilt={set.isBuilt}
    variant="segmented"
  />
</div>
```

### Accessibility Notes

- Uses both color AND icon (PRD requirement)
- Aria-label describes current state and action
- Respects prefers-reduced-motion
- Focus visible on toggle

## Testing

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
- [ ] Keyboard accessible (Enter/Space triggers)

## Dependencies

- sets-1005: Update Set Endpoint
- sets-1008: Set Card Component
- sets-1009: Detail Page

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Interaction Patterns - Build Status Toggle)
- PRD: "Build status uses both color AND icon"
