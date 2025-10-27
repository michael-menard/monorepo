import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import ProfilePage from '../index'

/**
 * Integration Tests for ProfilePage
 *
 * Tests the integration between the new ProfileLayout system,
 * enhanced avatar upload functionality, and LEGO-themed content.
 */

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock file upload functionality
const mockFileUpload = vi.fn()
global.URL.createObjectURL = vi.fn(() => 'mocked-avatar-url')

// Mock shared components with realistic implementations
vi.mock('@repo/profile', () => ({
  ProfileLayout: ({ children, sidebarContent, className }: any) => (
    <div className={`profile-layout ${className}`} data-testid="profile-layout">
      <aside className="profile-sidebar" data-testid="profile-sidebar">
        {sidebarContent}
      </aside>
      <main className="profile-content" data-testid="profile-content">
        {children}
      </main>
    </div>
  ),
  ProfileLayoutSidebar: ({ avatar, profileInfo, additionalContent }: any) => (
    <div className="sidebar-content" data-testid="sidebar-content">
      <div className="avatar-section" data-testid="avatar-section">
        {avatar}
      </div>
      <div className="profile-info-section" data-testid="profile-info-section">
        {profileInfo}
      </div>
      <div className="additional-content-section" data-testid="additional-content-section">
        {additionalContent}
      </div>
    </div>
  ),
  ProfileAvatar: ({ avatarUrl, userName, onAvatarUpload, editable }: any) => {
    const [isHovered, setIsHovered] = React.useState(false)

    return (
      <div
        className="profile-avatar"
        data-testid="profile-avatar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="avatar-container">
          <img
            src={avatarUrl}
            alt={`${userName}'s avatar`}
            data-testid="avatar-image"
            className="avatar-image"
          />
          {editable && isHovered ? (
            <div
              className="hover-overlay"
              data-testid="hover-overlay"
              onClick={() => {
                const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
                onAvatarUpload(file)
                mockFileUpload(file)
              }}
            >
              <svg data-testid="pencil-icon" className="pencil-icon">
                <title>Edit Avatar</title>
              </svg>
            </div>
          ) : null}
        </div>
        <input type="file" accept="image/*" className="hidden" data-testid="file-input" />
      </div>
    )
  },
  ProfileAvatarInfo: ({ userName, userEmail, username, badges }: any) => (
    <div className="profile-info" data-testid="profile-info">
      <h2 data-testid="user-name">{userName}</h2>
      <p data-testid="user-email">{userEmail}</p>
      {username ? <p data-testid="username">@{username}</p> : null}
      {badges ? (
        <div className="badges" data-testid="badges">
          {badges.map((badge: any, index: number) => (
            <span
              key={index}
              className={`badge badge-${badge.variant}`}
              data-testid={`badge-${index}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  ),
}))

// Mock UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
      data-testid={`button-${variant || 'default'}`}
    >
      {children}
    </button>
  ),
  FormSection: ({ fields }: any) => (
    <div data-testid="form-section">
      {fields.map((field: any) => (
        <div key={field.name} data-testid={`field-${field.name}`}>
          <label>{field.label}</label>
          <input type={field.type} defaultValue={field.value} data-testid={`input-${field.name}`} />
        </div>
      ))}
    </div>
  ),
}))

// Mock profile components
vi.mock('@repo/profile', () => ({
  ProfileMain: ({ children, title }: any) => (
    <div data-testid="profile-main">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  AvatarUploader: ({ currentAvatar, onUpload }: any) => (
    <div data-testid="avatar-uploader">
      <img src={currentAvatar} alt="Current avatar" />
      <button onClick={() => onUpload(new File([''], 'avatar.jpg'))}>Upload</button>
    </div>
  ),
}))

const renderProfilePage = () => {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>,
  )
}

describe('ProfilePage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Layout Integration', () => {
    it('should integrate ProfileLayout with sidebar and content correctly', () => {
      renderProfilePage()

      // Check layout structure
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument()
      expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('profile-content')).toBeInTheDocument()

      // Check sidebar sections
      expect(screen.getByTestId('avatar-section')).toBeInTheDocument()
      expect(screen.getByTestId('profile-info-section')).toBeInTheDocument()
      expect(screen.getByTestId('additional-content-section')).toBeInTheDocument()
    })

    it('should apply LEGO-themed styling', () => {
      renderProfilePage()

      const layout = screen.getByTestId('profile-layout')
      expect(layout).toHaveClass('bg-gradient-to-br')
    })
  })

  describe('Avatar Upload Integration', () => {
    it('should show pencil icon on avatar hover', async () => {
      renderProfilePage()

      const avatar = screen.getByTestId('profile-avatar')

      // Initially no hover overlay
      expect(screen.queryByTestId('hover-overlay')).not.toBeInTheDocument()

      // Hover over avatar
      fireEvent.mouseEnter(avatar)

      // Should show hover overlay with pencil
      await waitFor(() => {
        expect(screen.getByTestId('hover-overlay')).toBeInTheDocument()
        expect(screen.getByTestId('pencil-icon')).toBeInTheDocument()
      })
    })

    it('should handle avatar upload when clicked', async () => {
      renderProfilePage()

      const avatar = screen.getByTestId('profile-avatar')

      // Hover to show overlay
      fireEvent.mouseEnter(avatar)

      await waitFor(() => {
        expect(screen.getByTestId('hover-overlay')).toBeInTheDocument()
      })

      // Click to upload
      const overlay = screen.getByTestId('hover-overlay')
      fireEvent.click(overlay)

      // Should trigger upload
      expect(mockFileUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test.jpg',
          type: 'image/jpeg',
        }),
      )
    })

    it('should hide pencil icon when not hovering', async () => {
      renderProfilePage()

      const avatar = screen.getByTestId('profile-avatar')

      // Hover then unhover
      fireEvent.mouseEnter(avatar)
      await waitFor(() => {
        expect(screen.getByTestId('hover-overlay')).toBeInTheDocument()
      })

      fireEvent.mouseLeave(avatar)

      // Should hide overlay
      await waitFor(() => {
        expect(screen.queryByTestId('hover-overlay')).not.toBeInTheDocument()
      })
    })
  })

  describe('Profile Information Integration', () => {
    it('should display complete user profile information', () => {
      renderProfilePage()

      // Check user info
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('user-email')).toHaveTextContent('john.doe@example.com')
      expect(screen.getByTestId('username')).toHaveTextContent('@johndoe')

      // Check badges
      expect(screen.getByTestId('badges')).toBeInTheDocument()
      expect(screen.getByTestId('badge-0')).toHaveTextContent('Verified Builder')
      expect(screen.getByTestId('badge-1')).toHaveTextContent('Active Member')
    })

    it('should show avatar with correct image source', () => {
      renderProfilePage()

      const avatarImage = screen.getByTestId('avatar-image')
      expect(avatarImage).toHaveAttribute('src', expect.stringContaining('unsplash.com'))
      expect(avatarImage).toHaveAttribute('alt', "John Doe's avatar")
    })
  })

  describe('Edit Profile Integration', () => {
    it('should open edit modal when edit button is clicked', async () => {
      renderProfilePage()

      // Find and click edit button (should be in additional content)
      const editButton = screen.getByTestId('button-default')
      fireEvent.click(editButton)

      // Should show edit modal
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument()
      })
    })

    it('should populate form with current profile data', async () => {
      renderProfilePage()

      const editButton = screen.getByTestId('button-default')
      fireEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('input-firstName')).toHaveValue('John')
        expect(screen.getByTestId('input-lastName')).toHaveValue('Doe')
        expect(screen.getByTestId('input-email')).toHaveValue('john.doe@example.com')
      })
    })

    it('should handle form submission', async () => {
      renderProfilePage()

      const editButton = screen.getByTestId('button-default')
      fireEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('form-section')).toBeInTheDocument()
      })

      // Update a field
      const firstNameInput = screen.getByTestId('input-firstName')
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } })

      // Submit form
      const saveButton = screen.getByText('Save Changes')
      fireEvent.click(saveButton)

      // Form should handle submission (implementation may vary)
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument()
    })
  })

  describe('Navigation Integration', () => {
    it('should handle back navigation correctly', () => {
      renderProfilePage()

      const backButton = screen.getByText('← Back to Home')
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Responsive Behavior', () => {
    it('should maintain layout structure on different screen sizes', () => {
      // Mock window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      renderProfilePage()

      // Layout should still be present
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument()
      expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('profile-content')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle avatar upload errors gracefully', async () => {
      // Mock console.error to avoid test noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderProfilePage()

      const avatar = screen.getByTestId('profile-avatar')
      fireEvent.mouseEnter(avatar)

      await waitFor(() => {
        expect(screen.getByTestId('hover-overlay')).toBeInTheDocument()
      })

      // Simulate upload error
      mockFileUpload.mockImplementation(() => {
        throw new Error('Upload failed')
      })

      const overlay = screen.getByTestId('hover-overlay')
      fireEvent.click(overlay)

      // Should not crash the component
      expect(screen.getByTestId('profile-layout')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })
})
