# Authentication Flow PRD - React Frontend

## Document Information
- **Product/Feature Name**: Authentication Frontend Integration
- **Version**: 1.0
- **Date**: July 13, 2025
- **Status**: Draft

## Executive Summary
A React frontend application that integrates with an existing monorepo authentication service (`@repo/auth`) to provide user authentication, social login, email verification, and password management functionality.

## Problem Statement

### Current State
- Existing authentication service in monorepo handles backend auth logic
- Need a React frontend that integrates seamlessly with existing auth infrastructure
- Must support social login, email verification, and password reset flows

### Target Users
- End users signing up and logging into the application
- Returning users accessing protected features
- Administrators with elevated privileges

## Core Authentication Requirements

### Authentication Flow Goals
- Seamless integration with existing `@repo/auth` service
- Support for email/password and social login (Google, Twitter, Facebook)
- Automatic email verification with OTP
- Password reset functionality using existing Mailgun integration
- Role-based access control (USER, ADMIN, extensible for future roles)
- Secure token management with HTTP-only cookies

### User Stories
1. **As a new user**, I can sign up with email/password and receive email verification
2. **As a new user**, I can sign up using social login (Google, Twitter, Facebook)
3. **As an unverified user**, I can enter an OTP to verify my email address
4. **As a registered user**, I can log in with email/password
5. **As a registered user**, I can log in using social authentication
6. **As a logged-in user**, I can access protected routes automatically
7. **As a user**, I can reset my password if forgotten
8. **As any user**, I can log out and clear my session
9. **As an admin user**, I can access admin-only routes
10. **As a user with expired token**, I am automatically re-authenticated or redirected to login

## Technical Architecture

### Technology Stack
```json
{
  "frontend": {
    "framework": "React 18",
    "language": "TypeScript",
    "routing": "React Router Dom v6",
    "styling": "Tailwind CSS + shadcn/ui",
    "state": "Redux Toolkit",
    "forms": "React Hook Form",
    "validation": "Zod",
    "auth_integration": "@repo/auth",
    "testing": "Vitest + React Testing Library",
    "build": "Vite"
  },
  "backend_integration": {
    "auth_service": "@repo/auth",
    "api_type": "REST",
    "token_storage": "HTTP-only cookies",
    "email_service": "Mailgun (existing)"
  }
}
```

### Auth Service Integration Points
```typescript
// Auth service endpoints
const AUTH_ENDPOINTS = {
  login: '/auth/login',
  signup: '/auth/signup',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
  social: {
    google: '/auth/social/google',
    twitter: '/auth/social/twitter',
    facebook: '/auth/social/facebook'
  }
};
```

## Data Models & Types

### User Schema
```typescript
// Based on MongoDB structure from existing auth service
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  createDate: string;
  lastUpdated: string;
  isBlocked: boolean;
}

// Zod schema for role validation
export const UserRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;
```

### Auth Response Format
```typescript
// Standard response format from auth service
export interface AuthResponse {
  status: string;
  Status: number; // HTTP status code
  message: string;
  data?: {
    user?: User;
    token?: string; // Will be set as HTTP-only cookie
    refreshToken?: string; // Will be set as HTTP-only cookie
  };
}
```

### Form Validation Schemas
```typescript
// Password requirements: 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: PasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const VerifyEmailSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits')
});
```

## Route Structure & Protection

### Page Routes
```typescript
// Public routes
/                    // Landing page (unauthenticated)
/login              // Login page
/signup             // Signup page
/forgot-password    // Forgot password page
/reset-password     // Reset password page (with token)
/verify-email       // Email verification with OTP

// Protected routes (require authentication)
/dashboard          // Main dashboard (authenticated users)
/profile            // User profile page

// Admin routes (require admin role)
/admin              // Admin dashboard
/admin/*            // Admin sub-routes
```

### Route Guard Implementation
```typescript
// Route guard with automatic token refresh
interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireVerified?: boolean;
}

export function RouteGuard({ 
  children, 
  requireAuth = false, 
  requireAdmin = false,
  requireVerified = false 
}: RouteGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Auto-refresh token logic
  // If token expired, attempt refresh
  // If refresh fails, redirect to login
  // Trust RTK store for auth state
}
```

## Redux Store Configuration

### Auth Slice
```typescript
// RTK Auth slice for state management
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokenExpiry: number | null; // For refresh timing
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tokenExpiry: null
};

// Actions: login, logout, refresh, setUser, setError, clearError
// Thunks: loginUser, signupUser, refreshToken, logoutUser, verifyEmail
```

### Token Management
```typescript
// Token configuration
const TOKEN_CONFIG = {
  cookieName: 'auth-token',
  refreshCookieName: 'refresh-token',
  defaultExpiry: 5 * 60 * 1000, // 5 minutes (configurable via env)
  refreshThreshold: 60 * 1000   // Refresh 1 minute before expiry
};
```

## Component Architecture

### Core Auth Components
```typescript
// Login form component
export function LoginForm() {
  // react-hook-form + zod validation
  // Submit to auth service
  // Handle social login buttons
  // Error handling with toast
}

// Signup form component
export function SignupForm() {
  // react-hook-form + zod validation
  // Password strength indicator
  // Submit to auth service
  // Social signup options
}

// Email verification component
export function EmailVerification() {
  // OTP input (6 digits)
  // Resend OTP functionality
  // Auto-submit on complete
}

// Forgot password component
export function ForgotPasswordForm() {
  // Email input
  // Submit to existing forgot password service
}

// Reset password component
export function ResetPasswordForm() {
  // Token from URL params
  // New password + confirm
  // Submit to auth service
}

// Social login buttons
export function SocialLoginButton({ provider }: { provider: 'google' | 'twitter' | 'facebook' }) {
  // Handle social authentication
  // Redirect to auth service social endpoints
}
```

### Page Components (Stubbed)
```typescript
// Landing page (unauthenticated)
export function LandingPage() {
  // Hero section
  // Login/Signup CTAs
  // Public content
}

// Dashboard (authenticated)
export function Dashboard() {
  // Welcome message
  // User info
  // Protected content
}

// Admin dashboard (admin only)
export function AdminDashboard() {
  // Admin-specific content
  // User management (future)
}
```

## Environment Configuration

### Required Environment Variables
```bash
# .env.example
VITE_AUTH_SERVICE_BASE_URL=http://localhost:4000
VITE_TOKEN_EXPIRY_MINUTES=5
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_TWITTER_API_KEY=your_twitter_api_key
```

## API Integration Layer

### Auth Service Client
```typescript
// API client for auth service integration
class AuthServiceClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // POST /auth/login
    // Handle HTTP-only cookie setting
  }
  
  async signup(userData: SignupData): Promise<AuthResponse> {
    // POST /auth/signup
    // Automatic email verification trigger
  }
  
  async refreshToken(): Promise<AuthResponse> {
    // POST /auth/refresh
    // Use existing refresh token cookie
  }
  
  async logout(): Promise<AuthResponse> {
    // POST /auth/logout
    // Clear cookies
  }
  
  async verifyEmail(otp: string): Promise<AuthResponse> {
    // POST /auth/verify-email
    // Submit OTP
  }
  
  async forgotPassword(email: string): Promise<AuthResponse> {
    // POST /auth/forgot-password
    // Trigger Mailgun email
  }
  
  async resetPassword(token: string, password: string): Promise<AuthResponse> {
    // POST /auth/reset-password
    // Reset with token
  }
  
  async socialLogin(provider: string): Promise<AuthResponse> {
    // GET /auth/social/{provider}
    // Handle OAuth flow
  }
}
```

## Error Handling Strategy

### Error Types
```typescript
// Generic error handling as specified
interface AuthError {
  status: string;
  Status: number;
  message: string;
}

// Client-side error categories
enum AuthErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER_ERROR = 'SERVER_ERROR'
}
```

### Error Display
- Form validation errors: inline field errors
- Auth service errors: toast notifications
- Network errors: retry mechanisms
- Token expiry: automatic refresh or redirect

## Security Considerations

### Token Security
- HTTP-only cookies prevent XSS access
- Secure flag in production
- SameSite attribute for CSRF protection
- Automatic token refresh before expiry

### Form Security
- Zod validation on all inputs
- Password strength requirements enforced
- Rate limiting (handled by auth service)
- Generic error messages to prevent enumeration

## Testing Strategy

### Unit Tests
- Form validation with Zod schemas
- Redux slice actions and reducers
- Route guard logic
- Component rendering and interactions

### Integration Tests
- Complete authentication flows
- Token refresh mechanisms
- Social login integration
- Error handling scenarios

### Test Examples
```typescript
// Form validation test
describe('LoginForm', () => {
  it('validates email format', () => {
    // Test email validation
  });
  
  it('submits valid credentials', () => {
    // Test successful submission
  });
});

// Route guard test
describe('RouteGuard', () => {
  it('redirects unauthenticated users', () => {
    // Test redirect logic
  });
  
  it('refreshes expired tokens', () => {
    // Test automatic refresh
  });
});
```

## Development Phases

### Phase 1: Core Authentication
- [ ] Set up Redux store with auth slice
- [ ] Create login/signup forms with validation
- [ ] Implement auth service integration
- [ ] Add route guards and protection
- [ ] Basic error handling

### Phase 2: Enhanced Features
- [ ] Email verification with OTP
- [ ] Password reset flow
- [ ] Social login integration
- [ ] Token refresh automation
- [ ] Comprehensive error handling

### Phase 3: Polish & Security
- [ ] Loading states and UX improvements
- [ ] Security hardening
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@repo/auth": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "react-redux": "^9.1.0",
    "@reduxjs/toolkit": "^2.2.1",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.4",
    "zod": "^3.22.4",
    "axios": "^1.6.0",
    "js-cookie": "^3.0.5"
  }
}
```

### shadcn/ui Components
```json
{
  "ui_components": [
    "button",
    "input",
    "label",
    "form",
    "toast",
    "card",
    "dialog",
    "separator",
    "loading-spinner"
  ]
}
```

## Success Metrics

### Technical Metrics
- Authentication success rate > 99%
- Token refresh success rate > 95%
- Page load time < 2 seconds
- Form validation response < 100ms

### User Experience Metrics
- Login completion rate > 90%
- Signup completion rate > 85%
- Email verification completion rate > 80%
- Password reset completion rate > 75%

---

**Next Steps:**
1. Confirm integration approach with existing `@repo/auth` service
2. Define exact API contracts and response formats
3. Set up development environment variables
4. Begin Phase 1 implementation