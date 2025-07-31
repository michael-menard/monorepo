import React from 'react';
import { ProfilePageWithTour } from '../ProfilePageWithTour';
import type { Profile } from '../../types';

// Sample profile data for demonstration
const sampleProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  bio: 'Software developer passionate about creating amazing user experiences. I love working with React, TypeScript, and modern web technologies.',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  website: 'https://johndoe.dev',
  dateOfBirth: new Date('1990-05-15'),
  avatar: null,
  socialLinks: {
    twitter: 'https://twitter.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    instagram: 'https://instagram.com/johndoe'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Sample sidebar content
const sampleSidebarContent = (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-2">Account Settings</h3>
      <ul className="space-y-2">
        <li>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Profile Information
          </button>
        </li>
        <li>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Privacy Settings
          </button>
        </li>
        <li>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Security
          </button>
        </li>
        <li>
          <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Notifications
          </button>
        </li>
      </ul>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-2">Quick Stats</h3>
      <div className="space-y-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">42</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Projects</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">1,234</div>
          <div className="text-sm text-green-700 dark:text-green-300">Followers</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">567</div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Following</div>
        </div>
      </div>
    </div>
  </div>
);

export interface ProfileTourExampleProps {
  showTour?: boolean;
  onTourComplete?: () => void;
  onTourSkip?: () => void;
}

export const ProfileTourExample: React.FC<ProfileTourExampleProps> = ({
  showTour = true,
  onTourComplete,
  onTourSkip
}) => {
  const handleTourComplete = () => {
    console.log('Profile tour completed!');
    onTourComplete?.();
  };

  const handleTourSkip = () => {
    console.log('Profile tour skipped.');
    onTourSkip?.();
  };

  return (
    <ProfilePageWithTour
      profile={sampleProfile}
      sidebarContent={sampleSidebarContent}
      showTour={showTour}
      onTourComplete={handleTourComplete}
      onTourSkip={handleTourSkip}
    />
  );
};

export default ProfileTourExample; 