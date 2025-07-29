import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppAvatar } from '../AppAvatar';

// Mock the file input
const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

describe('AppAvatar', () => {
  const defaultProps = {
    avatarUrl: 'https://example.com/avatar.jpg',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    onAvatarUpload: vi.fn(),
    onProfileClick: vi.fn(),
    onLogout: vi.fn(),
    size: 'md' as const,
    showEditButton: true,
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders avatar with image when avatarUrl is provided', () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarImage = screen.getByAltText("John Doe's avatar");
    expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders avatar with initials when no avatarUrl is provided', () => {
    render(<AppAvatar {...defaultProps} avatarUrl={undefined} />);
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders avatar with email initial when no userName is provided', () => {
    render(<AppAvatar {...defaultProps} userName={undefined} />);
    
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders avatar with "U" when no userName or email is provided', () => {
    render(<AppAvatar {...defaultProps} userName={undefined} userEmail={undefined} />);
    
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('shows edit button overlay on hover when showEditButton is true and onAvatarUpload is provided', () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    // The edit button should be present in the DOM
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('does not show edit button when showEditButton is false', () => {
    render(<AppAvatar {...defaultProps} showEditButton={false} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    // Should not find edit button
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('does not show edit button when onAvatarUpload is not provided', () => {
    render(<AppAvatar {...defaultProps} onAvatarUpload={undefined} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    // Should not find edit button
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('opens dropdown menu when avatar is clicked', () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls onProfileClick when Profile option is clicked', () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    const profileOption = screen.getByText('Profile');
    fireEvent.click(profileOption);
    
    expect(defaultProps.onProfileClick).toHaveBeenCalledTimes(1);
  });

  it('opens logout confirmation dialog when Logout option is clicked', () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    const logoutOption = screen.getByText('Logout');
    fireEvent.click(logoutOption);
    
    expect(screen.getByText('Confirm Logout')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to logout?')).toBeInTheDocument();
  });

  it('calls onLogout when logout is confirmed', async () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    const logoutOption = screen.getByText('Logout');
    fireEvent.click(logoutOption);
    
    const confirmButton = screen.getByText('Logout');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(defaultProps.onLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('disables logout option when onLogout is not provided', () => {
    render(<AppAvatar {...defaultProps} onLogout={undefined} />);
    
    const avatarButton = screen.getByRole('button');
    fireEvent.click(avatarButton);
    
    const logoutOption = screen.getByText('Logout');
    expect(logoutOption).toBeDisabled();
  });

  it('opens upload modal when edit button is clicked', () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(screen.getByText('Update Profile Picture')).toBeInTheDocument();
  });

  it('handles file selection and validation', async () => {
    render(<AppAvatar {...defaultProps} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    const fileInput = screen.getByRole('button', { name: /edit/i }).closest('div')?.querySelector('input');
    expect(fileInput).toBeInTheDocument();
    
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      await waitFor(() => {
        expect(screen.getByText('Selected: test.jpg')).toBeInTheDocument();
      });
    }
  });

  it('shows error for invalid file type', async () => {
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    render(<AppAvatar {...defaultProps} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    const fileInput = screen.getByRole('button', { name: /edit/i }).closest('div')?.querySelector('input');
    
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      await waitFor(() => {
        expect(screen.getByText('Please select an image file')).toBeInTheDocument();
      });
    }
  });

  it('shows error for file too large', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    render(<AppAvatar {...defaultProps} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    const fileInput = screen.getByRole('button', { name: /edit/i }).closest('div')?.querySelector('input');
    
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText('File size must be less than 5MB')).toBeInTheDocument();
      });
    }
  });

  it('calls onAvatarUpload when upload button is clicked', async () => {
    defaultProps.onAvatarUpload.mockResolvedValue(undefined);
    
    render(<AppAvatar {...defaultProps} />);
    
    const avatarContainer = screen.getByRole('button');
    fireEvent.mouseEnter(avatarContainer);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    const fileInput = screen.getByRole('button', { name: /edit/i }).closest('div')?.querySelector('input');
    
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      await waitFor(() => {
        const uploadButton = screen.getByText('Upload');
        fireEvent.click(uploadButton);
      });
      
      await waitFor(() => {
        expect(defaultProps.onAvatarUpload).toHaveBeenCalledWith(mockFile);
      });
    }
  });

  it('handles different sizes correctly', () => {
    const { rerender } = render(<AppAvatar {...defaultProps} size="sm" />);
    
    let avatar = screen.getByRole('img');
    expect(avatar.closest('.h-8')).toBeInTheDocument();
    
    rerender(<AppAvatar {...defaultProps} size="lg" />);
    avatar = screen.getByRole('img');
    expect(avatar.closest('.h-12')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<AppAvatar {...defaultProps} className="custom-class" />);
    
    const container = screen.getByRole('button').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('disables interactions when disabled prop is true', () => {
    render(<AppAvatar {...defaultProps} disabled={true} />);
    
    const avatarButton = screen.getByRole('button');
    expect(avatarButton).toBeDisabled();
  });
}); 