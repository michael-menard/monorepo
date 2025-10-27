import React, {useState} from 'react'
import {AppAvatar} from './AppAvatar'

export const AppAvatarExample: React.FC = () => {
  const [avatarUrl, setAvatarUrl] = useState<string>('https://example.com/avatar.jpg')
  const [userName, setUserName] = useState<string>('John Doe')
  const [userEmail, setUserEmail] = useState<string>('john@example.com')

  const handleAvatarUpload = async (file: File) => {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // In a real app, you would upload the file to your server
    const newAvatarUrl = window.URL.createObjectURL(file)
    setAvatarUrl(newAvatarUrl)

    console.log('Avatar uploaded:', file.name)
  }

  const handleProfileClick = () => {
    console.log('Profile clicked - navigate to profile page')
    // In a real app, you would navigate to the profile page
  }

  const handleLogout = () => {
    console.log('Logout confirmed')
    // In a real app, you would clear auth state and redirect to login
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-6">AppAvatar Component Examples</h1>

      {/* Basic Usage */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Basic Usage</h2>
        <div className="flex items-center space-x-4">
          <AppAvatar
            avatarUrl={avatarUrl}
            userName={userName}
            userEmail={userEmail}
            showEditButton={true}
            disabled={false}
            clickable={true}
            size="lg"
            onAvatarUpload={handleAvatarUpload}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
          />
          <span className="text-sm text-muted-foreground">
            Hover to see edit button, click for dropdown menu
          </span>
        </div>
      </div>

      {/* Different Sizes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Different Sizes</h2>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <AppAvatar
              avatarUrl={avatarUrl}
              userName={userName}
              size="sm"
              onAvatarUpload={handleAvatarUpload}
              onProfileClick={handleProfileClick}
              onLogout={handleLogout}
              showEditButton={true}
              disabled={false}
              clickable={true}
            />
            <p className="text-xs mt-2">Small</p>
          </div>
          <div className="text-center">
            <AppAvatar
              avatarUrl={avatarUrl}
              userName={userName}
              size="md"
              onAvatarUpload={handleAvatarUpload}
              onProfileClick={handleProfileClick}
              onLogout={handleLogout}
              showEditButton={true}
              disabled={false}
              clickable={true}
            />
            <p className="text-xs mt-2">Medium</p>
          </div>
          <div className="text-center">
            <AppAvatar
              avatarUrl={avatarUrl}
              userName={userName}
              size="lg"
              onAvatarUpload={handleAvatarUpload}
              onProfileClick={handleProfileClick}
              onLogout={handleLogout}
              showEditButton={true}
              disabled={false}
              clickable={true}
            />
            <p className="text-xs mt-2">Large</p>
          </div>
        </div>
      </div>

      {/* Without Avatar URL (shows initials) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Without Avatar URL</h2>
        <div className="flex items-center space-x-4">
          <AppAvatar
            userName={userName}
            userEmail={userEmail}
            showEditButton={true}
            disabled={false}
            clickable={true}
            size="md"
            onAvatarUpload={handleAvatarUpload}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
          />
          <span className="text-sm text-muted-foreground">
            Shows initials when no avatar URL is provided
          </span>
        </div>
      </div>

      {/* Without Edit Button */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Without Edit Button</h2>
        <div className="flex items-center space-x-4">
          <AppAvatar
            avatarUrl={avatarUrl}
            userName={userName}
            userEmail={userEmail}
            showEditButton={false}
            disabled={false}
            clickable={true}
            size="md"
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
          />
          <span className="text-sm text-muted-foreground">No edit button overlay</span>
        </div>
      </div>

      {/* Disabled State */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Disabled State</h2>
        <div className="flex items-center space-x-4">
          <AppAvatar
            avatarUrl={avatarUrl}
            userName={userName}
            userEmail={userEmail}
            disabled={true}
            showEditButton={true}
            clickable={true}
            size="md"
            onAvatarUpload={handleAvatarUpload}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
          />
          <span className="text-sm text-muted-foreground">Disabled interactions</span>
        </div>
      </div>

      {/* Without Logout Function */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Without Logout Function</h2>
        <div className="flex items-center space-x-4">
          <AppAvatar
            avatarUrl={avatarUrl}
            userName={userName}
            userEmail={userEmail}
            showEditButton={true}
            disabled={false}
            clickable={true}
            size="md"
            onAvatarUpload={handleAvatarUpload}
            onProfileClick={handleProfileClick}
          />
          <span className="text-sm text-muted-foreground">
            Logout option is disabled when no onLogout function is provided
          </span>
        </div>
      </div>

      {/* Custom Styling */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Custom Styling</h2>
        <div className="flex items-center space-x-4">
          <AppAvatar
            avatarUrl={avatarUrl}
            userName={userName}
            userEmail={userEmail}
            showEditButton={true}
            disabled={false}
            clickable={true}
            size="md"
            className="ring-2 ring-blue-500 ring-offset-2"
            onAvatarUpload={handleAvatarUpload}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
          />
          <span className="text-sm text-muted-foreground">With custom ring styling</span>
        </div>
      </div>

      {/* Non-clickable Avatar */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Non-clickable Avatar</h2>
        <div className="flex items-center space-x-4">
          <AppAvatar
            avatarUrl={avatarUrl}
            userName={userName}
            userEmail={userEmail}
            showEditButton={true}
            disabled={false}
            clickable={false}
            size="md"
            onAvatarUpload={handleAvatarUpload}
            onProfileClick={handleProfileClick}
            onLogout={handleLogout}
          />
          <span className="text-sm text-muted-foreground">
            No dropdown menu, but still shows edit button on hover
          </span>
        </div>
      </div>
    </div>
  )
}
