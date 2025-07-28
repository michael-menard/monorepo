import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileCard from '../components/ProfileCard';
import type { Profile } from '../schemas';

const mockProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  bio: 'Software developer and tech enthusiast',
  avatar: 'https://example.com/avatar.jpg',
  phone: '+1-555-123-4567',
  dateOfBirth: new Date('1990-01-01'),
  location: 'San Francisco, CA',
  website: 'https://johndoe.dev',
  socialLinks: {
    twitter: 'https://twitter.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
  },
  preferences: {
    emailNotifications: true,
    pushNotifications: false,
    publicProfile: true,
    theme: 'dark',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockHandlers = {
  onEdit: () => {},
};

describe('Profile Package', () => {
  it('exports ProfileCard component', () => {
    expect(ProfileCard).toBeDefined();
  });

  it('renders ProfileCard with correct data', () => {
    render(
      <ProfileCard
        profile={mockProfile}
        onEdit={mockHandlers.onEdit}
        isEditable={true}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Software developer and tech enthusiast')).toBeInTheDocument();
    expect(screen.getByText('+1-555-123-4567')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('https://johndoe.dev')).toBeInTheDocument();
  });

  it('shows edit button when editable', () => {
    render(
      <ProfileCard
        profile={mockProfile}
        onEdit={mockHandlers.onEdit}
        isEditable={true}
      />
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('does not show edit button when not editable', () => {
    render(
      <ProfileCard
        profile={mockProfile}
        onEdit={mockHandlers.onEdit}
        isEditable={false}
      />
    );

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('renders social links when available', () => {
    render(
      <ProfileCard
        profile={mockProfile}
        onEdit={mockHandlers.onEdit}
        isEditable={false}
      />
    );

    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders without optional fields', () => {
    const minimalProfile = {
      ...mockProfile,
      username: undefined,
      bio: undefined,
      avatar: undefined,
      phone: undefined,
      dateOfBirth: undefined,
      location: undefined,
      website: undefined,
      socialLinks: undefined,
    };

    render(
      <ProfileCard
        profile={minimalProfile}
        onEdit={mockHandlers.onEdit}
        isEditable={false}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.queryByText('@johndoe')).not.toBeInTheDocument();
    expect(screen.queryByText('Software developer and tech enthusiast')).not.toBeInTheDocument();
  });
}); 