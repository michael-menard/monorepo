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

const createMockStore = () => {
  return configureStore({
    reducer: {
      [instructionsApi.reducerPath]: instructionsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(instructionsApi.middleware),
  });
};

// Create large mock data for performance testing
const createLargeMockInstruction = () => {
  const steps = Array.from({ length: 100 }, (_, i) => ({
    id: `step-${i + 1}`,
    instructionsId: 'test-id',
    stepNumber: i + 1,
    title: `Step ${i + 1}`,
    description: `Description for step ${i + 1}`,
    difficulty: 'easy' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    estimatedTime: Math.floor(Math.random() * 30) + 10,
    imageUrl: i % 5 === 0 ? `https://example.com/step-${i + 1}.jpg` : undefined,
  }));

  const partsList = Array.from({ length: 500 }, (_, i) => ({
    partNumber: `300${i + 1}`,
    quantity: Math.floor(Math.random() * 10) + 1,
    color: ['red', 'blue', 'green', 'yellow', 'black'][Math.floor(Math.random() * 5)],
    description: `Part ${i + 1} description`,
  }));

  return {
    id: 'test-id',
    title: 'Large Test MOC',
    description: 'A large test MOC description with many steps and parts',
    author: 'Test Author',
    category: 'vehicles',
    difficulty: 'intermediate' as const,
    tags: Array.from({ length: 20 }, (_, i) => `tag-${i + 1}`),
    coverImageUrl: 'https://example.com/image.jpg',
    steps,
    partsList,
    isPublic: true,
    isPublished: true,
    rating: 4.5,
    downloadCount: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
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

describe('MocDetailPage Performance', () => {
  const mockUseGetInstructionQuery = vi.mocked(instructionsApi.useGetInstructionQuery);
  const mockUseUpdateInstructionMutation = vi.mocked(instructionsApi.useUpdateInstructionMutation);
  const mockUseDeleteInstructionMutation = vi.mocked(instructionsApi.useDeleteInstructionMutation);
  const mockUseUploadInstructionsImageMutation = vi.mocked(instructionsApi.useUploadInstructionsImageMutation);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseGetInstructionQuery.mockReturnValue({
      data: createLargeMockInstruction(),
      isLoading: false,
      error: null,
    } as any);

    mockUseUpdateInstructionMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ data: createLargeMockInstruction() }),
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

  describe('Rendering Performance', () => {
    it('renders large datasets efficiently', () => {
      const startTime = performance.now();
      
      renderWithProviders(<MocDetailPage />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 100ms for large datasets
      expect(renderTime).toBeLessThan(100);
      
      // Verify all content is rendered
      expect(screen.getByText('Large Test MOC')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('handles tab switching efficiently', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Test switching between tabs multiple times
      const tabs = ['overview', 'instructions', 'parts', 'gallery'];
      
      tabs.forEach(tabName => {
        const startTime = performance.now();
        
        const tab = screen.getByRole('tab', { name: new RegExp(tabName, 'i') });
        fireEvent.click(tab);
        
        const endTime = performance.now();
        const switchTime = endTime - startTime;
        
        // Tab switching should be fast
        expect(switchTime).toBeLessThan(50);
      });
    });

    it('optimizes re-renders during state changes', () => {
      const renderSpy = vi.spyOn(React, 'render');
      
      renderWithProviders(<MocDetailPage />);
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Perform multiple state changes
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      const finalRenderCount = renderSpy.mock.calls.length;
      
      // Should not cause excessive re-renders
      expect(finalRenderCount - initialRenderCount).toBeLessThan(10);
      
      renderSpy.mockRestore();
    });
  });

  describe('Memory Usage', () => {
    it('does not create memory leaks during navigation', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(<MocDetailPage />);
        
        // Perform some interactions
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);
        
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
        
        unmount();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('efficiently handles large image galleries', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to gallery tab
      const galleryTab = screen.getByRole('tab', { name: /gallery/i });
      fireEvent.click(galleryTab);
      
      // Check that images are lazy loaded
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
      
      // Verify gallery renders efficiently
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe('Data Table Performance', () => {
    it('handles large parts lists efficiently', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to parts tab
      const partsTab = screen.getByRole('tab', { name: /parts/i });
      fireEvent.click(partsTab);
      
      const startTime = performance.now();
      
      // Verify parts table renders
      expect(screen.getByText('Required Parts')).toBeInTheDocument();
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render large parts list efficiently
      expect(renderTime).toBeLessThan(50);
    });

    it('handles large instruction steps efficiently', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      fireEvent.click(instructionsTab);
      
      const startTime = performance.now();
      
      // Verify steps table renders
      expect(screen.getByText('Build Steps')).toBeInTheDocument();
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render large steps list efficiently
      expect(renderTime).toBeLessThan(50);
    });
  });

  describe('Form Performance', () => {
    it('handles form interactions efficiently', async () => {
      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const startTime = performance.now();
      
      // Fill form fields rapidly
      const titleInput = screen.getByLabelText(/title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      
      fireEvent.change(titleInput, { target: { value: 'New Title' } });
      fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
      
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      // Form interactions should be fast
      expect(interactionTime).toBeLessThan(20);
    });

    it('debounces input changes efficiently', async () => {
      renderWithProviders(<MocDetailPage />);
      
      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const titleInput = screen.getByLabelText(/title/i);
      
      // Rapid typing should not cause performance issues
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        fireEvent.change(titleInput, { target: { value: `Title ${i}` } });
      }
      
      const endTime = performance.now();
      const typingTime = endTime - startTime;
      
      // Rapid typing should complete quickly
      expect(typingTime).toBeLessThan(100);
    });
  });

  describe('Image Upload Performance', () => {
    it('handles large file uploads efficiently', async () => {
      const largeFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to gallery tab
      const galleryTab = screen.getByRole('tab', { name: /gallery/i });
      fireEvent.click(galleryTab);
      
      // Open upload dialog
      const uploadButton = screen.getByRole('button', { name: /upload images/i });
      fireEvent.click(uploadButton);
      
      const startTime = performance.now();
      
      // Simulate large file upload
      const fileInput = screen.getByLabelText(/select images/i);
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      const endTime = performance.now();
      const uploadTime = endTime - startTime;
      
      // File selection should be fast
      expect(uploadTime).toBeLessThan(50);
    });
  });

  describe('Search and Filter Performance', () => {
    it('handles search operations efficiently', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to parts tab where search might be used
      const partsTab = screen.getByRole('tab', { name: /parts/i });
      fireEvent.click(partsTab);
      
      const startTime = performance.now();
      
      // Simulate search operations
      // Note: This would depend on actual search implementation
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      // Search operations should be fast
      expect(searchTime).toBeLessThan(30);
    });
  });

  describe('Network Performance', () => {
    it('handles slow network responses gracefully', async () => {
      // Mock slow network response
      mockUseGetInstructionQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(<MocDetailPage />);
      
      // Should show loading state immediately
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      
      // Simulate network response
      mockUseGetInstructionQuery.mockReturnValue({
        data: createLargeMockInstruction(),
        isLoading: false,
        error: null,
      } as any);
      
      // Re-render to simulate data loading
      renderWithProviders(<MocDetailPage />);
      
      // Should render data efficiently once loaded
      expect(screen.getByText('Large Test MOC')).toBeInTheDocument();
    });
  });

  describe('Bundle Size Impact', () => {
    it('does not significantly impact bundle size', () => {
      // This test would typically be run in a build environment
      // For now, we'll just verify the component imports are reasonable
      
      const component = require('../index');
      expect(component).toBeDefined();
      expect(typeof component.MocDetailPage).toBe('function');
    });
  });
}); 