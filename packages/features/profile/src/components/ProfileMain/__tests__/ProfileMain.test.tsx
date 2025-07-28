import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { ProfileMain } from '../index';

// Mock the UI components
vi.mock('@repo/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

describe('ProfileMain', () => {
  it('renders children content', () => {
    render(
      <ProfileMain>
        <div data-testid="test-content">Test content</div>
      </ProfileMain>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders with card wrapper by default', () => {
    render(
      <ProfileMain>
        <div>Test content</div>
      </ProfileMain>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  it('renders without card wrapper when showCard is false', () => {
    render(
      <ProfileMain showCard={false}>
        <div data-testid="test-content">Test content</div>
      </ProfileMain>
    );

    expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <ProfileMain title="Test Title">
        <div>Test content</div>
      </ProfileMain>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <ProfileMain description="Test description">
        <div>Test content</div>
      </ProfileMain>
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders both title and description when provided', () => {
    render(
      <ProfileMain title="Test Title" description="Test description">
        <div>Test content</div>
      </ProfileMain>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ProfileMain className="custom-class">
        <div>Test content</div>
      </ProfileMain>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
  });

  it('applies custom contentClassName', () => {
    render(
      <ProfileMain contentClassName="content-custom-class">
        <div>Test content</div>
      </ProfileMain>
    );

    const content = screen.getByTestId('card-content');
    expect(content.firstChild).toHaveClass('content-custom-class');
  });

  it('maintains consistent styling with default props', () => {
    render(
      <ProfileMain>
        <div>Test content</div>
      </ProfileMain>
    );

    const card = screen.getByTestId('card');
    const cardContent = screen.getByTestId('card-content');

    expect(card).toHaveClass('w-full', 'min-h-full');
    expect(cardContent).toHaveClass('p-6');
  });
}); 