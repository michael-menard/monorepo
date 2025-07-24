import React from 'react';
import { ProfileSidebar } from './ProfileSidebar.js';
import { ProfileMain } from './ProfileMain.js';
import { ProfileSkeleton } from './ProfileSkeleton.js';
import type { ProfilePageProps } from '../types/index.js';

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onAvatarUpload, onProfileUpdate, isEditable, loading, children }) => {
  if (loading) {
    return <ProfileSkeleton />;
  }
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-80 lg:flex-shrink-0">
          <ProfileSidebar
            profile={profile}
            onAvatarUpload={onAvatarUpload}
            onProfileUpdate={onProfileUpdate}
            isEditable={isEditable}
          />
        </div>
        <ProfileMain>{children}</ProfileMain>
      </div>
    </div>
  );
}; 