import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import FilterBar from '../index';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon">Search</span>,
  X: () => <span data-testid="x-icon">X</span>,
  Filter: () => <span data-testid="filter-icon">Filter</span>,
  Tag: () => <span data-testid="tag-icon">Tag</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">ChevronDown</span>,
}));

describe('FilterBar', () => {
  const mockOnSearchChange = vi.fn();
  const mockOnTagsChange = vi.fn();
  const mockOnCategoryChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  const defaultProps = {
    onSearchChange: mockOnSearchChange,
    onTagsChange: mockOnTagsChange,
    onCategoryChange: mockOnCategoryChange,
    onClearFilters: mockOnClearFilters,
    availableTags: ['nature', 'city', 'portrait', 'landscape'],
    availableCategories: ['photography', 'art', 'design'],
    searchPlaceholder: 'Search images...',
    debounceMs: 300,
    className: '',
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
    
    const searchInput = screen.getByPlaceholderText('Search images...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders filter toggle button', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    expect(filterButton).toBeInTheDocument();
  });

  it('shows clear button when filters are active', () => {
    render(<FilterBar {...defaultProps} />);
    
    // Initially no clear button
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    
    // Add search query
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Clear button should appear
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('debounces search input correctly', async () => {
    render(<FilterBar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search images...');
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 't' } });
    fireEvent.change(searchInput, { target: { value: 'te' } });
    fireEvent.change(searchInput, { target: { value: 'tes' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Should not call onSearchChange immediately
    expect(mockOnSearchChange).not.toHaveBeenCalled();
    
    // Fast-forward time to trigger debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should call onSearchChange with final value
    expect(mockOnSearchChange).toHaveBeenCalledWith('test');
  }, 10000);

  it('calls onSearchChange only once after debounce', async () => {
    render(<FilterBar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search images...');
    
    // Type multiple characters
    fireEvent.change(searchInput, { target: { value: 't' } });
    fireEvent.change(searchInput, { target: { value: 'te' } });
    fireEvent.change(searchInput, { target: { value: 'tes' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith('test');
  }, 10000);

  it('clears search input when X button is clicked', () => {
    render(<FilterBar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // X button should appear
    const clearButton = screen.getByTestId('x-icon').closest('button');
    expect(clearButton).toBeInTheDocument();
    
    // Click X button
    fireEvent.click(clearButton!);
    
    // Input should be cleared
    expect(searchInput).toHaveValue('');
  });

  it('expands filters when filter button is clicked', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    
    // Initially filters should be collapsed
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    
    // Click filter button
    fireEvent.click(filterButton);
    
    // Filters should be expanded
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders available tags when expanded', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    // Check that all available tags are rendered
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
    
    // Click tag to select it
    fireEvent.click(natureTag);
    expect(mockOnTagsChange).toHaveBeenCalledWith(['nature']);
    
    // Click again to deselect
    fireEvent.click(natureTag);
    expect(mockOnTagsChange).toHaveBeenCalledWith([]);
  });

  it('renders category dropdown when expanded', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    const categorySelect = screen.getByRole('combobox');
    expect(categorySelect).toBeInTheDocument();
    
    // Check that all categories are available
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
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith('photography');
  });

  it('shows active filters summary when filters are applied', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    // Add search query
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // Add tag
    const natureTag = screen.getByText('nature');
    fireEvent.click(natureTag);
    
    // Add category
    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'photography' } });
    
    // Fast-forward time for debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Check that active filters are shown
    expect(screen.getByText('Search: "test query"')).toBeInTheDocument();
    expect(screen.getAllByText('nature')).toHaveLength(2); // One in tag list, one in active filters
    expect(screen.getAllByText('photography')).toHaveLength(2); // One in dropdown, one in active filters
  });

  it('clears all filters when clear button is clicked', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    // Add some filters
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    const natureTag = screen.getByText('nature');
    fireEvent.click(natureTag);
    
    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'photography' } });
    
    // Click clear button
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    // Should call onClearFilters
    expect(mockOnClearFilters).toHaveBeenCalled();
    
    // Input should be cleared
    expect(searchInput).toHaveValue('');
  });

  it('removes individual filters when X is clicked in active filters', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    // Add tag
    const natureTag = screen.getByText('nature');
    fireEvent.click(natureTag);
    
    // Add category
    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'photography' } });
    
    // Remove tag by clicking X in active filters
    const activeFilters = screen.getAllByText('nature');
    const activeTagSpan = activeFilters[1]; // Second occurrence is in active filters
    const activeTagX = activeTagSpan.closest('span')?.querySelector('button');
    fireEvent.click(activeTagX!);
    
    expect(mockOnTagsChange).toHaveBeenCalledWith([]);
    
    // Remove category by clicking X in active filters
    const activeCategoryElements = screen.getAllByText('photography');
    const activeCategorySpan = activeCategoryElements[1]; // Second occurrence is in active filters
    const activeCategoryX = activeCategorySpan.closest('span')?.querySelector('button');
    fireEvent.click(activeCategoryX!);
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith('');
  });

  it('handles empty availableTags and availableCategories', () => {
    render(
      <FilterBar
        {...defaultProps}
        availableTags={[]}
        availableCategories={[]}
      />
    );
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    // Should not render tags or categories sections
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FilterBar {...defaultProps} className="custom-class" />
    );
    
    const filterBar = container.firstChild as HTMLElement;
    expect(filterBar).toHaveClass('custom-class');
  });

  it('uses custom debounce time', async () => {
    render(<FilterBar {...defaultProps} debounceMs={500} />);
    
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Should not call immediately
    expect(mockOnSearchChange).not.toHaveBeenCalled();
    
    // Fast-forward 300ms (default) - should not trigger
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockOnSearchChange).not.toHaveBeenCalled();
    
    // Fast-forward to 500ms - should trigger
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('test');
  }, 10000);

  it('handles multiple tag selections correctly', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    // Select multiple tags
    const natureTag = screen.getByText('nature');
    const cityTag = screen.getByText('city');
    
    fireEvent.click(natureTag);
    expect(mockOnTagsChange).toHaveBeenCalledWith(['nature']);
    
    fireEvent.click(cityTag);
    expect(mockOnTagsChange).toHaveBeenCalledWith(['nature', 'city']);
    
    // Deselect one tag
    fireEvent.click(natureTag);
    expect(mockOnTagsChange).toHaveBeenCalledWith(['city']);
  });

  it('maintains filter state correctly', () => {
    render(<FilterBar {...defaultProps} />);
    
    const filterButton = screen.getByLabelText('Toggle filters');
    fireEvent.click(filterButton);
    
    // Add filters
    const searchInput = screen.getByPlaceholderText('Search images...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    const natureTag = screen.getByText('nature');
    fireEvent.click(natureTag);
    
    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'photography' } });
    
    // Collapse and expand filters
    fireEvent.click(filterButton);
    fireEvent.click(filterButton);
    
    // State should be maintained
    expect(searchInput).toHaveValue('test');
    expect(natureTag).toHaveClass('bg-blue-100'); // Selected state
    expect(categorySelect).toHaveValue('photography');
  });
}); 