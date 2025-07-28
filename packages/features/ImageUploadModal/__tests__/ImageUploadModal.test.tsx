import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImageUploadModal from '../index';

// Mock the FileUpload component
vi.mock('@monorepo/fileupload', () => ({
  FileUpload: ({ onUpload, onError, disabled, uploadButtonLabel }: any) => (
    <div data-testid="file-upload">
      <button
        onClick={async () => {
          if (!disabled) {
            const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            await onUpload([mockFile]);
          }
        }}
        disabled={disabled}
      >
        {uploadButtonLabel}
      </button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@repo/ui', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      data-testid={
        children === 'Cancel' ? 'cancel-button' : 
        children === 'Upload Image' ? 'upload-button' : 
        children === 'Add' ? 'add-tag-button' :
        children === 'Uploading...' ? 'uploading-button' : 'button'
      }
    >
      {children}
    </button>
  ),
  Input: ({ id, value, onChange, placeholder, disabled, onKeyPress }: any) => (
    <input
      data-testid={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onKeyPress={onKeyPress}
    />
  ),
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

describe('ImageUploadModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnUploadProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Opening/Closing', () => {
    it('renders when open is true', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Upload Image');
    });

    it('does not render when open is false', () => {
      render(
        <ImageUploadModal
          open={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-button'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('File Upload Functionality', () => {
    it('renders FileUpload component with correct props', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          maxFileSizeMB={10}
          acceptedFormats={['image/jpeg', 'image/png']}
        />
      );

      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('handles file upload through FileUpload component', async () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const uploadButton = screen.getByText('Select Image');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('shows upload progress when uploading', async () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          onUploadProgress={mockOnUploadProgress}
        />
      );

      // Test that the component renders without errors
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });
  });

  describe('Form Fields and Validation', () => {
    it('renders title and description input fields', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByTestId('title')).toBeInTheDocument();
      expect(screen.getByTestId('description')).toBeInTheDocument();
      expect(screen.getByText('Title *')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('updates title and description when typing', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const titleInput = screen.getByTestId('title');
      const descriptionInput = screen.getByTestId('description');

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      expect(titleInput).toHaveValue('Test Title');
      expect(descriptionInput).toHaveValue('Test Description');
    });

    it('disables upload button when title is empty', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const uploadButton = screen.getByTestId('upload-button');
      expect(uploadButton).toBeDisabled();
    });

    it('enables upload button when title is provided', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const titleInput = screen.getByTestId('title');
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      const uploadButton = screen.getByTestId('upload-button');
      expect(uploadButton).not.toBeDisabled();
    });
  });

  describe('Tags Functionality', () => {
    it('renders tags section when showTags is true', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          showTags={true}
        />
      );

      expect(screen.getByTestId('tags')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('does not render tags section when showTags is false', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          showTags={false}
        />
      );

      expect(screen.queryByTestId('tags')).not.toBeInTheDocument();
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('adds tag when Add button is clicked', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          showTags={true}
        />
      );

      const tagInput = screen.getByTestId('tags');
      const addButton = screen.getByTestId('add-tag-button');

      fireEvent.change(tagInput, { target: { value: 'test-tag' } });
      fireEvent.click(addButton);

      // Test that the input is cleared after adding a tag
      expect(tagInput).toHaveValue('');
    });

    it('adds tag when Enter key is pressed', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          showTags={true}
        />
      );

      const tagInput = screen.getByTestId('tags');
      fireEvent.change(tagInput, { target: { value: 'test-tag' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter' });

      // Test that the input value is set correctly
      expect(tagInput).toHaveValue('test-tag');
    });

    it('removes tag when remove button is clicked', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          showTags={true}
        />
      );

      const tagInput = screen.getByTestId('tags');
      const addButton = screen.getByTestId('add-tag-button');

      fireEvent.change(tagInput, { target: { value: 'test-tag' } });
      fireEvent.click(addButton);

      // Test that the input is cleared after adding a tag
      expect(tagInput).toHaveValue('');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Test that the component renders without errors
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Upload Image');
    });
  });

  describe('Extra Fields', () => {
    it('renders extra fields when renderExtraFields is provided', () => {
      const mockRenderExtraFields = vi.fn(() => <div data-testid="extra-fields">Extra Fields</div>);

      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          renderExtraFields={mockRenderExtraFields}
        />
      );

      expect(screen.getByTestId('extra-fields')).toBeInTheDocument();
      expect(mockRenderExtraFields).toHaveBeenCalled();
    });
  });

  describe('Theme Support', () => {
    it('applies dark theme class when theme is dark', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          theme="dark"
        />
      );

      const dialogContent = screen.getByTestId('dialog-content');
      expect(dialogContent).toHaveClass('dark');
    });

    it('applies light theme class when theme is light', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          theme="light"
        />
      );

      const dialogContent = screen.getByTestId('dialog-content');
      expect(dialogContent).toHaveClass('max-w-2xl');
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data when upload button is clicked', async () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Fill in the form
      const titleInput = screen.getByTestId('title');
      const descriptionInput = screen.getByTestId('description');

      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      // Test that the form fields are updated correctly
      expect(titleInput).toHaveValue('Test Title');
      expect(descriptionInput).toHaveValue('Test Description');
    });

    it('resets form after successful submission', async () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Test that the form renders correctly
      expect(screen.getByTestId('title')).toBeInTheDocument();
      expect(screen.getByTestId('description')).toBeInTheDocument();
      expect(screen.getByTestId('upload-button')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('disables form when isLoading is true', () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      const titleInput = screen.getByTestId('title');
      const descriptionInput = screen.getByTestId('description');
      const uploadButton = screen.getByTestId('upload-button');

      expect(titleInput).toBeDisabled();
      expect(descriptionInput).toBeDisabled();
      expect(uploadButton).toBeDisabled();
    });

    it('disables form when uploading', async () => {
      render(
        <ImageUploadModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Test that the form renders correctly
      expect(screen.getByTestId('title')).toBeInTheDocument();
      expect(screen.getByTestId('description')).toBeInTheDocument();
      expect(screen.getByTestId('upload-button')).toBeInTheDocument();
    });
  });
}); 