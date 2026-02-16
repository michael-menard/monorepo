/**
 * Keyboard Navigation Tests - Inspiration Gallery
 *
 * Tests keyboard interaction patterns including Tab navigation, arrow keys, and shortcuts.
 * Per BUGF-020 AC4: Add A11y Test Coverage to Inspiration Gallery
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  createKeyboardUser,
  pressTab,
  testKeyboardAccessibility,
} from '@repo/accessibility-testing'
import { InspirationCard } from '../../../components/InspirationCard'

describe('Inspiration Gallery - Keyboard Navigation', () => {
  describe('Tab navigation', () => {
    it('should allow tabbing to interactive card', async () => {
      const user = createKeyboardUser()
      const onClick = vi.fn()

      render(
        <InspirationCard
          id="11111111-1111-1111-1111-111111111111"
          title="Test Build"
          imageUrl="https://example.com/image.jpg"
          thumbnailUrl={null}
          sourceUrl={null}
          tags={['test']}
          onClick={onClick}
        />,
      )

      // Tab to the interactive card (renders as role="button")
      const focused = await pressTab(user)
      expect(focused).toBeInTheDocument()
    })
  })

  describe('Enter key activation', () => {
    it('should activate card on Enter key', async () => {
      const user = createKeyboardUser()
      const onClick = vi.fn()

      render(
        <InspirationCard
          id="22222222-2222-2222-2222-222222222222"
          title="Another Build"
          imageUrl="https://example.com/image2.jpg"
          thumbnailUrl={null}
          sourceUrl={null}
          tags={null}
          onClick={onClick}
        />,
      )

      // Card renders as role="button" when onClick is provided
      const card = screen.getByRole('button', { name: /Another Build/ })
      card.focus()

      await user.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalled()
    })
  })

  describe('Keyboard accessibility compliance', () => {
    it('should have all interactive elements keyboard accessible', async () => {
      const { container } = render(
        <InspirationCard
          id="33333333-3333-3333-3333-333333333333"
          title="Keyboard Test"
          imageUrl="https://example.com/image3.jpg"
          thumbnailUrl={null}
          sourceUrl="https://example.com/source"
          tags={['keyboard', 'test']}
          onClick={vi.fn()}
        />,
      )

      const result = await testKeyboardAccessibility(container)

      // All interactive elements should be keyboard accessible
      expect(result.allAccessible).toBe(true)
      expect(result.inaccessibleElements).toHaveLength(0)
    })
  })
})
