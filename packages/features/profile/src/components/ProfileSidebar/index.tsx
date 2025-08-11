import React from 'react';
import { AppAvatar, Button, Badge } from '@repo/ui';
import type { ProfileSidebarProps } from '../../types';
import { formatFullName, generateAvatarPlaceholder, getProfileCompletionPercentage } from '../../utils';

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  onEdit,
  onUploadAvatar,
  onViewProfile,
  isEditable = false,
  className = '',
}) => {
  const fullName = formatFullName(profile);

  const avatarUrl = profile.avatar || generateAvatarPlaceholder(fullName);
  const completionPercentage = getProfileCompletionPercentage(profile);

  const handleProfileClick = () => {
    if (onViewProfile) {
      onViewProfile();
    }
  };

  const handleUserSettingsClick = () => {
    // Navigate to user settings page
    window.location.href = '/settings';
  };

  const handleLogout = () => {
    // Handle logout logic
    console.log('Logout clicked');
    // In a real app, this would clear auth tokens and redirect to login
  };

  return (
    <div className={`profile-sidebar ${className}`}>
      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <AppAvatar
            avatarUrl={avatarUrl}
            userName={fullName}
            userEmail={profile.email}
            onAvatarUpload={isEditable && onUploadAvatar ? async (file: File) => {
              onUploadAvatar(file);
            } : undefined}
            onProfileClick={handleProfileClick}
            onUserSettingsClick={handleUserSettingsClick}
            onLogout={handleLogout}
            size="lg"
            showEditButton={isEditable && !!onUploadAvatar}
            className="w-24 h-24"
            disabled={false}
            clickable={true}
          />
        </div>
        
        {/* Profile Completion Badge */}
        <div className="mt-3">
          <Badge variant={completionPercentage >= 80 ? 'default' : 'secondary'}>
            {completionPercentage}% Complete
          </Badge>
        </div>
      </div>

      {/* User Information */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{fullName}</h2>
        {profile.username && <p className="text-gray-600 text-sm mb-2">@{profile.username}</p>}
        {profile.email && <p className="text-gray-500 text-sm">{profile.email}</p>}
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Bio</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Stats Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Profile Stats</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Location</span>
            <span className="text-gray-900 font-medium">{profile.location || 'Not specified'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Member since</span>
            <span className="text-gray-900 font-medium">
              {profile.createdAt ? new Date(profile.createdAt).getFullYear() : 'N/A'}
            </span>
          </div>
          {profile.website && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Website</span>
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Visit
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Social Links */}
      {profile.socialLinks && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Social Links</h3>
          <div className="flex flex-wrap gap-2">
            {profile.socialLinks.twitter && (
              <a
                href={profile.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-600 text-sm"
              >
                Twitter
              </a>
            )}
            {profile.socialLinks.linkedin && (
              <a
                href={profile.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                LinkedIn
              </a>
            )}
            {profile.socialLinks.github && (
              <a
                href={profile.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-gray-900 text-sm"
              >
                GitHub
              </a>
            )}
            {profile.socialLinks.instagram && (
              <a
                href={profile.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-800 text-sm"
              >
                Instagram
              </a>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {isEditable && onEdit && (
          <Button onClick={onEdit} className="w-full" variant="default">
            Edit Profile
          </Button>
        )}
        {onViewProfile && (
          <Button onClick={onViewProfile} className="w-full" variant="outline">
            View Profile
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfileSidebar; 