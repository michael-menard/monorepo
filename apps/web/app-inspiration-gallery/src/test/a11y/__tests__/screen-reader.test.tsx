/**
 * Screen Reader Accessibility Tests - Inspiration Gallery
 *
 * Tests ARIA attributes, live regions, and semantic HTML for screen reader compatibility.
 * Per BUGF-020 AC4: Add A11y Test Coverage to Inspiration Gallery
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  validateAriaAttributes,
  validateSemanticHTML,
} from '@repo/accessibility-testing'
import { AlbumCard } from '../../../components/AlbumCard'
import { InspirationCard } from '../../../components/InspirationCard'

describe('Inspiration Gallery - Screen Reader Accessibility', () => {
  describe('AlbumCard ARIA attributes', () => {
    it('should render as article role when not interactive', () => {
      render(
        <AlbumCard
          id="11111111-1111-1111-1111-111111111111"
          title="Test Album"
          coverImageUrl="https://example.com/cover.jpg"
          itemCount={5}
        />,
      )

      const card = screen.getByRole('article')
      expect(card).toBeInTheDocument()
    })

    it('should render as button role with aria-label when interactive', () => {
      render(
        <AlbumCard
          id="11111111-1111-1111-1111-111111111111"
          title="Test Album"
          coverImageUrl="https://example.com/cover.jpg"
          itemCount={5}
          onClick={vi.fn()}
        />,
      )

      const card = screen.getByRole('button', { name: /Test Album/ })
      expect(card).toBeInTheDocument()
    })

    it('should have valid ARIA attributes', () => {
      const { container } = render(
        <AlbumCard
          id="22222222-2222-2222-2222-222222222222"
          title="Architecture Ideas"
          coverImageUrl="https://example.com/cover2.jpg"
          itemCount={10}
          onClick={vi.fn()}
        />,
      )

      const card = container.querySelector('[role="button"]')
      if (card) {
        const result = validateAriaAttributes(card)
        expect(result.valid).toBe(true)
        expect(result.issues).toHaveLength(0)
      }
    })
  })

  describe('InspirationCard ARIA attributes', () => {
    it('should have proper aria-label when interactive', () => {
      render(
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

      const card = screen.getByRole('button', { name: /Cool Build/ })
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute('aria-label', 'Cool Build')
    })
  })

  describe('Semantic HTML validation', () => {
    it('should use semantic HTML elements', () => {
      const { container } = render(
        <AlbumCard
          id="44444444-4444-4444-4444-444444444444"
          title="Space MOCs"
          coverImageUrl="https://example.com/cover3.jpg"
          itemCount={3}
        />,
      )

      const result = validateSemanticHTML(container)

      // Allow some non-critical issues but flag serious problems
      const seriousIssues = result.issues.filter(
        issue => issue.type === 'div-as-button' || issue.type === 'missing-landmark',
      )
      expect(seriousIssues).toHaveLength(0)
    })
  })
})
