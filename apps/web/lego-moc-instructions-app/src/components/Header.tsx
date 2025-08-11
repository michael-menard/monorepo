import { Link } from '@tanstack/react-router'
import { AppAvatar } from '@repo/ui'

// Mock user data - in a real app, this would come from auth context
const mockUser = {
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  userName: 'John Doe',
  userEmail: 'john.doe@example.com',
}

export default function Header() {
  const handleProfileClick = () => {
    // Navigate to profile page
    window.location.href = '/profile'
  }

  const handleUserSettingsClick = () => {
    // Navigate to user settings page
    window.location.href = '/settings'
  }

  const handleLogout = () => {
    // Handle logout logic
    console.log('Logout clicked')
    // In a real app, this would clear auth tokens and redirect to login
  }

  const handleAvatarUpload = async (file: File) => {
    // Handle avatar upload
    console.log('Avatar upload:', file)
    // In a real app, this would upload to server and update user profile
  }

  return (
    <header className="p-2 flex gap-2 bg-white text-black justify-between items-center">
      <nav className="flex flex-row">
        <div className="px-2 font-bold">
          <Link to="/">Home</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/moc-gallery">MOC Gallery</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/profile">Profile</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/wishlist">Wishlist</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/demo/tanstack-query">TanStack Query</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/cache-demo">Cache Demo</Link>
        </div>
      </nav>

      {/* User Avatar */}
      <div className="flex items-center">
        <AppAvatar
          avatarUrl={mockUser.avatarUrl}
          userName={mockUser.userName}
          userEmail={mockUser.userEmail}
          onAvatarUpload={handleAvatarUpload}
          onProfileClick={handleProfileClick}
          onUserSettingsClick={handleUserSettingsClick}
          onLogout={handleLogout}
          size="sm"
          showEditButton={true}
          disabled={false}
          clickable={true}
        />
      </div>
    </header>
  )
}
