import React, { useState } from 'react';
import { useUploadAvatarMutation } from '@/services/userApi';
import { ProfilePage, type ProfileData } from '../../../../packages/profile/src/index.js';

// TODO: Import from @repo/profile once components are implemented
// import { ProfilePage, type ProfileData } from '@repo/profile';

// Temporary types until profile package is implemented
type ProfileData = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  stats: {
    projects: number;
    followers: number;
    following: number;
  };
  bio?: string;
  email?: string;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
};

// Remove the placeholder ProfilePage component since we're now importing the real one
// const ProfilePage: React.FC<{ children: React.ReactNode; [key: string]: any }> = ({ children }) => <div>{children}</div>;

const ProfileDemo: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({
    id: '1',
    username: 'johndoe',
    displayName: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    stats: {
      projects: 12,
      followers: 150,
      following: 89,
    },
  });

  const [uploadAvatar] = useUploadAvatarMutation();

  const handleAvatarUpload = async (file: File): Promise<string> => {
    try {
      const result = await uploadAvatar({ userId: profile.id, file }).unwrap();
      
      // Update the profile with new avatar URL
      setProfile((prev: ProfileData) => ({ ...prev, avatarUrl: result.avatarUrl }));
      
      return result.avatarUrl;
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  };

  const handleProfileUpdate = async (data: Partial<ProfileData>): Promise<void> => {
    // In a real app, you would update the profile in your backend
    setProfile((prev: ProfileData) => ({ ...prev, ...data }));
  };

  return (
    <ProfilePage
      profile={profile}
      onAvatarUpload={handleAvatarUpload}
      onProfileUpdate={handleProfileUpdate}
      isEditable={true}
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">My LEGO Projects</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4">
              <div className="h-32 bg-gray-200 rounded mb-4 flex items-center justify-center">
                <span className="text-gray-500">Project Image {i + 1}</span>
              </div>
              <h3 className="font-semibold">LEGO Project {i + 1}</h3>
              <p className="text-gray-600 text-sm">A cool LEGO creation</p>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span>Created 2 days ago</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProfilePage>
  );
};

export default ProfileDemo; 