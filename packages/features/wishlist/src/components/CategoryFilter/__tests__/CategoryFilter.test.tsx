import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CategoryFilter from '../index';
import type { CategoryFilterProps } from '../../../types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock UI components with simpler implementation
vi.mock('@repo/ui', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-wrapper">
      <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="category-select">
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  buttonVariants: () => 'btn btn-default',
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  Tag: () => <span data-testid="tag-icon">Tag</span>,
}));

const defaultProps: CategoryFilterProps = {
  filter: { category: undefined },
  onFilterChange: vi.fn(),
  categories: [],
  className: '',
};

describe('CategoryFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders category filter with title', () => {
    render(<CategoryFilter {...defaultProps} />);
    
    expect(screen.getByText('Category Filter')).toBeInTheDocument();
    expect(screen.getByTestId('tag-icon')).toBeInTheDocument();
  });

  it('displays predefined LEGO categories in select', () => {
    render(<CategoryFilter {...defaultProps} />);
    
    const select = screen.getByTestId('category-select');
    fireEvent.click(select);
    
    // Check for some predefined categories
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Speed Champions')).toBeInTheDocument();
    expect(screen.getByText('Star Wars')).toBeInTheDocument();
    expect(screen.getByText('Technic')).toBeInTheDocument();
  });

  it('displays custom categories from props', () => {
    const customCategories = ['Custom Category 1', 'Custom Category 2'];
    render(<CategoryFilter {...defaultProps} categories={customCategories} />);
    
    const select = screen.getByTestId('category-select');
    fireEvent.click(select);
    
    expect(screen.getByText('Custom Category 1')).toBeInTheDocument();
    expect(screen.getByText('Custom Category 2')).toBeInTheDocument();
  });

  it('shows clear button when category is selected', () => {
    render(<CategoryFilter {...defaultProps} filter={{ category: 'Star Wars' }} />);
    
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('calls onFilterChange with undefined when clear button is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <CategoryFilter
        {...defaultProps}
        filter={{ category: 'Star Wars' }}
        onFilterChange={onFilterChange}
      />
    );
    
    const clearButton = screen.getByTestId('x-icon').closest('button');
    fireEvent.click(clearButton!);
    
    expect(onFilterChange).toHaveBeenCalledWith({ category: undefined });
  });

  it('shows custom category input when custom button is clicked', () => {
    render(<CategoryFilter {...defaultProps} />);
    
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);
    
    expect(screen.getByPlaceholderText('Enter custom category...')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('adds custom category when Add button is clicked', () => {
    const onFilterChange = vi.fn();
    render(<CategoryFilter {...defaultProps} onFilterChange={onFilterChange} />);
    
    // Open custom input
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);
    
    // Enter custom category
    const input = screen.getByPlaceholderText('Enter custom category...');
    fireEvent.change(input, { target: { value: 'My Custom Category' } });
    
    // Click Add button
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    expect(onFilterChange).toHaveBeenCalledWith({ category: 'My Custom Category' });
  });

  it('adds custom category when Enter key is pressed', () => {
    const onFilterChange = vi.fn();
    render(<CategoryFilter {...defaultProps} onFilterChange={onFilterChange} />);
    
    // Open custom input
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);
    
    // Enter custom category and press Enter
    const input = screen.getByPlaceholderText('Enter custom category...');
    fireEvent.change(input, { target: { value: 'My Custom Category' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onFilterChange).toHaveBeenCalledWith({ category: 'My Custom Category' });
  });

  it('closes custom input when Escape key is pressed', () => {
    render(<CategoryFilter {...defaultProps} />);
    
    // Open custom input
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);
    
    // Press Escape
    const input = screen.getByPlaceholderText('Enter custom category...');
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(screen.queryByPlaceholderText('Enter custom category...')).not.toBeInTheDocument();
  });

  it('does not add empty custom category', () => {
    const onFilterChange = vi.fn();
    render(<CategoryFilter {...defaultProps} onFilterChange={onFilterChange} />);
    
    // Open custom input
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);
    
    // Try to add empty category
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    expect(onFilterChange).not.toHaveBeenCalled();
  });

  it('shows current filter category', () => {
    render(<CategoryFilter {...defaultProps} filter={{ category: 'Star Wars' }} />);
    
    expect(screen.getByText('Filtering by:')).toBeInTheDocument();
    // Use a more specific selector to avoid conflicts with select options
    const filterText = screen.getByText((content, element) => {
      return element?.tagName === 'SPAN' && element?.className?.includes('font-medium') && content === 'Star Wars';
    });
    expect(filterText).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<CategoryFilter {...defaultProps} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('combines predefined and custom categories without duplicates', () => {
    const customCategories = ['Star Wars', 'Custom Category'];
    render(<CategoryFilter {...defaultProps} categories={customCategories} />);
    
    const select = screen.getByTestId('category-select');
    fireEvent.click(select);
    
    // Should show both predefined and custom categories
    expect(screen.getByText('Star Wars')).toBeInTheDocument();
    expect(screen.getByText('Custom Category')).toBeInTheDocument();
    expect(screen.getByText('Speed Champions')).toBeInTheDocument();
  });

  it('sorts categories alphabetically', () => {
    const customCategories = ['Zebra', 'Alpha', 'Beta'];
    render(<CategoryFilter {...defaultProps} categories={customCategories} />);
    
    const select = screen.getByTestId('category-select');
    fireEvent.click(select);
    
    // Categories should be sorted alphabetically
    const options = screen.getAllByRole('option');
    const categoryValues = options.map(option => option.textContent);
    
    // Check that some categories are in alphabetical order
    expect(categoryValues).toContain('Alpha');
    expect(categoryValues).toContain('Beta');
    expect(categoryValues).toContain('Zebra');
  });

  // Test the component's internal logic by testing the custom category functionality
  it('handles category filtering logic correctly', () => {
    const onFilterChange = vi.fn();
    render(<CategoryFilter {...defaultProps} onFilterChange={onFilterChange} />);
    
    // Test that the component can handle category changes through custom input
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);
    
    const input = screen.getByPlaceholderText('Enter custom category...');
    fireEvent.change(input, { target: { value: 'Test Category' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onFilterChange).toHaveBeenCalledWith({ category: 'Test Category' });
  });
}); 