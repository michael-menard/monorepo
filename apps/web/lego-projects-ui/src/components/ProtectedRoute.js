import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useAppSelector } from '../../store/index.js';
import { Navigate, useLocation } from 'react-router-dom';
export function ProtectedRoute({ children }) {
    const { isAuthenticated, isInitialized } = useAppSelector(state => state.auth);
    const location = useLocation();
    // Show loading while auth state is being initialized
    if (!isInitialized) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" }) }));
    }
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/auth/login", state: { from: location }, replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
