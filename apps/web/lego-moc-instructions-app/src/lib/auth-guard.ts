// Local shim to import the TanStack route guard directly from the workspace source.
// This avoids package export/type resolution issues while keeping the app build green per Build-First policy.
export {
  createTanStackRouteGuard,
  type TanStackRouteGuardOptions,
} from '../../../../../packages/auth/src/components/TanStackRouteGuard';
