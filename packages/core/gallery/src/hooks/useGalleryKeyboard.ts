/**
 * useGalleryKeyboard Hook
 *
 * Keyboard shortcuts for gallery navigation and actions.
 * Built on top of useKeyboardShortcuts with gallery-specific patterns.
 * Implements WCAG 2.1 keyboard accessibility patterns.
 *
 * Story REPA-008: Consolidate keyboard navigation hooks
 */

import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useKeyboardShortcuts, type KeyboardShortcut } from './useKeyboardShortcuts'

/**
 * Options for the useGalleryKeyboard hook
 */
export const UseGalleryKeyboardOptionsSchema = z.object({
  /** Whether keyboard shortcuts are enabled */
  enabled: z.boolean().optional().default(true),
  /** Called when Escape is pressed */
  onEscape: z.function().optional(),
  /** Called when Delete/Backspace is pressed */
  onDelete: z.function().optional(),
  /** Called when Enter is pressed */
  onEnter: z.function().optional(),
  /** Called when Ctrl/Cmd+A is pressed */
  onSelectAll: z.function().optional(),
  /** Called when 'a' is pressed (add to album/wishlist) */
  onAddToAlbum: z.function().optional(),
  /** Called when 'm' is pressed (link to MOC) */
  onLinkToMoc: z.function().optional(),
  /** Called when 'e' is pressed (edit) */
  onEdit: z.function().optional(),
  /** Called when 'u' is pressed (upload) */
  onUpload: z.function().optional(),
  /** Called when 'n' is pressed (new album) */
  onNewAlbum: z.function().optional(),
  /** Container element ref for scoping shortcuts */
  containerRef: z.custom<React.RefObject<HTMLElement | null>>().optional(),
})

export type UseGalleryKeyboardOptions = {
  enabled?: boolean
  onEscape?: () => void
  onDelete?: () => void
  onEnter?: () => void
  onSelectAll?: () => void
  onAddToAlbum?: () => void
  onLinkToMoc?: () => void
  onEdit?: () => void
  onUpload?: () => void
  onNewAlbum?: () => void
  containerRef?: React.RefObject<HTMLElement | null>
}

/**
 * Shortcut item for display
 */
export const GalleryKeyboardShortcutSchema = z.object({
  key: z.string(),
  description: z.string(),
  modifier: z.string().optional(),
})

export type GalleryKeyboardShortcut = z.infer<typeof GalleryKeyboardShortcutSchema>

/**
 * Return type for useGalleryKeyboard hook
 */
export const UseGalleryKeyboardReturnSchema = z.object({
  /** List of active keyboard shortcuts for display */
  shortcuts: z.array(GalleryKeyboardShortcutSchema),
})

export type UseGalleryKeyboardReturn = z.infer<typeof UseGalleryKeyboardReturnSchema>

/**
 * Hook for gallery keyboard shortcuts
 *
 * Provides keyboard shortcuts for common gallery operations:
 * - Escape: Clear selection / close modal
 * - Delete/Backspace: Delete selected items
 * - Enter: Open selected item
 * - Ctrl/Cmd+A: Select all
 * - 'a': Add to album/wishlist
 * - 'm': Link to MOC
 * - 'e': Edit selected
 * - 'u': Upload new
 * - 'n': New album
 *
 * @param options - Configuration options with handler callbacks
 * @returns Object with shortcuts array for help UI
 *
 * @example
 * ```tsx
 * function Gallery() {
 *   const containerRef = useRef<HTMLDivElement>(null)
 *
 *   const { shortcuts } = useGalleryKeyboard({
 *     containerRef,
 *     onEscape: () => setSelectedItems([]),
 *     onDelete: () => handleDelete(),
 *     onEnter: () => handleOpen(),
 *     onSelectAll: () => selectAll(),
 *     onAddToAlbum: () => openAddModal(),
 *   })
 *
 *   return (
 *     <div ref={containerRef} tabIndex={0}>
 *       <KeyboardShortcutsHelp shortcuts={shortcuts} />
 *       {/* gallery content *\/}
 *     </div>
 *   )
 * }
 * ```
 */
export function useGalleryKeyboard(
  options: UseGalleryKeyboardOptions = {},
): UseGalleryKeyboardReturn {
  const {
    enabled = true,
    onEscape,
    onDelete,
    onEnter,
    onSelectAll,
    onAddToAlbum,
    onLinkToMoc,
    onEdit,
    onUpload,
    onNewAlbum,
    containerRef,
  } = options

  // Handle Ctrl/Cmd+A separately since useKeyboardShortcuts doesn't handle modifiers
  useEffect(() => {
    if (!enabled || !onSelectAll) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if typing in an input
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Check if event is within container (if specified)
      if (containerRef?.current && !containerRef.current.contains(target)) {
        return
      }

      const { key, metaKey, ctrlKey } = event
      const modKey = metaKey || ctrlKey

      if (key === 'a' && modKey) {
        event.preventDefault()
        onSelectAll()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onSelectAll, containerRef])

  // Build shortcuts array for useKeyboardShortcuts
  const keyboardShortcuts = useMemo<KeyboardShortcut[]>(() => {
    const shortcuts: KeyboardShortcut[] = []

    if (onEscape) {
      shortcuts.push({
        key: 'Escape',
        handler: onEscape,
        description: 'Clear selection',
      })
    }

    if (onDelete) {
      shortcuts.push({
        key: 'Delete',
        handler: onDelete,
        description: 'Delete selected',
      })
    }

    if (onEnter) {
      shortcuts.push({
        key: 'Enter',
        handler: onEnter,
        description: 'Open selected',
      })
    }

    if (onAddToAlbum) {
      shortcuts.push({
        key: 'a',
        handler: onAddToAlbum,
        description: 'Add to album',
      })
    }

    if (onLinkToMoc) {
      shortcuts.push({
        key: 'm',
        handler: onLinkToMoc,
        description: 'Link to MOC',
      })
    }

    if (onEdit) {
      shortcuts.push({
        key: 'e',
        handler: onEdit,
        description: 'Edit selected',
      })
    }

    if (onUpload) {
      shortcuts.push({
        key: 'u',
        handler: onUpload,
        description: 'Upload new',
      })
    }

    if (onNewAlbum) {
      shortcuts.push({
        key: 'n',
        handler: onNewAlbum,
        description: 'New album',
      })
    }

    return shortcuts
  }, [onEscape, onDelete, onEnter, onAddToAlbum, onLinkToMoc, onEdit, onUpload, onNewAlbum])

  // Use base keyboard shortcuts hook
  useKeyboardShortcuts(keyboardShortcuts, containerRef ?? { current: document.body }, { enabled })

  // Build shortcuts array for display (including Ctrl+A)
  const displayShortcuts = useMemo<GalleryKeyboardShortcut[]>(() => {
    const shortcuts: GalleryKeyboardShortcut[] = keyboardShortcuts.map(s => ({
      key: s.key.length === 1 ? s.key.toUpperCase() : s.key,
      description: s.description ?? '',
    }))

    if (onSelectAll) {
      shortcuts.push({
        key: 'A',
        description: 'Select all',
        modifier: 'Ctrl',
      })
    }

    return shortcuts
  }, [keyboardShortcuts, onSelectAll])

  return { shortcuts: displayShortcuts }
}

export default useGalleryKeyboard
