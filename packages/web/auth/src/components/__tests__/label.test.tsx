import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../ui/label';

describe('Label', () => {
  it('renders the label with children', () => {
    render(<Label htmlFor="test-input">Test Label</Label>);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('forwards className to Label', () => {
    render(<Label htmlFor="test-input" className="custom-label">Label</Label>);
    expect(screen.getByText('Label')).toHaveClass('custom-label');
  });

  it('forwards htmlFor to the underlying element', () => {
    render(<Label htmlFor="test-input">Label</Label>);
    const label = screen.getByText('Label');
    expect(label).toHaveAttribute('for', 'test-input');
  });
}); 