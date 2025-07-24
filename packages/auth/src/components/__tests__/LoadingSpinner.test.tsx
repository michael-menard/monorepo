import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner/index.js';

describe('LoadingSpinner', () => {
  it('renders the loading spinner', () => {
    render(<LoadingSpinner />);
    
    // Check that the motion div is rendered
    const motionDiv = document.querySelector('[data-testid="motion-div"]');
    expect(motionDiv).toBeInTheDocument();
  });

  it('has the correct CSS classes', () => {
    render(<LoadingSpinner />);
    
    const container = document.querySelector('.min-h-screen');
    expect(container).toHaveClass('min-h-screen', 'bg-gradient-to-br', 'from-gray-900', 'via-green-900', 'to-emerald-900', 'flex', 'items-center', 'justify-center', 'relative', 'overflow-hidden');
  });

  it('renders with custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const container = document.querySelector('.min-h-screen');
    expect(container).toHaveClass('custom-class');
  });

  it('renders the motion div with correct classes', () => {
    render(<LoadingSpinner />);
    
    // The motion div should have the spinner classes
    const motionDiv = document.querySelector('[data-testid="motion-div"]');
    expect(motionDiv).toHaveClass('w-16', 'h-16', 'border-4', 'border-t-4', 'border-t-green-500', 'border-green-200', 'rounded-full');
  });

  it('has proper motion animation props', () => {
    render(<LoadingSpinner />);
    
    const motionDiv = document.querySelector('[data-testid="motion-div"]');
    expect(motionDiv).toHaveAttribute('data-animate');
    expect(motionDiv).toHaveAttribute('data-transition');
  });
}); 