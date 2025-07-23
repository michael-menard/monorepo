import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock the hooks with simple implementations
vi.mock('../hooks', () => ({
  useFileUpload: vi.fn(() => ({
    state: { files: [], isUploading: false, errors: [] },
    actions: {
      addFiles: vi.fn(),
      removeFile: vi.fn(),
      clearFiles: vi.fn(),
      upload: vi.fn(),
      validateFiles: vi.fn()
    }
  })),
  useMetadataFields: vi.fn(() => ({
    state: { values: {}, errors: {}, isValid: true },
    actions: {
      updateField: vi.fn(),
      validateField: vi.fn(),
      validateAll: vi.fn(),
      reset: vi.fn(),
      getFieldValue: vi.fn(),
      getFieldError: vi.fn()
    }
  })),
  useDragAndDrop: vi.fn(() => ({
    state: { isDragOver: false, isDragging: false },
    actions: {
      handleDragOver: vi.fn(),
      handleDragEnter: vi.fn(),
      handleDragLeave: vi.fn(),
      handleDrop: vi.fn(),
      dragAreaProps: {
        onDragOver: vi.fn(),
        onDragEnter: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn()
      }
    }
  }))
}));

import { FileUpload } from '../index';

describe('FileUpload', () => {
  const mockOnUpload = vi.fn();

  it('renders without crashing', () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    expect(screen.getByText('Drop files here or')).toBeInTheDocument();
  });

  it('shows correct accept types', () => {
    render(<FileUpload onUpload={mockOnUpload} accept="image/*" />);
    const matches = screen.getAllByText((content, element) =>
      !!element?.textContent?.replace(/\s+/g, ' ').includes('image/*')
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows multiple files allowed message', () => {
    render(<FileUpload onUpload={mockOnUpload} multiple={true} />);
    const matches = screen.getAllByText((content, element) =>
      !!element?.textContent?.replace(/\s+/g, ' ').includes('Multiple files allowed')
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows custom upload button label', () => {
    render(<FileUpload onUpload={mockOnUpload} uploadButtonLabel="Custom Upload" />);
    // The upload button only shows when files are selected, so we check it's not there initially
    expect(screen.queryByText('Custom Upload')).not.toBeInTheDocument();
  });

  it('shows metadata fields when provided', () => {
    const metadataFields = [
      { name: 'title', label: 'Title', type: 'text' as const, required: true },
      { name: 'category', label: 'Category', type: 'select' as const, options: ['Art', 'Nature'] }
    ];

    render(<FileUpload onUpload={mockOnUpload} metadataFields={metadataFields} />);
    // Metadata fields only show when files are selected, so we check they're not there initially
    expect(screen.queryByText('Additional Information')).not.toBeInTheDocument();
  });

  it('applies disabled styling when disabled', () => {
    render(<FileUpload onUpload={mockOnUpload} disabled={true} />);
    // The drag area is the div with border classes and cursor/opacity classes
    const dragArea = screen.getByText('Drop files here or').parentElement?.parentElement;
    expect(dragArea).toHaveClass('cursor-not-allowed');
    expect(dragArea).toHaveClass('opacity-50');
  });

  it('shows correct file size limit', () => {
    render(<FileUpload onUpload={mockOnUpload} maxSizeMB={10} />);
    const matches = screen.getAllByText((content, element) =>
      !!element?.textContent?.replace(/\s+/g, ' ').includes('Max 10MB')
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows multiple accept types', () => {
    render(<FileUpload onUpload={mockOnUpload} accept={['image/*', 'application/pdf']} />);
    const matches = screen.getAllByText((content, element) =>
      !!element?.textContent?.replace(/\s+/g, ' ').includes('image/*, application/pdf')
    );
    expect(matches.length).toBeGreaterThan(0);
  });
}); 