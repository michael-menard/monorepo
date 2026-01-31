/**
 * TagInput Component Tests
 *
 * Story wish-2002: Add Item Flow
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from '../index'

describe('TagInput', () => {
  const defaultProps = {
    value: [],
    onChange: vi.fn(),
  }

  it('renders input field', () => {
    render(<TagInput {...defaultProps} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders placeholder text', () => {
    render(<TagInput {...defaultProps} placeholder="Add tag..." />)
    expect(screen.getByPlaceholderText('Add tag...')).toBeInTheDocument()
  })

  it('displays hint text', () => {
    render(<TagInput {...defaultProps} />)
    expect(screen.getByText(/press enter or comma to add/i)).toBeInTheDocument()
  })

  describe('Chip Creation', () => {
    it('creates chip on Enter key', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'newtag{Enter}')

      expect(onChange).toHaveBeenCalledWith(['newtag'])
    })

    it('creates chip on comma', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'newtag,')

      expect(onChange).toHaveBeenCalledWith(['newtag'])
    })

    it('trims whitespace from tags', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '  newtag  {Enter}')

      expect(onChange).toHaveBeenCalledWith(['newtag'])
    })

    it('converts tags to lowercase', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'NewTag{Enter}')

      expect(onChange).toHaveBeenCalledWith(['newtag'])
    })

    it('clears input after creating chip', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'newtag{Enter}')

      expect(input).toHaveValue('')
    })

    it('ignores empty input', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '{Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Chip Deletion', () => {
    it('removes chip on click', async () => {
      const onChange = vi.fn()
      render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)

      const removeButton = screen.getByLabelText(/remove tag1 tag/i)
      await userEvent.click(removeButton)

      expect(onChange).toHaveBeenCalledWith(['tag2'])
    })

    it('removes last chip on backspace with empty input', async () => {
      const onChange = vi.fn()
      render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'Backspace' })

      expect(onChange).toHaveBeenCalledWith(['tag1'])
    })

    it('does not remove chip on backspace with non-empty input', async () => {
      const onChange = vi.fn()
      render(<TagInput value={['tag1']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'text')
      fireEvent.keyDown(input, { key: 'Backspace' })

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Display', () => {
    it('displays existing tags', () => {
      render(<TagInput value={['tag1', 'tag2', 'tag3']} onChange={vi.fn()} />)

      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
      expect(screen.getByText('tag3')).toBeInTheDocument()
    })

    it('shows tags in a list', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={vi.fn()} />)

      const tagList = screen.getByRole('list', { name: /selected tags/i })
      expect(tagList).toBeInTheDocument()
    })
  })

  describe('Duplicate Prevention', () => {
    it('prevents duplicate tags', async () => {
      const onChange = vi.fn()
      render(<TagInput value={['existing']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'existing{Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('prevents duplicate tags case-insensitive', async () => {
      const onChange = vi.fn()
      render(<TagInput value={['existing']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'EXISTING{Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Max Tags Limit', () => {
    it('prevents adding tags when max limit reached', async () => {
      const maxTags = Array.from({ length: 20 }, (_, i) => `tag${i}`)
      const onChange = vi.fn()
      render(<TagInput value={maxTags} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'newtag{Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('disables input when max limit reached', () => {
      const maxTags = Array.from({ length: 20 }, (_, i) => `tag${i}`)
      render(<TagInput value={maxTags} onChange={vi.fn()} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('shows max tags reached message', () => {
      const maxTags = Array.from({ length: 20 }, (_, i) => `tag${i}`)
      render(<TagInput value={maxTags} onChange={vi.fn()} />)

      expect(screen.getByPlaceholderText(/max tags reached/i)).toBeInTheDocument()
    })

    it('updates remaining tags count', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={vi.fn()} />)

      expect(screen.getByText(/18 tags remaining/i)).toBeInTheDocument()
    })
  })

  describe('Paste Handling', () => {
    it('splits comma-separated pasted text into multiple tags', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.click(input)

      const pasteData = 'tag1, tag2, tag3'
      await userEvent.paste(pasteData)

      expect(onChange).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3'])
    })

    it('trims whitespace from pasted tags', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.click(input)

      const pasteData = '  tag1  ,  tag2  '
      await userEvent.paste(pasteData)

      expect(onChange).toHaveBeenCalledWith(['tag1', 'tag2'])
    })

    it('prevents duplicate tags when pasting', async () => {
      const onChange = vi.fn()
      render(<TagInput value={['tag1']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.click(input)

      const pasteData = 'tag1, tag2'
      await userEvent.paste(pasteData)

      expect(onChange).toHaveBeenCalledWith(['tag1', 'tag2'])
    })

    it('respects max tags limit when pasting', async () => {
      const existingTags = Array.from({ length: 18 }, (_, i) => `tag${i}`)
      const onChange = vi.fn()
      render(<TagInput value={existingTags} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await userEvent.click(input)

      const pasteData = 'new1, new2, new3, new4'
      await userEvent.paste(pasteData)

      // Should only add 2 tags to reach max of 20
      expect(onChange).toHaveBeenCalledWith([...existingTags, 'new1', 'new2'])
    })
  })

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      render(<TagInput {...defaultProps} disabled={true} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('disables remove buttons when disabled', () => {
      render(<TagInput value={['tag1']} onChange={vi.fn()} disabled={true} />)

      const removeButton = screen.getByLabelText(/remove tag1 tag/i)
      expect(removeButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has accessible label', () => {
      render(<TagInput {...defaultProps} id="tags" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('id', 'tags')
    })

    it('has describedby for hint text', () => {
      render(<TagInput {...defaultProps} id="tags" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'tags-hint')
    })

    it('has accessible remove buttons', () => {
      render(<TagInput value={['tag1']} onChange={vi.fn()} />)

      const removeButton = screen.getByLabelText(/remove tag1 tag/i)
      expect(removeButton).toBeInTheDocument()
    })
  })

  describe('Max Tag Length', () => {
    it('prevents adding tags longer than max length', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      const longTag = 'a'.repeat(51) // Max is 50
      await userEvent.type(input, `${longTag}{Enter}`)

      expect(onChange).not.toHaveBeenCalled()
    })

    it('allows tags at max length', async () => {
      const onChange = vi.fn()
      render(<TagInput {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      const maxTag = 'a'.repeat(50)
      await userEvent.type(input, `${maxTag}{Enter}`)

      expect(onChange).toHaveBeenCalledWith([maxTag])
    })
  })
})
