import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { albumsApi } from '../../../store/albumsApi.js';
import CreateAlbumDialog from '../index.js';
import type { CreateAlbumDialogProps } from '../../../schemas/index.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock the custom hook
vi.mock('../../../hooks/useAlbumDragAndDrop');

// Mock the albums API
vi.mock('../../../store/albumsApi', () => ({
  albumsApi: {
    reducerPath: 'albumsApi',
    reducer: (state = {}, action: any) => state,
    middleware: () => () => () => {},
  },
  useCreateAlbumMutation: vi.fn(),
  useAddImageToAlbumMutation: vi.fn(),
}));

const mockStore = configureStore({
  reducer: {
    [albumsApi.reducerPath]: albumsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(albumsApi.middleware),
});

const mockImages = [
  {
    id: '1',
    url: 'https://example.com/image1.jpg',
    title: 'Test Image 1',
    description: 'Test description 1',
    author: 'Test Author',
    tags: ['test', 'image'],
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    url: 'https://example.com/image2.jpg',
    title: 'Test Image 2',
    description: 'Test description 2',
    author: 'Test Author',
    tags: ['test', 'image'],
    createdAt: '2023-01-02T00:00:00Z',
  },
];

const defaultProps: CreateAlbumDialogProps = {
  isOpen: true,
  onClose: vi.fn(),
  selectedImages: mockImages,
  onAlbumCreated: vi.fn(),
};

const renderWithProvider = (props: Partial<CreateAlbumDialogProps> = {}) => {
  return render(
    <Provider store={mockStore}>
      <CreateAlbumDialog {...defaultProps} {...props} />
    </Provider>,
  );
};

describe('CreateAlbumDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Set up default mock implementations
    const { useAlbumDragAndDrop } = vi.mocked(await import('../../../hooks/useAlbumDragAndDrop'));
    useAlbumDragAndDrop.mockReturnValue({
      state: {
        isDragOver: false,
        isDragging: false,
        draggedImages: [],
      },
      actions: {
        handleDragStart: vi.fn(),
        handleDragOver: vi.fn(),
        handleDragEnter: vi.fn(),
        handleDragLeave: vi.fn(),
        handleDrop: vi.fn(),
        dragAreaProps: {
          onDragOver: vi.fn(),
          onDragEnter: vi.fn(),
          onDragLeave: vi.fn(),
          onDrop: vi.fn(),
        },
      },
    });
    
    const { useCreateAlbumMutation, useAddImageToAlbumMutation } = vi.mocked(await import('../../../store/albumsApi'));
    const mockCreateAlbum = vi.fn().mockResolvedValue({ album: { id: 'album-123' } });
    const mockAddImageToAlbum = vi.fn().mockResolvedValue({});
    
    useCreateAlbumMutation.mockReturnValue([mockCreateAlbum, { isLoading: false, error: null, reset: vi.fn() }]);
    useAddImageToAlbumMutation.mockReturnValue([mockAddImageToAlbum, { isLoading: false, error: null, reset: vi.fn() }]);
  });

  it('renders when open', () => {
    renderWithProvider();
    
    expect(screen.getByText('Create New Album')).toBeInTheDocument();
    expect(screen.getByLabelText('Album Title *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Selected Images (2)')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProvider({ isOpen: false });
    
    expect(screen.queryByText('Create New Album')).not.toBeInTheDocument();
  });

  it('displays selected images', () => {
    renderWithProvider();
    
    expect(screen.getByText('Selected Images (2)')).toBeInTheDocument();
    expect(screen.getByAltText('Test Image 1')).toBeInTheDocument();
    expect(screen.getByAltText('Test Image 2')).toBeInTheDocument();
  });

  it('shows empty state when no images selected', () => {
    renderWithProvider({ selectedImages: [] });
    
    expect(screen.getByText('Selected Images (0)')).toBeInTheDocument();
    expect(screen.getByText('No images selected')).toBeInTheDocument();
    expect(screen.getByText('Drag images from the gallery to add them here')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithProvider({ selectedImages: [] });
    
    const createButton = screen.getByText('Create Album');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Album title is required')).toBeInTheDocument();
      expect(screen.getByText('At least one image is required')).toBeInTheDocument();
    });
  });

  it('validates title length', async () => {
    const longTitle = 'a'.repeat(101);
    renderWithProvider();
    
    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: longTitle } });
    
    const createButton = screen.getByText('Create Album');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Title too long')).toBeInTheDocument();
    });
  });

  it('validates description length', async () => {
    const longDescription = 'a'.repeat(501);
    renderWithProvider();
    
    const descriptionInput = screen.getByLabelText('Description (Optional)');
    fireEvent.change(descriptionInput, { target: { value: longDescription } });
    
    const createButton = screen.getByText('Create Album');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Description too long')).toBeInTheDocument();
    });
  });

  it('clears validation errors when user types', async () => {
    renderWithProvider({ selectedImages: [] });
    
    const createButton = screen.getByText('Create Album');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Album title is required')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Album title is required')).not.toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderWithProvider({ onClose });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close icon is clicked', () => {
    const onClose = vi.fn();
    renderWithProvider({ onClose });
    
    // Find the close button by its SVG content
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside the dialog', () => {
    const onClose = vi.fn();
    renderWithProvider({ onClose });
    
    // Find the backdrop by its class
    const backdrop = screen.getByRole('generic');
    fireEvent.click(backdrop);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents closing when creating album', async () => {
    const onClose = vi.fn();
    renderWithProvider({ onClose });
    
    // Fill form and submit
    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'Test Album' } });
    
    const createButton = screen.getByText('Create Album');
    fireEvent.click(createButton);
    
    // Try to close while creating
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Should not call onClose while creating
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables form inputs when creating', async () => {
    renderWithProvider();
    
    const titleInput = screen.getByLabelText('Album Title *');
    const descriptionInput = screen.getByLabelText('Description (Optional)');
    const createButton = screen.getByText('Create Album');
    
    // Fill form and submit
    fireEvent.change(titleInput, { target: { value: 'Test Album' } });
    fireEvent.click(createButton);
    
    // Wait for the creating state
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
    
    // Inputs should be disabled
    expect(titleInput).toBeDisabled();
    expect(descriptionInput).toBeDisabled();
  });

  it('shows drag drop visual feedback', async () => {
    // Mock the hook to return drag over state
    const { useAlbumDragAndDrop } = vi.mocked(await import('../../../hooks/useAlbumDragAndDrop'));
    useAlbumDragAndDrop.mockReturnValue({
      state: {
        isDragOver: true,
        isDragging: false,
        draggedImages: [],
      },
      actions: {
        handleDragStart: vi.fn(),
        handleDragOver: vi.fn(),
        handleDragEnter: vi.fn(),
        handleDragLeave: vi.fn(),
        handleDrop: vi.fn(),
        dragAreaProps: {
          onDragOver: vi.fn(),
          onDragEnter: vi.fn(),
          onDragLeave: vi.fn(),
          onDrop: vi.fn(),
        },
      },
    });
    
    renderWithProvider();
    
    expect(screen.getByText('Drop images here to add to album')).toBeInTheDocument();
  });

  it('handles drag and drop events', async () => {
    const mockHandleDrop = vi.fn();
    const { useAlbumDragAndDrop } = vi.mocked(await import('../../../hooks/useAlbumDragAndDrop'));
    useAlbumDragAndDrop.mockReturnValue({
      state: {
        isDragOver: false,
        isDragging: false,
        draggedImages: [],
      },
      actions: {
        handleDragStart: vi.fn(),
        handleDragOver: vi.fn(),
        handleDragEnter: vi.fn(),
        handleDragLeave: vi.fn(),
        handleDrop: mockHandleDrop,
        dragAreaProps: {
          onDragOver: vi.fn(),
          onDragEnter: vi.fn(),
          onDragLeave: vi.fn(),
          onDrop: vi.fn(),
        },
      },
    });
    
    renderWithProvider();
    
    const dialog = screen.getByRole('generic');
    const dropEvent = new Event('drop', { bubbles: true });
    fireEvent(dialog, dropEvent);
    
    expect(mockHandleDrop).toHaveBeenCalled();
  });

  it('resets form when dialog opens', () => {
    const { rerender } = renderWithProvider({ isOpen: false });
    
    // Open dialog
    rerender(
      <Provider store={mockStore}>
        <CreateAlbumDialog {...defaultProps} isOpen={true} />
      </Provider>,
    );
    
    const titleInput = screen.getByLabelText('Album Title *');
    const descriptionInput = screen.getByLabelText('Description (Optional)');
    
    expect(titleInput).toHaveValue('');
    expect(descriptionInput).toHaveValue('');
  });

  it('displays error message when album creation fails', async () => {
    // Mock the mutation to throw an error
    const { useCreateAlbumMutation } = vi.mocked(await import('../../../store/albumsApi'));
    const mockCreateAlbum = vi.fn().mockRejectedValue(new Error('Network error'));
    useCreateAlbumMutation.mockReturnValue([mockCreateAlbum, { isLoading: false, error: null, reset: vi.fn() }]);
    
    renderWithProvider();
    
    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'Test Album' } });
    
    const createButton = screen.getByText('Create Album');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to create album. Please try again.')).toBeInTheDocument();
    });
  });

  it('calls onAlbumCreated when album is successfully created', async () => {
    const onAlbumCreated = vi.fn();
    const mockAlbumId = 'album-123';
    
    // Mock successful album creation
    const { useCreateAlbumMutation, useAddImageToAlbumMutation } = vi.mocked(await import('../../../store/albumsApi'));
    const mockCreateAlbum = vi.fn().mockResolvedValue({
      album: { id: mockAlbumId },
    });
    const mockAddImageToAlbum = vi.fn().mockResolvedValue({});
    
    useCreateAlbumMutation.mockReturnValue([mockCreateAlbum, { isLoading: false, error: null, reset: vi.fn() }]);
    useAddImageToAlbumMutation.mockReturnValue([mockAddImageToAlbum, { isLoading: false, error: null, reset: vi.fn() }]);
    
    renderWithProvider({ onAlbumCreated });
    
    const titleInput = screen.getByLabelText('Album Title *');
    fireEvent.change(titleInput, { target: { value: 'Test Album' } });
    
    const createButton = screen.getByText('Create Album');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(onAlbumCreated).toHaveBeenCalledWith(mockAlbumId);
    });
  });
}); 