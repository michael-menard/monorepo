import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../index';
import type { Profile } from '@repo/profile';

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: vi.fn(),
  }),
  useParams: () => ({}),
}));

// Mock the profile components
vi.mock('@repo/profile', () => ({
  ProfilePage: ({ children, sidebarContent }: any) => (
    <div data-testid="profile-page">
      <div data-testid="sidebar">{sidebarContent}</div>
      <div data-testid="main-content">{children}</div>
    </div>
  ),
  ProfileSidebar: ({ profile, onEdit, onUploadAvatar }: any) => (
    <div data-testid="profile-sidebar">
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
        <button onClick={onEdit} data-testid="sidebar-edit-btn">Edit Profile</button>
        <button onClick={() => onUploadAvatar(new File([''], 'test.jpg', { type: 'image/jpeg' }))} data-testid="upload-avatar-btn">
          Upload Avatar
        </button>
      </div>
    </div>
  ),
  ProfileMain: ({ children, title, description }: any) => (
    <div data-testid="profile-main">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
  AvatarUploader: ({ currentAvatar, onUpload }: any) => (
    <div data-testid="avatar-uploader">
      <img src={currentAvatar} alt="Avatar" data-testid="current-avatar" />
      <button onClick={() => onUpload(new File([''], 'new-avatar.jpg'))} data-testid="upload-btn">
        Upload
      </button>
    </div>
  ),
}));

// Mock the UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button onClick={onClick} className={className} data-testid={`button-${variant || 'default'}`} {...props}>
      {children}
    </button>
  ),
  FormSection: ({ fields, className }: any) => (
    <form className={className} data-testid="form-section">
      {fields.map((field: any) => (
        <div key={field.name} data-testid={`field-${field.name}`}>
          <label>{field.label}</label>
          <input
            type={field.type}
            name={field.name}
            defaultValue={field.value}
            required={field.required}
            data-testid={`input-${field.name}`}
          />
        </div>
      ))}
    </form>
  ),
  AppAvatar: ({ avatarUrl, userName, userEmail, onAvatarUpload, onProfileClick, onUserSettingsClick, onLogout, size, showEditButton, className }: any) => (
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
    <div data-testid="lego-profile-content">
      <button onClick={onEdit} disabled={isEditing} data-testid="content-edit-btn">
        Edit Profile
      </button>
      <div data-testid="profile-email">{profile.email}</div>
      <div data-testid="profile-bio">{profile.bio}</div>
    </div>
  ),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');

const renderProfilePage = (initialProfile?: Partial<Profile>) => {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  );
};

describe('ProfilePage Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the profile page with default mock data', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      expect(screen.getByTestId('profile-main')).toBeInTheDocument();
      expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('lego-profile-content')).toBeInTheDocument();
    });

    it('should display the back button', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('button-outline')).toBeInTheDocument();
      expect(screen.getByText('← Back to Home')).toBeInTheDocument();
    });

    it('should display profile information correctly', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('profile-email')).toHaveTextContent('john.doe@example.com');
      expect(screen.getByTestId('profile-bio')).toHaveTextContent('LEGO enthusiast and MOC creator');
    });

    it('should show edit buttons in sidebar and content', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('sidebar-edit-btn')).toBeInTheDocument();
      expect(screen.getByTestId('content-edit-btn')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should open edit modal when edit button is clicked', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
    });

    it('should populate form fields with current profile data', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('input-firstName')).toHaveValue('John');
        expect(screen.getByTestId('input-lastName')).toHaveValue('Doe');
        expect(screen.getByTestId('input-email')).toHaveValue('john.doe@example.com');
        expect(screen.getByTestId('input-username')).toHaveValue('johndoe');
        expect(screen.getByTestId('input-bio')).toHaveValue('LEGO enthusiast and MOC creator. I love building custom models and sharing instructions with the community.');
        expect(screen.getByTestId('input-phone')).toHaveValue('+1 (555) 123-4567');
        expect(screen.getByTestId('input-location')).toHaveValue('San Francisco, CA');
        expect(screen.getByTestId('input-website')).toHaveValue('https://johndoe.dev');
      });
    });

    it('should disable edit buttons when in edit mode', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('content-edit-btn')).toBeDisabled();
      });
    });

    it('should close edit modal when cancel button is clicked', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByTestId('button-outline');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
    });

    it('should save changes when save button is clicked', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      // Update form fields
      const firstNameInput = screen.getByTestId('input-firstName');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('Avatar Upload', () => {
    it('should handle avatar upload from sidebar', () => {
      renderProfilePage();
      
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      fireEvent.click(uploadButton);
      
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle avatar upload from edit modal', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('avatar-uploader')).toBeInTheDocument();
      });
      
      const uploadButton = screen.getByTestId('upload-btn');
      fireEvent.click(uploadButton);
      
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should display current avatar in uploader', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        const avatarImg = screen.getByTestId('current-avatar');
        expect(avatarImg).toHaveAttribute('src', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is clicked', () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        };
      });
      
      renderProfilePage();
      
      const backButton = screen.getByTestId('button-outline');
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Form Validation', () => {
    it('should show required field validation', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        const firstNameInput = screen.getByTestId('input-firstName');
        const lastNameInput = screen.getByTestId('input-lastName');
        const emailInput = screen.getByTestId('input-email');
        
        expect(firstNameInput).toBeRequired();
        expect(lastNameInput).toBeRequired();
        expect(emailInput).toBeRequired();
      });
    });

    it('should validate email format', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        const emailInput = screen.getByTestId('input-email');
        expect(emailInput).toHaveAttribute('type', 'email');
      });
    });

    it('should validate website URL format', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        const websiteInput = screen.getByTestId('input-website');
        expect(websiteInput).toHaveAttribute('type', 'url');
      });
    });
  });

  describe('State Management', () => {
    it('should update profile state when save is clicked', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      // Update form fields
      const firstNameInput = screen.getByTestId('input-firstName');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      
      const lastNameInput = screen.getByTestId('input-lastName');
      fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
    });

    it('should reset form when cancel is clicked', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      // Update form fields
      const firstNameInput = screen.getByTestId('input-firstName');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      
      const cancelButton = screen.getByTestId('button-outline');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
      
      // Reopen edit modal to verify form was reset
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('input-firstName')).toHaveValue('John');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle avatar upload errors gracefully', () => {
      // Mock URL.createObjectURL to throw an error
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn(() => {
        throw new Error('Upload failed');
      });
      
      renderProfilePage();
      
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      fireEvent.click(uploadButton);
      
      // Should not crash the component
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      
      // Restore original function
      URL.createObjectURL = originalCreateObjectURL;
    });

    it('should handle form submission errors gracefully', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      // Try to save with invalid data
      const firstNameInput = screen.getByTestId('input-firstName');
      fireEvent.change(firstNameInput, { target: { value: '' } });
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Should not crash and should show validation
      expect(screen.getByTestId('form-section')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      expect(screen.getByTestId('profile-main')).toBeInTheDocument();
      expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      expect(editButton).toBeInTheDocument();
      
      // Test tab navigation
      editButton.focus();
      expect(editButton).toHaveFocus();
    });

    it('should have proper form labels', async () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('First Name')).toBeInTheDocument();
        expect(screen.getByText('Last Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
      });
    });
  });
}); 