import { jsx as _jsx } from "react/jsx-runtime";
import { RouteGuard } from './RouteGuard';
export function withRouteGuard(Component, options = {}) {
    const WrappedComponent = (props) => (_jsx(RouteGuard, { ...options, children: _jsx(Component, { ...props }) }));
    // Set display name for debugging
    WrappedComponent.displayName = `withRouteGuard(${Component.displayName || Component.name})`;
    return WrappedComponent;
}
// Convenience HOCs for common use cases
export const withAuth = (Component) => withRouteGuard(Component, { requireAuth: true });
export const withVerifiedAuth = (Component) => withRouteGuard(Component, { requireAuth: true, requireVerified: true });
export const withAdminAuth = (Component) => withRouteGuard(Component, { requireAuth: true, requireVerified: true, requireAdmin: true });
