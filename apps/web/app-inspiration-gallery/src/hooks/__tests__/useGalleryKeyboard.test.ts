/**
 * useGalleryKeyboard Hook Tests
 *
 * INSP-019: Keyboard Navigation & A11y
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGalleryKeyboard } from '../useGalleryKeyboard'

describe('useGalleryKeyboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const dispatchKeyEvent = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    })
    document.dispatchEvent(event)
  }

  describe('shortcuts list', () => {
    it('returns list of available shortcuts', () => {
      const { result } = renderHook(() => useGalleryKeyboard())

      expect(result.current.shortcuts).toBeDefined()
      expect(result.current.shortcuts.length).toBeGreaterThan(0)
    })

    it('includes Escape shortcut', () => {
      const { result } = renderHook(() => useGalleryKeyboard())

      const escapeShortcut = result.current.shortcuts.find(s => s.key === 'Esc')
      expect(escapeShortcut).toBeDefined()
      expect(escapeShortcut?.description).toBe('Clear selection')
    })

    it('includes Delete shortcut', () => {
      const { result } = renderHook(() => useGalleryKeyboard())

      const deleteShortcut = result.current.shortcuts.find(s => s.key === 'Del')
      expect(deleteShortcut).toBeDefined()
      expect(deleteShortcut?.description).toBe('Delete selected')
    })

    it('includes Select All shortcut with modifier', () => {
      const { result } = renderHook(() => useGalleryKeyboard())

      const selectAllShortcut = result.current.shortcuts.find(
        s => s.key === 'A' && s.modifier === 'Ctrl',
      )
      expect(selectAllShortcut).toBeDefined()
      expect(selectAllShortcut?.description).toBe('Select all')
    })
  })

  describe('Escape key', () => {
    it('calls onEscape when Escape is pressed', () => {
      const onEscape = vi.fn()
      renderHook(() => useGalleryKeyboard({ onEscape }))

      dispatchKeyEvent('Escape')

      expect(onEscape).toHaveBeenCalledTimes(1)
    })
  })

  describe('Delete/Backspace keys', () => {
    it('calls onDelete when Delete is pressed', () => {
      const onDelete = vi.fn()
      renderHook(() => useGalleryKeyboard({ onDelete }))

      dispatchKeyEvent('Delete')

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('calls onDelete when Backspace is pressed', () => {
      const onDelete = vi.fn()
      renderHook(() => useGalleryKeyboard({ onDelete }))

      dispatchKeyEvent('Backspace')

      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Enter key', () => {
    it('calls onEnter when Enter is pressed', () => {
      const onEnter = vi.fn()
      renderHook(() => useGalleryKeyboard({ onEnter }))

      dispatchKeyEvent('Enter')

      expect(onEnter).toHaveBeenCalledTimes(1)
    })
  })

  describe('Ctrl/Cmd+A (Select All)', () => {
    it('calls onSelectAll when Ctrl+A is pressed', () => {
      const onSelectAll = vi.fn()
      renderHook(() => useGalleryKeyboard({ onSelectAll }))

      dispatchKeyEvent('a', { ctrlKey: true })

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it('calls onSelectAll when Cmd+A is pressed (Mac)', () => {
      const onSelectAll = vi.fn()
      renderHook(() => useGalleryKeyboard({ onSelectAll }))

      dispatchKeyEvent('a', { metaKey: true })

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('A key (Add to Album)', () => {
    it('calls onAddToAlbum when A is pressed without modifier', () => {
      const onAddToAlbum = vi.fn()
      renderHook(() => useGalleryKeyboard({ onAddToAlbum }))

      dispatchKeyEvent('a')

      expect(onAddToAlbum).toHaveBeenCalledTimes(1)
    })

    it('does not call onAddToAlbum when Ctrl+A is pressed', () => {
      const onAddToAlbum = vi.fn()
      const onSelectAll = vi.fn()
      renderHook(() => useGalleryKeyboard({ onAddToAlbum, onSelectAll }))

      dispatchKeyEvent('a', { ctrlKey: true })

      expect(onAddToAlbum).not.toHaveBeenCalled()
      expect(onSelectAll).toHaveBeenCalled()
    })
  })

  describe('M key (Link to MOC)', () => {
    it('calls onLinkToMoc when M is pressed', () => {
      const onLinkToMoc = vi.fn()
      renderHook(() => useGalleryKeyboard({ onLinkToMoc }))

      dispatchKeyEvent('m')

      expect(onLinkToMoc).toHaveBeenCalledTimes(1)
    })

    it('does not call onLinkToMoc when Ctrl+M is pressed', () => {
      const onLinkToMoc = vi.fn()
      renderHook(() => useGalleryKeyboard({ onLinkToMoc }))

      dispatchKeyEvent('m', { ctrlKey: true })

      expect(onLinkToMoc).not.toHaveBeenCalled()
    })
  })

  describe('E key (Edit)', () => {
    it('calls onEdit when E is pressed', () => {
      const onEdit = vi.fn()
      renderHook(() => useGalleryKeyboard({ onEdit }))

      dispatchKeyEvent('e')

      expect(onEdit).toHaveBeenCalledTimes(1)
    })
  })

  describe('U key (Upload)', () => {
    it('calls onUpload when U is pressed', () => {
      const onUpload = vi.fn()
      renderHook(() => useGalleryKeyboard({ onUpload }))

      dispatchKeyEvent('u')

      expect(onUpload).toHaveBeenCalledTimes(1)
    })
  })

  describe('N key (New Album)', () => {
    it('calls onNewAlbum when N is pressed', () => {
      const onNewAlbum = vi.fn()
      renderHook(() => useGalleryKeyboard({ onNewAlbum }))

      dispatchKeyEvent('n')

      expect(onNewAlbum).toHaveBeenCalledTimes(1)
    })
  })

  describe('enabled option', () => {
    it('does not trigger shortcuts when disabled', () => {
      const onEscape = vi.fn()
      renderHook(() => useGalleryKeyboard({ enabled: false, onEscape }))

      dispatchKeyEvent('Escape')

      expect(onEscape).not.toHaveBeenCalled()
    })

    it('triggers shortcuts when enabled', () => {
      const onEscape = vi.fn()
      renderHook(() => useGalleryKeyboard({ enabled: true, onEscape }))

      dispatchKeyEvent('Escape')

      expect(onEscape).toHaveBeenCalled()
    })
  })

  describe('input field handling', () => {
    it('does not trigger shortcuts when typing in input', () => {
      const onAddToAlbum = vi.fn()
      renderHook(() => useGalleryKeyboard({ onAddToAlbum }))

      // Create an input element
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      // Dispatch key event with input as target
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
      })
      Object.defineProperty(event, 'target', { value: input })
      document.dispatchEvent(event)

      expect(onAddToAlbum).not.toHaveBeenCalled()

      document.body.removeChild(input)
    })

    it('does not trigger shortcuts when typing in textarea', () => {
      const onAddToAlbum = vi.fn()
      renderHook(() => useGalleryKeyboard({ onAddToAlbum }))

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
      })
      Object.defineProperty(event, 'target', { value: textarea })
      document.dispatchEvent(event)

      expect(onAddToAlbum).not.toHaveBeenCalled()

      document.body.removeChild(textarea)
    })
  })

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const onEscape = vi.fn()
      const { unmount } = renderHook(() => useGalleryKeyboard({ onEscape }))

      unmount()

      dispatchKeyEvent('Escape')

      expect(onEscape).not.toHaveBeenCalled()
    })
  })
})
