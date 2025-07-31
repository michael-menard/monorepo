import React from 'react';
import { TourProvider, TourStep, TourTrigger } from '@repo/ui';
import { ProfilePage } from '../ProfilePage';
import type { ProfilePageProps } from '../../types';

export interface ProfilePageWithTourProps extends ProfilePageProps {
  showTour?: boolean;
  onTourComplete?: () => void;
  onTourSkip?: () => void;
}

export const ProfilePageWithTour: React.FC<ProfilePageWithTourProps> = ({
  showTour = true,
  onTourComplete,
  onTourSkip,
  ...profilePageProps
}) => {
  return (
    <TourProvider
      autoStart={showTour}
      shouldStart={showTour}
      onTourComplete={onTourComplete}
      onTourSkip={onTourSkip}
      storageKey="profile-tour-completed"
    >
      <div className="relative">
        {/* Tour Trigger Button */}
        <div className="absolute top-4 right-4 z-10">
          <TourTrigger className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors">
            Take Profile Tour
          </TourTrigger>
        </div>

        {/* Profile Page with Tour Steps */}
        <ProfilePage {...profilePageProps}>
          <TourStep
            id="profile-header"
            title="Welcome to Your Profile"
            content="This is your personal profile page where you can view and manage your account information."
            order={1}
            position="bottom"
          >
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Profile Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage your account settings and personal information
              </p>
            </div>
          </TourStep>

          <TourStep
            id="profile-avatar"
            title="Profile Avatar"
            content="Your profile picture helps others recognize you. You can upload a new image or use your initials as a placeholder."
            order={2}
            position="right"
          >
            <div className="profile-avatar-section mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-gray-600">
                    {profilePageProps.profile?.firstName?.[0] || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Profile Picture</h3>
                  <p className="text-sm text-gray-500">Upload or change your avatar</p>
                </div>
              </div>
            </div>
          </TourStep>

          <TourStep
            id="profile-info"
            title="Personal Information"
            content="Here you can view and edit your basic information like name, email, and contact details."
            order={3}
            position="left"
          >
            <div className="profile-info-section mb-6">
              <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {profilePageProps.profile?.firstName} {profilePageProps.profile?.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {profilePageProps.profile?.email}
                  </p>
                </div>
              </div>
            </div>
          </TourStep>

          <TourStep
            id="profile-bio"
            title="Bio Section"
            content="Add a short bio to tell others about yourself. This helps build your online presence."
            order={4}
            position="top"
          >
            <div className="profile-bio-section mb-6">
              <h3 className="text-xl font-semibold mb-4">About Me</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">
                  {profilePageProps.profile?.bio || "Tell us about yourself..."}
                </p>
              </div>
            </div>
          </TourStep>

          <TourStep
            id="profile-settings"
            title="Account Settings"
            content="Access your account settings, privacy controls, and security options from the sidebar."
            order={5}
            position="left"
          >
            <div className="profile-settings-section mb-6">
              <h3 className="text-xl font-semibold mb-4">Account Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Privacy</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Control who can see your profile
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100">Security</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Manage your account security
                  </p>
                </div>
              </div>
            </div>
          </TourStep>

          <TourStep
            id="profile-actions"
            title="Quick Actions"
            content="Use these quick action buttons to edit your profile, change settings, or view your activity."
            order={6}
            position="bottom"
          >
            <div className="profile-actions-section">
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Edit Profile
                </button>
                <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                  View Activity
                </button>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Export Data
                </button>
              </div>
            </div>
          </TourStep>
        </ProfilePage>
      </div>
    </TourProvider>
  );
};

export default ProfilePageWithTour; 