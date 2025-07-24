import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useAppSelector } from '@/store';
import { Navigate, useLocation } from 'react-router-dom';
export function RouteGuard({ children, requireAuth = false }) {
    const { isAuthenticated, isInitialized } = useAppSelector(state => state.auth);
    const location = useLocation();
    // Show loading while auth state is being initialized
    if (!isInitialized) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" }) }));
    }
    // If auth is required but user is not authenticated, redirect to login
    if (requireAuth && !isAuthenticated) {
        return _jsx(Navigate, { to: "/auth/login", state: { from: location }, replace: true });
    }
    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (isAuthenticated && location.pathname.startsWith('/auth')) {
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
