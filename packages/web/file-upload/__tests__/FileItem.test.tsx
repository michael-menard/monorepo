import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { FileItem } from '../src/components/FileUpload/FileItem';
import type { FileWithProgress } from '../src/components/FileUpload/types';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: ({ size, className }: any) => <div data-testid="x-icon" className={className} style={{ width: size, height: size }} />,
  FileIcon: ({ size, className }: any) => <div data-testid="file-icon" className={className} style={{ width: size, height: size }} />,
  FileImage: ({ size, className }: any) => <div data-testid="file-image" className={className} style={{ width: size, height: size }} />,
  FileVideo: ({ size, className }: any) => <div data-testid="file-video" className={className} style={{ width: size, height: size }} />,
  FileAudio: ({ size, className }: any) => <div data-testid="file-audio" className={className} style={{ width: size, height: size }} />,
  FileText: ({ size, className }: any) => <div data-testid="file-text" className={className} style={{ width: size, height: size }} />,
}));

describe('FileItem', () => {
  const mockFile: FileWithProgress = {
    id: 'test-file-1',
    file: new File(['test content'], 'test.txt', { type: 'text/plain' }),
    progress: 50,
    uploaded: false,
  };

  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Display', () => {
    it('renders file information correctly', () => {
      render(<FileItem file={mockFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('test.txt')).toBeInTheDocument();
      expect(screen.getByText('text/plain')).toBeInTheDocument();
      expect(screen.getByText('12 B')).toBeInTheDocument(); // File size
    });

    it('shows progress percentage', () => {
      render(<FileItem file={mockFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows completed status when uploaded', () => {
      const completedFile = { ...mockFile, uploaded: true };
      render(<FileItem file={completedFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('Remove Functionality', () => {
    it('shows remove button when not uploading', () => {
      render(<FileItem file={mockFile} onRemove={mockOnRemove} uploading={false} />);
      
      const removeButton = screen.getByTestId('x-icon').closest('button');
      expect(removeButton).toBeInTheDocument();
    });

    it('hides remove button when uploading', () => {
      render(<FileItem file={mockFile} onRemove={mockOnRemove} uploading={true} />);
      
      const removeButton = screen.queryByTestId('x-icon');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', () => {
      render(<FileItem file={mockFile} onRemove={mockOnRemove} uploading={false} />);
      
      const removeButton = screen.getByTestId('x-icon').closest('button')!;
      fireEvent.click(removeButton);
      
      expect(mockOnRemove).toHaveBeenCalledWith('test-file-1');
    });
  });

  describe('File Types', () => {
    it('handles different file types', () => {
      const imageFile: FileWithProgress = {
        id: 'test-image-1',
        file: new File(['image content'], 'test.jpg', { type: 'image/jpeg' }),
        progress: 0,
        uploaded: false,
      };

      render(<FileItem file={imageFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('image/jpeg')).toBeInTheDocument();
    });

    it('handles unknown file types', () => {
      const unknownFile: FileWithProgress = {
        id: 'test-unknown-1',
        file: new File(['content'], 'test.xyz', { type: '' }),
        progress: 0,
        uploaded: false,
      };

      render(<FileItem file={unknownFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('Unknown type')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows 0% progress', () => {
      const zeroProgressFile = { ...mockFile, progress: 0 };
      render(<FileItem file={zeroProgressFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows 100% progress', () => {
      const fullProgressFile = { ...mockFile, progress: 100 };
      render(<FileItem file={fullProgressFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('rounds progress to nearest integer', () => {
      const partialProgressFile = { ...mockFile, progress: 33.7 };
      render(<FileItem file={partialProgressFile} onRemove={mockOnRemove} uploading={false} />);
      
      expect(screen.getByText('34%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button attributes for remove button', () => {
      render(<FileItem file={mockFile} onRemove={mockOnRemove} uploading={false} />);
      
      const removeButton = screen.getByTestId('x-icon').closest('button')!;
      expect(removeButton).toBeInTheDocument();
    });
  });
}); 