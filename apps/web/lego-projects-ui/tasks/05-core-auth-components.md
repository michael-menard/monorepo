# Task 05: Core Auth Components Integration

## Overview
Integrate and extend existing authentication components from `@repo/auth` package.

## Priority
**High**

## Estimated Effort
**3-4 hours** (reduced due to existing components)

## Category
**Core Auth**

## Dependencies
- Task 01: Environment Setup
- Task 02: Redux Store Setup
- Task 03: Auth Service Client

## Technical Details

### Leveraging Existing Components
The `@repo/auth` package already provides complete components:

```typescript
// Import existing components
import { 
  Login, 
  Signup, 
  ForgotPassword, 
  ResetPassword, 
  EmailVerification,
  Input,
  LoadingSpinner,
  PasswordStrength,
  FloatingShape
} from '@repo/auth';
```

### Existing Component Features

**Login Component:**
- ✅ Email and password fields
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ "Forgot password" link
- ✅ Navigation to signup
- ✅ Framer Motion animations

**Signup Component:**
- ✅ Email, name, password fields
- ✅ Password strength indicator
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ Navigation to login

**Email Verification Component:**
- ✅ OTP input (6 digits)
- ✅ Auto-focus and auto-submit
- ✅ Resend functionality
- ✅ Loading states

**Forgot Password Component:**
- ✅ Email input field
- ✅ Form validation
- ✅ Success message
- ✅ Back to login link

**Reset Password Component:**
- ✅ Token from URL parameters
- ✅ New password and confirmation
- ✅ Password strength indicator
- ✅ Form validation

### Component Integration Strategy

**Option 1: Direct Usage**
```typescript
// Use components as-is
import { Login } from '@repo/auth';

function LoginPage() {
  return (
    <div className="auth-container">
      <Login />
    </div>
  );
}
```

**Option 2: Extended Components**
```typescript
// Extend existing components with additional features
import { Login } from '@repo/auth';

function EnhancedLoginPage() {
  return (
    <div className="auth-container">
      <Login />
      {/* Add social login buttons */}
      <SocialLoginButtons />
      {/* Add additional branding */}
      <Branding />
    </div>
  );
}
```

**Option 3: Custom Wrapper**
```typescript
// Create custom wrapper components
import { Login } from '@repo/auth';

function CustomLoginPage() {
  return (
    <div className="custom-auth-layout">
      <div className="auth-card">
        <Login />
      </div>
      <div className="auth-sidebar">
        <SocialLoginButtons />
        <HelpSection />
      </div>
    </div>
  );
}
```

### Additional Components Needed

**Social Login Buttons:**
```typescript
export function SocialLoginButtons() {
  // Handle social authentication
  // Redirect to auth service social endpoints
}
```

**Route Wrapper Components:**
```typescript
export function LoginPage() {
  return <Login />;
}

export function SignupPage() {
  return <Signup />;
}

export function ForgotPasswordPage() {
  return <ForgotPassword />;
}

export function ResetPasswordPage() {
  return <ResetPassword />;
}

export function EmailVerificationPage() {
  return <EmailVerification />;
}
```

## Acceptance Criteria
- [ ] Existing auth components are imported and working
- [ ] Components integrate with Redux store
- [ ] Components work with existing auth service
- [ ] Social login buttons are implemented
- [ ] Page wrapper components are created
- [ ] Error handling is comprehensive
- [ ] Loading states are implemented
- [ ] Components use consistent styling

## Implementation Steps
1. Import existing components from `@repo/auth`
2. Test all existing components
3. Create page wrapper components
4. Implement social login buttons
5. Integrate with Redux store
6. Test all authentication flows
7. Add custom styling if needed
8. Test error handling and loading states

## Notes
- **Use existing components** instead of rebuilding
- **Extend components** rather than replacing them
- **Maintain consistency** with existing auth package
- **Test all existing functionality** works correctly
- **Add custom features** as needed for specific requirements 