import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lightbox } from '../index.js';

describe('Lightbox', () => {
  const images = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it('renders the current image and navigation', () => {
    render(<Lightbox images={images} currentIndex={1} onClose={onClose} />);
    expect(screen.getByAltText('Image 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('closes when clicking the close button', async () => {
    render(<Lightbox images={images} currentIndex={0} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText(/close lightbox/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates to next and previous images', async () => {
    render(<Lightbox images={images} currentIndex={0} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText(/next image/i));
    expect(screen.getByAltText('Image 2 of 3')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/previous image/i));
    expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument();
  });

  it('zooms in and out', async () => {
    render(<Lightbox images={images} currentIndex={0} onClose={onClose} />);
    const zoomIn = screen.getByLabelText(/zoom in/i);
    const zoomOut = screen.getByLabelText(/zoom out/i);
    await userEvent.click(zoomIn);
    expect(screen.getByText('120%')).toBeInTheDocument();
    await userEvent.click(zoomOut);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(<Lightbox images={images} currentIndex={0} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates with arrow keys', () => {
    render(<Lightbox images={images} currentIndex={0} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByAltText('Image 2 of 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument();
  });

  it('has correct accessibility roles and labels', () => {
    render(<Lightbox images={images} currentIndex={0} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText(/close lightbox/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next image/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/previous image/i)).toBeInTheDocument();
  });
}); 