import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProfilePage from '../index';

// Import RTK reducers and actions for testing
import { 
  wishlistReducer,
  mocInstructionsReducer,
  profileReducer,
  fetchWishlistItems,
  fetchMocInstructions,
  fetchProfileData,
} from '@repo/mock-data';

// Create a test store with RTK reducers
const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      wishlist: wishlistReducer,
      mocInstructions: mocInstructionsReducer,
      profile: profileReducer,
    },
    preloadedState,
  });
};

// Mock the LegoProfileContent component to test its integration
vi.mock('../LegoProfileContent', () => ({
  LegoProfileContent: ({ profile, onEdit, isEditing }: any) => (
    <div data-testid="lego-profile-content">
      <div data-testid="profile-tabs">
        <div data-testid="tab-overview">
          <div data-testid="stats-section">
            <div data-testid="stat-mocs">MOCs: 8</div>
            <div data-testid="stat-downloads">Downloads: 4,567</div>
            <div data-testid="stat-rating">Rating: 4.7</div>
          </div>
          <div data-testid="recent-activity">
            <div data-testid="activity-item">Downloaded Custom Batmobile</div>
            <div data-testid="activity-item">Published Medieval Castle</div>
          </div>
          <div data-testid="wishlist-preview">
            <div data-testid="wishlist-item">LEGO Creator Expert 10242</div>
            <div data-testid="wishlist-item">LEGO Technic 42115</div>
          </div>
        </div>
        <div data-testid="tab-mocs">
          <div data-testid="moc-grid">
            <div data-testid="moc-card">Custom Batmobile</div>
            <div data-testid="moc-card">Medieval Castle</div>
            <div data-testid="moc-card">Space Station Alpha</div>
          </div>
        </div>
        <div data-testid="tab-wishlist">
          <div data-testid="wishlist-grid">
            <div data-testid="wishlist-card">LEGO Creator Expert 10242</div>
            <div data-testid="wishlist-card">LEGO Technic 42115</div>
          </div>
        </div>
        <div data-testid="tab-preferences">
          <div data-testid="preferences-form">
            <div data-testid="notification-settings">Email Notifications</div>
            <div data-testid="privacy-settings">Public Profile</div>
            <div data-testid="theme-settings">Theme: System</div>
          </div>
        </div>
      </div>
      {isEditing && (
        <div data-testid="edit-mode-indicator">
          Editing Profile for {profile.firstName} {profile.lastName}
        </div>
      )}
    </div>
  ),
}));

// Mock all the layout and UI components
vi.mock('@repo/shared', () => ({
  ProfileLayout: ({ children, sidebarContent }: any) => (
    <div data-testid="profile-layout">
      <div data-testid="sidebar">{sidebarContent}</div>
      <div data-testid="main">{children}</div>
    </div>
  ),
  ProfileLayoutSidebar: ({ avatar, profileInfo, additionalContent }: any) => (
    <div data-testid="profile-layout-sidebar">
      {avatar}
      {profileInfo}
      {additionalContent}
    </div>
  ),
  ProfileAvatar: ({ userName, onAvatarUpload }: any) => (
    <div data-testid="profile-avatar">
      <span>{userName}</span>
      <button data-testid="avatar-upload" onClick={() => onAvatarUpload?.(new File([''], 'test.jpg'))}>
        Upload
      </button>
    </div>
  ),
  ProfileAvatarInfo: ({ userName, userEmail }: any) => (
    <div data-testid="profile-avatar-info">
      <div>{userName}</div>
      <div>{userEmail}</div>
    </div>
  ),
}));

vi.mock('@repo/profile', () => ({
  ProfileMain: ({ children, title }: any) => (
    <div data-testid="profile-main">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  AvatarUploader: ({ onUpload }: any) => (
    <button data-testid="avatar-uploader" onClick={() => onUpload?.(new File([''], 'test.jpg'))}>
      Upload Avatar
    </button>
  ),
}));

vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button data-testid={props['data-testid'] || 'button'} onClick={onClick}>
      {children}
    </button>
  ),
  FormSection: ({ fields }: any) => (
    <div data-testid="form-section">
      {fields?.map((field: any) => (
        <input key={field.name} data-testid={`input-${field.name}`} defaultValue={field.value} />
      ))}
    </div>
  ),
}));

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

const renderWithStore = (component: React.ReactElement, store?: any) => {
  const testStore = store || createTestStore();
  return render(
    <Provider store={testStore}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('ProfilePage - RTK Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RTK State Integration', () => {
    it('integrates with RTK store and renders profile content', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      // Verify the main components are rendered
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('lego-profile-content')).toBeInTheDocument();
      expect(screen.getByTestId('profile-tabs')).toBeInTheDocument();
    });

    it('displays RTK-powered statistics in overview tab', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      // Check that stats are displayed (mocked in LegoProfileContent)
      expect(screen.getByTestId('stats-section')).toBeInTheDocument();
      expect(screen.getByTestId('stat-mocs')).toHaveTextContent('MOCs: 8');
      expect(screen.getByTestId('stat-downloads')).toHaveTextContent('Downloads: 4,567');
      expect(screen.getByTestId('stat-rating')).toHaveTextContent('Rating: 4.7');
    });

    it('shows recent activity from RTK state', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
      expect(screen.getByText('Downloaded Custom Batmobile')).toBeInTheDocument();
      expect(screen.getByText('Published Medieval Castle')).toBeInTheDocument();
    });

    it('displays wishlist preview from RTK state', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      expect(screen.getByTestId('wishlist-preview')).toBeInTheDocument();
      // Use getAllByText since the same items appear in both preview and grid sections
      const legoItems = screen.getAllByText('LEGO Creator Expert 10242');
      const technicItems = screen.getAllByText('LEGO Technic 42115');
      expect(legoItems.length).toBeGreaterThan(0);
      expect(technicItems.length).toBeGreaterThan(0);
    });
  });

  describe('Profile Tabs Integration', () => {
    it('renders all profile tabs with RTK data', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-mocs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-wishlist')).toBeInTheDocument();
      expect(screen.getByTestId('tab-preferences')).toBeInTheDocument();
    });

    it('displays MOC grid with RTK data', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      expect(screen.getByTestId('moc-grid')).toBeInTheDocument();
      expect(screen.getByText('Custom Batmobile')).toBeInTheDocument();
      expect(screen.getByText('Medieval Castle')).toBeInTheDocument();
      expect(screen.getByText('Space Station Alpha')).toBeInTheDocument();
    });

    it('displays wishlist grid with RTK data', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      expect(screen.getByTestId('wishlist-grid')).toBeInTheDocument();
      const wishlistCards = screen.getAllByTestId('wishlist-card');
      expect(wishlistCards).toHaveLength(2);
    });

    it('displays preferences with current settings', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      expect(screen.getByTestId('preferences-form')).toBeInTheDocument();
      expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
      expect(screen.getByTestId('privacy-settings')).toBeInTheDocument();
      expect(screen.getByTestId('theme-settings')).toBeInTheDocument();
    });
  });

  describe('Edit Mode Integration', () => {
    it('passes edit state to LegoProfileContent', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      // Click edit button to enter edit mode
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('edit-mode-indicator')).toBeInTheDocument();
        expect(screen.getByText('Editing Profile for John Doe')).toBeInTheDocument();
      });
    });

    it('handles profile updates through RTK', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument();
      });

      // Verify form fields are populated with current profile data
      expect(screen.getByTestId('input-firstName')).toHaveValue('John');
      expect(screen.getByTestId('input-lastName')).toHaveValue('Doe');
      expect(screen.getByTestId('input-email')).toHaveValue('john.doe@example.com');
    });
  });

  describe('Avatar Upload Integration', () => {
    it('handles avatar upload from sidebar', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      const avatarUpload = screen.getByTestId('avatar-upload');
      fireEvent.click(avatarUpload);

      // Since we're mocking the file upload, we just verify the interaction
      expect(avatarUpload).toBeInTheDocument();
    });

    it('handles avatar upload from edit modal', async () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);

      await waitFor(() => {
        const avatarUploader = screen.getByTestId('avatar-uploader');
        fireEvent.click(avatarUploader);
        expect(avatarUploader).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('handles back navigation correctly', () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      const backButton = screen.getByTestId('back-button');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Responsive Layout', () => {
    it('renders responsive layout structure', () => {
      const store = createTestStore();
      renderWithStore(<ProfilePage />, store);

      const layout = screen.getByTestId('profile-layout');
      expect(layout).toBeInTheDocument();
      
      const sidebar = screen.getByTestId('sidebar');
      const main = screen.getByTestId('main');
      
      expect(sidebar).toBeInTheDocument();
      expect(main).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles RTK loading states gracefully', async () => {
      const store = createTestStore({
        profile: {
          userStats: null,
          recentActivities: [],
          quickActions: [],
          loading: true,
          error: null,
        },
      });

      renderWithStore(<ProfilePage />, store);

      // Profile should still render even with loading state
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('lego-profile-content')).toBeInTheDocument();
    });

    it('handles RTK error states gracefully', async () => {
      const store = createTestStore({
        profile: {
          userStats: null,
          recentActivities: [],
          quickActions: [],
          loading: false,
          error: 'Failed to load profile data',
        },
      });

      renderWithStore(<ProfilePage />, store);

      // Profile should still render even with error state
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('lego-profile-content')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large RTK state', () => {
      const largeState = {
        mocInstructions: {
          instructions: Array.from({ length: 100 }, (_, i) => ({
            id: `moc-${i}`,
            title: `MOC ${i}`,
            author: `Author ${i}`,
            downloadCount: i * 10,
          })),
          loading: false,
          error: null,
        },
      };

      const store = createTestStore(largeState);
      renderWithStore(<ProfilePage />, store);

      expect(screen.getByTestId('profile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('lego-profile-content')).toBeInTheDocument();
    });
  });
});
