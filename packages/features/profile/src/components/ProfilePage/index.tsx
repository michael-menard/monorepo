import React from 'react';
import { ProfileLayout } from '../ProfileLayout';
import { ProfileAvatar } from '../ProfileAvatar';
// TODO: Need to check if ProfileLayoutSidebar and ProfileAvatarInfo exist or need to be created
import type { ProfilePageProps } from '../../types';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  sidebarContent,
  children,
  className = '',
  sidebarClassName = '',
  contentClassName = '',
}) => {
  return (
    <ProfileLayout
      sidebarContent={sidebarContent}
      className={className}
      sidebarClassName={sidebarClassName}
      contentClassName={contentClassName}
      sidebarWidth="wide"
      leftOffset="medium"
      stickysidebar={true}
      sidebarBackground="default"
    >
      {children}
    </ProfileLayout>
  );
};

export default ProfilePage;