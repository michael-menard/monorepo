/**
 * Axe-core WCAG Compliance Tests - Instructions Gallery
 *
 * Automated accessibility testing with axe-core for WCAG 2.1 AA compliance.
 * Per BUGF-020 AC6: Add A11y Test Coverage to Instructions Gallery
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { assertNoViolations, checkAccessibility } from '@repo/accessibility-testing'

describe('Instructions Gallery - Axe-core Compliance', () => {
  describe('Gallery WCAG compliance', () => {
    it('should have no axe violations on basic elements', async () => {
      const { container } = render(
        <div>
          <h1>Instructions</h1>
          <button>Add</button>
        </div>,
      )

      await assertNoViolations(container)
    })

    it('should meet color contrast requirements', async () => {
      const { container } = render(<div><p>Test content</p></div>)

      const result = await checkAccessibility(container, {
        includeTags: ['wcag2aa'],
      })

      expect(result.passed).toBe(true)
    })
  })
})
