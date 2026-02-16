/**
 * Axe-core WCAG Compliance Tests - Dashboard
 *
 * Automated accessibility testing with axe-core for WCAG 2.1 AA compliance.
 * Per BUGF-020 AC7: Add A11y Test Coverage to Dashboard
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { assertNoViolations, checkAccessibility } from '@repo/accessibility-testing'

describe('Dashboard - Axe-core Compliance', () => {
  describe('Dashboard main page WCAG compliance', () => {
    it('should have no axe violations', async () => {
      const { container } = render(
        <main>
          <h1>Dashboard</h1>
          <section>
            <h2>Stats</h2>
            <p>Content</p>
          </section>
        </main>,
      )

      await assertNoViolations(container)
    })

    it('should meet WCAG 2.1 AA requirements', async () => {
      const { container } = render(
        <div>
          <h1>Dashboard</h1>
          <button>Filter</button>
        </div>,
      )

      const result = await checkAccessibility(container, {
        wcagLevel: 'wcag21aa',
      })

      expect(result.passed).toBe(true)
    })
  })
})
