/**
 * Tests for TagInput component (Phase 3)
 * 
 * Tests tag input with:
 * - Adding tags on Enter/comma
 * - Tag validation (length, format, duplicates)
 * - Max tags limit
 * - Removing tags
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from '../TagInput'

describe('TagInput', () => {
  const mockOnChange = vi.fn()
  const mockOnBlur = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render empty input with placeholder', () => {
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Type and press Enter to add tags...')
    })

    it('should display existing tags as chips', () => {
      render(<TagInput value={['tag1', 'tag2', 'tag3']} onChange={mockOnChange} />)
      
      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
      expect(screen.getByText('tag3')).toBeInTheDocument()
    })

    it('should show tag count indicator', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} maxTags={10} />)
      
      expect(screen.getByText('2/10')).toBeInTheDocument()
    })

    it('should show custom placeholder when tags exist', () => {
      render(<TagInput value={['tag1']} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      expect(input).toHaveAttribute('placeholder', 'Add another...')
    })
  })

  describe('Adding Tags', () => {
    it('should add tag on Enter key press', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'new-tag{Enter}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['new-tag'])
      })
    })

    it('should add tag on comma key press', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'new-tag,')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['new-tag'])
      })
    })

    it('should trim and lowercase tag before adding', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, '  UPPERCASE TAG  {Enter}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['uppercase tag'])
      })
    })

    it('should clear input after adding tag', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag') as HTMLInputElement
      await user.type(input, 'new-tag{Enter}')
      
      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('Tag Validation - Max Tags', () => {
    it('should validate max tags (10)', () => {
      const maxTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10']

      render(<TagInput value={maxTags} onChange={mockOnChange} maxTags={10} />)

      // When at max tags, input is hidden and cannot add more
      expect(screen.queryByLabelText('Add tag')).not.toBeInTheDocument()
      // All 10 tags should be displayed
      expect(screen.getByText('10/10')).toBeInTheDocument()
    })

    it('should hide input when at max tags', () => {
      const maxTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10']
      
      render(<TagInput value={maxTags} onChange={mockOnChange} maxTags={10} />)
      
      expect(screen.queryByLabelText('Add tag')).not.toBeInTheDocument()
    })
  })

  describe('Tag Validation - Length', () => {
    it('should validate tag length (max 30 chars)', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} maxTagLength={30} />)
      
      const input = screen.getByLabelText('Add tag')
      const longTag = 'a'.repeat(31)
      await user.type(input, `${longTag}{Enter}`)
      
      await waitFor(() => {
        expect(screen.getByText(/Tags must be 30 characters or less/i)).toBeInTheDocument()
      })
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should allow tag at max length', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} maxTagLength={30} />)
      
      const input = screen.getByLabelText('Add tag')
      const maxLengthTag = 'a'.repeat(30)
      await user.type(input, `${maxLengthTag}{Enter}`)
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([maxLengthTag])
      })
    })
  })

  describe('Tag Validation - Format', () => {
    it('should validate tag format (letters, numbers, spaces, hyphens only)', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'invalid@tag!{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText(/can only contain letters, numbers, spaces, and hyphens/i)).toBeInTheDocument()
      })
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should allow valid characters in tag', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'valid-tag-123{Enter}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['valid-tag-123'])
      })
    })

    it('should allow spaces in tags', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'multi word tag{Enter}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['multi word tag'])
      })
    })
  })

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate tags', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['existing-tag']} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'existing-tag{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Tag already exists')).toBeInTheDocument()
      })
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should clear input after duplicate detection', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['existing-tag']} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag') as HTMLInputElement
      await user.type(input, 'existing-tag{Enter}')
      
      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should detect duplicates case-insensitively', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['existing-tag']} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'EXISTING-TAG{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Tag already exists')).toBeInTheDocument()
      })
    })
  })

  describe('Removing Tags', () => {
    it('should remove tag when X button clicked', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} />)
      
      const removeButton = screen.getByLabelText('Remove tag: tag1')
      await user.click(removeButton)
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['tag2'])
      })
    })

    it('should remove last tag on Backspace when input is empty', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['tag1', 'tag2', 'tag3']} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.click(input) // Focus input
      await user.keyboard('{Backspace}')
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(['tag1', 'tag2'])
      })
    })

    it('should not remove tag on Backspace if input has text', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['tag1']} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'some text')
      await user.keyboard('{Backspace}')
      
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should have proper ARIA labels on remove buttons', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} />)
      
      expect(screen.getByLabelText('Remove tag: tag1')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove tag: tag2')).toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('should show error message for validation failures', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'invalid@tag{Enter}')
      
      await waitFor(() => {
        const errorText = screen.getByText(/can only contain/i)
        expect(errorText).toHaveClass('text-destructive')
      })
    })

    it('should show external error prop', () => {
      render(<TagInput value={[]} onChange={mockOnChange} error="Custom error message" />)
      
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })

    it('should clear local error when input changes', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      
      // Trigger error
      await user.type(input, 'invalid@tag{Enter}')
      await waitFor(() => {
        expect(screen.getByText(/can only contain/i)).toBeInTheDocument()
      })
      
      // Start typing to clear error
      await user.type(input, 'new')
      
      await waitFor(() => {
        expect(screen.queryByText(/can only contain/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(<TagInput value={['tag1']} onChange={mockOnChange} disabled={true} />)
      
      const input = screen.getByLabelText('Add tag')
      expect(input).toBeDisabled()
      
      const removeButton = screen.getByLabelText('Remove tag: tag1')
      expect(removeButton).toBeDisabled()
    })

    it('should apply opacity styling when disabled', () => {
      const { container } = render(<TagInput value={[]} onChange={mockOnChange} disabled={true} />)
      
      const wrapper = container.querySelector('.opacity-50')
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on chips', () => {
      render(<TagInput value={['tag1']} onChange={mockOnChange} />)
      
      const removeButton = screen.getByLabelText('Remove tag: tag1')
      expect(removeButton).toHaveAttribute('aria-label', 'Remove tag: tag1')
    })

    it('should apply aria-invalid to container when invalid', () => {
      const { container } = render(<TagInput value={[]} onChange={mockOnChange} aria-invalid={true} />)
      
      const borderContainer = container.querySelector('.border-destructive')
      expect(borderContainer).toBeInTheDocument()
    })

    it('should call onBlur callback', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} onBlur={mockOnBlur} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.click(input)
      await user.tab()
      
      expect(mockOnBlur).toHaveBeenCalled()
    })
  })

  describe('Helper Text', () => {
    it('should show instruction text when no error', () => {
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      expect(screen.getByText('Press Enter or comma to add a tag')).toBeInTheDocument()
    })

    it('should hide instruction text when error is shown', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText('Add tag')
      await user.type(input, 'invalid@{Enter}')
      
      await waitFor(() => {
        expect(screen.queryByText('Press Enter or comma to add a tag')).not.toBeInTheDocument()
      })
    })
  })
})
