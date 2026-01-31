/**
 * axe-core Integration Tests
 *
 * Tests for WCAG AA violation detection using axe-core.
 * Validates AC1, AC5, AC9, and AC14 requirements.
 *
 * @module a11y/__tests__/axe
 * @see WISH-2012
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import {
  checkAccessibility,
  assertNoViolations,
  assertViolationsExist,
  checkColorContrast,
  filterBySeverity,
  formatViolations,
  createA11yChecker,
} from '../axe'
import { createA11yConfig, defaultA11yConfig } from '../config'

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

describe('axe-core Integration', () => {
  let container: HTMLElement

  afterEach(() => {
    if (container) {
      cleanupTestElement(container)
    }
  })

  describe('checkAccessibility', () => {
    it('should return passed=true for accessible content', async () => {
      container = createTestElement(`
        <button aria-label="Submit form">Submit</button>
      `)

      const result = await checkAccessibility(container)

      expect(result.passed).toBe(true)
      expect(result.totalViolations).toBe(0)
      expect(result.violations).toHaveLength(0)
    })

    it('should return result object with expected structure', async () => {
      container = createTestElement(`
        <button>Accessible button</button>
      `)

      const result = await checkAccessibility(container)

      // Check result structure
      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('violations')
      expect(result).toHaveProperty('violationCounts')
      expect(result).toHaveProperty('totalViolations')
      expect(result).toHaveProperty('performance')
      expect(result).toHaveProperty('raw')
      expect(typeof result.passed).toBe('boolean')
      expect(Array.isArray(result.violations)).toBe(true)
    })

    it('should return violations array even when empty', async () => {
      container = createTestElement(`
        <button aria-label="Submit">Submit</button>
      `)

      const result = await checkAccessibility(container)

      expect(Array.isArray(result.violations)).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should track scan performance', async () => {
      container = createTestElement(`
        <button>Click me</button>
      `)

      const result = await checkAccessibility(container)

      expect(result.performance.totalMs).toBeGreaterThan(0)
      expect(result.performance.maxMs).toBe(defaultA11yConfig.performance.maxScanTime)
      expect(typeof result.performance.exceededMax).toBe('boolean')
    })

    it('should respect custom configuration', async () => {
      container = createTestElement(`
        <button><span class="icon"></span></button>
      `)

      const result = await checkAccessibility(container, {
        ruleExceptions: [{ ruleId: 'button-name', justification: 'Test exception' }],
      })

      // With button-name disabled, should not report this violation
      expect(result.violations.filter(v => v.ruleId === 'button-name')).toHaveLength(0)
    })

    it('should include WCAG tags in violation details', async () => {
      container = createTestElement(`
        <button></button>
      `)

      const result = await checkAccessibility(container)

      if (result.violations.length > 0) {
        const violation = result.violations[0]
        expect(violation.wcagTags).toBeDefined()
        expect(Array.isArray(violation.wcagTags)).toBe(true)
      }
    })

    it('should count violations by severity', async () => {
      container = createTestElement(`
        <button></button>
      `)

      const result = await checkAccessibility(container)

      expect(result.violationCounts).toHaveProperty('minor')
      expect(result.violationCounts).toHaveProperty('moderate')
      expect(result.violationCounts).toHaveProperty('serious')
      expect(result.violationCounts).toHaveProperty('critical')
    })

    it('should include affected element selectors', async () => {
      container = createTestElement(`
        <button id="empty-btn"></button>
      `)

      const result = await checkAccessibility(container)

      if (result.violations.length > 0) {
        const violation = result.violations[0]
        expect(violation.selectors).toBeDefined()
        expect(violation.selectors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('assertNoViolations', () => {
    it('should pass for accessible content', async () => {
      container = createTestElement(`
        <button aria-label="Submit">Submit</button>
      `)

      await expect(assertNoViolations(container)).resolves.not.toThrow()
    })

    it('should return undefined on success', async () => {
      container = createTestElement(`
        <button>Accessible</button>
      `)

      const result = await assertNoViolations(container)
      expect(result).toBeUndefined()
    })
  })

  describe('assertViolationsExist', () => {
    it('should throw when expected violations are not found', async () => {
      container = createTestElement(`
        <button>Click me</button>
      `)

      await expect(assertViolationsExist(container, ['nonexistent-rule'])).rejects.toThrow(
        /Expected violations not found/
      )
    })

    it('should include found violations in error message', async () => {
      container = createTestElement(`
        <button>Click me</button>
      `)

      try {
        await assertViolationsExist(container, ['fake-rule'])
      } catch (error) {
        expect((error as Error).message).toContain('Expected violations not found')
        expect((error as Error).message).toContain('Found violations:')
      }
    })
  })

  describe('checkColorContrast', () => {
    it('should return array of violations', async () => {
      container = createTestElement(`
        <p style="color: #000; background: #fff;">High contrast text</p>
      `)

      const violations = await checkColorContrast(container)

      // In jsdom, color contrast checking has limitations
      expect(Array.isArray(violations)).toBe(true)
    })

    it('should filter only color-contrast violations', async () => {
      container = createTestElement(`
        <p style="color: #000; background: #fff;">High contrast text</p>
      `)

      const violations = await checkColorContrast(container)

      // All returned violations should be color-contrast type
      expect(violations.every(v => v.ruleId === 'color-contrast')).toBe(true)
    })
  })

  describe('filterBySeverity', () => {
    const mockViolations = [
      { ruleId: 'a', severity: 'minor' as const, description: '', helpUrl: '', nodeCount: 1, selectors: [], wcagTags: [] },
      { ruleId: 'b', severity: 'moderate' as const, description: '', helpUrl: '', nodeCount: 1, selectors: [], wcagTags: [] },
      { ruleId: 'c', severity: 'serious' as const, description: '', helpUrl: '', nodeCount: 1, selectors: [], wcagTags: [] },
      { ruleId: 'd', severity: 'critical' as const, description: '', helpUrl: '', nodeCount: 1, selectors: [], wcagTags: [] },
    ]

    it('should filter violations by minimum severity', () => {
      const serious = filterBySeverity(mockViolations, 'serious')
      expect(serious).toHaveLength(2)
      expect(serious.map(v => v.ruleId)).toEqual(['c', 'd'])
    })

    it('should include all violations when filtering by minor', () => {
      const all = filterBySeverity(mockViolations, 'minor')
      expect(all).toHaveLength(4)
    })

    it('should only include critical when filtering by critical', () => {
      const critical = filterBySeverity(mockViolations, 'critical')
      expect(critical).toHaveLength(1)
      expect(critical[0].ruleId).toBe('d')
    })
  })

  describe('formatViolations', () => {
    it('should format violations for error output', () => {
      const violations = [
        {
          ruleId: 'button-name',
          severity: 'serious' as const,
          description: 'Buttons must have discernible text',
          helpUrl: 'https://example.com',
          nodeCount: 1,
          selectors: ['button'],
          wcagTags: ['wcag2aa'],
        },
      ]

      const formatted = formatViolations(violations)

      expect(formatted).toContain('SERIOUS')
      expect(formatted).toContain('button-name')
      expect(formatted).toContain('Buttons must have discernible text')
    })

    it('should return message for no violations', () => {
      const formatted = formatViolations([])
      expect(formatted).toBe('No violations found')
    })
  })

  describe('createA11yChecker', () => {
    it('should create a checker with preset configuration', async () => {
      const checker = createA11yChecker({
        ruleExceptions: [{ ruleId: 'button-name', justification: 'Test' }],
      })

      container = createTestElement(`
        <button></button>
      `)

      const result = await checker.check(container)

      expect(result.violations.filter(v => v.ruleId === 'button-name')).toHaveLength(0)
    })

    it('should allow overrides on individual checks', async () => {
      const checker = createA11yChecker({
        ruleExceptions: [{ ruleId: 'button-name', justification: 'Test' }],
      })

      container = createTestElement(`
        <button aria-label="Test">Test</button>
      `)

      await expect(checker.assertNoViolations(container)).resolves.not.toThrow()
    })
  })

  describe('React component testing', () => {
    it('should check accessibility of React components', async () => {
      function AccessibleButton() {
        return <button aria-label="Submit form">Submit</button>
      }

      const { container: reactContainer } = render(<AccessibleButton />)

      const result = await checkAccessibility(reactContainer)
      expect(result.passed).toBe(true)
    })

    it('should work with complex React components', async () => {
      function Form() {
        return (
          <form aria-label="Contact form">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" aria-required="true" />
            <button type="submit">Submit</button>
          </form>
        )
      }

      const { container: reactContainer } = render(<Form />)

      const result = await checkAccessibility(reactContainer)
      expect(result.passed).toBe(true)
    })

    it('should return result with raw axe-core data', async () => {
      function Component() {
        return <div><button>Click</button></div>
      }

      const { container: reactContainer } = render(<Component />)

      const result = await checkAccessibility(reactContainer)

      expect(result.raw).toBeDefined()
      expect(result.raw.violations).toBeDefined()
      expect(result.raw.passes).toBeDefined()
    })
  })

  describe('Configuration', () => {
    it('should use WCAG 2.1 AA by default', () => {
      const config = defaultA11yConfig
      expect(config.wcagLevel).toBe('wcag21aa')
    })

    it('should allow custom WCAG level', () => {
      const config = createA11yConfig({ wcagLevel: 'wcag2aaa' })
      expect(config.wcagLevel).toBe('wcag2aaa')
    })

    it('should merge rule exceptions', () => {
      const config = createA11yConfig({
        ruleExceptions: [{ ruleId: 'test-rule', justification: 'Test' }],
      })
      expect(config.ruleExceptions.some(e => e.ruleId === 'test-rule')).toBe(true)
    })

    it('should maintain default performance settings', () => {
      const config = createA11yConfig({})
      expect(config.performance.maxScanTime).toBe(500)
    })
  })
})

describe('Performance baseline (AC14)', () => {
  let container: HTMLElement

  afterEach(() => {
    if (container) {
      cleanupTestElement(container)
    }
  })

  it('should complete scan within 500ms for simple components', async () => {
    container = createTestElement(`
      <div>
        <button>Button 1</button>
        <button>Button 2</button>
        <input type="text" aria-label="Name" />
      </div>
    `)

    const result = await checkAccessibility(container)

    expect(result.performance.totalMs).toBeLessThan(500)
    expect(result.performance.exceededMax).toBe(false)
  })

  it('should report when scan exceeds maximum time', async () => {
    container = createTestElement(`
      <button>Test</button>
    `)

    const result = await checkAccessibility(container, {
      performance: { maxScanTime: 1, logTiming: false, skipInCi: false },
    })

    // With a 1ms max, scan will likely exceed
    expect(result.performance.exceededMax).toBe(true)
  })

  it('should handle multiple elements efficiently', async () => {
    // Create 50 buttons
    const buttons = Array.from({ length: 50 }, (_, i) => `<button>Button ${i}</button>`).join('')
    container = createTestElement(`<div>${buttons}</div>`)

    const result = await checkAccessibility(container)

    // Should still complete within reasonable time
    expect(result.performance.totalMs).toBeLessThan(1000)
  })
})
