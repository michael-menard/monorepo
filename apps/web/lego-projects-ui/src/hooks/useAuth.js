import { useAppDispatch, useAppSelector } from '@/store';
import { useNavigate } from 'react-router-dom';
import { authActions } from '@/store/slices/authSlice';
import { useEffect } from 'react';
/**
 * Enhanced auth hook that provides auth state and actions
 */
export function useAuth() {
    const authState = useAppSelector(state => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    // Update last activity on user interaction
    useEffect(() => {
        const handleUserActivity = () => {
            // Store last activity timestamp
            localStorage.setItem('lastActivity', Date.now().toString());
        };
        // Listen for user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, handleUserActivity, true);
        });
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleUserActivity, true);
            });
        };
    }, []);
    const handleLogout = async () => {
        dispatch(authActions.logout());
        navigate('/auth/login');
    };
    const handleForceLogout = async () => {
        dispatch(authActions.logout());
        navigate('/auth/login');
    };
    const updateLastActivity = () => {
        localStorage.setItem('lastActivity', Date.now().toString());
    };
    const getLastActivity = () => {
        const lastActivity = localStorage.getItem('lastActivity');
        return lastActivity ? parseInt(lastActivity) : null;
    };
    return {
        // State
        ...authState,
        // Actions
        logout: handleLogout,
        forceLogout: handleForceLogout,
        // Utilities
        updateLastActivity,
        getLastActivity,
    };
}
/**
 * Simple hook to check if user is authenticated
 */
export function useIsAuthenticated() {
    const { isAuthenticated } = useAppSelector(state => state.auth);
    return isAuthenticated;
}
/**
 * Simple hook to get current user
 */
export function useUser() {
    const { user } = useAppSelector(state => state.auth);
    return user;
}
/**
 * Simple hook to check if user is verified
 */
export function useIsVerified() {
    const { user } = useAppSelector(state => state.auth);
    return user ? true : false; // Simplified - assume all users are verified for now
}
/**
 * Simple hook to get auth loading state
 */
export function useAuthLoading() {
    const { isLoading } = useAppSelector(state => state.auth);
    return isLoading;
}
/**
 * Simple hook to get auth error
 */
export function useAuthError() {
    const { error } = useAppSelector(state => state.auth);
    return error;
}
