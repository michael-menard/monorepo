import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from '../TagInput'

// Mock app-component-library
vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Input: React.forwardRef<HTMLInputElement, any>((props: any, ref) => (
      <input ref={ref} {...props} />
    )),
    Badge: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
  }
})

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: (props: any) => <span data-testid="x-icon" {...props} />,
}))

describe('TagInput', () => {
  const mockOnChange = vi.fn()
  const mockOnBlur = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders existing tags as badges', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} />)

      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
    })

    it('renders input field with placeholder', () => {
      render(<TagInput value={[]} onChange={mockOnChange} placeholder="Add tags..." />)

      expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
    })

    it('shows counter display', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} maxTags={5} />)

      expect(screen.getByText('2/5')).toBeInTheDocument()
    })

    it('shows helper text when no error', () => {
      render(<TagInput value={[]} onChange={mockOnChange} />)

      expect(screen.getByText('Press Enter or comma to add a tag')).toBeInTheDocument()
    })

    it('shows error message when provided', () => {
      render(<TagInput value={[]} onChange={mockOnChange} error="Custom error" />)

      expect(screen.getByText('Custom error')).toBeInTheDocument()
    })

    it('hides input when at max tags', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} maxTags={2} />)

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('applies aria-invalid when error is present', () => {
      const { container } = render(
        <TagInput value={[]} onChange={mockOnChange} aria-invalid={true} />,
      )

      const wrapper = container.querySelector('.border-destructive')
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('adds tag when Enter is pressed', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.type(input, 'NewTag{Enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['newtag'])
    })

    it('adds tag when comma is pressed', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.type(input, 'NewTag,')

      expect(mockOnChange).toHaveBeenCalledWith(['newtag'])
    })

    it('lowercases tags when adding', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.type(input, 'UpperCase{Enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['uppercase'])
    })

    it('removes tag when remove button is clicked', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} />)

      const removeButton = screen.getByLabelText('Remove tag: tag1')
      await user.click(removeButton)

      expect(mockOnChange).toHaveBeenCalledWith(['tag2'])
    })

    it('removes last tag on backspace when input is empty', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Backspace}')

      expect(mockOnChange).toHaveBeenCalledWith(['tag1'])
    })

    it('does not remove tag on backspace when input has text', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'text{Backspace}')

      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('calls onBlur when input loses focus', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} onBlur={mockOnBlur} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.click(input)
      await user.tab()

      expect(mockOnBlur).toHaveBeenCalled()
    })
  })

  describe('validation', () => {
    it('shows error when max tags limit is reached', async () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} maxTags={2} />)

      // Input should be hidden at max
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByText('2/2')).toBeInTheDocument()
    })

    it('shows error when tag exceeds max length', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} maxTagLength={5} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.type(input, 'toolongtag{Enter}')

      expect(screen.getByText('Tags must be 5 characters or less')).toBeInTheDocument()
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('shows error when tag has invalid characters', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.type(input, 'tag@invalid!{Enter}')

      expect(
        screen.getByText('Tags can only contain letters, numbers, spaces, and hyphens'),
      ).toBeInTheDocument()
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('shows error when duplicate tag is added', async () => {
      const user = userEvent.setup()
      render(<TagInput value={['existing']} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'existing{Enter}')

      expect(screen.getByText('Tag already exists')).toBeInTheDocument()
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('clears local error when typing after validation error', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} maxTagLength={5} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.type(input, 'toolong{Enter}')
      expect(screen.getByText('Tags must be 5 characters or less')).toBeInTheDocument()

      await user.type(input, 'a')
      expect(screen.queryByText('Tags must be 5 characters or less')).not.toBeInTheDocument()
    })

    it('allows valid tags with letters, numbers, spaces, and hyphens', async () => {
      const user = userEvent.setup()
      render(<TagInput value={[]} onChange={mockOnChange} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      await user.type(input, 'valid-tag 123{Enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['valid-tag 123'])
    })
  })

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<TagInput value={[]} onChange={mockOnChange} disabled={true} />)

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      expect(input).toBeDisabled()
    })

    it('disables remove buttons when disabled prop is true', () => {
      render(<TagInput value={['tag1']} onChange={mockOnChange} disabled={true} />)

      const removeButton = screen.getByLabelText('Remove tag: tag1')
      expect(removeButton).toBeDisabled()
    })

    it('applies opacity styling when disabled', () => {
      const { container } = render(<TagInput value={[]} onChange={mockOnChange} disabled={true} />)

      const wrapper = container.querySelector('.opacity-50')
      expect(wrapper).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible label for input', () => {
      render(<TagInput value={[]} onChange={mockOnChange} />)

      expect(screen.getByLabelText('Add tag')).toBeInTheDocument()
    })

    it('has accessible labels for remove buttons', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} />)

      expect(screen.getByLabelText('Remove tag: tag1')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove tag: tag2')).toBeInTheDocument()
    })

    it('displays error count to screen readers', () => {
      render(<TagInput value={['tag1', 'tag2']} onChange={mockOnChange} maxTags={10} />)

      expect(screen.getByText('2/10')).toBeInTheDocument()
    })

    it('changes placeholder when tags are present', () => {
      const { rerender } = render(
        <TagInput value={[]} onChange={mockOnChange} placeholder="Add tags..." />,
      )

      const input = screen.getByRole('textbox', { name: 'Add tag' })
      expect(input).toHaveAttribute('placeholder', 'Add tags...')

      // Rerender with a tag to simulate onChange being called
      rerender(<TagInput value={['tag1']} onChange={mockOnChange} placeholder="Add tags..." />)

      const updatedInput = screen.getByRole('textbox')
      expect(updatedInput).toHaveAttribute('placeholder', 'Add another...')
    })
  })
})
