import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import MocGalleryCard, { MocGalleryCardSchema, MocGalleryCardData } from '../MocGalleryCard.js';

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    __esModule: true,
    motion: {
      div: React.forwardRef((props: any, ref) => <div ref={ref} {...props} />),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('MocGalleryCard', () => {
  const baseData: MocGalleryCardData = {
    title: 'Test MOC',
    imageUrl: 'https://example.com/image.jpg',
    instructionsAvailable: true,
    tags: ['tag1', 'tag2'],
    designer: 'Jane Doe',
  };

  it('renders with all fields', () => {
    render(<MocGalleryCard data={baseData} />);
    expect(screen.getByText('Test MOC')).toBeInTheDocument();
    expect(screen.getByAltText('Test MOC')).toBeInTheDocument();
    expect(screen.getByText('By Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('renders with only required fields', () => {
    render(<MocGalleryCard data={{ title: 'Minimal MOC' }} />);
    expect(screen.getByText('Minimal MOC')).toBeInTheDocument();
    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByText('By')).not.toBeInTheDocument();
  });

  it('does not render designer if not present', () => {
    render(<MocGalleryCard data={{ ...baseData, designer: undefined }} />);
    expect(screen.queryByText('By Jane Doe')).not.toBeInTheDocument();
  });

  it('renders tags if present', () => {
    render(<MocGalleryCard data={{ ...baseData, tags: ['foo', 'bar'] }} />);
    expect(screen.getByText('foo')).toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
  });

  it('omits tags if not present', () => {
    render(<MocGalleryCard data={{ ...baseData, tags: undefined }} />);
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
    expect(screen.queryByText('bar')).not.toBeInTheDocument();
  });

  it('shows placeholder if imageUrl is missing', () => {
    render(<MocGalleryCard data={{ ...baseData, imageUrl: undefined }} />);
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('shows overlay with "View Instructions" on hover if instructionsAvailable', () => {
    render(<MocGalleryCard data={baseData} />);
    const card = screen.getByTestId('mock-gallery-card');
    fireEvent.mouseEnter(card);
    expect(screen.getByText('View Instructions')).toBeInTheDocument();
    fireEvent.mouseLeave(card);
    expect(screen.queryByText('View Instructions')).not.toBeInTheDocument();
  });

  it('shows overlay with "No Instructions" on hover if instructionsAvailable is false', () => {
    render(<MocGalleryCard data={{ ...baseData, instructionsAvailable: false }} />);
    const card = screen.getByTestId('mock-gallery-card');
    fireEvent.mouseEnter(card);
    expect(screen.getByText('No Instructions')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<MocGalleryCard data={baseData} onClick={handleClick} />);
    const card = screen.getByTestId('mock-gallery-card');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalled();
  });

  it('has correct alt text for image', () => {
    render(<MocGalleryCard data={baseData} />);
    expect(screen.getByAltText('Test MOC')).toBeInTheDocument();
  });

  it('is queryable by data-testid', () => {
    render(<MocGalleryCard data={baseData} data-testid="custom-id" />);
    expect(screen.getByTestId('custom-id')).toBeInTheDocument();
  });

  it('validates data with Zod schema', () => {
    expect(() => MocGalleryCardSchema.parse(baseData)).not.toThrow();
    expect(() => MocGalleryCardSchema.parse({ title: 'ok' })).not.toThrow();
    expect(() => MocGalleryCardSchema.parse({})).toThrow();
  });
}); 