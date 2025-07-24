import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfilePage } from '../components/ProfilePage.js';
import type { ProfileData } from '../types/index.js';

describe('Profile Package Integration', () => {
  const profile: ProfileData = {
    id: '1',
    username: 'integrationuser',
    displayName: 'Integration User',
    avatarUrl: '',
    stats: {
      projects: 3,
      followers: 42,
      following: 7,
    },
  };

  it('renders complete profile page with all components', () => {
    render(
      <ProfilePage profile={profile}>
        <h2>Integration Content</h2>
        <p>This is integration test content</p>
      </ProfilePage>
    );
    expect(screen.getByText('Integration User')).toBeInTheDocument();
    expect(screen.getByText('@integrationuser')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('Integration Content')).toBeInTheDocument();
    expect(screen.getByText('This is integration test content')).toBeInTheDocument();
  });

  it('renders individual components correctly', () => {
    render(
      <ProfilePage profile={profile}>
        <div>Custom Main Content</div>
      </ProfilePage>
    );
    expect(screen.getByText('Integration User')).toBeInTheDocument();
    expect(screen.getByText('Custom Main Content')).toBeInTheDocument();
  });

  it('handles missing optional profile data gracefully', () => {
    const minimalProfile: ProfileData = {
      id: '2',
      username: 'minimal',
      displayName: '',
      avatarUrl: '',
      // stats omitted
    };
    render(
      <ProfilePage profile={minimalProfile}>
        <div>Minimal Content</div>
      </ProfilePage>
    );
    // Should render the username as a heading
    expect(screen.getByRole('heading', { name: 'minimal' })).toBeInTheDocument();
    expect(screen.getByText('Minimal Content')).toBeInTheDocument();
  });
}); 