import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock all dependencies
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
  LayoutGroup: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../FilterBar', () => ({
  default: () => <div data-testid="filter-bar">FilterBar Component</div>,
}));

vi.mock('../../../hooks/useFilterBar', () => ({
  useFilterBar: () => ({
    filters: { searchQuery: '', selectedTags: [], selectedCategory: '' },
    searchResults: [],
    isLoading: false,
    error: null,
    totalResults: 0,
    hasActiveFilters: false,
    availableTags: [],
    availableCategories: [],
    setSearchQuery: vi.fn(),
    setSelectedTags: vi.fn(),
    setSelectedCategory: vi.fn(),
    clearFilters: vi.fn(),
    toggleTag: vi.fn(),
  }),
}));

vi.mock('../../index', () => ({
  default: ({ images }: any) => (
    <div data-testid="gallery">
      {images?.map((image: any) => (
        <div key={image.id} data-testid={`gallery-item-${image.id}`}>
          {image.title}
        </div>
      ))}
    </div>
  ),
}));

// Import after mocking
import GalleryWithSearch from '../index';

const mockImages = [
  {
    id: '1',
    url: 'https://example.com/image1.jpg',
    title: 'Nature Landscape',
    description: 'Beautiful nature landscape',
    author: 'John Doe',
    tags: ['nature', 'landscape'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    url: 'https://example.com/image2.jpg',
    title: 'City Architecture',
    description: 'Modern city architecture',
    author: 'Jane Smith',
    tags: ['city', 'architecture'],
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
];

describe('GalleryWithSearch', () => {
  it('renders gallery with search functionality', () => {
    render(<GalleryWithSearch images={mockImages} />);
    
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('gallery')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-item-2')).toBeInTheDocument();
  });

  it('hides filter bar when showFilterBar is false', () => {
    render(<GalleryWithSearch images={mockImages} showFilterBar={false} />);
    
    expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument();
    expect(screen.getByTestId('gallery')).toBeInTheDocument();
  });

  it('displays all images when no filters are active', () => {
    render(<GalleryWithSearch images={mockImages} />);
    
    expect(screen.getByTestId('gallery-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-item-2')).toBeInTheDocument();
  });

  it('renders with custom search placeholder', () => {
    render(
      <GalleryWithSearch 
        images={mockImages} 
        searchPlaceholder="Custom search placeholder"
      />
    );
    
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('gallery')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <GalleryWithSearch 
        images={mockImages} 
        className="custom-gallery-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-gallery-class');
  });

  it('handles empty images array', () => {
    render(<GalleryWithSearch images={[]} />);
    
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('gallery')).toBeInTheDocument();
    expect(screen.queryByTestId('gallery-item-1')).not.toBeInTheDocument();
  });
}); 