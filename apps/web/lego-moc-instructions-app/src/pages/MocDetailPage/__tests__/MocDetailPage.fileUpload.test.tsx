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
    useGetInstructionsFilesQuery: vi.fn(),
    useUpdateInstructionMutation: vi.fn(),
    useDeleteInstructionMutation: vi.fn(),
    useUploadInstructionsFileMutation: vi.fn(),
    useDeleteInstructionsFileMutation: vi.fn(),
    useUploadInstructionsImageMutation: vi.fn(),
    formatTime: vi.fn((minutes) => `${minutes} min`),
    getDifficultyLabel: vi.fn((difficulty) => difficulty),
    calculateTotalParts: vi.fn(() => 150),
    calculateTotalTime: vi.fn(() => 120),
    validateFileSize: vi.fn(() => true),
    validateImageType: vi.fn(() => true),
    validateInstructionFileType: vi.fn(() => true),
    getFileTypeLabel: vi.fn((file) => file.name.endsWith('.pdf') ? 'PDF' : 'Stud.io'),
    formatFileSize: vi.fn((bytes) => `${Math.round(bytes / 1024)} KB`),
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

const mockInstructionFiles = [
  {
    id: 'file-1',
    instructionsId: 'test-id',
    title: 'Test PDF Instructions',
    description: 'A test PDF file',
    fileName: 'instructions.pdf',
    fileUrl: 'https://example.com/instructions.pdf',
    fileType: 'pdf' as const,
    fileSize: 1024 * 1024, // 1MB
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    downloadCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'file-2',
    instructionsId: 'test-id',
    title: 'Test Stud.io File',
    description: 'A test .io file',
    fileName: 'model.io',
    fileUrl: 'https://example.com/model.io',
    fileType: 'io' as const,
    fileSize: 2048 * 1024, // 2MB
    thumbnailUrl: undefined,
    downloadCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

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

describe('MocDetailPage File Upload', () => {
  const mockUseGetInstructionQuery = vi.mocked(instructionsApi.useGetInstructionQuery);
  const mockUseGetInstructionsFilesQuery = vi.mocked(instructionsApi.useGetInstructionsFilesQuery);
  const mockUseUploadInstructionsFileMutation = vi.mocked(instructionsApi.useUploadInstructionsFileMutation);
  const mockUseDeleteInstructionsFileMutation = vi.mocked(instructionsApi.useDeleteInstructionsFileMutation);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseGetInstructionQuery.mockReturnValue({
      data: mockInstruction,
      isLoading: false,
      error: null,
    } as any);

    mockUseGetInstructionsFilesQuery.mockReturnValue({
      data: mockInstructionFiles,
      isLoading: false,
      error: null,
    } as any);

    mockUseUploadInstructionsFileMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ data: mockInstructionFiles[0] }),
      { isLoading: false },
    ] as any);

    mockUseDeleteInstructionsFileMutation.mockReturnValue([
      vi.fn().mockResolvedValue({}),
      { isLoading: false },
    ] as any);
  });

  describe('Unit Tests', () => {
    it('displays uploaded files in the instructions tab', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      fireEvent.click(instructionsTab);
      
      // Check for uploaded files
      expect(screen.getByText('Test PDF Instructions')).toBeInTheDocument();
      expect(screen.getByText('Test Stud.io File')).toBeInTheDocument();
      expect(screen.getByText('A test PDF file')).toBeInTheDocument();
      expect(screen.getByText('A test .io file')).toBeInTheDocument();
    });

    it('shows file upload button in instructions tab', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      fireEvent.click(instructionsTab);
      
      // Check for upload button
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toHaveClass('w-full', 'max-w-xs', 'rounded-lg', 'shadow-lg');
    });

    it('opens file upload dialog when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Check for dialog
      expect(screen.getByText('Upload Instructions File')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('handles file upload successfully', async () => {
      const user = userEvent.setup();
      const mockUploadFile = vi.fn().mockResolvedValue({ data: mockInstructionFiles[0] });
      mockUseUploadInstructionsFileMutation.mockReturnValue([
        mockUploadFile,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      
      await user.type(titleInput, 'New Instructions');
      await user.type(descriptionInput, 'New description');
      
      // Simulate file selection
      const fileInput = screen.getByLabelText(/file/i);
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockUploadFile).toHaveBeenCalledWith({
          file: testFile,
          title: 'New Instructions',
          description: 'New description',
          thumbnailImage: undefined,
          instructionsId: 'test-id',
        });
      });
    });

    it('handles file deletion successfully', async () => {
      const user = userEvent.setup();
      const mockDeleteFile = vi.fn().mockResolvedValue({});
      mockUseDeleteInstructionsFileMutation.mockReturnValue([
        mockDeleteFile,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      // Click delete button for first file
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(mockDeleteFile).toHaveBeenCalledWith({
          instructionsId: 'test-id',
          fileId: 'file-1',
        });
      });
    });

    it('handles file download', async () => {
      const user = userEvent.setup();
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: vi.fn(),
      } as any);
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockReturnValue({} as any);
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockReturnValue({} as any);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      // Click download button for first file
      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      await user.click(downloadButtons[0]);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });
  });

  describe('Parts List File Upload', () => {
    it('displays parts list upload button in parts tab', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to parts tab
      const partsTab = screen.getByRole('tab', { name: /parts list/i });
      fireEvent.click(partsTab);
      
      // Check for parts list upload button
      expect(screen.getByRole('button', { name: /upload parts list/i })).toBeInTheDocument();
    });

    it('opens parts list upload dialog when button is clicked', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to parts tab
      const partsTab = screen.getByRole('tab', { name: /parts list/i });
      fireEvent.click(partsTab);
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload parts list/i });
      fireEvent.click(uploadButton);
      
      // Check that dialog opens
      expect(screen.getByText('Upload Parts List File')).toBeInTheDocument();
    });
  });

  describe('UX Tests', () => {
    it('provides visual feedback during file upload', async () => {
      const user = userEvent.setup();
      const mockUploadFile = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockUseUploadInstructionsFileMutation.mockReturnValue([
        mockUploadFile,
        { isLoading: true },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Fill form and submit
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test File');
      
      const fileInput = screen.getByLabelText(/file/i);
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      // Should show loading state
      expect(submitButton).toBeDisabled();
    });

    it('validates required fields in upload form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      // Should show validation errors
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });

    it('handles file type validation', async () => {
      const user = userEvent.setup();
      const mockValidateInstructionFileType = vi.mocked(require('@repo/moc-instructions').validateInstructionFileType);
      mockValidateInstructionFileType.mockReturnValue(false);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Fill form with invalid file
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test File');
      
      const fileInput = screen.getByLabelText(/file/i);
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    it('handles large file uploads efficiently', async () => {
      const user = userEvent.setup();
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      const startTime = performance.now();
      
      // Simulate large file selection
      const fileInput = screen.getByLabelText(/file/i);
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      const endTime = performance.now();
      const selectionTime = endTime - startTime;
      
      // File selection should be fast even for large files
      expect(selectionTime).toBeLessThan(100);
    });

    it('renders many uploaded files efficiently', () => {
      const manyFiles = Array.from({ length: 50 }, (_, i) => ({
        id: `file-${i}`,
        instructionsId: 'test-id',
        title: `File ${i}`,
        description: `Description ${i}`,
        fileName: `file-${i}.pdf`,
        fileUrl: `https://example.com/file-${i}.pdf`,
        fileType: 'pdf' as const,
        fileSize: 1024 * 1024,
        thumbnailUrl: undefined,
        downloadCount: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockUseGetInstructionsFilesQuery.mockReturnValue({
        data: manyFiles,
        isLoading: false,
        error: null,
      } as any);

      const startTime = performance.now();
      
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      fireEvent.click(instructionsTab);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render many files efficiently
      expect(renderTime).toBeLessThan(200);
      expect(screen.getAllByText(/file \d+/i)).toHaveLength(50);
    });
  });

  describe('Security Tests', () => {
    it('validates file size limits', async () => {
      const user = userEvent.setup();
      const mockValidateFileSize = vi.mocked(require('@repo/moc-instructions').validateFileSize);
      mockValidateFileSize.mockReturnValue(false);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Fill form with oversized file
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test File');
      
      const fileInput = screen.getByLabelText(/file/i);
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/file size must be less than 50mb/i)).toBeInTheDocument();
      });
    });

    it('prevents malicious file uploads', async () => {
      const user = userEvent.setup();
      const mockValidateInstructionFileType = vi.mocked(require('@repo/moc-instructions').validateInstructionFileType);
      mockValidateInstructionFileType.mockReturnValue(false);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Try to upload executable file
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test File');
      
      const fileInput = screen.getByLabelText(/file/i);
      const maliciousFile = new File(['malicious'], 'script.exe', { type: 'application/x-executable' });
      fireEvent.change(fileInput, { target: { files: [maliciousFile] } });
      
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      // Should reject malicious file
      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels for file upload', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      fireEvent.click(instructionsTab);
      
      // Check for proper labels
      expect(screen.getByRole('button', { name: /upload instructions/i })).toBeInTheDocument();
      
      // Open upload dialog
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      fireEvent.click(uploadButton);
      
      // Check form accessibility
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/file/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation for file operations', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /upload instructions/i })).toHaveFocus();
      
      // Open upload dialog
      await user.keyboard('{Enter}');
      
      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/title/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
    });

    it('provides screen reader support for file information', () => {
      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      fireEvent.click(instructionsTab);
      
      // Check for file information
      expect(screen.getByText('Test PDF Instructions')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('1 KB')).toBeInTheDocument();
      expect(screen.getByText('5 downloads')).toBeInTheDocument();
    });
  });

  describe('End-to-End Tests', () => {
    it('completes full file upload workflow', async () => {
      const user = userEvent.setup();
      const mockUploadFile = vi.fn().mockResolvedValue({ data: mockInstructionFiles[0] });
      mockUseUploadInstructionsFileMutation.mockReturnValue([
        mockUploadFile,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      // Open upload dialog
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Fill form completely
      const titleInput = screen.getByLabelText(/title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      
      await user.type(titleInput, 'Complete Test File');
      await user.type(descriptionInput, 'Complete test description');
      
      // Select file
      const fileInput = screen.getByLabelText(/file/i);
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      // Select thumbnail
      const thumbnailInput = screen.getByLabelText(/thumbnail image/i);
      const thumbnailFile = new File(['thumbnail'], 'thumb.jpg', { type: 'image/jpeg' });
      fireEvent.change(thumbnailInput, { target: { files: [thumbnailFile] } });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      // Verify upload was called with correct data
      await waitFor(() => {
        expect(mockUploadFile).toHaveBeenCalledWith({
          file: testFile,
          title: 'Complete Test File',
          description: 'Complete test description',
          thumbnailImage: thumbnailFile,
          instructionsId: 'test-id',
        });
      });
      
      // Verify dialog closed
      expect(screen.queryByText('Upload Instructions File')).not.toBeInTheDocument();
    });

    it('handles file upload errors gracefully', async () => {
      const user = userEvent.setup();
      const mockUploadFile = vi.fn().mockRejectedValue(new Error('Upload failed'));
      mockUseUploadInstructionsFileMutation.mockReturnValue([
        mockUploadFile,
        { isLoading: false },
      ] as any);

      renderWithProviders(<MocDetailPage />);
      
      // Navigate to instructions tab and open upload dialog
      const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
      await user.click(instructionsTab);
      
      const uploadButton = screen.getByRole('button', { name: /upload instructions/i });
      await user.click(uploadButton);
      
      // Fill and submit form
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test File');
      
      const fileInput = screen.getByLabelText(/file/i);
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      const submitButton = screen.getByRole('button', { name: /upload file/i });
      await user.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to upload file/i)).toBeInTheDocument();
      });
      
      // Dialog should remain open for retry
      expect(screen.getByText('Upload Instructions File')).toBeInTheDocument();
    });
  });
}); 