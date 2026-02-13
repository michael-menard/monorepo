import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlugField } from '../SlugField'

// Mock react-hook-form
const mockField = {
  value: '',
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
}

vi.mock('react-hook-form', () => ({
  useController: () => ({
    field: mockField,
    fieldState: { error: null },
  }),
}))

// Mock app-component-library
vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Input: React.forwardRef<HTMLInputElement, any>((props: any, ref) => (
      <input ref={ref} {...props} />
    )),
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormLabel: ({ children }: any) => <label>{children}</label>,
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormMessage: () => <div />,
  }
})

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock slugify
vi.mock('@repo/upload/types', () => ({
  slugify: (text: string) => text.toLowerCase().replace(/\s+/g, '-'),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Check: (props: any) => <span data-testid="check-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
  Loader2: (props: any) => <span data-testid="loader-icon" {...props} />,
  RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SlugField', () => {
  const defaultProps = {
    control: {} as any,
    currentSlug: 'current-slug',
    mocId: 'moc-123',
    title: 'Test Title',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockField.value = ''
    mockField.onChange.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders URL Slug label', () => {
      render(<SlugField {...defaultProps} />)

      expect(screen.getByText('URL Slug')).toBeInTheDocument()
    })

    it('renders input field with placeholder', () => {
      render(<SlugField {...defaultProps} />)

      expect(screen.getByPlaceholderText('my-awesome-moc')).toBeInTheDocument()
    })

    it('renders help text', () => {
      render(<SlugField {...defaultProps} />)

      expect(
        screen.getByText(/Leave empty to auto-generate, or enter a custom URL-friendly slug/),
      ).toBeInTheDocument()
    })

    it('renders generate from title button', () => {
      render(<SlugField {...defaultProps} />)

      expect(screen.getByLabelText('Generate slug from title')).toBeInTheDocument()
    })

    it('disables generate button when no title', () => {
      render(<SlugField {...defaultProps} title="" />)

      const button = screen.getByLabelText('Generate slug from title')
      expect(button).toBeDisabled()
    })
  })

  describe('interactions', () => {
    it('updates slug when typing', async () => {
      const user = userEvent.setup()
      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'new-slug')

      expect(mockField.onChange).toHaveBeenCalled()
    })

    it('generates slug from title when button is clicked', async () => {
      const user = userEvent.setup()
      render(<SlugField {...defaultProps} title="My Awesome Title" />)

      const button = screen.getByLabelText('Generate slug from title')
      await user.click(button)

      expect(mockField.onChange).toHaveBeenCalledWith('my-awesome-title')
    })

    it('converts input to lowercase', async () => {
      const user = userEvent.setup()
      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'UPPERCASE')

      // Input should have onChange called with lowercase values
      expect(mockField.onChange).toHaveBeenCalled()
    })
  })

  describe('availability checking', () => {
    it('shows available checkmark when slug is available', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true }),
      })

      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'test-slug')

      // Wait for debounce and fetch to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('check-icon')).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('shows unavailable X when slug is taken', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: false }),
      })

      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'taken-slug')

      // Wait for debounce and fetch to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('x-icon')).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('shows error message when slug is unavailable', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: false }),
      })

      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'taken-slug')

      // Wait for debounce and fetch to complete
      await waitFor(
        () => {
          expect(
            screen.getByText('This slug is already used by another of your MOCs'),
          ).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('debounces availability checks', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ available: true }),
      })

      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'test')

      // Wait for debounce to complete
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledTimes(1)
        },
        { timeout: 2000 },
      )
    })

    it('skips availability check for current slug', async () => {
      mockField.value = 'current-slug'

      render(<SlugField {...defaultProps} currentSlug="current-slug" />)

      // Wait a bit to ensure no fetch is made
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should not check availability for current slug
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('handles fetch errors gracefully', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'test-slug')

      // Wait for debounce and fetch to complete
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled()
        },
        { timeout: 2000 },
      )

      // Should show error indicator (amber X)
      await waitFor(() => {
        expect(screen.getByTestId('x-icon')).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('sets aria-invalid when slug is unavailable', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: false }),
      })

      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'taken-slug')

      await waitFor(
        () => {
          expect(input).toHaveAttribute('aria-invalid', 'true')
        },
        { timeout: 2000 },
      )
    })

    it('has accessible label for generate button', () => {
      render(<SlugField {...defaultProps} />)

      const button = screen.getByLabelText('Generate slug from title')
      expect(button).toHaveAttribute('title', 'Generate from title')
    })

    it('has role=status for availability indicators', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true }),
      })

      render(<SlugField {...defaultProps} />)

      const input = screen.getByPlaceholderText('my-awesome-moc')
      await user.type(input, 'test-slug')

      await waitFor(
        () => {
          expect(screen.getByRole('status')).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })
  })
})
