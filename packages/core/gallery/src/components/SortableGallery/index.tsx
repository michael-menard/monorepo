/**
 * SortableGallery Component
 *
 * Generic, reusable drag-and-drop gallery with:
 * - Configurable sensor thresholds (PointerSensor, TouchSensor)
 * - onReorder callback for API persistence
 * - Built-in undo/redo flow with configurable timeout
 * - Grid/list layout support
 * - Keyboard navigation via useRovingTabIndex
 * - Accessibility via useAnnouncer
 * - DragOverlay slot for custom drag previews
 * - Error handling with rollback and retry
 *
 * Story REPA-007: Generic, reusable drag-and-drop gallery component
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  useSensors,
  useSensor,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { CheckCircle, Undo2, Loader2, AlertCircle } from 'lucide-react'
import { Button, cn } from '@repo/app-component-library'
import { useAnnouncer } from '@repo/accessibility'
import { GalleryGrid } from '../GalleryGrid'
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
import { createSensorsFromConfig, DEFAULT_SENSOR_CONFIG } from './utils/sensor-config'
import { reorderItems } from './utils/reorder'
import type { SortableGalleryProps, SortableItem, UndoContext } from './__types__'

/** Maps gap value to Tailwind gap class (safe for JIT purging) */
const gapClassMap: Record<number, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
}

/**
 * SortableGallery Component
 *
 * A generic drag-and-drop gallery that handles optimistic updates, undo/redo,
 * keyboard navigation, and accessibility.
 *
 * @example
 * ```tsx
 * function MyGallery() {
 *   const [items, setItems] = useState<MyItem[]>([...])
 *
 *   const handleReorder = async (reorderedItems: MyItem[]) => {
 *     await api.updateOrder(reorderedItems.map((item, index) => ({
 *       id: item.id,
 *       sortOrder: index,
 *     })))
 *   }
 *
 *   return (
 *     <SortableGallery
 *       items={items}
 *       onReorder={handleReorder}
 *       renderItem={(item, index) => (
 *         <MyCard key={item.id} item={item} />
 *       )}
 *       layout="grid"
 *       gridColumns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
 *     />
 *   )
 * }
 * ```
 */
export function SortableGallery<T extends SortableItem>({
  items: initialItems,
  renderItem,
  renderDragOverlay,
  onReorder,
  onError,
  isDraggingEnabled = true,
  layout = 'grid',
  undoTimeout = 5000,
  sensorConfig = DEFAULT_SENSOR_CONFIG,
  gridColumns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 6,
  className,
  ariaLabel = 'Sortable gallery items',
}: SortableGalleryProps<T>) {
  // Local state for visual ordering during drag
  const [items, setItems] = useState<T[]>(initialItems)

  // Track active drag item for DragOverlay
  const [activeItem, setActiveItem] = useState<T | null>(null)

  // Store original order for rollback
  const originalOrderRef = useRef<T[]>([])

  // ARIA live region announcement (for drag-and-drop)
  const [announcement, setAnnouncement] = useState('')

  // Screen reader announcements for keyboard actions
  const {
    announce,
    announcement: keyboardAnnouncement,
    priority: keyboardPriority,
  } = useAnnouncer()

  // Container ref for keyboard navigation
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
    ariaLabel,
  })

  // Undo state management
  const undoContextRef = useRef<UndoContext<T>>({
    originalItems: [],
    timeoutId: null,
    isActive: false,
    toastId: null,
  })

  // Track if undo is in progress
  const [isUndoing, setIsUndoing] = useState(false)

  // Track if reorder is in progress
  const [isReordering, setIsReordering] = useState(false)

  // Ref to track pending reorder for retry
  const pendingReorderRef = useRef<T[] | null>(null)

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

  // Cleanup undo on unmount
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

    const { originalItems, toastId } = undoContextRef.current

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

      // Call API with original order
      await onReorder(originalItems)

      // Show success confirmation toast
      toast.success('Order restored', {
        duration: 3000,
      })

      // Announce to screen reader
      setAnnouncement('Order restored to previous arrangement.')
    } catch (error) {
      // Undo failed - show error toast with retry
      toast.error('Failed to restore order', {
        action: {
          label: 'Retry',
          onClick: () => handleUndo(),
        },
        duration: 5000,
      })

      // Announce error
      announce('Failed to restore order. Please try again.')
    } finally {
      setIsUndoing(false)
      clearUndoContext()
    }
  }, [onReorder, clearUndoContext, announce])

  /**
   * Show success toast with undo button
   */
  const showUndoToast = useCallback(
    (itemTitle: string) => {
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
              <p className="text-sm text-gray-600 truncate">{itemTitle}</p>
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
              aria-label={`Undo reorder of ${itemTitle}`}
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
          duration: undoTimeout,
          position: 'bottom-right',
        },
      )

      // Store toast ID and set up auto-dismiss cleanup
      undoContextRef.current.toastId = toastId
      undoContextRef.current.timeoutId = setTimeout(() => {
        undoContextRef.current.isActive = false
        undoContextRef.current.toastId = null
      }, undoTimeout)
    },
    [handleUndo, isUndoing, undoTimeout],
  )

  // Configure sensors
  const sensorConfigs = createSensorsFromConfig(sensorConfig)
  const sensors = useSensors(
    ...sensorConfigs.map(({ sensor, options }) => useSensor(sensor, options)),
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
          `Picked up item at position ${index + 1} of ${items.length}. Use arrow keys to move, Space to drop, Escape to cancel.`,
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
      const originalItems = [...items]

      // Apply local reorder immediately (optimistic UI)
      const reorderedItems = reorderItems(items, oldIndex, newIndex)
      setItems(reorderedItems)

      // Screen reader announcement
      setAnnouncement(`Item dropped. New position: ${newIndex + 1} of ${items.length}.`)

      // Store for potential retry
      pendingReorderRef.current = reorderedItems

      setIsReordering(true)

      try {
        // Call API to persist order (optimistic update)
        await onReorder(reorderedItems)

        // Success - clear pending
        pendingReorderRef.current = null
        setIsReordering(false)

        // Set up undo context for successful reorder
        undoContextRef.current = {
          originalItems,
          timeoutId: null,
          isActive: true,
          toastId: null,
        }

        // Show success toast with undo button
        const movedItem = reorderedItems[newIndex] as Record<string, unknown>
        const itemDisplay = String(movedItem?.title ?? movedItem?.name ?? 'Item')
        showUndoToast(itemDisplay)
      } catch (error) {
        // Error handling with rollback
        setIsReordering(false)

        // Rollback to original order
        setItems(originalOrderRef.current)

        // Show error toast with retry
        toast.error(
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Failed to save order</span>
          </div>,
          {
            action: {
              label: 'Retry',
              onClick: async () => {
                if (pendingReorderRef.current) {
                  setIsReordering(true)
                  try {
                    await onReorder(pendingReorderRef.current)
                    setItems(pendingReorderRef.current)
                    pendingReorderRef.current = null
                    setIsReordering(false)
                    toast.success('Order saved.')
                  } catch {
                    setIsReordering(false)
                    toast.error('Failed to save order. Please try again.')
                  }
                }
              },
            },
            duration: 5000,
          },
        )

        // Call onError callback if provided
        if (onError) {
          onError(error, originalOrderRef.current)
        }

        // Announce error
        announce('Failed to save order. Please try again.')
      }
    },
    [items, onReorder, onError, showUndoToast, announce],
  )

  // Handle drag cancel - restore original order
  const handleDragCancel = useCallback(() => {
    setActiveItem(null)
    setAnnouncement('Reorder cancelled.')
  }, [])

  // Get item IDs for SortableContext
  const itemIds = items.map(item => item.id)

  // Empty gallery - render nothing
  if (items.length === 0) {
    return null
  }

  // Single item - no reordering possible
  const effectiveDraggingEnabled = isDraggingEnabled && items.length > 1

  // Handle keyboard events - roving tabindex navigation
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
      data-testid="sortable-gallery-container"
      aria-label={ariaLabel}
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
            y: 0.1, // 10% of viewport height
          },
          acceleration: 10,
        }}
      >
        <SortableContext
          items={itemIds}
          strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
          disabled={!effectiveDraggingEnabled}
        >
          <div role="list" aria-label={ariaLabel}>
            {layout === 'grid' ? (
              <GalleryGrid columns={gridColumns} gap={gap}>
                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      ref={(el: HTMLDivElement | null) => {
                        itemRefs.current[index] = el
                      }}
                      tabIndex={getTabIndex(index)}
                      data-index={index}
                    >
                      {renderItem(item, index)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </GalleryGrid>
            ) : (
              <div className={cn('flex flex-col', gapClassMap[gap] ?? 'gap-6')}>
                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      ref={(el: HTMLDivElement | null) => {
                        itemRefs.current[index] = el
                      }}
                      tabIndex={getTabIndex(index)}
                      data-index={index}
                    >
                      {renderItem(item, index)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </SortableContext>

        {/* DragOverlay with custom or default preview */}
        <DragOverlay
          dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {renderDragOverlay
            ? renderDragOverlay(activeItem)
            : activeItem && renderItem(activeItem, -1)}
        </DragOverlay>
      </DndContext>

      {/* Loading overlay during reorder or undo */}
      {isReordering || isUndoing ? (
        <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden="true" />
      ) : null}
    </div>
  )
}

export default SortableGallery
