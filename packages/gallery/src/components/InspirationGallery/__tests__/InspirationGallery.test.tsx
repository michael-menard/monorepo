import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { galleryApi } from '../../../store/galleryApi.js';
import InspirationGallery from '../index.js';

const API_URL = 'http://localhost/api/gallery';

const mockImages = [
  { 
    id: '1', 
    url: 'img1.jpg', 
    title: 'Test Image 1', 
    uploadDate: '2024-01-01',
    tags: ['lego', 'star-wars']
  },
  { 
    id: '2', 
    url: 'img2.jpg', 
    title: 'Test Image 2', 
    uploadDate: '2024-01-02',
    tags: ['architecture']
  }
];

const handlers = [
  http.get(`${API_URL}/`, () =>
    HttpResponse.json({ data: mockImages })
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const makeStore = () =>
  configureStore({
    reducer: { [galleryApi.reducerPath]: galleryApi.reducer },
    middleware: (gDM) => gDM().concat(galleryApi.middleware),
  });

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('InspirationGallery', () => {
  beforeEach(() => {
    mockIntersectionObserver.mockClear();
  });

  it('renders loading state with skeleton', () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    
    // Check for skeleton elements instead of loading text
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders images with responsive grid layout', async () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Image 1')).toBeInTheDocument();
      expect(screen.getByText('Test Image 2')).toBeInTheDocument();
    });

    // Check for responsive grid classes
    const gridContainer = screen.getByText('Test Image 1').closest('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5');
  });

  it('renders empty state with search context', async () => {
    server.use(
      http.get(`${API_URL}/`, () => HttpResponse.json({ data: [] }))
    );
    
    render(
      <Provider store={makeStore()}>
        <InspirationGallery search="test search" />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/no images found/i)).toBeInTheDocument();
      expect(screen.getByText(/no results for "test search"/i)).toBeInTheDocument();
    });
  });

  it('renders error state with refresh button', async () => {
    server.use(
      http.get(`${API_URL}/`, () => HttpResponse.status(500))
    );
    
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load images/i)).toBeInTheDocument();
      expect(screen.getByText(/please try refreshing the page/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });
  });

  it('shows loading more indicator when hasMore is true', async () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery hasMore={true} isLoading={true} />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Image 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/loading more images/i)).toBeInTheDocument();
  });

  it('shows end of content indicator when hasMore is false', async () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery hasMore={false} />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Image 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/you've reached the end/i)).toBeInTheDocument();
  });

  it('calls loadMore when intersection observer triggers', async () => {
    const mockLoadMore = vi.fn();
    
    render(
      <Provider store={makeStore()}>
        <InspirationGallery hasMore={true} loadMore={mockLoadMore} />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Image 1')).toBeInTheDocument();
    });

    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('renders image cards with tags and action handlers', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Image 1')).toBeInTheDocument();
    });

    // Check for tags
    expect(screen.getByText('lego')).toBeInTheDocument();
    expect(screen.getByText('star-wars')).toBeInTheDocument();
    expect(screen.getByText('architecture')).toBeInTheDocument();

    // Test action handlers
    const imageCard = screen.getByText('Test Image 1').closest('div');
    fireEvent.click(imageCard!);
    
    expect(consoleSpy).toHaveBeenCalledWith('View image:', '1');
    
    consoleSpy.mockRestore();
  });

  it('handles responsive breakpoints correctly', async () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Image 1')).toBeInTheDocument();
    });

    const container = screen.getByText('Test Image 1').closest('.w-full');
    expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'py-8');
  });

  it('displays skeleton loading state initially', () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    
    // Check for skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
}); 