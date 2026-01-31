/**
 * Keyboard Navigation Testing Utilities
 *
 * Provides helpers for testing keyboard interaction patterns including
 * Tab navigation, arrow key handling, and focus management.
 *
 * @module a11y/keyboard
 * @see AC2, AC4, AC10
 */

import { userEvent } from '@testing-library/user-event'
import { z } from 'zod'

/**
 * Supported keyboard keys for testing
 */
export const KeyboardKeySchema = z.enum([
  'Tab',
  'Shift+Tab',
  'Enter',
  'Space',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

export type KeyboardKey = z.infer<typeof KeyboardKeySchema>

/**
 * Focus trap test result
 */
export interface FocusTrapResult {
  /** Whether focus stayed within the container */
  trapped: boolean
  /** Element that received focus after Tab */
  focusedElement: Element | null
  /** All focusable elements in the container */
  focusableElements: Element[]
  /** Order of focus traversal during test */
  focusOrder: Element[]
}

/**
 * Focus management assertion options
 */
export interface FocusAssertionOptions {
  /** Expected element to have focus (by role, label, or selector) */
  expectedFocus?: string
  /** Whether focus should be visible (using :focus-visible) */
  expectFocusVisible?: boolean
  /** Timeout for focus to settle (ms) */
  timeout?: number
}

/**
 * Result of keyboard navigation test
 */
export interface KeyboardNavigationResult {
  /** Starting focused element */
  startElement: Element | null
  /** Ending focused element after navigation */
  endElement: Element | null
  /** Whether focus moved as expected */
  focusMoved: boolean
  /** Sequence of focused elements */
  focusSequence: Element[]
}

/**
 * Creates a configured userEvent instance for keyboard testing
 *
 * @returns Configured userEvent
 */
export function createKeyboardUser() {
  return userEvent.setup()
}

/**
 * Gets all focusable elements within a container
 *
 * @param container - Container element to search
 * @returns Array of focusable elements in DOM order
 *
 * @example
 * const focusable = getFocusableElements(container)
 * expect(focusable).toHaveLength(3)
 */
export function getFocusableElements(container: Element): Element[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(container.querySelectorAll(focusableSelectors))
}

/**
 * Gets the currently focused element with safety checks
 *
 * @returns Currently focused element or null
 */
export function getActiveElement(): Element | null {
  return document.activeElement === document.body ? null : document.activeElement
}

/**
 * Simulates pressing Tab key and returns the new focused element
 *
 * @param user - userEvent instance
 * @param options - Optional shift key modifier
 * @returns Element that received focus
 *
 * @example
 * const user = createKeyboardUser()
 * const firstFocused = await pressTab(user)
 * expect(firstFocused).toHaveAttribute('role', 'button')
 */
export async function pressTab(
  user: ReturnType<typeof userEvent.setup>,
  options: { shift?: boolean } = {}
): Promise<Element | null> {
  if (options.shift) {
    await user.keyboard('{Shift>}{Tab}{/Shift}')
  } else {
    await user.keyboard('{Tab}')
  }
  return getActiveElement()
}

/**
 * Simulates pressing Enter key on the focused element
 *
 * @param user - userEvent instance
 *
 * @example
 * await pressEnter(user)
 */
export async function pressEnter(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.keyboard('{Enter}')
}

/**
 * Simulates pressing Space key on the focused element
 *
 * @param user - userEvent instance
 */
export async function pressSpace(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.keyboard(' ')
}

/**
 * Simulates pressing Escape key
 *
 * @param user - userEvent instance
 */
export async function pressEscape(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.keyboard('{Escape}')
}

/**
 * Simulates pressing arrow keys
 *
 * @param user - userEvent instance
 * @param direction - Arrow direction
 */
export async function pressArrow(
  user: ReturnType<typeof userEvent.setup>,
  direction: 'up' | 'down' | 'left' | 'right'
): Promise<void> {
  const keyMap = {
    up: '{ArrowUp}',
    down: '{ArrowDown}',
    left: '{ArrowLeft}',
    right: '{ArrowRight}',
  }
  await user.keyboard(keyMap[direction])
}

/**
 * Simulates pressing Home key
 *
 * @param user - userEvent instance
 */
export async function pressHome(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.keyboard('{Home}')
}

/**
 * Simulates pressing End key
 *
 * @param user - userEvent instance
 */
export async function pressEnd(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.keyboard('{End}')
}

/**
 * Navigates through elements using Tab and collects focus sequence
 *
 * @param user - userEvent instance
 * @param count - Number of Tab presses
 * @param options - Navigation options
 * @returns Navigation result with focus sequence
 *
 * @example
 * const result = await tabThrough(user, 3)
 * expect(result.focusSequence).toHaveLength(3)
 * expect(result.focusSequence[2]).toHaveRole('button')
 */
export async function tabThrough(
  user: ReturnType<typeof userEvent.setup>,
  count: number,
  options: { shift?: boolean; stopOnElement?: (el: Element) => boolean } = {}
): Promise<KeyboardNavigationResult> {
  const startElement = getActiveElement()
  const focusSequence: Element[] = []

  for (let i = 0; i < count; i++) {
    const focused = await pressTab(user, { shift: options.shift })
    if (focused) {
      focusSequence.push(focused)
      if (options.stopOnElement?.(focused)) {
        break
      }
    }
  }

  const endElement = getActiveElement()

  return {
    startElement,
    endElement,
    focusMoved: startElement !== endElement,
    focusSequence,
  }
}

/**
 * Tests focus trap behavior in a container (e.g., modal)
 *
 * Per AC4: Validates focus trap in modals.
 *
 * @param user - userEvent instance
 * @param container - Container that should trap focus
 * @returns Focus trap test result
 *
 * @example
 * const result = await testFocusTrap(user, modalContainer)
 * expect(result.trapped).toBe(true)
 */
export async function testFocusTrap(
  user: ReturnType<typeof userEvent.setup>,
  container: Element
): Promise<FocusTrapResult> {
  const focusableElements = getFocusableElements(container)
  const focusOrder: Element[] = []

  if (focusableElements.length === 0) {
    return {
      trapped: false,
      focusedElement: null,
      focusableElements: [],
      focusOrder: [],
    }
  }

  // Focus the first element
  ;(focusableElements[0] as HTMLElement).focus()
  focusOrder.push(focusableElements[0])

  // Tab through all elements plus one to test wrap
  for (let i = 0; i < focusableElements.length + 1; i++) {
    await user.keyboard('{Tab}')
    const current = getActiveElement()
    if (current) {
      focusOrder.push(current)
    }
  }

  const focusedElement = getActiveElement()
  const trapped = focusedElement ? container.contains(focusedElement) : false

  return {
    trapped,
    focusedElement,
    focusableElements,
    focusOrder,
  }
}

/**
 * Tests roving tabindex pattern (single tab stop, arrow key navigation)
 *
 * Per AC2: Helpers for roving tabindex pattern.
 *
 * @param user - userEvent instance
 * @param container - Container with roving tabindex
 * @param options - Test options
 * @returns Whether pattern is correctly implemented
 *
 * @example
 * const isValid = await testRovingTabindex(user, tabList, {
 *   orientation: 'horizontal'
 * })
 * expect(isValid).toBe(true)
 */
export async function testRovingTabindex(
  user: ReturnType<typeof userEvent.setup>,
  container: Element,
  options: {
    orientation?: 'horizontal' | 'vertical'
    wrap?: boolean
  } = {}
): Promise<{
  valid: boolean
  singleTabStop: boolean
  arrowNavigation: boolean
  wrapAround: boolean
}> {
  const { orientation = 'horizontal', wrap = true } = options
  const focusable = getFocusableElements(container)

  if (focusable.length < 2) {
    return {
      valid: false,
      singleTabStop: false,
      arrowNavigation: false,
      wrapAround: false,
    }
  }

  // Check single tab stop: only one element should have tabindex=0
  const tabindexZero = Array.from(container.querySelectorAll('[tabindex="0"]'))
  const singleTabStop = tabindexZero.length === 1

  // Focus the first item
  ;(focusable[0] as HTMLElement).focus()

  // Test arrow navigation
  const nextKey = orientation === 'horizontal' ? 'right' : 'down'
  const prevKey = orientation === 'horizontal' ? 'left' : 'up'

  await pressArrow(user, nextKey)
  const afterNext = getActiveElement()
  const arrowNavigation = afterNext !== focusable[0]

  // Test wrap around if enabled
  let wrapAround = !wrap // If wrap is disabled, this test passes by default

  if (wrap) {
    // Navigate to last item
    for (let i = 0; i < focusable.length; i++) {
      await pressArrow(user, nextKey)
    }
    // Should wrap to first
    wrapAround = getActiveElement() === focusable[0]

    // Or test reverse: go to first, press prev, should wrap to last
    ;(focusable[0] as HTMLElement).focus()
    await pressArrow(user, prevKey)
    wrapAround = wrapAround || getActiveElement() === focusable[focusable.length - 1]
  }

  return {
    valid: singleTabStop && arrowNavigation,
    singleTabStop,
    arrowNavigation,
    wrapAround,
  }
}

/**
 * Asserts that an element has focus
 *
 * @param element - Element that should have focus
 * @param message - Optional custom error message
 *
 * @example
 * assertHasFocus(saveButton, 'Save button should be focused after modal opens')
 */
export function assertHasFocus(element: Element, message?: string): void {
  const activeElement = getActiveElement()
  if (activeElement !== element) {
    const activeDesc = activeElement
      ? `${activeElement.tagName.toLowerCase()}${activeElement.id ? `#${activeElement.id}` : ''}`
      : 'null'
    const expectedDesc = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`
    throw new Error(message ?? `Expected ${expectedDesc} to have focus, but ${activeDesc} has focus`)
  }
}

/**
 * Asserts that focus is within a container
 *
 * @param container - Container that should contain focus
 * @param message - Optional custom error message
 *
 * @example
 * assertFocusWithin(modalElement, 'Focus should be trapped in modal')
 */
export function assertFocusWithin(container: Element, message?: string): void {
  const activeElement = getActiveElement()
  if (!activeElement || !container.contains(activeElement)) {
    throw new Error(message ?? `Expected focus to be within container, but it was outside`)
  }
}

/**
 * Waits for focus to settle on an element
 *
 * @param selector - CSS selector for expected focused element
 * @param options - Wait options
 * @returns Focused element
 */
export async function waitForFocus(
  selector: string,
  options: { timeout?: number; container?: Element } = {}
): Promise<Element> {
  const { timeout = 1000, container = document.body } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const element = container.querySelector(selector)
    if (element && getActiveElement() === element) {
      return element
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  throw new Error(`Focus did not settle on ${selector} within ${timeout}ms`)
}

/**
 * Tests modal focus management pattern
 *
 * Per AC4: Validates initial focus, trap, and restoration.
 *
 * @param user - userEvent instance
 * @param modalContainer - Modal container element
 * @param triggerElement - Element that opened the modal
 * @param closeAction - Function to close the modal
 * @returns Test results for each focus management aspect
 *
 * @example
 * const result = await testModalFocus(user, modal, openButton, () => fireEvent.click(closeBtn))
 * expect(result.initialFocus).toBe(true)
 * expect(result.focusTrap).toBe(true)
 * expect(result.focusRestoration).toBe(true)
 */
export async function testModalFocus(
  user: ReturnType<typeof userEvent.setup>,
  modalContainer: Element,
  triggerElement: Element,
  closeAction: () => void | Promise<void>
): Promise<{
  initialFocus: boolean
  focusTrap: boolean
  focusRestoration: boolean
}> {
  // Test 1: Initial focus should be inside modal
  const initialActiveElement = getActiveElement()
  const initialFocus = initialActiveElement ? modalContainer.contains(initialActiveElement) : false

  // Test 2: Focus trap
  const trapResult = await testFocusTrap(user, modalContainer)
  const focusTrap = trapResult.trapped

  // Test 3: Focus restoration after close
  await closeAction()

  // Wait a tick for focus restoration
  await new Promise(resolve => setTimeout(resolve, 0))

  const afterCloseActiveElement = getActiveElement()
  const focusRestoration = afterCloseActiveElement === triggerElement

  return {
    initialFocus,
    focusTrap,
    focusRestoration,
  }
}

/**
 * Simulates a keyboard shortcut combination
 *
 * @param user - userEvent instance
 * @param shortcut - Shortcut in format like 'Ctrl+S', 'Alt+Shift+N'
 *
 * @example
 * await pressShortcut(user, 'Ctrl+S')
 * await pressShortcut(user, 'Alt+Shift+N')
 */
export async function pressShortcut(
  user: ReturnType<typeof userEvent.setup>,
  shortcut: string
): Promise<void> {
  const parts = shortcut.split('+').map(p => p.trim().toLowerCase())
  const modifiers: string[] = []
  let key = ''

  for (const part of parts) {
    if (['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd'].includes(part)) {
      const modMap: Record<string, string> = {
        ctrl: 'Control',
        control: 'Control',
        alt: 'Alt',
        shift: 'Shift',
        meta: 'Meta',
        cmd: 'Meta',
      }
      modifiers.push(modMap[part])
    } else {
      key = part
    }
  }

  // Build the keyboard string with modifiers
  let keyboardString = ''
  for (const mod of modifiers) {
    keyboardString += `{${mod}>}`
  }
  keyboardString += `{${key}}`
  for (const mod of modifiers.reverse()) {
    keyboardString += `{/${mod}}`
  }

  await user.keyboard(keyboardString)
}

/**
 * Tests that all interactive elements are keyboard accessible
 *
 * @param container - Container to test
 * @returns Test results
 *
 * @example
 * const result = await testKeyboardAccessibility(container)
 * expect(result.allAccessible).toBe(true)
 */
export async function testKeyboardAccessibility(container: Element): Promise<{
  allAccessible: boolean
  inaccessibleElements: Element[]
  totalInteractive: number
}> {
  // Find all interactive elements
  const interactiveSelectors = [
    'button',
    'a[href]',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[onclick]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
  ].join(', ')

  const interactive = Array.from(container.querySelectorAll(interactiveSelectors))

  // Check each for keyboard accessibility
  const inaccessibleElements: Element[] = []

  for (const element of interactive) {
    const tabindex = element.getAttribute('tabindex')
    const isNativelyFocusable = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
      element.tagName
    )
    const isDisabled = element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true'

    // Skip disabled elements
    if (isDisabled) continue

    // Must be focusable
    const isFocusable = isNativelyFocusable || (tabindex !== null && tabindex !== '-1')

    if (!isFocusable) {
      inaccessibleElements.push(element)
    }
  }

  return {
    allAccessible: inaccessibleElements.length === 0,
    inaccessibleElements,
    totalInteractive: interactive.length,
  }
}
