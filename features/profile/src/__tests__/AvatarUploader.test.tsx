import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvatarUploader } from '../components/AvatarUploader.js';

describe('AvatarUploader', () => {
  const defaultProps = {
    currentAvatarUrl: '',
    onUpload: vi.fn(),
    disabled: false,
  };

  it('renders fallback initials when no avatar URL', () => {
    render(<AvatarUploader {...defaultProps} />);
    // Should render fallback initials (e.g., U)
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('shows upload button when no avatar', () => {
    render(<AvatarUploader {...defaultProps} />);
    expect(screen.getByText(/upload avatar/i)).toBeInTheDocument();
  });

  it('shows change button when avatar exists', () => {
    render(<AvatarUploader {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);
    expect(screen.getByText(/change avatar/i)).toBeInTheDocument();
  });

  it('shows remove button when avatar exists', () => {
    render(<AvatarUploader {...defaultProps} currentAvatarUrl="https://example.com/avatar.jpg" />);
    expect(screen.getByText(/remove/i)).toBeInTheDocument();
  });

  it('opens file input when upload button is clicked', () => {
    render(<AvatarUploader {...defaultProps} />);
    const uploadButton = screen.getByText(/upload avatar/i);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    fireEvent.click(uploadButton);
  });

  it('is disabled when disabled prop is true', () => {
    render(<AvatarUploader {...defaultProps} disabled />);
    expect(screen.getByText(/upload avatar/i)).toBeDisabled();
  });
}); 