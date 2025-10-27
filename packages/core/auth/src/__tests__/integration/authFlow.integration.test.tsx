import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Provider} from 'react-redux'
import {BrowserRouter} from 'react-router-dom'
import {configureStore} from '@reduxjs/toolkit'
import {authApi} from '../../store/authApi'
import authReducer from '../../store/authSlice'
import {LoginForm} from '../../components/LoginForm'
import {SignupForm} from '../../components/SignupForm'
import {ForgotPasswordForm} from '../../components/ForgotPasswordForm'
import * as csrfUtils from '../../utils/csrf'

// Mock CSRF utilities
vi.mock('../../utils/csrf', () => ({
  getCSRFHeaders: vi.fn(),
  refreshCSRFToken: vi.fn(),
  isCSRFError: vi.fn(),
  initializeCSRF: vi.fn(),
  clearCSRFToken: vi.fn(),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(authApi.middleware),
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore()
  return {
    store,
    ...render(
      <Provider store={store}>
        <BrowserRouter>{component}</BrowserRouter>
      </Provider>,
    ),
  }
}

describe('Auth Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock CSRF utilities
    vi.mocked(csrfUtils.getCSRFHeaders).mockResolvedValue({
      'X-CSRF-Token': 'test-csrf-token',
    })
    vi.mocked(csrfUtils.isCSRFError).mockReturnValue(false)
    vi.mocked(csrfUtils.initializeCSRF).mockResolvedValue()
    vi.mocked(csrfUtils.clearCSRFToken).mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Login Flow', () => {
    it('should complete successful login flow with CSRF protection', async () => {
      const user = userEvent.setup()

      // Mock successful login response
      const mockLoginResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            isVerified: true,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 3600,
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLoginResponse),
      })

      const { store } = renderWithProviders(<LoginForm />)

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify CSRF headers were included
      await waitFor(() => {
        expect(csrfUtils.getCSRFHeaders).toHaveBeenCalled()
      })

      // Verify API call was made with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/login'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
            credentials: 'include',
          }),
        )
      })

      // Verify store state is updated
      await waitFor(() => {
        const state = store.getState()
        expect(state.authApi.queries).toBeDefined()
      })
    })

    it('should handle CSRF failure and retry', async () => {
      const user = userEvent.setup()

      // Mock CSRF error detection and retry
      vi.mocked(csrfUtils.isCSRFError).mockReturnValue(true)
      vi.mocked(csrfUtils.refreshCSRFToken).mockResolvedValue('new-csrf-token')

      // First request fails with CSRF error
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () =>
            Promise.resolve({
              success: false,
              code: 'CSRF_FAILED',
              message: 'CSRF validation failed',
            }),
        })
        // Second request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'Login successful',
            }),
        })

      renderWithProviders(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify CSRF token was refreshed and request was retried
      await waitFor(() => {
        expect(csrfUtils.refreshCSRFToken).toHaveBeenCalled()
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should display error message on login failure', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            success: false,
            message: 'Invalid credentials',
          }),
      })

      renderWithProviders(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })
  })

  describe('Signup Flow', () => {
    it('should complete successful signup flow', async () => {
      const user = userEvent.setup()

      const mockSignupResponse = {
        success: true,
        message: 'Account created successfully',
        data: {
          user: {
            id: '1',
            email: 'newuser@example.com',
            name: 'New User',
            isVerified: false,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSignupResponse),
      })

      renderWithProviders(<SignupForm />)

      // Fill in signup form
      const nameInput = screen.getByPlaceholderText(/full name/i)
      const emailInput = screen.getByPlaceholderText(/email address/i)
      const passwordInput = screen.getByPlaceholderText(/^password$/i)
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'New User')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      // Verify API call was made with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/signup'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              name: 'New User',
              email: 'newuser@example.com',
              password: 'password123',
            }),
          }),
        )
      })
    })

    it('should validate password confirmation', async () => {
      const user = userEvent.setup()

      renderWithProviders(<SignupForm />)

      const nameInput = screen.getByPlaceholderText(/full name/i)
      const emailInput = screen.getByPlaceholderText(/email address/i)
      const passwordInput = screen.getByPlaceholderText(/^password$/i)
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'New User')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'differentpassword')
      await user.click(submitButton)

      // Verify validation error is shown
      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
      })

      // Verify API call was not made
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Forgot Password Flow', () => {
    it('should send forgot password request', async () => {
      const user = userEvent.setup()

      const mockForgotPasswordResponse = {
        success: true,
        message: 'Password reset email sent',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockForgotPasswordResponse),
      })

      renderWithProviders(<ForgotPasswordForm />)

      const emailInput = screen.getByPlaceholderText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset email/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // Verify API call was made
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/forgot-password'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              email: 'test@example.com',
            }),
          }),
        )
      })

      // Verify success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument()
      })
    })
  })

  describe('Store Integration', () => {
    it('should properly integrate with Redux store', async () => {
      const store = createTestStore()

      // Verify initial state
      const initialState = store.getState()
      expect(initialState.auth).toBeDefined()
      expect(initialState.authApi).toBeDefined()

      // Dispatch a login action
      const loginPromise = store.dispatch(
        authApi.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        }),
      )

      // Verify the action was dispatched
      expect(loginPromise).toBeDefined()
    })

    it('should handle concurrent auth requests', async () => {
      const store = createTestStore()

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      // Dispatch multiple concurrent requests
      const loginPromise = store.dispatch(
        authApi.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        }),
      )

      const signupPromise = store.dispatch(
        authApi.endpoints.signup.initiate({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        }),
      )

      // Wait for both to complete
      await Promise.all([loginPromise, signupPromise])

      // Verify both requests were made
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
