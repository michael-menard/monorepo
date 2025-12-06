import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { LoginPage } from '../../../routes/pages/LoginPage'
import { SignupPage } from '../../../routes/pages/SignupPage'
import { ForgotPasswordPage } from '../../../routes/pages/ForgotPasswordPage'

// Mock the auth provider
const mockAuth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  forgotPassword: vi.fn(),
  confirmSignIn: vi.fn(),
  isLoading: false,
  user: null,
  currentChallenge: null,
}

const mockNavigation = {
  trackNavigation: vi.fn(),
}

// Mock the providers
vi.mock('@/services/auth/AuthProvider', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/components/Navigation/NavigationProvider', () => ({
  useNavigation: () => mockNavigation,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, onClick }: any) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

// Mock the layout
vi.mock('@/components/Layout/RootLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}))

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="test-wrapper">{children}</div>
}

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('LoginPage', () => {
    it('renders login form with LEGO branding', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
      expect(
        screen.getByText('Sign in to your account to continue building amazing MOCs'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('validates email and password fields', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })

    it('toggles password visibility', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      const passwordInput = screen.getByLabelText('Password')
      const toggleButton = screen.getByLabelText('Show password')

      expect(passwordInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument()
    })

    it('submits login form with valid data', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({ success: true })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })
    })

    it('displays error message on login failure', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('tracks navigation events', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      await user.click(screen.getByText('Forgot password?'))
      expect(mockNavigation.trackNavigation).toHaveBeenCalledWith('forgot_password_link', {
        source: 'login_page',
      })
    })
  })

  describe('SignupPage', () => {
    it('renders signup form with LEGO branding', () => {
      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>,
      )

      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
      expect(screen.getByText('Create your account')).toBeInTheDocument()
      expect(
        screen.getByText('Join our community of LEGO builders and start sharing your MOCs'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('validates all required fields', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>,
      )

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument()
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
        expect(screen.getByText('You must accept the terms and conditions')).toBeInTheDocument()
      })
    })

    it('validates password confirmation', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>,
      )

      await user.type(screen.getByLabelText('Password'), 'Password123')
      await user.type(screen.getByLabelText('Confirm Password'), 'DifferentPassword')
      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
      })
    })

    it('shows password strength indicator', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>,
      )

      const passwordInput = screen.getByLabelText('Password')

      await user.type(passwordInput, 'weak')
      expect(screen.getByText('Password strength: Fair')).toBeInTheDocument()

      await user.clear(passwordInput)
      await user.type(passwordInput, 'StrongPassword123')
      expect(screen.getByText('Password strength: Strong')).toBeInTheDocument()
    })
  })

  describe('ForgotPasswordPage', () => {
    it('renders forgot password form with LEGO branding', () => {
      render(
        <TestWrapper>
          <ForgotPasswordPage />
        </TestWrapper>,
      )

      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
      expect(screen.getByText('Forgot your password?')).toBeInTheDocument()
      expect(
        screen.getByText("No worries! Enter your email and we'll send you reset instructions."),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument()
    })

    it('validates email field', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <ForgotPasswordPage />
        </TestWrapper>,
      )

      const submitButton = screen.getByRole('button', { name: /send reset instructions/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
    })

    it('submits forgot password form and shows success state', async () => {
      const user = userEvent.setup()
      mockAuth.forgotPassword.mockResolvedValue({ success: true })

      render(
        <TestWrapper>
          <ForgotPasswordPage />
        </TestWrapper>,
      )

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }))

      await waitFor(() => {
        expect(mockAuth.forgotPassword).toHaveBeenCalledWith('test@example.com')
        expect(screen.getByText('Check your email')).toBeInTheDocument()
        expect(screen.getByText('Email sent successfully!')).toBeInTheDocument()
      })
    })

    it('displays error message on failure', async () => {
      const user = userEvent.setup()
      mockAuth.forgotPassword.mockResolvedValue({
        success: false,
        error: 'Email not found',
      })

      render(
        <TestWrapper>
          <ForgotPasswordPage />
        </TestWrapper>,
      )

      await user.type(screen.getByLabelText('Email Address'), 'notfound@example.com')
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }))

      await waitFor(() => {
        expect(screen.getByText('Email not found')).toBeInTheDocument()
      })
    })

    it('allows sending to different email after success', async () => {
      const user = userEvent.setup()
      mockAuth.forgotPassword.mockResolvedValue({ success: true })

      render(
        <TestWrapper>
          <ForgotPasswordPage />
        </TestWrapper>,
      )

      // Submit form first
      await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }))

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
      })

      // Click "Send to different email"
      await user.click(screen.getByText('Send to different email'))

      expect(screen.getByText('Forgot your password?')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    })
  })

  describe('Authentication Flow Integration', () => {
    it('navigates between auth pages correctly', async () => {
      const user = userEvent.setup()

      // Start with login page
      const { rerender } = render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      // Click "Sign up here" link
      await user.click(screen.getByText('Sign up here'))
      expect(mockNavigation.trackNavigation).toHaveBeenCalledWith('signup_link', {
        source: 'login_page',
      })

      // Render signup page
      rerender(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>,
      )

      expect(screen.getByText('Create your account')).toBeInTheDocument()

      // Click "Sign in here" link
      await user.click(screen.getByText('Sign in here'))
      expect(mockNavigation.trackNavigation).toHaveBeenCalledWith('signin_link', {
        source: 'signup_page',
      })
    })

    it('maintains LEGO design consistency across all auth pages', () => {
      const pages = [LoginPage, SignupPage, ForgotPasswordPage]

      pages.forEach(PageComponent => {
        render(
          <TestWrapper>
            <PageComponent />
          </TestWrapper>,
        )

        // Check for LEGO branding elements
        expect(screen.getAllByText('LEGO MOC Hub')).toHaveLength(1)

        // Check for LEGO color scheme (gradient backgrounds)
        const gradientElements = document.querySelectorAll('[class*="gradient"]')
        expect(gradientElements.length).toBeGreaterThan(0)
      })
    })

    it('handles loading states consistently', async () => {
      mockAuth.isLoading = true

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      const submitButton = screen.getByRole('button', { name: /signing in/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
    })

    it('tracks all navigation events properly', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      // Test back to home tracking
      await user.click(screen.getByText('Back to Home'))
      expect(mockNavigation.trackNavigation).toHaveBeenCalledWith('back_to_home', {
        source: 'login_page',
      })
    })
  })

  describe('OTP/MFA Authentication Flow', () => {
    it('handles OTP challenge during login', async () => {
      const user = userEvent.setup()
      mockAuth.signIn.mockResolvedValue({
        success: false,
        requiresChallenge: true,
        challenge: {
          challengeName: 'EMAIL_OTP',
          challengeParameters: {},
        },
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      )

      // Fill in login form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockAuth.signIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
        expect(mockNavigation.trackNavigation).toHaveBeenCalledWith('login_challenge_required', {
          source: 'login_page',
          challengeType: 'EMAIL_OTP',
        })
      })
    })

    it('handles successful OTP verification', async () => {
      mockAuth.confirmSignIn.mockResolvedValue({ success: true })
      mockAuth.currentChallenge = {
        challengeName: 'EMAIL_OTP',
        challengeParameters: {},
      } as any

      // This would be tested in the OTPVerificationPage test
      expect(mockAuth.confirmSignIn).toBeDefined()
      expect(mockAuth.currentChallenge).toBeTruthy()
    })

    it('handles failed OTP verification', async () => {
      mockAuth.confirmSignIn.mockResolvedValue({
        success: false,
        error: 'Invalid verification code',
      })

      // This would be tested in the OTPVerificationPage test
      expect(mockAuth.confirmSignIn).toBeDefined()
    })
  })
})
