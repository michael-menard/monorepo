import React from 'react';
import { ProfileTabs } from '../index';

export const ProfileTabsExample: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Profile Tabs Example</h1>
      <ProfileTabs defaultTab="instructions" />
    </div>
  );
};

export default ProfileTabsExample; 