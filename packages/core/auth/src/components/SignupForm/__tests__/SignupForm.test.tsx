import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { SignupForm } from '../index.js'
import authReducer from '../../../store/authSlice.js'
import { authApi } from '../../../store/authApi.js'

// Mock the auth hook
const mockSignup = vi.fn()
const mockClearError = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../../hooks/useAuth.js', () => ({
  useAuth: () => ({
    signup: mockSignup,
    isLoading: false,
    error: null,
    clearError: mockClearError,
    user: null,
    isAuthenticated: false,
    isCheckingAuth: false,
    message: null,
    login: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    checkAuth: vi.fn(),
    resetPassword: vi.fn(),
    confirmReset: vi.fn(),
    socialLogin: vi.fn(),
    clearMessage: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(authApi.middleware),
  })
}

const renderSignupForm = () => {
  const store = createTestStore()
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <SignupForm />
      </BrowserRouter>
    </Provider>,
  )
}

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the signup form with all required elements', () => {
      renderSignupForm()

      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByText('Sign in')).toBeInTheDocument()
    })

    it('should have proper accessibility attributes', () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const lastNameInput = screen.getByPlaceholderText('Last Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      expect(firstNameInput).toHaveAttribute('type', 'text')
      expect(lastNameInput).toHaveAttribute('type', 'text')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Form Validation', () => {
    it('should show validation error for empty first name', async () => {
      renderSignupForm()

      const lastNameInput = screen.getByPlaceholderText('Last Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First Name is required')).toBeInTheDocument()
      })
    })

    it('should show validation error for empty last name', async () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      fireEvent.change(firstNameInput, { target: { value: 'John' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Last Name is required')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid email', async () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const lastNameInput = screen.getByPlaceholderText('Last Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      fireEvent.change(firstNameInput, { target: { value: 'John' } })
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
    })

    it('should show validation error for short password', async () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const lastNameInput = screen.getByPlaceholderText('Last Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      fireEvent.change(firstNameInput, { target: { value: 'John' } })
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: '123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: '123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Password must be at least 8 characters')
        expect(errorMessages.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should show validation error for non-matching passwords', async () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const lastNameInput = screen.getByPlaceholderText('Last Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      fireEvent.change(firstNameInput, { target: { value: 'John' } })
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call signup function with valid data', async () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const lastNameInput = screen.getByPlaceholderText('Last Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      fireEvent.change(firstNameInput, { target: { value: 'John' } })
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        })
      })
    })

    it('should not call signup function with invalid data', async () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      fireEvent.change(firstNameInput, { target: { value: 'John' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignup).not.toHaveBeenCalled()
      })
    })
  })

  describe('Password Strength Indicator', () => {
    it('should show password strength indicator when password is entered', () => {
      renderSignupForm()

      const passwordInput = screen.getByPlaceholderText('Password')
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })

      expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    })

    it('should not show password strength indicator when password is empty', () => {
      renderSignupForm()

      expect(screen.queryByTestId('password-strength')).not.toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to login page when sign in link is clicked', () => {
      renderSignupForm()

      const signInLink = screen.getByText('Sign in')
      fireEvent.click(signInLink)

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      renderSignupForm()

      const firstNameInput = screen.getByPlaceholderText('First Name')
      const lastNameInput = screen.getByPlaceholderText('Last Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      firstNameInput.focus()
      expect(firstNameInput).toHaveFocus()

      lastNameInput.focus()
      expect(lastNameInput).toHaveFocus()

      emailInput.focus()
      expect(emailInput).toHaveFocus()

      passwordInput.focus()
      expect(passwordInput).toHaveFocus()

      confirmPasswordInput.focus()
      expect(confirmPasswordInput).toHaveFocus()

      submitButton.focus()
      expect(submitButton).toHaveFocus()
    })
  })
})
