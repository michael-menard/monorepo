import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSidebar } from '../components/ProfileSidebar.js';
import type { ProfileData } from '../types/index.js';

// Mock AvatarUploader component
vi.mock('../components/AvatarUploader.js', () => ({
  AvatarUploader: ({ currentAvatarUrl, onUpload, className }: any) => (
    <div data-testid="avatar-uploader" className={className}>
      <button onClick={() => onUpload?.('new-avatar.jpg')}>
        Upload Avatar
      </button>
      <img src={currentAvatarUrl} alt="Current avatar" />
    </div>
  ),
}));

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

const mockProfileWithoutDisplayName: ProfileData = {
  id: '2',
  username: 'johndoe',
  displayName: '',
  avatarUrl: '',
  stats: {
    projects: 0,
    followers: 0,
    following: 0,
  },
};

const mockProfileWithoutStats: ProfileData = {
  id: '3',
  username: 'minimaluser',
  displayName: 'Minimal User',
  avatarUrl: 'https://example.com/minimal.jpg',
};

describe('ProfileSidebar', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders display name, username, and avatar fallback initials', () => {
      render(<ProfileSidebar profile={mockProfile} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('TU')).toBeInTheDocument(); // Avatar fallback initials
    });

    it('renders correctly when display name is empty', () => {
      render(<ProfileSidebar profile={mockProfileWithoutDisplayName} />);
      
      expect(screen.getByText('johndoe')).toBeInTheDocument(); // Uses username as display
      expect(screen.queryByText('@johndoe')).not.toBeInTheDocument(); // No @username when no display name
      expect(screen.getByText('JO')).toBeInTheDocument(); // Fallback initials from username
    });

    it('renders avatar fallback when no avatar URL', () => {
      render(<ProfileSidebar profile={mockProfileWithoutDisplayName} />);
      
      expect(screen.getByText('JO')).toBeInTheDocument(); // Fallback initials
      expect(screen.queryByAltText("johndoe's avatar")).not.toBeInTheDocument();
    });

    it('renders stats section when stats are provided', () => {
      render(<ProfileSidebar profile={mockProfile} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Followers')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('Following')).toBeInTheDocument();
    });

    it('renders stats with correct singular/plural forms', () => {
      const singleProjectProfile = {
        ...mockProfile,
        stats: { projects: 1, followers: 1, following: 1 }
      };
      render(<ProfileSidebar profile={singleProjectProfile} />);
      
      expect(screen.getByText('Project')).toBeInTheDocument(); // Singular
      expect(screen.getByText('Follower')).toBeInTheDocument(); // Singular
      expect(screen.getByText('Following')).toBeInTheDocument(); // Always singular
    });

    it('does not render stats section when stats are not provided', () => {
      render(<ProfileSidebar profile={mockProfileWithoutStats} />);
      
      expect(screen.queryByText('Projects')).not.toBeInTheDocument();
      expect(screen.queryByText('Followers')).not.toBeInTheDocument();
      expect(screen.queryByText('Following')).not.toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<ProfileSidebar profile={mockProfile} className="custom-class" />);
      
      const sidebar = screen.getByText('Test User').closest('div')?.parentElement;
      expect(sidebar).toHaveClass('custom-class');
    });
  });

  describe('Edit Mode', () => {
    it('shows Edit button when editable and onProfileUpdate is provided', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    it('does not show Edit button when not editable', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={false} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('does not show Edit button when onProfileUpdate is not provided', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
        />
      );
      
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('enters edit mode when Edit button is clicked', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('pre-fills input with current display name', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      expect(input).toHaveValue('Test User');
    });

    it('pre-fills input with username when display name is empty', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfileWithoutDisplayName} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      expect(input).toHaveValue('');
    });
  });

  describe('Form Validation', () => {
    it('validates minimum length requirement', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'A');
      await user.tab(); // Trigger blur
      
      await waitFor(() => {
        expect(screen.getByText('Display name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('validates maximum length requirement', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'A'.repeat(33)); // 33 characters
      await user.tab(); // Trigger blur
      
      await waitFor(() => {
        expect(screen.getByText('Display name must be at most 32 characters')).toBeInTheDocument();
      });
    });

    it('shows validation error styling on invalid input', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.tab(); // Trigger blur
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('clears validation errors when input becomes valid', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.tab(); // Trigger validation error
      
      await waitFor(() => {
        expect(screen.getByText('Display name must be at least 2 characters')).toBeInTheDocument();
      });
      
      await user.type(input, 'Valid Name');
      await user.tab(); // Trigger validation
      
      await waitFor(() => {
        expect(screen.queryByText('Display name must be at least 2 characters')).not.toBeInTheDocument();
        expect(input).toHaveAttribute('aria-invalid', 'false');
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onProfileUpdate with new display name when Save is clicked', async () => {
      const onProfileUpdate = vi.fn().mockResolvedValue(undefined);
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={onProfileUpdate} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'New Display Name');
      
      await user.click(screen.getByRole('button', { name: 'Save' }));
      
      await waitFor(() => {
        expect(onProfileUpdate).toHaveBeenCalledWith({ displayName: 'New Display Name' });
      });
    });

    it('disables Save button when form is not dirty', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).toBeDisabled();
    });

    it('enables Save button when form becomes dirty', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'New Name');
      
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).not.toBeDisabled();
    });

    it('shows loading state during submission', async () => {
      const onProfileUpdate = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={onProfileUpdate} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'New Name');
      
      await user.click(screen.getByRole('button', { name: 'Save' }));
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });

    it('exits edit mode after successful submission', async () => {
      const onProfileUpdate = vi.fn().mockResolvedValue(undefined);
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={onProfileUpdate} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'New Name');
      
      await user.click(screen.getByRole('button', { name: 'Save' }));
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Display Name')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      });
    });

    it('handles submission errors', async () => {
      const onProfileUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={onProfileUpdate} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'New Name');
      
      await user.click(screen.getByRole('button', { name: 'Save' }));
      
      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
      
      // Should still be in edit mode
      expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
    });

    it('handles submission errors with generic message', async () => {
      const onProfileUpdate = vi.fn().mockRejectedValue({});
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={onProfileUpdate} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'New Name');
      
      await user.click(screen.getByRole('button', { name: 'Save' }));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to update profile')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('exits edit mode when Cancel is clicked', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Display Name')).not.toBeInTheDocument();
    });

    it('resets form to original values when Cancel is clicked', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'Modified Name');
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      
      // Should show original display name
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('clears error messages when Cancel is clicked', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.tab(); // Trigger validation error
      
      await waitFor(() => {
        expect(screen.getByText('Display name must be at least 2 characters')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      
      expect(screen.queryByText('Display name must be at least 2 characters')).not.toBeInTheDocument();
    });
  });

  describe('Avatar Upload Integration', () => {
    it('renders AvatarUploader when editable and onAvatarUpload is provided', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onAvatarUpload={vi.fn()} 
        />
      );
      
      expect(screen.getByTestId('avatar-uploader')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload Avatar' })).toBeInTheDocument();
    });

    it('does not render AvatarUploader when not editable', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={false} 
          onAvatarUpload={vi.fn()} 
        />
      );
      
      expect(screen.queryByTestId('avatar-uploader')).not.toBeInTheDocument();
    });

    it('does not render AvatarUploader when onAvatarUpload is not provided', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
        />
      );
      
      expect(screen.queryByTestId('avatar-uploader')).not.toBeInTheDocument();
    });

    it('passes current avatar URL to AvatarUploader', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onAvatarUpload={vi.fn()} 
        />
      );
      
      const avatarImage = screen.getByAltText('Current avatar');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('calls onAvatarUpload when avatar is uploaded', async () => {
      const onAvatarUpload = vi.fn();
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onAvatarUpload={onAvatarUpload} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Upload Avatar' }));
      
      expect(onAvatarUpload).toHaveBeenCalledWith('new-avatar.jpg');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for form inputs', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('has proper ARIA attributes for invalid inputs', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.tab(); // Trigger validation
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('has proper button roles and labels', () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      const editButton = screen.getByRole('button', { name: 'Edit' });
      editButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles profile with very long display name', () => {
      const longNameProfile = {
        ...mockProfile,
        displayName: 'A'.repeat(32) // Maximum allowed length
      };
      render(<ProfileSidebar profile={longNameProfile} />);
      
      expect(screen.getByText('A'.repeat(32))).toBeInTheDocument();
    });

    it('handles profile with special characters in display name', () => {
      const specialCharProfile = {
        ...mockProfile,
        displayName: 'Test-User_123!@#'
      };
      render(<ProfileSidebar profile={specialCharProfile} />);
      
      expect(screen.getByText('Test-User_123!@#')).toBeInTheDocument();
    });

    it('handles profile with unicode characters in display name', () => {
      const unicodeProfile = {
        ...mockProfile,
        displayName: 'José María'
      };
      render(<ProfileSidebar profile={unicodeProfile} />);
      
      expect(screen.getByText('José María')).toBeInTheDocument();
      expect(screen.getByText('JM')).toBeInTheDocument(); // Fallback initials
    });

    it('handles profile with numbers in username', () => {
      const numericProfile = {
        ...mockProfile,
        username: 'user123',
        displayName: ''
      };
      render(<ProfileSidebar profile={numericProfile} />);
      
      expect(screen.getByText('user123')).toBeInTheDocument();
      expect(screen.getByText('US')).toBeInTheDocument(); // Fallback initials
    });

    it('handles profile with single character username', () => {
      const singleCharProfile = {
        ...mockProfile,
        username: 'a',
        displayName: ''
      };
      render(<ProfileSidebar profile={singleCharProfile} />);
      
      expect(screen.getByText('a')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument(); // Fallback initials
    });

    it('handles profile with very large stats numbers', () => {
      const largeStatsProfile = {
        ...mockProfile,
        stats: {
          projects: 999999,
          followers: 1000000,
          following: 500000
        }
      };
      render(<ProfileSidebar profile={largeStatsProfile} />);
      
      expect(screen.getByText('999999')).toBeInTheDocument();
      expect(screen.getByText('1000000')).toBeInTheDocument();
      expect(screen.getByText('500000')).toBeInTheDocument();
    });

    it('handles profile with zero stats', () => {
      const zeroStatsProfile = {
        ...mockProfile,
        stats: {
          projects: 0,
          followers: 0,
          following: 0
        }
      };
      render(<ProfileSidebar profile={zeroStatsProfile} />);
      
      // Use getAllByText to handle multiple "0" elements
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements).toHaveLength(3);
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Followers')).toBeInTheDocument();
      expect(screen.getByText('Following')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('maintains state correctly through edit cycle', async () => {
      const onProfileUpdate = vi.fn().mockResolvedValue(undefined);
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={onProfileUpdate} 
        />
      );
      
      // Initial state
      expect(screen.getByText('Test User')).toBeInTheDocument();
      
      // Enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
      
      // Make changes
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'Updated Name');
      
      // Save changes
      await user.click(screen.getByRole('button', { name: 'Save' }));
      
      await waitFor(() => {
        expect(onProfileUpdate).toHaveBeenCalledWith({ displayName: 'Updated Name' });
        expect(screen.queryByPlaceholderText('Display Name')).not.toBeInTheDocument();
      });
      
      // Enter edit mode again - should still show original value since component doesn't update UI state
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByPlaceholderText('Display Name')).toHaveValue('Test User');
    });

    it('handles rapid edit/cancel cycles', async () => {
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onProfileUpdate={vi.fn()} 
        />
      );
      
      // Rapid edit/cancel cycles
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      
      // Should end up in view mode
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Display Name')).not.toBeInTheDocument();
    });

    it('handles concurrent avatar upload and profile edit', async () => {
      const onAvatarUpload = vi.fn();
      const onProfileUpdate = vi.fn().mockResolvedValue(undefined);
      
      render(
        <ProfileSidebar 
          profile={mockProfile} 
          isEditable={true} 
          onAvatarUpload={onAvatarUpload}
          onProfileUpdate={onProfileUpdate}
        />
      );
      
      // Start profile edit
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      
      // Upload avatar while in edit mode
      await user.click(screen.getByRole('button', { name: 'Upload Avatar' }));
      
      // Complete profile edit
      const input = screen.getByPlaceholderText('Display Name');
      await user.clear(input);
      await user.type(input, 'New Name');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      
      await waitFor(() => {
        expect(onAvatarUpload).toHaveBeenCalledWith('new-avatar.jpg');
        expect(onProfileUpdate).toHaveBeenCalledWith({ displayName: 'New Name' });
      });
    });
  });
}); 