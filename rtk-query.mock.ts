// Shared RTK Query mock for all apps/packages
import { vi } from 'vitest';

// Base mock for createApi
export const createApi = vi.fn(() => ({
  injectEndpoints: vi.fn().mockReturnThis(),
  enhanceEndpoints: vi.fn().mockReturnThis(),
  endpoints: {},
  reducerPath: 'mockApi',
  reducer: vi.fn(),
  middleware: vi.fn(),
  util: {},
  // Mock hooks
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useLazyQuery: vi.fn(),
  usePrefetch: vi.fn(),
  // Add more hooks as needed
}));

// Utility to extend/override the base mock for specific endpoints
export function mockApiHooks(overrides: Partial<Record<string, any>>) {
  const api = createApi();
  Object.assign(api, overrides);
  return api;
}

// Example usage in a test:
// vi.mock('@reduxjs/toolkit/query/react', () => require('<root>/rtk-query.mock')); 