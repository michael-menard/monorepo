import React, { useEffect, useRef, forwardRef, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, Settings, Home, FileText, Lightbulb, Heart, AlertCircle, Users } from 'lucide-react';
import { useAuthState } from '@/store/hooks';
import { useAuth } from '@repo/auth';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer = React.memo(forwardRef<HTMLDivElement, MobileDrawerProps>(
  ({ isOpen, onClose }, ref) => {
    const { isAuthenticated, user } = useAuthState();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const firstNavItemRef = useRef<HTMLAnchorElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoized navigation items
    const navItems = useMemo(() => [
      { path: '/', label: 'Home', icon: Home },
      { path: '/projects', label: 'Projects', icon: FileText },
      { path: '/instructions', label: 'Instructions', icon: FileText },
      { path: '/inspiration', label: 'Inspiration', icon: Lightbulb },
      { path: '/wishlist', label: 'Wishlist', icon: Heart },
      { path: '/social', label: 'Social', icon: Users },
    ], []);

    // Focus management
    useEffect(() => {
      if (isOpen) {
        // Focus the close button when drawer opens
        closeButtonRef.current?.focus();
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
      } else {
        // Restore body scroll when drawer closes
        document.body.style.overflow = 'unset';
      }
    }, [isOpen]);

    // Handle Escape key to close drawer
    useEffect(() => {
      const handleEscapeKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscapeKey);
      }

      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }, [isOpen, onClose]);

    const announceToScreenReader = useCallback((message: string) => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }, []);

    const handleLogout = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        await logout();
        onClose();
        announceToScreenReader('Successfully logged out');
        navigate('/');
      } catch (error) {
        console.error('Logout failed:', error);
        setError('Logout failed. Please try again.');
        announceToScreenReader('Logout failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, [logout, onClose, navigate, announceToScreenReader]);

    const handleNavLinkClick = useCallback(async (path: string, label: string) => {
      try {
        setIsLoading(true);
        setError(null);
        navigate(path);
        onClose();
        announceToScreenReader(`Navigated to ${label}`);
      } catch (error) {
        console.error('Navigation error:', error);
        setError(`Failed to navigate to ${label}`);
        announceToScreenReader('Navigation failed');
      } finally {
        setIsLoading(false);
      }
    }, [navigate, onClose, announceToScreenReader]);

    // Handle click outside to close
    const handleBackdropClick = useCallback((event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }, [onClose]);

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    // Memoized user info section
    const userInfoSection = useMemo(() => {
      if (!isAuthenticated || !user) return null;

      return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      );
    }, [isAuthenticated, user]);

    // Memoized navigation items
    const navigationItems = useMemo(() => {
      // Only show navigation items for authenticated users
      if (!isAuthenticated) return null;

      return (
        <div className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <a
                key={item.path}
                ref={index === 0 ? firstNavItemRef : undefined}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavLinkClick(item.path, item.label);
                }}
                className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Navigate to ${item.label}`}
                style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
              >
                <Icon className="mr-3 h-4 w-4" aria-hidden="true" />
                {item.label}
                {isLoading && <LoadingSpinner size="sm" className="ml-auto" />}
              </a>
            );
          })}
        </div>
      );
    }, [navItems, handleNavLinkClick, isLoading, isAuthenticated]);

    // Memoized user actions
    const userActions = useMemo(() => {
      if (!isAuthenticated) return null;

      return (
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-1">
          <a
            href="/profile"
            onClick={(e) => {
              e.preventDefault();
              handleNavLinkClick('/profile', 'Profile page');
            }}
            className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            aria-label="View your profile"
            style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
          >
            <User className="mr-3 h-4 w-4" aria-hidden="true" />
            Profile
            {isLoading && <LoadingSpinner size="sm" className="ml-auto" />}
          </a>
          
          <a
            href="/settings"
            onClick={(e) => {
              e.preventDefault();
              handleNavLinkClick('/settings', 'Settings page');
            }}
            className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            aria-label="View your settings"
            style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
          >
            <Settings className="mr-3 h-4 w-4" aria-hidden="true" />
            Settings
            {isLoading && <LoadingSpinner size="sm" className="ml-auto" />}
          </a>
          
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex items-center w-full px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign out of your account"
          >
            <LogOut className="mr-3 h-4 w-4" aria-hidden="true" />
            Sign Out
            {isLoading && <LoadingSpinner size="sm" className="ml-auto" />}
          </button>
        </div>
      );
    }, [isAuthenticated, handleNavLinkClick, handleLogout, isLoading]);

    // Memoized auth links
    const authLinks = useMemo(() => {
      if (isAuthenticated) return null;

      return (
        <div className="space-y-3">
          <a
            href="/auth/login"
            onClick={(e) => {
              e.preventDefault();
              handleNavLinkClick('/auth/login', 'Login page');
            }}
            className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            aria-label="Sign in to your account"
            style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </a>
          <a
            href="/auth/signup"
            onClick={(e) => {
              e.preventDefault();
              handleNavLinkClick('/auth/signup', 'Sign up page');
            }}
            className="block px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            aria-label="Create a new account"
            style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
          >
            {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Sign Up'}
          </a>
        </div>
      );
    }, [isAuthenticated, handleNavLinkClick, isLoading]);

    // Error display
    const errorDisplay = useMemo(() => {
      if (!error) return null;

      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      );
    }, [error, clearError]);

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              role="presentation"
              aria-hidden="true"
            />
            
            {/* Drawer */}
            <motion.div
              ref={ref}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
              aria-describedby="drawer-description"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h2 id="drawer-title" className="text-lg font-semibold text-gray-900">
                    Menu
                  </h2>
                  <p id="drawer-description" className="text-sm text-gray-500 sr-only">
                    Navigation menu with links to different sections of the application
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  disabled={isLoading}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4" role="navigation" aria-label="Main navigation">
                {errorDisplay}
                {isAuthenticated ? (
                  <>
                    {userInfoSection}
                    {navigationItems}
                    {userActions}
                  </>
                ) : (
                  authLinks
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
));

MobileDrawer.displayName = 'MobileDrawer'; 