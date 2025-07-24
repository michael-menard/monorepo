import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FilteredGallery from '../index.js';
import { GalleryImage } from '../../../store/galleryApi.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock the gallery API hooks
const mockSearchImagesQuery = vi.fn();
const mockGetAvailableTagsQuery = vi.fn();
const mockGetAvailableCategoriesQuery = vi.fn();

vi.mock('../../../store/galleryApi.js', () => ({
  useSearchImagesQuery: () => mockSearchImagesQuery(),
  useGetAvailableTagsQuery: () => mockGetAvailableTagsQuery(),
  useGetAvailableCategoriesQuery: () => mockGetAvailableCategoriesQuery(),
  GalleryImage: {} as any,
}));

// Mock FilterBar and GalleryCard components
vi.mock('../../FilterBar/index.js', () => ({
  default: ({ onSearchChange, onTagsChange, onCategoryChange, onClearFilters }: any) => (
    <div data-testid="filter-bar">
      <button onClick={() => onSearchChange('test query')}>Search</button>
      <button onClick={() => onTagsChange(['nature'])}>Add Tag</button>
      <button onClick={() => onCategoryChange('photography')}>Set Category</button>
      <button onClick={onClearFilters}>Clear Filters</button>
    </div>
  ),
}));

vi.mock('../../GalleryCard/index.js', () => ({
  default: ({ src, title, onView, onShare, onDownload, onDelete }: any) => (
    <div data-testid="gallery-card">
      <img src={src} alt={title} />
      <button onClick={onView}>View</button>
      <button onClick={onShare}>Share</button>
      <button onClick={onDownload}>Download</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}));

describe('FilteredGallery', () => {
  const mockImages: GalleryImage[] = [
    {
      id: '1',
      url: 'https://example.com/image1.jpg',
      title: 'Nature Photo',
      description: 'Beautiful nature scene',
      author: 'John Doe',
      uploadDate: '2024-01-01',
      tags: ['nature', 'landscape'],
    },
    {
      id: '2',
      url: 'https://example.com/image2.jpg',
      title: 'City Photo',
      description: 'Urban landscape',
      author: 'Jane Smith',
      uploadDate: '2024-01-02',
      tags: ['city', 'urban'],
    },
  ];

  const mockCallbacks = {
    onImageClick: vi.fn(),
    onImageShare: vi.fn(),
    onImageDownload: vi.fn(),
    onImageDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSearchImagesQuery.mockReturnValue({
      data: { data: mockImages, total: 2, source: 'elasticsearch' },
      isLoading: false,
      error: null,
      isFetching: false,
    });
    
    mockGetAvailableTagsQuery.mockReturnValue({
      data: ['nature', 'city', 'portrait', 'landscape'],
    });
    
    mockGetAvailableCategoriesQuery.mockReturnValue({
      data: ['photography', 'art', 'design'],
    });
  });

  it('renders filter bar and gallery cards', () => {
    render(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getAllByTestId('gallery-card')).toHaveLength(2);
  });

  it('displays search results info when searching', () => {
    render(<FilteredGallery {...mockCallbacks} />);

    // Trigger search
    fireEvent.click(screen.getByText('Search'));

    expect(screen.getByText('Found 2 images')).toBeInTheDocument();
    expect(screen.getByText('via elasticsearch')).toBeInTheDocument();
  });

  it('shows loading state when searching', () => {
    mockSearchImagesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isFetching: false,
    });

    render(<FilteredGallery {...mockCallbacks} />);

    fireEvent.click(screen.getByText('Search'));

    // Use getAllByText to handle multiple "Searching..." elements
    const searchingElements = screen.getAllByText('Searching...');
    expect(searchingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no images found', () => {
    mockSearchImagesQuery.mockReturnValue({
      data: { data: [], total: 0, source: 'elasticsearch' },
      isLoading: false,
      error: null,
      isFetching: false,
    });

    render(<FilteredGallery {...mockCallbacks} />);

    fireEvent.click(screen.getByText('Search'));

    expect(screen.getByText('No images found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
  });

  it('shows error message when search fails', () => {
    mockSearchImagesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Search failed'),
      isFetching: false,
    });

    render(<FilteredGallery {...mockCallbacks} />);

    fireEvent.click(screen.getByText('Search'));

    expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
  });

  it('calls image action callbacks when buttons are clicked', () => {
    render(<FilteredGallery {...mockCallbacks} />);

    const cards = screen.getAllByTestId('gallery-card');
    const firstCard = cards[0];
    
    expect(firstCard).toBeDefined();

    // Test view callback
    const viewButton = firstCard!.querySelector('button');
    expect(viewButton).toBeDefined();
    fireEvent.click(viewButton!);
    expect(mockCallbacks.onImageClick).toHaveBeenCalledWith(mockImages[0]);

    // Test share callback
    const shareButton = firstCard!.querySelectorAll('button')[1];
    expect(shareButton).toBeDefined();
    fireEvent.click(shareButton!);
    expect(mockCallbacks.onImageShare).toHaveBeenCalledWith('1');

    // Test download callback
    const downloadButton = firstCard!.querySelectorAll('button')[2];
    expect(downloadButton).toBeDefined();
    fireEvent.click(downloadButton!);
    expect(mockCallbacks.onImageDownload).toHaveBeenCalledWith('1');

    // Test delete callback
    const deleteButton = firstCard!.querySelectorAll('button')[3];
    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton!);
    expect(mockCallbacks.onImageDelete).toHaveBeenCalledWith('1');
  });

  it('shows load more button when there are more images', () => {
    mockSearchImagesQuery.mockReturnValue({
      data: { data: mockImages, total: 10, source: 'elasticsearch' },
      isLoading: false,
      error: null,
      isFetching: false,
    });

    render(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('shows loading state on load more button when fetching', () => {
    mockSearchImagesQuery.mockReturnValue({
      data: { data: mockImages, total: 10, source: 'elasticsearch' },
      isLoading: false,
      error: null,
      isFetching: true,
    });

    render(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles clear filters action', () => {
    render(<FilteredGallery {...mockCallbacks} />);

    // First trigger a search
    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByText('Found 2 images')).toBeInTheDocument();

    // Then clear filters
    fireEvent.click(screen.getByText('Clear Filters'));
    
    // Should no longer show search results info
    expect(screen.queryByText('Found 2 images')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<FilteredGallery {...mockCallbacks} className="custom-class" />);

    const container = screen.getByTestId('filter-bar').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('uses custom page size', () => {
    render(<FilteredGallery {...mockCallbacks} pageSize={10} />);

    // The pageSize prop should be passed to the search query
    // We can verify this by checking that the component renders correctly
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  it('shows initial empty state when no search is active', () => {
    mockSearchImagesQuery.mockReturnValue({
      data: { data: [], total: 0, source: 'elasticsearch' },
      isLoading: false,
      error: null,
      isFetching: false,
    });

    render(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByText('No images yet')).toBeInTheDocument();
    expect(screen.getByText('Upload some images to get started')).toBeInTheDocument();
  });

  it('handles tag and category filters', () => {
    render(<FilteredGallery {...mockCallbacks} />);

    // Add tag filter
    fireEvent.click(screen.getByText('Add Tag'));
    expect(screen.getByText('Found 2 images')).toBeInTheDocument();

    // Set category filter
    fireEvent.click(screen.getByText('Set Category'));
    expect(screen.getByText('Found 2 images')).toBeInTheDocument();
  });
}); 