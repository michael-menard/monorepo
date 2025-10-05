import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../index';
import type { Profile } from '@repo/profile';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the shared layout components (new system)
vi.mock('@repo/profile', () => ({
  ProfileLayout: ({ children, sidebarContent, className, sidebarWidth, leftOffset, stickysidebar, sidebarBackground }: any) => (
    <div 
      data-testid="profile-layout" 
      className={className}
      data-sidebar-width={sidebarWidth}
      data-left-offset={leftOffset}
      data-sticky={stickysidebar}
      data-background={sidebarBackground}
    >
      <div data-testid="profile-layout-sidebar">{sidebarContent}</div>
      <div data-testid="profile-layout-content">{children}</div>
    </div>
  ),
  ProfileLayoutSidebar: ({ avatar, profileInfo, additionalContent }: any) => (
    <div data-testid="profile-layout-sidebar-content">
      <div data-testid="sidebar-avatar-section">{avatar}</div>
      <div data-testid="sidebar-profile-info-section">{profileInfo}</div>
      <div data-testid="sidebar-additional-content-section">{additionalContent}</div>
    </div>
  ),
  ProfileAvatar: ({ 
    avatarUrl, 
    userName, 
    userEmail, 
    size, 
    editable, 
    onAvatarUpload, 
    showStatus, 
    isOnline, 
    showVerified, 
    isVerified, 
    className 
  }: any) => (
    <div data-testid="profile-avatar" className={className} data-size={size}>
      <div data-testid="avatar-container" className="relative group">
        <img 
          src={avatarUrl} 
          alt={`${userName}'s avatar`} 
          data-testid="avatar-image" 
        />
        {editable && onAvatarUpload && (
          <div 
            data-testid="avatar-hover-overlay"
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full cursor-pointer"
            onClick={() => onAvatarUpload(new File([''], 'test.jpg', { type: 'image/jpeg' }))}
          >
            <svg data-testid="pencil-icon" className="text-white h-6 w-6">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
        )}
        {showStatus && (
          <div data-testid="avatar-status" data-online={isOnline}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        )}
        {showVerified && isVerified && (
          <div data-testid="avatar-verified">✓</div>
        )}
      </div>
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        data-testid="avatar-file-input"
      />
    </div>
  ),
  ProfileAvatarInfo: ({ userName, userEmail, username, title, location, joinDate, badges }: any) => (
    <div data-testid="profile-avatar-info">
      <div data-testid="user-name">{userName}</div>
      <div data-testid="user-email">{userEmail}</div>
      {username && <div data-testid="username">@{username}</div>}
      {title && <div data-testid="user-title">{title}</div>}
      {location && <div data-testid="user-location">{location}</div>}
      {joinDate && <div data-testid="join-date">{joinDate.toLocaleDateString()}</div>}
      {badges && badges.map((badge: any, index: number) => (
        <div key={index} data-testid={`badge-${index}`} data-variant={badge.variant}>
          {badge.label}
        </div>
      ))}
    </div>
  ),
}));

// Mock the profile package components (legacy system still used for some parts)
vi.mock('@repo/profile', () => ({
  ProfileMain: ({ children, title, description }: any) => (
    <div data-testid="profile-main">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
  AvatarUploader: ({ currentAvatar, onUpload, isLoading }: any) => (
    <div data-testid="avatar-uploader" data-loading={isLoading}>
      <img src={currentAvatar} alt="Avatar" data-testid="current-avatar" />
      <button onClick={() => onUpload(new File([''], 'new-avatar.jpg'))} data-testid="upload-btn">
        Upload
      </button>
    </div>
  ),
}));

// Mock the UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, className, disabled, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className} 
      disabled={disabled}
      data-testid={`button-${variant || 'default'}`} 
      {...props}
    >
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
            defaultValue={field.value} 
            required={field.required}
            data-testid={`input-${field.name}`}
          />
        </div>
      ))}
    </form>
  ),
}));

// Mock the LegoProfileContent component
vi.mock('../LegoProfileContent', () => ({
  LegoProfileContent: ({ profile, onEdit, isEditing }: any) => (
    <div data-testid="lego-profile-content">
      <div data-testid="welcome-header">Welcome to {profile.firstName}'s LEGO Workshop!</div>
      <div data-testid="content-tabs">
        <div data-testid="tab-mocs">MOCs</div>
        <div data-testid="tab-instructions">Instructions</div>
        <div data-testid="tab-favorites">Favorites</div>
        <div data-testid="tab-achievements">Achievements</div>
      </div>
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

const renderProfilePage = () => {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  );
};

describe('ProfilePage with New Layout System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout Structure', () => {
    it('should render the new ProfileLayout system', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('profile-layout-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('profile-layout-content')).toBeInTheDocument();
    });

    it('should configure ProfileLayout with correct props', () => {
      renderProfilePage();
      
      const layout = screen.getByTestId('profile-layout');
      expect(layout).toHaveAttribute('data-sidebar-width', 'wide');
      expect(layout).toHaveAttribute('data-left-offset', 'medium');
      expect(layout).toHaveAttribute('data-sticky', 'true');
      expect(layout).toHaveAttribute('data-background', 'default');
      expect(layout).toHaveClass('bg-gradient-to-br');
    });

    it('should render ProfileLayoutSidebar with all sections', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-layout-sidebar-content')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-avatar-section')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-profile-info-section')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-additional-content-section')).toBeInTheDocument();
    });
  });

  describe('Enhanced Avatar Component', () => {
    it('should render ProfileAvatar with correct props', () => {
      renderProfilePage();
      
      const avatar = screen.getByTestId('profile-avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('data-size', '2xl');
      expect(avatar).toHaveClass('hover:scale-105');
    });

    it('should show avatar image with correct alt text', () => {
      renderProfilePage();
      
      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('alt', "John Doe's avatar");
      expect(avatarImage).toHaveAttribute('src', expect.stringContaining('unsplash.com'));
    });

    it('should show hover overlay with pencil icon when editable', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('avatar-hover-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
    });

    it('should show status and verification indicators', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('avatar-status')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-verified')).toBeInTheDocument();
    });

    it('should handle avatar upload when clicked', async () => {
      renderProfilePage();
      
      const hoverOverlay = screen.getByTestId('avatar-hover-overlay');
      fireEvent.click(hoverOverlay);
      
      // Should trigger file upload (mocked)
      expect(screen.getByTestId('avatar-file-input')).toBeInTheDocument();
    });
  });

  describe('Profile Information Display', () => {
    it('should display user information correctly', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('user-email')).toHaveTextContent('john.doe@example.com');
      expect(screen.getByTestId('username')).toHaveTextContent('@johndoe');
      expect(screen.getByTestId('user-title')).toHaveTextContent('LEGO Builder');
    });

    it('should show badges correctly', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('badge-0')).toHaveTextContent('Verified Builder');
      expect(screen.getByTestId('badge-0')).toHaveAttribute('data-variant', 'default');
      expect(screen.getByTestId('badge-1')).toHaveTextContent('Active Member');
      expect(screen.getByTestId('badge-1')).toHaveAttribute('data-variant', 'secondary');
    });
  });

  describe('LEGO-Themed Content', () => {
    it('should render LegoProfileContent component', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('lego-profile-content')).toBeInTheDocument();
      expect(screen.getByTestId('welcome-header')).toHaveTextContent("Welcome to John's LEGO Workshop!");
    });

    it('should show LEGO-specific tabs', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('tab-mocs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-instructions')).toBeInTheDocument();
      expect(screen.getByTestId('tab-favorites')).toBeInTheDocument();
      expect(screen.getByTestId('tab-achievements')).toBeInTheDocument();
    });
  });

  describe('Navigation and Actions', () => {
    it('should display the back button', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('button-outline')).toBeInTheDocument();
      expect(screen.getByText('← Back to Home')).toBeInTheDocument();
    });

    it('should handle back navigation', () => {
      renderProfilePage();
      
      const backButton = screen.getByText('← Back to Home');
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should show edit profile button', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('content-edit-btn')).toBeInTheDocument();
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
  });
});
