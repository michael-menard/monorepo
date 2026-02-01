/**
 * useKeyboardShortcuts Hook
 *
 * Gallery-scoped keyboard shortcut manager. Shortcuts only activate when
 * the container element or its children have focus, and are ignored when
 * focus is in input/textarea/contenteditable elements.
 *
 * Story WISH-2006: Accessibility
 */

import { useEffect, useCallback, useRef } from 'react'
import { z } from 'zod'

/**
 * Schema for a keyboard shortcut definition
 */
export const KeyboardShortcutSchema = z.object({
  /** Key to listen for (e.g., 'a', 'g', 'Delete', 'Enter', 'Escape') */
  key: z.string(),
  /** Handler function to call when shortcut is triggered */
  handler: z.function(),
  /** Whether this shortcut is currently disabled */
  disabled: z.boolean().optional(),
  /** Description for accessibility (e.g., "Add item") */
  description: z.string().optional(),
})

export type KeyboardShortcut = z.infer<typeof KeyboardShortcutSchema> & {
  handler: () => void
}

/**
 * Options for the useKeyboardShortcuts hook
 */
export const KeyboardShortcutsOptionsSchema = z.object({
  /** Whether all shortcuts are enabled */
  enabled: z.boolean().optional().default(true),
  /** Prevent default browser behavior for handled keys */
  preventDefault: z.boolean().optional().default(true),
  /** Stop event propagation for handled keys */
  stopPropagation: z.boolean().optional().default(false),
})

export type KeyboardShortcutsOptions = z.infer<typeof KeyboardShortcutsOptionsSchema>

/**
 * Elements that should not trigger shortcuts when focused
 */
const IGNORED_ELEMENTS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Check if the currently focused element should block shortcuts
 *
 * @param target - The event target
 * @returns True if shortcuts should be blocked
 */
function shouldIgnoreKeyEvent(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  // Check if it's an input-like element
  if (IGNORED_ELEMENTS.has(target.tagName)) {
    return true
  }

  // Check for contenteditable
  if (target.isContentEditable) {
    return true
  }

  // Check for role="textbox" or role="searchbox"
  const role = target.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox') {
    return true
  }

  return false
}

/**
 * Normalize key names for consistent matching
 *
 * @param key - The key from the event
 * @returns Normalized key name
 */
function normalizeKey(key: string): string {
  // Handle common key name variations
  const keyMap: Record<string, string> = {
    Backspace: 'Delete', // Treat Backspace as Delete for accessibility
    Del: 'Delete',
    Esc: 'Escape',
    ' ': 'Space',
  }

  return keyMap[key] ?? key
}

/**
 * Hook for managing gallery-scoped keyboard shortcuts
 *
 * @param shortcuts - Array of shortcut definitions
 * @param containerRef - Ref to the container element that should receive shortcuts
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Gallery() {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *
 *   useKeyboardShortcuts(
 *     [
 *       { key: 'a', handler: openAddModal, description: 'Add item' },
 *       { key: 'g', handler: openGotItModal, description: 'Got it' },
 *       { key: 'Delete', handler: openDeleteModal, description: 'Delete' },
 *       { key: 'Enter', handler: openDetailView, description: 'View details' },
 *       { key: 'Escape', handler: closeModal, description: 'Close' },
 *     ],
 *     containerRef,
 *     { enabled: !modalOpen }
 *   )
 *
 *   return <div ref={containerRef} tabIndex={0}>...</div>
 * }
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  containerRef: React.RefObject<HTMLElement | null>,
  options: Partial<KeyboardShortcutsOptions> = {},
): void {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options

  // Use ref to avoid stale closures
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const optionsRef = useRef({ enabled, preventDefault, stopPropagation })
  optionsRef.current = { enabled, preventDefault, stopPropagation }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if shortcuts are enabled
    if (!optionsRef.current.enabled) {
      return
    }

    // Check if event should be ignored (focus in input, etc.)
    if (shouldIgnoreKeyEvent(event.target)) {
      return
    }

    // Normalize the key
    const normalizedKey = normalizeKey(event.key)

    // Find matching shortcut
    const shortcut = shortcutsRef.current.find(s => {
      // Case-insensitive match for letter keys
      const shortcutKey = s.key.length === 1 ? s.key.toLowerCase() : s.key
      const eventKey = normalizedKey.length === 1 ? normalizedKey.toLowerCase() : normalizedKey
      return shortcutKey === eventKey && !s.disabled
    })

    if (shortcut) {
      if (optionsRef.current.preventDefault) {
        event.preventDefault()
      }
      if (optionsRef.current.stopPropagation) {
        event.stopPropagation()
      }
      shortcut.handler()
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    // Add listener to the container
    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, handleKeyDown])
}

/**
 * Get shortcut descriptions for accessibility hints
 *
 * @param shortcuts - Array of shortcut definitions
 * @returns Formatted string of shortcut hints
 *
 * @example
 * ```typescript
 * const hints = getShortcutHints(shortcuts)
 * // "A: Add item, G: Got it, Del: Delete"
 * ```
 */
export function getShortcutHints(shortcuts: KeyboardShortcut[]): string {
  return shortcuts
    .filter(s => s.description && !s.disabled)
    .map(s => {
      const keyLabel = s.key.length === 1 ? s.key.toUpperCase() : s.key
      return `${keyLabel}: ${s.description}`
    })
    .join(', ')
}

export default useKeyboardShortcuts
