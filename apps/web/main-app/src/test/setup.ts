import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import * as React from 'react'

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Polyfill for HTMLFormElement.prototype.requestSubmit (jsdom has stub that throws)
// Force override to provide working implementation
HTMLFormElement.prototype.requestSubmit = function (submitter?: HTMLElement) {
  if (submitter) {
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
    ;(submitEvent as any).submitter = submitter
    this.dispatchEvent(submitEvent)
  } else {
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
    this.dispatchEvent(submitEvent)
  }
}

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
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  })),
}))

// Mock @repo/app-component-library - SINGLE consolidated mock with all exports
vi.mock('@repo/app-component-library', () => ({
  // StatsCards
  StatsCards: vi.fn(({ items, isLoading, error, emptyTitle, emptyDescription, ariaLabel }) => {
    if (isLoading) {
      return React.createElement(
        'div',
        {
          role: 'region',
          'aria-label': ariaLabel || 'Statistics',
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        },
        Array.from({ length: items?.length || 3 }).map((_, i) =>
          React.createElement('div', { key: i, className: 'animate-pulse', 'data-testid': 'card' }),
        ),
      )
    }
    if (error) {
      return React.createElement(
        'div',
        {
          role: 'region',
          'aria-label': ariaLabel || 'Statistics',
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        },
        React.createElement('div', { 'data-testid': 'card' }, [
          React.createElement('h3', { key: 'title' }, 'Unable to load statistics'),
          React.createElement('p', { key: 'message' }, error.message),
        ]),
      )
    }
    const isEmpty = items?.every((item: { value: number }) => item.value === 0)
    if (isEmpty) {
      return React.createElement(
        'div',
        {
          role: 'region',
          'aria-label': ariaLabel || 'Statistics',
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        },
        React.createElement('div', { 'data-testid': 'card' }, [
          React.createElement('h3', { key: 'title' }, emptyTitle || 'No data yet'),
          React.createElement(
            'p',
            { key: 'desc' },
            emptyDescription || 'Data will appear here once available.',
          ),
        ]),
      )
    }
    return React.createElement(
      'div',
      {
        role: 'region',
        'aria-label': ariaLabel || 'Statistics',
        className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      },
      items?.map((item: { label: string; value: number }) =>
        React.createElement(
          'article',
          {
            key: item.label,
            role: 'region',
            'aria-label': `Statistic: ${item.label} - ${item.value.toLocaleString()}`,
          },
          React.createElement('div', { 'data-testid': 'card' }, [
            React.createElement('h3', { key: 'label' }, item.label),
            React.createElement('span', { key: 'value' }, item.value.toLocaleString()),
          ]),
        ),
      ),
    )
  }),

  // Button
  Button: vi.fn(({ children, onClick, className, ...props }) =>
    React.createElement('button', { onClick, className, ...props }, children),
  ),
  buttonVariants: vi.fn(() => 'button-variants-class'),

  // Card components
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
  CardFooter: vi.fn(({ children, className, ...props }) =>
    React.createElement('div', { className, ...props }, children),
  ),

  // Dropdown components
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
    if (asChild && children) return children
    return React.createElement('button', props, children)
  }),

  // Avatar components
  Avatar: vi.fn(({ children, className, ...props }) =>
    React.createElement('span', { className, ...props }, children),
  ),
  AvatarImage: vi.fn(({ src, alt, className, ...props }) =>
    React.createElement('img', { src, alt, className, ...props }),
  ),
  AvatarFallback: vi.fn(({ children, className, ...props }) =>
    React.createElement('span', { className, ...props }, children),
  ),

  // Badge
  Badge: vi.fn(({ children, className, variant, ...props }) =>
    React.createElement('span', { className, 'data-variant': variant, ...props }, children),
  ),

  // LoadingSpinner
  LoadingSpinner: vi.fn(({ className, ...props }) =>
    React.createElement('div', { className, 'data-testid': 'loading-spinner', ...props }),
  ),

  // Form components
  Input: vi.fn(props => React.createElement('input', { 'data-testid': 'input', ...props })),
  Label: vi.fn(({ children, ...props }) =>
    React.createElement('label', { 'data-testid': 'label', ...props }, children),
  ),
  Checkbox: vi.fn(props =>
    React.createElement('input', { type: 'checkbox', 'data-testid': 'checkbox', ...props }),
  ),

  // Alert components
  Alert: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'alert', role: 'alert', ...props }, children),
  ),
  AlertTitle: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'alert-title', ...props }, children),
  ),
  AlertDescription: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'alert-description', ...props }, children),
  ),

  // Progress
  Progress: vi.fn(({ className, value, ...props }) =>
    React.createElement('div', {
      className,
      'data-value': value,
      'data-testid': 'progress',
      ...props,
    }),
  ),

  // Select components
  Select: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'select' }, children),
  ),
  SelectContent: vi.fn(({ children }) => React.createElement('div', {}, children)),
  SelectItem: vi.fn(({ children, value }) => React.createElement('option', { value }, children)),
  SelectTrigger: vi.fn(({ children }) => React.createElement('button', {}, children)),
  SelectValue: vi.fn(() => React.createElement('span', {})),

  // Tabs components
  Tabs: vi.fn(({ children }) => React.createElement('div', { 'data-testid': 'tabs' }, children)),
  TabsContent: vi.fn(({ children }) => React.createElement('div', {}, children)),
  TabsList: vi.fn(({ children }) => React.createElement('div', {}, children)),
  TabsTrigger: vi.fn(({ children }) => React.createElement('button', {}, children)),

  // Theme
  ThemeProvider: vi.fn(({ children }) => children),
  useTheme: vi.fn(() => ({ theme: 'light', setTheme: vi.fn() })),

  // Toast
  useToast: vi.fn(() => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] })),
  toast: vi.fn(),
  Toaster: vi.fn(() => null),

  // Utility
  cn: vi.fn((...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')),

  // Dialog components
  Dialog: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'dialog' }, children),
  ),
  DialogContent: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'dialog-content', ...props }, children),
  ),
  DialogHeader: vi.fn(({ children, ...props }) =>
    React.createElement('div', { ...props }, children),
  ),
  DialogTitle: vi.fn(({ children, ...props }) => React.createElement('h2', { ...props }, children)),
  DialogDescription: vi.fn(({ children, ...props }) =>
    React.createElement('p', { ...props }, children),
  ),
  DialogFooter: vi.fn(({ children, ...props }) =>
    React.createElement('div', { ...props }, children),
  ),
  DialogTrigger: vi.fn(({ children }) => children),
  DialogClose: vi.fn(({ children }) => children),

  // Separator
  Separator: vi.fn(({ className, ...props }) => React.createElement('hr', { className, ...props })),

  // ScrollArea
  ScrollArea: vi.fn(({ children, className, ...props }) =>
    React.createElement('div', { className, ...props }, children),
  ),

  // Skeleton
  Skeleton: vi.fn(({ className, ...props }) =>
    React.createElement('div', { className, 'data-testid': 'skeleton', ...props }),
  ),

  // Tooltip
  Tooltip: vi.fn(({ children }) => children),
  TooltipContent: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'tooltip-content' }, children),
  ),
  TooltipProvider: vi.fn(({ children }) => children),
  TooltipTrigger: vi.fn(({ children }) => children),

  // Form (react-hook-form integration)
  Form: vi.fn(({ children }) => React.createElement('form', {}, children)),
  FormControl: vi.fn(({ children }) => children),
  FormDescription: vi.fn(({ children }) =>
    React.createElement('p', { 'data-testid': 'form-description' }, children),
  ),
  FormField: vi.fn(({ render }) => render({ field: {}, fieldState: {}, formState: {} })),
  FormItem: vi.fn(({ children }) => React.createElement('div', {}, children)),
  FormLabel: vi.fn(({ children, ...props }) => React.createElement('label', props, children)),
  FormMessage: vi.fn(({ children }) =>
    React.createElement('p', { 'data-testid': 'form-message' }, children),
  ),

  // InputOTP
  InputOTP: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'input-otp', ...props }, children),
  ),
  InputOTPGroup: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'input-otp-group' }, children),
  ),
  InputOTPSlot: vi.fn(({ index, ...props }) =>
    React.createElement('input', { 'data-testid': `input-otp-slot-${index}`, ...props }),
  ),
  InputOTPSeparator: vi.fn(() =>
    React.createElement('span', { 'data-testid': 'input-otp-separator' }, '-'),
  ),

  // App-prefixed components (aliases used in some components)
  CustomButton: vi.fn(({ children, onClick, className, ...props }) =>
    React.createElement('button', { onClick, className, ...props }, children),
  ),
  AppDropdownMenu: vi.fn(({ children }) =>
    React.createElement('div', { 'data-testid': 'dropdown-menu' }, children),
  ),
  AppDropdownMenuContent: vi.fn(({ children, className, ...props }) =>
    React.createElement(
      'div',
      { className, 'data-testid': 'dropdown-content', ...props },
      children,
    ),
  ),
  AppDropdownMenuItem: vi.fn(({ children, onClick, className, ...props }) =>
    React.createElement('div', { onClick, className, role: 'menuitem', ...props }, children),
  ),
  AppDropdownMenuLabel: vi.fn(({ children, className, ...props }) =>
    React.createElement('div', { className, ...props }, children),
  ),
  AppDropdownMenuSeparator: vi.fn(({ className, ...props }) =>
    React.createElement('hr', { className, ...props }),
  ),
  AppDropdownMenuTrigger: vi.fn(({ children, asChild, ...props }) => {
    if (asChild && children) return children
    return React.createElement('button', props, children)
  }),
  AppAvatar: vi.fn(({ children, className, ...props }) =>
    React.createElement('span', { className, ...props }, children),
  ),
  AppBadge: vi.fn(({ children, className, variant, ...props }) =>
    React.createElement('span', { className, 'data-variant': variant, ...props }, children),
  ),
  AppAlertDialog: vi.fn(({ children, open }) =>
    open ? React.createElement('div', { 'data-testid': 'alert-dialog' }, children) : null,
  ),
  AppAlertDialogAction: vi.fn(({ children, onClick, ...props }) =>
    React.createElement('button', { onClick, ...props }, children),
  ),
  AppAlertDialogCancel: vi.fn(({ children, onClick, ...props }) =>
    React.createElement('button', { onClick, ...props }, children),
  ),
  AppAlertDialogContent: vi.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'alert-dialog-content', ...props }, children),
  ),
  AppAlertDialogDescription: vi.fn(({ children, ...props }) =>
    React.createElement('p', { ...props }, children),
  ),
  AppAlertDialogFooter: vi.fn(({ children, ...props }) =>
    React.createElement('div', { ...props }, children),
  ),
  AppAlertDialogHeader: vi.fn(({ children, ...props }) =>
    React.createElement('div', { ...props }, children),
  ),
  AppAlertDialogTitle: vi.fn(({ children, ...props }) =>
    React.createElement('h2', { ...props }, children),
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
    article: vi.fn(({ children, ...props }) => React.createElement('article', props, children)),
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
  animate: vi.fn((_value, target, options) => {
    // Immediately call onUpdate with target value for testing
    if (options?.onUpdate) {
      options.onUpdate(target)
    }
    return { stop: vi.fn() }
  }),
}))

// Mock AuthLayout component while preserving real RootLayout and ErrorLayout
vi.mock('@/components/Layout/RootLayout', async () => {
  const actual = await vi.importActual<typeof import('@/components/Layout/RootLayout')>(
    '@/components/Layout/RootLayout',
  )

  return {
    ...actual,
    AuthLayout: vi.fn(({ children }) =>
      React.createElement('div', { 'data-testid': 'auth-layout' }, children),
    ),
  }
})

// Mock Auth Provider
vi.mock('@/services/auth/AuthProvider', () => ({
  AuthProvider: vi.fn(({ children }) => children),
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
const mockNavigationContext = {
  // Event tracking
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
  trackUserAction: vi.fn(),
  trackNavigation: vi.fn(),
  // Navigation state
  currentPath: '/',
  breadcrumbs: [],
  searchQuery: '',
  isSearchOpen: false,
  contextualNavigation: [],
  navigationHistory: [],
  navigation: {
    activeRoute: '/',
    items: [],
    recentSearches: [],
    contextualNavigation: [],
  },
  activeItem: undefined,
  // Navigation functions
  navigateToItem: vi.fn(),
  searchNavigation: vi.fn(),
  setContextualItems: vi.fn(),
  addToFavorites: vi.fn(),
  clearSearch: vi.fn(),
  // Search state
  search: {
    query: '',
    results: [],
    recentSearches: [],
    isLoading: false,
  },
}

vi.mock('@/components/Navigation/NavigationProvider', () => ({
  NavigationProvider: vi.fn(({ children }) => children),
  useNavigation: vi.fn(() => mockNavigationContext),
  useNavigationOptional: vi.fn(() => mockNavigationContext),
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
    reset: vi.fn(),
    control: {},
  })),
  Controller: vi.fn(({ render }) => render({ field: {}, fieldState: {}, formState: {} })),
  FormProvider: vi.fn(({ children }) => children),
  useFormContext: vi.fn(() => ({
    register: vi.fn(() => ({})),
    handleSubmit: vi.fn(fn => fn),
    formState: { errors: {}, isSubmitting: false },
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
    reset: vi.fn(),
    control: {},
  })),
}))

// Mock zod resolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}))

// Mock @/store - RTK Query hooks and store
vi.mock('@/store', () => ({
  store: {
    getState: vi.fn(() => ({
      auth: { isAuthenticated: false, user: null },
      theme: { mode: 'light' },
      navigation: { activeRoute: '/' },
      globalUI: {},
    })),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  },
  // Enhanced Gallery API hooks
  useEnhancedGallerySearchQuery: vi.fn(() => ({
    data: { data: { images: [], totalCount: 0 }, pagination: { page: 1, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    error: null,
  })),
  useLazyEnhancedGallerySearchQuery: vi.fn(() => [vi.fn(), { data: null, isLoading: false }]),
  useGetGalleryImageQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useGetGalleryImageMetadataQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useBatchGetGalleryImagesQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useUploadGalleryImageMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useBatchUploadGalleryImagesMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateGalleryImageMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useDeleteGalleryImageMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useEnhancedBatchGalleryOperationMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetEnhancedGalleryStatsQuery: vi.fn(() => ({
    data: { data: { totalImages: 0, totalCategories: 0, recentUploads: 0 } },
    isLoading: false,
    error: null,
  })),
  // Enhanced Wishlist API hooks
  useEnhancedWishlistQueryQuery: vi.fn(() => ({
    data: { data: { items: [], totalCount: 0 }, pagination: { page: 1, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    error: null,
  })),
  useLazyEnhancedWishlistQueryQuery: vi.fn(() => [vi.fn(), { data: null, isLoading: false }]),
  useGetWishlistItemQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useAddWishlistItemMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateWishlistItemMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useDeleteWishlistItemMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useEnhancedBatchWishlistOperationMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useShareWishlistMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetSharedWishlistQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useImportWishlistItemsMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useExportWishlistMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetEnhancedPriceEstimatesQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useGetEnhancedWishlistStatsQuery: vi.fn(() => ({
    data: { data: { totalItems: 0, totalValue: 0 } },
    isLoading: false,
    error: null,
  })),
  useManagePriceAlertsMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  // Dashboard API hooks
  useGetStatsQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useGetRecentMocsQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useRefreshDashboardMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  // Legacy aliases
  useSearchGalleryQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useGetWishlistQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useBatchGalleryOperationMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useBatchWishlistOperationMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetGalleryStatsQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useGetWishlistStatsQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useGetPriceEstimatesQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  // API instances (mocked)
  enhancedGalleryApi: { reducerPath: 'galleryApi', reducer: vi.fn(), middleware: vi.fn() },
  enhancedWishlistApi: { reducerPath: 'wishlistApi', reducer: vi.fn(), middleware: vi.fn() },
  galleryApi: { reducerPath: 'galleryApi', reducer: vi.fn(), middleware: vi.fn() },
  wishlistApi: { reducerPath: 'wishlistApi', reducer: vi.fn(), middleware: vi.fn() },
  dashboardApi: { reducerPath: 'dashboardApi', reducer: vi.fn(), middleware: vi.fn() },
  // Admin API hooks
  adminApi: { reducerPath: 'adminApi', reducer: vi.fn(), middleware: vi.fn() },
  useListUsersQuery: vi.fn(() => ({
    data: { users: [], paginationToken: null },
    isLoading: false,
    isFetching: false,
    error: null,
  })),
  useLazyListUsersQuery: vi.fn(() => [vi.fn(), { data: null, isLoading: false }]),
  useGetUserDetailQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useLazyGetUserDetailQuery: vi.fn(() => [vi.fn(), { data: null, isLoading: false }]),
  useRevokeTokensMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useBlockUserMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUnblockUserMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetAuditLogQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useLazyGetAuditLogQuery: vi.fn(() => [vi.fn(), { data: null, isLoading: false }]),
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
  Monitor: vi.fn(props => React.createElement('svg', { 'data-testid': 'monitor-icon', ...props })),
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
  // Dashboard component icons
  Blocks: vi.fn(props => React.createElement('svg', { 'data-testid': 'blocks-icon', ...props })),
  Palette: vi.fn(props => React.createElement('svg', { 'data-testid': 'palette-icon', ...props })),
  DollarSign: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'dollar-sign-icon', ...props }),
  ),
  TrendingUp: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'trending-up-icon', ...props }),
  ),
  // Navigation demo page icons
  Navigation: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'navigation-icon', ...props }),
  ),
  Folder: vi.fn(props => React.createElement('svg', { 'data-testid': 'folder-icon', ...props })),
  File: vi.fn(props => React.createElement('svg', { 'data-testid': 'file-icon', ...props })),
  Info: vi.fn(props => React.createElement('svg', { 'data-testid': 'info-icon', ...props })),
  Trash: vi.fn(props => React.createElement('svg', { 'data-testid': 'trash-icon', ...props })),
  Edit: vi.fn(props => React.createElement('svg', { 'data-testid': 'edit-icon', ...props })),
  Copy: vi.fn(props => React.createElement('svg', { 'data-testid': 'copy-icon', ...props })),
  ExternalLink: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'external-link-icon', ...props }),
  ),
  Loader2: vi.fn(props => React.createElement('svg', { 'data-testid': 'loader-icon', ...props })),
  Package: vi.fn(props => React.createElement('svg', { 'data-testid': 'package-icon', ...props })),
  // Story 3.1.10: Uploader icons
  List: vi.fn(props => React.createElement('svg', { 'data-testid': 'list-icon', ...props })),
  Image: vi.fn(props => React.createElement('svg', { 'data-testid': 'image-icon', ...props })),
  ImageIcon: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'image-icon-icon', ...props }),
  ),
  RefreshCw: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'refresh-cw-icon', ...props }),
  ),
  Construction: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'construction-icon', ...props }),
  ),
  // Admin panel icons
  Shield: vi.fn(props => React.createElement('svg', { 'data-testid': 'shield-icon', ...props })),
  ShieldOff: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'shield-off-icon', ...props }),
  ),
  Users: vi.fn(props => React.createElement('svg', { 'data-testid': 'users-icon', ...props })),
  XCircle: vi.fn(props => React.createElement('svg', { 'data-testid': 'x-circle-icon', ...props })),
  ShieldCheck: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'shield-check-icon', ...props }),
  ),
  UserX: vi.fn(props => React.createElement('svg', { 'data-testid': 'user-x-icon', ...props })),
  KeySquare: vi.fn(props =>
    React.createElement('svg', { 'data-testid': 'key-square-icon', ...props }),
  ),
}))

// Global test utilities
declare global {
  var vi: typeof import('vitest').vi
}

globalThis.vi = vi
