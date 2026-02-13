/**
 * DraggableWishlistGallery Component
 *
 * Gallery container with DndContext and SortableContext for drag-and-drop reordering.
 * Manages sensors, reorder logic, error handling, and rollback.
 *
 * Story WISH-2005a: Drag-and-drop reordering with dnd-kit
 * Story WISH-2005b: Optimistic updates and undo flow
 * Story WISH-2006: Accessibility (keyboard navigation and shortcuts)
 * Story SETS-MVP-0320: Exit animations for item removal
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
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
import { Button } from '@repo/app-component-library'
import { GalleryGrid } from '@repo/gallery'
import { z } from 'zod'
import { WishlistItemSchema, type WishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  useReorderWishlistMutation,
  wishlistGalleryApi,
} from '@repo/api-client/rtk/wishlist-gallery-api'
import { useDispatch } from 'react-redux'
import { SortableWishlistCard } from '../SortableWishlistCard'
import { WishlistDragPreview } from '../WishlistDragPreview'
import { useKeyboardShortcuts } from '@repo/gallery'
import { useAnnouncer } from '@repo/accessibility'
import { useRovingTabIndex } from '@repo/gallery'

/**
 * DraggableWishlistGallery props schema (data-only)
 * Per CLAUDE.md: Use Zod for data structures, TypeScript types for functions
 */
const DraggableWishlistGalleryPropsDataSchema = z.object({
  /** Items to display and reorder */
  items: z.array(WishlistItemSchema),
  /** Whether dragging is enabled (disable when not in manual sort mode) */
  isDraggingEnabled: z.boolean().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
})

/**
 * DraggableWishlistGallery props
 * Combines Zod-validated data with function callbacks
 */
export type DraggableWishlistGalleryProps = z.infer<
  typeof DraggableWishlistGalleryPropsDataSchema
> & {
  /** Click handler for card click */
  onCardClick?: (itemId: string) => void
  /** Got It button handler (WISH-2042) */
  onGotIt?: (item: WishlistItem) => void
  /** Delete button handler (WISH-2041) */
  onDelete?: (item: WishlistItem) => void
  /** Callback when items are reordered locally (for optimistic UI) */
  onLocalReorder?: (items: WishlistItem[]) => void
}

/**
 * Undo context for tracking pending undo operations
 * WISH-2005b AC 12-15: State management for undo flow
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
  originalItems: z.array(WishlistItemSchema),
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
 * WISH-2005b AC 7: Toast auto-dismisses after 5 seconds
 */
const UNDO_TOAST_DURATION = 5000

/**
 * DraggableWishlistGallery Component
 *
 * Renders a gallery of wishlist items that can be dragged and dropped to reorder.
 *
 * Features:
 * - PointerSensor with 8px activation threshold
 * - TouchSensor with 300ms delay, 5px tolerance
 * - KeyboardSensor with arrow key navigation
 * - DragOverlay for ghost preview
 * - Auto-scroll near viewport edges (250px zones)
 * - Error handling with toast notifications
 * - Rollback on API failure
 * - ARIA live region for screen reader announcements
 * - Undo flow with 5-second window (WISH-2005b)
 */
export function DraggableWishlistGallery({
  items: initialItems,
  onCardClick,
  onGotIt,
  onDelete,
  isDraggingEnabled = true,
  onLocalReorder,
  className,
}: DraggableWishlistGalleryProps) {
  // Redux dispatch for RTK Query cache manipulation
  const dispatch = useDispatch()

  // Navigation for A key shortcut (WISH-2006)
  const navigate = useNavigate()

  // Local state for visual ordering during drag
  const [items, setItems] = useState<WishlistItem[]>(initialItems)

  // Track active drag item for DragOverlay
  const [activeItem, setActiveItem] = useState<WishlistItem | null>(null)

  // Store original order for rollback
  const originalOrderRef = useRef<WishlistItem[]>([])

  // ARIA live region announcement (for drag-and-drop)
  const [announcement, setAnnouncement] = useState('')

  // WISH-2006: Screen reader announcements for keyboard actions
  const {
    announce,
    announcement: keyboardAnnouncement,
    priority: keyboardPriority,
  } = useAnnouncer()

  // WISH-2006: Container ref for keyboard shortcut scoping
  const containerRef = useRef<HTMLDivElement>(null)

  // WISH-2006: Item refs for focus management
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // WISH-2006: Roving tabindex for keyboard navigation
  const {
    activeIndex,
    getTabIndex,
    handleKeyDown: handleRovingKeyDown,
  } = useRovingTabIndex(items.length, containerRef, {
    wrapHorizontal: true,
    wrapVertical: false,
    ariaLabel: 'Wishlist items',
  })

  // RTK Query mutation
  const [reorderWishlist, { isLoading: isReordering }] = useReorderWishlistMutation()

  // Ref to track pending reorder payload for retry
  const pendingReorderRef = useRef<{ items: Array<{ id: string; sortOrder: number }> } | null>(null)

  // WISH-2005b AC 12-15: Undo state management
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

  // WISH-2006: Focus management - focus active item when activeIndex changes
  useEffect(() => {
    if (!activeItem && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.focus()
    }
  }, [activeIndex, activeItem])

  // WISH-2006: Keyboard shortcuts for gallery actions
  useKeyboardShortcuts(
    [
      {
        key: 'a',
        handler: () => {
          navigate({ to: '/add' })
          announce('Navigating to add item page')
        },
        description: 'Add item',
      },
      {
        key: 'g',
        handler: () => {
          const focusedItem = items[activeIndex]
          if (focusedItem && onGotIt) {
            onGotIt(focusedItem)
            announce(`Opening Got It modal for ${focusedItem.title}`)
          }
        },
        description: 'Got it',
      },
      {
        key: 'Delete',
        handler: () => {
          const focusedItem = items[activeIndex]
          if (focusedItem && onDelete) {
            onDelete(focusedItem)
            announce(`Opening delete confirmation for ${focusedItem.title}`)
          }
        },
        description: 'Delete',
      },
      {
        key: 'Enter',
        handler: () => {
          const focusedItem = items[activeIndex]
          if (focusedItem && onCardClick) {
            onCardClick(focusedItem.id)
            announce(`Opening ${focusedItem.title}`)
          }
        },
        description: 'View details',
      },
    ],
    containerRef,
    { enabled: !activeItem }, // Disable shortcuts during drag
  )

  // WISH-2005b AC 13: Cleanup undo on unmount/route navigation
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
   * WISH-2005b AC 12, 15: Clear previous undo context
   * Called when a new reorder happens or undo is executed
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
   * WISH-2005b AC 8-11: Handle undo action
   * Restores original order via API call
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
      // AC 8: Restore original order in local state immediately (optimistic)
      setItems(originalItems)
      if (onLocalReorder) {
        onLocalReorder(originalItems)
      }

      // AC 9: Call API with original sortOrder values
      await reorderWishlist({ items: originalOrder }).unwrap()

      // AC 10: Show success confirmation toast
      toast.success('Order restored', {
        duration: 3000,
      })

      // Announce to screen reader
      setAnnouncement('Order restored to previous arrangement.')
    } catch {
      // AC 11: Undo failed - show error toast with retry
      toast.error('Failed to restore order', {
        action: {
          label: 'Retry',
          onClick: () => handleUndo(),
        },
        duration: 5000,
      })

      // AC 18: Invalidate cache on undo failure to force re-fetch
      dispatch(wishlistGalleryApi.util.invalidateTags([{ type: 'Wishlist', id: 'LIST' }]))
    } finally {
      setIsUndoing(false)
      clearUndoContext()
    }
  }, [reorderWishlist, onLocalReorder, clearUndoContext, dispatch])

  /**
   * WISH-2005b AC 6-7: Show success toast with undo button
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
            {/* AC 8, 20: Undo button - keyboard accessible */}
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

  // Configure sensors per AC requirements
  // WISH-2006: Removed KeyboardSensor to avoid conflict with useRovingTabIndex
  // Drag-and-drop is still accessible via PointerSensor and TouchSensor
  const sensors = useSensors(
    // AC 1: Mouse drag with 8px threshold
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // AC 2: Touch drag with 300ms delay, 5px tolerance
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
        // WISH-2005b AC 15: Cancel previous undo window on new drag
        clearUndoContext()

        // Store original order for potential rollback
        originalOrderRef.current = [...items]
        setActiveItem(draggedItem)

        // AC 19: Screen reader announcement
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

      // WISH-2005b AC 3: Capture original order for undo
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

      // AC 19: Screen reader announcement
      const movedItem = reorderedItems[newIndex]
      setAnnouncement(
        `${movedItem?.title || 'Item'} dropped. New position: ${newIndex + 1} of ${items.length}.`,
      )

      // AC 8-9: Build payload with recalculated sortOrder values
      const payload = {
        items: reorderedItems.map((item, index) => ({
          id: item.id,
          sortOrder: index,
        })),
      }

      // Store for potential retry
      pendingReorderRef.current = payload

      try {
        // AC 10: Call API to persist order (optimistic update in RTK Query)
        await reorderWishlist(payload).unwrap()

        // Success - clear pending
        pendingReorderRef.current = null

        // WISH-2005b AC 6-7, 12: Set up undo context for successful reorder
        undoContextRef.current = {
          originalOrder,
          originalItems,
          timeoutId: null,
          isActive: true,
          toastId: null,
        }

        // Show success toast with undo button
        showUndoToast(movedItem?.title || 'Item')

        // AC 21: Focus management is handled by dnd-kit automatically
      } catch (error) {
        // AC 11-14, WISH-2005b AC 5, 16: Error handling with rollback
        const rtkError = error as { status?: number }
        const status = rtkError?.status
        const message = getErrorMessage(status)

        // AC 12, WISH-2005b AC 5: Rollback to original order
        // Note: RTK Query's patchResult.undo() handles cache rollback
        // We also need to rollback local state
        setItems(originalOrderRef.current)
        if (onLocalReorder) {
          onLocalReorder(originalOrderRef.current)
        }

        // WISH-2005b AC 17: Handle specific error codes
        if (status === 404) {
          // AC 13: Auto-refresh on 404
          toast.error(message)
          // AC 17: Invalidate cache to force re-fetch
          dispatch(wishlistGalleryApi.util.invalidateTags([{ type: 'Wishlist', id: 'LIST' }]))
        } else if (status === 403) {
          // AC 17: Show permission error, invalidate cache
          toast.error(message)
          dispatch(wishlistGalleryApi.util.invalidateTags([{ type: 'Wishlist', id: 'LIST' }]))
        } else {
          // AC 14: Retry button for other errors (timeout, 500, etc.)
          toast.error(message, {
            action: {
              label: 'Retry',
              onClick: async () => {
                if (pendingReorderRef.current) {
                  try {
                    await reorderWishlist(pendingReorderRef.current).unwrap()
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
    [items, reorderWishlist, onLocalReorder, showUndoToast, dispatch],
  )

  // Handle drag cancel - restore original order
  const handleDragCancel = useCallback(() => {
    setActiveItem(null)
    setAnnouncement('Reorder cancelled.')
  }, [])

  // Get item IDs for SortableContext
  const itemIds = items.map(item => item.id)

  // Empty wishlist - AC 25: no drag handles
  if (items.length === 0) {
    return null
  }

  // Single item - no reordering possible
  const effectiveDraggingEnabled = isDraggingEnabled && items.length > 1

  // WISH-2006: Handle keyboard events - combine roving tabindex with other handlers
  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Only handle roving tabindex navigation when NOT dragging
      if (!activeItem) {
        handleRovingKeyDown(e)
      }
    },
    [activeItem, handleRovingKeyDown],
  )

  // WISH-2006: Focus the active card when container receives focus
  const handleContainerFocus = useCallback(
    (e: React.FocusEvent) => {
      // Only focus the card if focus came from outside the container (Tab in)
      // Not when focus is moving between cards inside the container
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
      data-testid="wishlist-gallery-container"
      aria-label="Wishlist items gallery. Use arrow keys to navigate, Enter to open, G for Got It, Delete to remove, A to add items."
    >
      {/* AC 19: ARIA live region for screen reader announcements (drag-and-drop - assertive) */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* WISH-2006: Announcer for keyboard shortcut feedback (polite) */}
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
        // AC 29: Auto-scroll configuration
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
          {/* AC 20: role="list" for accessibility */}
          <div role="list" aria-label="Wishlist items">
            <GalleryGrid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SortableWishlistCard
                      item={item}
                      index={index}
                      totalItems={items.length}
                      onClick={() => onCardClick?.(item.id)}
                      onGotIt={() => onGotIt?.(item)}
                      onDelete={() => onDelete?.(item)}
                      isDraggingEnabled={effectiveDraggingEnabled}
                      tabIndex={getTabIndex(index)}
                      isSelected={activeIndex === index}
                      ref={(el: HTMLDivElement | null) => {
                        itemRefs.current[index] = el
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </GalleryGrid>
          </div>
        </SortableContext>

        {/* AC 5: DragOverlay with enhanced drag preview (WISH-2005c) */}
        <DragOverlay
          dropAnimation={{
            duration: 300, // AC 24: < 300ms animation
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          <WishlistDragPreview item={activeItem} />
        </DragOverlay>
      </DndContext>

      {/* Loading overlay during reorder or undo */}
      {isReordering || isUndoing ? (
        <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden="true" />
      ) : null}
    </div>
  )
}

export default DraggableWishlistGallery
