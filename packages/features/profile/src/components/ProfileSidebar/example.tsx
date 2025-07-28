import React from 'react';
import { ProfileSidebar } from './index';
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

export const ProfileSidebarExample: React.FC = () => {
  const handleEditProfile = () => {
    console.log('Edit profile clicked');
  };

  const handleUploadAvatar = (file: File) => {
    console.log('Avatar upload:', file.name);
    // Here you would typically upload the file to your server
  };

  const handleViewProfile = () => {
    console.log('View profile clicked');
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ProfileSidebar Examples</h1>
      
      {/* Read-only Profile Sidebar */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Read-only Profile Sidebar</h2>
        <ProfileSidebar
          profile={exampleProfile}
          onViewProfile={handleViewProfile}
        />
      </div>

      {/* Editable Profile Sidebar */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Editable Profile Sidebar</h2>
        <ProfileSidebar
          profile={exampleProfile}
          isEditable={true}
          onEdit={handleEditProfile}
          onUploadAvatar={handleUploadAvatar}
          onViewProfile={handleViewProfile}
        />
      </div>

      {/* Minimal Profile Sidebar */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Minimal Profile Sidebar</h2>
        <ProfileSidebar
          profile={{
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          }}
          isEditable={true}
          onEdit={handleEditProfile}
          onUploadAvatar={handleUploadAvatar}
        />
      </div>
    </div>
  );
};

export default ProfileSidebarExample; 