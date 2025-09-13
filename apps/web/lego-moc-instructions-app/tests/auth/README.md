# Complete Auth Flow Test Suite

This directory contains comprehensive Playwright tests for the entire authentication flow, including signup, signin, forgot password, email verification, and profile page routing.

## 🧪 Test Files

### Core Test Suites

#### `complete-auth-flow.spec.ts`
**Complete authentication journey testing**
- ✅ **Sign Up Flow**: Registration → Email verification → Success
- ✅ **Sign In Flow**: Login → Profile page redirect
- ✅ **Forgot Password Flow**: Request → Email sent → Reset
- ✅ **Email Verification**: Token validation → Account activation
- ✅ **Complete User Journey**: Signup → Verify → Login → Profile
- ✅ **CSRF Protection**: Security throughout all flows
- ✅ **Error Handling**: Validation and API errors

#### `profile-routing.spec.ts`
**Authentication state and routing**
- ✅ **Post-Login Routing**: Redirect to profile/dashboard
- ✅ **Protected Routes**: Authentication required
- ✅ **User Information**: Display on profile page
- ✅ **Admin Routing**: Special handling for admin users
- ✅ **Authentication State**: Persistence across refreshes
- ✅ **Logout Flow**: Clear state and redirect
- ✅ **User Experience**: Smooth transitions

#### `simple-auth-test.spec.ts`
**Basic functionality verification**
- ✅ **Component Loading**: Auth forms render correctly
- ✅ **Form Validation**: Client-side validation
- ✅ **Navigation**: Between auth pages
- ✅ **Service Connection**: Auth API connectivity
- ✅ **Redux Integration**: Store state management
- ✅ **UI Package**: Styling and components

### Legacy Test Files

#### `consolidated-auth-flow.spec.ts`
**Shared auth package integration**
- CSRF token management
- Shared component testing
- Package integration verification

#### `auth-flow-native.spec.ts`
**Native implementation testing**
- Direct API testing
- Component-level testing

## 🚀 Quick Start

### Run All Auth Tests
```bash
# From project root
pnpm test:auth

# From web app directory
cd apps/web/lego-moc-instructions-app
pnpm test:auth
```

### Run with Browser UI
```bash
pnpm test:auth:headed
```

### Debug Mode
```bash
pnpm test:auth:debug
```

### Setup Services Only
```bash
pnpm test:auth:setup
```

## 📋 Available Commands

### From Project Root
| Command | Description |
|---------|-------------|
| `pnpm test:auth` | Run all auth tests (headless) |
| `pnpm test:auth:headed` | Run with browser UI |
| `pnpm test:auth:debug` | Debug mode with UI |
| `pnpm test:auth:setup` | Setup services only |

### From Web App Directory
| Command | Description |
|---------|-------------|
| `pnpm test:auth` | Full auth test suite |
| `pnpm test:auth:headed` | With browser UI |
| `pnpm test:auth:debug` | Debug mode |
| `pnpm test:auth:setup` | Setup only |
| `pnpm test:auth:signin` | Complete auth flow tests |
| `pnpm test:auth:profile` | Profile routing tests |

### Individual Test Files
```bash
# Specific test files
pnpm playwright test tests/auth/complete-auth-flow.spec.ts
pnpm playwright test tests/auth/profile-routing.spec.ts
pnpm playwright test tests/auth/simple-auth-test.spec.ts

# With options
pnpm playwright test tests/auth/complete-auth-flow.spec.ts --headed
pnpm playwright test tests/auth/profile-routing.spec.ts --debug
```

## 🔧 Prerequisites

### Services Required
1. **Docker Infrastructure** (MongoDB, PostgreSQL, Redis, Elasticsearch)
2. **Auth Service** (port 9000)
3. **Web Application** (port 3004 or 3002)
4. **Test Users** (seeded in database)

### Auto-Setup
The test runner automatically:
- ✅ Checks service status
- ✅ Starts missing services
- ✅ Seeds test users
- ✅ Waits for services to be ready

### Manual Setup
```bash
# Start all services
pnpm dev:full

# Seed test users
pnpm seed:users

# Run tests
pnpm test:auth
```

## 👥 Test Users

The tests use seeded South Park characters and standard test users:

### Standard Test Users
- **test@example.com** / TestPassword123!
- **admin@example.com** / AdminPassword123!

### South Park Characters
- **stan.marsh@southpark.co** / SouthPark123!
- **kyle.broflovski@southpark.co** / SouthPark123!
- **eric.cartman@southpark.co** / SouthPark123!
- **randy.marsh@southpark.co** / SouthPark123! (Admin)

See `test-users.ts` for complete list and helper functions.

## 🧪 Test Scenarios

### Sign Up Flow Tests
```typescript
// New user registration
test('should complete full signup flow with email verification')

// Form validation
test('should validate signup form fields')

// Error handling
test('should handle signup errors gracefully')
```

### Sign In Flow Tests
```typescript
// Successful login → profile redirect
test('should complete signin and redirect to profile page')

// Invalid credentials
test('should handle invalid login credentials')

// Form validation
test('should validate login form fields')
```

### Forgot Password Tests
```typescript
// Password reset request
test('should complete forgot password flow')

// Non-existent email
test('should handle forgot password for non-existent email')
```

### Email Verification Tests
```typescript
// Valid token verification
test('should handle email verification')

// Invalid token handling
test('should handle invalid verification token')
```

### Profile Routing Tests
```typescript
// Post-login redirect
test('should redirect to profile page after successful login')

// User info display
test('should display user information on profile page')

// Protected routes
test('should redirect unauthenticated users to login')

// Authentication persistence
test('should maintain authentication state across page refreshes')

// Logout functionality
test('should handle logout and redirect to login')
```

### Complete Journey Tests
```typescript
// Full user lifecycle
test('should complete full user journey: signup → verify → login → profile')
```

### Security Tests
```typescript
// CSRF protection
test('should include CSRF tokens in all auth requests')
```

## 🔒 Security Testing

### CSRF Protection
- ✅ All auth requests include CSRF tokens
- ✅ Token refresh on failure
- ✅ Retry logic for CSRF errors

### Authentication State
- ✅ Protected route access control
- ✅ Token validation
- ✅ Session management
- ✅ Logout security

### Input Validation
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Form field validation
- ✅ Error message display

## 📊 Test Configuration

### Timeouts
- **Global Test Timeout**: 120 seconds (complex auth flows)
- **Individual Tests**: 30-90 seconds based on complexity
- **Action Timeout**: 15 seconds
- **Navigation Timeout**: 30 seconds

### Retry Logic
- **Test Retries**: 1 retry on failure
- **Network Requests**: Built-in retry for CSRF failures
- **Service Checks**: 30 attempts with 2-second intervals

### Browser Configuration
- **Headless Mode**: Default for CI/automated testing
- **Headed Mode**: Available for debugging
- **Debug Mode**: Step-through debugging
- **Trace Collection**: On failure for debugging

## 🐛 Debugging

### Debug Mode
```bash
pnpm test:auth:debug
```

### View Logs
```bash
# Auth service logs
tail -f logs/auth-service.log

# Web app logs
tail -f logs/web-app.log

# Database queries
mongosh mongodb://admin:password123@localhost:27017/backend?authSource=admin
```

### Common Issues

#### Services Not Running
```bash
# Check service status
curl http://localhost:9000/api/auth/csrf
curl http://localhost:3004

# Restart services
pnpm dev:full
```

#### Database Issues
```bash
# Check user count
mongosh mongodb://admin:password123@localhost:27017/backend?authSource=admin --eval "db.users.countDocuments()"

# Reseed users
pnpm seed:users:clear
```

#### Test Failures
```bash
# Run specific failing test
pnpm playwright test tests/auth/complete-auth-flow.spec.ts -g "should complete signin"

# Debug mode
pnpm playwright test tests/auth/complete-auth-flow.spec.ts --debug
```

## 📈 Performance

### Test Execution Times
- **Complete Auth Flow**: ~2-3 minutes
- **Profile Routing**: ~1-2 minutes
- **Simple Auth Tests**: ~30-60 seconds
- **Full Suite**: ~5-8 minutes

### Optimization
- ✅ Parallel test execution where safe
- ✅ Service reuse across tests
- ✅ Efficient mocking strategies
- ✅ Minimal wait times

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- name: Run Auth Tests
  run: |
    pnpm test:auth:setup
    pnpm test:auth
```

### Test Reports
- ✅ Playwright HTML reports
- ✅ Test result summaries
- ✅ Screenshot capture on failure
- ✅ Video recording for debugging

## 📚 Related Documentation

- **User Seeding**: `apps/api/auth-service/SEED_USERS.md`
- **Development Commands**: `DEVELOPMENT_COMMANDS.md`
- **Timeout Configuration**: `tests/TIMEOUT_CONFIGURATION.md`
- **Auth Package Testing**: `packages/auth/TESTING.md`

## 🎯 Test Coverage

### Functional Coverage
- ✅ **Sign Up**: Registration, validation, errors
- ✅ **Sign In**: Authentication, routing, errors
- ✅ **Forgot Password**: Reset flow, validation
- ✅ **Email Verification**: Token handling, activation
- ✅ **Profile Access**: Routing, display, state
- ✅ **Security**: CSRF, authentication, authorization

### User Experience Coverage
- ✅ **Form Interactions**: Filling, submission, validation
- ✅ **Navigation**: Between pages, redirects
- ✅ **Error Handling**: User-friendly messages
- ✅ **Loading States**: Smooth transitions
- ✅ **Responsive Design**: Cross-device compatibility

### Technical Coverage
- ✅ **API Integration**: Request/response handling
- ✅ **State Management**: Redux store integration
- ✅ **Component Testing**: Shared auth package
- ✅ **Routing**: TanStack Router integration
- ✅ **Security**: CSRF protection, token management

Perfect for ensuring the consolidated auth flow works flawlessly! 🚀
