import React from 'react';
import { createTanStackRouteGuard } from '@repo/auth';
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
  const RouteGuard = createTanStackRouteGuard({
    requiredRole,
    requireVerified,
    redirectTo,
    unauthorizedTo,
  });

  return (
    <RouteGuard>
      <ProfilePage {...profilePageProps} />
    </RouteGuard>
  );
};

export default ProtectedProfilePage;
