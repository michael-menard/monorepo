import type { ComponentType } from 'react';
import { RouteGuard } from './RouteGuard.js';

interface RouteGuardOptions {
  requireAuth?: boolean;
  requireVerified?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function withRouteGuard<P extends object>(
  Component: ComponentType<P>,
  options: RouteGuardOptions = {}
) {
  const WrappedComponent = (props: P) => (
    <RouteGuard {...options}>
      <Component {...props} />
    </RouteGuard>
  );

  // Set display name for debugging
  WrappedComponent.displayName = `withRouteGuard(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Convenience HOCs for common use cases
export const withAuth = <P extends object>(Component: ComponentType<P>) =>
  withRouteGuard(Component, { requireAuth: true });

export const withVerifiedAuth = <P extends object>(Component: ComponentType<P>) =>
  withRouteGuard(Component, { requireAuth: true, requireVerified: true });

export const withAdminAuth = <P extends object>(Component: ComponentType<P>) =>
  withRouteGuard(Component, { requireAuth: true, requireVerified: true, requireAdmin: true }); 