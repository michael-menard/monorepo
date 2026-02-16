/**
 * Axe-core WCAG Compliance Tests - Sets Gallery
 *
 * Automated accessibility testing with axe-core for WCAG 2.1 AA compliance.
 * Per BUGF-020 AC5: Add A11y Test Coverage to Sets Gallery
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { assertNoViolations, checkAccessibility } from '@repo/accessibility-testing'
import { TagInput } from '../../../components/TagInput'

describe('Sets Gallery - Axe-core Compliance', () => {
  describe('TagInput WCAG compliance', () => {
    it('should have no axe violations when used with label', async () => {
      const onChange = vi.fn()
      // Render with a wrapping label as it would appear in a real form
      const { container } = render(
        <label>
          Tags
          <TagInput value={['tag1', 'tag2']} onChange={onChange} />
        </label>,
      )

      await assertNoViolations(container)
    })

    it('should meet WCAG 2.1 AA color contrast', async () => {
      const onChange = vi.fn()
      const { container } = render(
        <label>
          Tags
          <TagInput value={['test']} onChange={onChange} />
        </label>,
      )

      const result = await checkAccessibility(container, {
        includeTags: ['wcag2aa'],
      })

      const contrastViolations = result.violations.filter(v => v.ruleId === 'color-contrast')
      expect(contrastViolations).toHaveLength(0)
    })
  })
})
