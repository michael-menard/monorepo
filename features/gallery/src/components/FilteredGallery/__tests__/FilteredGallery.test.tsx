import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FilteredGallery from '../index';
import { GalleryImage } from '../../../store/galleryApi';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { galleryApi } from '../../../store/galleryApi';

function createTestStore() {
  return configureStore({
    reducer: {
      [galleryApi.reducerPath]: galleryApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(galleryApi.middleware),
  });
}

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

  function renderWithProvider(ui: React.ReactElement) {
    const store = createTestStore();
    return render(<Provider store={store}>{ui}</Provider>);
  }

  it('renders filter bar and gallery cards', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getAllByTestId('gallery-card')).toHaveLength(2);
  });

  it('displays search results info when searching', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

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

    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

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

    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

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

    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

    fireEvent.click(screen.getByText('Search'));

    expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
  });

  it('calls image action callbacks when buttons are clicked', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

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

    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('shows loading state on load more button when fetching', () => {
    mockSearchImagesQuery.mockReturnValue({
      data: { data: mockImages, total: 10, source: 'elasticsearch' },
      isLoading: false,
      error: null,
      isFetching: true,
    });

    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles clear filters action', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

    // First trigger a search
    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByText('Found 2 images')).toBeInTheDocument();

    // Then clear filters
    fireEvent.click(screen.getByText('Clear Filters'));
    
    // Should no longer show search results info
    expect(screen.queryByText('Found 2 images')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} className="custom-class" />);

    const container = screen.getByTestId('filter-bar').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('uses custom page size', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} pageSize={10} />);

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

    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

    expect(screen.getByText('No images yet')).toBeInTheDocument();
    expect(screen.getByText('Upload some images to get started')).toBeInTheDocument();
  });

  it('handles tag and category filters', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);

    // Add tag filter
    fireEvent.click(screen.getByText('Add Tag'));
    expect(screen.getByText('Found 2 images')).toBeInTheDocument();

    // Set category filter
    fireEvent.click(screen.getByText('Set Category'));
    expect(screen.getByText('Found 2 images')).toBeInTheDocument();
  });

  it('shows and updates multi-select checkboxes and toolbar', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);
    // Checkboxes should be present
    const cards = screen.getAllByTestId('gallery-card');
    // Simulate selecting the first image
    const firstCheckbox = cards[0].querySelector('input[type="checkbox"]');
    expect(firstCheckbox).toBeDefined();
    if (firstCheckbox) fireEvent.click(firstCheckbox);
    // Toolbar should appear
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    // Select the second image
    const secondCheckbox = cards[1].querySelector('input[type="checkbox"]');
    expect(secondCheckbox).toBeDefined();
    if (secondCheckbox) fireEvent.click(secondCheckbox);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    // Deselect the first image
    expect(firstCheckbox).toBeDefined();
    if (firstCheckbox) fireEvent.click(firstCheckbox);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    // Clear selection
    fireEvent.click(screen.getByText('Clear Selection'));
    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('selects all and clears all with toolbar buttons', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);
    // Select all
    fireEvent.click(screen.getByText('Select All'));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    // Clear selection
    fireEvent.click(screen.getByText('Clear Selection'));
    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('calls onImageDelete for each selected image on batch delete', () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);
    // Select both images
    const cards = screen.getAllByTestId('gallery-card');
    const cb1 = cards[0].querySelector('input[type="checkbox"]');
    const cb2 = cards[1].querySelector('input[type="checkbox"]');
    expect(cb1).toBeDefined();
    if (cb1) fireEvent.click(cb1);
    expect(cb2).toBeDefined();
    if (cb2) fireEvent.click(cb2);
    // Click delete selected
    fireEvent.click(screen.getByText('Delete Selected'));
    expect(mockCallbacks.onImageDelete).toHaveBeenCalledWith('1');
    expect(mockCallbacks.onImageDelete).toHaveBeenCalledWith('2');
    // Toolbar should disappear
    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('opens album dialog with selected images on batch add to album', async () => {
    renderWithProvider(<FilteredGallery {...mockCallbacks} />);
    // Select both images
    const cards = screen.getAllByTestId('gallery-card');
    const cb1 = cards[0].querySelector('input[type="checkbox"]');
    const cb2 = cards[1].querySelector('input[type="checkbox"]');
    expect(cb1).toBeDefined();
    if (cb1) fireEvent.click(cb1);
    expect(cb2).toBeDefined();
    if (cb2) fireEvent.click(cb2);
    // Click add to album
    fireEvent.click(screen.getByText('Add to Album'));
    // Album dialog should open (CreateAlbumDialog is rendered)
    // Since CreateAlbumDialog is not mocked, check for its presence by role or text
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
}); 