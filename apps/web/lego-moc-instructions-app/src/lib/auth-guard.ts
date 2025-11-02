// Cognito-based route guard (replaces @repo/auth)
import {
  createCognitoRouteGuard,
  createAuthGuard,
  createGuestGuard,
  createVerifiedGuard,
  type CognitoRouteGuardOptions,
} from './cognito-route-guard'

// Export the Cognito route guard as the main route guard
export const createTanStackRouteGuard = createCognitoRouteGuard

// Export convenience functions
export { createCognitoRouteGuard, createAuthGuard, createGuestGuard, createVerifiedGuard }

// Export types (maintaining compatibility)
export type TanStackRouteGuardOptions = CognitoRouteGuardOptions
export type { CognitoRouteGuardOptions }
