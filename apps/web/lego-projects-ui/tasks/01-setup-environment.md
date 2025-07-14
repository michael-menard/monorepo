# Task 01: Environment Setup

## Overview
Set up the development environment and project structure for the authentication frontend integration, leveraging existing `@repo/auth` package components.

## Priority
**High**

## Estimated Effort
**1-2 hours**

## Category
**Setup**

## Dependencies
- None (first task)

## Technical Details

### Environment Variables Setup
Create `.env.example` and `.env` files with required variables:

```bash
# .env.example
VITE_AUTH_SERVICE_BASE_URL=http://localhost:5000/api/auth
VITE_TOKEN_EXPIRY_MINUTES=5
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_TWITTER_API_KEY=your_twitter_api_key
```

### Dependencies Installation
Install core dependencies as specified in PRD:

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
    "js-cookie": "^3.0.5",
    "framer-motion": "^12.23.3"
  }
}
```

### Leveraging Existing Auth Package
The `@repo/auth` package already provides:

**Components:**
- `Login` - Complete login form with validation
- `Signup` - Complete signup form with validation  
- `ForgotPassword` - Forgot password form
- `ResetPassword` - Reset password form
- `EmailVerification` - Email verification with OTP
- `Input` - Reusable input component
- `LoadingSpinner` - Loading indicator
- `PasswordStrength` - Password strength indicator
- `FloatingShape` - UI decoration component

**Hooks:**
- `useAuth` - Complete auth hook with all actions

**Store:**
- `authSlice` - Redux slice with all auth actions
- `authReducer` - Redux reducer
- `store` - Redux store configuration

**Types:**
- `User` - User interface
- `AuthState` - Auth state interface

### shadcn/ui Setup
Install and configure shadcn/ui components:
- button
- input
- label
- form
- toast
- card
- dialog
- separator
- loading-spinner

## Acceptance Criteria
- [ ] Environment variables are configured
- [ ] All dependencies are installed and working
- [ ] shadcn/ui is properly configured
- [ ] Project builds without errors
- [ ] Development server starts successfully
- [ ] `@repo/auth` package is accessible and working
- [ ] Existing auth components can be imported and used

## Implementation Steps
1. Create `.env.example` and `.env` files
2. Install dependencies via `pnpm install`
3. Configure shadcn/ui components
4. Test build and dev server
5. Verify workspace integration with `@repo/auth`
6. Test importing existing auth components
7. Verify existing auth store integration

## Notes
- **Leverage existing components** from `@repo/auth` instead of rebuilding
- **Use existing auth slice** and hooks from the package
- **Extend existing components** rather than creating new ones
- **Ensure compatibility** with existing auth service endpoints
- **Test that existing components** work with the new environment 