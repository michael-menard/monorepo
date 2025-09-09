declare module '@repo/auth/react-router' {
  import type { ComponentType, ReactNode } from 'react';

  export interface RouteGuardProps {
    children: ReactNode;
    requiredRole?: string;
    redirectTo?: string;
    unauthorizedTo?: string;
    requireVerified?: boolean;
  }

  export const RouteGuard: ComponentType<RouteGuardProps>;
  export const LoginForm: ComponentType;
  export const SignupForm: ComponentType;
}
