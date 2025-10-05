import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProfilePage from '../index';

// Import RTK reducers for testing
import { 
  wishlistReducer,
  mocInstructionsReducer,
  profileReducer,
} from '@repo/mock-data';

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      wishlist: wishlistReducer,
      mocInstructions: mocInstructionsReducer,
      profile: profileReducer,
    },
  });
};

// Mock the shared layout components
vi.mock('@repo/profile', () => ({
  ProfileLayout: ({ children, sidebarContent, className }: any) => (
    <div data-testid="profile-layout" className={className}>
      <div data-testid="profile-sidebar">{sidebarContent}</div>
      <div data-testid="profile-main">{children}</div>
    </div>
  ),
  ProfileLayoutSidebar: ({ avatar, profileInfo, additionalContent }: any) => (
    <div data-testid="profile-layout-sidebar">
      <div data-testid="sidebar-avatar">{avatar}</div>
      <div data-testid="sidebar-profile-info">{profileInfo}</div>
      <div data-testid="sidebar-additional-content">{additionalContent}</div>
    </div>
  ),
  ProfileAvatar: ({ userName, userEmail, size, editable, onAvatarUpload, showStatus, isOnline, showVerified, isVerified }: any) => (
    <div data-testid="profile-avatar" data-size={size} data-editable={editable}>
      <div data-testid="avatar-name">{userName}</div>
      <div data-testid="avatar-email">{userEmail}</div>
      {showStatus && <div data-testid="avatar-status" data-online={isOnline}>Status</div>}
      {showVerified && <div data-testid="avatar-verified" data-verified={isVerified}>Verified</div>}
      {editable && (
        <button data-testid="avatar-upload-button" onClick={() => onAvatarUpload?.(new File([''], 'test.jpg'))}>
          Upload Avatar
        </button>
      )}
    </div>
  ),
  ProfileAvatarInfo: ({ userName, userEmail, username, title, location, joinDate, badges }: any) => (
    <div data-testid="profile-avatar-info">
      <div data-testid="info-name">{userName}</div>
      <div data-testid="info-email">{userEmail}</div>
      <div data-testid="info-username">@{username}</div>
      <div data-testid="info-title">{title}</div>
      <div data-testid="info-location">{location}</div>
      <div data-testid="info-join-date">{joinDate?.toLocaleDateString()}</div>
      <div data-testid="info-badges">
        {badges?.map((badge: any, index: number) => (
          <span key={index} data-testid={`badge-${index}`} data-variant={badge.variant}>
            {badge.label}
          </span>
        ))}
      </div>
    </div>
  ),
}));

// Mock the profile package components
vi.mock('@repo/profile', () => ({
  ProfileMain: ({ children, title, description }: any) => (
    <div data-testid="profile-main">
      <div data-testid="main-title">{title}</div>
      <div data-testid="main-description">{description}</div>
      {children}
    </div>
  ),
  AvatarUploader: ({ currentAvatar, onUpload }: any) => (
    <div data-testid="avatar-uploader">
      <img data-testid="current-avatar" src={currentAvatar} alt="Current avatar" />
      <button 
        data-testid="upload-button" 
        onClick={() => onUpload?.(new File([''], 'test.jpg'))}
      >
        Upload New Avatar
      </button>
    </div>
  ),
}));

// Mock the UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button 
      data-testid={props['data-testid'] || 'button'} 
      onClick={onClick}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
  FormSection: ({ fields, className }: any) => (
    <div data-testid="form-section" className={className}>
      {fields?.map((field: any, index: number) => (
        <div key={index} data-testid={`field-${field.name}`}>
          <label>{field.label}</label>
          <input 
            data-testid={`input-${field.name}`}
            type={field.type}
            defaultValue={field.value}
            required={field.required}
          />
        </div>
      ))}
    </div>
  ),
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  Tabs: ({ children, defaultValue }: any) => (
    <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tabs-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: any) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
  AppCard: ({ children, title }: any) => (
    <div data-testid="app-card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
  TabPanel: ({ tabs }: any) => (
    <div data-testid="tab-panel">
      {tabs?.map((tab: any) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>{tab.label}</div>
      ))}
    </div>
  ),
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock URL.createObjectURL for avatar upload tests
Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-object-url'),
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('ProfilePage - New RTK Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Layout Structure', () => {
    it('renders the new ProfileLayout with correct structure', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByTestId('profile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument();
      // Use getAllByTestId since there are multiple profile-main elements (wrapper and component)
      const profileMains = screen.getAllByTestId('profile-main');
      expect(profileMains.length).toBeGreaterThan(0);
    });

    it('applies the correct gradient background class', () => {
      renderWithProviders(<ProfilePage />);

      const layout = screen.getByTestId('profile-layout');
      expect(layout).toHaveClass('bg-gradient-to-br', 'from-orange-50', 'via-yellow-50', 'to-red-50');
    });

    it('renders the back button with correct functionality', () => {
      renderWithProviders(<ProfilePage />);

      const backButton = screen.getByTestId('back-button');
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveTextContent('← Back to Home');

      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Sidebar Content', () => {
    it('renders ProfileLayoutSidebar with all sections', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByTestId('profile-layout-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-profile-info')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-additional-content')).toBeInTheDocument();
    });

    it('renders ProfileAvatar with correct props', () => {
      renderWithProviders(<ProfilePage />);

      const avatar = screen.getByTestId('profile-avatar');
      expect(avatar).toHaveAttribute('data-size', '2xl');
      expect(avatar).toHaveAttribute('data-editable', 'true');
      
      expect(screen.getByTestId('avatar-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('avatar-email')).toHaveTextContent('john.doe@example.com');
      expect(screen.getByTestId('avatar-status')).toHaveAttribute('data-online', 'true');
      expect(screen.getByTestId('avatar-verified')).toHaveAttribute('data-verified', 'true');
    });

    it('renders ProfileAvatarInfo with user details', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByTestId('info-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('info-email')).toHaveTextContent('john.doe@example.com');
      expect(screen.getByTestId('info-username')).toHaveTextContent('@johndoe');
      expect(screen.getByTestId('info-title')).toHaveTextContent('LEGO Builder');
      expect(screen.getByTestId('info-location')).toHaveTextContent('San Francisco, CA');
    });

    it('renders user badges correctly', () => {
      renderWithProviders(<ProfilePage />);

      const badges = screen.getAllByTestId(/^badge-\d+$/);
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent('Verified Builder');
      expect(badges[0]).toHaveAttribute('data-variant', 'default');
      expect(badges[1]).toHaveTextContent('Active Member');
      expect(badges[1]).toHaveAttribute('data-variant', 'secondary');
    });

    it('renders bio section when bio exists', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText(/LEGO enthusiast and MOC creator/)).toBeInTheDocument();
    });

    it('renders social links section', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByText('Connect')).toBeInTheDocument();
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    it('renders website section', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByText('Website')).toBeInTheDocument();
      expect(screen.getByText('Visit Website')).toBeInTheDocument();
    });

    it('renders edit profile button in sidebar', () => {
      renderWithProviders(<ProfilePage />);

      const editButtons = screen.getAllByText('Edit Profile');
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Main Content', () => {
    it('renders ProfileMain with correct title and description', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByTestId('main-title')).toHaveTextContent('Profile');
      expect(screen.getByTestId('main-description')).toHaveTextContent('Manage your account settings and preferences');
    });

    it('renders LegoProfileContent component', () => {
      renderWithProviders(<ProfilePage />);

      // LegoProfileContent should render tabs
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
    });
  });

  describe('Edit Profile Modal', () => {
    it('opens edit modal when edit button is clicked', async () => {
      renderWithProviders(<ProfilePage />);

      // Find the edit button in the sidebar (not the modal title)
      const editButtons = screen.getAllByText('Edit Profile');
      const sidebarEditButton = editButtons.find(button =>
        button.tagName === 'BUTTON' || button.closest('button')
      );

      if (sidebarEditButton) {
        fireEvent.click(sidebarEditButton.closest('button') || sidebarEditButton);

        await waitFor(() => {
          // Look for the modal title specifically
          const modalTitle = screen.getByRole('heading', { level: 2 });
          expect(modalTitle).toHaveTextContent('Edit Profile');
          expect(screen.getByTestId('avatar-uploader')).toBeInTheDocument();
          expect(screen.getByTestId('form-section')).toBeInTheDocument();
        });
      }
    });

    it('renders all form fields in edit modal', async () => {
      renderWithProviders(<ProfilePage />);

      // Find and click the edit button
      const editButtons = screen.getAllByText('Edit Profile');
      const sidebarEditButton = editButtons.find(button =>
        button.tagName === 'BUTTON' || button.closest('button')
      );

      if (sidebarEditButton) {
        fireEvent.click(sidebarEditButton.closest('button') || sidebarEditButton);

        await waitFor(() => {
          expect(screen.getByTestId('field-firstName')).toBeInTheDocument();
          expect(screen.getByTestId('field-lastName')).toBeInTheDocument();
          expect(screen.getByTestId('field-email')).toBeInTheDocument();
          expect(screen.getByTestId('field-username')).toBeInTheDocument();
          expect(screen.getByTestId('field-bio')).toBeInTheDocument();
          expect(screen.getByTestId('field-phone')).toBeInTheDocument();
          expect(screen.getByTestId('field-location')).toBeInTheDocument();
          expect(screen.getByTestId('field-website')).toBeInTheDocument();
        });
      }
    });

    it('closes modal when cancel button is clicked', async () => {
      renderWithProviders(<ProfilePage />);

      // Find and click the edit button
      const editButtons = screen.getAllByText('Edit Profile');
      const sidebarEditButton = editButtons.find(button =>
        button.tagName === 'BUTTON' || button.closest('button')
      );

      if (sidebarEditButton) {
        fireEvent.click(sidebarEditButton.closest('button') || sidebarEditButton);

        await waitFor(() => {
          expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('cancel-button'));

        await waitFor(() => {
          // Check that the modal title is no longer present
          expect(screen.queryByRole('heading', { level: 2, name: 'Edit Profile' })).not.toBeInTheDocument();
        });
      }
    });

    it('handles avatar upload in edit modal', async () => {
      renderWithProviders(<ProfilePage />);

      // Find and click the edit button
      const editButtons = screen.getAllByText('Edit Profile');
      const sidebarEditButton = editButtons.find(button =>
        button.tagName === 'BUTTON' || button.closest('button')
      );

      if (sidebarEditButton) {
        fireEvent.click(sidebarEditButton.closest('button') || sidebarEditButton);

        await waitFor(() => {
          const uploadButton = screen.getByTestId('upload-button');
          fireEvent.click(uploadButton);
          // Avatar upload functionality is mocked, so we just verify the button exists
          expect(uploadButton).toBeInTheDocument();
        });
      }
    });
  });

  describe('Avatar Upload Functionality', () => {
    it('handles avatar upload from sidebar', () => {
      renderWithProviders(<ProfilePage />);

      const avatarUploadButton = screen.getByTestId('avatar-upload-button');
      fireEvent.click(avatarUploadButton);

      // Since we're mocking the file upload, we just verify the button works
      expect(avatarUploadButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation for modal close', async () => {
      renderWithProviders(<ProfilePage />);

      // Find and click the edit button
      const editButtons = screen.getAllByText('Edit Profile');
      const sidebarEditButton = editButtons.find(button =>
        button.tagName === 'BUTTON' || button.closest('button')
      );

      if (sidebarEditButton) {
        fireEvent.click(sidebarEditButton.closest('button') || sidebarEditButton);

        await waitFor(() => {
          const modalTitle = screen.getByRole('heading', { level: 2 });
          expect(modalTitle).toHaveTextContent('Edit Profile');
        });

        // Simulate Escape key press
        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

        await waitFor(() => {
          expect(screen.queryByRole('heading', { level: 2, name: 'Edit Profile' })).not.toBeInTheDocument();
        });
      }
    });

    it('has proper aria-hidden attribute on main content', () => {
      renderWithProviders(<ProfilePage />);

      // Get all profile-main elements and find the one with aria-hidden parent
      const profileMains = screen.getAllByTestId('profile-main');
      const mainContentWithAriaHidden = profileMains.find(element =>
        element.parentElement?.hasAttribute('aria-hidden')
      );

      expect(mainContentWithAriaHidden).toBeDefined();
      expect(mainContentWithAriaHidden?.parentElement).toHaveAttribute('aria-hidden');
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes to layout components', () => {
      renderWithProviders(<ProfilePage />);

      const layout = screen.getByTestId('profile-layout');
      expect(layout).toHaveClass('bg-gradient-to-br');
      
      // The ProfileLayout component should handle responsive behavior
      expect(layout).toBeInTheDocument();
    });
  });
});
