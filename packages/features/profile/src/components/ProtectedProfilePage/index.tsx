import React from 'react'
import { ProfilePage } from '../ProfilePage'
import type { ProfilePageProps } from '../../types'

export interface ProtectedProfilePageProps extends ProfilePageProps {
  requiredRole?: string
  requireVerified?: boolean
  redirectTo?: string
  unauthorizedTo?: string
}

/**
 * ProtectedProfilePage component
 *
 * Note: Route protection should now be handled at the route level using
 * Cognito route guards in the consuming application, not at the component level.
 *
 * This component is kept for backward compatibility but route protection
 * should be implemented using createCognitoRouteGuard in the route definition.
 */
export const ProtectedProfilePage: React.FC<ProtectedProfilePageProps> = ({
  requiredRole, // Deprecated - use route-level guards
  requireVerified, // Deprecated - use route-level guards
  redirectTo, // Deprecated - use route-level guards
  unauthorizedTo, // Deprecated - use route-level guards
  ...profilePageProps
}) => {
  // Route protection is now handled at the route level with Cognito guards
  // This component just renders the ProfilePage directly
  return <ProfilePage {...profilePageProps} />
}

export default ProtectedProfilePage
