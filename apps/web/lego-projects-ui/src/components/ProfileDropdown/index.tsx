import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, ChevronDown, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthState } from '@/store/hooks';
import { useAuth } from '@repo/auth';
import { useNavigate } from 'react-router-dom';

export const ProfileDropdown = React.memo(() => {
  const { isAuthenticated, user } = useAuthState();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  // Memoized menu items
  const menuItems = useMemo(() => [
    { path: '/profile', label: 'Profile page', text: 'Profile', icon: User },
    { path: '/settings', label: 'Settings page', text: 'Settings', icon: Settings },
  ], []);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus the first menu item when dropdown opens
      firstMenuItemRef.current?.focus();
    } else {
      // Return focus to trigger button when dropdown closes
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current && 
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

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

  const handleToggle = useCallback(() => {
    try {
      setIsOpen(prev => {
        const newState = !prev;
        const announcement = newState ? 'Profile dropdown opened' : 'Profile dropdown closed';
        announceToScreenReader(announcement);
        return newState;
      });
    } catch (error) {
      console.error('Error toggling dropdown:', error);
      setError('Failed to toggle dropdown');
    }
  }, [announceToScreenReader]);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await logout();
      setIsOpen(false);
      announceToScreenReader('Successfully logged out');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed. Please try again.');
      announceToScreenReader('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate, announceToScreenReader]);

  const handleNavLinkClick = useCallback(async (path: string, label: string) => {
    try {
      setIsLoading(true);
      setError(null);
      navigate(path);
      setIsOpen(false);
      announceToScreenReader(`Navigated to ${label}`);
    } catch (error) {
      console.error('Navigation error:', error);
      setError(`Failed to navigate to ${label}`);
      announceToScreenReader('Navigation failed');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, announceToScreenReader]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized trigger button
  const triggerButton = useMemo(() => (
    <button
      ref={triggerRef}
      onClick={handleToggle}
      disabled={isLoading}
      className="flex items-center space-x-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label="User menu"
      aria-describedby="user-menu-description"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user?.avatarUrl} alt={`${user?.name || 'User'} avatar`} />
        <AvatarFallback aria-label={`${user?.name || 'User'} avatar`}>
          {user?.name?.charAt(0) || "U"}
        </AvatarFallback>
      </Avatar>
      <ChevronDown 
        className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`} 
        aria-hidden="true"
      />
      <span className="sr-only" id="user-menu-description">
        Click to open user menu with profile, settings, and logout options
      </span>
    </button>
  ), [isOpen, handleToggle, user, isLoading]);

  // Memoized user info header
  const userInfoHeader = useMemo(() => (
    <div className="px-4 py-3 border-b border-gray-100">
      <p className="text-sm font-medium text-gray-900" id="user-name">
        {user?.name}
      </p>
      <p className="text-sm text-gray-500" id="user-email">
        {user?.email}
      </p>
    </div>
  ), [user]);

  // Memoized menu items
  const dropdownMenuItems = useMemo(() => (
    <div className="py-1" role="none">
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <a
            key={item.path}
            ref={index === 0 ? firstMenuItemRef : undefined}
            href={item.path}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:bg-gray-100 disabled:opacity-50"
            role="menuitem"
            onClick={(e) => {
              e.preventDefault();
              handleNavLinkClick(item.path, item.label);
            }}
            aria-label={`View your ${item.text.toLowerCase()}`}
            style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
          >
            <Icon className="mr-3 h-4 w-4" aria-hidden="true" />
            {item.text}
            {isLoading && <LoadingSpinner size="sm" className="ml-auto" />}
          </a>
        );
      })}
      
      <div className="border-t border-gray-100 my-1" role="separator" />
      
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors focus:outline-none focus:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        role="menuitem"
        aria-label="Sign out of your account"
      >
        <LogOut className="mr-3 h-4 w-4" aria-hidden="true" />
        Sign Out
        {isLoading && <LoadingSpinner size="sm" className="ml-auto" />}
      </button>
    </div>
  ), [menuItems, handleNavLinkClick, handleLogout, isLoading]);

  // Error display
  const errorDisplay = useMemo(() => {
    if (!error) return null;

    return (
      <div className="px-4 py-2 border-b border-red-100 bg-red-50">
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

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      {triggerButton}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
          >
            {/* Error Display */}
            {errorDisplay}

            {/* User Info Header */}
            {userInfoHeader}

            {/* Menu Items */}
            {dropdownMenuItems}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ProfileDropdown.displayName = 'ProfileDropdown'; 