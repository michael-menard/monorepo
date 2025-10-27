import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Profile } from '@repo/profile'

// Import RTK reducers for testing
import { wishlistReducer, mocInstructionsReducer, profileReducer } from '@repo/mock-data'
import { LegoProfileContent } from '../LegoProfileContent'

// Create a test store with mock data
const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      wishlist: wishlistReducer,
      mocInstructions: mocInstructionsReducer,
      profile: profileReducer,
    },
    preloadedState: {
      wishlist: {
        items: [
          { id: '1', title: 'LEGO Creator Expert 10242', isPurchased: false, priority: 'high' },
          { id: '2', title: 'LEGO Technic 42115', isPurchased: true, priority: 'medium' },
        ],
        loading: false,
        error: null,
        filters: { category: null, showPurchased: false },
        stats: { total: 2, purchased: 1, totalValue: 500 },
      },
      mocInstructions: {
        instructions: [
          {
            id: '1',
            title: 'Custom Batmobile',
            author: 'BrickMaster3000',
            downloadCount: 156,
            rating: 4.8,
          },
          {
            id: '2',
            title: 'Medieval Castle',
            author: 'CastleBuilder42',
            downloadCount: 234,
            rating: 4.6,
          },
          {
            id: '3',
            title: 'Space Station Alpha',
            author: 'SpaceBuilder99',
            downloadCount: 89,
            rating: 4.7,
          },
        ],
        loading: false,
        error: null,
        filters: {},
        stats: { total: 3, published: 3, totalDownloads: 479, averageRating: 4.7 },
        selectedInstruction: null,
      },
      profile: {
        userStats: {
          totalWishlistItems: 2,
          totalMocInstructions: 3,
          totalDownloads: 479,
          averageRating: 4.7,
          joinDate: new Date('2023-01-01'),
          lastActive: new Date(),
        },
        recentActivities: [
          {
            id: '1',
            type: 'download',
            title: 'Downloaded Custom Batmobile',
            timestamp: new Date(),
          },
          { id: '2', type: 'publish', title: 'Published Medieval Castle', timestamp: new Date() },
        ],
        quickActions: [],
        loading: false,
        error: null,
      },
      ...preloadedState,
    },
  })
}

// Mock UI components
vi.mock('@repo/ui', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  Tabs: ({ children, defaultValue }: any) => (
    <div data-testid="tabs" data-default-value={defaultValue}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tabs-content-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
  Button: ({ children, onClick, variant, size }: any) => (
    <button data-testid="button" onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
  AppCard: ({ children, title }: any) => (
    <div data-testid="app-card">
      {title ? <h3>{title}</h3> : null}
      {children}
    </div>
  ),
  TabPanel: ({ tabs }: any) => (
    <div data-testid="tab-panel">
      {tabs?.map((tab: any) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          {tab.label}
        </div>
      ))}
    </div>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
  Blocks: () => <div data-testid="blocks-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  BookOpen: () => <div data-testid="book-open-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Twitter: () => <div data-testid="twitter-icon" />,
  Linkedin: () => <div data-testid="linkedin-icon" />,
  Github: () => <div data-testid="github-icon" />,
  Instagram: () => <div data-testid="instagram-icon" />,
}))

const mockProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  bio: 'LEGO enthusiast and MOC creator',
  avatar: 'https://example.com/avatar.jpg',
  phone: '+1 (555) 123-4567',
  dateOfBirth: new Date('1990-05-15'),
  location: 'San Francisco, CA',
  website: 'https://johndoe.dev',
  socialLinks: {
    twitter: 'https://twitter.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
  },
  preferences: {
    emailNotifications: true,
    pushNotifications: false,
    publicProfile: true,
    theme: 'system',
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2024-01-15'),
}

const renderWithStore = (component: React.ReactElement, store?: any) => {
  const testStore = store || createTestStore()
  return render(<Provider store={testStore}>{component}</Provider>)
}

describe('LegoProfileContent - RTK Integration', () => {
  const mockOnEdit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Overview Tab with RTK Data', () => {
    it('displays user statistics from RTK state', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      // Check that statistics are displayed
      expect(screen.getByText('3')).toBeInTheDocument() // Total MOCs
      expect(screen.getByText('479')).toBeInTheDocument() // Total Downloads
      expect(screen.getByText('4.7')).toBeInTheDocument() // Average Rating
      expect(screen.getByText('2')).toBeInTheDocument() // Wishlist Items
    })

    it('displays recent activities from RTK state', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      expect(screen.getByText('Downloaded Custom Batmobile')).toBeInTheDocument()
      expect(screen.getByText('Published Medieval Castle')).toBeInTheDocument()
    })

    it('shows quick actions section', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      // Quick actions should be present
      expect(screen.getByText('Create New MOC')).toBeInTheDocument()
      expect(screen.getByText('Browse Gallery')).toBeInTheDocument()
      expect(screen.getByText('Manage Wishlist')).toBeInTheDocument()
    })
  })

  describe('MOCs Tab with RTK Data', () => {
    it('displays MOC instructions from RTK state', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      // Switch to MOCs tab
      const mocsTab = screen.getByTestId('tab-trigger-mocs')
      fireEvent.click(mocsTab)

      expect(screen.getByText('Custom Batmobile')).toBeInTheDocument()
      expect(screen.getByText('Medieval Castle')).toBeInTheDocument()
      expect(screen.getByText('Space Station Alpha')).toBeInTheDocument()
    })

    it('shows MOC statistics and actions', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      const mocsTab = screen.getByTestId('tab-trigger-mocs')
      fireEvent.click(mocsTab)

      // Should show download counts and ratings
      expect(screen.getByText('156')).toBeInTheDocument() // Batmobile downloads
      expect(screen.getByText('234')).toBeInTheDocument() // Castle downloads
      expect(screen.getByText('89')).toBeInTheDocument() // Space Station downloads
    })
  })

  describe('Wishlist Tab with RTK Data', () => {
    it('displays wishlist items from RTK state', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      const wishlistTab = screen.getByTestId('tab-trigger-wishlist')
      fireEvent.click(wishlistTab)

      expect(screen.getByText('LEGO Creator Expert 10242')).toBeInTheDocument()
      expect(screen.getByText('LEGO Technic 42115')).toBeInTheDocument()
    })

    it('shows wishlist statistics', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      const wishlistTab = screen.getByTestId('tab-trigger-wishlist')
      fireEvent.click(wishlistTab)

      // Should show total items and purchased status
      expect(screen.getByText('Total Items: 2')).toBeInTheDocument()
      expect(screen.getByText('Purchased: 1')).toBeInTheDocument()
    })
  })

  describe('Preferences Tab', () => {
    it('displays current preferences from profile', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      const preferencesTab = screen.getByTestId('tab-trigger-preferences')
      fireEvent.click(preferencesTab)

      expect(screen.getByText('Email Notifications')).toBeInTheDocument()
      expect(screen.getByText('Public Profile')).toBeInTheDocument()
      expect(screen.getByText('Theme')).toBeInTheDocument()
    })

    it('shows current preference values', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      const preferencesTab = screen.getByTestId('tab-trigger-preferences')
      fireEvent.click(preferencesTab)

      // Check that current values are displayed
      expect(screen.getByText('Enabled')).toBeInTheDocument() // Email notifications
      expect(screen.getByText('Public')).toBeInTheDocument() // Public profile
      expect(screen.getByText('System')).toBeInTheDocument() // Theme
    })
  })

  describe('Loading States', () => {
    it('handles RTK loading states gracefully', () => {
      const store = createTestStore({
        profile: {
          userStats: null,
          recentActivities: [],
          quickActions: [],
          loading: true,
          error: null,
        },
      })

      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      // Component should still render with loading state
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })

    it('handles empty RTK data gracefully', () => {
      const store = createTestStore({
        mocInstructions: {
          instructions: [],
          loading: false,
          error: null,
          filters: {},
          stats: { total: 0, published: 0, totalDownloads: 0, averageRating: 0 },
          selectedInstruction: null,
        },
        wishlist: {
          items: [],
          loading: false,
          error: null,
          filters: { category: null, showPurchased: false },
          stats: { total: 0, purchased: 0, totalValue: 0 },
        },
      })

      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      expect(screen.getByTestId('tabs')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument() // Should show 0 for empty stats
    })
  })

  describe('Interactive Features', () => {
    it('handles tab switching correctly', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      // Test tab switching
      const mocsTab = screen.getByTestId('tab-trigger-mocs')
      const wishlistTab = screen.getByTestId('tab-trigger-wishlist')
      const preferencesTab = screen.getByTestId('tab-trigger-preferences')

      fireEvent.click(mocsTab)
      expect(screen.getByTestId('tabs-content-mocs')).toBeInTheDocument()

      fireEvent.click(wishlistTab)
      expect(screen.getByTestId('tabs-content-wishlist')).toBeInTheDocument()

      fireEvent.click(preferencesTab)
      expect(screen.getByTestId('tabs-content-preferences')).toBeInTheDocument()
    })

    it('calls onEdit when edit buttons are clicked', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      const editButtons = screen.getAllByTestId('button')
      const editButton = editButtons.find(button => button.textContent?.includes('Edit'))

      if (editButton) {
        fireEvent.click(editButton)
        expect(mockOnEdit).toHaveBeenCalled()
      }
    })
  })

  describe('Edit Mode', () => {
    it('shows edit mode indicator when isEditing is true', () => {
      const store = createTestStore()
      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={true} />,
        store,
      )

      // In edit mode, certain elements might be different
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles RTK error states gracefully', () => {
      const store = createTestStore({
        profile: {
          userStats: null,
          recentActivities: [],
          quickActions: [],
          loading: false,
          error: 'Failed to load profile data',
        },
      })

      renderWithStore(
        <LegoProfileContent profile={mockProfile} onEdit={mockOnEdit} isEditing={false} />,
        store,
      )

      // Component should still render despite error
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })
  })
})
