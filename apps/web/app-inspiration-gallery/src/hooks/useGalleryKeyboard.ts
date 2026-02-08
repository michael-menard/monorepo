/**
 * useGalleryKeyboard Hook
 *
 * Keyboard shortcuts for gallery navigation and actions.
 * Implements WCAG 2.1 keyboard accessibility patterns.
 *
 * INSP-019: Keyboard Navigation & A11y
 */

import { useEffect, useCallback } from 'react'

export interface UseGalleryKeyboardOptions {
  /** Whether keyboard shortcuts are enabled */
  enabled?: boolean
  /** Called when Escape is pressed */
  onEscape?: () => void
  /** Called when Delete/Backspace is pressed */
  onDelete?: () => void
  /** Called when Enter is pressed */
  onEnter?: () => void
  /** Called when Ctrl/Cmd+A is pressed */
  onSelectAll?: () => void
  /** Called when 'a' is pressed (add to album) */
  onAddToAlbum?: () => void
  /** Called when 'm' is pressed (link to MOC) */
  onLinkToMoc?: () => void
  /** Called when 'e' is pressed (edit) */
  onEdit?: () => void
  /** Called when 'u' is pressed (upload) */
  onUpload?: () => void
  /** Called when 'n' is pressed (new album) */
  onNewAlbum?: () => void
  /** Container element ref for scoping shortcuts */
  containerRef?: React.RefObject<HTMLElement | null>
}

export interface UseGalleryKeyboardReturn {
  /** List of active keyboard shortcuts for display */
  shortcuts: Array<{ key: string; description: string; modifier?: string }>
}

/**
 * useGalleryKeyboard Hook
 *
 * Provides keyboard shortcuts for gallery operations:
 * - Escape: Clear selection / close modal
 * - Delete/Backspace: Delete selected items
 * - Enter: Open selected item
 * - Ctrl/Cmd+A: Select all
 * - 'a': Add to album
 * - 'm': Link to MOC
 * - 'e': Edit selected
 * - 'u': Upload new
 * - 'n': New album
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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
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

      switch (key) {
        case 'Escape':
          onEscape?.()
          break

        case 'Delete':
        case 'Backspace':
          // Only handle if not in an input
          if (onDelete) {
            event.preventDefault()
            onDelete()
          }
          break

        case 'Enter':
          onEnter?.()
          break

        case 'a':
          if (modKey && onSelectAll) {
            event.preventDefault()
            onSelectAll()
          } else if (!modKey && onAddToAlbum) {
            event.preventDefault()
            onAddToAlbum()
          }
          break

        case 'm':
          if (!modKey && onLinkToMoc) {
            event.preventDefault()
            onLinkToMoc()
          }
          break

        case 'e':
          if (!modKey && onEdit) {
            event.preventDefault()
            onEdit()
          }
          break

        case 'u':
          if (!modKey && onUpload) {
            event.preventDefault()
            onUpload()
          }
          break

        case 'n':
          if (!modKey && onNewAlbum) {
            event.preventDefault()
            onNewAlbum()
          }
          break
      }
    },
    [
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
    ],
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  // Return list of shortcuts for keyboard shortcut help
  const shortcuts = [
    { key: 'Esc', description: 'Clear selection' },
    { key: 'Del', description: 'Delete selected' },
    { key: 'Enter', description: 'Open selected' },
    { key: 'A', description: 'Select all', modifier: 'Ctrl' },
    { key: 'A', description: 'Add to album' },
    { key: 'M', description: 'Link to MOC' },
    { key: 'E', description: 'Edit selected' },
    { key: 'U', description: 'Upload new' },
    { key: 'N', description: 'New album' },
  ]

  return { shortcuts }
}

export default useGalleryKeyboard
