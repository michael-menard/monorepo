import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import App from './App'
import authReducer from '@repo/auth/src/store/authSlice'

// Mock axios to prevent real API calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    defaults: {
      withCredentials: true,
    },
  },
}))

// Mock the auth components
vi.mock('@repo/auth/src/components/LoginComponent', () => ({
  LoginComponent: () => <div data-testid="login-component">Login Component</div>,
}))

vi.mock('@repo/auth/src/components/Signup', () => ({
  default: () => <div data-testid="signup-component">Signup Component</div>,
}))

vi.mock('@repo/auth/src/components/ForgotPassword', () => ({
  default: () => <div data-testid="forgot-password-component">Forgot Password Component</div>,
}))

vi.mock('@repo/auth/src/components/ResetPassword', () => ({
  default: () => <div data-testid="reset-password-component">Reset Password Component</div>,
}))

vi.mock('@repo/auth/src/components/EmailVerification', () => ({
  default: () => <div data-testid="email-verification-component">Email Verification Component</div>,
}))

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isCheckingAuth: false,
        message: null,
      },
    },
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore()
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('Auth UI Example')).toBeInTheDocument()
  })
}) 