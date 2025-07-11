import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('has the correct CSS classes for styling', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass('w-8', 'h-8', 'border-4', 'border-primary', 'border-t-transparent', 'rounded-full');
  });

  it('is centered on the screen', () => {
    render(<LoadingSpinner />);
    const container = screen.getByRole('generic').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-screen');
  });
}); 