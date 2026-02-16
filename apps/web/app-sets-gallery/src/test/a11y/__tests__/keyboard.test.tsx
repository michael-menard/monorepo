/**
 * Keyboard Navigation Tests - Sets Gallery
 *
 * Tests keyboard interaction patterns including Tab navigation and TagInput shortcuts.
 * Per BUGF-020 AC5: Add A11y Test Coverage to Sets Gallery
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  createKeyboardUser,
  pressEnter,
  testKeyboardAccessibility,
} from '@repo/accessibility-testing'
import { TagInput } from '../../../components/TagInput'

describe('Sets Gallery - Keyboard Navigation', () => {
  describe('TagInput keyboard shortcuts (AC2)', () => {
    it('should add tag on Enter key', async () => {
      const user = createKeyboardUser()
      const onChange = vi.fn()

      render(<TagInput value={[]} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'newtag')
      await pressEnter(user)

      expect(onChange).toHaveBeenCalledWith(['newtag'])
    })

    it('should remove last tag on Backspace with empty input', async () => {
      const user = createKeyboardUser()
      const onChange = vi.fn()

      render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      input.focus()

      await user.keyboard('{Backspace}')

      expect(onChange).toHaveBeenCalledWith(['tag1'])
    })
  })

  describe('Form keyboard navigation', () => {
    it('should support Tab navigation through form fields', async () => {
      const onChange = vi.fn()
      const { container } = render(<TagInput value={['test']} onChange={onChange} />)

      const result = await testKeyboardAccessibility(container)
      expect(result.allAccessible).toBe(true)
    })
  })
})
