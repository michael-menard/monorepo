import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../index';
import { useAuthStore } from '../../../store/auth.store';

// Mock dependencies
vi.mock('../../../store/auth.store');

const mockLogout = vi.fn();
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: '2024-01-15T10:30:00.000Z',
  isVerified: true,
};

const mockUseAuthStore = {
  user: mockUser,
  logout: mockLogout,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue(mockUseAuthStore);
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <>{component}</>
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('renders the dashboard with title', () => {
      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('displays user profile information', () => {
      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Name: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Email: john@example.com')).toBeInTheDocument();
    });

    it('displays account activity information', () => {
      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText('Account Activity')).toBeInTheDocument();
      expect(screen.getByText(/Joined:/)).toBeInTheDocument();
      expect(screen.getByText(/Last Login:/)).toBeInTheDocument();
    });

    it('renders logout button', () => {
      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });

  describe('User Data Display', () => {
    it('displays formatted join date', () => {
      renderWithRouter(<DashboardPage />);
      
      // Check that the date is formatted correctly
      const joinDateText = screen.getByText(/Joined:/);
      expect(joinDateText).toBeInTheDocument();
      
      // The date should be formatted by toLocaleDateString
      expect(joinDateText.textContent).toContain('Joined:');
    });

    it('displays last login date', () => {
      renderWithRouter(<DashboardPage />);
      
      const lastLoginText = screen.getByText(/Last Login:/);
      expect(lastLoginText).toBeInTheDocument();
    });

    it('handles user with missing data gracefully', () => {
      const userWithMissingData = {
        name: undefined,
        email: 'test@example.com',
        createdAt: '2024-01-15T10:30:00.000Z',
        isVerified: true,
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithMissingData,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText('Name:')).toBeInTheDocument();
      expect(screen.getByText('Email: test@example.com')).toBeInTheDocument();
    });

    it('handles user with null values', () => {
      const userWithNullData = {
        name: null,
        email: null,
        createdAt: null,
        isVerified: true,
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithNullData,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText('Name:')).toBeInTheDocument();
      expect(screen.getByText('Email:')).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('calls logout function when logout button is clicked', () => {
      renderWithRouter(<DashboardPage />);
      
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      fireEvent.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('handles multiple logout button clicks', () => {
      renderWithRouter(<DashboardPage />);
      
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      
      fireEvent.click(logoutButton);
      fireEvent.click(logoutButton);
      fireEvent.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles user with very long name', () => {
      const userWithLongName = {
        ...mockUser,
        name: 'A'.repeat(100),
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithLongName,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText(`Name: ${userWithLongName.name}`)).toBeInTheDocument();
    });

    it('handles user with very long email', () => {
      const userWithLongEmail = {
        ...mockUser,
        email: 'verylongemailaddress@verylongdomainname.com',
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithLongEmail,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText(`Email: ${userWithLongEmail.email}`)).toBeInTheDocument();
    });

    it('handles user with special characters in name', () => {
      const userWithSpecialChars = {
        ...mockUser,
        name: 'José María O\'Connor-Smith',
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithSpecialChars,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText(`Name: ${userWithSpecialChars.name}`)).toBeInTheDocument();
    });

    it('handles user with special characters in email', () => {
      const userWithSpecialEmail = {
        ...mockUser,
        email: 'test+tag@example-domain.co.uk',
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithSpecialEmail,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByText(`Email: ${userWithSpecialEmail.email}`)).toBeInTheDocument();
    });

    it('handles invalid date format gracefully', () => {
      const userWithInvalidDate = {
        ...mockUser,
        createdAt: 'invalid-date',
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithInvalidDate,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      // Should still render without crashing
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('handles future date gracefully', () => {
      const userWithFutureDate = {
        ...mockUser,
        createdAt: '2030-01-15T10:30:00.000Z',
      };

      (useAuthStore as any).mockReturnValue({
        user: userWithFutureDate,
        logout: mockLogout,
      });

      renderWithRouter(<DashboardPage />);
      
      // Should still render without crashing
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Account Activity')).toBeInTheDocument();
    });

    it('has accessible logout button', () => {
      renderWithRouter(<DashboardPage />);
      
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).not.toBeDisabled();
    });
  });

  describe('Component Structure', () => {
    it('renders all main sections', () => {
      renderWithRouter(<DashboardPage />);
      
      // Main sections
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Account Activity')).toBeInTheDocument();
      
      // User data
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
      expect(screen.getByText(/Email:/)).toBeInTheDocument();
      expect(screen.getByText(/Joined:/)).toBeInTheDocument();
      expect(screen.getByText(/Last Login:/)).toBeInTheDocument();
      
      // Action button
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });
}); 