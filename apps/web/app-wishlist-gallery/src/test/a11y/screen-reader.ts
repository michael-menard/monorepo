/**
 * Screen Reader Testing Utilities
 *
 * Provides mock utilities and helpers for testing screen reader compatibility.
 * Since automated screen reader testing is limited, these utilities focus on
 * validating ARIA attributes and semantic HTML that screen readers rely on.
 *
 * @module a11y/screen-reader
 * @see AC3, AC6, AC7
 */

import { z } from 'zod'

/**
 * ARIA live politeness levels
 */
export const AriaLiveSchema = z.enum(['off', 'polite', 'assertive'])
export type AriaLive = z.infer<typeof AriaLiveSchema>

/**
 * Common ARIA roles used in wishlist components
 */
export const AriaRoleSchema = z.enum([
  'alert',
  'alertdialog',
  'button',
  'checkbox',
  'combobox',
  'dialog',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'menu',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'option',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'search',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'tablist',
  'tabpanel',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treeitem',
])

export type AriaRole = z.infer<typeof AriaRoleSchema>

/**
 * Screen reader announcement mock
 */
export interface MockAnnouncement {
  /** The text that would be announced */
  text: string
  /** Politeness level */
  politeness: AriaLive
  /** Element that triggered the announcement */
  source: Element | null
  /** Timestamp of announcement */
  timestamp: number
}

/**
 * ARIA validation result
 */
export interface AriaValidationResult {
  /** Whether all ARIA attributes are valid */
  valid: boolean
  /** List of issues found */
  issues: AriaIssue[]
  /** Element being validated */
  element: Element
}

/**
 * Single ARIA validation issue
 */
export interface AriaIssue {
  /** Issue type */
  type: 'missing' | 'invalid' | 'redundant' | 'mismatch'
  /** Attribute name */
  attribute: string
  /** Issue description */
  message: string
  /** Current value (if any) */
  currentValue?: string
  /** Expected value (if applicable) */
  expectedValue?: string
}

/**
 * Semantic HTML validation result
 */
export interface SemanticValidationResult {
  /** Whether semantic HTML is properly used */
  valid: boolean
  /** Issues found */
  issues: SemanticIssue[]
}

/**
 * Single semantic HTML issue
 */
export interface SemanticIssue {
  /** Issue type */
  type: 'div-as-button' | 'missing-landmark' | 'heading-skip' | 'non-semantic'
  /** Description of the issue */
  message: string
  /** Affected element */
  element: Element
  /** Suggested fix */
  suggestion: string
}

/**
 * Mock screen reader announcement collector
 *
 * Collects announcements from aria-live regions for testing.
 */
export class AnnouncementCollector {
  private announcements: MockAnnouncement[] = []
  private observer: MutationObserver | null = null

  /**
   * Starts collecting announcements from a container
   *
   * @param container - Container to observe for announcements
   *
   * @example
   * const collector = new AnnouncementCollector()
   * collector.start(document.body)
   * // ... perform actions that trigger announcements
   * const announcements = collector.getAnnouncements()
   * collector.stop()
   */
  start(container: Element = document.body): void {
    this.announcements = []

    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const target = mutation.target as Element
          this.checkForAnnouncement(target)
        }
      }
    })

    this.observer.observe(container, {
      childList: true,
      characterData: true,
      subtree: true,
    })
  }

  /**
   * Stops collecting announcements
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  /**
   * Gets all collected announcements
   */
  getAnnouncements(): MockAnnouncement[] {
    return [...this.announcements]
  }

  /**
   * Clears collected announcements
   */
  clear(): void {
    this.announcements = []
  }

  /**
   * Gets the most recent announcement
   */
  getLatest(): MockAnnouncement | undefined {
    return this.announcements[this.announcements.length - 1]
  }

  private checkForAnnouncement(element: Element): void {
    // Check if element or ancestor has aria-live
    let current: Element | null = element
    while (current) {
      const ariaLive = current.getAttribute('aria-live')
      const role = current.getAttribute('role')

      // Implicit live regions
      const implicitLive = role === 'alert' || role === 'status' || role === 'log'

      if (ariaLive || implicitLive) {
        const politeness = (ariaLive as AriaLive) || (role === 'alert' ? 'assertive' : 'polite')
        const text = current.textContent?.trim() || ''

        if (text) {
          this.announcements.push({
            text,
            politeness,
            source: current,
            timestamp: Date.now(),
          })
        }
        break
      }
      current = current.parentElement
    }
  }
}

/**
 * Gets the accessible name of an element
 *
 * Follows the accessible name computation algorithm (simplified).
 *
 * @param element - Element to get name for
 * @returns Accessible name or empty string
 *
 * @example
 * const name = getAccessibleName(button)
 * expect(name).toBe('Submit form')
 */
export function getAccessibleName(element: Element): string {
  // 1. aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const labelElements = labelledBy
      .split(' ')
      .map(id => document.getElementById(id))
      .filter(Boolean)
    const labelText = labelElements.map(el => el?.textContent?.trim()).join(' ')
    if (labelText) return labelText
  }

  // 2. aria-label
  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel

  // 3. For inputs, check associated label
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const id = element.id
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`)
      if (label) return label.textContent?.trim() || ''
    }
  }

  // 4. alt text for images
  if (element instanceof HTMLImageElement) {
    return element.alt || ''
  }

  // 5. title attribute
  const title = element.getAttribute('title')
  if (title) return title

  // 6. Text content for buttons and links
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLAnchorElement ||
    element.getAttribute('role') === 'button'
  ) {
    return element.textContent?.trim() || ''
  }

  return ''
}

/**
 * Gets the accessible description of an element
 *
 * @param element - Element to get description for
 * @returns Accessible description or empty string
 */
export function getAccessibleDescription(element: Element): string {
  const describedBy = element.getAttribute('aria-describedby')
  if (describedBy) {
    const descElements = describedBy
      .split(' ')
      .map(id => document.getElementById(id))
      .filter(Boolean)
    return descElements.map(el => el?.textContent?.trim()).join(' ')
  }

  return ''
}

/**
 * Validates ARIA attributes on an element
 *
 * Per AC6: ARIA attribute validation utilities.
 *
 * @param element - Element to validate
 * @returns Validation result
 *
 * @example
 * const result = validateAriaAttributes(combobox)
 * expect(result.valid).toBe(true)
 */
export function validateAriaAttributes(element: Element): AriaValidationResult {
  const issues: AriaIssue[] = []
  const role = element.getAttribute('role')

  // Check for required ARIA attributes based on role
  const requiredByRole: Record<string, string[]> = {
    checkbox: ['aria-checked'],
    combobox: ['aria-expanded'],
    slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    spinbutton: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    switch: ['aria-checked'],
    tab: ['aria-selected'],
    treeitem: ['aria-selected'],
    option: ['aria-selected'],
    radio: ['aria-checked'],
    menuitemcheckbox: ['aria-checked'],
    menuitemradio: ['aria-checked'],
    progressbar: ['aria-valuenow'],
  }

  if (role && requiredByRole[role]) {
    for (const attr of requiredByRole[role]) {
      if (!element.hasAttribute(attr)) {
        issues.push({
          type: 'missing',
          attribute: attr,
          message: `Role "${role}" requires ${attr} attribute`,
        })
      }
    }
  }

  // Check aria-expanded consistency
  const ariaExpanded = element.getAttribute('aria-expanded')
  if (ariaExpanded !== null && ariaExpanded !== 'true' && ariaExpanded !== 'false') {
    issues.push({
      type: 'invalid',
      attribute: 'aria-expanded',
      message: 'aria-expanded must be "true" or "false"',
      currentValue: ariaExpanded,
    })
  }

  // Check aria-hidden is not on focusable elements
  const ariaHidden = element.getAttribute('aria-hidden')
  if (ariaHidden === 'true') {
    const isFocusable =
      element instanceof HTMLButtonElement ||
      element instanceof HTMLAnchorElement ||
      element instanceof HTMLInputElement ||
      element.getAttribute('tabindex') !== '-1'

    if (isFocusable) {
      issues.push({
        type: 'invalid',
        attribute: 'aria-hidden',
        message: 'aria-hidden="true" should not be used on focusable elements',
      })
    }
  }

  // Check for accessible name on interactive elements
  if (
    element instanceof HTMLButtonElement ||
    element.getAttribute('role') === 'button' ||
    element instanceof HTMLAnchorElement
  ) {
    const name = getAccessibleName(element)
    if (!name) {
      issues.push({
        type: 'missing',
        attribute: 'aria-label',
        message: 'Interactive element has no accessible name',
      })
    }
  }

  // Validate aria-labelledby references exist
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const ids = labelledBy.split(' ')
    for (const id of ids) {
      if (!document.getElementById(id)) {
        issues.push({
          type: 'invalid',
          attribute: 'aria-labelledby',
          message: `Referenced element with id "${id}" not found`,
          currentValue: id,
        })
      }
    }
  }

  // Validate aria-describedby references exist
  const describedBy = element.getAttribute('aria-describedby')
  if (describedBy) {
    const ids = describedBy.split(' ')
    for (const id of ids) {
      if (!document.getElementById(id)) {
        issues.push({
          type: 'invalid',
          attribute: 'aria-describedby',
          message: `Referenced element with id "${id}" not found`,
          currentValue: id,
        })
      }
    }
  }

  // Validate aria-controls references exist
  const controls = element.getAttribute('aria-controls')
  if (controls) {
    const ids = controls.split(' ')
    for (const id of ids) {
      if (!document.getElementById(id)) {
        issues.push({
          type: 'invalid',
          attribute: 'aria-controls',
          message: `Referenced element with id "${id}" not found`,
          currentValue: id,
        })
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    element,
  }
}

/**
 * Validates aria-live region configuration
 *
 * Per AC3: Screen reader announcement testing.
 *
 * @param element - Element with aria-live
 * @returns Validation issues
 *
 * @example
 * const issues = validateLiveRegion(statusElement)
 * expect(issues).toHaveLength(0)
 */
export function validateLiveRegion(element: Element): AriaIssue[] {
  const issues: AriaIssue[] = []
  const ariaLive = element.getAttribute('aria-live')
  const role = element.getAttribute('role')

  // Check valid aria-live value
  if (ariaLive && !['off', 'polite', 'assertive'].includes(ariaLive)) {
    issues.push({
      type: 'invalid',
      attribute: 'aria-live',
      message: 'aria-live must be "off", "polite", or "assertive"',
      currentValue: ariaLive,
    })
  }

  // Check for appropriate aria-atomic
  if (ariaLive && ariaLive !== 'off') {
    const ariaAtomic = element.getAttribute('aria-atomic')
    // Note: Not having aria-atomic is usually fine, just note if present and invalid
    if (ariaAtomic && ariaAtomic !== 'true' && ariaAtomic !== 'false') {
      issues.push({
        type: 'invalid',
        attribute: 'aria-atomic',
        message: 'aria-atomic must be "true" or "false"',
        currentValue: ariaAtomic,
      })
    }
  }

  // Check for redundant aria-live on elements with implicit live regions
  if (role === 'alert' && ariaLive && ariaLive !== 'assertive') {
    issues.push({
      type: 'mismatch',
      attribute: 'aria-live',
      message: 'role="alert" implies aria-live="assertive"',
      currentValue: ariaLive,
      expectedValue: 'assertive',
    })
  }

  if (role === 'status' && ariaLive && ariaLive !== 'polite') {
    issues.push({
      type: 'mismatch',
      attribute: 'aria-live',
      message: 'role="status" implies aria-live="polite"',
      currentValue: ariaLive,
      expectedValue: 'polite',
    })
  }

  return issues
}

/**
 * Validates semantic HTML usage
 *
 * Per AC7: Semantic HTML validation.
 *
 * @param container - Container to validate
 * @returns Validation result
 *
 * @example
 * const result = validateSemanticHTML(container)
 * expect(result.valid).toBe(true)
 */
export function validateSemanticHTML(container: Element): SemanticValidationResult {
  const issues: SemanticIssue[] = []

  // Check for div elements with click handlers that should be buttons
  const clickableDivs = container.querySelectorAll('div[onclick], div[role="button"]')
  for (const div of clickableDivs) {
    if (div.getAttribute('role') !== 'button' || !div.hasAttribute('tabindex')) {
      issues.push({
        type: 'div-as-button',
        message: 'Clickable div should be a <button> element or have role="button" with tabindex',
        element: div,
        suggestion: 'Replace with <button> element for better accessibility',
      })
    }
  }

  // Check for span elements with click handlers
  const clickableSpans = container.querySelectorAll('span[onclick]')
  for (const span of clickableSpans) {
    issues.push({
      type: 'non-semantic',
      message: 'Clickable span should be a <button> or <a> element',
      element: span,
      suggestion: 'Replace with <button> or add role and tabindex',
    })
  }

  // Check heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  let lastLevel = 0

  for (const heading of headings) {
    const currentLevel = parseInt(heading.tagName[1])

    // Skip levels (e.g., h1 -> h3 without h2)
    if (currentLevel > lastLevel + 1 && lastLevel !== 0) {
      issues.push({
        type: 'heading-skip',
        message: `Heading level skipped from h${lastLevel} to h${currentLevel}`,
        element: heading,
        suggestion: `Use h${lastLevel + 1} instead or add intermediate heading`,
      })
    }

    lastLevel = currentLevel
  }

  // Check for missing landmark regions
  const hasMain = container.querySelector('main, [role="main"]')

  // Only check for landmarks if this seems like a full page (has multiple sections)
  const sections = container.querySelectorAll('section, article, aside, header, footer')
  if (sections.length > 2 && !hasMain) {
    issues.push({
      type: 'missing-landmark',
      message: 'Page appears to have multiple sections but no <main> landmark',
      element: container,
      suggestion: 'Add <main> element to identify primary content',
    })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Finds all elements with duplicate IDs (which breaks aria-labelledby, etc.)
 *
 * @param container - Container to check
 * @returns Map of duplicate IDs to their elements
 *
 * @example
 * const duplicates = findDuplicateIds(container)
 * expect(duplicates.size).toBe(0)
 */
export function findDuplicateIds(container: Element): Map<string, Element[]> {
  const idMap = new Map<string, Element[]>()
  const elements = container.querySelectorAll('[id]')

  for (const element of elements) {
    const id = element.id
    if (!idMap.has(id)) {
      idMap.set(id, [])
    }
    idMap.get(id)!.push(element)
  }

  // Filter to only duplicates
  const duplicates = new Map<string, Element[]>()
  for (const [id, elements] of idMap.entries()) {
    if (elements.length > 1) {
      duplicates.set(id, elements)
    }
  }

  return duplicates
}

/**
 * Asserts that an element would be announced with specific text
 *
 * @param element - Element to check
 * @param expectedText - Expected accessible name
 * @param options - Assertion options
 *
 * @example
 * assertAnnounces(button, 'Add item to wishlist')
 */
export function assertAnnounces(
  element: Element,
  expectedText: string,
  options: { exact?: boolean } = {}
): void {
  const { exact = false } = options
  const actualText = getAccessibleName(element)

  if (exact) {
    if (actualText !== expectedText) {
      throw new Error(
        `Expected element to announce "${expectedText}" but got "${actualText}"`
      )
    }
  } else {
    if (!actualText.toLowerCase().includes(expectedText.toLowerCase())) {
      throw new Error(
        `Expected element to announce text containing "${expectedText}" but got "${actualText}"`
      )
    }
  }
}

/**
 * Asserts that a live region has correct configuration
 *
 * @param element - Live region element
 * @param expectedPoliteness - Expected politeness level
 */
export function assertLiveRegion(
  element: Element,
  expectedPoliteness: AriaLive = 'polite'
): void {
  const ariaLive = element.getAttribute('aria-live')
  const role = element.getAttribute('role')

  // Check for implicit live regions
  const implicitLive =
    role === 'alert' ? 'assertive' : role === 'status' ? 'polite' : role === 'log' ? 'polite' : null

  const actualPoliteness = ariaLive || implicitLive

  if (actualPoliteness !== expectedPoliteness) {
    throw new Error(
      `Expected live region with politeness "${expectedPoliteness}" but got "${actualPoliteness}"`
    )
  }
}

/**
 * Creates a mock screen reader for testing announcements
 *
 * @returns Mock screen reader interface
 *
 * @example
 * const sr = createMockScreenReader()
 * sr.start()
 * // ... perform actions
 * expect(sr.getLastAnnouncement()).toContain('Item added')
 * sr.stop()
 */
export function createMockScreenReader() {
  const collector = new AnnouncementCollector()

  return {
    start: (container?: Element) => collector.start(container),
    stop: () => collector.stop(),
    getAnnouncements: () => collector.getAnnouncements(),
    getLastAnnouncement: () => collector.getLatest()?.text,
    clear: () => collector.clear(),
    hasAnnounced: (text: string) =>
      collector.getAnnouncements().some(a => a.text.includes(text)),
  }
}
