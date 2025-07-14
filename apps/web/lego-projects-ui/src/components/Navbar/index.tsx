
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from '@/store/hooks';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { MobileDrawer } from '@/components/MobileDrawer';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Menu, X, AlertCircle } from 'lucide-react';

/**
 * Navbar Component - Performance Optimized
 * 
 * Performance Optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - useCallback for event handlers to maintain referential equality
 * - useMemo for expensive computations and JSX elements
 * - Memoized navigation items and UI sections
 * - Optimized re-render patterns
 */
const Navbar: React.FC = React.memo(() => {
  const { isAuthenticated } = useAuthState();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Memoized navigation items
  const navigationItems = useMemo(() => [
    { path: '/projects', label: 'Projects page', text: 'Projects' },
    { path: '/instructions', label: 'Instructions page', text: 'Instructions' },
    { path: '/inspiration', label: 'Inspiration page', text: 'Inspiration' },
    { path: '/wishlist', label: 'Wishlist page', text: 'Wishlist' },
    { path: '/social', label: 'Social page', text: 'Social' },
  ], []);

  // Focus management for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Focus the first focusable element in the mobile menu
      const firstFocusable = mobileMenuRef.current?.querySelector(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    } else {
      // Return focus to the hamburger button
      profileButtonRef.current?.focus();
    }
  }, [isMobileMenuOpen]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Handle click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-mobile-menu-trigger]')
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

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

  const handleMobileMenuToggle = useCallback(() => {
    try {
      setIsMobileMenuOpen(prev => {
        const newState = !prev;
        const announcement = newState ? 'Mobile menu opened' : 'Mobile menu closed';
        announceToScreenReader(announcement);
        return newState;
      });
    } catch (error) {
      console.error('Error toggling mobile menu:', error);
      setError('Failed to toggle mobile menu');
    }
  }, [announceToScreenReader]);

  const handleLogoClick = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await navigate('/');
      announceToScreenReader('Navigated to home page');
    } catch (error) {
      console.error('Navigation error:', error);
      setError('Failed to navigate to home page');
      announceToScreenReader('Navigation failed');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, announceToScreenReader]);

  const handleNavLinkClick = useCallback(async (path: string, label: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await navigate(path);
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

  // Memoized desktop navigation items
  const desktopNavItems = useMemo(() => {
    // Only show navigation items for authenticated users
    if (!isAuthenticated) return null;

    return (
      <div className="hidden md:flex items-center space-x-8">
        {navigationItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavLinkClick(item.path, item.label)}
            disabled={isLoading}
            className="text-gray-700 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`View ${item.text.toLowerCase()}`}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              item.text
            )}
          </button>
        ))}
      </div>
    );
  }, [navigationItems, handleNavLinkClick, isLoading, isAuthenticated]);

  // Memoized desktop profile section
  const desktopProfileSection = useMemo(() => (
    <div className="hidden md:flex items-center space-x-4">
      {isAuthenticated ? (
        <ErrorBoundary
          fallback={
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Profile Error</span>
            </div>
          }
        >
          <ProfileDropdown />
        </ErrorBoundary>
      ) : (
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => handleNavLinkClick('/auth/login', 'Login page')}
            variant="ghost"
            disabled={isLoading}
            className="text-gray-700 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            aria-label="Sign in to your account"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </Button>
          <Button
            onClick={() => handleNavLinkClick('/auth/signup', 'Sign up page')}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            aria-label="Create a new account"
          >
            {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'Sign Up'}
          </Button>
        </div>
      )}
    </div>
  ), [isAuthenticated, handleNavLinkClick, isLoading]);

  // Memoized mobile menu button
  const mobileMenuButton = useMemo(() => (
    <div className="md:hidden">
      <Button
        ref={profileButtonRef}
        onClick={handleMobileMenuToggle}
        variant="ghost"
        size="sm"
        disabled={isLoading}
        className="p-2 disabled:opacity-50"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-menu"
        aria-label={isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
        data-mobile-menu-trigger
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" aria-hidden="true" />
        )}
      </Button>
    </div>
  ), [isMobileMenuOpen, handleMobileMenuToggle, isLoading]);

  // Error display
  const errorDisplay = useMemo(() => {
    if (!error) return null;

    return (
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-md p-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
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
    <>
      <nav 
        className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <button
                onClick={handleLogoClick}
                disabled={isLoading}
                className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Go to home page"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <span>Lego Projects</span>
                {isLoading && <LoadingSpinner size="sm" className="ml-2" />}
              </button>
            </div>

            {/* Desktop Navigation */}
            {desktopNavItems}

            {/* Desktop Profile Section */}
            {desktopProfileSection}

            {/* Mobile Menu Button */}
            {mobileMenuButton}
          </div>
        </div>

        {/* Mobile Menu */}
        <ErrorBoundary
          fallback={
            <div className="p-4 text-center text-red-600">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p>Mobile menu failed to load</p>
            </div>
          }
        >
          <MobileDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </ErrorBoundary>
      </nav>

      {/* Error Display */}
      {errorDisplay}
    </>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar; 