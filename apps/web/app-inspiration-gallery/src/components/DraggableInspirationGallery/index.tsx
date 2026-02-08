/**
 * DraggableInspirationGallery Component
 *
 * Gallery container with DndContext and SortableContext for drag-and-drop reordering.
 * Manages sensors, reorder logic, error handling, and rollback.
 *
 * INSP-011-A: Drag-and-Drop (dnd-kit)
 * INSP-011-B: Keyboard Reordering
 * INSP-019: Keyboard Navigation & A11y
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { CheckCircle, Undo2, Loader2 } from 'lucide-react'
import { Button, cn } from '@repo/app-component-library'
import { z } from 'zod'
import {
  InspirationSchema,
  type Inspiration,
  useReorderInspirationsMutation,
  inspirationApi,
} from '@repo/api-client/rtk/inspiration-api'
import { useDispatch } from 'react-redux'
import { SortableInspirationCard } from '../SortableInspirationCard'
import { InspirationDragPreview } from '../InspirationDragPreview'
import { useAnnouncer } from '../../hooks/useAnnouncer'
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'

/**
 * DraggableInspirationGallery props schema (data-only)
 */
const DraggableInspirationGalleryPropsDataSchema = z.object({
  /** Items to display and reorder */
  items: z.array(InspirationSchema),
  /** Whether dragging is enabled (disable when not in manual sort mode) */
  isDraggingEnabled: z.boolean().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
})

/**
 * DraggableInspirationGallery props
 */
export type DraggableInspirationGalleryProps = z.infer<
  typeof DraggableInspirationGalleryPropsDataSchema
> & {
  /** Click handler for card click */
  onCardClick?: (itemId: string) => void
  /** Menu click handler */
  onMenuClick?: (itemId: string, event: React.MouseEvent) => void
  /** Callback when items are reordered locally (for optimistic UI) */
  onLocalReorder?: (items: Inspiration[]) => void
}

/**
 * Undo context for tracking pending undo operations
 */
const UndoContextSchema = z.object({
  /** Original sortOrder values before reorder */
  originalOrder: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number(),
    }),
  ),
  /** Original items array for local state restoration */
  originalItems: z.array(InspirationSchema),
  /** Timeout ID for auto-dismiss */
  timeoutId: z.custom<ReturnType<typeof setTimeout> | null>(),
  /** Whether undo is still active */
  isActive: z.boolean(),
  /** Toast ID for dismissing */
  toastId: z.union([z.string(), z.number(), z.null()]),
})

type UndoContext = z.infer<typeof UndoContextSchema>

/**
 * Error messages per HTTP status code
 */
const getErrorMessage = (status: number | undefined): string => {
  switch (status) {
    case 403:
      return "You don't have permission to reorder this item."
    case 404:
      return 'Item not found. Refreshing list.'
    case 500:
      return 'Failed to save order. Try again.'
    default:
      return 'Request timed out. Try again.'
  }
}

/**
 * Undo toast duration in milliseconds
 */
const UNDO_TOAST_DURATION = 5000

/**
 * DraggableInspirationGallery Component
 *
 * Renders a gallery of inspiration items that can be dragged and dropped to reorder.
 *
 * Features:
 * - PointerSensor with 8px activation threshold
 * - TouchSensor with 300ms delay, 5px tolerance
 * - DragOverlay for ghost preview
 * - Auto-scroll near viewport edges
 * - Error handling with toast notifications
 * - Rollback on API failure
 * - ARIA live region for screen reader announcements
 * - Undo flow with 5-second window
 */
export function DraggableInspirationGallery({
  items: initialItems,
  onCardClick,
  onMenuClick,
  isDraggingEnabled = true,
  onLocalReorder,
  className,
}: DraggableInspirationGalleryProps) {
  // Redux dispatch for RTK Query cache manipulation
  const dispatch = useDispatch()

  // Local state for visual ordering during drag
  const [items, setItems] = useState<Inspiration[]>(initialItems)

  // Track active drag item for DragOverlay
  const [activeItem, setActiveItem] = useState<Inspiration | null>(null)

  // Store original order for rollback
  const originalOrderRef = useRef<Inspiration[]>([])

  // ARIA live region announcement (for drag-and-drop)
  const [announcement, setAnnouncement] = useState('')

  // Screen reader announcements for keyboard actions
  const { announcement: keyboardAnnouncement, priority: keyboardPriority } = useAnnouncer()

  // Container ref for keyboard shortcut scoping
  const containerRef = useRef<HTMLDivElement>(null)

  // Item refs for focus management
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Roving tabindex for keyboard navigation
  const {
    activeIndex,
    getTabIndex,
    handleKeyDown: handleRovingKeyDown,
  } = useRovingTabIndex(items.length, containerRef, {
    wrapHorizontal: true,
    wrapVertical: false,
  })

  // RTK Query mutation
  const [reorderInspirations, { isLoading: isReordering }] = useReorderInspirationsMutation()

  // Ref to track pending reorder payload for retry
  const pendingReorderRef = useRef<{ items: Array<{ id: string; sortOrder: number }> } | null>(null)

  // Undo state management
  const undoContextRef = useRef<UndoContext>({
    originalOrder: [],
    originalItems: [],
    timeoutId: null,
    isActive: false,
    toastId: null,
  })

  // Track if undo is in progress
  const [isUndoing, setIsUndoing] = useState(false)

  // Sync items with props when they change externally
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  // Focus management - focus active item when activeIndex changes
  useEffect(() => {
    if (!activeItem && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.focus()
    }
  }, [activeIndex, activeItem])

  // Cleanup undo on unmount/route navigation
  useEffect(() => {
    return () => {
      if (undoContextRef.current.timeoutId) {
        clearTimeout(undoContextRef.current.timeoutId)
      }
      if (undoContextRef.current.toastId) {
        toast.dismiss(undoContextRef.current.toastId)
      }
      undoContextRef.current.isActive = false
    }
  }, [])

  /**
   * Clear previous undo context
   */
  const clearUndoContext = useCallback(() => {
    if (undoContextRef.current.timeoutId) {
      clearTimeout(undoContextRef.current.timeoutId)
    }
    if (undoContextRef.current.toastId) {
      toast.dismiss(undoContextRef.current.toastId)
    }
    undoContextRef.current = {
      originalOrder: [],
      originalItems: [],
      timeoutId: null,
      isActive: false,
      toastId: null,
    }
  }, [])

  /**
   * Handle undo action - restores original order via API call
   */
  const handleUndo = useCallback(async () => {
    if (!undoContextRef.current.isActive) {
      return
    }

    const { originalOrder, originalItems, toastId } = undoContextRef.current

    // Clear timeout immediately
    if (undoContextRef.current.timeoutId) {
      clearTimeout(undoContextRef.current.timeoutId)
    }

    // Mark undo as in progress
    setIsUndoing(true)
    undoContextRef.current.isActive = false

    // Dismiss the current toast
    if (toastId) {
      toast.dismiss(toastId)
    }

    try {
      // Restore original order in local state immediately (optimistic)
      setItems(originalItems)
      if (onLocalReorder) {
        onLocalReorder(originalItems)
      }

      // Call API with original sortOrder values
      await reorderInspirations({ items: originalOrder }).unwrap()

      // Show success confirmation toast
      toast.success('Order restored', {
        duration: 3000,
      })

      // Announce to screen reader
      setAnnouncement('Order restored to previous arrangement.')
    } catch {
      // Undo failed - show error toast with retry
      toast.error('Failed to restore order', {
        action: {
          label: 'Retry',
          onClick: () => handleUndo(),
        },
        duration: 5000,
      })

      // Invalidate cache on undo failure to force re-fetch
      dispatch(inspirationApi.util.invalidateTags([{ type: 'Inspiration', id: 'LIST' }]))
    } finally {
      setIsUndoing(false)
      clearUndoContext()
    }
  }, [reorderInspirations, onLocalReorder, clearUndoContext, dispatch])

  /**
   * Show success toast with undo button
   */
  const showUndoToast = useCallback(
    (movedItemTitle: string) => {
      const toastId = toast.custom(
        t => (
          <div
            className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md"
            role="alert"
            aria-live="polite"
            data-testid="reorder-success-toast"
          >
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Order updated</p>
              <p className="text-sm text-gray-600 truncate">{movedItemTitle}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.dismiss(t)
                handleUndo()
              }}
              className="flex items-center gap-1 flex-shrink-0"
              disabled={isUndoing}
              data-testid="undo-reorder-button"
              aria-label={`Undo reorder of ${movedItemTitle}`}
            >
              {isUndoing ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Undo2 className="h-3 w-3" aria-hidden="true" />
              )}
              Undo
            </Button>
          </div>
        ),
        {
          duration: UNDO_TOAST_DURATION,
          position: 'bottom-right',
        },
      )

      // Store toast ID and set up auto-dismiss cleanup
      undoContextRef.current.toastId = toastId
      undoContextRef.current.timeoutId = setTimeout(() => {
        undoContextRef.current.isActive = false
        undoContextRef.current.toastId = null
      }, UNDO_TOAST_DURATION)
    },
    [handleUndo, isUndoing],
  )

  // Configure sensors
  const sensors = useSensors(
    // Mouse drag with 8px threshold
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Touch drag with 300ms delay, 5px tolerance
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    }),
  )

  // Handle drag start - store original order and set active item
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const draggedItem = items.find(item => item.id === active.id)

      if (draggedItem) {
        // Cancel previous undo window on new drag
        clearUndoContext()

        // Store original order for potential rollback
        originalOrderRef.current = [...items]
        setActiveItem(draggedItem)

        // Screen reader announcement
        const index = items.findIndex(item => item.id === active.id)
        setAnnouncement(
          `Picked up ${draggedItem.title}. Current position: ${index + 1} of ${items.length}. Use arrow keys to move, Space to drop, Escape to cancel.`,
        )
      }
    },
    [items, clearUndoContext],
  )

  // Handle drag end - update order and call API
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      // Clear active item
      setActiveItem(null)

      // No drop target - cancel
      if (!over || active.id === over.id) {
        setAnnouncement('Reorder cancelled.')
        return
      }

      // Find indices
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      // Capture original order for undo
      const originalOrder = items.map((item, index) => ({
        id: item.id,
        sortOrder: index,
      }))
      const originalItems = [...items]

      // Apply local reorder immediately (optimistic UI)
      const reorderedItems = arrayMove(items, oldIndex, newIndex)
      setItems(reorderedItems)

      // Notify parent of local reorder
      if (onLocalReorder) {
        onLocalReorder(reorderedItems)
      }

      // Screen reader announcement
      const movedItem = reorderedItems[newIndex]
      setAnnouncement(
        `${movedItem?.title || 'Item'} dropped. New position: ${newIndex + 1} of ${items.length}.`,
      )

      // Build payload with recalculated sortOrder values
      const payload = {
        items: reorderedItems.map((item, index) => ({
          id: item.id,
          sortOrder: index,
        })),
      }

      // Store for potential retry
      pendingReorderRef.current = payload

      try {
        // Call API to persist order (optimistic update in RTK Query)
        await reorderInspirations(payload).unwrap()

        // Success - clear pending
        pendingReorderRef.current = null

        // Set up undo context for successful reorder
        undoContextRef.current = {
          originalOrder,
          originalItems,
          timeoutId: null,
          isActive: true,
          toastId: null,
        }

        // Show success toast with undo button
        showUndoToast(movedItem?.title || 'Item')
      } catch (error) {
        // Error handling with rollback
        const rtkError = error as { status?: number }
        const status = rtkError?.status
        const message = getErrorMessage(status)

        // Rollback to original order
        setItems(originalOrderRef.current)
        if (onLocalReorder) {
          onLocalReorder(originalOrderRef.current)
        }

        // Handle specific error codes
        if (status === 404) {
          // Auto-refresh on 404
          toast.error(message)
          dispatch(inspirationApi.util.invalidateTags([{ type: 'Inspiration', id: 'LIST' }]))
        } else if (status === 403) {
          // Show permission error, invalidate cache
          toast.error(message)
          dispatch(inspirationApi.util.invalidateTags([{ type: 'Inspiration', id: 'LIST' }]))
        } else {
          // Retry button for other errors (timeout, 500, etc.)
          toast.error(message, {
            action: {
              label: 'Retry',
              onClick: async () => {
                if (pendingReorderRef.current) {
                  try {
                    await reorderInspirations(pendingReorderRef.current).unwrap()
                    // Success - apply the pending reorder
                    setItems(reorderedItems)
                    if (onLocalReorder) {
                      onLocalReorder(reorderedItems)
                    }
                    pendingReorderRef.current = null
                    toast.success('Order saved.')
                  } catch {
                    toast.error('Failed to save order. Please try again.')
                  }
                }
              },
            },
          })
        }
      }
    },
    [items, reorderInspirations, onLocalReorder, showUndoToast, dispatch],
  )

  // Handle drag cancel - restore original order
  const handleDragCancel = useCallback(() => {
    setActiveItem(null)
    setAnnouncement('Reorder cancelled.')
  }, [])

  // Get item IDs for SortableContext
  const itemIds = items.map(item => item.id)

  // Empty gallery - no drag handles
  if (items.length === 0) {
    return null
  }

  // Single item - no reordering possible
  const effectiveDraggingEnabled = isDraggingEnabled && items.length > 1

  // Handle keyboard events - combine roving tabindex with other handlers
  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Only handle roving tabindex navigation when NOT dragging
      if (!activeItem) {
        handleRovingKeyDown(e)
      }
    },
    [activeItem, handleRovingKeyDown],
  )

  // Focus the active card when container receives focus
  const handleContainerFocus = useCallback(
    (e: React.FocusEvent) => {
      // Only focus the card if focus came from outside the container (Tab in)
      if (e.target === containerRef.current && itemRefs.current[activeIndex]) {
        itemRefs.current[activeIndex]?.focus()
      }
    },
    [activeIndex],
  )

  return (
    <div
      className={className}
      ref={containerRef}
      role="region"
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      onFocus={handleContainerFocus}
      data-testid="inspiration-gallery-container"
      aria-label="Inspiration items gallery. Use arrow keys to navigate, Enter to open details."
    >
      {/* ARIA live region for screen reader announcements (drag-and-drop - assertive) */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Announcer for keyboard shortcut feedback (polite) */}
      <div
        role="status"
        aria-live={keyboardPriority}
        aria-atomic="true"
        className="sr-only"
        data-testid="keyboard-shortcut-announcer"
      >
        {keyboardAnnouncement}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        autoScroll={{
          enabled: true,
          threshold: {
            x: 0.2, // 20% of viewport width
            y: 0.1, // 10% of viewport height (~250px at 1080p)
          },
          acceleration: 10, // ~2px/ms acceleration
        }}
      >
        <SortableContext
          items={itemIds}
          strategy={rectSortingStrategy}
          disabled={!effectiveDraggingEnabled}
        >
          {/* role="list" for accessibility */}
          <div
            role="list"
            aria-label="Inspiration items"
            className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4')}
          >
            {items.map((item, index) => (
              <SortableInspirationCard
                key={item.id}
                id={item.id}
                title={item.title}
                imageUrl={item.imageUrl}
                thumbnailUrl={item.thumbnailUrl}
                sourceUrl={item.sourceUrl}
                tags={item.tags}
                index={index}
                totalItems={items.length}
                onClick={() => onCardClick?.(item.id)}
                onMenuClick={e => onMenuClick?.(item.id, e)}
                isDraggingEnabled={effectiveDraggingEnabled}
                tabIndex={getTabIndex(index)}
                isSelected={activeIndex === index}
                ref={(el: HTMLDivElement | null) => {
                  itemRefs.current[index] = el
                }}
              />
            ))}
          </div>
        </SortableContext>

        {/* DragOverlay with enhanced drag preview */}
        <DragOverlay
          dropAnimation={{
            duration: 300, // < 300ms animation
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          <InspirationDragPreview item={activeItem} />
        </DragOverlay>
      </DndContext>

      {/* Loading overlay during reorder or undo */}
      {isReordering || isUndoing ? (
        <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden="true" />
      ) : null}
    </div>
  )
}

export default DraggableInspirationGallery
