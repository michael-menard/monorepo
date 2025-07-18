import React, { useState } from 'react';
import { ProfilePage, type ProfileData } from '@monorepo/profile';

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

  const handleAvatarUpload = async (file: File): Promise<string> => {
    // In a real app, you would upload to your backend API
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      // Example API call to the backend
      const response = await fetch(`${import.meta.env.VITE_LEGO_PROJECTS_API}/api/users/1/avatar`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const { avatarUrl } = await response.json();
      
      // Update the profile with new avatar URL
      setProfile((prev: ProfileData) => ({ ...prev, avatarUrl }));
      
      return avatarUrl;
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