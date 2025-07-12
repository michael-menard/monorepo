import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Home from '../index';

describe('Home', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <>{component}</>
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('renders the home page with welcome message', () => {
      renderWithRouter(<Home />);
      
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
    });

    it('displays the welcome description', () => {
      renderWithRouter(<Home />);
      
      expect(screen.getByText('This is the home page of our application')).toBeInTheDocument();
    });

    it('renders with proper heading structure', () => {
      renderWithRouter(<Home />);
      
      const heading = screen.getByRole('heading', { name: 'Welcome Home' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });
  });

  describe('Content Display', () => {
    it('displays all expected content elements', () => {
      renderWithRouter(<Home />);
      
      // Main heading
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
      
      // Description text
      expect(screen.getByText('This is the home page of our application')).toBeInTheDocument();
    });

    it('renders content in the correct order', () => {
      renderWithRouter(<Home />);
      
      const container = screen.getByText('Welcome Home').closest('div');
      const children = container?.children;
      
      if (children) {
        expect(children[0]).toHaveTextContent('Welcome Home');
        expect(children[1]).toHaveTextContent('This is the home page of our application');
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      renderWithRouter(<Home />);
      
      // Should have a main heading
      expect(screen.getByRole('heading', { name: 'Welcome Home' })).toBeInTheDocument();
      
      // Should have descriptive text
      expect(screen.getByText('This is the home page of our application')).toBeInTheDocument();
    });

    it('has accessible text content', () => {
      renderWithRouter(<Home />);
      
      // Text should be readable
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
      expect(screen.getByText('This is the home page of our application')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders with proper container structure', () => {
      renderWithRouter(<Home />);
      
      // Should have the main container
      const mainContainer = screen.getByText('Welcome Home').closest('div');
      expect(mainContainer).toBeInTheDocument();
    });

    it('renders with proper styling classes', () => {
      renderWithRouter(<Home />);
      
      const mainContainer = screen.getByText('Welcome Home').closest('div');
      expect(mainContainer).toHaveClass('bg-white/10', 'backdrop-blur-lg', 'p-8', 'rounded-xl', 'shadow-xl', 'border', 'border-white/20');
    });
  });

  describe('Edge Cases', () => {
    it('renders consistently across multiple renders', () => {
      const { rerender } = renderWithRouter(<Home />);
      
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
      expect(screen.getByText('This is the home page of our application')).toBeInTheDocument();
      
      rerender(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
      
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
      expect(screen.getByText('This is the home page of our application')).toBeInTheDocument();
    });

    it('handles component unmounting and remounting', () => {
      const { unmount } = renderWithRouter(<Home />);
      
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
      
      unmount();
      
      // Component should be removed from DOM
      expect(screen.queryByText('Welcome Home')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('works within the router context', () => {
      renderWithRouter(<Home />);
      
      // Component should render without router-related errors
      expect(screen.getByText('Welcome Home')).toBeInTheDocument();
    });

    it('maintains proper DOM structure', () => {
      renderWithRouter(<Home />);
      
      // Should have proper nesting
      const heading = screen.getByRole('heading');
      const paragraph = screen.getByText('This is the home page of our application');
      
      expect(heading).toBeInTheDocument();
      expect(paragraph).toBeInTheDocument();
      
      // Both should be within the same container
      const container = heading.closest('div');
      expect(paragraph.closest('div')).toBe(container);
    });
  });
}); 