import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialShare } from '../SocialShare.js';
describe('SocialShare', () => {
  it('renders all share buttons', () => {
    render(<SocialShare />);
    expect(screen.getByLabelText(/share on twitter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share on facebook/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share on linkedin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share on whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share on email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/share on copy link/i)).toBeInTheDocument();
  });
}); 