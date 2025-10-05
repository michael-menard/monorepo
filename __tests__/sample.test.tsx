import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from './utils';
import { testA11y } from './utils';

// Sample component for testing
const SampleComponent = () => (
  <div>
    <h1>Hello World</h1>
    <button aria-label="Click me">Click me</button>
  </div>
);

describe('Sample Component', () => {
  it('renders correctly', () => {
    render(<SampleComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await testA11y(<SampleComponent />);
  });

  it('works with Redux provider', () => {
    render(<SampleComponent />, { withRedux: true });
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('works with Router provider', () => {
    render(<SampleComponent />, { withRouter: true });
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
}); 