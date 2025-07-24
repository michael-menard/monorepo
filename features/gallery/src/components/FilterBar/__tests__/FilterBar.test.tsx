import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FilterBar from '../index.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: any) => <div data-testid="search-icon" className={className} />,
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
  Filter: ({ className }: any) => <div data-testid="filter-icon" className={className} />,
  Tag: ({ className }: any) => <div data-testid="tag-icon" className={className} />,
  ChevronDown: ({ className }: any) => <div data-testid="chevron-down-icon" className={className} />,
}));

describe('FilterBar', () => {
  const mockCallbacks = {
    onSearchChange: vi.fn(),
    onTagsChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  const defaultProps = {
    ...mockCallbacks,
    availableTags: ['nature', 'city', 'portrait', 'landscape'],
    availableCategories: ['photography', 'art', 'design'],
    searchPlaceholder: 'Search images...',
    debounceMs: 300,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', () => {
    render(<FilterBar {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search images...')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('updates search input value', () => {
    render(<FilterBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(searchInput).toHaveValue('test query');
  });

  it('debounces search query', async () => {
    render(<FilterBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search images...');
    
    // Type in search input
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Should not call immediately
    expect(mockCallbacks.onSearchChange).not.toHaveBeenCalled();
    
    // Fast forward time to trigger debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should call after debounce delay
    expect(mockCallbacks.onSearchChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button for search input when there is text', () => {
    render(<FilterBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('clears search input when clear button is clicked', () => {
    render(<FilterBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const clearButton = screen.getByTestId('x-icon').parentElement;
    fireEvent.click(clearButton!);

    expect(searchInput).toHaveValue('');
  });

  it('toggles filter expansion when filter button is clicked', () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByLabelText('Toggle filters');
    
    // Initially not expanded
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(filterButton);
    expect(screen.getByText('Tags')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(filterButton);
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('renders available tags when expanded', () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);

    expect(screen.getByText('nature')).toBeInTheDocument();
    expect(screen.getByText('city')).toBeInTheDocument();
    expect(screen.getByText('portrait')).toBeInTheDocument();
    expect(screen.getByText('landscape')).toBeInTheDocument();
  });

  it('toggles tag selection when clicked', () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);

    const natureTag = screen.getByText('nature');
    
    // Initially not selected
    expect(natureTag).toHaveClass('bg-gray-100');
    
    // Click to select
    fireEvent.click(natureTag);
    expect(mockCallbacks.onTagsChange).toHaveBeenCalledWith(['nature']);
    
    // Should now be selected
    expect(natureTag).toHaveClass('bg-blue-100');
    
    // Click to deselect
    fireEvent.click(natureTag);
    expect(mockCallbacks.onTagsChange).toHaveBeenCalledWith([]);
  });

  it('renders category dropdown when expanded', () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);

    const categorySelect = screen.getByRole('combobox');
    expect(categorySelect).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('photography')).toBeInTheDocument();
    expect(screen.getByText('art')).toBeInTheDocument();
    expect(screen.getByText('design')).toBeInTheDocument();
  });

  it('calls onCategoryChange when category is selected', () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);

    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'photography' } });

    expect(mockCallbacks.onCategoryChange).toHaveBeenCalledWith('photography');
  });

  it('shows clear filters button when filters are active', () => {
    render(<FilterBar {...defaultProps} />);

    // Initially no clear button
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();

    // Add search query
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Should show clear button
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('calls onClearFilters when clear button is clicked', () => {
    render(<FilterBar {...defaultProps} />);

    // Add search query to show clear button
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockCallbacks.onClearFilters).toHaveBeenCalled();
  });

  it('shows active filters summary when expanded', () => {
    render(<FilterBar {...defaultProps} />);

    // Add search query and expand filters
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);

    // Should show search filter summary
    expect(screen.getByText('Search: "test query"')).toBeInTheDocument();
  });

  it('allows removing individual filters from summary', () => {
    render(<FilterBar {...defaultProps} />);

    // Add search query and expand filters
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);

    // Click the X button in the search filter summary
    const searchFilterSummary = screen.getByText('Search: "test"');
    const removeButton = searchFilterSummary.querySelector('[data-testid="x-icon"]')?.parentElement;
    fireEvent.click(removeButton!);

    // Search input should be cleared
    expect(searchInput).toHaveValue('');
  });

  it('handles custom debounce delay', () => {
    render(<FilterBar {...defaultProps} debounceMs={500} />);

    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Should not call immediately
    expect(mockCallbacks.onSearchChange).not.toHaveBeenCalled();

    // Fast forward 300ms (default) - should not call
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(mockCallbacks.onSearchChange).not.toHaveBeenCalled();

    // Fast forward to 500ms - should call
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(mockCallbacks.onSearchChange).toHaveBeenCalledWith('test');
  });

  it('handles empty tags and categories arrays', () => {
    render(<FilterBar {...defaultProps} availableTags={[]} availableCategories={[]} />);

    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);

    // Should not render tags or categories sections
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<FilterBar {...defaultProps} className="custom-class" />);

    const filterBar = screen.getByPlaceholderText('Search images...').closest('div')?.parentElement?.parentElement;
    expect(filterBar).toHaveClass('custom-class');
  });

  it('uses custom search placeholder', () => {
    render(<FilterBar {...defaultProps} searchPlaceholder="Custom placeholder" />);

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('maintains filter state when toggling expansion', () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByLabelText('Toggle filters');
    const searchInput = screen.getByPlaceholderText('Search images...');

    // Add search query
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Expand filters and add tag
    fireEvent.click(filterButton);
    const natureTag = screen.getByText('nature');
    fireEvent.click(natureTag);

    // Collapse and expand again
    fireEvent.click(filterButton);
    fireEvent.click(filterButton);

    // State should be maintained
    expect(searchInput).toHaveValue('test');
    expect(natureTag).toHaveClass('bg-blue-100');
  });
}); 