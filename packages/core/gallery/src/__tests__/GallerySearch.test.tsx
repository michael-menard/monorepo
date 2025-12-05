import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GallerySearch } from '../components/GallerySearch'

describe('GallerySearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<GallerySearch />)

      expect(screen.getByTestId('gallery-search')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-search-input')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(<GallerySearch placeholder="Search instructions..." />)

      expect(screen.getByPlaceholderText('Search instructions...')).toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(<GallerySearch data-testid="custom-search" />)

      expect(screen.getByTestId('custom-search')).toBeInTheDocument()
      expect(screen.getByTestId('custom-search-input')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<GallerySearch className="custom-class" />)

      expect(screen.getByTestId('gallery-search')).toHaveClass('custom-class')
    })

    it('renders search icon', () => {
      render(<GallerySearch />)

      // Check that SVG search icon is present (via the circle element)
      const container = screen.getByTestId('gallery-search')
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('controlled mode', () => {
    it('displays controlled value', () => {
      render(<GallerySearch value="test value" onChange={() => {}} />)

      expect(screen.getByTestId('gallery-search-input')).toHaveValue('test value')
    })

    it('calls onChange with new value', () => {
      const handleChange = vi.fn()
      render(<GallerySearch value="" onChange={handleChange} />)

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'new value' },
      })

      expect(handleChange).toHaveBeenCalledWith('new value')
    })

    it('updates display when controlled value changes', () => {
      const { rerender } = render(<GallerySearch value="initial" onChange={() => {}} />)

      expect(screen.getByTestId('gallery-search-input')).toHaveValue('initial')

      rerender(<GallerySearch value="updated" onChange={() => {}} />)

      expect(screen.getByTestId('gallery-search-input')).toHaveValue('updated')
    })
  })

  describe('uncontrolled mode', () => {
    it('manages internal state', () => {
      render(<GallerySearch defaultValue="default" />)

      expect(screen.getByTestId('gallery-search-input')).toHaveValue('default')

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'typed value' },
      })

      expect(screen.getByTestId('gallery-search-input')).toHaveValue('typed value')
    })

    it('calls onChange with typed value', () => {
      const handleChange = vi.fn()
      render(<GallerySearch onChange={handleChange} />)

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'typed' },
      })

      expect(handleChange).toHaveBeenCalledWith('typed')
    })
  })

  describe('debounce behavior', () => {
    it('calls onSearch after debounce delay', async () => {
      const handleSearch = vi.fn()
      render(<GallerySearch onSearch={handleSearch} debounceMs={300} />)

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'search term' },
      })

      // Should not be called immediately
      expect(handleSearch).not.toHaveBeenCalled()

      // Fast-forward past debounce
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(handleSearch).toHaveBeenCalledWith('search term')
    })

    it('only calls onSearch once for rapid typing', async () => {
      const handleSearch = vi.fn()
      render(<GallerySearch onSearch={handleSearch} debounceMs={300} />)

      // Rapid typing
      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'a' },
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'ab' },
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'abc' },
      })

      // Still should not be called
      expect(handleSearch).not.toHaveBeenCalled()

      // Fast-forward past debounce
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should only be called once with final value
      expect(handleSearch).toHaveBeenCalledTimes(1)
      expect(handleSearch).toHaveBeenCalledWith('abc')
    })

    it('uses custom debounce delay', async () => {
      const handleSearch = vi.fn()
      render(<GallerySearch onSearch={handleSearch} debounceMs={500} />)

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'test' },
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Should not be called yet (500ms debounce)
      expect(handleSearch).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(handleSearch).toHaveBeenCalledWith('test')
    })

    it('calls onChange immediately (not debounced)', () => {
      const handleChange = vi.fn()
      const handleSearch = vi.fn()
      render(<GallerySearch onChange={handleChange} onSearch={handleSearch} debounceMs={300} />)

      fireEvent.change(screen.getByTestId('gallery-search-input'), {
        target: { value: 'test' },
      })

      // onChange should be called immediately
      expect(handleChange).toHaveBeenCalledWith('test')
      // onSearch should not be called yet
      expect(handleSearch).not.toHaveBeenCalled()
    })
  })

  describe('clear functionality', () => {
    it('shows clear button when value is present', () => {
      render(<GallerySearch value="test" onChange={() => {}} />)

      expect(screen.getByTestId('gallery-search-clear')).toBeInTheDocument()
    })

    it('hides clear button when value is empty', () => {
      render(<GallerySearch value="" onChange={() => {}} />)

      expect(screen.queryByTestId('gallery-search-clear')).not.toBeInTheDocument()
    })

    it('clears value when clear button is clicked', () => {
      const handleChange = vi.fn()
      render(<GallerySearch defaultValue="test" onChange={handleChange} />)

      fireEvent.click(screen.getByTestId('gallery-search-clear'))

      expect(handleChange).toHaveBeenCalledWith('')
      expect(screen.getByTestId('gallery-search-input')).toHaveValue('')
    })

    it('calls onSearch with empty string when cleared', () => {
      const handleSearch = vi.fn()
      render(<GallerySearch defaultValue="test" onSearch={handleSearch} />)

      fireEvent.click(screen.getByTestId('gallery-search-clear'))

      expect(handleSearch).toHaveBeenCalledWith('')
    })

    it('focuses input after clearing', () => {
      render(<GallerySearch defaultValue="test" />)

      fireEvent.click(screen.getByTestId('gallery-search-clear'))

      expect(screen.getByTestId('gallery-search-input')).toHaveFocus()
    })

    it('clears value on Escape key', () => {
      const handleChange = vi.fn()
      render(<GallerySearch defaultValue="test" onChange={handleChange} />)

      fireEvent.keyDown(screen.getByTestId('gallery-search-input'), { key: 'Escape' })

      expect(handleChange).toHaveBeenCalledWith('')
      expect(screen.getByTestId('gallery-search-input')).toHaveValue('')
    })

    it('does not clear on Escape when value is empty', () => {
      const handleChange = vi.fn()
      render(<GallerySearch onChange={handleChange} />)

      fireEvent.keyDown(screen.getByTestId('gallery-search-input'), { key: 'Escape' })

      expect(handleChange).not.toHaveBeenCalled()
    })

    it('hides clear button when disabled', () => {
      render(<GallerySearch value="test" onChange={() => {}} disabled />)

      expect(screen.queryByTestId('gallery-search-clear')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<GallerySearch disabled />)

      expect(screen.getByTestId('gallery-search-input')).toBeDisabled()
    })

    it('does not show clear button when disabled', () => {
      render(<GallerySearch value="test" onChange={() => {}} disabled />)

      expect(screen.queryByTestId('gallery-search-clear')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role="searchbox"', () => {
      render(<GallerySearch />)

      expect(screen.getByTestId('gallery-search-input')).toHaveAttribute('role', 'searchbox')
    })

    it('has default aria-label', () => {
      render(<GallerySearch />)

      expect(screen.getByTestId('gallery-search-input')).toHaveAttribute(
        'aria-label',
        'Search gallery',
      )
    })

    it('accepts custom aria-label', () => {
      render(<GallerySearch aria-label="Search MOCs" />)

      expect(screen.getByTestId('gallery-search-input')).toHaveAttribute('aria-label', 'Search MOCs')
    })

    it('associates help text via aria-describedby', () => {
      render(<GallerySearch helpText="Enter keywords to search" data-testid="search" />)

      const input = screen.getByTestId('search-input')
      expect(input).toHaveAttribute('aria-describedby', 'search-help')

      // Help text should be in the DOM (sr-only)
      expect(screen.getByText('Enter keywords to search')).toBeInTheDocument()
    })

    it('clear button has accessible label', () => {
      render(<GallerySearch value="test" onChange={() => {}} />)

      expect(screen.getByTestId('gallery-search-clear')).toHaveAttribute('aria-label', 'Clear search')
    })

    it('has type="search" for semantic meaning', () => {
      render(<GallerySearch />)

      expect(screen.getByTestId('gallery-search-input')).toHaveAttribute('type', 'search')
    })
  })
})
