/**
 * SortableGallery Types
 *
 * Zod schemas and TypeScript types for the SortableGallery component.
 * Story REPA-007: Generic, reusable drag-and-drop gallery component
 */

import { z } from 'zod'

/**
 * Base sortable item schema
 * All items must have an id field for drag-and-drop identification
 */
export const SortableItemSchema = z.object({
  id: z.string().min(1, 'Item ID must not be empty'),
})

export type SortableItem = z.infer<typeof SortableItemSchema>

/**
 * Sensor configuration for drag-and-drop activation
 */
export const SensorConfigSchema = z.object({
  /** PointerSensor activation distance threshold in pixels (default: 8px) */
  pointerThreshold: z.number().positive().optional().default(8),
  /** TouchSensor delay in milliseconds (default: 300ms) */
  touchDelay: z.number().nonnegative().optional().default(300),
  /** TouchSensor tolerance in pixels (default: 5px) */
  touchTolerance: z.number().nonnegative().optional().default(5),
})

export type SensorConfig = z.infer<typeof SensorConfigSchema>

/**
 * Layout mode for the gallery
 */
export const LayoutModeSchema = z.enum(['grid', 'list'])
export type LayoutMode = z.infer<typeof LayoutModeSchema>

/**
 * Data-only props schema (validated with Zod)
 */
export const SortableGalleryPropsDataSchema = z.object({
  /** Whether dragging is enabled (default: true) */
  isDraggingEnabled: z.boolean().optional().default(true),
  /** Layout mode: 'grid' or 'list' (default: 'grid') */
  layout: LayoutModeSchema.optional().default('grid'),
  /** Undo timeout in milliseconds (default: 5000ms) */
  undoTimeout: z.number().positive().optional().default(5000),
  /** Sensor configuration for drag activation */
  sensorConfig: SensorConfigSchema.optional(),
  /** Grid column configuration (only used when layout='grid') */
  gridColumns: z
    .object({
      sm: z.number().positive().optional(),
      md: z.number().positive().optional(),
      lg: z.number().positive().optional(),
      xl: z.number().positive().optional(),
    })
    .optional(),
  /** Gap size for grid/list spacing (default: 6) */
  gap: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(8),
      z.literal(10),
      z.literal(12),
    ])
    .optional()
    .default(6),
  /** Additional CSS classes for the container */
  className: z.string().optional(),
  /** ARIA label for the gallery */
  ariaLabel: z.string().optional().default('Sortable gallery items'),
})

/**
 * SortableGallery props with TypeScript generics for items and callbacks
 */
export type SortableGalleryProps<T extends SortableItem> = z.infer<
  typeof SortableGalleryPropsDataSchema
> & {
  /** Items to display and reorder */
  items: T[]
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Optional custom drag overlay render function */
  renderDragOverlay?: (item: T | null) => React.ReactNode
  /** Called when items are reordered - should persist to API */
  onReorder: (items: T[]) => Promise<void>
  /** Called when reorder fails (optional) */
  onError?: (error: unknown, items: T[]) => void
}

/**
 * Undo context for tracking pending undo operations
 */
export const UndoContextSchema = z.object({
  /** Original items array before reorder */
  originalItems: z.array(z.any()),
  /** Timeout ID for auto-dismiss */
  timeoutId: z.custom<ReturnType<typeof setTimeout> | null>(),
  /** Whether undo is still active */
  isActive: z.boolean(),
  /** Toast ID for dismissing */
  toastId: z.union([z.string(), z.number(), z.null()]),
})

export type UndoContext<T extends SortableItem> = {
  originalItems: T[]
  timeoutId: ReturnType<typeof setTimeout> | null
  isActive: boolean
  toastId: string | number | null
}
