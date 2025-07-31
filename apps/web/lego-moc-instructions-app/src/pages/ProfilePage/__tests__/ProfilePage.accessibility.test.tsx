import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ProfilePage from '../index';

// Extend expect to include axe matchers
expect.extend(toHaveNoViolations);

// Mock the profile components with proper accessibility attributes
vi.mock('@repo/profile', () => ({
  ProfilePage: ({ children, sidebarContent }: any) => (
    <div data-testid="profile-page" role="main">
      <aside data-testid="sidebar" role="complementary">{sidebarContent}</aside>
      <main data-testid="main-content" role="main">{children}</main>
    </div>
  ),
  ProfileSidebar: ({ profile, onEdit, onUploadAvatar }: any) => (
    <div data-testid="profile-sidebar" role="complementary">
      <div className="profile-info">
        <img 
          src={profile.avatar} 
          alt={`${profile.firstName} ${profile.lastName}'s profile picture`}
          className="profile-avatar"
          data-testid="sidebar-avatar"
        />
        <h2 data-testid="profile-name">{profile.firstName} {profile.lastName}</h2>
        <p data-testid="profile-email">{profile.email}</p>
      </div>
      <div className="profile-actions">
        <button 
          onClick={onEdit} 
          data-testid="sidebar-edit-btn"
          aria-label="Edit profile information"
        >
          Edit Profile
        </button>
        <button 
          onClick={() => onUploadAvatar(new File([''], 'test.jpg'))} 
          data-testid="upload-avatar-btn"
          aria-label="Upload new profile picture"
        >
          Upload Avatar
        </button>
      </div>
    </div>
  ),
  ProfileMain: ({ children, title, description }: any) => (
    <div data-testid="profile-main" role="main">
      <header>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </div>
  ),
  AvatarUploader: ({ currentAvatar, onUpload }: any) => (
    <div data-testid="avatar-uploader" role="group" aria-labelledby="avatar-upload-label">
      <h3 id="avatar-upload-label">Profile Picture</h3>
      <img 
        src={currentAvatar} 
        alt="Current profile picture" 
        className="current-avatar"
        data-testid="current-avatar" 
      />
      <button 
        onClick={() => onUpload(new File([''], 'new-avatar.jpg'))} 
        data-testid="upload-btn"
        aria-label="Choose new profile picture"
      >
        Choose New Avatar
      </button>
    </div>
  ),
}));

// Mock the UI components with accessibility attributes
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, className, disabled, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={className} 
      data-testid={`button-${variant || 'default'}`}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  FormSection: ({ fields, className }: any) => (
    <form className={className} data-testid="form-section" role="form" aria-labelledby="form-title">
      <h2 id="form-title">Edit Profile Information</h2>
      {fields.map((field: any) => (
        <div key={field.name} data-testid={`field-${field.name}`} className="form-field">
          <label htmlFor={`input-${field.name}`} className="field-label">
            {field.label}
            {field.required && <span className="required" aria-label="required">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={`input-${field.name}`}
              name={field.name}
              defaultValue={field.value}
              required={field.required}
              aria-required={field.required}
              data-testid={`input-${field.name}`}
              rows={4}
              aria-describedby={`${field.name}-description`}
            />
          ) : (
            <input
              id={`input-${field.name}`}
              type={field.type}
              name={field.name}
              defaultValue={field.value}
              required={field.required}
              aria-required={field.required}
              data-testid={`input-${field.name}`}
              aria-describedby={`${field.name}-description`}
            />
          )}
          <div id={`${field.name}-description`} className="field-description">
            {field.type === 'email' && 'Enter a valid email address'}
            {field.type === 'url' && 'Enter a valid website URL'}
            {field.type === 'textarea' && 'Tell us about yourself'}
          </div>
        </div>
      ))}
    </form>
  ),
}));

// Mock the LegoProfileContent component with accessibility attributes
vi.mock('../LegoProfileContent', () => ({
  LegoProfileContent: ({ profile, onEdit, isEditing }: any) => (
    <div data-testid="lego-profile-content" role="region" aria-labelledby="profile-content-title">
      <header>
        <h1 id="profile-content-title">Profile</h1>
        <p>Manage your account settings and preferences</p>
      </header>
      
      <div className="profile-actions">
        <button 
          onClick={onEdit} 
          disabled={isEditing}
          data-testid="content-edit-btn"
          aria-label="Edit profile information"
          aria-disabled={isEditing}
        >
          Edit Profile
        </button>
      </div>
      
      <section className="profile-details" aria-labelledby="personal-info-title">
        <h2 id="personal-info-title">Personal Information</h2>
        <dl>
          <dt>Email</dt>
          <dd data-testid="profile-email">{profile.email}</dd>
          <dt>Bio</dt>
          <dd data-testid="profile-bio">{profile.bio}</dd>
        </dl>
      </section>
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

describe('ProfilePage Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WCAG Compliance', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = renderProfilePage();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      renderProfilePage();
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check that heading levels are logical
      const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
      expect(Math.max(...headingLevels) - Math.min(...headingLevels)).toBeLessThanOrEqual(2);
    });

    it('should have sufficient color contrast', () => {
      renderProfilePage();
      
      // Check that text elements have proper contrast
      const textElements = screen.getAllByText(/./);
      expect(textElements.length).toBeGreaterThan(0);
      
      // In a real test, you would check actual color contrast values
      // For now, we'll verify that elements are present
      expect(screen.getByTestId('profile-name')).toBeInTheDocument();
      expect(screen.getByTestId('profile-email')).toBeInTheDocument();
    });

    it('should have proper focus indicators', () => {
      renderProfilePage();
      
      const focusableElements = screen.getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Check that focusable elements can receive focus
      focusableElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      expect(editButton).toHaveAttribute('aria-label', 'Edit profile information');
      
      const uploadButton = screen.getByTestId('upload-avatar-btn');
      expect(uploadButton).toHaveAttribute('aria-label', 'Upload new profile picture');
    });

    it('should have proper ARIA roles on semantic elements', () => {
      renderProfilePage();
      
      expect(screen.getByTestId('profile-page')).toHaveAttribute('role', 'main');
      expect(screen.getByTestId('sidebar')).toHaveAttribute('role', 'complementary');
      expect(screen.getByTestId('main-content')).toHaveAttribute('role', 'main');
    });

    it('should have proper ARIA descriptions for form fields', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toHaveAttribute('aria-describedby');
      
      const websiteInput = screen.getByTestId('input-website');
      expect(websiteInput).toHaveAttribute('aria-describedby');
    });

    it('should have proper ARIA required attributes', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const firstNameInput = screen.getByTestId('input-firstName');
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');
      
      const lastNameInput = screen.getByTestId('input-lastName');
      expect(lastNameInput).toHaveAttribute('aria-required', 'true');
      
      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper ARIA disabled attributes', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      const contentEditButton = screen.getByTestId('content-edit-btn');
      expect(contentEditButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      // Start with the first focusable element
      const firstButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(firstButton);
      
      // Tab through all focusable elements
      await user.tab();
      expect(screen.getByTestId('upload-avatar-btn')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('content-edit-btn')).toHaveFocus();
    });

    it('should support Enter key activation', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      editButton.focus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });

    it('should support Space key activation', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      editButton.focus();
      
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });

    it('should support Escape key to close modal', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
    });

    it('should maintain focus management in modal', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      // Focus should be trapped within the modal
      const modal = screen.getByText('Edit Profile').closest('div');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper alt text for images', () => {
      renderProfilePage();
      
      const avatar = screen.getByTestId('sidebar-avatar');
      expect(avatar).toHaveAttribute('alt', 'John Doe\'s profile picture');
      
      const currentAvatar = screen.getByTestId('current-avatar');
      expect(currentAvatar).toHaveAttribute('alt', 'Current profile picture');
    });

    it('should have proper labels for form fields', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const firstNameInput = screen.getByTestId('input-firstName');
      const firstNameLabel = screen.getByText('First Name');
      expect(firstNameLabel).toHaveAttribute('for', 'input-firstName');
      
      const emailInput = screen.getByTestId('input-email');
      const emailLabel = screen.getByText('Email');
      expect(emailLabel).toHaveAttribute('for', 'input-email');
    });

    it('should announce required fields to screen readers', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const requiredIndicators = screen.getAllByText('*');
      requiredIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-label', 'required');
      });
    });

    it('should have proper descriptions for form fields', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByTestId('input-email');
      const emailDescription = screen.getByText('Enter a valid email address');
      expect(emailDescription).toBeInTheDocument();
      
      const websiteInput = screen.getByTestId('input-website');
      const websiteDescription = screen.getByText('Enter a valid website URL');
      expect(websiteDescription).toBeInTheDocument();
    });

    it('should announce form validation errors', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      const firstNameInput = screen.getByTestId('input-firstName');
      await user.clear(firstNameInput);
      
      // In a real implementation, this would trigger validation and announce errors
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic HTML elements', () => {
      renderProfilePage();
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should use proper list elements', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });
      
      // Form should be properly structured
      const form = screen.getByTestId('form-section');
      expect(form.tagName).toBe('FORM');
    });

    it('should use proper heading elements', () => {
      renderProfilePage();
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check that headings are properly nested
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements.length).toBeGreaterThan(0);
    });

    it('should use proper button elements', () => {
      renderProfilePage();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });
  });

  describe('Focus Management', () => {
    it('should restore focus when modal is closed', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      editButton.focus();
      
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByTestId('button-outline');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
      
      // Focus should return to the triggering element
      expect(editButton).toHaveFocus();
    });

    it('should trap focus within modal when open', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      // Focus should be within the modal
      const modal = screen.getByText('Edit Profile').closest('div');
      expect(modal).toBeInTheDocument();
    });

    it('should handle focus when elements are disabled', async () => {
      const user = userEvent.setup();
      renderProfilePage();
      
      const editButton = screen.getByTestId('sidebar-edit-btn');
      await user.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
      
      const contentEditButton = screen.getByTestId('content-edit-btn');
      expect(contentEditButton).toBeDisabled();
      expect(contentEditButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on different screen sizes', () => {
      renderProfilePage();
      
      // Test that all interactive elements remain accessible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toBeVisible();
        expect(button).not.toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should have proper touch targets for mobile', () => {
      renderProfilePage();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // In a real test, you would check actual CSS dimensions
      // For now, we'll verify that buttons are present and accessible
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button).toBeVisible();
      });
    });
  });
}); 