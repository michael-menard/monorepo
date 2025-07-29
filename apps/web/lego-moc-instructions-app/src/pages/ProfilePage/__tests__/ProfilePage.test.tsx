import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProfilePage from '../index';

// Mock the profile package components
vi.mock('@repo/profile', () => ({
  ProfilePage: ({ children, profile, sidebarContent }: any) => (
    <div data-testid="profile-page">
      <div data-testid="sidebar">{sidebarContent}</div>
      <div data-testid="content">{children}</div>
    </div>
  ),
  ProfileCard: ({ profile }: any) => (
    <div data-testid="profile-card">
      {profile.firstName} {profile.lastName}
    </div>
  ),
  AvatarUploader: () => <div data-testid="avatar-uploader" />,
}));

// Mock the UI components
vi.mock('@repo/ui', () => ({
  AppCard: ({ children, title }: any) => (
    <div data-testid="app-card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Button: ({ children, onClick }: any) => (
    <button data-testid="button" onClick={onClick}>
      {children}
    </button>
  ),
  FormSection: ({ fields }: any) => (
    <div data-testid="form-section">
      {fields?.map((field: any, index: number) => (
        <div key={index} data-testid={`field-${field.name}`}>
          {field.label}
        </div>
      ))}
    </div>
  ),
  PageHeader: ({ title, subtitle }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
  TabPanel: ({ tabs }: any) => (
    <div data-testid="tab-panel">
      {tabs?.map((tab: any) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          {tab.label}
        </div>
      ))}
    </div>
  ),
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>,
  AvatarImage: () => <div data-testid="avatar-image" />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Edit: () => <div data-testid="edit-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  User: () => <div data-testid="user-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Twitter: () => <div data-testid="twitter-icon" />,
  Linkedin: () => <div data-testid="linkedin-icon" />,
  Github: () => <div data-testid="github-icon" />,
  Instagram: () => <div data-testid="instagram-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProfilePage', () => {
  it('renders the profile page with correct structure', () => {
    renderWithRouter(<ProfilePage />);

    // Check that the main components are rendered
    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('tab-panel')).toBeInTheDocument();
  });

  it('displays the page header with correct title and subtitle', () => {
    renderWithRouter(<ProfilePage />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Manage your account settings and preferences')).toBeInTheDocument();
  });

  it('renders all tabs correctly', () => {
    renderWithRouter(<ProfilePage />);

    expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-preferences')).toBeInTheDocument();
    expect(screen.getByTestId('tab-security')).toBeInTheDocument();
  });

  it('displays user information in sidebar', () => {
    renderWithRouter(<ProfilePage />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
  });
}); 