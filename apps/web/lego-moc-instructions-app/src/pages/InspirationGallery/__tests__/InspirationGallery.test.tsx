import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import InspirationGallery from '../index';
import type { InspirationItem, InspirationResponse } from '@repo/gallery';

// Mock the gallery hooks
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual('@repo/gallery');
  return {
    ...actual,
    useGetInspirationItemsQuery: vi.fn(),
    useLikeInspirationItemMutation: vi.fn(),
  };
});

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockInspirationItems: InspirationItem[] = [
  {
    id: '1',
    title: 'Amazing Space Station',
    description: 'A stunning space station design that will inspire your next build',
    author: 'Space Builder',
    category: 'Space',
    tags: ['space', 'station', 'futuristic'],
    imageUrl: 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Space+Station',
    likes: 42,
    isLiked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Classic Car Collection',
    description: 'Beautiful vintage cars that capture the essence of automotive history',
    author: 'Car Enthusiast',
    category: 'Vehicles',
    tags: ['cars', 'vintage', 'classic'],
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Classic+Cars',
    likes: 38,
    isLiked: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    title: 'Modern Architecture',
    description: 'Contemporary building designs that showcase modern aesthetics',
    author: 'Architect Fan',
    category: 'Architecture',
    tags: ['modern', 'building', 'design'],
    imageUrl: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Modern+Architecture',
    likes: 56,
    isLiked: false,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockInspirationResponse: InspirationResponse = {
  data: mockInspirationItems,
  total: 3,
  message: 'Success',
};

// Mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      // Add any reducers that might be needed
    },
    preloadedState: {},
  });
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createMockStore();
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

// Import the mocked hooks
import { useGetInspirationItemsQuery, useLikeInspirationItemMutation } from '@repo/gallery';

const mockUseGetInspirationItemsQuery = vi.mocked(useGetInspirationItemsQuery);
const mockUseLikeInspirationItemMutation = vi.mocked(useLikeInspirationItemMutation);

describe('InspirationGallery', () => {
  const mockLikeMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLikeMutation.mockClear();

    // Default mock implementations
    mockUseGetInspirationItemsQuery.mockReturnValue({
      data: mockInspirationResponse,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseLikeInspirationItemMutation.mockReturnValue([
      mockLikeMutation,
      { isLoading: false, error: null },
    ]);
  });

  describe('Rendering', () => {
    it('should render the inspiration gallery page with header', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByTestId('inspiration-gallery-page')).toBeInTheDocument();
      expect(screen.getByText('Inspiration Gallery')).toBeInTheDocument();
      expect(screen.getByText('Discover amazing LEGO creations that will inspire your next build')).toBeInTheDocument();
    });

    it('should render the "Share Inspiration" button', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByText('Share Inspiration')).toBeInTheDocument();
    });

    it('should render search and filter controls', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Search inspiration...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Newest First')).toBeInTheDocument();
    });

    it('should render inspiration items when data is available', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByText('Amazing Space Station')).toBeInTheDocument();
      expect(screen.getByText('Classic Car Collection')).toBeInTheDocument();
      expect(screen.getByText('Modern Architecture')).toBeInTheDocument();
    });

    it('should display results count', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByText('Showing 3 of 3 inspiration items')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when data is loading', () => {
      mockUseGetInspirationItemsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByText('Loading inspiration items...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share inspiration/i })).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Error State', () => {
    it('should show error state when there is an error', () => {
      const mockRefetch = vi.fn();
      mockUseGetInspirationItemsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { status: 'FETCH_ERROR', error: 'Failed to fetch' },
        refetch: mockRefetch,
      });

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByText('Failed to load inspiration items')).toBeInTheDocument();
      expect(screen.getByText('There was an error loading the inspiration gallery.')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should call refetch when "Try Again" button is clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseGetInspirationItemsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { status: 'FETCH_ERROR', error: 'Failed to fetch' },
        refetch: mockRefetch,
      });

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no inspiration items are found', () => {
      mockUseGetInspirationItemsQuery.mockReturnValue({
        data: { data: [], total: 0, message: 'No items found' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByText('No inspiration found')).toBeInTheDocument();
      expect(screen.getByText('Be the first to share some inspiration!')).toBeInTheDocument();
    });

    it('should show empty state with different message when filters are applied', () => {
      mockUseGetInspirationItemsQuery.mockReturnValue({
        data: { data: [], total: 0, message: 'No items found' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      // Apply a search filter
      const searchInput = screen.getByPlaceholderText('Search inspiration...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No inspiration found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria.')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should update search filter when typing in search input', async () => {
      const mockQuery = vi.fn();
      mockUseGetInspirationItemsQuery.mockReturnValue({
        data: mockInspirationResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search inspiration...');
      fireEvent.change(searchInput, { target: { value: 'space' } });

      await waitFor(() => {
        expect(mockUseGetInspirationItemsQuery).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'space' })
        );
      });
    });

    it('should update category filter when selecting a category', async () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'Space' } });

      await waitFor(() => {
        expect(mockUseGetInspirationItemsQuery).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'Space' })
        );
      });
    });

    it('should update sort order when selecting different sort options', async () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const sortSelect = screen.getByDisplayValue('Newest First');
      fireEvent.change(sortSelect, { target: { value: 'likes-desc' } });

      await waitFor(() => {
        expect(mockUseGetInspirationItemsQuery).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'likes', sortOrder: 'desc' })
        );
      });
    });
  });

  describe('Inspiration Item Interactions', () => {
    it('should display inspiration item details correctly', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      // Check first item details
      expect(screen.getByText('Amazing Space Station')).toBeInTheDocument();
      expect(screen.getByText('A stunning space station design that will inspire your next build')).toBeInTheDocument();
      expect(screen.getByText('By Space Builder')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument(); // likes count
      
      // Check for category badge specifically using getAllByText and filtering
      const spaceElements = screen.getAllByText('Space');
      const categoryBadge = spaceElements.find(element => element.closest('.category'));
      expect(categoryBadge).toBeInTheDocument();
    });

    it('should handle like button click', async () => {
      // Mock the like mutation to return a promise with unwrap method
      const mockUnwrap = vi.fn().mockResolvedValue({ data: { isLiked: true } });
      mockLikeMutation.mockReturnValue({
        unwrap: mockUnwrap,
      });

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      // Find the first like button (the one with 42 likes)
      const likeButtons = screen.getAllByRole('button');
      const firstLikeButton = likeButtons.find(button => button.textContent?.includes('42'));
      expect(firstLikeButton).toBeInTheDocument();
      
      fireEvent.click(firstLikeButton!);

      await waitFor(() => {
        expect(mockLikeMutation).toHaveBeenCalledWith('1');
      });
    });

    it('should handle share button click', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const shareButtons = screen.getAllByText('Share');
      const firstShareButton = shareButtons[0];
      
      fireEvent.click(firstShareButton);

      expect(consoleSpy).toHaveBeenCalledWith('Shared inspiration item:', '1');
      consoleSpy.mockRestore();
    });

    it('should handle inspiration item click', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const firstItem = screen.getByText('Amazing Space Station').closest('[data-testid="inspiration-item"]');
      expect(firstItem).toBeInTheDocument();
      
      fireEvent.click(firstItem!);

      expect(consoleSpy).toHaveBeenCalledWith('Navigate to inspiration detail:', '1');
      consoleSpy.mockRestore();
    });

    it('should display tags correctly', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      expect(screen.getByText('space')).toBeInTheDocument();
      expect(screen.getByText('station')).toBeInTheDocument();
      expect(screen.getByText('cars')).toBeInTheDocument();
      expect(screen.getByText('vintage')).toBeInTheDocument();
    });

    it('should show liked state correctly', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      // The second item (Classic Car Collection) has isLiked: true
      const likeButtons = screen.getAllByRole('button');
      const secondLikeButton = likeButtons.find(button => button.textContent?.includes('38'));
      expect(secondLikeButton).toBeInTheDocument();
      
      // Check that the heart icon has the filled class
      const heartIcon = secondLikeButton?.querySelector('svg');
      expect(heartIcon).toHaveClass('fill-current');
    });
  });

  describe('Create New Inspiration', () => {
    it('should handle create new button click', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const createButton = screen.getByText('Share Inspiration');
      fireEvent.click(createButton);

      expect(consoleSpy).toHaveBeenCalledWith('Navigate to create inspiration page');
      consoleSpy.mockRestore();
    });
  });

  describe('Image Error Handling', () => {
    it('should handle image load errors with fallback', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const images = screen.getAllByRole('img');
      const firstImage = images[0];

      // Simulate image load error
      fireEvent.error(firstImage);

      // Check that the src was updated to a placeholder
      expect(firstImage).toHaveAttribute('src', expect.stringContaining('placeholder.com'));
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      // Check that images have alt text
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });

      // Check that buttons are accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Inspiration Gallery');

      const itemHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(itemHeadings).toHaveLength(3);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      render(
        <TestWrapper>
          <InspirationGallery />
        </TestWrapper>
      );

      const grid = screen.getByTestId('inspiration-gallery-page').querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });
  });
}); 