import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BatchOperationsToolbar from '../index.js';
import { galleryApi } from '../../../store/galleryApi.js';
import { albumsApi } from '../../../store/albumsApi.js';

// Mock the CreateAlbumDialog component
vi.mock('../../CreateAlbumDialog/index.js', () => ({
  default: ({ isOpen, onClose, onAlbumCreated }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="create-album-dialog">
        <button onClick={() => onAlbumCreated({ title: 'Test Album', description: 'Test Description' })}>
          Create Album
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
  FolderPlus: () => <span data-testid="folder-plus-icon">📁</span>,
  Download: () => <span data-testid="download-icon">⬇️</span>,
  Share2: () => <span data-testid="share-icon">📤</span>,
  X: () => <span data-testid="x-icon">✕</span>,
  Check: () => <span data-testid="check-icon">✓</span>,
}));

// Mock @repo/ui Button
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [galleryApi.reducerPath]: galleryApi.reducer,
      [albumsApi.reducerPath]: albumsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(galleryApi.middleware, albumsApi.middleware),
  });
};

// Mock RTK Query hooks
const mockDeleteImage = vi.fn();
const mockAddImageToAlbum = vi.fn();
const mockCreateAlbum = vi.fn();

vi.mock('../../../store/galleryApi.js', async () => {
  const actual = await vi.importActual('../../../store/galleryApi.js');
  return {
    ...actual,
    useDeleteImageMutation: () => [mockDeleteImage],
  };
});

vi.mock('../../../store/albumsApi.js', async () => {
  const actual = await vi.importActual('../../../store/albumsApi.js');
  return {
    ...actual,
    useAddImageToAlbumMutation: () => [mockAddImageToAlbum],
    useCreateAlbumMutation: () => [mockCreateAlbum],
  };
});

// Mock navigator APIs
Object.defineProperty(window, 'navigator', {
  value: {
    share: vi.fn(),
    clipboard: {
      writeText: vi.fn(),
    },
  },
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
});

describe('BatchOperationsToolbar', () => {
  let store: ReturnType<typeof createMockStore>;
  const mockOnClearSelection = vi.fn();
  const mockOnImagesDeleted = vi.fn();
  const mockOnImagesAddedToAlbum = vi.fn();
  const mockOnImagesDownloaded = vi.fn();
  const mockOnImagesShared = vi.fn();

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockDeleteImage.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ message: 'Deleted successfully' }),
    });
    mockAddImageToAlbum.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ album: { id: 'album-1' } }),
    });
    mockCreateAlbum.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ album: { id: 'album-1' } }),
    });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      selectedImages: ['image-1', 'image-2'],
      totalImages: 10,
      onClearSelection: mockOnClearSelection,
      onImagesDeleted: mockOnImagesDeleted,
      onImagesAddedToAlbum: mockOnImagesAddedToAlbum,
      onImagesDownloaded: mockOnImagesDownloaded,
      onImagesShared: mockOnImagesShared,
      ...props,
    };

    return render(
      <Provider store={store}>
        <BatchOperationsToolbar {...defaultProps} />
      </Provider>
    );
  };

  describe('Visibility and Selection Display', () => {
    it('should not render when no images are selected', () => {
      renderComponent({ selectedImages: [] });
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });

    it('should render when images are selected', () => {
      renderComponent();
      expect(screen.getByText('2 of 10 selected')).toBeInTheDocument();
    });

    it('should display correct selection count', () => {
      renderComponent({ selectedImages: ['image-1'], totalImages: 5 });
      expect(screen.getByText('1 of 5 selected')).toBeInTheDocument();
    });
  });

  describe('Clear Selection', () => {
    it('should call onClearSelection when clear button is clicked', () => {
      renderComponent();
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);
      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch Delete Operations', () => {
    it('should show delete confirmation on first delete click', () => {
      renderComponent();
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Delete 2 Images')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });

    it('should call delete API and callbacks when confirmed', async () => {
      renderComponent();
      
      // Click delete to show confirmation
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      // Click confirm delete
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockDeleteImage).toHaveBeenCalledTimes(2);
        expect(mockDeleteImage).toHaveBeenCalledWith('image-1');
        expect(mockDeleteImage).toHaveBeenCalledWith('image-2');
        expect(mockOnImagesDeleted).toHaveBeenCalledWith(['image-1', 'image-2']);
        expect(mockOnClearSelection).toHaveBeenCalled();
      });
    });

    it('should cancel delete when cancel button is clicked', () => {
      renderComponent();
      
      // Click delete to show confirmation
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Delete 2 Images')).not.toBeInTheDocument();
    });
  });

  describe('Batch Add to Album Operations', () => {
    it('should open create album dialog when add to album is clicked', () => {
      renderComponent();
      const addToAlbumButton = screen.getByText('Add to Album');
      fireEvent.click(addToAlbumButton);
      
      expect(screen.getByTestId('create-album-dialog')).toBeInTheDocument();
    });

    it('should call add to album API and callbacks when album is created', async () => {
      renderComponent();
      
      // Open create album dialog
      const addToAlbumButton = screen.getByText('Add to Album');
      fireEvent.click(addToAlbumButton);
      
      // Create album
      const createButton = screen.getByText('Create Album');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockCreateAlbum).toHaveBeenCalledWith({
          title: 'Test Album',
          description: 'Test Description',
        });
        expect(mockAddImageToAlbum).toHaveBeenCalledTimes(2);
        expect(mockOnImagesAddedToAlbum).toHaveBeenCalledWith(['image-1', 'image-2'], 'album-1');
        expect(mockOnClearSelection).toHaveBeenCalled();
      });
    });
  });

  describe('Batch Download Operations', () => {
    it('should trigger download for selected images', async () => {
      // Mock document.createElement and appendChild
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      Object.defineProperty(document, 'createElement', {
        value: vi.fn().mockReturnValue(mockLink),
      });
      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
      });
      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
      });

      renderComponent();
      
      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.href).toBe('http://localhost:3000/api/gallery/image-1/download');
        expect(mockLink.download).toBe('image-image-1.jpg');
        expect(mockLink.click).toHaveBeenCalledTimes(2);
        expect(mockOnImagesDownloaded).toHaveBeenCalledWith(['image-1', 'image-2']);
      });
    });
  });

  describe('Batch Share Operations', () => {
    it('should use navigator.share when available', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(window.navigator, 'share', {
        value: mockShare,
        writable: true,
      });

      renderComponent();
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Shared Images',
          text: 'Sharing 2 images',
          url: 'http://localhost:3000/gallery/image-1',
        });
        expect(mockOnImagesShared).toHaveBeenCalledWith(['image-1', 'image-2']);
      });
    });

    it('should fallback to clipboard when navigator.share is not available', async () => {
      Object.defineProperty(window.navigator, 'share', {
        value: undefined,
        writable: true,
      });

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });

      renderComponent();
      
      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          'http://localhost:3000/gallery/image-1\nhttp://localhost:3000/gallery/image-2'
        );
        expect(mockOnImagesShared).toHaveBeenCalledWith(['image-1', 'image-2']);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle delete errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteImage.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(new Error('Delete failed')),
      });

      renderComponent();
      
      // Click delete to show confirmation
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      // Click confirm delete
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete images:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle add to album errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAddImageToAlbum.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(new Error('Add to album failed')),
      });

      renderComponent();
      
      // Open create album dialog
      const addToAlbumButton = screen.getByText('Add to Album');
      fireEvent.click(addToAlbumButton);
      
      // Create album
      const createButton = screen.getByText('Create Album');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to add images to album:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Processing State', () => {
    it('should show processing indicator during operations', async () => {
      // Make the delete operation take some time
      mockDeleteImage.mockReturnValue({
        unwrap: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      });

      renderComponent();
      
      // Click delete to show confirmation
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      // Click confirm delete
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      // Should show processing indicator
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      
      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons during processing', async () => {
      // Make the delete operation take some time
      mockDeleteImage.mockReturnValue({
        unwrap: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      });

      renderComponent();
      
      // Click delete to show confirmation
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      // Click confirm delete
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      // All buttons should be disabled during processing
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });
}); 