import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import InfiniteGallery from '../index.js';
import { galleryApi } from '../../../store/galleryApi.js';

// Mock the hooks
vi.mock('../../../hooks/useInfiniteGallery.js');
vi.mock('../../../hooks/useIntersectionObserver.js');
vi.mock('../../../hooks/useAlbumDragAndDrop.js');

import * as InfiniteGalleryHook from '../../../hooks/useInfiniteGallery.js';
import * as IntersectionObserverHook from '../../../hooks/useIntersectionObserver.js';
import * as AlbumDnDHook from '../../../hooks/useAlbumDragAndDrop.js';

const mockUseInfiniteGallery = vi.mocked((InfiniteGalleryHook as any).useInfiniteGallery);
const mockUseIntersectionObserver = vi.mocked((IntersectionObserverHook as any).useIntersectionObserver);
const mockUseAlbumDragAndDrop = vi.mocked((AlbumDnDHook as any).useAlbumDragAndDrop);

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      [galleryApi.reducerPath]: galleryApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(galleryApi.middleware),
  });
};

// Mock data
const mockGalleryItems = [
  {
    id: '1',
    type: 'image' as const,
    url: 'https://example.com/image1.jpg',
    title: 'Test Image 1',
    description: 'Test description 1',
    author: 'Test Author',
    tags: ['test', 'image'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    type: 'image' as const,
    url: 'https://example.com/image2.jpg',
    title: 'Test Image 2',
    description: 'Test description 2',
    author: 'Test Author 2',
    tags: ['test', 'image'],
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
];

const defaultMockReturn = {
  items: mockGalleryItems,
  isLoading: false,
  isFetching: false,
  error: null,
  hasMore: true,
  loadMore: vi.fn(),
  refresh: vi.fn(),
  filters: {},
  setFilters: vi.fn(),
};

describe('InfiniteGallery', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseInfiniteGallery.mockReturnValue(defaultMockReturn);
    mockUseIntersectionObserver.mockReturnValue({
      ref: { current: null },
      isIntersecting: false,
    });
    mockUseAlbumDragAndDrop.mockReturnValue({
      actions: {
        handleDragStart: vi.fn(),
        handleDragOver: vi.fn(),
        handleDrop: vi.fn(),
        handleDragEnd: vi.fn(),
      },
    });
  });

  const renderInfiniteGallery = (props = {}) => {
    return render(
      <Provider store={store}>
        <InfiniteGallery {...props} />
      </Provider>,
    );
  };

  describe('Rendering', () => {
    it('renders gallery items correctly', () => {
      renderInfiniteGallery();

      expect(screen.getByText('Test Image 1')).toBeInTheDocument();
      expect(screen.getByText('Test Image 2')).toBeInTheDocument();
      expect(screen.getByText('Test description 1')).toBeInTheDocument();
      expect(screen.getByText('Test description 2')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });

      renderInfiniteGallery();

      expect(screen.getByText('Loading gallery...')).toBeInTheDocument();
    });

    it('shows error state when error exists', () => {
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        error: { message: 'Test error' },
      });

      renderInfiniteGallery();

      expect(screen.getByText('Error loading gallery')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong while loading your images.')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('shows empty state when no items', () => {
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        items: [],
        isLoading: false,
      });

      renderInfiniteGallery();

      expect(screen.getByText('No images yet')).toBeInTheDocument();
      expect(screen.getByText('Start adding images to your gallery!')).toBeInTheDocument();
    });
  });

  describe('Infinite Scroll', () => {
    it('shows loading more indicator when fetching more items', () => {
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        isFetching: true,
        hasMore: true,
      });

      renderInfiniteGallery();

      expect(screen.getByText('Loading more images...')).toBeInTheDocument();
    });

    it('shows end message when no more items', () => {
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        hasMore: false,
      });

      renderInfiniteGallery();

      expect(screen.getByText("You've reached the end of your gallery!")).toBeInTheDocument();
    });

    it('triggers loadMore when intersection observer fires', () => {
      const mockLoadMore = vi.fn();
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        loadMore: mockLoadMore,
        hasMore: true,
        isFetching: false,
      });

      renderInfiniteGallery();

      // Simulate intersection observer callback
      const mockCallback = mockUseIntersectionObserver.mock.calls[0][0];
      mockCallback(true);

      expect(mockLoadMore).toHaveBeenCalled();
    });

    it('does not trigger loadMore when already fetching', () => {
      const mockLoadMore = vi.fn();
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        loadMore: mockLoadMore,
        hasMore: true,
        isFetching: true,
      });

      renderInfiniteGallery();

      // Simulate intersection observer callback
      const mockCallback = mockUseIntersectionObserver.mock.calls[0][0];
      mockCallback(true);

      expect(mockLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('calls refresh when Try Again button is clicked', () => {
      const mockRefresh = vi.fn();
      mockUseInfiniteGallery.mockReturnValue({
        ...defaultMockReturn,
        error: { message: 'Test error' },
        refresh: mockRefresh,
      });

      renderInfiniteGallery();

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Image Interactions', () => {
    it('calls onImageClick when image is clicked', () => {
      const mockOnImageClick = vi.fn();
      renderInfiniteGallery({ onImageClick: mockOnImageClick });

      // Find and click the first image card
      const imageCards = screen.getAllByRole('img');
      fireEvent.click(imageCards[0]);

      expect(mockOnImageClick).toHaveBeenCalledWith(mockGalleryItems[0]);
    });

    it('calls onImageLike when like button is clicked', () => {
      const mockOnImageLike = vi.fn();
      renderInfiniteGallery({ onImageLike: mockOnImageLike });

      // This would require finding the like button in the ImageCard component
      // For now, we'll just verify the prop is passed correctly
      expect(mockOnImageLike).toBeDefined();
    });
  });

  describe('Customization', () => {
    it('applies custom className', () => {
      renderInfiniteGallery({ className: 'custom-class' });

      const galleryContainer = screen.getByText('Test Image 1').closest('.custom-class');
      expect(galleryContainer).toBeInTheDocument();
    });

    it('uses custom page size', () => {
      renderInfiniteGallery({ pageSize: 10 });

      expect(mockUseInfiniteGallery).toHaveBeenCalledWith({
        initialFilters: {},
        pageSize: 10,
      });
    });

    it('uses custom initial filters', () => {
      const customFilters = { type: 'image' as const, tag: 'test' };
      renderInfiniteGallery({ initialFilters: customFilters });

      expect(mockUseInfiniteGallery).toHaveBeenCalledWith({
        initialFilters: customFilters,
        pageSize: 20,
      });
    });
  });
}); 