import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SocialLoginButtonGroup from '../index';

const mockSocialLogin = vi.fn();
const mockUseAuth = vi.fn(() => ({
  socialLogin: mockSocialLogin,
  isLoading: false,
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderComponent = (props = {}) => {
  return render(
    <MemoryRouter>
      <SocialLoginButtonGroup {...props} />
    </MemoryRouter>
  );
};

describe('SocialLoginButtonGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      socialLogin: mockSocialLogin,
      isLoading: false,
    });
  });

  it('renders all social login buttons', () => {
    renderComponent();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);

    const googleButton = buttons[0];
    const githubButton = buttons[1];
    const twitterButton = buttons[2];
    const facebookButton = buttons[3];

    expect(googleButton).toHaveTextContent('Continue with Google');
    expect(githubButton).toHaveTextContent('Continue with GitHub');
    expect(twitterButton).toHaveTextContent('Continue with Twitter');
    expect(facebookButton).toHaveTextContent('Continue with Facebook');
  });

  it('calls socialLogin with correct provider when clicked', async () => {
    renderComponent();

    const buttons = screen.getAllByRole('button');
    const googleButton = buttons[0];
    const githubButton = buttons[1];
    const twitterButton = buttons[2];
    const facebookButton = buttons[3];

    fireEvent.click(googleButton);
    await waitFor(() => {
      expect(mockSocialLogin).toHaveBeenCalledWith({ provider: 'google' });
    });

    fireEvent.click(githubButton);
    await waitFor(() => {
      expect(mockSocialLogin).toHaveBeenCalledWith({ provider: 'github' });
    });

    fireEvent.click(twitterButton);
    await waitFor(() => {
      expect(mockSocialLogin).toHaveBeenCalledWith({ provider: 'twitter' });
    });

    fireEvent.click(facebookButton);
    await waitFor(() => {
      expect(mockSocialLogin).toHaveBeenCalledWith({ provider: 'facebook' });
    });

    expect(mockSocialLogin).toHaveBeenCalledTimes(4);
  });

  it('shows loading state when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      socialLogin: mockSocialLogin,
      isLoading: true,
    });

    renderComponent();

    const loadingSpinners = screen.getAllByRole('status');
    expect(loadingSpinners).toHaveLength(4);
  });

  it('applies custom className to container', () => {
    renderComponent({ className: 'custom-class' });
    expect(screen.getByTestId('social-login-group')).toHaveClass('custom-class');
  });
}); 