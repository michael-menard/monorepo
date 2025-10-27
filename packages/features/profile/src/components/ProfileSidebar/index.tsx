import React from 'react'
import { Button, Badge } from '@repo/ui'
import { ProfileAvatar } from '../ProfileAvatar'
import { ProfileLayoutSidebar } from '../ProfileLayout'
import { ProfileAvatarInfo } from '../ProfileAvatarInfo'
import type { ProfileSidebarProps } from '../../types'
import {
  formatFullName,
  generateAvatarPlaceholder,
  getProfileCompletionPercentage,
} from '../../utils'

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  onEdit,
  onUploadAvatar,
  onViewProfile,
  isEditable = false,
  className = '',
}) => {
  const fullName = formatFullName(profile)

  const avatarUrl = profile.avatar || generateAvatarPlaceholder(fullName)
  const completionPercentage = getProfileCompletionPercentage(profile)

  const handleProfileClick = () => {
    if (onViewProfile) {
      onViewProfile()
    }
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

  return (
    <ProfileLayoutSidebar
      className={className}
      avatar={
        <div className="flex flex-col items-center space-y-4">
          <ProfileAvatar
            avatarUrl={avatarUrl}
            userName={fullName}
            userEmail={profile.email}
            size="2xl"
            editable={isEditable}
            onAvatarUpload={isEditable && onUploadAvatar ? onUploadAvatar : undefined}
            onEdit={isEditable && onEdit ? onEdit : undefined}
            showStatus={true}
            isOnline={true}
            showVerified={profile.isVerified}
            isVerified={profile.isVerified}
          />

          {/* Profile Completion Badge */}
          <Badge variant={completionPercentage >= 80 ? 'default' : 'secondary'}>
            {completionPercentage}% Complete
          </Badge>
        </div>
      }
      profileInfo={
        <ProfileAvatarInfo
          userName={fullName}
          userEmail={profile.email}
          username={profile.username}
          title={profile.title}
          location={profile.location}
          joinDate={profile.createdAt ? new Date(profile.createdAt) : undefined}
          badges={[
            ...(profile.isVerified ? [{ label: 'Verified', variant: 'default' as const }] : []),
            ...(profile.isPremium ? [{ label: 'Premium', variant: 'secondary' as const }] : []),
          ]}
        />
      }
      additionalContent={
        <div className="space-y-6">
          {/* Bio Section */}
          {profile.bio ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Bio</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{profile.bio}</p>
            </div>
          ) : null}

          {/* Stats Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Profile Stats</h3>
            <div className="space-y-2">
              {profile.website ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Website</span>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Visit
                  </a>
                </div>
              ) : null}
            </div>
          </div>

          {/* Social Links */}
          {profile.socialLinks ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Social Links</h3>
              <div className="flex flex-wrap gap-2">
                {profile.socialLinks.twitter ? (
                  <a
                    href={profile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    Twitter
                  </a>
                ) : null}
                {profile.socialLinks.linkedin ? (
                  <a
                    href={profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    LinkedIn
                  </a>
                ) : null}
                {profile.socialLinks.github ? (
                  <a
                    href={profile.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-foreground/80 text-sm"
                  >
                    GitHub
                  </a>
                ) : null}
                {profile.socialLinks.instagram ? (
                  <a
                    href={profile.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-700 text-sm"
                  >
                    Instagram
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="space-y-3">
            {isEditable && onEdit ? (
              <Button onClick={onEdit} className="w-full" variant="default">
                Edit Profile
              </Button>
            ) : null}
            {onViewProfile ? (
              <Button onClick={onViewProfile} className="w-full" variant="outline">
                View Profile
              </Button>
            ) : null}
          </div>
        </div>
      }
    />
  )
}

export default ProfileSidebar
