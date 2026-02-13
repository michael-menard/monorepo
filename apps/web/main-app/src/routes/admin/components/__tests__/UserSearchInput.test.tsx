import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserSearchInput } from '../UserSearchInput'

vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Input: vi.fn(({ value, onChange, ...props }) =>
      React.createElement('input', { value, onChange, ...props })
    ),
    Button: vi.fn(({ children, onClick, ...props }) =>
      React.createElement('button', { onClick, ...props }, children)
    ),
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Search: vi.fn(props => React.createElement('svg', { 'data-testid': 'search-icon', ...props })),
    X: vi.fn(props => React.createElement('svg', { 'data-testid': 'x-icon', ...props })),
    Loader2: vi.fn(props => React.createElement('svg', { 'data-testid': 'loader-icon', ...props })),
  }
})

describe('UserSearchInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders search input', () => {
      render(<UserSearchInput {...defaultProps} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('displays placeholder text', () => {
      render(<UserSearchInput {...defaultProps} placeholder="Search users..." />)
      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
    })

    it('displays search icon when not loading', () => {
      render(<UserSearchInput {...defaultProps} />)
      expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    })

    it('displays loader icon when loading', () => {
      render(<UserSearchInput {...defaultProps} isLoading={true} />)
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('shows clear button when value is present', () => {
      render(<UserSearchInput {...defaultProps} value="test" />)
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
    })

    it('hides clear button when value is empty', () => {
      render(<UserSearchInput {...defaultProps} value="" />)
      expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('updates local value when typing', async () => {
      const user = userEvent.setup()
      render(<UserSearchInput {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      expect(input).toHaveValue('test')
    })

    it('debounces onChange callback (300ms)', async () => {
      const user = userEvent.setup()
      render(<UserSearchInput {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      // Wait for debounce to complete
      await waitFor(() => {
        expect(defaultProps.onChange).toHaveBeenCalledWith('test')
      }, { timeout: 500 })
    })

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<UserSearchInput {...defaultProps} value="test" />)
      
      const clearButton = screen.getByRole('button', { name: /clear search/i })
      await user.click(clearButton)
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('')
    })
  })

  describe('accessibility', () => {
    it('provides aria-label for clear button', () => {
      render(<UserSearchInput {...defaultProps} value="test" />)
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
    })
  })
})
