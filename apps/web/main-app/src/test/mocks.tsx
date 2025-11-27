import React from 'react'
import { vi } from 'vitest'

// AWS Amplify mocks
export const mockAmplifyAuth = {
  signIn: vi.fn().mockResolvedValue({
    isSignedIn: true,
    nextStep: { signInStep: 'DONE' },
  }),
  confirmSignIn: vi.fn().mockResolvedValue({
    isSignedIn: true,
    nextStep: { signInStep: 'DONE' },
  }),
  signUp: vi.fn().mockResolvedValue({
    isSignUpComplete: false,
    nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
  }),
  confirmSignUp: vi.fn().mockResolvedValue({
    isSignUpComplete: true,
    nextStep: { signUpStep: 'DONE' },
  }),
  resetPassword: vi.fn().mockResolvedValue({
    nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
  }),
  confirmResetPassword: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue({}),
  getCurrentUser: vi.fn().mockResolvedValue({
    username: 'testuser',
    userId: 'test-user-123',
  }),
  fetchAuthSession: vi.fn().mockResolvedValue({
    tokens: {
      accessToken: { toString: () => 'mock-access-token' },
      idToken: { toString: () => 'mock-id-token' },
    },
  }),
}

// TanStack Router mocks
export const mockRouter = {
  navigate: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  buildLocation: vi.fn(),
  commitLocation: vi.fn(),
  parseLocation: vi.fn(),
  state: {
    location: {
      pathname: '/',
      search: {},
      hash: '',
      state: {},
    },
    resolvedLocation: {
      pathname: '/',
      search: {},
      hash: '',
      state: {},
    },
    status: 'idle',
    isFetching: false,
    isLoading: false,
    isTransitioning: false,
  },
}

// Framer Motion mocks
export const mockFramerMotion = {
  motion: {
    div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    span: vi.fn(({ children, ...props }) => <span {...props}>{children}</span>),
    button: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
    form: vi.fn(({ children, ...props }) => <form {...props}>{children}</form>),
    input: vi.fn(props => <input {...props} />),
  },
  AnimatePresence: vi.fn(({ children }) => children),
  useAnimation: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  })),
  useMotionValue: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  })),
}

// Lucide React icon mocks
export const mockLucideIcons = {
  Mail: vi.fn(() => <svg data-testid="mail-icon" />),
  Lock: vi.fn(() => <svg data-testid="lock-icon" />),
  Eye: vi.fn(() => <svg data-testid="eye-icon" />),
  EyeOff: vi.fn(() => <svg data-testid="eye-off-icon" />),
  User: vi.fn(() => <svg data-testid="user-icon" />),
  KeyRound: vi.fn(() => <svg data-testid="key-round-icon" />),
  CheckCircle: vi.fn(() => <svg data-testid="check-circle-icon" />),
  AlertCircle: vi.fn(() => <svg data-testid="alert-circle-icon" />),
  ArrowLeft: vi.fn(() => <svg data-testid="arrow-left-icon" />),
  ArrowRight: vi.fn(() => <svg data-testid="arrow-right-icon" />),
  Home: vi.fn(() => <svg data-testid="home-icon" />),
  Search: vi.fn(() => <svg data-testid="search-icon" />),
  Settings: vi.fn(() => <svg data-testid="settings-icon" />),
  Menu: vi.fn(() => <svg data-testid="menu-icon" />),
  X: vi.fn(() => <svg data-testid="x-icon" />),
  ChevronDown: vi.fn(() => <svg data-testid="chevron-down-icon" />),
  ChevronUp: vi.fn(() => <svg data-testid="chevron-up-icon" />),
  ChevronLeft: vi.fn(() => <svg data-testid="chevron-left-icon" />),
  ChevronRight: vi.fn(() => <svg data-testid="chevron-right-icon" />),
}

// UI Component mocks
export const mockUIComponents = {
  Card: vi.fn(({ children, ...props }) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  )),
  CardHeader: vi.fn(({ children, ...props }) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  )),
  CardContent: vi.fn(({ children, ...props }) => (
    <div data-testid="card-content" {...props}>
      {children}
    </div>
  )),
  CardFooter: vi.fn(({ children, ...props }) => (
    <div data-testid="card-footer" {...props}>
      {children}
    </div>
  )),
  Button: vi.fn(({ children, ...props }) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  )),
  Input: vi.fn(props => <input data-testid="input" {...props} />),
  Label: vi.fn(({ children, ...props }) => (
    <label data-testid="label" {...props}>
      {children}
    </label>
  )),
  Checkbox: vi.fn(props => <input type="checkbox" data-testid="checkbox" {...props} />),
  Alert: vi.fn(({ children, ...props }) => (
    <div data-testid="alert" {...props}>
      {children}
    </div>
  )),
  AlertTitle: vi.fn(({ children, ...props }) => (
    <div data-testid="alert-title" {...props}>
      {children}
    </div>
  )),
  AlertDescription: vi.fn(({ children, ...props }) => (
    <div data-testid="alert-description" {...props}>
      {children}
    </div>
  )),
}

// Browser API mocks
export const mockBrowserAPIs = {
  ResizeObserver: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  IntersectionObserver: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  matchMedia: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
}

// Form validation mocks
export const mockFormData = {
  validLogin: {
    email: 'test@example.com',
    password: 'ValidPassword123!',
  },
  invalidLogin: {
    email: 'invalid-email',
    password: '123',
  },
  validSignup: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'ValidPassword123!',
    confirmPassword: 'ValidPassword123!',
    acceptTerms: true,
  },
  invalidSignup: {
    name: 'T',
    email: 'invalid-email',
    password: 'weak',
    confirmPassword: 'different',
    acceptTerms: false,
  },
  validForgotPassword: {
    email: 'test@example.com',
  },
  invalidForgotPassword: {
    email: 'invalid-email',
  },
}

// Password strength levels
export const passwordStrengthLevels = {
  weak: 'weak',
  fair: 'Password123',
  good: 'Password123!',
  strong: 'StrongPassword123!@#',
}

export const passwordStrengthMessages = {
  weak: 'Password strength: Weak',
  fair: 'Password strength: Fair',
  good: 'Password strength: Good',
  strong: 'Password strength: Strong',
}
