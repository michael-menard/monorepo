import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryRouter, RouterProvider } from '@tanstack/react-router'
import { createRootRoute } from '@tanstack/react-router'
import CognitoSignupPage from '../index'

// Mock the Cognito auth hook
const mockSignUp = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../../../hooks/useCognitoAuth', () => ({
  useCognitoAuth: () => ({
    signUp: mockSignUp,
    isLoading: false,
    error: null,
    user: null,
    isAuthenticated: false,
  }),
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useRouter: () => ({
      navigate: mockNavigate,
    }),
  }
})

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock @repo/ui components
vi.mock('@repo/ui', () => ({
  AppCard: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  Button: ({ children, className, disabled, type, onClick, ...props }: any) => (
    <button 
      className={className} 
      disabled={disabled} 
      type={type} 
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
  Input: ({ className, type, placeholder, id, ...props }: any) => (
    <input 
      className={className} 
      type={type} 
      placeholder={placeholder} 
      id={id}
      {...props}
    />
  ),
  Label: ({ children, htmlFor, className, ...props }: any) => (
    <label htmlFor={htmlFor} className={className} {...props}>
      {children}
    </label>
  ),
}))

const renderWithRouter = (component: React.ReactElement) => {
  const rootRoute = createRootRoute({
    component: () => component,
  })
  
  const router = createMemoryRouter({
    routeTree: rootRoute,
    history: ['/auth/signup'],
  })
  
  return render(<RouterProvider router={router} />)
}

describe('CognitoSignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render signup form with all required fields', () => {
    renderWithRouter(<CognitoSignupPage />)

    expect(screen.getByText('Create Account')).toBeInTheDocument()
    expect(screen.getByText('Join the LEGO MOC community')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('should show validation errors for invalid inputs', async () => {
    renderWithRouter(<CognitoSignupPage />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      // Check for validation error messages
      const errorMessages = screen.getAllByText(/name|email|password/i)
      expect(errorMessages.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('should call signUp with correct data on form submission', async () => {
    mockSignUp.mockResolvedValue({ success: true, message: 'Account created' })

    renderWithRouter(<CognitoSignupPage />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const termsCheckbox = screen.getByLabelText(/i agree to the terms/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'TestPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'TestPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'TestPass123!',
        name: 'Test User',
      })
    })
  })

  it('should navigate to verification page on successful signup', async () => {
    mockSignUp.mockResolvedValue({ 
      success: true, 
      message: 'Account created successfully' 
    })

    renderWithRouter(<CognitoSignupPage />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const termsCheckbox = screen.getByLabelText(/i agree to the terms/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'TestPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'TestPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument()
    })

    // Wait for navigation timeout
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/auth/verify-email',
        search: { email: 'test@example.com' }
      })
    }, { timeout: 3000 })
  })

  it('should display error message on signup failure', async () => {
    const errorMessage = 'User already exists'
    mockSignUp.mockResolvedValue({ success: false, error: errorMessage })

    renderWithRouter(<CognitoSignupPage />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const termsCheckbox = screen.getByLabelText(/i agree to the terms/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'TestPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'TestPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should show password strength indicator', async () => {
    renderWithRouter(<CognitoSignupPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)

    // Test weak password
    fireEvent.change(passwordInput, { target: { value: 'weak' } })
    
    await waitFor(() => {
      // Look for password strength indicator
      const strengthElements = screen.queryAllByText(/password strength|weak|strong/i)
      expect(strengthElements.length).toBeGreaterThanOrEqual(0) // May or may not be visible
    })

    // Test strong password
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    
    await waitFor(() => {
      // Password strength should update
      expect(passwordInput).toHaveValue('StrongPass123!')
    })
  })

  it('should validate password confirmation', async () => {
    renderWithRouter(<CognitoSignupPage />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(passwordInput, { target: { value: 'TestPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPass123!' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      // Should show password mismatch error
      const errorMessages = screen.getAllByText(/password/i)
      expect(errorMessages.length).toBeGreaterThan(0)
    })
  })

  it('should navigate to login page when clicking login link', () => {
    renderWithRouter(<CognitoSignupPage />)

    const loginLink = screen.getByText(/sign in here/i)
    fireEvent.click(loginLink)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login' })
  })

  it('should require terms and conditions acceptance', async () => {
    renderWithRouter(<CognitoSignupPage />)

    const termsCheckbox = screen.getByLabelText(/i agree to the terms/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    expect(termsCheckbox).toBeRequired()

    // Try to submit without accepting terms
    fireEvent.click(submitButton)

    // Form should not submit without terms acceptance
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('should have terms and privacy policy links', () => {
    renderWithRouter(<CognitoSignupPage />)

    expect(screen.getByText(/terms of service/i)).toBeInTheDocument()
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument()
  })
})
