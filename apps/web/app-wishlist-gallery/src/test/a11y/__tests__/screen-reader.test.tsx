/**
 * Screen Reader Testing Utilities Tests
 *
 * Tests for screen reader compatibility testing including ARIA validation,
 * live region testing, and semantic HTML validation.
 * Validates AC3, AC6, and AC7 requirements.
 *
 * @module a11y/__tests__/screen-reader
 * @see WISH-2012
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import {
  AnnouncementCollector,
  getAccessibleName,
  getAccessibleDescription,
  validateAriaAttributes,
  validateLiveRegion,
  validateSemanticHTML,
  findDuplicateIds,
  assertAnnounces,
  assertLiveRegion,
  createMockScreenReader,
} from '../screen-reader'

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

describe('Screen Reader Testing Utilities', () => {
  let container: HTMLElement

  afterEach(() => {
    if (container) {
      cleanupTestElement(container)
    }
  })

  describe('getAccessibleName', () => {
    it('should get name from aria-label', () => {
      container = createTestElement(`
        <button aria-label="Submit form">Submit</button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const name = getAccessibleName(button)

      expect(name).toBe('Submit form')
    })

    it('should get name from aria-labelledby', () => {
      container = createTestElement(`
        <span id="label">My Label</span>
        <button aria-labelledby="label">Submit</button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const name = getAccessibleName(button)

      expect(name).toBe('My Label')
    })

    it('should get name from associated label', () => {
      container = createTestElement(`
        <label for="input">Email Address</label>
        <input id="input" type="email" />
      `)

      const input = container.querySelector('input') as HTMLInputElement
      const name = getAccessibleName(input)

      expect(name).toBe('Email Address')
    })

    it('should get alt text from images', () => {
      container = createTestElement(`
        <img src="test.jpg" alt="Test image" />
      `)

      const img = container.querySelector('img') as HTMLImageElement
      const name = getAccessibleName(img)

      expect(name).toBe('Test image')
    })

    it('should get text content from buttons', () => {
      container = createTestElement(`
        <button>Click Me</button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const name = getAccessibleName(button)

      expect(name).toBe('Click Me')
    })

    it('should get title as fallback', () => {
      container = createTestElement(`
        <div role="button" title="Tooltip text">Icon</div>
      `)

      const button = container.querySelector('[role="button"]') as HTMLElement
      const name = getAccessibleName(button)

      expect(name).toBe('Tooltip text')
    })
  })

  describe('getAccessibleDescription', () => {
    it('should get description from aria-describedby', () => {
      container = createTestElement(`
        <span id="desc">Enter your email address</span>
        <input aria-describedby="desc" type="email" />
      `)

      const input = container.querySelector('input') as HTMLInputElement
      const description = getAccessibleDescription(input)

      expect(description).toBe('Enter your email address')
    })

    it('should handle multiple describedby IDs', () => {
      container = createTestElement(`
        <span id="hint">Hint text</span>
        <span id="error">Error message</span>
        <input aria-describedby="hint error" type="text" />
      `)

      const input = container.querySelector('input') as HTMLInputElement
      const description = getAccessibleDescription(input)

      expect(description).toBe('Hint text Error message')
    })

    it('should return empty string when no description', () => {
      container = createTestElement(`
        <input type="text" />
      `)

      const input = container.querySelector('input') as HTMLInputElement
      const description = getAccessibleDescription(input)

      expect(description).toBe('')
    })
  })

  describe('validateAriaAttributes', () => {
    it('should pass for valid ARIA attributes', () => {
      container = createTestElement(`
        <button aria-label="Submit">Submit</button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const result = validateAriaAttributes(button)

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect missing required attributes', () => {
      container = createTestElement(`
        <div role="checkbox"></div>
      `)

      const checkbox = container.querySelector('[role="checkbox"]') as HTMLElement
      const result = validateAriaAttributes(checkbox)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.attribute === 'aria-checked')).toBe(true)
    })

    it('should detect invalid aria-expanded values', () => {
      container = createTestElement(`
        <button aria-expanded="maybe">Toggle</button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const result = validateAriaAttributes(button)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.attribute === 'aria-expanded')).toBe(true)
    })

    it('should detect aria-hidden on focusable elements', () => {
      container = createTestElement(`
        <button aria-hidden="true">Hidden button</button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const result = validateAriaAttributes(button)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.message.includes('aria-hidden'))).toBe(true)
    })

    it('should detect missing accessible name on buttons', () => {
      container = createTestElement(`
        <button><span class="icon"></span></button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const result = validateAriaAttributes(button)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.message.includes('no accessible name'))).toBe(true)
    })

    it('should detect invalid aria-labelledby references', () => {
      container = createTestElement(`
        <button aria-labelledby="nonexistent">Button</button>
      `)

      const button = container.querySelector('button') as HTMLElement
      const result = validateAriaAttributes(button)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.attribute === 'aria-labelledby')).toBe(true)
    })

    it('should validate combobox required attributes', () => {
      container = createTestElement(`
        <div role="combobox"></div>
      `)

      const combobox = container.querySelector('[role="combobox"]') as HTMLElement
      const result = validateAriaAttributes(combobox)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.attribute === 'aria-expanded')).toBe(true)
    })

    it('should validate slider required attributes', () => {
      container = createTestElement(`
        <div role="slider"></div>
      `)

      const slider = container.querySelector('[role="slider"]') as HTMLElement
      const result = validateAriaAttributes(slider)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.attribute === 'aria-valuenow')).toBe(true)
      expect(result.issues.some(i => i.attribute === 'aria-valuemin')).toBe(true)
      expect(result.issues.some(i => i.attribute === 'aria-valuemax')).toBe(true)
    })
  })

  describe('validateLiveRegion', () => {
    it('should pass for valid live region', () => {
      container = createTestElement(`
        <div aria-live="polite">Status message</div>
      `)

      const region = container.querySelector('[aria-live]') as HTMLElement
      const issues = validateLiveRegion(region)

      expect(issues).toHaveLength(0)
    })

    it('should detect invalid aria-live values', () => {
      container = createTestElement(`
        <div aria-live="loud">Status</div>
      `)

      const region = container.querySelector('[aria-live]') as HTMLElement
      const issues = validateLiveRegion(region)

      expect(issues.some(i => i.attribute === 'aria-live')).toBe(true)
    })

    it('should detect mismatch between role and aria-live', () => {
      container = createTestElement(`
        <div role="alert" aria-live="polite">Alert!</div>
      `)

      const region = container.querySelector('[role="alert"]') as HTMLElement
      const issues = validateLiveRegion(region)

      expect(issues.some(i => i.type === 'mismatch')).toBe(true)
    })

    it('should detect invalid aria-atomic values', () => {
      container = createTestElement(`
        <div aria-live="polite" aria-atomic="yes">Status</div>
      `)

      const region = container.querySelector('[aria-live]') as HTMLElement
      const issues = validateLiveRegion(region)

      expect(issues.some(i => i.attribute === 'aria-atomic')).toBe(true)
    })
  })

  describe('validateSemanticHTML', () => {
    it('should pass for valid semantic HTML', () => {
      container = createTestElement(`
        <main>
          <h1>Title</h1>
          <h2>Subtitle</h2>
          <button>Click</button>
        </main>
      `)

      const result = validateSemanticHTML(container)

      expect(result.valid).toBe(true)
    })

    it('should detect clickable divs without proper ARIA', () => {
      container = createTestElement(`
        <div onclick="alert('click')">Clickable div</div>
      `)

      const result = validateSemanticHTML(container)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.type === 'div-as-button')).toBe(true)
    })

    it('should detect heading hierarchy skips', () => {
      container = createTestElement(`
        <h1>Main Title</h1>
        <h3>Skipped h2</h3>
      `)

      const result = validateSemanticHTML(container)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.type === 'heading-skip')).toBe(true)
    })

    it('should detect clickable spans', () => {
      container = createTestElement(`
        <span onclick="doSomething()">Click me</span>
      `)

      const result = validateSemanticHTML(container)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.type === 'non-semantic')).toBe(true)
    })

    it('should accept proper heading hierarchy', () => {
      container = createTestElement(`
        <h1>Level 1</h1>
        <h2>Level 2</h2>
        <h3>Level 3</h3>
        <h2>Another Level 2</h2>
      `)

      const result = validateSemanticHTML(container)

      expect(result.issues.filter(i => i.type === 'heading-skip')).toHaveLength(0)
    })
  })

  describe('findDuplicateIds', () => {
    it('should find duplicate IDs', () => {
      container = createTestElement(`
        <div id="duplicate">First</div>
        <div id="duplicate">Second</div>
        <div id="unique">Unique</div>
      `)

      const duplicates = findDuplicateIds(container)

      expect(duplicates.size).toBe(1)
      expect(duplicates.get('duplicate')?.length).toBe(2)
    })

    it('should return empty map when no duplicates', () => {
      container = createTestElement(`
        <div id="one">One</div>
        <div id="two">Two</div>
      `)

      const duplicates = findDuplicateIds(container)

      expect(duplicates.size).toBe(0)
    })
  })

  describe('assertAnnounces', () => {
    it('should pass when accessible name contains expected text', () => {
      container = createTestElement(`
        <button aria-label="Add item to wishlist">Add</button>
      `)

      const button = container.querySelector('button') as HTMLElement

      expect(() => assertAnnounces(button, 'Add item')).not.toThrow()
    })

    it('should throw when accessible name does not match', () => {
      container = createTestElement(`
        <button aria-label="Submit form">Submit</button>
      `)

      const button = container.querySelector('button') as HTMLElement

      expect(() => assertAnnounces(button, 'Cancel')).toThrow()
    })

    it('should support exact match', () => {
      container = createTestElement(`
        <button aria-label="Add item">Add</button>
      `)

      const button = container.querySelector('button') as HTMLElement

      expect(() => assertAnnounces(button, 'Add item', { exact: true })).not.toThrow()
      expect(() => assertAnnounces(button, 'Add', { exact: true })).toThrow()
    })
  })

  describe('assertLiveRegion', () => {
    it('should pass for correct politeness level', () => {
      container = createTestElement(`
        <div aria-live="polite">Status</div>
      `)

      const region = container.querySelector('[aria-live]') as HTMLElement

      expect(() => assertLiveRegion(region, 'polite')).not.toThrow()
    })

    it('should detect implicit live regions', () => {
      container = createTestElement(`
        <div role="alert">Alert!</div>
      `)

      const region = container.querySelector('[role="alert"]') as HTMLElement

      expect(() => assertLiveRegion(region, 'assertive')).not.toThrow()
    })

    it('should throw for incorrect politeness', () => {
      container = createTestElement(`
        <div aria-live="polite">Status</div>
      `)

      const region = container.querySelector('[aria-live]') as HTMLElement

      expect(() => assertLiveRegion(region, 'assertive')).toThrow()
    })
  })

  describe('AnnouncementCollector', () => {
    it('should initialize with empty announcements', () => {
      const collector = new AnnouncementCollector()

      const announcements = collector.getAnnouncements()
      expect(announcements).toHaveLength(0)
    })

    it('should start and stop without errors', () => {
      container = createTestElement(`
        <div id="status" aria-live="polite"></div>
      `)

      const collector = new AnnouncementCollector()

      expect(() => collector.start(container)).not.toThrow()
      expect(() => collector.stop()).not.toThrow()
    })

    it('should clear announcements', () => {
      const collector = new AnnouncementCollector()
      collector.start(document.body)

      // Clear should work even if no announcements
      collector.clear()
      const announcements = collector.getAnnouncements()

      expect(announcements).toHaveLength(0)
      collector.stop()
    })

    it('should return undefined for getLatest when empty', () => {
      const collector = new AnnouncementCollector()

      expect(collector.getLatest()).toBeUndefined()
    })
  })

  describe('createMockScreenReader', () => {
    it('should provide screen reader mock interface', () => {
      const sr = createMockScreenReader()

      expect(sr.start).toBeDefined()
      expect(sr.stop).toBeDefined()
      expect(sr.getAnnouncements).toBeDefined()
      expect(sr.getLastAnnouncement).toBeDefined()
      expect(sr.clear).toBeDefined()
      expect(sr.hasAnnounced).toBeDefined()
    })

    it('should start and stop without errors', () => {
      container = createTestElement(`
        <div id="status" aria-live="polite"></div>
      `)

      const sr = createMockScreenReader()

      expect(() => sr.start(container)).not.toThrow()
      expect(() => sr.stop()).not.toThrow()
    })

    it('should return false when checking for non-announced text', () => {
      const sr = createMockScreenReader()
      sr.start()

      expect(sr.hasAnnounced('Never announced')).toBe(false)

      sr.stop()
    })

    it('should return undefined for last announcement when empty', () => {
      const sr = createMockScreenReader()
      sr.start()

      expect(sr.getLastAnnouncement()).toBeUndefined()

      sr.stop()
    })
  })
})

describe('Integration with React components', () => {
  it('should validate ARIA attributes on React components', () => {
    function AccessibleCheckbox({ checked }: { checked: boolean }) {
      return (
        <div
          role="checkbox"
          aria-checked={checked}
          aria-label="Accept terms"
          tabIndex={0}
        >
          {checked ? 'Checked' : 'Unchecked'}
        </div>
      )
    }

    const { container } = render(<AccessibleCheckbox checked={true} />)

    const checkbox = container.querySelector('[role="checkbox"]') as HTMLElement
    const result = validateAriaAttributes(checkbox)

    expect(result.valid).toBe(true)
  })

  it('should get accessible name from React component', () => {
    function Button() {
      return <button aria-label="Add to cart">+</button>
    }

    const { container } = render(<Button />)

    const button = container.querySelector('button') as HTMLElement
    const name = getAccessibleName(button)

    expect(name).toBe('Add to cart')
  })
})
