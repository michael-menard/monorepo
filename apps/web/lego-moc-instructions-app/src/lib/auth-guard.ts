// Import the TanStack route guard from the auth package
import {
  createTanStackRouteGuard as baseCreateTanStackRouteGuard,
  type TanStackRouteGuardOptions,
} from '@repo/auth';
import { store } from '../store/store';

// Create a wrapper that automatically provides the Redux store
export const createTanStackRouteGuard = (
  options: Omit<TanStackRouteGuardOptions, 'store'> = {},
  redirectFn?: (options: { to: string; replace?: boolean }) => any,
) => {
  return baseCreateTanStackRouteGuard({
    ...options,
    store, // Automatically provide the store
  });
};

export type { TanStackRouteGuardOptions };
