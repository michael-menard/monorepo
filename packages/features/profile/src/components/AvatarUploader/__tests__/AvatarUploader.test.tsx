import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AvatarUploader } from '../index';

// Mock react-easy-crop
vi.mock('react-easy-crop', () => ({
  default: ({ onCropComplete, style }: any) => {
    React.useEffect(() => {
      // Simulate crop completion
      onCropComplete(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 100, height: 100 }
      );
    }, [onCropComplete]);
    
    return (
      <div data-testid="cropper" style={style?.containerStyle}>
        <div data-testid="crop-area">Crop Area</div>
      </div>
    );
  },
}));

// Mock canvas API
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn((callback) => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    callback(blob);
  }),
  width: 0,
  height: 0,
};

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class {
    getContext() {
      return mockCanvas.getContext();
    }
    toBlob(callback: any) {
      mockCanvas.toBlob(callback);
    }
    set width(value: number) {
      mockCanvas.width = value;
    }
    set height(value: number) {
      mockCanvas.height = value;
    }
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// Mock File constructor
const MockFile = class extends Blob {
  name: string;
  type: string;
  lastModified: number;
  webkitRelativePath: string;

  constructor(parts: any[], filename: string, options?: any) {
    super(parts, options);
    this.name = filename;
    this.type = options?.type || 'image/jpeg';
    this.lastModified = options?.lastModified || Date.now();
    this.webkitRelativePath = '';
  }
} as any;

global.File = MockFile;

describe('AvatarUploader', () => {
  const mockOnUpload = vi.fn();
  const mockOnRemove = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders avatar with fallback when no current avatar', () => {
    render(<AvatarUploader onUpload={mockOnUpload} />);
    
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText('Upload Photo')).toBeInTheDocument();
  });

  it('renders avatar with image when current avatar is provided', () => {
    render(
      <AvatarUploader 
        currentAvatar="https://example.com/avatar.jpg" 
        onUpload={mockOnUpload} 
      />
    );
    
    const avatarImage = screen.getByAltText('Profile avatar');
    expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows remove button when current avatar and onRemove are provided', () => {
    render(
      <AvatarUploader 
        currentAvatar="https://example.com/avatar.jpg" 
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
      />
    );
    
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('opens crop modal when file is selected', async () => {
    render(<AvatarUploader onUpload={mockOnUpload} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photo/i });
    
    await user.click(input);
    
    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Crop Profile Photo')).toBeInTheDocument();
    });
  });

  it('validates file size and shows error for large files', async () => {
    render(
      <AvatarUploader 
        onUpload={mockOnUpload}
        maxFileSize={1024 * 1024} // 1MB
      />
    );
    
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photo/i });
    
    await user.click(input);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File size must be less than 1MB/)).toBeInTheDocument();
    });
  });

  it('validates file type and shows error for invalid types', async () => {
    render(
      <AvatarUploader 
        onUpload={mockOnUpload}
        acceptedFileTypes={['image/jpeg', 'image/png']}
      />
    );
    
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { name: /upload photo/i });
    
    await user.click(input);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File type must be one of/)).toBeInTheDocument();
    });
  });

  it('calls onRemove when remove button is clicked', async () => {
    render(
      <AvatarUploader 
        currentAvatar="https://example.com/avatar.jpg" 
        onUpload={mockOnUpload}
        onRemove={mockOnRemove}
      />
    );
    
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);
    
    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isLoading is true', () => {
    render(<AvatarUploader onUpload={mockOnUpload} isLoading={true} />);
    
    const uploadButton = screen.getByRole('button', { name: /upload photo/i });
    expect(uploadButton).toBeDisabled();
  });

  it('handles crop completion and saves image', async () => {
    render(<AvatarUploader onUpload={mockOnUpload} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photo/i });
    
    await user.click(input);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Crop Profile Photo')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it('shows upload progress during processing', async () => {
    render(<AvatarUploader onUpload={mockOnUpload} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photo/i });
    
    await user.click(input);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Crop Profile Photo')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  it('handles errors during image processing', async () => {
    const mockOnUploadWithError = vi.fn().mockRejectedValue(new Error('Upload failed'));
    
    render(<AvatarUploader onUpload={mockOnUploadWithError} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photo/i });
    
    await user.click(input);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('Crop Profile Photo')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });
}); 