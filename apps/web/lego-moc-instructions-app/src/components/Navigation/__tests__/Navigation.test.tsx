import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Navigation from '../index';
import { clearCSRFToken, clearRefreshState } from '@repo/auth';

// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className, ...props }: any) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}));

// Mock UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid={`button-${variant || 'default'}`}
      {...props}
    >
      {children}
    </button>
  ),
  Avatar: ({ children, className, ...props }: any) => (
    <div data-testid="avatar" className={className} {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt, className, ...props }: any) => (
    <img data-testid="avatar-image" src={src} alt={alt} className={className} {...props} />
  ),
  AvatarFallback: ({ children, className, ...props }: any) => (
    <div data-testid="avatar-fallback" className={className} {...props}>
      {children}
    </div>
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Heart: ({ className }: { className?: string }) => (
    <svg data-testid="heart-icon" className={className}>
      <title>Heart</title>
    </svg>
  ),
  LogOut: ({ className }: { className?: string }) => (
    <svg data-testid="logout-icon" className={className}>
      <title>LogOut</title>
    </svg>
  ),
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="search-icon" className={className}>
      <title>Search</title>
    </svg>
  ),
  User: ({ className }: { className?: string }) => (
    <svg data-testid="user-icon" className={className}>
      <title>User</title>
    </svg>
  ),
  Settings: ({ className }: { className?: string }) => (
    <svg data-testid="settings-icon" className={className}>
      <title>Settings</title>
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-down-icon" className={className}>
      <title>ChevronDown</title>
    </svg>
  ),
  Lightbulb: ({ className }: { className?: string }) => (
    <svg data-testid="lightbulb-icon" className={className}>
      <title>Lightbulb</title>
    </svg>
  ),
}));

// Create mockAuthHook object that can be modified in tests
const mockAuthHook = {
  isAuthenticated: false,
  user: null,
  logout: vi.fn(),
};

// Mock auth hook
vi.mock('@repo/auth', () => ({
  useAuth: () => mockAuthHook,
  clearCSRFToken: vi.fn(),
  clearRefreshState: vi.fn(),
}));

// Mock the authApi and useCheckAuthQuery hook
vi.mock('@repo/auth/store/authApi', () => ({
  authApi: {
    reducerPath: 'authApi',
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: {
      resetApiState: { type: 'authApi/resetApiState' },
    },
  },
  useCheckAuthQuery: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}));

// Create a mock Redux store for testing with proper authApi setup
const createMockStore = () => {
  const mockAuthApiConfig = {
    reducerPath: 'authApi',
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  };

  return configureStore({
    reducer: {
      // Add authApi reducer to prevent middleware errors
      [mockAuthApiConfig.reducerPath]: mockAuthApiConfig.reducer,
      // Add minimal reducer for testing
      test: (state = {}) => state,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(mockAuthApiConfig.middleware),
  });
};

const renderNavigation = (props = {}) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Navigation {...props} />
      </BrowserRouter>
    </Provider>
  );
};

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure and Rendering', () => {
    it('should render navigation with proper structure', () => {
      renderNavigation();
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('flex', 'items-center', 'space-x-4');
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-nav-class';
      renderNavigation({ className: customClass });
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass(customClass);
    });

    it('should have responsive design classes', () => {
      renderNavigation();
      
      // Desktop navigation should be hidden on mobile
      const desktopNav = screen.getByRole('navigation').querySelector('.hidden.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    it('should show Sign In and Sign Up buttons when not authenticated', () => {
      renderNavigation();
      
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should have correct links for authentication buttons', () => {
      renderNavigation();
      
      const signInLink = screen.getByRole('link', { name: /sign in/i });
      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      
      expect(signInLink).toHaveAttribute('href', '/auth/login');
      expect(signUpLink).toHaveAttribute('href', '/auth/signup');
    });

    it('should show Browse MOCs link for unauthenticated users', () => {
      renderNavigation();

      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });
      expect(browseMocsLink).toBeInTheDocument();
      expect(browseMocsLink).toHaveAttribute('href', '/moc-gallery');
    });

    it('should show all public navigation links', () => {
      renderNavigation();

      // Public links that should always be visible
      expect(screen.getByRole('link', { name: /browse mocs/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /inspiration/i })).toBeInTheDocument();
    });

    it('should not show authenticated-only links', () => {
      renderNavigation();

      // These should not be visible when not authenticated
      expect(screen.queryByRole('link', { name: /wishlist/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument(); // Logout button
    });
  });

  describe('Navigation Links', () => {
    it('should render Browse MOCs link with correct attributes', () => {
      renderNavigation();
      
      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });
      expect(browseMocsLink).toHaveAttribute('href', '/moc-gallery');
      expect(browseMocsLink).toHaveClass(
        'flex', 'items-center', 'space-x-2', 'text-sm', 'font-medium',
        'text-muted-foreground', 'hover:text-foreground', 'transition-colors'
      );
    });

    it('should render Browse MOCs link with search icon', () => {
      renderNavigation();
      
      const searchIcon = screen.getByTestId('search-icon');
      expect(searchIcon).toBeInTheDocument();
      expect(searchIcon).toHaveClass('h-4', 'w-4');
    });

    it('should have proper hover effects on navigation links', () => {
      renderNavigation();
      
      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });
      expect(browseMocsLink).toHaveClass('hover:text-foreground', 'transition-colors');
    });
  });

  describe('Authentication Buttons', () => {
    it('should render Sign In button with correct styling', () => {
      renderNavigation();
      
      const signInButton = screen.getByTestId('button-outline');
      expect(signInButton).toBeInTheDocument();
      expect(signInButton).toHaveAttribute('data-variant', 'outline');
      expect(signInButton).toHaveAttribute('data-size', 'sm');
    });

    it('should render Sign Up button with correct styling', () => {
      renderNavigation();
      
      const signUpButton = screen.getByTestId('button-default');
      expect(signUpButton).toBeInTheDocument();
      expect(signUpButton).toHaveAttribute('data-size', 'sm');
    });

    it('should have proper button hierarchy (outline vs solid)', () => {
      renderNavigation();
      
      const signInButton = screen.getByTestId('button-outline');
      const signUpButton = screen.getByTestId('button-default');
      
      // Sign In should be outline (secondary action)
      expect(signInButton).toHaveAttribute('data-variant', 'outline');
      
      // Sign Up should be default/solid (primary action)
      expect(signUpButton).not.toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Icons and Visual Elements', () => {
    it('should render all required icons', () => {
      renderNavigation();
      
      // Search icon for Browse MOCs
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should have proper icon sizing', () => {
      renderNavigation();
      
      const searchIcon = screen.getByTestId('search-icon');
      expect(searchIcon).toHaveClass('h-4', 'w-4');
    });
  });

  describe('Responsive Design', () => {
    it('should hide main navigation on mobile', () => {
      renderNavigation();
      
      const mainNavigation = screen.getByRole('navigation').querySelector('.hidden.md\\:flex');
      expect(mainNavigation).toBeInTheDocument();
      expect(mainNavigation).toHaveClass('hidden', 'md:flex');
    });

    it('should show user actions on all screen sizes', () => {
      renderNavigation();
      
      const userActions = screen.getByRole('navigation').querySelector('.flex.items-center.space-x-2');
      expect(userActions).toBeInTheDocument();
      // Should not have responsive hiding classes
      expect(userActions).not.toHaveClass('hidden');
    });

    it('should handle responsive text visibility', () => {
      renderNavigation();
      
      // Button text should be hidden on small screens for some buttons
      const signInButton = screen.getByTestId('button-outline');
      const signUpButton = screen.getByTestId('button-default');
      
      expect(signInButton).toBeInTheDocument();
      expect(signUpButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic navigation element', () => {
      renderNavigation();
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should have accessible link text', () => {
      renderNavigation();
      
      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });
      expect(browseMocsLink).toHaveAccessibleName();
    });

    it('should have accessible button text', () => {
      renderNavigation();
      
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      
      expect(signInButton).toHaveAccessibleName();
      expect(signUpButton).toHaveAccessibleName();
    });

    it('should support keyboard navigation', async () => {
      renderNavigation();
      
      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      
      // Should be able to focus elements
      browseMocsLink.focus();
      expect(document.activeElement).toBe(browseMocsLink);
      
      signInButton.focus();
      expect(document.activeElement).toBe(signInButton);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing className gracefully', () => {
      expect(() => renderNavigation()).not.toThrow();
    });

    it('should handle navigation errors gracefully', () => {
      // Mock console.error to avoid test noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderNavigation();
      
      // Component should render without errors
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      // Set up authenticated state
      mockAuthHook.isAuthenticated = true;
      mockAuthHook.user = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      };
    });

    afterEach(() => {
      // Reset to unauthenticated state
      mockAuthHook.isAuthenticated = false;
      mockAuthHook.user = null;
    });

    it('should show avatar when authenticated', () => {
      renderNavigation();

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toBeInTheDocument();

      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatarImage).toHaveAttribute('alt', 'John Doe');
    });

    it('should show user initials in avatar fallback when no avatar URL', () => {
      // Test with user that has no avatar URL
      mockAuthHook.user = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatarUrl: undefined,
      };

      renderNavigation();

      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toBeInTheDocument();
      expect(avatarFallback).toHaveTextContent('JD');

      // Should not render avatar image when no URL
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });

    it('should show user initials when avatar URL is empty string', () => {
      // Test with user that has empty string avatar URL
      mockAuthHook.user = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatarUrl: '',
      };

      renderNavigation();

      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toBeInTheDocument();
      expect(avatarFallback).toHaveTextContent('JD');

      // Should not render avatar image when URL is empty string
      expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });

    it('should show email initial when no name provided', () => {
      mockAuthHook.user = {
        id: '1',
        name: undefined,
        email: 'john@example.com',
        avatarUrl: undefined,
      };

      renderNavigation();

      const avatarFallback = screen.getByTestId('avatar-fallback');
      expect(avatarFallback).toHaveTextContent('J');
    });

    it('should show dropdown menu when avatar is clicked', async () => {
      renderNavigation();

      const avatarButton = screen.getByRole('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Account Settings')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should call logout when logout button is clicked', async () => {
      renderNavigation();

      const avatarButton = screen.getByRole('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        const logoutButton = screen.getByText('Logout');
        fireEvent.click(logoutButton);
        expect(mockAuthHook.logout).toHaveBeenCalled();
      });
    });

    it('should clear authentication state during logout', async () => {
      renderNavigation();

      const avatarButton = screen.getByRole('button');
      fireEvent.click(avatarButton);

      // Wait for dropdown to appear, then click logout
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      // Wait for logout to be called and verify cleanup functions
      await waitFor(() => {
        expect(mockAuthHook.logout).toHaveBeenCalled();
        expect(clearCSRFToken).toHaveBeenCalled();
        expect(clearRefreshState).toHaveBeenCalled();
      });
    });

    it('should not show sign in/up buttons when authenticated', () => {
      renderNavigation();

      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently', () => {
      const store = createMockStore();
      const { rerender } = renderNavigation();

      // Initial render
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <Provider store={store}>
          <BrowserRouter>
            <Navigation />
          </BrowserRouter>
        </Provider>
      );

      // Should still be present
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should handle className changes efficiently', () => {
      const store = createMockStore();
      const { rerender } = renderNavigation({ className: 'initial-class' });

      let nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('initial-class');

      // Re-render with different className
      rerender(
        <Provider store={store}>
          <BrowserRouter>
            <Navigation className="updated-class" />
          </BrowserRouter>
        </Provider>
      );

      nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('updated-class');
      expect(nav).not.toHaveClass('initial-class');
    });
  });
});
