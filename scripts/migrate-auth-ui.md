# Auth-UI Migration Guide

## Overview
This guide helps migrate the auth-ui app components to shared packages for better reusability.

## Package Structure

### @react-constructs/auth
- **Components**: LoginPage, SignupPage, ResetPasswordPage, DashboardPage
- **Hooks**: useAuth
- **Services**: authApi
- **Types**: AuthUser, LoginCredentials, SignupData

### @react-constructs/utils
- **Validation**: validateEmail, validatePassword, validateRequired
- **Formatting**: formatDate, formatCurrency
- **Storage**: getStorageItem, setStorageItem, removeStorageItem
- **HTTP**: handleApiError, createApiClient

## Migration Steps

1. **Move Components**:
   ```bash
   # Copy auth-ui components to packages/auth/src/components/
   cp -r apps/web/auth-ui/src/pages/* packages/auth/src/components/
   cp -r apps/web/auth-ui/src/hooks/* packages/auth/src/hooks/
   cp -r apps/web/auth-ui/src/services/* packages/auth/src/services/
   cp -r apps/web/auth-ui/src/types/* packages/auth/src/types/
   ```

2. **Move Utils**:
   ```bash
   # Copy utility functions to packages/utils/src/
   cp -r apps/web/auth-ui/src/utils/* packages/utils/src/
   cp -r apps/web/auth-ui/src/lib/* packages/utils/src/
   ```

3. **Update Imports**:
   - Replace local imports with package imports
   - Update auth-ui to use `@react-constructs/auth` and `@react-constructs/utils`
   - Update app-shell to use the shared packages

4. **Install Dependencies**:
   ```bash
   # In auth-ui and app-shell
   pnpm add @react-constructs/auth @react-constructs/utils
   ```

## Benefits
- **Reusability**: Auth components can be used in multiple apps
- **Maintainability**: Single source of truth for auth logic
- **Consistency**: Shared validation and utility functions
- **Type Safety**: Centralized type definitions 