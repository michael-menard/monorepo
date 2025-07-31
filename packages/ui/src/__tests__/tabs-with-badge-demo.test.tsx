import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TabsWithBadgeDemo from '../tabs-with-badge-demo';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Copy: () => <span data-testid="copy-icon">Copy</span>,
}));

describe('TabsWithBadgeDemo', () => {
  it('renders all tabs with correct labels', () => {
    render(<TabsWithBadgeDemo />);
    
    expect(screen.getByText('pnpm')).toBeInTheDocument();
    expect(screen.getByText('npm')).toBeInTheDocument();
    expect(screen.getByText('yarn')).toBeInTheDocument();
    expect(screen.getByText('bun')).toBeInTheDocument();
  });

  it('shows badges for tabs with count', () => {
    render(<TabsWithBadgeDemo />);
    
    expect(screen.getByText('9')).toBeInTheDocument(); // pnpm badge
    expect(screen.getByText('3')).toBeInTheDocument(); // yarn badge
  });

  it('shows default tab content', () => {
    render(<TabsWithBadgeDemo />);
    
    // Default tab (pnpm) should be visible
    expect(screen.getByText('pnpm dlx shadcn@latest add tabs')).toBeInTheDocument();
  });

  it('renders all tab triggers', () => {
    render(<TabsWithBadgeDemo />);
    
    // All tab triggers should be present (including badges in names)
    expect(screen.getByRole('tab', { name: 'pnpm 9' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'npm' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'yarn 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'bun' })).toBeInTheDocument();
  });

  it('renders copy button for active tab content', () => {
    render(<TabsWithBadgeDemo />);
    
    const copyButtons = screen.getAllByTestId('copy-icon');
    expect(copyButtons).toHaveLength(1); // Only one copy button for active tab
  });

  it('has correct default tab selected', () => {
    render(<TabsWithBadgeDemo />);
    
    const pnpmTab = screen.getByText('pnpm').closest('button');
    expect(pnpmTab).toHaveAttribute('data-state', 'active');
  });
}); 