import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileAvatar } from '../ProfileAvatar';

// Mock UI components
vi.mock('@repo/ui', () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ children, className }: any) => (
    <div data-testid="avatar-fallback" className={className}>
      {children}
    </div>
  ),
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
  Button: ({ children, onClick, size, variant, className }: any) => (
    <button 
      onClick={onClick} 
      data-testid="button"
      data-size={size}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pencil: ({ className }: any) => (
    <svg data-testid="pencil-icon" className={className}>
      <title>Pencil</title>
    </svg>
  ),
  Edit: ({ className }: any) => (
    <svg data-testid="edit-icon" className={className}>
      <title>Edit</title>
    </svg>
  ),
}));

// Mock utils
vi.mock('@repo/ui/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('ProfileAvatar', () => {
  const defaultProps = {
    userName: 'John Doe',
    userEmail: 'john@example.com',
  };

  const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render avatar with image when avatarUrl is provided', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          avatarUrl="https://example.com/avatar.jpg"
        />
      );

      expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(screen.getByTestId('avatar-image')).toHaveAttribute('alt', "John Doe's avatar");
    });

    it('should render fallback initials when no avatarUrl is provided', () => {
      render(<ProfileAvatar {...defaultProps} />);

      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should apply correct size classes', () => {
      const { rerender } = render(<ProfileAvatar {...defaultProps} size="sm" />);
      expect(screen.getByTestId('avatar')).toHaveClass('h-12 w-12');

      rerender(<ProfileAvatar {...defaultProps} size="2xl" />);
      expect(screen.getByTestId('avatar')).toHaveClass('h-40 w-40');
    });
  });

  describe('Editable Avatar with Upload', () => {
    const mockOnAvatarUpload = vi.fn();

    it('should show hover overlay with pencil icon when editable and has upload handler', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onAvatarUpload={mockOnAvatarUpload}
          avatarUrl="https://example.com/avatar.jpg"
        />
      );

      // Should show hover overlay
      expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
      
      // Should have proper hover classes
      const overlay = screen.getByTestId('pencil-icon').closest('div');
      expect(overlay).toHaveClass('opacity-0', 'group-hover:opacity-100');
    });

    it('should trigger file upload when hover overlay is clicked', async () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onAvatarUpload={mockOnAvatarUpload}
          avatarUrl="https://example.com/avatar.jpg"
        />
      );

      // Find and click the hover overlay
      const overlay = screen.getByTestId('pencil-icon').closest('div');
      fireEvent.click(overlay!);

      // Should have hidden file input
      expect(screen.getByTestId('file-input')).toBeInTheDocument();
      expect(screen.getByTestId('file-input')).toHaveAttribute('type', 'file');
      expect(screen.getByTestId('file-input')).toHaveAttribute('accept', 'image/*');
    });

    it('should handle file selection and call onAvatarUpload', async () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onAvatarUpload={mockOnAvatarUpload}
        />
      );

      const fileInput = screen.getByTestId('file-input');
      
      // Simulate file selection
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      expect(mockOnAvatarUpload).toHaveBeenCalledWith(mockFile);
    });

    it('should not show upload overlay when not editable', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={false}
          avatarUrl="https://example.com/avatar.jpg"
        />
      );

      expect(screen.queryByTestId('pencil-icon')).not.toBeInTheDocument();
    });

    it('should not show upload overlay when editable but no upload handler', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          avatarUrl="https://example.com/avatar.jpg"
        />
      );

      expect(screen.queryByTestId('pencil-icon')).not.toBeInTheDocument();
    });
  });

  describe('Status and Verification Indicators', () => {
    it('should show online status when enabled', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          showStatus={true}
          isOnline={true}
        />
      );

      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator).toHaveClass('bg-green-500');
    });

    it('should show offline status when enabled', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          showStatus={true}
          isOnline={false}
        />
      );

      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator).toHaveClass('bg-gray-400');
    });

    it('should show verification badge when verified', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          showVerified={true}
          isVerified={true}
        />
      );

      expect(screen.getByTestId('badge')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveClass('bg-blue-500');
    });

    it('should not show verification badge when not verified', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          showVerified={true}
          isVerified={false}
        />
      );

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });
  });

  describe('Non-editable Avatar with Edit Button', () => {
    const mockOnEdit = vi.fn();

    it('should show edit button when editable but no upload handler', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByTestId('button')).toBeInTheDocument();
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByTestId('button');
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalled();
    });

    it('should not show edit button when upload handler is provided', () => {
      const mockOnAvatarUpload = vi.fn();
      
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onEdit={mockOnEdit}
          onAvatarUpload={mockOnAvatarUpload}
        />
      );

      // Should show upload overlay instead of edit button
      expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-icon')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for avatar image', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          avatarUrl="https://example.com/avatar.jpg"
        />
      );

      expect(screen.getByTestId('avatar-image')).toHaveAttribute('alt', "John Doe's avatar");
    });

    it('should have proper file input attributes', () => {
      const mockOnAvatarUpload = vi.fn();
      
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onAvatarUpload={mockOnAvatarUpload}
        />
      );

      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
      expect(fileInput).toHaveClass('hidden');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <ProfileAvatar 
          {...defaultProps}
          className="custom-avatar-class"
        />
      );

      const avatar = screen.getByTestId('avatar');
      const container = avatar.parentElement;
      expect(container).toHaveClass('custom-avatar-class');
    });

    it('should apply hover effects when editable', () => {
      const mockOnAvatarUpload = vi.fn();
      
      render(
        <ProfileAvatar 
          {...defaultProps}
          editable={true}
          onAvatarUpload={mockOnAvatarUpload}
        />
      );

      expect(screen.getByTestId('avatar')).toHaveClass('hover:ring-primary/50', 'cursor-pointer');
    });
  });
});
