import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  FormSection,
} from '@repo/ui';
import {
  AvatarUploader,
  ProfileMain,
  ProfilePage as ProfilePageComponent,
  ProfileSidebar,
} from '@repo/profile';
import { LegoProfileContent } from './LegoProfileContent';
import type { Profile, ProfileForm } from '@repo/profile';

// Mock profile data - in a real app, this would come from an API
const mockProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  bio: 'LEGO enthusiast and MOC creator. I love building custom models and sharing instructions with the community.',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  phone: '+1 (555) 123-4567',
  dateOfBirth: new Date('1990-05-15'),
  location: 'San Francisco, CA',
  website: 'https://johndoe.dev',
  socialLinks: {
    twitter: 'https://twitter.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    instagram: 'https://instagram.com/johndoe',
  },
  preferences: {
    emailNotifications: true,
    pushNotifications: false,
    publicProfile: true,
    theme: 'system',
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2024-01-15'),
};

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(mockProfile);
  const [isEditing, setIsEditing] = useState(false);

  const handleBack = () => {
    navigate('/');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (data: ProfileForm) => {
    // In a real app, this would call an API to update the profile
    setProfile((prev: Profile) => ({
      ...prev,
      ...data,
      updatedAt: new Date(),
    }));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleAvatarUpload = (file: File) => {
    // In a real app, this would upload to a server and return a URL
    const url = URL.createObjectURL(file);
    setProfile((prev: Profile) => ({
      ...prev,
      avatar: url,
      updatedAt: new Date(),
    }));
  };

  // Create the sidebar content using ProfileSidebar component
  const sidebarContent = (
    <ProfileSidebar
      profile={profile}
      onEdit={handleEdit}
      onUploadAvatar={handleAvatarUpload}
      isEditable={true}
    />
  );

  // Create the main content using ProfileMain component
  const mainContent = (
    <ProfileMain
      title="Profile"
      description="Manage your account settings and preferences"
    >
      <LegoProfileContent
        profile={profile}
        onEdit={handleEdit}
        isEditing={isEditing}
      />
    </ProfileMain>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={handleBack} className="mb-4">
          ← Back to Home
        </Button>
      </div>

      <ProfilePageComponent
        profile={profile}
        sidebarContent={sidebarContent}
      >
        {mainContent}
      </ProfilePageComponent>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Edit Profile</h2>
              <Button variant="ghost" onClick={handleCancel}>×</Button>
            </div>
            
            <div className="space-y-6">
              <div className="text-center">
                <AvatarUploader
                  currentAvatar={profile.avatar}
                  onUpload={handleAvatarUpload}
                  className="mx-auto"
                />
              </div>

              <FormSection
                fields={[
                  {
                    name: 'firstName',
                    label: 'First Name',
                    type: 'text',
                    value: profile.firstName,
                    required: true,
                  },
                  {
                    name: 'lastName',
                    label: 'Last Name',
                    type: 'text',
                    value: profile.lastName,
                    required: true,
                  },
                  {
                    name: 'email',
                    label: 'Email',
                    type: 'email',
                    value: profile.email,
                    required: true,
                  },
                  {
                    name: 'username',
                    label: 'Username',
                    type: 'text',
                    value: profile.username || '',
                  },
                  {
                    name: 'bio',
                    label: 'Bio',
                    type: 'textarea',
                    value: profile.bio || '',
                  },
                  {
                    name: 'phone',
                    label: 'Phone',
                    type: 'text',
                    value: profile.phone || '',
                  },
                  {
                    name: 'location',
                    label: 'Location',
                    type: 'text',
                    value: profile.location || '',
                  },
                  {
                    name: 'website',
                    label: 'Website',
                    type: 'url',
                    value: profile.website || '',
                  },
                ]}
                className="space-y-4"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={() => handleSave(profile)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage; 