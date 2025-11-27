import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import React from 'react'

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn().mockResolvedValue({
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
  signOut: vi.fn().mockResolvedValue({}),
}))

vi.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: React.ReactNode }) => children,
  useAuthenticator: () => ({
    user: null,
    signOut: vi.fn(),
  }),
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
    useSearch: () => ({}),
    Link: vi.fn(({ children }) => children),
  }
})

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock UI Components with direct imports (no barrel files)
vi.mock('@repo/ui/button', () => ({
  Button: vi.fn(({ children, onClick, className, ...props }) =>
    React.createElement('button', { onClick, className, ...props }, children),
  ),
  buttonVariants: vi.fn(() => 'button-variants-class'),
}))

vi.mock('@repo/ui/card', () => ({
  Card: vi.fn(({ children, className, ...props }) =>
    React.createElement('div', { className, 'data-testid': 'card', ...props }, children),
  ),
  CardContent: vi.fn(({ children, className, ...props }) =>
    React.createElement('div', { className, ...props }, children),
  ),
  CardDescription: vi.fn(({ children, className, ...props }) =>
    React.createElement('p', { className, ...props }, children),
  ),
  CardHeader: vi.fn(({ children, className, ...props }) =>
    React.createElement('div', { className, ...props }, children),
  ),
  CardTitle: vi.fn(({ children, className, ...props }) =>
    React.createElement('h4', { className, ...props }, children),
  ),
}))

vi.mock('@repo/ui/dropdown-menu', () => ({
  DropdownMenu: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'dropdown-menu' }, children),
  ),
  DropdownMenuContent: vi.fn(({ children, className, ...props }) =>
    React.createElement(
      'div',
      { className, 'data-testid': 'dropdown-content', ...props },
      children,
    ),
  ),
  DropdownMenuItem: vi.fn(({ children, onClick, className, ...props }) =>
    React.createElement('div', { onClick, className, role: 'menuitem', ...props }, children),
  ),
  DropdownMenuLabel: vi.fn(({ children, className, ...props }) =>
    React.createElement('div', { className, ...props }, children),
  ),
  DropdownMenuSeparator: vi.fn(({ className, ...props }) =>
    React.createElement('hr', { className, ...props }),
  ),
  DropdownMenuTrigger: vi.fn(({ children, asChild, ...props }) => {
    if (asChild && children) {
      return children
    }
    return React.createElement('button', props, children)
  }),
}))

vi.mock('@repo/ui/avatar', () => ({
  Avatar: vi.fn(({ children, className, ...props }) =>
    React.createElement('span', { className, ...props }, children),
  ),
  AvatarImage: vi.fn(({ src, alt, className, ...props }) =>
    React.createElement('img', { src, alt, className, ...props }),
  ),
  AvatarFallback: vi.fn(({ children, className, ...props }) =>
    React.createElement('span', { className, ...props }, children),
  ),
}))

vi.mock('@repo/ui/badge', () => ({
  Badge: vi.fn(({ children, className, variant, ...props }) =>
    React.createElement('span', { className, 'data-variant': variant, ...props }, children),
  ),
}))

vi.mock('@repo/ui/loading-spinner', () => ({
  LoadingSpinner: vi.fn(({ className, ...props }) =>
    React.createElement('div', { className, 'data-testid': 'loading-spinner', ...props }),
  ),
}))

// Mock additional UI components needed for auth tests
vi.mock('@repo/ui/input', () => ({
  Input: vi.fn(props => React.createElement('input', { 'data-testid': 'input', ...props })),
}))

vi.mock('@repo/ui/label', () => ({
  Label: vi.fn(({ children, ...props }) =>
    React.createElement('label', { 'data-testid': 'label', ...props }, children),
  ),
}))

vi.mock('@repo/ui/checkbox', () => ({
  Checkbox: vi.fn(props =>
    React.createElement('input', { type: 'checkbox', 'data-testid': 'checkbox', ...props }),
  ),
}))

vi.mock('@repo/ui/alert', () => ({
  Alert: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'alert', ...props }, children),
  ),
  AlertTitle: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'alert-title', ...props }, children),
  ),
  AlertDescription: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'alert-description', ...props }, children),
  ),
}))

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn(({ children, ...props }) => React.createElement('div', props, children)),
    span: vi.fn(({ children, ...props }) => React.createElement('span', props, children)),
    button: vi.fn(({ children, ...props }) => React.createElement('button', props, children)),
    form: vi.fn(({ children, ...props }) => React.createElement('form', props, children)),
    input: vi.fn(props => React.createElement('input', props)),
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
}))

vi.mock('@repo/ui/progress', () => ({
  Progress: vi.fn(({ className, value, ...props }) =>
    React.createElement('div', {
      className,
      'data-value': value,
      'data-testid': 'progress',
      ...props,
    }),
  ),
}))

vi.mock('@repo/ui/select', () => ({
  Select: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'select' }, children),
  ),
  SelectContent: vi.fn(({ children }) => React.createElement('div', {}, children)),
  SelectItem: vi.fn(({ children, value }) => React.createElement('option', { value }, children)),
  SelectTrigger: vi.fn(({ children }) => React.createElement('button', {}, children)),
  SelectValue: vi.fn(() => React.createElement('span', {})),
}))

vi.mock('@repo/ui/tabs', () => ({
  Tabs: vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'tabs' }, children)),
  TabsContent: vi.fn(({ children }) => React.createElement('div', {}, children)),
  TabsList: vi.fn(({ children }) => React.createElement('div', {}, children)),
  TabsTrigger: vi.fn(({ children }) => React.createElement('button', {}, children)),
}))

vi.mock('@repo/ui/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
}))

vi.mock('@repo/ui/providers/ThemeProvider', () => ({
  ThemeProvider: vi.fn(({ children }) => children),
  useTheme: vi.fn(() => ({ theme: 'light', setTheme: vi.fn() })),
}))

// Mock AuthLayout component
vi.mock('@/components/Layout/RootLayout', () => ({
  AuthLayout: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'auth-layout' }, children),
  ),
}))

// Mock Auth Provider
vi.mock('@/services/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    handleSignIn: vi.fn().mockResolvedValue({ isSignedIn: true }),
    handleSignUp: vi.fn().mockResolvedValue({ isSignUpComplete: false }),
    handleSignOut: vi.fn().mockResolvedValue({}),
    handleConfirmSignIn: vi.fn().mockResolvedValue({ isSignedIn: true }),
    currentChallenge: null,
  })),
}))

// Mock Navigation Provider
vi.mock('@/components/Navigation/NavigationProvider', () => ({
  useNavigation: vi.fn(() => ({
    trackEvent: vi.fn(),
    trackPageView: vi.fn(),
    trackUserAction: vi.fn(),
  })),
}))

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(() => ({})),
    handleSubmit: vi.fn(fn => fn),
    formState: { errors: {}, isSubmitting: false },
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
  })),
  Controller: vi.fn(({ render }) => render({ field: {}, fieldState: {}, formState: {} })),
}))

// Mock zod resolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

// Note: Redux mocking is handled per test file as needed
// Some tests use real Redux stores, others need mocked selectors

// Mock Lucide React Icons
vi.mock('lucide-react', () => ({
  Home: vi.fn(props => React.createElement('svg', { 'data-testid': 'home-icon', ...props })),
  Images: vi.fn(props => React.createElement('svg', { 'data-testid': 'images-icon', ...props })),
  Heart: vi.fn(props => React.createElement('svg', { 'data-testid': 'heart-icon', ...props })),
  BookOpen: vi.fn(props => React.createElement('svg', { 'data-testid': 'book-icon', ...props })),
  LayoutDashboard: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'dashboard-icon', ...props }),
  ),
  Menu: vi.fn(props => React.createElement('svg', { 'data-testid': 'menu-icon', ...props })),
  X: vi.fn(props => React.createElement('svg', { 'data-testid': 'x-icon', ...props })),
  Sun: vi.fn(props => React.createElement('svg', { 'data-testid': 'sun-icon', ...props })),
  Moon: vi.fn(props => React.createElement('svg', { 'data-testid': 'moon-icon', ...props })),
  Bell: vi.fn(props => React.createElement('svg', { 'data-testid': 'bell-icon', ...props })),
  User: vi.fn(props => React.createElement('svg', { 'data-testid': 'user-icon', ...props })),
  Settings: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'settings-icon', ...props }),
  ),
  HelpCircle: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'help-circle-icon', ...props }),
  ),
  Lightbulb: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'lightbulb-icon', ...props }),
  ),
  LogOut: vi.fn(props => React.createElement('svg', { 'data-testid': 'logout-icon', ...props })),
  ChevronDown: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'chevron-down-icon', ...props }),
  ),
  // Add missing icons
  Search: vi.fn(props => React.createElement('svg', { 'data-testid': 'search-icon', ...props })),
  Filter: vi.fn(props => React.createElement('svg', { 'data-testid': 'filter-icon', ...props })),
  Upload: vi.fn(props => React.createElement('svg', { 'data-testid': 'upload-icon', ...props })),
  Star: vi.fn(props => React.createElement('svg', { 'data-testid': 'star-icon', ...props })),
  Share: vi.fn(props => React.createElement('svg', { 'data-testid': 'share-icon', ...props })),
  Download: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'download-icon', ...props }),
  ),
  FileText: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'file-text-icon', ...props }),
  ),
  Video: vi.fn(props => React.createElement('svg', { 'data-testid': 'video-icon', ...props })),
  BarChart3: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'bar-chart-icon', ...props }),
  ),
  Activity: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'activity-icon', ...props }),
  ),
  // Navigation system icons
  ChevronRight: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'chevron-right-icon', ...props }),
  ),
  ArrowLeft: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'arrow-left-icon', ...props }),
  ),
  ArrowRight: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'arrow-right-icon', ...props }),
  ),
  Command: vi.fn(props => React.createElement('svg', { 'data-testid': 'command-icon', ...props })),
  Clock: vi.fn(props => React.createElement('svg', { 'data-testid': 'clock-icon', ...props })),
  Zap: vi.fn(props => React.createElement('svg', { 'data-testid': 'zap-icon', ...props })),
  Plus: vi.fn(props => React.createElement('svg', { 'data-testid': 'plus-icon', ...props })),
  MoreHorizontal: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'more-horizontal-icon', ...props }),
  ),
  Grid: vi.fn(props => React.createElement('svg', { 'data-testid': 'grid-icon', ...props })),
  AlertTriangle: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'alert-triangle-icon', ...props }),
  ),
  Compass: vi.fn(props => React.createElement('svg', { 'data-testid': 'compass-icon', ...props })),
  Target: vi.fn(props => React.createElement('svg', { 'data-testid': 'target-icon', ...props })),
  Layers: vi.fn(props => React.createElement('svg', { 'data-testid': 'layers-icon', ...props })),
  // Auth page icons
  Mail: vi.fn(props => React.createElement('svg', { 'data-testid': 'mail-icon', ...props })),
  Lock: vi.fn(props => React.createElement('svg', { 'data-testid': 'lock-icon', ...props })),
  Eye: vi.fn(props => React.createElement('svg', { 'data-testid': 'eye-icon', ...props })),
  EyeOff: vi.fn(props => React.createElement('svg', { 'data-testid': 'eye-off-icon', ...props })),
  KeyRound: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'key-round-icon', ...props }),
  ),
  CheckCircle: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'check-circle-icon', ...props }),
  ),
  AlertCircle: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'alert-circle-icon', ...props }),
  ),
}))

// Global test utilities
declare global {
  var vi: typeof import('vitest').vi
}

globalThis.vi = vi
