import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProfilePage from '../index';
import type { Profile } from '../../../schemas';

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

const mockProfile: Profile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  bio: 'Software developer',
  avatar: 'https://example.com/avatar.jpg',
  phone: '+1234567890',
  dateOfBirth: new Date('1990-01-01'),
  location: 'New York, NY',
  website: 'https://johndoe.com',
  socialLinks: {
    twitter: 'https://twitter.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    instagram: 'https://instagram.com/johndoe',
  },
  preferences: {
    emailNotifications: true,
    pushNotifications: false,
    publicProfile: true,
    theme: 'light',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSidebarContent = <div data-testid="sidebar-content">Sidebar Content</div>;
const mockChildren = <div data-testid="main-content">Main Content</div>;

describe('ProfilePage', () => {
  it('renders the profile page layout correctly', () => {
    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
      >
        {mockChildren}
      </ProfilePage>
    );

    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('applies custom className to the main container', () => {
    const { container } = render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
        className="custom-profile-page"
      >
        {mockChildren}
      </ProfilePage>
    );

    expect(container.firstChild).toHaveClass('custom-profile-page');
  });

  it('applies custom className to sidebar', () => {
    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
        sidebarClassName="custom-sidebar"
      >
        {mockChildren}
      </ProfilePage>
    );

    const sidebar = screen.getByTestId('sidebar-content').closest('aside');
    expect(sidebar).toHaveClass('custom-sidebar');
  });

  it('applies custom className to content area', () => {
    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
        contentClassName="custom-content"
      >
        {mockChildren}
      </ProfilePage>
    );

    const content = screen.getByTestId('main-content').closest('main');
    expect(content).toHaveClass('custom-content');
  });

  it('renders sidebar and main content in correct structure', () => {
    const { container } = render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
      >
        {mockChildren}
      </ProfilePage>
    );

    const profilePageContainer = container.querySelector('.container');
    expect(profilePageContainer).toBeInTheDocument();

    const sidebar = container.querySelector('aside');
    const content = container.querySelector('main');
    
    expect(sidebar).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });

  it('renders cards with correct structure', () => {
    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
      >
        {mockChildren}
      </ProfilePage>
    );

    const cards = screen.getAllByTestId('card');
    const cardContents = screen.getAllByTestId('card-content');

    expect(cards).toHaveLength(2); // One for sidebar, one for content
    expect(cardContents).toHaveLength(2);
  });

  it('injects sidebar content correctly', () => {
    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
      >
        {mockChildren}
      </ProfilePage>
    );

    expect(screen.getByTestId('sidebar-content')).toHaveTextContent('Sidebar Content');
  });

  it('injects main content correctly', () => {
    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
      >
        {mockChildren}
      </ProfilePage>
    );

    expect(screen.getByTestId('main-content')).toHaveTextContent('Main Content');
  });

  it('handles complex sidebar content', () => {
    const complexSidebar = (
      <div>
        <h2>Profile Info</h2>
        <p>Name: {mockProfile.firstName} {mockProfile.lastName}</p>
        <p>Email: {mockProfile.email}</p>
      </div>
    );

    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={complexSidebar}
      >
        {mockChildren}
      </ProfilePage>
    );

    expect(screen.getByText('Profile Info')).toBeInTheDocument();
    expect(screen.getByText(`Name: ${mockProfile.firstName} ${mockProfile.lastName}`)).toBeInTheDocument();
    expect(screen.getByText(`Email: ${mockProfile.email}`)).toBeInTheDocument();
  });

  it('handles complex main content', () => {
    const complexContent = (
      <div>
        <h1>Profile Settings</h1>
        <form>
          <input type="text" placeholder="First Name" />
          <input type="text" placeholder="Last Name" />
        </form>
      </div>
    );

    render(
      <ProfilePage
        profile={mockProfile}
        sidebarContent={mockSidebarContent}
      >
        {complexContent}
      </ProfilePage>
    );

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
  });
}); 