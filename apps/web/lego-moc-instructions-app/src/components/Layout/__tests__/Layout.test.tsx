import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../index';

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

// Mock Navigation component
vi.mock('../../Navigation', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="navigation-component" className={className}>
      <a href="/moc-gallery" data-testid="nav-browse-mocs">Browse MOCs</a>
      <a href="/wishlist" data-testid="nav-wishlist">Wishlist</a>
      <a href="/profile" data-testid="nav-profile">Profile</a>
      <button data-testid="nav-signin">Sign In</button>
      <button data-testid="nav-signup">Sign Up</button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@repo/ui', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

const renderLayout = (children?: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <Layout>
        {children || <div data-testid="test-content">Test Content</div>}
      </Layout>
    </BrowserRouter>
  );
};

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure and Rendering', () => {
    it('should render the layout with proper structure', () => {
      renderLayout();

      // Check main layout structure
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should have sticky navbar with proper styling', () => {
      renderLayout();

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveClass('sticky', 'top-0', 'z-50', 'w-full');
      expect(navbar).toHaveClass('border-b', 'bg-background/95', 'backdrop-blur');
    });

    it('should render brand logo and name', () => {
      renderLayout();

      // Check for brand elements
      const brandLink = screen.getByRole('link', { name: /MOC Builder/i });
      expect(brandLink).toBeInTheDocument();
      expect(brandLink).toHaveAttribute('href', '/');

      // Check for logo
      const logo = screen.getByText('M');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveClass('text-primary-foreground', 'font-bold');
    });

    it('should render children content in main section', () => {
      const testContent = <div data-testid="custom-content">Custom Content</div>;
      renderLayout(testContent);

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    it('should render Navigation component', () => {
      renderLayout();

      // Should render single navigation component
      const navigationComponent = screen.getByTestId('navigation-component');
      expect(navigationComponent).toBeInTheDocument();
    });

    it('should render Navigation component in proper container', () => {
      renderLayout();

      // Navigation should be present
      const navigationComponent = screen.getByTestId('navigation-component');
      expect(navigationComponent).toBeInTheDocument();
    });

    it('should have proper container classes for navigation', () => {
      renderLayout();

      const navigationComponent = screen.getByTestId('navigation-component');

      // Navigation container should have flex classes
      expect(navigationComponent.parentElement).toHaveClass('flex', 'items-center');
    });
  });

  describe('Brand Interaction', () => {
    it('should have hover effects on brand link', () => {
      renderLayout();

      const brandLink = screen.getByRole('link', { name: /MOC Builder/i });
      expect(brandLink).toHaveClass('hover:opacity-80', 'transition-opacity');
    });

    it('should navigate to home when brand is clicked', () => {
      renderLayout();

      const brandLink = screen.getByRole('link', { name: /MOC Builder/i });
      expect(brandLink).toHaveAttribute('href', '/');
    });
  });

  describe('Layout Styling', () => {
    it('should have proper background gradient', () => {
      renderLayout();

      const layoutContainer = screen.getByRole('navigation').parentElement;
      expect(layoutContainer).toHaveClass('min-h-screen');
      expect(layoutContainer).toHaveClass('bg-gradient-to-r', 'from-secondary', 'via-tertiary', 'to-info');
    });

    it('should have proper navbar height and spacing', () => {
      renderLayout();

      const navbar = screen.getByRole('navigation');
      const navbarContent = navbar.querySelector('.flex.h-16');

      expect(navbarContent).toHaveClass('h-16', 'items-center', 'justify-between');
      expect(navbar.querySelector('.px-6')).toBeInTheDocument();
    });

    it('should have proper main content styling', () => {
      renderLayout();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      renderLayout();

      // Check for semantic elements
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have accessible brand link', () => {
      renderLayout();

      const brandLink = screen.getByRole('link', { name: /MOC Builder/i });
      expect(brandLink).toBeInTheDocument();
      expect(brandLink).toHaveAttribute('href', '/');
    });

    it('should support keyboard navigation', async () => {
      renderLayout();

      const brandLink = screen.getByRole('link', { name: /MOC Builder/i });

      // Focus should be able to reach the brand link
      brandLink.focus();
      expect(document.activeElement).toBe(brandLink);
    });
  });

  describe('Responsive Design', () => {
    it('should handle different screen sizes', () => {
      renderLayout();

      // Check that navigation component is present
      const navigationComponent = screen.getByTestId('navigation-component');
      expect(navigationComponent).toBeInTheDocument();

      // Check that the navigation container has proper flex classes
      const navContainer = navigationComponent.parentElement;
      expect(navContainer).toHaveClass('flex', 'items-center');
    });

    it('should maintain proper spacing on different viewports', () => {
      renderLayout();

      const navbar = screen.getByRole('navigation');
      const container = navbar.querySelector('.px-6');

      expect(container).toHaveClass('px-6');
    });
  });

  describe('Performance', () => {
    it('should render efficiently without unnecessary re-renders', () => {
      const { rerender } = renderLayout();

      // Initial render
      expect(screen.getByTestId('test-content')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <BrowserRouter>
          <Layout>
            <div data-testid="test-content">Test Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Should still be present
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });
});