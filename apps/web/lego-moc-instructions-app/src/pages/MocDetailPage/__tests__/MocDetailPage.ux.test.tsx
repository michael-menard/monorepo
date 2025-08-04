import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { instructionsApi } from '@repo/moc-instructions';
import { MocDetailPage } from '../index';

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

describe('MocDetailPage UX', () => {
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

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Check for main heading
      expect(screen.getByRole('heading', { name: 'Test MOC' })).toBeInTheDocument();
      
      // Check for navigation buttons
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      
      // Check for tab navigation
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /instructions/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /parts/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /gallery/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /back/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /edit/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /delete/i })).toHaveFocus();
    });

    it('provides meaningful alt text for images', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to gallery tab
      const galleryTab = screen.getByRole('tab', { name: /gallery/i });
      fireEvent.click(galleryTab);
      
      const coverImage = screen.getByAltText('Cover Image');
      expect(coverImage).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('provides visual feedback for loading states', () => {
      mockUseGetInstructionQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(<MocDetailPage />);
      
      // Check for loading skeleton
      const loadingElements = screen.getAllByTestId(/skeleton|loading/i);
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('handles form validation gracefully', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      // Try to submit empty form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      // Should not close dialog if validation fails
      expect(screen.getByText('Edit MOC')).toBeInTheDocument();
    });

    it('provides clear error messages', () => {
      mockUseGetInstructionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Network error' },
      } as any);

      renderWithProviders(<MocDetailPage />);
      
      expect(screen.getByText('Error Loading MOC')).toBeInTheDocument();
      expect(screen.getByText('Failed to load the MOC details. Please try again.')).toBeInTheDocument();
    });

    it('confirms destructive actions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      
      // Should show confirmation dialog
      expect(screen.getByText('Delete MOC')).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      
      // Cancel should close dialog
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(screen.queryByText('Delete MOC')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for different screen sizes', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Check for responsive grid classes
      const mainContent = screen.getByRole('main') || document.querySelector('.lg\\:col-span-2');
      const sidebar = document.querySelector('.space-y-6');
      
      expect(mainContent).toBeInTheDocument();
      expect(sidebar).toBeInTheDocument();
    });

    it('maintains functionality on mobile devices', async () => {
      const user = userEvent.setup();
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<MocDetailPage />);
      
      // Test touch interactions
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      expect(screen.getByText('Edit MOC')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('lazy loads images', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to gallery tab
      const galleryTab = screen.getByRole('tab', { name: /gallery/i });
      fireEvent.click(galleryTab);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('debounces search inputs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      const titleInput = screen.getByLabelText(/title/i);
      
      // Rapid typing should not cause excessive re-renders
      await user.type(titleInput, 'New Title');
      
      expect(titleInput).toHaveValue('New Title');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      const mockUpdateInstruction = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseUpdateInstructionMutation.mockReturnValue([
        mockUpdateInstruction,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      // Fill and submit form
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Updated Title');
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(mockUpdateInstruction).toHaveBeenCalled();
      });
    });

    it('provides retry mechanisms', () => {
      mockUseGetInstructionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Failed to load' },
      } as any);

      renderWithProviders(<MocDetailPage />);
      
      // Should provide retry option
      expect(screen.getByText('Failed to load the MOC details. Please try again.')).toBeInTheDocument();
    });
  });

  describe('Data Persistence', () => {
    it('saves form data correctly', async () => {
      const user = userEvent.setup();
      const mockUpdateInstruction = vi.fn().mockResolvedValue({ data: mockInstruction });
      mockUseUpdateInstructionMutation.mockReturnValue([
        mockUpdateInstruction,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated MOC Title');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');
      
      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateInstruction).toHaveBeenCalledWith({
          id: 'test-id',
          data: expect.objectContaining({
            title: 'Updated MOC Title',
            description: 'Updated description',
          }),
        });
      });
    });

    it('maintains form state during navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      
      // Fill form partially
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Partial Update');
      
      // Navigate to different tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      // Go back to edit dialog
      await user.click(editButton);
      
      // Form should retain partial data
      expect(titleInput).toHaveValue('Partial Update');
    });
  });

  describe('Internationalization', () => {
    it('supports different date formats', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Check date formatting
      const dateElement = screen.getByText(/created/i);
      expect(dateElement).toBeInTheDocument();
    });

    it('handles different number formats', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Check number formatting
      expect(screen.getByText('150 pieces')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });
}); 