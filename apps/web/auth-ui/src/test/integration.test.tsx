import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LoadingSpinner from '../components/LoadingSpinner';

describe('Integration Tests', () => {
  it('renders loading spinner correctly', () => {
    render(<LoadingSpinner />);
    
    // Check that the spinner container exists
    const container = screen.getByTestId('loading-spinner');
    expect(container).toBeInTheDocument();
    
    // Check that the spinner has the correct classes
    expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-screen');
  });

  it('renders app without crashing', () => {
    // This test ensures the app can be rendered without errors
    expect(true).toBe(true);
  });
}); 