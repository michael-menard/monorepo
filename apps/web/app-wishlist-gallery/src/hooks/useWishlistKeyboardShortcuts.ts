import { useEffect } from 'react'

interface UseWishlistKeyboardShortcutsProps {
  /** Currently focused wishlist item id in the gallery grid */
  focusedItemId?: string
  /** Handler to invoke when the user presses "G" on a focused item */
  onGotIt?: (id: string) => void
  /** Handler to invoke when the user presses Delete/Backspace on a focused item */
  onDelete?: (id: string) => void
  /** Whether any modal dialog is currently open (disables shortcuts) */
  isModalOpen?: boolean
}

/**
 * Global keyboard shortcuts for the wishlist gallery.
 *
 * - "A" opens the Add Wishlist Item page
 * - "G" triggers Got it! on the focused item
 * - Delete/Backspace opens delete confirmation for the focused item
 *
 * Shortcuts are disabled when a modal is open or when the user is typing
 * into an input, textarea, or contenteditable element.
 */
export function useWishlistKeyboardShortcuts({
  focusedItemId,
  onGotIt,
  onDelete,
  isModalOpen,
}: UseWishlistKeyboardShortcutsProps) {
  useEffect(() => {
    if (isModalOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      // Ignore keystrokes while typing in form controls/contenteditable
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      ) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'a': {
          // Add new wishlist item
          event.preventDefault()
          if (window.location.pathname !== '/wishlist/add') {
            window.location.href = '/wishlist/add'
          }
          break
        }

        case 'g': {
          // Got it! for focused item
          if (focusedItemId && onGotIt) {
            event.preventDefault()
            onGotIt(focusedItemId)
          }
          break
        }

        case 'delete':
        case 'backspace': {
          // Delete focused item
          if (focusedItemId && onDelete) {
            event.preventDefault()
            onDelete(focusedItemId)
          }
          break
        }

        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [focusedItemId, onGotIt, onDelete, isModalOpen])
}
