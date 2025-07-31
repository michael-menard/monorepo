import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import { MocDetailPage } from '../index';
import { instructionsApi } from '@repo/moc-instructions';

// Mock the moc-instructions package
vi.mock('@repo/moc-instructions', async () => {
  const actual = await vi.importActual('@repo/moc-instructions');
  return {
    ...actual,
    useGetInstructionQuery: vi.fn(),
    useUpdateInstructionMutation: vi.fn(),
    useDeleteInstructionMutation: vi.fn(),
    useUploadInstructionsImageMutation: vi.fn(),
    formatTime: vi.fn((minutes) => `${minutes} min`),
    getDifficultyLabel: vi.fn((difficulty) => difficulty),
    calculateTotalParts: vi.fn(() => 150),
    calculateTotalTime: vi.fn(() => 120),
    validateFileSize: vi.fn(() => true),
    validateImageType: vi.fn(() => true),
    compressImage: vi.fn((file) => Promise.resolve(file)),
  };
});

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-id' }),
  };
});

// Mock window.navigator.share
Object.defineProperty(window, 'navigator', {
  value: {
    share: vi.fn(),
    clipboard: {
      writeText: vi.fn(),
    },
  },
  writable: true,
});

// Mock file input
const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

const createMockStore = () => {
  return configureStore({
    reducer: {
      [instructionsApi.reducerPath]: instructionsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(instructionsApi.middleware),
  });
};

const mockInstruction = {
  id: 'test-id',
  title: 'Test MOC',
  description: 'A test MOC description',
  author: 'Test Author',
  category: 'vehicles',
  difficulty: 'intermediate' as const,
  tags: ['test', 'lego'],
  coverImageUrl: 'https://example.com/image.jpg',
  steps: [
    {
      id: 'step-1',
      instructionsId: 'test-id',
      stepNumber: 1,
      title: 'Step 1',
      description: 'First step description',
      difficulty: 'easy' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedTime: 30,
    },
  ],
  partsList: [
    {
      partNumber: '3001',
      quantity: 10,
      color: 'red',
      description: '2x4 brick',
    },
  ],
  isPublic: true,
  isPublished: true,
  rating: 4.5,
  downloadCount: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('MocDetailPage', () => {
  const mockUseGetInstructionQuery = vi.mocked(instructionsApi.useGetInstructionQuery);
  const mockUseUpdateInstructionMutation = vi.mocked(instructionsApi.useUpdateInstructionMutation);
  const mockUseDeleteInstructionMutation = vi.mocked(instructionsApi.useDeleteInstructionMutation);
  const mockUseUploadInstructionsImageMutation = vi.mocked(instructionsApi.useUploadInstructionsImageMutation);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseGetInstructionQuery.mockReturnValue({
      data: mockInstruction,
      isLoading: false,
      error: null,
    } as any);

    mockUseUpdateInstructionMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ data: mockInstruction }),
      { isLoading: false },
    ] as any);

    mockUseDeleteInstructionMutation.mockReturnValue([
      vi.fn().mockResolvedValue({}),
      { isLoading: false },
    ] as any);

    mockUseUploadInstructionsImageMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ data: { imageUrl: 'https://example.com/new-image.jpg' } }),
      { isLoading: false },
    ] as any);
  });

  describe('Rendering', () => {
    it('renders loading state correctly', () => {
      mockUseGetInstructionQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(<MocDetailPage />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders error state correctly', () => {
      mockUseGetInstructionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Failed to load' },
      } as any);

      renderWithProviders(<MocDetailPage />);
      
      expect(screen.getByText('Error Loading MOC')).toBeInTheDocument();
      expect(screen.getByText('Failed to load the MOC details. Please try again.')).toBeInTheDocument();
    });

    it('renders MOC details correctly', () => {
      renderWithProviders(<MocDetailPage />);
      
      expect(screen.getByText('Test MOC')).toBeInTheDocument();
      expect(screen.getByText('A test MOC description')).toBeInTheDocument();
      expect(screen.getByText('Test Author')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('lego')).toBeInTheDocument();
    });

    it('displays correct statistics', () => {
      renderWithProviders(<MocDetailPage />);
      
      expect(screen.getByText('150 pieces')).toBeInTheDocument();
      expect(screen.getByText('120 min')).toBeInTheDocument();
      expect(screen.getByText('4.5/5')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('handles back navigation', () => {
      renderWithProviders(<MocDetailPage />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/moc-instructions');
    });
  });

  describe('Edit functionality', () => {
    it('opens edit dialog when edit button is clicked', () => {
      renderWithProviders(<MocDetailPage />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      expect(screen.getByText('Edit MOC')).toBeInTheDocument();
    });

    it('saves changes when form is submitted', async () => {
      const mockUpdateInstruction = vi.fn().mockResolvedValue({ data: mockInstruction });
      mockUseUpdateInstructionMutation.mockReturnValue([
        mockUpdateInstruction,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      
      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateInstruction).toHaveBeenCalledWith({
          id: 'test-id',
          data: expect.objectContaining({
            title: 'Updated Title',
          }),
        });
      });
    });
  });

  describe('Delete functionality', () => {
    it('opens delete confirmation dialog', () => {
      renderWithProviders(<MocDetailPage />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Delete MOC')).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it('deletes MOC when confirmed', async () => {
      const mockDeleteInstruction = vi.fn().mockResolvedValue({});
      mockUseDeleteInstructionMutation.mockReturnValue([
        mockDeleteInstruction,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockDeleteInstruction).toHaveBeenCalledWith('test-id');
        expect(mockNavigate).toHaveBeenCalledWith('/moc-instructions');
      });
    });
  });

  describe('Image upload functionality', () => {
    it('opens image upload dialog', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to gallery tab
      const galleryTab = screen.getByRole('tab', { name: /gallery/i });
      fireEvent.click(galleryTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload images/i });
      fireEvent.click(uploadButton);
      
      expect(screen.getByText('Upload Images')).toBeInTheDocument();
    });

    it('handles file upload', async () => {
      const mockUploadImage = vi.fn().mockResolvedValue({ 
        data: { imageUrl: 'https://example.com/new-image.jpg' } 
      });
      mockUseUploadInstructionsImageMutation.mockReturnValue([
        mockUploadImage,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Open upload dialog
      const galleryTab = screen.getByRole('tab', { name: /gallery/i });
      fireEvent.click(galleryTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload images/i });
      fireEvent.click(uploadButton);
      
      // Simulate file selection
      const fileInput = screen.getByLabelText(/select images/i);
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalled();
      });
    });
  });

  describe('Tags management', () => {
    it('opens tags management dialog', () => {
      renderWithProviders(<MocDetailPage />);
      
      const tagsButton = screen.getByRole('button', { name: /tag/i });
      fireEvent.click(tagsButton);
      
      expect(screen.getByText('Manage Tags')).toBeInTheDocument();
    });

    it('adds new tags', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Open tags dialog
      const tagsButton = screen.getByRole('button', { name: /tag/i });
      fireEvent.click(tagsButton);
      
      const tagInput = screen.getByPlaceholderText(/enter new tag/i);
      fireEvent.change(tagInput, { target: { value: 'new-tag' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter' });
      
      expect(screen.getByText('new-tag')).toBeInTheDocument();
    });
  });

  describe('Share functionality', () => {
    it('shares MOC when navigator.share is available', async () => {
      const mockShare = vi.fn().mockResolvedValue({});
      Object.defineProperty(window.navigator, 'share', {
        value: mockShare,
        writable: true,
      });

      renderWithProviders(<MocDetailPage />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Test MOC',
          text: 'A test MOC description',
          url: window.location.href,
        });
      });
    });

    it('falls back to clipboard when navigator.share is not available', async () => {
      Object.defineProperty(window.navigator, 'share', {
        value: undefined,
        writable: true,
      });

      const mockWriteText = vi.fn().mockResolvedValue({});
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });

      renderWithProviders(<MocDetailPage />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(window.location.href);
      });
    });
  });

  describe('Tab navigation', () => {
    it('switches between tabs correctly', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Check default tab (overview)
      expect(screen.getByText('A test MOC description')).toBeInTheDocument();
      
      // Switch to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      fireEvent.click(instructionsTab);
      
      expect(screen.getByText('Build Steps')).toBeInTheDocument();
      
      // Switch to parts tab
      const partsTab = screen.getByRole('tab', { name: /parts/i });
      fireEvent.click(partsTab);
      
      expect(screen.getByText('Required Parts')).toBeInTheDocument();
      
      // Switch to gallery tab
      const galleryTab = screen.getByRole('tab', { name: /gallery/i });
      fireEvent.click(galleryTab);
      
      expect(screen.getByText('Images')).toBeInTheDocument();
    });
  });

  describe('Download functionality', () => {
    it('handles download button click', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      renderWithProviders(<MocDetailPage />);
      
      const downloadButton = screen.getByRole('button', { name: /download instructions/i });
      fireEvent.click(downloadButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Downloading instructions for:', 'test-id');
      
      consoleSpy.mockRestore();
    });
  });
}); 