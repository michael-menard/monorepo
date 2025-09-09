import React from 'react';
import { ProfilePage } from '../ProfilePage';
import { ProfileSidebar } from '../ProfileSidebar';
import type { Profile } from '../../schemas';

const exampleProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  bio: 'Software developer with 5+ years of experience in React, TypeScript, and Node.js. Passionate about creating user-friendly applications and contributing to open source projects.',
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
    theme: 'light',
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2024-01-15'),
};

export const ProfilePageExample: React.FC = () => {
  const handleEditProfile = () => {
    console.log('Edit profile clicked');
  };

  const sidebarContent = (
    <ProfileSidebar
      profile={exampleProfile}
      onEdit={handleEditProfile}
      isEditable={true}
    />
  );

  const mainContent = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">
          Manage your profile information, preferences, and account settings.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
          <p className="text-gray-600">
            This section would contain forms for editing personal information.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Settings</h2>
          <p className="text-gray-600">
            This section would contain forms for changing password, email, and other account settings.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferences</h2>
          <p className="text-gray-600">
            This section would contain forms for managing notification preferences and theme settings.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ProfilePage
      profile={exampleProfile}
      sidebarContent={sidebarContent}
    >
      {mainContent}
    </ProfilePage>
  );
};

export default ProfilePageExample;
