"use client"

import React from "react"

import { useState, useEffect, ReactNode, useCallback, useRef } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "brickvault-dashboard-layout"
const SIZE_STORAGE_KEY = "brickvault-dashboard-sizes"

export interface DashboardItem {
  id: string
  component: ReactNode
  label: string
  defaultColSpan?: 1 | 2 | 3
  defaultRowSpan?: number
  minHeight?: number
}

interface ItemSize {
  colSpan: 1 | 2 | 3
  height: number | "auto"
}

interface ResizableItemProps {
  id: string
  children: ReactNode
  isLoading?: boolean
  size: ItemSize
  onResize: (id: string, size: Partial<ItemSize>) => void
  maxCols: number
}

function ResizableItem({ id, children, isLoading, size, onResize, maxCols }: ResizableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const itemRef = useRef<HTMLDivElement>(null)
  const [isResizingWidth, setIsResizingWidth] = useState(false)
  const [isResizingHeight, setIsResizingHeight] = useState(false)
  const [isResizingBoth, setIsResizingBoth] = useState(false)
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${Math.min(size.colSpan, maxCols)}`,
    height: size.height === "auto" ? "auto" : `${size.height}px`,
    minHeight: size.height === "auto" ? undefined : `${size.height}px`,
  }

  // Width resize handler
  const handleWidthResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizingWidth(true)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const rect = itemRef.current?.getBoundingClientRect()
    startPosRef.current = { x: clientX, y: 0, width: rect?.width || 0, height: 0 }
  }, [])

  // Height resize handler
  const handleHeightResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizingHeight(true)
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const rect = itemRef.current?.getBoundingClientRect()
    startPosRef.current = { x: 0, y: clientY, width: 0, height: rect?.height || 0 }
  }, [])

  // Corner resize handler (both)
  const handleCornerResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizingBoth(true)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const rect = itemRef.current?.getBoundingClientRect()
    startPosRef.current = { x: clientX, y: clientY, width: rect?.width || 0, height: rect?.height || 0 }
  }, [])

  useEffect(() => {
    if (!isResizingWidth && !isResizingHeight && !isResizingBoth) return

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      if (isResizingWidth || isResizingBoth) {
        const deltaX = clientX - startPosRef.current.x
        const newWidth = startPosRef.current.width + deltaX
        const containerWidth = itemRef.current?.parentElement?.clientWidth || 0
        const colWidth = containerWidth / maxCols
        
        // Calculate new column span based on width
        let newColSpan = Math.round(newWidth / colWidth) as 1 | 2 | 3
        newColSpan = Math.max(1, Math.min(maxCols, newColSpan)) as 1 | 2 | 3
        
        if (newColSpan !== size.colSpan) {
          onResize(id, { colSpan: newColSpan })
        }
      }

      if (isResizingHeight || isResizingBoth) {
        const deltaY = clientY - startPosRef.current.y
        const newHeight = Math.max(150, startPosRef.current.height + deltaY)
        onResize(id, { height: Math.round(newHeight / 10) * 10 }) // Snap to 10px increments
      }
    }

    const handleMouseUp = () => {
      setIsResizingWidth(false)
      setIsResizingHeight(false)
      setIsResizingBoth(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("touchmove", handleMouseMove)
    document.addEventListener("touchend", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleMouseMove)
      document.removeEventListener("touchend", handleMouseUp)
    }
  }, [isResizingWidth, isResizingHeight, isResizingBoth, id, maxCols, onResize, size.colSpan])

  const isResizing = isResizingWidth || isResizingHeight || isResizingBoth

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "z-50 opacity-50",
        isResizing && "z-40 select-none"
      )}
    >
      <div ref={itemRef} className="h-full">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -left-1 top-4 -translate-x-full z-10",
            "flex items-center justify-center h-8 w-6 rounded-l-md",
            "bg-muted/80 text-muted-foreground border border-r-0 border-border",
            "opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing",
            "hover:bg-muted hover:text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            (isLoading || isResizing) && "pointer-events-none"
          )}
          aria-label="Drag to reorder"
          disabled={isLoading || isResizing}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Card content wrapper with overflow handling */}
        <div className={cn(
          "h-full overflow-hidden rounded-lg",
          size.height !== "auto" && "[&>*]:h-full [&>*]:overflow-auto"
        )}>
          {children}
        </div>

        {/* Right resize handle (width) */}
        <div
          onMouseDown={handleWidthResizeStart}
          onTouchStart={handleWidthResizeStart}
          className={cn(
            "absolute right-0 top-0 bottom-4 w-2 cursor-ew-resize z-20",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-primary/20 rounded-r",
            isLoading && "pointer-events-none"
          )}
          aria-label="Resize width"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary/40 rounded-full" />
        </div>

        {/* Bottom resize handle (height) */}
        <div
          onMouseDown={handleHeightResizeStart}
          onTouchStart={handleHeightResizeStart}
          className={cn(
            "absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize z-20",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-primary/20 rounded-b",
            isLoading && "pointer-events-none"
          )}
          aria-label="Resize height"
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-8 bg-primary/40 rounded-full" />
        </div>

        {/* Corner resize handle (both) */}
        <div
          onMouseDown={handleCornerResizeStart}
          onTouchStart={handleCornerResizeStart}
          className={cn(
            "absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-primary/20 rounded-br",
            isLoading && "pointer-events-none"
          )}
          aria-label="Resize"
        >
          <svg
            className="absolute bottom-0.5 right-0.5 w-3 h-3 text-primary/60"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

interface DraggableGridProps {
  items: DashboardItem[]
  isLoading?: boolean
}

export function DraggableGrid({ items, isLoading }: DraggableGridProps) {
  const [orderedItems, setOrderedItems] = useState<DashboardItem[]>(items)
  const [itemSizes, setItemSizes] = useState<Record<string, ItemSize>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [maxCols, setMaxCols] = useState(3)
  const containerRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Detect container width and set max columns
  useEffect(() => {
    const updateMaxCols = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth
      if (width < 768) {
        setMaxCols(1)
      } else if (width < 1280) {
        setMaxCols(2)
      } else {
        setMaxCols(3)
      }
    }

    updateMaxCols()
    window.addEventListener("resize", updateMaxCols)
    return () => window.removeEventListener("resize", updateMaxCols)
  }, [])

  // Load saved order and sizes from localStorage
  useEffect(() => {
    setMounted(true)
    
    // Load order
    const savedOrder = localStorage.getItem(STORAGE_KEY)
    if (savedOrder) {
      try {
        const orderArray: string[] = JSON.parse(savedOrder)
        const reordered = orderArray
          .map(id => items.find(item => item.id === id))
          .filter((item): item is DashboardItem => item !== undefined)
        const newItems = items.filter(item => !orderArray.includes(item.id))
        setOrderedItems([...reordered, ...newItems])
      } catch {
        setOrderedItems(items)
      }
    } else {
      setOrderedItems(items)
    }

    // Load sizes
    const savedSizes = localStorage.getItem(SIZE_STORAGE_KEY)
    if (savedSizes) {
      try {
        setItemSizes(JSON.parse(savedSizes))
      } catch {
        // Initialize default sizes
        const defaults: Record<string, ItemSize> = {}
        items.forEach(item => {
          defaults[item.id] = {
            colSpan: item.defaultColSpan || 1,
            height: "auto"
          }
        })
        setItemSizes(defaults)
      }
    } else {
      const defaults: Record<string, ItemSize> = {}
      items.forEach(item => {
        defaults[item.id] = {
          colSpan: item.defaultColSpan || 1,
          height: "auto"
        }
      })
      setItemSizes(defaults)
    }
  }, [items])

  // Save order to localStorage
  const saveOrder = (newItems: DashboardItem[]) => {
    const order = newItems.map(item => item.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  }

  // Save sizes to localStorage
  const saveSizes = useCallback((newSizes: Record<string, ItemSize>) => {
    localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(newSizes))
  }, [])

  const handleResize = useCallback((id: string, newSize: Partial<ItemSize>) => {
    setItemSizes(prev => {
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          ...newSize
        }
      }
      saveSizes(updated)
      return updated
    })
  }, [saveSizes])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setOrderedItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id)
        const newIndex = currentItems.findIndex((item) => item.id === over.id)
        const newItems = arrayMove(currentItems, oldIndex, newIndex)
        saveOrder(newItems)
        return newItems
      })
    }

    setActiveId(null)
  }

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SIZE_STORAGE_KEY)
    setOrderedItems(items)
    const defaults: Record<string, ItemSize> = {}
    items.forEach(item => {
      defaults[item.id] = {
        colSpan: item.defaultColSpan || 1,
        height: "auto"
      }
    })
    setItemSizes(defaults)
  }

  const getItemSize = (id: string, defaultColSpan?: 1 | 2 | 3): ItemSize => {
    return itemSizes[id] || { colSpan: defaultColSpan || 1, height: "auto" }
  }

  const activeItem = activeId ? orderedItems.find(item => item.id === activeId) : null

  if (!mounted) {
    return (
      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {items.map((item) => (
          <div key={item.id} style={{ gridColumn: `span ${item.defaultColSpan || 1}` }}>
            {item.component}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Reset button */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Layout
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedItems.map(i => i.id)} strategy={rectSortingStrategy}>
          <div 
            ref={containerRef}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 pl-4 md:pl-6 auto-rows-auto"
          >
            {orderedItems.map((item) => (
              <ResizableItem
                key={item.id}
                id={item.id}
                isLoading={isLoading}
                size={getItemSize(item.id, item.defaultColSpan)}
                onResize={handleResize}
                maxCols={maxCols}
              >
                <section aria-label={item.label}>
                  {item.component}
                </section>
              </ResizableItem>
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {activeItem ? (
            <div className="opacity-90 shadow-2xl rounded-lg rotate-1 scale-[1.02]">
              {activeItem.component}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions */}
      <p className="text-xs text-center text-muted-foreground pt-2">
        Drag the handle to reorder. Drag edges to resize cards.
      </p>
    </div>
  )
}
