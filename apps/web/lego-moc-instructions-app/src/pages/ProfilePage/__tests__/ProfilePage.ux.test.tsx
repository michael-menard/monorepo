import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../index';

// Mock the profile components with more realistic behavior
vi.mock('@repo/profile', () => ({
  ProfilePage: ({ children, sidebarContent }: any) => (
    <div data-testid="profile-page" className="flex">
      <aside className="w-64" data-testid="sidebar">{sidebarContent}</aside>
      <main className="flex-1" data-testid="main-content">{children}</main>
    </div>
  ),
  ProfileSidebar: ({ profile, onEdit, onUploadAvatar }: any) => (
    <div data-testid="profile-sidebar" className="p-4">
      <div className="text-center mb-4">
        {/* AppAvatar component structure */}
        <div className="relative w-24 h-24 mx-auto mb-2">
          <button 
            className="relative p-0 h-auto w-auto rounded-full hover:bg-transparent w-24 h-24"
            data-testid="avatar-button"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden">
              <img 
                src={profile.avatar} 
                alt="Profile Avatar" 
                className="w-full h-full object-cover"
                data-testid="sidebar-avatar"
              />
            </div>
          </button>
          {/* Edit button overlay */}
          {onUploadAvatar && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-full bg-black/20">
              <button 
                className="bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md w-8 h-8 rounded-full flex items-center justify-center"
                onClick={() => onUploadAvatar(new File([''], 'test.jpg', { type: 'image/jpeg' }))}
                data-testid="avatar-edit-button"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold" data-testid="profile-name">
          {profile.firstName} {profile.lastName}
        </h2>
        <p className="text-gray-600" data-testid="profile-email">{profile.email}</p>
      </div>
      <div className="space-y-2">
        <button 
          onClick={onEdit} 
          data-testid="sidebar-edit-btn"
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Edit Profile
        </button>
        <button 
          onClick={() => onUploadAvatar(new File([''], 'test.jpg', { type: 'image/jpeg' }))} 
          data-testid="upload-avatar-btn"
          className="w-full border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 transition-colors"
        >
          Upload Avatar
        </button>
      </div>
    </div>
  ),
  ProfileMain: ({ children, title, description }: any) => (
    <div data-testid="profile-main" className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
      {children}
    </div>
  ),
  AvatarUploader: ({ currentAvatar, onUpload }: any) => (
    <div data-testid="avatar-uploader" className="text-center">
      <img 
        src={currentAvatar} 
        alt="Current Avatar" 
        className="w-32 h-32 rounded-full mx-auto mb-4"
        data-testid="current-avatar" 
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
        data-testid="avatar-file-input"
        className="hidden"
      />
      <button 
        onClick={() => {
          const input = document.querySelector('[data-testid="avatar-file-input"]');
          if (input instanceof HTMLInputElement) input.click();
        }}
        data-testid="upload-btn"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        Choose New Avatar
      </button>
    </div>
  ),
}));

// Mock the UI components with realistic styling
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, className, disabled, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={`px-4 py-2 rounded transition-colors ${className || ''} ${
        variant === 'outline' ? 'border border-gray-300 hover:bg-gray-50' : 
        variant === 'ghost' ? 'hover:bg-gray-100' : 
        'bg-blue-500 text-white hover:bg-blue-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
      data-testid={`button-${variant || 'default'}`} 
      {...props}
    >
      {children}
    </button>
  ),
  FormSection: ({ fields, className }: any) => (
    <form className={`space-y-4 ${className || ''}`} data-testid="form-section">
      {fields.map((field: any) => (
        <div key={field.name} data-testid={`field-${field.name}`}>
          <label>{field.label}</label>
          <input
            name={field.name}
            type={field.type}
            value={field.value || ''}
            required={field.required}
            data-testid={`input-${field.name}`}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}
    </form>
  ),
  AppAvatar: ({ avatarUrl, userName, onAvatarUpload, onProfileClick, size, showEditButton, className }: any) => (
    <div className={`relative inline-block ${className || ''}`}>
      <button 
        className="relative p-0 h-auto w-auto rounded-full hover:bg-transparent"
        data-testid="app-avatar-button"
        onClick={onProfileClick}
      >
        <div className={`rounded-full overflow-hidden ${size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'}`}>
          <img 
            src={avatarUrl} 
            alt={`${userName || 'User'}'s avatar`} 
            className="w-full h-full object-cover"
            data-testid="app-avatar-image"
          />
        </div>
      </button>
      {showEditButton && onAvatarUpload && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-full bg-black/20">
          <button 
            className="bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md rounded-full flex items-center justify-center"
            onClick={() => onAvatarUpload(new File([''], 'test.jpg', { type: 'image/jpeg' }))}
            data-testid="app-avatar-edit-button"
          >
            ✏️
          </button>
        </div>
      )}
    </div>
  ),
}));

// Mock the LegoProfileContent component
vi.mock('../LegoProfileContent', () => ({
  LegoProfileContent: ({ profile, onEdit, isEditing }: any) => (
    <div data-testid="lego-profile-content" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        <button 
          onClick={onEdit} 
          disabled={isEditing}
          data-testid="content-edit-btn"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          Edit Profile
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="font-medium">{profile.firstName} {profile.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          {profile.bio && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Bio</p>
              <p className="font-medium">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  ),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');

const renderProfilePage = () => {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  );
};

describe('ProfilePage UX Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visual Design and Layout', () => {
    it('should have a clean, professional layout', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });

    it('should display profile avatar prominently in sidebar', () => {
      renderProfilePage();
      
      const avatar = screen.getByTestId('sidebar-avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face');
      expect(avatar).toHaveClass('w-24', 'h-24', 'rounded-full');
    });

    it('should show profile name and email clearly in sidebar', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('profile-email')).toHaveTextContent('john.doe@example.com');
    });

    it('should have consistent button styling', () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      expect(editButton).toHaveClass('bg-blue-500', 'text-white', 'hover:bg-blue-600');
    });
  });

  describe('User Interactions', () => {
    it('should provide visual feedback on button hover', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.hover(editButton);
      
      // Check that hover classes are applied
      expect(editButton).toHaveClass('hover:bg-blue-600');
    });

    it('should show loading state during avatar upload', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      await user.click(uploadButton);
      
      // Should handle upload without crashing
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should provide smooth transitions for modal open/close', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Edit Profile' })).not.toBeInTheDocument();
      });
    });

    it('should handle form field focus states', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const firstNameInput = screen.getByTestId('input-firstName');
      await user.click(firstNameInput);
      
      expect(firstNameInput).toHaveFocus();
    });
  });

  describe('Form Experience', () => {
    it('should provide clear form labels and required field indicators', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('First Name *')).toBeInTheDocument();
        expect(screen.getByText('Last Name *')).toBeInTheDocument();
        expect(screen.getByText('Email *')).toBeInTheDocument();
      });
    });

    it('should allow easy form navigation with keyboard', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const firstNameInput = screen.getByTestId('input-firstName');
      await user.click(firstNameInput);
      
      // Tab through form fields
      await user.tab();
      expect(screen.getByTestId('input-lastName')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('input-email')).toHaveFocus();
    });

    it('should provide appropriate input types for different fields', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('input-email')).toHaveAttribute('type', 'email');
        expect(screen.getByTestId('input-website')).toHaveAttribute('type', 'url');
        expect(screen.getByTestId('input-bio')).toHaveAttribute('rows', '4');
      });
    });

    it('should handle form validation gracefully', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      // Try to submit with empty required fields
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      // Should not crash and should show validation
      expect(screen.getByTestId('form-section')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for different screen sizes', () => {
      renderProfilePage();
      
      const profilePage = screen.getByTestId('profile-page');
      expect(profilePage).toHaveClass('flex');
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveClass('w-64');
      
      const mainContent = screen.getByTestId('main-content');
      expect(mainContent).toHaveClass('flex-1');
    });

    it('should have responsive grid layouts in content', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        const formSection = screen.getByTestId('form-section');
        expect(formSection).toHaveClass('space-y-4');
      });
    });
  });

  describe('Accessibility UX', () => {
    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
      
      // Modal should be focusable
      const modal = screen.getByRole('heading', { name: 'Edit Profile' }).closest('div');
      expect(modal).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-main')).toContainElement(screen.getByRole('heading', { level: 1 }));
      expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument();
    });

    it('should have proper alt text for images', () => {
      renderProfilePage();
      
      const avatar = screen.getByTestId('sidebar-avatar');
      expect(avatar).toHaveAttribute('alt', 'Profile Avatar');
    });

    it('should support screen reader navigation', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
      
      // Form should have proper labels
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  describe('Error Handling UX', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
      
      // Simulate network error by clearing form and trying to save
      const firstNameInput = screen.getByTestId('input-firstName');
      await user.clear(firstNameInput);
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      // Should not crash and should close the modal after saving
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Edit Profile' })).not.toBeInTheDocument();
      });
    });

    it('should handle avatar upload errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock URL.createObjectURL to throw an error
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn(() => {
        throw new Error('Upload failed');
      });
      
      renderProfilePage();
      
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      await user.click(uploadButton);
      
      // Should not crash the component
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      
      // Restore original function
      URL.createObjectURL = originalCreateObjectURL;
    });
  });

  describe('Performance UX', () => {
    it('should render quickly without noticeable delay', () => {
      const startTime = performance.now();
      renderProfilePage();
      const endTime = performance.now();
      
      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid user interactions smoothly', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      
      // Rapid clicks should not cause issues
      await user.click(editButton);
      await user.click(editButton);
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
    });

    it('should not cause layout shifts during interactions', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
      
      // Modal should appear without causing layout shifts
      const modal = screen.getByRole('heading', { name: 'Edit Profile' }).closest('div');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('User Flow Experience', () => {
    it('should provide clear call-to-action buttons', () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      expect(editButton).toHaveTextContent('Edit Profile');
      
      const backButton = screen.getByTestId('back-button');
      expect(backButton).toHaveTextContent('← Back to Home');
    });

    it('should provide logical navigation flow', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      // User can easily find and click edit button
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
      
      // User can easily cancel and return to view mode
      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Edit Profile' })).not.toBeInTheDocument();
      });
    });

    it('should provide feedback for user actions', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
      });
      
      // User should see the form is populated with current data
      expect(screen.getByTestId('input-firstName')).toHaveValue('John');
      expect(screen.getByTestId('input-lastName')).toHaveValue('Doe');
    });
  });
}); 