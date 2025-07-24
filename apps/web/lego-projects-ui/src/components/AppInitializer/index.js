import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * App Initializer Component
 * Handles app startup, authentication initialization, theme setup, and global state management
 */
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { authActions, getStoredTokens } from '@/store/slices/authSlice';
import { uiActions } from '@/store/slices/uiSlice';
// Simple loading spinner component
const LoadingSpinner = () => (_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" }));
export const AppInitializer = ({ children }) => {
    const dispatch = useAppDispatch();
    const { isInitialized } = useAppSelector(state => state.auth);
    const { theme } = useAppSelector(state => state.preferences);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Set up theme detection
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                const systemTheme = mediaQuery.matches ? 'dark' : 'light';
                dispatch(uiActions.setSystemTheme(systemTheme));
                // Listen for system theme changes
                const handleThemeChange = (e) => {
                    dispatch(uiActions.setSystemTheme(e.matches ? 'dark' : 'light'));
                };
                mediaQuery.addEventListener('change', handleThemeChange);
                // Set up responsive breakpoint detection
                const updateScreenSize = () => {
                    const width = window.innerWidth;
                    let screenSize;
                    if (width < 640)
                        screenSize = 'sm';
                    else if (width < 768)
                        screenSize = 'md';
                    else if (width < 1024)
                        screenSize = 'lg';
                    else if (width < 1280)
                        screenSize = 'xl';
                    else
                        screenSize = '2xl';
                    dispatch(uiActions.setScreenSize(screenSize));
                };
                updateScreenSize();
                window.addEventListener('resize', updateScreenSize);
                // Initialize authentication from stored tokens
                const { token, refreshToken, rememberMe } = getStoredTokens();
                if (token) {
                    // TODO: Validate token with API call
                    // For now, just set the token in state
                    dispatch(authActions.initializeAuth({
                        token,
                        refreshToken: refreshToken || undefined,
                        rememberMe,
                    }));
                }
                else {
                    dispatch(authActions.initializeAuth({}));
                }
                // Cleanup function
                return () => {
                    mediaQuery.removeEventListener('change', handleThemeChange);
                    window.removeEventListener('resize', updateScreenSize);
                };
            }
            catch (error) {
                console.error('Failed to initialize app:', error);
                dispatch(authActions.setError('Failed to initialize application'));
            }
            finally {
                setIsLoading(false);
            }
        };
        initializeApp();
    }, [dispatch]);
    // Apply theme to document
    useEffect(() => {
        const applyTheme = (themeValue) => {
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            if (themeValue === 'auto') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            }
            else {
                root.classList.add(themeValue);
            }
        };
        applyTheme(theme);
    }, [theme]);
    // Show loading spinner while initializing
    if (isLoading || !isInitialized) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-background", children: _jsxs("div", { className: "text-center space-y-4", children: [_jsx(LoadingSpinner, {}), _jsx("p", { className: "text-muted-foreground", children: "Initializing application..." })] }) }));
    }
    return _jsx(_Fragment, { children: children });
};
export default AppInitializer;
