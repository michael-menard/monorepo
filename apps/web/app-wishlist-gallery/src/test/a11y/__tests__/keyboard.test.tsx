/**
 * Keyboard Navigation Testing Utilities Tests
 *
 * Tests for keyboard interaction patterns including Tab navigation,
 * arrow key handling, and focus management.
 * Validates AC2 and AC4 requirements.
 *
 * @module a11y/__tests__/keyboard
 * @see WISH-2012
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  getFocusableElements,
  getActiveElement,
  assertHasFocus,
  assertFocusWithin,
  testKeyboardAccessibility,
} from '../keyboard'

// Helper to create test elements
function createTestElement(html: string): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

function cleanupTestElement(container: HTMLElement): void {
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

describe('Keyboard Navigation Utilities', () => {
  let container: HTMLElement

  afterEach(() => {
    if (container) {
      cleanupTestElement(container)
    }
  })

  describe('getFocusableElements', () => {
    it('should find all focusable elements', () => {
      container = createTestElement(`
        <button>Button</button>
        <a href="#">Link</a>
        <input type="text" />
        <select><option>Option</option></select>
        <textarea></textarea>
      `)

      const focusable = getFocusableElements(container)

      expect(focusable).toHaveLength(5)
    })

    it('should exclude disabled elements', () => {
      container = createTestElement(`
        <button>Enabled</button>
        <button disabled>Disabled</button>
        <input type="text" disabled />
      `)

      const focusable = getFocusableElements(container)

      expect(focusable).toHaveLength(1)
    })

    it('should include elements with tabindex', () => {
      container = createTestElement(`
        <div tabindex="0">Focusable div</div>
        <div tabindex="-1">Not in tab order</div>
        <span>Not focusable</span>
      `)

      const focusable = getFocusableElements(container)

      expect(focusable).toHaveLength(1)
    })

    it('should exclude hidden inputs', () => {
      container = createTestElement(`
        <input type="text" />
        <input type="hidden" />
      `)

      const focusable = getFocusableElements(container)

      expect(focusable).toHaveLength(1)
    })

    it('should find contenteditable elements', () => {
      container = createTestElement(`
        <div contenteditable="true">Editable</div>
      `)

      const focusable = getFocusableElements(container)

      expect(focusable).toHaveLength(1)
    })
  })

  describe('getActiveElement', () => {
    it('should return null when body is focused', () => {
      document.body.focus()
      const active = getActiveElement()
      expect(active).toBeNull()
    })

    it('should return focused element', () => {
      container = createTestElement(`
        <button id="test-button">Test</button>
      `)

      const button = container.querySelector('#test-button') as HTMLElement
      button.focus()

      const active = getActiveElement()
      expect(active).toBe(button)
    })
  })

  describe('assertHasFocus', () => {
    it('should pass when element has focus', () => {
      container = createTestElement(`
        <button id="btn">Test</button>
      `)

      const button = container.querySelector('#btn') as HTMLElement
      button.focus()

      expect(() => assertHasFocus(button)).not.toThrow()
    })

    it('should throw when element does not have focus', () => {
      container = createTestElement(`
        <button id="btn1">One</button>
        <button id="btn2">Two</button>
      `)

      const btn1 = container.querySelector('#btn1') as HTMLElement
      const btn2 = container.querySelector('#btn2') as HTMLElement
      btn1.focus()

      expect(() => assertHasFocus(btn2)).toThrow(/Expected.*to have focus/)
    })

    it('should include custom message in error', () => {
      container = createTestElement(`
        <button id="btn1">One</button>
        <button id="btn2">Two</button>
      `)

      const btn1 = container.querySelector('#btn1') as HTMLElement
      const btn2 = container.querySelector('#btn2') as HTMLElement
      btn1.focus()

      expect(() => assertHasFocus(btn2, 'Custom message')).toThrow('Custom message')
    })
  })

  describe('assertFocusWithin', () => {
    it('should pass when focus is within container', () => {
      container = createTestElement(`
        <div id="container">
          <button id="btn">Test</button>
        </div>
      `)

      const containerEl = container.querySelector('#container') as HTMLElement
      const button = container.querySelector('#btn') as HTMLElement
      button.focus()

      expect(() => assertFocusWithin(containerEl)).not.toThrow()
    })

    it('should throw when focus is outside container', () => {
      container = createTestElement(`
        <div id="container">
          <button id="inside">Inside</button>
        </div>
        <button id="outside">Outside</button>
      `)

      const containerEl = container.querySelector('#container') as HTMLElement
      const outside = container.querySelector('#outside') as HTMLElement
      outside.focus()

      expect(() => assertFocusWithin(containerEl)).toThrow(/Expected focus to be within container/)
    })
  })

  describe('testKeyboardAccessibility', () => {
    it('should identify all interactive elements as accessible', async () => {
      container = createTestElement(`
        <button>Button</button>
        <a href="#">Link</a>
      `)

      const result = await testKeyboardAccessibility(container)

      expect(result.allAccessible).toBe(true)
      expect(result.inaccessibleElements).toHaveLength(0)
    })

    it('should detect inaccessible interactive elements', async () => {
      container = createTestElement(`
        <div role="button">Not focusable button</div>
        <button>Real button</button>
      `)

      const result = await testKeyboardAccessibility(container)

      expect(result.allAccessible).toBe(false)
      expect(result.inaccessibleElements.length).toBeGreaterThan(0)
    })

    it('should skip disabled elements', async () => {
      container = createTestElement(`
        <button disabled>Disabled</button>
        <button aria-disabled="true">Also disabled</button>
        <button>Enabled</button>
      `)

      const result = await testKeyboardAccessibility(container)

      expect(result.allAccessible).toBe(true)
      expect(result.totalInteractive).toBe(3)
    })

    it('should count total interactive elements', async () => {
      container = createTestElement(`
        <button>One</button>
        <button>Two</button>
        <a href="#">Three</a>
      `)

      const result = await testKeyboardAccessibility(container)

      expect(result.totalInteractive).toBe(3)
    })
  })

  describe('Tab navigation with userEvent', () => {
    it('should move focus to next element with Tab', async () => {
      const user = userEvent.setup()

      function TestComponent() {
        return (
          <div>
            <button id="btn1">First</button>
            <button id="btn2">Second</button>
          </div>
        )
      }

      const { getByText } = render(<TestComponent />)

      const btn1 = getByText('First')
      btn1.focus()

      await user.tab()

      expect(document.activeElement).toBe(getByText('Second'))
    })

    it('should move focus backwards with Shift+Tab', async () => {
      const user = userEvent.setup()

      function TestComponent() {
        return (
          <div>
            <button id="btn1">First</button>
            <button id="btn2">Second</button>
          </div>
        )
      }

      const { getByText } = render(<TestComponent />)

      const btn2 = getByText('Second')
      btn2.focus()

      await user.tab({ shift: true })

      expect(document.activeElement).toBe(getByText('First'))
    })
  })

  describe('Keyboard activation with userEvent', () => {
    it('should trigger button click with Enter', async () => {
      const user = userEvent.setup()
      let clicked = false

      function TestButton() {
        return <button onClick={() => (clicked = true)}>Click me</button>
      }

      const { getByRole } = render(<TestButton />)
      const button = getByRole('button')
      button.focus()

      await user.keyboard('{Enter}')

      expect(clicked).toBe(true)
    })

    it('should trigger button click with Space', async () => {
      const user = userEvent.setup()
      let clicked = false

      function TestButton() {
        return <button onClick={() => (clicked = true)}>Click me</button>
      }

      const { getByRole } = render(<TestButton />)
      const button = getByRole('button')
      button.focus()

      await user.keyboard(' ')

      expect(clicked).toBe(true)
    })
  })

  describe('Escape key handling', () => {
    it('should dispatch escape key event', async () => {
      const user = userEvent.setup()
      let escapedPressed = false

      function TestComponent() {
        return (
          <div
            onKeyDown={e => {
              if (e.key === 'Escape') escapedPressed = true
            }}
            tabIndex={0}
          >
            Press Escape
          </div>
        )
      }

      const { getByText } = render(<TestComponent />)
      const element = getByText('Press Escape')
      element.focus()

      await user.keyboard('{Escape}')

      expect(escapedPressed).toBe(true)
    })
  })

  describe('Arrow key navigation', () => {
    it('should dispatch arrow key events', async () => {
      const user = userEvent.setup()
      const arrowsPressed: string[] = []

      function TestComponent() {
        return (
          <div
            onKeyDown={e => arrowsPressed.push(e.key)}
            tabIndex={0}
          >
            Arrow test
          </div>
        )
      }

      const { getByText } = render(<TestComponent />)
      const element = getByText('Arrow test')
      element.focus()

      await user.keyboard('{ArrowUp}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowLeft}')
      await user.keyboard('{ArrowRight}')

      expect(arrowsPressed).toEqual(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
    })
  })

  describe('Home and End keys', () => {
    it('should dispatch Home and End key events', async () => {
      const user = userEvent.setup()
      const keysPressed: string[] = []

      function TestComponent() {
        return (
          <div
            onKeyDown={e => keysPressed.push(e.key)}
            tabIndex={0}
          >
            Home/End test
          </div>
        )
      }

      const { getByText } = render(<TestComponent />)
      const element = getByText('Home/End test')
      element.focus()

      await user.keyboard('{Home}')
      await user.keyboard('{End}')

      expect(keysPressed).toEqual(['Home', 'End'])
    })
  })

  describe('Focus trap testing', () => {
    it('should keep focus within container', async () => {
      const user = userEvent.setup()

      function FocusTrap() {
        return (
          <div data-testid="trap">
            <button>First</button>
            <button>Second</button>
            <button>Third</button>
          </div>
        )
      }

      const { getByText, getByTestId } = render(<FocusTrap />)

      const first = getByText('First')
      first.focus()

      // Tab through all elements
      await user.tab()
      expect(document.activeElement).toBe(getByText('Second'))

      await user.tab()
      expect(document.activeElement).toBe(getByText('Third'))

      // All focused elements should be within trap
      const trap = getByTestId('trap')
      expect(trap.contains(document.activeElement)).toBe(true)
    })
  })

  describe('Roving tabindex pattern', () => {
    it('should validate single tab stop', () => {
      container = createTestElement(`
        <div role="tablist">
          <button tabindex="0">Tab 1</button>
          <button tabindex="-1">Tab 2</button>
          <button tabindex="-1">Tab 3</button>
        </div>
      `)

      const tablist = container.querySelector('[role="tablist"]') as HTMLElement
      const tabindexZero = tablist.querySelectorAll('[tabindex="0"]')
      const tabindexNegative = tablist.querySelectorAll('[tabindex="-1"]')

      // Only one element should have tabindex="0"
      expect(tabindexZero.length).toBe(1)
      // Others should have tabindex="-1"
      expect(tabindexNegative.length).toBe(2)
    })
  })

  describe('Modal focus management', () => {
    it('should focus first focusable element in modal', () => {
      container = createTestElement(`
        <div role="dialog" aria-modal="true">
          <button id="close">Close</button>
          <input id="name" type="text" />
          <button id="save">Save</button>
        </div>
      `)

      const modal = container.querySelector('[role="dialog"]') as HTMLElement
      const focusable = getFocusableElements(modal)

      // Focus first element
      ;(focusable[0] as HTMLElement).focus()

      expect(document.activeElement?.id).toBe('close')
    })

    it('should contain multiple focusable elements', () => {
      container = createTestElement(`
        <div role="dialog" aria-modal="true">
          <button>Close</button>
          <input type="text" />
          <button>Save</button>
        </div>
      `)

      const modal = container.querySelector('[role="dialog"]') as HTMLElement
      const focusable = getFocusableElements(modal)

      expect(focusable.length).toBe(3)
    })
  })

  describe('Keyboard shortcut simulation', () => {
    it('should simulate Ctrl+S shortcut', async () => {
      const user = userEvent.setup()
      let shortcutPressed = false

      function TestComponent() {
        return (
          <div
            onKeyDown={e => {
              if (e.ctrlKey && e.key === 's') {
                e.preventDefault()
                shortcutPressed = true
              }
            }}
            tabIndex={0}
          >
            Shortcut test
          </div>
        )
      }

      const { getByText } = render(<TestComponent />)
      const element = getByText('Shortcut test')
      element.focus()

      await user.keyboard('{Control>}s{/Control}')

      expect(shortcutPressed).toBe(true)
    })
  })
})
