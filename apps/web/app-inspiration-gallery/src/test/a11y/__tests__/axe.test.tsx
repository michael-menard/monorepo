/**
 * Axe-core WCAG Compliance Tests - Inspiration Gallery
 *
 * Automated accessibility testing with axe-core for WCAG 2.1 AA compliance.
 * Per BUGF-020 AC4: Add A11y Test Coverage to Inspiration Gallery
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { checkAccessibility, assertNoViolations } from '@repo/accessibility-testing'
import { AlbumCard } from '../../../components/AlbumCard'
import { InspirationCard } from '../../../components/InspirationCard'

describe('Inspiration Gallery - Axe-core Compliance', () => {
  describe('AlbumCard WCAG compliance', () => {
    it('should have no axe violations', async () => {
      const { container } = render(
        <AlbumCard
          id="11111111-1111-1111-1111-111111111111"
          title="Test Album"
          coverImageUrl="https://example.com/cover.jpg"
          itemCount={5}
          onClick={vi.fn()}
        />,
      )

      await assertNoViolations(container)
    })

    it('should meet color contrast requirements', async () => {
      const { container } = render(
        <AlbumCard
          id="22222222-2222-2222-2222-222222222222"
          title="Architecture"
          coverImageUrl="https://example.com/cover2.jpg"
          itemCount={10}
          onClick={vi.fn()}
        />,
      )

      const result = await checkAccessibility(container, {
        includeTags: ['wcag2aa'],
      })

      const contrastViolations = result.violations.filter(v => v.ruleId === 'color-contrast')
      expect(contrastViolations).toHaveLength(0)
    })
  })

  describe('InspirationCard WCAG compliance', () => {
    it('should have no axe violations when interactive', async () => {
      const { container } = render(
        <InspirationCard
          id="33333333-3333-3333-3333-333333333333"
          title="Cool Build"
          imageUrl="https://example.com/image.jpg"
          thumbnailUrl="https://example.com/thumb.jpg"
          sourceUrl={null}
          tags={['castle', 'medieval']}
          onClick={vi.fn()}
        />,
      )

      await assertNoViolations(container)
    })
  })
})
