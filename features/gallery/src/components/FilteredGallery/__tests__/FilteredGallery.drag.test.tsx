// NOTE: For TypeScript + NodeNext + Vitest, use explicit .ts extensions if Vite/Vitest does not resolve extensionless imports.
// The test runner must run on TypeScript source, not compiled JS, for this to work.
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FilteredGallery from '../index';
import { galleryApi } from '../../../store/galleryApi';
import { albumsApi } from '../../../store/albumsApi';

const mockImages = [
  {
    id: 'img1',
    url: 'https://example.com/1.jpg',
    title: 'Image 1',
    description: 'Desc 1',
    author: 'A',
    uploadDate: '2024-01-01',
    tags: ['tag1'],
  },
  {
    id: 'img2',
    url: 'https://example.com/2.jpg',
    title: 'Image 2',
    description: 'Desc 2',
    author: 'B',
    uploadDate: '2024-01-02',
    tags: ['tag2'],
  },
];

vi.mock('../../store/galleryApi.ts', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...(mod as any),
    useSearchImagesQuery: () => ({ data: { data: mockImages, total: 2 }, isLoading: false, error: null, isFetching: false }),
    useGetAvailableTagsQuery: () => ({ data: [] }),
    useGetAvailableCategoriesQuery: () => ({ data: [] }),
  };
});

vi.mock('../../store/albumsApi.ts', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...(mod as any),
    useCreateAlbumMutation: () => [vi.fn().mockResolvedValue({ album: { id: 'album1' } })],
    useAddImageToAlbumMutation: () => [vi.fn().mockResolvedValue({})],
  };
});

function createTestStore() {
  return configureStore({
    reducer: {
      [galleryApi.reducerPath]: galleryApi.reducer,
      [albumsApi.reducerPath]: albumsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(galleryApi.middleware, albumsApi.middleware),
  });
}

describe('FilteredGallery drag-and-drop album creation', () => {
  it('opens CreateAlbumDialog with both images when one is dragged onto another', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <FilteredGallery />
      </Provider>
    );
    // Find both cards by title
    const card1 = screen.getByLabelText('Image 1');
    const card2 = screen.getByLabelText('Image 2');

    // Simulate drag start on card1
    fireEvent.dragStart(card1, { dataTransfer: { setData: vi.fn() } });
    // Simulate drag over and drop on card2
    fireEvent.dragOver(card2);
    fireEvent.drop(card2, { dataTransfer: { getData: () => 'img1' } });

    // Wait for CreateAlbumDialog to appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Album title input
      // Both images should be referenced in the dialog (by title or url)
      expect(screen.getByText('Image 1')).toBeInTheDocument();
      expect(screen.getByText('Image 2')).toBeInTheDocument();
    });
  });
}); 