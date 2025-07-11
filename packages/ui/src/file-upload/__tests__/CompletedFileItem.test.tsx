import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CompletedFileItem } from '../src/components/FileUpload/CompletedFileItem';
import type { FileWithProgress } from '../src/components/FileUpload/types';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  CheckCircle: ({ size, className }: any) => <div data-testid="check-icon" className={className} style={{ width: size, height: size }} />,
  FileIcon: ({ size, className }: any) => <div data-testid="file-icon" className={className} style={{ width: size, height: size }} />,
  FileImage: ({ size, className }: any) => <div data-testid="file-image" className={className} style={{ width: size, height: size }} />,
  FileVideo: ({ size, className }: any) => <div data-testid="file-video" className={className} style={{ width: size, height: size }} />,
  FileAudio: ({ size, className }: any) => <div data-testid="file-audio" className={className} style={{ width: size, height: size }} />,
  FileText: ({ size, className }: any) => <div data-testid="file-text" className={className} style={{ width: size, height: size }} />,
}));

describe('CompletedFileItem', () => {
  const mockFile: FileWithProgress = {
    id: 'test-file-1',
    file: new File(['test content'], 'test.txt', { type: 'text/plain' }),
    progress: 100,
    uploaded: true,
  };

  describe('Success Display', () => {
    it('renders completed file information correctly', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      expect(screen.getByText('test.txt')).toBeInTheDocument();
      expect(screen.getByText('text/plain')).toBeInTheDocument();
      expect(screen.getByText('12 B')).toBeInTheDocument(); // File size
      expect(screen.getByText('Upload completed successfully!')).toBeInTheDocument();
    });

    it('shows check icon', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('applies success styling', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      // Find the element with the green background class
      const container = document.querySelector('.bg-green-600');
      expect(container).toBeInTheDocument();
    });
  });

  describe('File Information Display', () => {
    it('displays file name', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });

    it('displays file type', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      expect(screen.getByText('text/plain')).toBeInTheDocument();
    });

    it('displays file size', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      expect(screen.getByText('12 B')).toBeInTheDocument();
    });

    it('handles different file types', () => {
      const imageFile: FileWithProgress = {
        id: 'test-image-1',
        file: new File(['image content'], 'test.jpg', { type: 'image/jpeg' }),
        progress: 100,
        uploaded: true,
      };

      render(<CompletedFileItem file={imageFile} />);
      
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('image/jpeg')).toBeInTheDocument();
    });

    it('handles unknown file types', () => {
      const unknownFile: FileWithProgress = {
        id: 'test-unknown-1',
        file: new File(['content'], 'test.xyz', { type: '' }),
        progress: 100,
        uploaded: true,
      };

      render(<CompletedFileItem file={unknownFile} />);
      
      expect(screen.getByText('Unknown type')).toBeInTheDocument();
    });
  });

  describe('Success Message', () => {
    it('displays success message', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      expect(screen.getByText('Upload completed successfully!')).toBeInTheDocument();
    });

    it('positions success message correctly', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const message = screen.getByText('Upload completed successfully!');
      const container = message.closest('div');
      expect(container).toHaveClass('text-right');
    });
  });

  describe('Styling', () => {
    it('applies green background', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const container = document.querySelector('.bg-green-600');
      expect(container).toBeInTheDocument();
    });

    it('applies white text color', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      expect(screen.getByText('test.txt')).toHaveClass('text-white');
    });

    it('applies light green text for secondary information', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const textElements = document.querySelectorAll('.text-green-100');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('applies rounded corners', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const container = document.querySelector('.rounded-md');
      expect(container).toBeInTheDocument();
    });

    it('applies padding', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const container = document.querySelector('.p-4');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('has proper spacing between elements', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const container = document.querySelector('.space-y-2');
      expect(container).toBeInTheDocument();
    });

    it('displays file icon and information in flex layout', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const fileInfoContainer = screen.getByText('test.txt').closest('div')?.parentElement;
      expect(fileInfoContainer).toHaveClass('flex');
      expect(fileInfoContainer).toHaveClass('items-center');
      expect(fileInfoContainer).toHaveClass('gap-3');
    });

    it('positions check icon on the right', () => {
      render(<CompletedFileItem file={mockFile} />);
      
      const container = document.querySelector('.justify-between');
      expect(container).toBeInTheDocument();
    });
  });
}); 