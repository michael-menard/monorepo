/**
 * Tests for useKeyboardShortcuts Hook
 *
 * Story REPA-008: Consolidate keyboard navigation hooks
 */

import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useRef } from 'react'
import { useKeyboardShortcuts, getShortcutHints, type KeyboardShortcut } from '../useKeyboardShortcuts'

// Test component that uses the hook
function TestComponent({
  shortcuts,
  enabled = true,
}: {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  useKeyboardShortcuts(shortcuts, containerRef, { enabled })

  return (
    <div ref={containerRef} tabIndex={0} data-testid="container">
      <button data-testid="button">Button</button>
      <input data-testid="input" type="text" />
      <textarea data-testid="textarea" />
    </div>
  )
}

describe('useKeyboardShortcuts', () => {
  it('should call handler when shortcut key is pressed', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'a' })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should be case-insensitive for letter keys', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'A' })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should handle special keys like Delete', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'Delete', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'Delete' })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should handle Escape key', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'Escape', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'Escape' })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should handle Enter key', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'Enter', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'Enter' })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should NOT trigger when focus is in an input element', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const input = document.querySelector('[data-testid="input"]')!
    fireEvent.keyDown(input, { key: 'a' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('should NOT trigger when focus is in a textarea', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const textarea = document.querySelector('[data-testid="textarea"]')!
    fireEvent.keyDown(textarea, { key: 'a' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('should NOT trigger when enabled is false', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler }]

    render(<TestComponent shortcuts={shortcuts} enabled={false} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'a' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('should NOT trigger disabled shortcuts', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler, disabled: true }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'a' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('should support multiple shortcuts', () => {
    const handlerA = vi.fn()
    const handlerG = vi.fn()
    const shortcuts: KeyboardShortcut[] = [
      { key: 'a', handler: handlerA },
      { key: 'g', handler: handlerG },
    ]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!

    fireEvent.keyDown(container, { key: 'a' })
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerG).not.toHaveBeenCalled()

    fireEvent.keyDown(container, { key: 'g' })
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerG).toHaveBeenCalledTimes(1)
  })

  it('should not call handler for non-registered keys', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'b' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('should normalize Backspace to Delete', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [{ key: 'Delete', handler }]

    render(<TestComponent shortcuts={shortcuts} />)

    const container = document.querySelector('[data-testid="container"]')!
    fireEvent.keyDown(container, { key: 'Backspace' })

    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('getShortcutHints', () => {
  it('should format shortcut hints', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'a', handler: vi.fn(), description: 'Add item' },
      { key: 'g', handler: vi.fn(), description: 'Got it' },
    ]

    const hints = getShortcutHints(shortcuts)
    expect(hints).toBe('A: Add item, G: Got it')
  })

  it('should skip shortcuts without descriptions', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'a', handler: vi.fn(), description: 'Add item' },
      { key: 'g', handler: vi.fn() },
    ]

    const hints = getShortcutHints(shortcuts)
    expect(hints).toBe('A: Add item')
  })

  it('should skip disabled shortcuts', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'a', handler: vi.fn(), description: 'Add item' },
      { key: 'g', handler: vi.fn(), description: 'Got it', disabled: true },
    ]

    const hints = getShortcutHints(shortcuts)
    expect(hints).toBe('A: Add item')
  })

  it('should handle special key names', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Delete', handler: vi.fn(), description: 'Delete item' },
      { key: 'Escape', handler: vi.fn(), description: 'Close' },
    ]

    const hints = getShortcutHints(shortcuts)
    expect(hints).toBe('Delete: Delete item, Escape: Close')
  })
})
