/**
 * Tests for useGalleryKeyboard Hook
 *
 * Story REPA-008: Consolidate keyboard navigation hooks
 */

import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { useGalleryKeyboard } from '../useGalleryKeyboard'

// Test component that uses the hook
function TestComponent({
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
}: {
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
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { shortcuts } = useGalleryKeyboard({
    enabled,
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
  })

  return (
    <div ref={containerRef} tabIndex={0} data-testid="container">
      <p>Shortcuts: {shortcuts.length}</p>
      <input data-testid="input" type="text" />
    </div>
  )
}

describe('useGalleryKeyboard', () => {
  describe('standard shortcuts', () => {
    it('should handle Escape key', () => {
      const onEscape = vi.fn()
      render(<TestComponent onEscape={onEscape} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'Escape' })

      expect(onEscape).toHaveBeenCalledTimes(1)
    })

    it('should handle Delete key', () => {
      const onDelete = vi.fn()
      render(<TestComponent onDelete={onDelete} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'Delete' })

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('should handle Backspace as Delete', () => {
      const onDelete = vi.fn()
      render(<TestComponent onDelete={onDelete} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'Backspace' })

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('should handle Enter key', () => {
      const onEnter = vi.fn()
      render(<TestComponent onEnter={onEnter} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'Enter' })

      expect(onEnter).toHaveBeenCalledTimes(1)
    })
  })

  describe('action shortcuts', () => {
    it('should handle "a" key for add to album', () => {
      const onAddToAlbum = vi.fn()
      render(<TestComponent onAddToAlbum={onAddToAlbum} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'a' })

      expect(onAddToAlbum).toHaveBeenCalledTimes(1)
    })

    it('should handle "m" key for link to MOC', () => {
      const onLinkToMoc = vi.fn()
      render(<TestComponent onLinkToMoc={onLinkToMoc} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'm' })

      expect(onLinkToMoc).toHaveBeenCalledTimes(1)
    })

    it('should handle "e" key for edit', () => {
      const onEdit = vi.fn()
      render(<TestComponent onEdit={onEdit} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'e' })

      expect(onEdit).toHaveBeenCalledTimes(1)
    })

    it('should handle "u" key for upload', () => {
      const onUpload = vi.fn()
      render(<TestComponent onUpload={onUpload} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'u' })

      expect(onUpload).toHaveBeenCalledTimes(1)
    })

    it('should handle "n" key for new album', () => {
      const onNewAlbum = vi.fn()
      render(<TestComponent onNewAlbum={onNewAlbum} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'n' })

      expect(onNewAlbum).toHaveBeenCalledTimes(1)
    })
  })

  describe('Ctrl/Cmd+A for select all', () => {
    it('should handle Ctrl+A', () => {
      const onSelectAll = vi.fn()
      render(<TestComponent onSelectAll={onSelectAll} />)

      fireEvent.keyDown(document, { key: 'a', ctrlKey: true })

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it('should handle Cmd+A (Meta key)', () => {
      const onSelectAll = vi.fn()
      render(<TestComponent onSelectAll={onSelectAll} />)

      fireEvent.keyDown(document, { key: 'a', metaKey: true })

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it('should NOT trigger add to album when Ctrl+A is pressed', () => {
      const onSelectAll = vi.fn()
      const onAddToAlbum = vi.fn()
      render(<TestComponent onSelectAll={onSelectAll} onAddToAlbum={onAddToAlbum} />)

      fireEvent.keyDown(document, { key: 'a', ctrlKey: true })

      expect(onSelectAll).toHaveBeenCalledTimes(1)
      expect(onAddToAlbum).not.toHaveBeenCalled()
    })
  })

  describe('input field blocking', () => {
    it('should NOT trigger shortcuts when typing in input', () => {
      const onAddToAlbum = vi.fn()
      render(<TestComponent onAddToAlbum={onAddToAlbum} />)

      const input = document.querySelector('[data-testid="input"]')!
      fireEvent.keyDown(input, { key: 'a' })

      expect(onAddToAlbum).not.toHaveBeenCalled()
    })
  })

  describe('enabled/disabled state', () => {
    it('should NOT trigger shortcuts when disabled', () => {
      const onEscape = vi.fn()
      render(<TestComponent onEscape={onEscape} enabled={false} />)

      const container = document.querySelector('[data-testid="container"]')!
      fireEvent.keyDown(container, { key: 'Escape' })

      expect(onEscape).not.toHaveBeenCalled()
    })
  })

  describe('shortcuts array', () => {
    it('should return shortcuts for display', () => {
      const { container } = render(
        <TestComponent
          onEscape={vi.fn()}
          onDelete={vi.fn()}
          onEnter={vi.fn()}
          onAddToAlbum={vi.fn()}
        />,
      )

      const text = container.textContent
      expect(text).toContain('Shortcuts: 4')
    })

    it('should include Ctrl+A when onSelectAll is provided', () => {
      const { container } = render(<TestComponent onSelectAll={vi.fn()} />)

      const text = container.textContent
      expect(text).toContain('Shortcuts: 1')
    })
  })
})
