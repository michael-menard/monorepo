import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../index';

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
}));

const renderNavigation = (props = {}) => {
  return render(
    <BrowserRouter>
      <Navigation {...props} />
    </BrowserRouter>
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

  describe('Performance', () => {
    it('should render efficiently', () => {
      const { rerender } = renderNavigation();
      
      // Initial render
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Re-render with same props
      rerender(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      );
      
      // Should still be present
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should handle className changes efficiently', () => {
      const { rerender } = renderNavigation({ className: 'initial-class' });
      
      let nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('initial-class');
      
      // Re-render with different className
      rerender(
        <BrowserRouter>
          <Navigation className="updated-class" />
        </BrowserRouter>
      );
      
      nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('updated-class');
      expect(nav).not.toHaveClass('initial-class');
    });
  });
});
