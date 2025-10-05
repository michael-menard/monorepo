import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Import packages to test integration
import { GalleryGrid, GalleryItem } from '@repo/gallery';
import { MocInstructionsCard, MocInstructionsViewer } from '@repo/moc-instructions';
import { uploadFile } from '@repo/upload';

// Mock external I/O only (API calls, file system)
vi.mock('@repo/gallery/api', () => ({
  galleryAPI: {
    fetchGalleryItems: vi.fn(),
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
  }
}));

vi.mock('@repo/moc-instructions/api', () => ({
  mocAPI: {
    fetchMocInstructions: vi.fn(),
    createMocInstruction: vi.fn(),
    updateMocInstruction: vi.fn(),
  }
}));

vi.mock('@repo/upload/services', () => ({
  uploadService: {
    uploadFile: vi.fn(),
    processImage: vi.fn(),
  }
}));

describe('Gallery + MOC Instructions Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    // Create store with real reducers (no mocking internal state)
    store = configureStore({
      reducer: {
        gallery: (state = { items: [], loading: false }, action) => {
          switch (action.type) {
            case 'gallery/setItems':
              return { ...state, items: action.payload };
            case 'gallery/setLoading':
              return { ...state, loading: action.payload };
            default:
              return state;
          }
        },
        mocInstructions: (state = { instructions: [], loading: false }, action) => {
          switch (action.type) {
            case 'moc/setInstructions':
              return { ...state, instructions: action.payload };
            case 'moc/setLoading':
              return { ...state, loading: action.payload };
            default:
              return state;
          }
        }
      }
    });

    vi.clearAllMocks();
  });

  const renderWithStore = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        {component}
      </Provider>
    );
  };

  describe('Gallery to MOC Instructions Workflow', () => {
    it('should display MOC instructions in gallery grid', async () => {
      const mockGalleryItems = [
        {
          id: '1',
          title: 'Medieval Castle',
          imageUrl: 'https://example.com/castle.jpg',
          type: 'moc-instruction',
          mocId: 'moc-1',
          metadata: {
            difficulty: 'intermediate',
            pieceCount: 500,
            estimatedTime: 120
          }
        },
        {
          id: '2',
          title: 'Space Station',
          imageUrl: 'https://example.com/station.jpg',
          type: 'moc-instruction',
          mocId: 'moc-2',
          metadata: {
            difficulty: 'advanced',
            pieceCount: 1200,
            estimatedTime: 300
          }
        }
      ];

      const { galleryAPI } = await import('@repo/gallery/api');
      galleryAPI.fetchGalleryItems.mockResolvedValue(mockGalleryItems);

      // Dispatch real action to store
      store.dispatch({ type: 'gallery/setItems', payload: mockGalleryItems });

      renderWithStore(<GalleryGrid />);

      // Verify gallery displays MOC instruction items
      await waitFor(() => {
        expect(screen.getByText('Medieval Castle')).toBeInTheDocument();
        expect(screen.getByText('Space Station')).toBeInTheDocument();
      });

      // Verify MOC-specific metadata is displayed
      expect(screen.getByText(/intermediate/i)).toBeInTheDocument();
      expect(screen.getByText(/500 pieces/i)).toBeInTheDocument();
      expect(screen.getByText(/advanced/i)).toBeInTheDocument();
      expect(screen.getByText(/1200 pieces/i)).toBeInTheDocument();
    });

    it('should navigate from gallery item to MOC instructions viewer', async () => {
      const mockMocInstruction = {
        id: 'moc-1',
        title: 'Medieval Castle',
        description: 'A detailed medieval castle build',
        difficulty: 'intermediate',
        pieceCount: 500,
        estimatedTime: 120,
        steps: [
          { step: 1, description: 'Build the foundation', image: 'step1.jpg' },
          { step: 2, description: 'Add the walls', image: 'step2.jpg' }
        ]
      };

      const { mocAPI } = await import('@repo/moc-instructions/api');
      mocAPI.fetchMocInstructions.mockResolvedValue(mockMocInstruction);

      const galleryItem = {
        id: '1',
        title: 'Medieval Castle',
        imageUrl: 'https://example.com/castle.jpg',
        type: 'moc-instruction',
        mocId: 'moc-1'
      };

      // Mock navigation function
      const mockNavigate = vi.fn();
      
      renderWithStore(
        <GalleryItem 
          item={galleryItem} 
          onNavigate={mockNavigate}
        />
      );

      // Click on gallery item
      fireEvent.click(screen.getByText('Medieval Castle'));

      // Verify navigation to MOC instructions
      expect(mockNavigate).toHaveBeenCalledWith('/moc-instructions/moc-1');

      // Simulate navigation by rendering MOC viewer
      store.dispatch({ type: 'moc/setInstructions', payload: mockMocInstruction });

      renderWithStore(<MocInstructionsViewer mocId="moc-1" />);

      // Verify MOC instructions are displayed
      await waitFor(() => {
        expect(screen.getByText('Medieval Castle')).toBeInTheDocument();
        expect(screen.getByText('A detailed medieval castle build')).toBeInTheDocument();
        expect(screen.getByText('Build the foundation')).toBeInTheDocument();
        expect(screen.getByText('Add the walls')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload Integration', () => {
    it('should upload images through gallery to MOC service', async () => {
      const mockFile = new File(['mock image data'], 'castle.jpg', { type: 'image/jpeg' });
      const mockUploadResponse = {
        url: 'https://example.com/uploaded-castle.jpg',
        thumbnailUrl: 'https://example.com/thumb-castle.jpg',
        metadata: { width: 800, height: 600, size: 1024000 }
      };

      const { uploadService } = await import('@repo/upload/services');
      const { galleryAPI } = await import('@repo/gallery/api');
      const { mocAPI } = await import('@repo/moc-instructions/api');

      uploadService.uploadFile.mockResolvedValue(mockUploadResponse);
      galleryAPI.uploadImage.mockResolvedValue({ id: 'gallery-1', ...mockUploadResponse });
      mocAPI.createMocInstruction.mockResolvedValue({
        id: 'moc-1',
        title: 'New MOC',
        images: [mockUploadResponse.url]
      });

      const FileUploadComponent = () => {
        const handleFileUpload = async (file: File) => {
          // Real integration workflow
          const uploadResult = await uploadService.uploadFile(file);
          const galleryItem = await galleryAPI.uploadImage(uploadResult);
          const mocInstruction = await mocAPI.createMocInstruction({
            title: 'New MOC',
            images: [uploadResult.url]
          });
          
          // Update both stores
          store.dispatch({ 
            type: 'gallery/setItems', 
            payload: [galleryItem] 
          });
          store.dispatch({ 
            type: 'moc/setInstructions', 
            payload: [mocInstruction] 
          });
        };

        return (
          <div>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              data-testid="file-input"
            />
          </div>
        );
      };

      renderWithStore(<FileUploadComponent />);

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Verify upload workflow
      await waitFor(() => {
        expect(uploadService.uploadFile).toHaveBeenCalledWith(mockFile);
        expect(galleryAPI.uploadImage).toHaveBeenCalledWith(mockUploadResponse);
        expect(mocAPI.createMocInstruction).toHaveBeenCalledWith({
          title: 'New MOC',
          images: [mockUploadResponse.url]
        });
      });

      // Verify state updates
      const galleryState = store.getState().gallery;
      const mocState = store.getState().mocInstructions;
      
      expect(galleryState.items).toHaveLength(1);
      expect(galleryState.items[0].url).toBe(mockUploadResponse.url);
      expect(mocState.instructions).toHaveLength(1);
      expect(mocState.instructions[0].images).toContain(mockUploadResponse.url);
    });

    it('should handle image processing pipeline', async () => {
      const mockFile = new File(['mock image data'], 'large-image.jpg', { type: 'image/jpeg' });
      const mockProcessedImages = {
        original: 'https://example.com/original.jpg',
        large: 'https://example.com/large.jpg',
        medium: 'https://example.com/medium.jpg',
        thumbnail: 'https://example.com/thumb.jpg'
      };

      const { uploadService } = await import('@repo/upload/services');
      uploadService.processImage.mockResolvedValue(mockProcessedImages);

      const ImageProcessingComponent = () => {
        const [processedImages, setProcessedImages] = React.useState(null);

        const handleImageUpload = async (file: File) => {
          const processed = await uploadService.processImage(file);
          setProcessedImages(processed);
        };

        return (
          <div>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              data-testid="image-input"
            />
            {processedImages && (
              <div data-testid="processed-images">
                <img src={processedImages.thumbnail} alt="Thumbnail" />
                <img src={processedImages.medium} alt="Medium" />
                <img src={processedImages.large} alt="Large" />
              </div>
            )}
          </div>
        );
      };

      renderWithStore(<ImageProcessingComponent />);

      const imageInput = screen.getByTestId('image-input');
      fireEvent.change(imageInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(uploadService.processImage).toHaveBeenCalledWith(mockFile);
      });

      await waitFor(() => {
        const processedImagesDiv = screen.getByTestId('processed-images');
        expect(processedImagesDiv).toBeInTheDocument();
        
        const images = processedImagesDiv.querySelectorAll('img');
        expect(images).toHaveLength(3);
        expect(images[0]).toHaveAttribute('src', mockProcessedImages.thumbnail);
        expect(images[1]).toHaveAttribute('src', mockProcessedImages.medium);
        expect(images[2]).toHaveAttribute('src', mockProcessedImages.large);
      });
    });
  });

  describe('Cross-Package Data Flow', () => {
    it('should sync gallery and MOC instruction states', async () => {
      const mockMocInstruction = {
        id: 'moc-1',
        title: 'Updated Castle',
        description: 'An updated castle build',
        images: ['https://example.com/new-castle.jpg']
      };

      const { mocAPI } = await import('@repo/moc-instructions/api');
      mocAPI.updateMocInstruction.mockResolvedValue(mockMocInstruction);

      // Initial gallery state
      store.dispatch({
        type: 'gallery/setItems',
        payload: [{
          id: 'gallery-1',
          title: 'Old Castle',
          imageUrl: 'https://example.com/old-castle.jpg',
          mocId: 'moc-1'
        }]
      });

      // Update MOC instruction
      const updatedMoc = await mocAPI.updateMocInstruction('moc-1', {
        title: 'Updated Castle',
        images: ['https://example.com/new-castle.jpg']
      });

      // Simulate real integration - update both stores
      store.dispatch({
        type: 'moc/setInstructions',
        payload: [updatedMoc]
      });

      store.dispatch({
        type: 'gallery/setItems',
        payload: [{
          id: 'gallery-1',
          title: updatedMoc.title,
          imageUrl: updatedMoc.images[0],
          mocId: 'moc-1'
        }]
      });

      // Verify both states are synchronized
      const galleryState = store.getState().gallery;
      const mocState = store.getState().mocInstructions;

      expect(galleryState.items[0].title).toBe('Updated Castle');
      expect(galleryState.items[0].imageUrl).toBe('https://example.com/new-castle.jpg');
      expect(mocState.instructions[0].title).toBe('Updated Castle');
      expect(mocState.instructions[0].images[0]).toBe('https://example.com/new-castle.jpg');
    });
  });
});
