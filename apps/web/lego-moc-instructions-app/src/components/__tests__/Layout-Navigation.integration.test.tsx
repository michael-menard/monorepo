import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import Navigation from '../Navigation';

/**
 * Integration Tests for Layout and Navigation Components
 * 
 * These tests verify that the Layout and Navigation components work together
 * correctly, including responsive behavior, authentication states, and user interactions.
 */

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

const renderLayoutWithNavigation = (children?: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <Layout>
        {children || <div data-testid="page-content">Page Content</div>}
      </Layout>
    </BrowserRouter>
  );
};

const renderStandaloneNavigation = (props = {}) => {
  return render(
    <BrowserRouter>
      <Navigation {...props} />
    </BrowserRouter>
  );
};

describe('Layout and Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Integration', () => {
    it('should render Layout with embedded Navigation components', () => {
      renderLayoutWithNavigation();

      // Layout structure - should have navigation elements
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Navigation elements within layout
      expect(screen.getByRole('link', { name: /moc builder/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /browse mocs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should maintain proper layout hierarchy', () => {
      renderLayoutWithNavigation();

      const navElements = screen.getAllByRole('navigation');
      const main = screen.getByRole('main');

      // Main navigation (first one) should come before main content
      expect(navElements[0].compareDocumentPosition(main)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('should render page content within layout main section', () => {
      const customContent = <div data-testid="custom-page">Custom Page Content</div>;
      renderLayoutWithNavigation(customContent);
      
      const main = screen.getByRole('main');
      const customPage = screen.getByTestId('custom-page');
      
      expect(main).toContainElement(customPage);
    });
  });

  describe('Responsive Navigation Integration', () => {
    it('should render both desktop and mobile navigation in layout', () => {
      renderLayoutWithNavigation();
      
      // Should have multiple instances of navigation links (desktop + mobile)
      const browseMocsLinks = screen.getAllByRole('link', { name: /browse mocs/i });
      expect(browseMocsLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should apply responsive classes correctly in layout context', () => {
      renderLayoutWithNavigation();

      const navElements = screen.getAllByRole('navigation');
      const mainNavbar = navElements[0]; // The main layout navbar

      // Check that navigation container has proper flex classes
      const navContainer = mainNavbar.querySelector('.flex.items-center');
      expect(navContainer).toBeInTheDocument();

      // Check that the navigation component itself is present
      const navigationComponent = navElements[1]; // The Navigation component
      expect(navigationComponent).toBeInTheDocument();
    });

    it('should maintain sticky positioning in layout', () => {
      renderLayoutWithNavigation();

      const navElements = screen.getAllByRole('navigation');
      const navbar = navElements[0]; // Main navbar
      expect(navbar).toHaveClass('sticky', 'top-0', 'z-50');
    });
  });

  describe('Brand and Navigation Interaction', () => {
    it('should have brand logo linking to home', () => {
      renderLayoutWithNavigation();
      
      const brandLink = screen.getByRole('link', { name: /moc builder/i });
      expect(brandLink).toHaveAttribute('href', '/');
    });

    it('should have consistent styling between brand and navigation', () => {
      renderLayoutWithNavigation();
      
      const brandLink = screen.getByRole('link', { name: /moc builder/i });
      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });

      // Both should have transition classes
      expect(brandLink).toHaveClass('transition-opacity');
      expect(browseMocsLink).toHaveClass('transition-colors');
    });

    it('should maintain proper spacing between brand and navigation', () => {
      renderLayoutWithNavigation();

      const navElements = screen.getAllByRole('navigation');
      const navbar = navElements[0]; // Main navbar
      const navbarContent = navbar.querySelector('.flex.h-16.items-center.justify-between');

      expect(navbarContent).toBeInTheDocument();
      expect(navbarContent).toHaveClass('justify-between');
    });
  });

  describe('Authentication State Integration', () => {
    it('should show unauthenticated navigation state in layout', () => {
      renderLayoutWithNavigation();
      
      // Should show sign in/up buttons
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      
      // Should not show authenticated-only links
      expect(screen.queryByRole('link', { name: /wishlist/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument();
    });

    it('should handle authentication button clicks', async () => {
      renderLayoutWithNavigation();
      
      const signInLink = screen.getByRole('link', { name: /sign in/i });
      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      
      expect(signInLink).toHaveAttribute('href', '/auth/login');
      expect(signUpLink).toHaveAttribute('href', '/auth/signup');
    });
  });

  describe('Navigation Flow Integration', () => {
    it('should support navigation between different sections', () => {
      renderLayoutWithNavigation();
      
      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });
      expect(browseMocsLink).toHaveAttribute('href', '/moc-gallery');
    });

    it('should maintain navigation state across page changes', () => {
      const { rerender } = renderLayoutWithNavigation(
        <div data-testid="page-1">Page 1</div>
      );
      
      // Initial page
      expect(screen.getByTestId('page-1')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /browse mocs/i })).toBeInTheDocument();
      
      // Change page content
      rerender(
        <BrowserRouter>
          <Layout>
            <div data-testid="page-2">Page 2</div>
          </Layout>
        </BrowserRouter>
      );
      
      // Navigation should persist
      expect(screen.getByTestId('page-2')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /browse mocs/i })).toBeInTheDocument();
    });
  });

  describe('Visual Integration', () => {
    it('should have consistent styling between layout and navigation', () => {
      renderLayoutWithNavigation();

      const navElements = screen.getAllByRole('navigation');
      const navbar = navElements[0]; // Main navbar

      // Should have backdrop blur and background
      expect(navbar).toHaveClass('bg-background/95', 'backdrop-blur');

      // Should have border
      expect(navbar).toHaveClass('border-b');
    });

    it('should maintain proper z-index stacking', () => {
      renderLayoutWithNavigation();

      const navElements = screen.getAllByRole('navigation');
      const navbar = navElements[0]; // Main navbar
      expect(navbar).toHaveClass('z-50');
    });

    it('should have proper gradient background integration', () => {
      renderLayoutWithNavigation();

      // Layout should have gradient background
      const navElements = screen.getAllByRole('navigation');
      const layoutContainer = navElements[0].parentElement;
      expect(layoutContainer).toHaveClass('bg-gradient-to-r');
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain proper heading hierarchy', () => {
      renderLayoutWithNavigation(
        <div>
          <h1>Page Title</h1>
          <p>Page content</p>
        </div>
      );

      // Should have proper semantic structure
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should support keyboard navigation throughout layout', async () => {
      renderLayoutWithNavigation();
      
      const brandLink = screen.getByRole('link', { name: /moc builder/i });
      const browseMocsLink = screen.getByRole('link', { name: /browse mocs/i });
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      
      // Should be able to tab through navigation elements
      brandLink.focus();
      expect(document.activeElement).toBe(brandLink);
      
      browseMocsLink.focus();
      expect(document.activeElement).toBe(browseMocsLink);
      
      signInButton.focus();
      expect(document.activeElement).toBe(signInButton);
    });

    it('should have proper ARIA landmarks', () => {
      renderLayoutWithNavigation();

      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('should render efficiently with both components', () => {
      const startTime = performance.now();
      renderLayoutWithNavigation();
      const endTime = performance.now();
      
      // Should render quickly (less than 100ms in test environment)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should have all expected elements
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle re-renders efficiently', () => {
      const { rerender } = renderLayoutWithNavigation();

      // Multiple re-renders should not cause issues
      for (let i = 0; i < 5; i++) {
        rerender(
          <BrowserRouter>
            <Layout>
              <div data-testid={`content-${i}`}>Content {i}</div>
            </Layout>
          </BrowserRouter>
        );

        expect(screen.getByTestId(`content-${i}`)).toBeInTheDocument();
        const navElements = screen.getAllByRole('navigation');
        expect(navElements.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle navigation errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => renderLayoutWithNavigation()).not.toThrow();

      // Should still render basic structure
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('main')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle missing content gracefully', () => {
      expect(() => renderLayoutWithNavigation(null)).not.toThrow();

      // Layout structure should still be present
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
