/**
 * @dnd-kit Testing Mocks
 *
 * Provides reusable mock setup for components using @dnd-kit drag-and-drop.
 *
 * Usage:
 * ```typescript
 * import { mockDndContext } from '@/test/mocks/dnd-kit'
 *
 * vi.mock('@dnd-kit/core', () => mockDndContext())
 * ```
 *
 * @see https://docs.dndkit.com/introduction/getting-started
 */

import { vi } from 'vitest'

/**
 * Mock for DndContext component
 * Renders children directly without drag-drop functionality
 */
export const mockDndContext = () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
  DragOverlay: ({ children }: { children?: React.ReactNode }) => children || null,
  MouseSensor: vi.fn(),
  TouchSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(),
  closestCorners: vi.fn(),
  rectIntersection: vi.fn(),
  pointerWithin: vi.fn(),
})

/**
 * Mock for @dnd-kit/sortable
 * Provides mock implementations for sortable list functionality
 */
export const mockSortable = () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
    isSorting: false,
  }),
  sortableKeyboardCoordinates: vi.fn(),
  arrayMove: (array: unknown[], from: number, to: number) => {
    const newArray = [...array]
    const [moved] = newArray.splice(from, 1)
    newArray.splice(to, 0, moved)
    return newArray
  },
  verticalListSortingStrategy: vi.fn(),
  horizontalListSortingStrategy: vi.fn(),
  rectSortingStrategy: vi.fn(),
})

/**
 * Mock for @dnd-kit/utilities
 */
export const mockUtilities = () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
    Transition: {
      toString: () => '',
    },
  },
})
