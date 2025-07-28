import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useInfiniteGallery } from '../useInfiniteGallery.js';
import { galleryApi } from '../../store/galleryApi.js';

// Mock the RTK Query hook
vi.mock('../../store/galleryApi.js', async () => {
  const actual = await vi.importActual('../../store/galleryApi.js');
  return {
    ...actual,
    useGetGalleryQuery: vi.fn(),
  };
});

const mockUseGetGalleryQuery = vi.mocked(require('../../store/galleryApi.js').useGetGalleryQuery);

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
const mockGalleryResponse = {
  items: [
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
  ],
  nextCursor: 20,
  hasMore: true,
};

const defaultMockReturn = {
  data: mockGalleryResponse,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
};

describe('useInfiniteGallery', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
    mockUseGetGalleryQuery.mockReturnValue(defaultMockReturn);
  });

  const renderHookWithProvider = (options = {}) => {
    return renderHook(() => useInfiniteGallery(options), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
  };

  describe('Initial State', () => {
    it('initializes with default values', () => {
      const { result } = renderHookWithProvider();

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
      expect(typeof result.current.loadMore).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });

    it('uses custom page size', () => {
      renderHookWithProvider({ pageSize: 10 });

      expect(mockUseGetGalleryQuery).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
        expect.any(Object),
      );
    });

    it('uses custom initial filters', () => {
      const customFilters = { type: 'image' as const, tag: 'test' };
      renderHookWithProvider({ initialFilters: customFilters });

      expect(mockUseGetGalleryQuery).toHaveBeenCalledWith(
        expect.objectContaining(customFilters),
        expect.any(Object),
      );
    });
  });

  describe('Data Loading', () => {
    it('updates items when data is received', () => {
      const { result } = renderHookWithProvider();

      // Simulate data update
      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          data: mockGalleryResponse,
        });
      });

      expect(result.current.items).toEqual(mockGalleryResponse.items);
      expect(result.current.hasMore).toBe(true);
    });

    it('appends items for subsequent pages', () => {
      const { result } = renderHookWithProvider();

      // Set initial data
      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          data: mockGalleryResponse,
        });
      });

      // Simulate second page
      const secondPageData = {
        items: [
          {
            id: '3',
            type: 'image' as const,
            url: 'https://example.com/image3.jpg',
            title: 'Test Image 3',
            description: 'Test description 3',
            author: 'Test Author 3',
            tags: ['test', 'image'],
            createdAt: '2023-01-03T00:00:00Z',
            updatedAt: '2023-01-03T00:00:00Z',
          },
        ],
        nextCursor: null,
        hasMore: false,
      };

      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          data: secondPageData,
        });
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.hasMore).toBe(false);
    });

    it('handles loading states correctly', () => {
      const { result } = renderHookWithProvider();

      // Simulate loading state
      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          isLoading: true,
        });
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('handles fetching states correctly', () => {
      const { result } = renderHookWithProvider();

      // Simulate fetching state
      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          isFetching: true,
        });
      });

      expect(result.current.isFetching).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles errors correctly', () => {
      const { result } = renderHookWithProvider();

      const error = { message: 'Test error' };

      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          error,
        });
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('Actions', () => {
    it('loadMore function updates cursor', () => {
      const { result } = renderHookWithProvider({ pageSize: 20 });

      act(() => {
        result.current.loadMore();
      });

      expect(mockUseGetGalleryQuery).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 20 }),
        expect.any(Object),
      );
    });

    it('refresh function resets cursor and items', () => {
      const { result } = renderHookWithProvider();

      // Set some initial data
      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          data: mockGalleryResponse,
        });
      });

      expect(result.current.items).toHaveLength(2);

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      expect(mockUseGetGalleryQuery).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 0 }),
        expect.any(Object),
      );
    });

    it('setFilters function updates filters and resets cursor', () => {
      const { result } = renderHookWithProvider();

      act(() => {
        result.current.setFilters({ type: 'image' });
      });

      expect(mockUseGetGalleryQuery).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'image', cursor: 0 }),
        expect.any(Object),
      );
    });
  });

  describe('Filter Changes', () => {
    it('resets items when filters change', () => {
      const { result } = renderHookWithProvider();

      // Set initial data
      act(() => {
        mockUseGetGalleryQuery.mockReturnValue({
          ...defaultMockReturn,
          data: mockGalleryResponse,
        });
      });

      expect(result.current.items).toHaveLength(2);

      // Change filters
      act(() => {
        result.current.setFilters({ type: 'album' });
      });

      // Items should be reset when filters change
      expect(result.current.items).toEqual([]);
    });
  });

  describe('Disabled State', () => {
    it('skips query when enabled is false', () => {
      renderHookWithProvider({ enabled: false });

      expect(mockUseGetGalleryQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ skip: true }),
      );
    });
  });
}); 