import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileSidebar } from '../components/ProfileSidebar';
import type { ProfileData } from '../types';

const mockProfile: ProfileData = {
  id: '1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  stats: {
    projects: 5,
    followers: 100,
    following: 50,
  },
};

describe('ProfileSidebar', () => {
  it('renders display name, username, and avatar fallback initials', () => {
    render(<ProfileSidebar profile={mockProfile} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    // Avatar fallback initials (should be TU for Test User)
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('shows Edit button if editable and onProfileUpdate is provided', () => {
    render(
      <ProfileSidebar profile={mockProfile} isEditable={true} onProfileUpdate={vi.fn()} />
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('shows AvatarUploader if editable and onAvatarUpload is provided', () => {
    render(
      <ProfileSidebar profile={mockProfile} isEditable={true} onAvatarUpload={vi.fn()} />
    );
    // AvatarUploader renders an upload button
    expect(screen.getByText(/upload avatar|change avatar/i)).toBeInTheDocument();
  });

  it('toggles to edit mode and validates display name', async () => {
    const onProfileUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <ProfileSidebar profile={mockProfile} isEditable={true} onProfileUpdate={onProfileUpdate} />
    );
    fireEvent.click(screen.getByText('Edit'));
    // Should show input with current display name
    const input = screen.getByPlaceholderText('Display Name');
    expect(input).toBeInTheDocument();
    // Clear and blur to trigger validation
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });
    // Enter valid name and save
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(onProfileUpdate).toHaveBeenCalledWith({ displayName: 'New Name' });
    });
  });

  it('cancel reverts to view mode', () => {
    render(
      <ProfileSidebar profile={mockProfile} isEditable={true} onProfileUpdate={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
}); 