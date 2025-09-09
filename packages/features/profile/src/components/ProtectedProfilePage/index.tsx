import React from 'react';
import { RouteGuard } from '@repo/auth/react-router';
import { ProfilePage } from '../ProfilePage';
import type { ProfilePageProps } from '../../types';

export interface ProtectedProfilePageProps extends ProfilePageProps {
  requiredRole?: string;
  requireVerified?: boolean;
  redirectTo?: string;
  unauthorizedTo?: string;
}

export const ProtectedProfilePage: React.FC<ProtectedProfilePageProps> = ({
  requiredRole,
  requireVerified = true, // Profile pages typically require verification
  redirectTo = '/login',
  unauthorizedTo = '/unauthorized',
  ...profilePageProps
}) => {
  return (
    <RouteGuard
      requiredRole={requiredRole}
      requireVerified={requireVerified}
      redirectTo={redirectTo}
      unauthorizedTo={unauthorizedTo}
    >
      <ProfilePage {...profilePageProps} />
    </RouteGuard>
  );
};

export default ProtectedProfilePage;
