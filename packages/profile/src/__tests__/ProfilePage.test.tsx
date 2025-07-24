import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfilePage } from '../components/ProfilePage.js';
import type { ProfileData } from '../types/index.js';

const mockProfile: ProfileData = {
  id: '1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: '',
  stats: {
    projects: 5,
    followers: 100,
    following: 50,
  },
};

describe('ProfilePage', () => {
  it('renders profile information correctly', () => {
    render(
      <ProfilePage profile={mockProfile}>
        <h2>Test Content</h2>
        <p>This is test content in the main area</p>
      </ProfilePage>
    );
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('This is test content in the main area')).toBeInTheDocument();
  });

  it('renders skeleton when loading', () => {
    render(<ProfilePage profile={mockProfile} loading />);
    expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
  });

  it('renders avatar with fallback when no avatar URL', () => {
    render(<ProfilePage profile={mockProfile} />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('renders username when no display name', () => {
    const profileNoName = { ...mockProfile, displayName: '' };
    render(<ProfilePage profile={profileNoName} />);
    // Should render the username as a heading
    expect(screen.getByRole('heading', { name: 'testuser' })).toBeInTheDocument();
  });

  it('renders without stats when not provided', () => {
    const profileNoStats = { ...mockProfile, stats: undefined };
    render(<ProfilePage profile={profileNoStats} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
}); 