# Task 03: Auth Service Client

## Overview
Implement the API client for auth service integration as specified in the PRD.

## Priority
**High**

## Estimated Effort
**3-4 hours**

## Category
**Core Auth**

## Dependencies
- Task 01: Environment Setup
- Task 02: Redux Store Setup

## Technical Details

### Auth Service Client Class
```typescript
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

### Auth Endpoints Configuration
```typescript
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

### Response Format
```typescript
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

### Error Handling
```typescript
interface AuthError {
  status: string;
  Status: number;
  message: string;
}

enum AuthErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER_ERROR = 'SERVER_ERROR'
}
```

## Acceptance Criteria
- [ ] AuthServiceClient class is implemented
- [ ] All API endpoints are configured
- [ ] HTTP-only cookie handling is implemented
- [ ] Error handling is comprehensive
- [ ] Response types match backend format
- [ ] Social login endpoints are configured
- [ ] Token refresh mechanism is implemented

## Implementation Steps
1. Create AuthServiceClient class
2. Implement all API methods
3. Configure axios with proper interceptors
4. Handle HTTP-only cookies
5. Implement error handling
6. Add request/response logging
7. Test all endpoints

## Notes
- Ensure proper CORS handling
- Implement request/response interceptors
- Handle token refresh automatically
- Add proper error categorization
- Consider rate limiting on client side 