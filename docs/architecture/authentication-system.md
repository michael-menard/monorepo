# Authentication System Architecture

## Overview

This document describes the complete authentication system for the LEGO MOC Instructions application. The system is built on **AWS Cognito** via **AWS Amplify v6**, integrated with **React 19**, **Redux Toolkit**, and **TanStack Router**.

### Key Features

- Email/password authentication with Cognito User Pools
- Multi-factor authentication (SMS, Email, TOTP)
- Email verification flow for new signups
- Password reset with verification codes
- Global sign-out across all devices
- Automatic token refresh with retry logic
- Cross-tab session synchronization via Amplify Hub
- Route protection with role-based access control

---

## System Architecture

```mermaid
graph TB
    subgraph "Frontend Application"
        UI[React UI Components]
        AP[AuthProvider]
        RS[Redux Store]
        RG[Route Guards]
        TM[Token Manager]
    end

    subgraph "AWS Cognito"
        UP[User Pool]
        UC[User Pool Client]
        MFA[MFA Configuration]
        EMAIL[SES Email Service]
    end

    subgraph "State Management"
        CTX[Auth Context]
        SLICE[Auth Slice]
        RTK[RTK Query Cache]
        SS[Session Storage]
    end

    UI --> AP
    AP --> |Amplify SDK| UP
    AP --> RS
    AP --> TM
    RS --> SLICE
    RS --> RTK
    RG --> RS
    UP --> UC
    UP --> MFA
    UP --> EMAIL
    AP --> CTX
    AP --> SS

    style AP fill:#e1f5fe
    style UP fill:#fff3e0
    style RS fill:#f3e5f5
```

---

## Authentication Flows

### 1. Sign Up Flow

New user registration with email verification.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant SP as SignupPage
    participant AP as AuthProvider
    participant C as Cognito
    participant EVP as EmailVerificationPage
    participant LP as LoginPage

    U->>SP: Fill form (name, email, password)
    SP->>SP: Validate (Zod schema)
    SP->>AP: signUp({ name, email, password })
    AP->>C: signUp() with autoSignIn: true
    C-->>C: Create user (UNCONFIRMED)
    C-->>AP: { isSignUpComplete: false }
    AP->>AP: Store email in sessionStorage
    AP-->>SP: { success: true, requiresConfirmation: true }
    SP->>EVP: Navigate to /auth/verify-email

    U->>EVP: Enter 6-digit code
    EVP->>AP: confirmSignUp(email, code)
    AP->>C: confirmSignUp()
    C-->>C: Verify email, confirm user
    C-->>AP: { isSignUpComplete: true }
    AP->>C: autoSignIn()

    alt Auto Sign-In Success
        C-->>AP: { isSignedIn: true }
        AP->>AP: checkAuthState()
        AP-->>EVP: { success: true, autoSignedIn: true }
        EVP->>U: Show success, redirect to /dashboard
    else Auto Sign-In Failed
        C-->>AP: Error
        AP-->>EVP: { success: true, autoSignedIn: false }
        EVP->>LP: Redirect to /login (3s delay)
    end
```

### 2. Sign In Flow

Standard login with optional MFA challenge handling.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant LP as LoginPage
    participant AP as AuthProvider
    participant C as Cognito
    participant OTP as OTPVerificationPage
    participant NP as NewPasswordPage
    participant D as Dashboard

    U->>LP: Enter email & password
    LP->>LP: Validate credentials
    LP->>AP: signIn({ email, password })
    AP->>C: signIn()

    alt Sign In Complete
        C-->>AP: { isSignedIn: true }
        AP->>AP: checkAuthState()
        AP->>AP: Initialize token manager
        AP-->>LP: { success: true }
        LP->>D: Navigate to /dashboard
    else MFA Challenge Required
        C-->>AP: { nextStep: CONFIRM_SIGN_IN_WITH_* }
        AP->>AP: setCurrentChallenge()
        AP-->>LP: { requiresChallenge: true, challenge }

        alt SMS/Email/TOTP Code
            LP->>OTP: Navigate with challenge
            U->>OTP: Enter verification code
            OTP->>AP: confirmSignIn(code)
            AP->>C: confirmSignIn()
            C-->>AP: { isSignedIn: true }
            AP-->>OTP: { success: true }
            OTP->>D: Navigate to /dashboard
        else New Password Required
            LP->>NP: Navigate to /auth/new-password
            U->>NP: Enter new password
            NP->>AP: confirmSignIn(newPassword)
            AP->>C: confirmSignIn()
            C-->>AP: { isSignedIn: true }
            NP->>D: Navigate to /dashboard
        end
    end
```

### 3. Forgot Password Flow

Password recovery with email verification.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FP as ForgotPasswordPage
    participant AP as AuthProvider
    participant C as Cognito
    participant SES as SES Email
    participant RP as ResetPasswordPage
    participant LP as LoginPage

    U->>FP: Enter email address
    FP->>AP: forgotPassword(email)
    AP->>C: resetPassword({ username: email })
    C->>SES: Send verification code
    SES-->>U: Email with 6-digit code
    C-->>AP: Success
    AP-->>FP: { success: true }
    FP->>FP: Store email in sessionStorage
    FP->>FP: Show success (masked email)

    U->>FP: Click "Continue to Reset Password"
    FP->>RP: Navigate to /reset-password

    U->>RP: Enter code + new password
    RP->>RP: Validate password strength
    RP->>AP: confirmResetPassword(email, code, newPassword)
    AP->>C: confirmResetPassword()

    alt Success
        C-->>AP: Password updated
        AP-->>RP: { success: true }
        RP->>RP: Show success screen
        RP->>LP: Auto-redirect (3s)
    else Invalid Code
        C-->>AP: CodeMismatchException
        AP-->>RP: { error: "Invalid code" }
        RP->>U: Show error, allow retry
    else Expired Code
        C-->>AP: ExpiredCodeException
        AP-->>RP: { error: "Code expired" }
        U->>RP: Click "Resend Code"
        RP->>AP: forgotPassword(email)
    end
```

### 4. Logout Flow

Global sign-out with state cleanup.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant H as Header
    participant DLG as Confirmation Dialog
    participant AP as AuthProvider
    participant C as Cognito
    participant TM as Token Manager
    participant RS as Redux Store
    participant RTK as RTK Query
    participant R as Router

    U->>H: Click "Sign out" in user menu
    H->>DLG: Show confirmation dialog
    U->>DLG: Click "Log out"
    DLG->>AP: signOut()

    AP->>C: signOut({ global: true })
    C-->>C: Invalidate all sessions
    C-->>AP: Success

    AP->>TM: clearTokens()
    TM-->>TM: Clear cached tokens

    AP->>RTK: resetApiState() x3
    Note over RTK: Clear gallery, wishlist, dashboard caches

    AP->>RS: dispatch(setUnauthenticated())
    RS-->>RS: Clear user, tokens, set isAuthenticated=false

    AP->>R: navigate({ to: '/' })
    R-->>U: Redirect to home page
```

### 5. Token Refresh Flow

Automatic token refresh with Hub event synchronization.

```mermaid
sequenceDiagram
    autonumber
    participant APP as Application
    participant AP as AuthProvider
    participant HUB as Amplify Hub
    participant C as Cognito
    participant TM as Token Manager
    participant RS as Redux Store

    Note over APP,RS: Token approaching expiration (5 min buffer)

    APP->>TM: API request with token
    TM->>TM: Check token expiration
    TM->>C: fetchAuthSession({ forceRefresh: true })

    alt Refresh Success
        C-->>TM: New tokens
        TM->>RS: dispatch(updateTokens())
        TM-->>APP: Continue with new token
        HUB->>AP: 'tokenRefresh' event
        AP->>RS: Sync token state
    else Refresh Failure
        C-->>TM: Error
        HUB->>AP: 'tokenRefresh_failure' event
        AP->>RS: dispatch(setUnauthenticated())
        AP->>APP: Redirect to /login
    end

    Note over HUB,AP: Cross-tab synchronization

    alt User signs out in another tab
        HUB->>AP: 'signedOut' event
        AP->>TM: clearTokens()
        AP->>RS: dispatch(setUnauthenticated())
    end

    alt User signs in in another tab
        HUB->>AP: 'signedIn' event
        AP->>AP: checkAuthState()
        AP->>RS: dispatch(setAuthenticated())
    end
```

---

## Component Architecture

### Auth Provider Structure

```mermaid
graph TB
    subgraph "AuthProvider Component"
        INIT[Initialize on Mount]
        HUB[Hub Event Listener]
        CTX[Auth Context Value]
    end

    subgraph "Auth Methods"
        SI[signIn]
        CSI[confirmSignIn]
        SU[signUp]
        CSU[confirmSignUp]
        RSC[resendSignUpCode]
        FP[forgotPassword]
        CRP[confirmResetPassword]
        SO[signOut]
        RT[refreshTokens]
    end

    subgraph "State"
        CC[currentChallenge]
        PVE[pendingVerificationEmail]
        LOADING[isLoading]
    end

    INIT --> |checkAuthState| CTX
    HUB --> |Event handling| CTX

    CTX --> SI
    CTX --> CSI
    CTX --> SU
    CTX --> CSU
    CTX --> RSC
    CTX --> FP
    CTX --> CRP
    CTX --> SO
    CTX --> RT

    SI --> CC
    CSI --> CC
    SU --> PVE

    style CTX fill:#e8f5e9
```

### Page Component Hierarchy

```mermaid
graph TB
    subgraph "Auth Pages"
        LP[LoginPage]
        SP[SignupPage]
        FPP[ForgotPasswordPage]
        RPP[ResetPasswordPage]
        EVP[EmailVerificationPage]
        OVP[OTPVerificationPage]
        NPP[NewPasswordPage]
    end

    subgraph "Shared Components"
        OTP[OTPInput]
        RCB[ResendCodeButton]
        PSI[PasswordStrengthIndicator]
    end

    subgraph "UI Components @repo/ui"
        BTN[Button]
        INP[Input]
        FRM[Form]
        ALT[Alert]
        DLG[AlertDialog]
        CRD[Card]
    end

    LP --> BTN
    LP --> INP
    LP --> FRM
    LP --> ALT

    SP --> BTN
    SP --> INP
    SP --> PSI
    SP --> FRM

    FPP --> BTN
    FPP --> INP
    FPP --> CRD

    RPP --> OTP
    RPP --> RCB
    RPP --> PSI

    EVP --> OTP
    EVP --> RCB

    OVP --> OTP
    OVP --> RCB

    NPP --> PSI
    NPP --> INP

    style OTP fill:#fff9c4
    style RCB fill:#fff9c4
```

---

## Route Protection

### Guard System

```mermaid
flowchart TD
    REQ[Route Request] --> LOAD{isLoading?}
    LOAD -->|Yes| WAIT[Wait for auth check]
    WAIT --> LOAD
    LOAD -->|No| GUARD{Guard Type?}

    GUARD -->|public| ALLOW[Allow Access]

    GUARD -->|guestOnly| AUTH1{isAuthenticated?}
    AUTH1 -->|Yes| DASH[Redirect to /dashboard]
    AUTH1 -->|No| ALLOW

    GUARD -->|protected| AUTH2{isAuthenticated?}
    AUTH2 -->|No| LOGIN[Redirect to /login?redirect=...]
    AUTH2 -->|Yes| ALLOW

    GUARD -->|verified| AUTH3{isAuthenticated?}
    AUTH3 -->|No| LOGIN
    AUTH3 -->|Yes| VER{emailVerified?}
    VER -->|No| VERIFY[Redirect to /verify-email]
    VER -->|Yes| ALLOW

    GUARD -->|admin| AUTH4{isAuthenticated?}
    AUTH4 -->|No| LOGIN
    AUTH4 -->|Yes| ROLE{hasAdminRole?}
    ROLE -->|No| FORBID[403 Forbidden]
    ROLE -->|Yes| ALLOW

    style ALLOW fill:#c8e6c9
    style LOGIN fill:#ffcdd2
    style DASH fill:#bbdefb
```

### Route Configuration

| Route | Guard | Component | Purpose |
|-------|-------|-----------|---------|
| `/` | public | HomePage | Landing page |
| `/login` | guestOnly | LoginPage | User sign in |
| `/register` | guestOnly | SignupPage | New user registration |
| `/forgot-password` | guestOnly | ForgotPasswordPage | Password recovery |
| `/reset-password` | guestOnly | ResetPasswordPage | Complete password reset |
| `/auth/verify-email` | guestOnly | EmailVerificationPage | Email verification |
| `/auth/otp-verification` | guestOnly | OTPVerificationPage | MFA challenge |
| `/auth/new-password` | guestOnly | NewPasswordPage | Force password change |
| `/dashboard` | protected | DashboardModule | User dashboard |
| `/wishlist` | protected | WishlistModule | User wishlist |
| `/instructions` | protected | InstructionsModule | MOC instructions |

---

## State Management

### Redux Auth Slice

```mermaid
stateDiagram-v2
    [*] --> Loading: App Start
    Loading --> Unauthenticated: No session found
    Loading --> Authenticated: Valid session

    Unauthenticated --> Loading: signIn attempt
    Loading --> Authenticated: signIn success
    Loading --> Challenge: MFA required
    Loading --> Unauthenticated: signIn failed

    Challenge --> Loading: confirmSignIn
    Loading --> Authenticated: Challenge passed
    Loading --> Challenge: Additional challenge

    Authenticated --> Unauthenticated: signOut
    Authenticated --> Unauthenticated: Token refresh failed
    Authenticated --> Authenticated: Token refreshed

    state Authenticated {
        [*] --> Active
        Active --> TokenRefresh: Token expiring
        TokenRefresh --> Active: Refresh success
    }
```

### Auth State Interface

```typescript
interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  tokens: {
    accessToken?: string
    idToken?: string
    refreshToken?: string
  } | null
  error: string | null
}

interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  roles?: string[]
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    notifications?: boolean
  }
}
```

### Session Storage Usage

| Key | Purpose | Lifecycle |
|-----|---------|-----------|
| `pendingVerificationEmail` | Email awaiting verification | Cleared on verification success |
| `pendingResetEmail` | Email for password reset | Cleared on reset success |
| `auth_resend_cooldown` | Resend button cooldown expiry | Expires after cooldown |
| `auth_resend_attempts` | Number of resend attempts | Resets after 30 min inactivity |
| `auth_resend_attempt_reset` | Attempt count reset time | Updated on each attempt |

---

---

## Rate Limiting

### Overview

Authentication operations are rate limited at two layers:

1. **Cognito-Managed** (Password reset, sign-up, sign-in): AWS Cognito service-level rate limiting
2. **Backend-Managed** (API endpoints): Backend middleware for 401/403 responses

### Cognito vs Backend Rate Limiting Comparison

| Aspect | Cognito-Managed | Backend-Managed |
|--------|----------------|-----------------|
| **Operations** | `forgotPassword`, `confirmResetPassword`, `signIn`, `signUp` | Backend API endpoints (upload, admin, etc.) |
| **Enforcement** | AWS Cognito service | `apps/api/lego-api/middleware/rate-limit.ts` |
| **Error Type** | `LimitExceededException` (400) | `429 Too Many Requests` |
| **Retry-After Header** | ❌ No | ✅ Yes (calculated from sliding window) |
| **Threshold** | ~5 requests/min (AWS-managed, not configurable) | 10 failures per 5 minutes (configurable) |
| **State Storage** | N/A (Cognito black box) | In-memory Map (per Lambda instance) |
| **Frontend Handling** | Estimate cooldown via exponential backoff | Use `Retry-After` header from response |

### Frontend State Management for Cognito Rate Limiting

Since Cognito does not provide a `Retry-After` header, the frontend must track cooldown state using sessionStorage:

```typescript
// sessionStorage keys for password reset rate limiting
const FORGOT_PASSWORD_KEYS = {
  attempts: 'auth:forgotPassword:attempts',
  lastAttempt: 'auth:forgotPassword:lastAttempt',
  cooldownUntil: 'auth:forgotPassword:cooldownUntil',
}
```

**Exponential Backoff Algorithm**:
- Attempt 1: 60 seconds
- Attempt 2: 120 seconds (2 minutes)
- Attempt 3: 240 seconds (4 minutes)
- Attempt 4: 480 seconds (8 minutes)
- Attempt 5+: 600 seconds (10 minutes, capped)

**Reference Implementation**: `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx`

### UI/UX Pattern: RateLimitBanner Component

Rate limiting feedback is displayed using the `RateLimitBanner` component:

```typescript
import { RateLimitBanner } from '@repo/app-component-library'

<RateLimitBanner
  visible={cooldownSeconds > 0}
  retryAfterSeconds={cooldownSeconds}
  onRetry={() => setCooldownSeconds(0)}
  message="Too many password reset attempts. Please wait before retrying."
/>
```

**Features**:
- Countdown timer (format: "2:30" for 150 seconds)
- Progress bar (respects `prefers-reduced-motion`)
- Accessible: `aria-live="polite"`, `role="timer"`
- Retry button (enabled when countdown expires)

**Location**: `packages/core/upload/src/components/RateLimitBanner/index.tsx` (recommended move to `app-component-library`)

### ADR-004: Cognito as Authoritative Auth Service

Password reset operations do **NOT** involve backend API endpoints. The flow is:

```
Frontend (Amplify SDK) → Cognito User Pool (Direct)
```

**Implications**:
- No backend proxy layer for password reset
- Frontend handles Cognito rate limiting errors
- Client-side cooldown tracking (sessionStorage)
- Cooldown can be bypassed locally, but Cognito enforces service-level limit

**Design Decision**: Client-side cooldown provides UX feedback, but does not replace Cognito's enforcement.

### Account Enumeration Prevention

Rate limit feedback must NOT leak account existence information:

✅ **Correct**: "Too many attempts. Please wait before trying again."  
❌ **Wrong**: "This account has been temporarily locked due to too many reset attempts."

**Implementation**: See `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` lines 78-88, 112-120

### Implementation Guide

For detailed specifications on implementing password reset rate limiting, see:

**[Password Reset Rate Limiting Implementation Guide](../guides/password-reset-rate-limiting.md)**

Topics covered:
- Cognito rate limiting behavior and error responses
- Frontend state management patterns (sessionStorage, exponential backoff)
- UI/UX patterns (RateLimitBanner, countdown timers, accessibility)
- Component reuse strategy
- Testing approach (MSW, Playwright, UAT requirements)

**Related Stories**: [BUGF-027](../../plans/future/bug-fix/in-progress/BUGF-027/BUGF-027.md), [BUGF-019](../../plans/future/bug-fix/ready-to-work/BUGF-019/BUGF-019.md)


## Error Handling

### Cognito Error Mapping

```mermaid
flowchart LR
    subgraph "Cognito Exceptions"
        CME[CodeMismatchException]
        ECE[ExpiredCodeException]
        LEE[LimitExceededException]
        UNF[UserNotFoundException]
        IPE[InvalidPasswordException]
        NAE[NotAuthorizedException]
    end

    subgraph "User Messages"
        M1["Invalid verification code"]
        M2["Code has expired"]
        M3["Too many attempts"]
        M4["No account found"]
        M5["Password doesn't meet requirements"]
        M6["Incorrect username or password"]
    end

    CME --> M1
    ECE --> M2
    LEE --> M3
    UNF --> M4
    IPE --> M5
    NAE --> M6
```

### Error Display Pattern

```typescript
// Component-level error handling
const [error, setError] = useState<string | null>(null)

try {
  const result = await authMethod()
  if (!result.success) {
    setError(result.error)
  }
} catch (e) {
  setError('An unexpected error occurred')
}

// Display
{error && (
  <Alert variant="destructive" role="alert">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

---

## Security Considerations

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Optional: special characters (Cognito default)

### Rate Limiting

The ResendCodeButton implements exponential backoff:

```
Attempt 1: 60 seconds cooldown
Attempt 2: 120 seconds cooldown
Attempt 3: 240 seconds cooldown
Attempt 4: 480 seconds cooldown
Attempt 5+: 600 seconds cooldown (max)
```

Attempt count resets after 30 minutes of inactivity.

### Security Best Practices

1. **Account Enumeration Prevention**: Forgot password always shows success message
2. **Email Masking**: Display as `user***@domain.com`
3. **Global Sign-Out**: Invalidates all sessions across devices
4. **Token Security**: Tokens stored in memory, not localStorage
5. **HTTPS Only**: All Cognito communication over TLS
6. **Session Expiry**: Automatic logout on token refresh failure

---

## Amplify Configuration

### Environment Variables

```bash
VITE_AWS_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_AWS_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Configuration Object

```typescript
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID,
      loginWith: {
        email: true
      }
    }
  }
}
```

### Token Manager Configuration

```typescript
initializeCognitoTokenManager(tokens, refreshFn, {
  enableRetryLogic: true,
  enablePerformanceMonitoring: true,
  maxRefreshRetries: 3,
  refreshRetryDelay: 1000,
  tokenExpirationBuffer: 300, // 5 minutes
  enableCircuitBreaker: true
})
```

---

## Testing Considerations

### Unit Test Coverage

| Component | Test File | Coverage Areas |
|-----------|-----------|----------------|
| AuthProvider | AuthProvider.test.tsx | All auth methods, Hub events |
| OTPInput | OTPInput.test.tsx | Input handling, keyboard nav, paste |
| ResendCodeButton | ResendCodeButton.test.tsx | Cooldown, attempts, callbacks |
| Header (logout) | Header.test.tsx | Confirmation dialog, signOut call |
| LoginPage | LoginPage.test.tsx | Form validation, challenge routing |
| SignupPage | SignupPage.test.tsx | Validation, password strength |

### Integration Test Scenarios

1. Full signup → verification → auto-login flow
2. Login → MFA challenge → dashboard access
3. Forgot password → reset → login with new password
4. Token refresh during active session
5. Cross-tab sign-out synchronization
6. Protected route redirect with return URL

---

## Accessibility

### ARIA Implementation

- `aria-live="polite"` for status updates
- `aria-invalid` on fields with validation errors
- `aria-describedby` linking error messages to fields
- `role="alert"` on error notifications
- Proper `<label>` associations for all inputs

### Keyboard Navigation

- Tab navigation through all form fields
- Enter to submit forms
- Escape to close dialogs
- Arrow keys for OTP input navigation
- Focus management on page transitions

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-29 | 1.0 | Initial documentation | Architect Agent |

---

*Last Updated: 2025-11-29*
