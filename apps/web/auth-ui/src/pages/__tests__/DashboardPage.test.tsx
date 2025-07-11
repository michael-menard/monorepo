import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import DashboardPage from '../DashboardPage';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the UI components
vi.mock('../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../../components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

const renderDashboardPage = () => {
  return render(
    <HelmetProvider>
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    </HelmetProvider>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      logout: vi.fn(),
      isLoading: false,
    });
  });

  it('renders dashboard with user information', () => {
    renderDashboardPage();
    
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    expect(screen.getByText("Here's your account information")).toBeInTheDocument();
    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: vi.fn(),
      isLoading: true,
    });

    renderDashboardPage();
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays user information correctly', () => {
    renderDashboardPage();
    
    // Check email
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    // Check name
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Check member since date
    expect(screen.getByText('Member since')).toBeInTheDocument();
    expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    
    // Check status
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('calls logout function when logout button is clicked', () => {
    const mockLogout = vi.fn();
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      logout: mockLogout,
      isLoading: false,
    });

    renderDashboardPage();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('displays quick action cards', () => {
    renderDashboardPage();
    
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Manage your account security settings')).toBeInTheDocument();
    
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Update your personal information')).toBeInTheDocument();
    
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('View your account activity')).toBeInTheDocument();
  });

  it('handles user with missing createdAt date', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: null,
      },
      logout: vi.fn(),
      isLoading: false,
    });

    renderDashboardPage();
    
    expect(screen.getByText('Member since')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('handles user with null values', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: null,
        name: null,
        createdAt: null,
      },
      logout: vi.fn(),
      isLoading: false,
    });

    renderDashboardPage();
    
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Member since')).toBeInTheDocument();
  });

  it('disables logout button when loading', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      logout: vi.fn(),
      isLoading: true,
    });

    renderDashboardPage();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeDisabled();
  });
}); 