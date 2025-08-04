# API Documentation

This document provides comprehensive API documentation for the Lego MOC Instructions application, including authentication, email verification, and testing procedures.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Email Verification](#email-verification)
- [User Management](#user-management)
- [Testing](#testing)
- [Error Handling](#error-handling)

## Base URL

**Development**: `http://localhost:5000/api/auth`
**Production**: `https://your-domain.com/api/auth`

## Authentication

### Sign Up

**Endpoint**: `POST /auth/sign-up`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "john@example.com",
      "name": "John Doe",
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Login

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "john@example.com",
      "name": "John Doe",
      "isVerified": true,
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Logout

**Endpoint**: `POST /auth/log-out`

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Email Verification

### Verify Email

**Endpoint**: `POST /auth/verify-email`

**Request Body**:
```json
{
  "code": "123456"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "john@example.com",
      "name": "John Doe",
      "isVerified": true,
      "verificationToken": null,
      "verificationTokenExpiresAt": null
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Invalid or expired verification code"
}
```

### Resend Verification Email

**Endpoint**: `POST /auth/resend-verification`

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

### Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

### Reset Password

**Endpoint**: `POST /auth/reset-password/:token`

**Request Body**:
```json
{
  "password": "newSecurePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## User Management

### Check Authentication

**Endpoint**: `GET /auth/check-auth`

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "email": "john@example.com",
      "name": "John Doe",
      "isVerified": true,
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Testing

### Ethereal Email Testing

The application uses Ethereal Email for testing email functionality. See [EMAIL_TESTING.md](./EMAIL_TESTING.md) for detailed setup instructions.

#### Test Email Verification Flow

1. **Setup Ethereal Email**:
   ```bash
   # Get credentials from https://ethereal.email/create
   # Update .env file with credentials
   cp env.ethereal.template .env
   ```

2. **Start Services**:
   ```bash
   # Start auth service
   cd apps/api/auth-service
   pnpm dev

   # Start web application
   cd apps/web/lego-moc-instructions-app
   pnpm dev
   ```

3. **Test Flow**:
   - Navigate to signup page
   - Create account with test email
   - Check Ethereal Email web interface
   - Use verification code or link

#### Automated Testing

**Run E2E Tests**:
```bash
cd apps/web/lego-moc-instructions-app
pnpm test:e2e --grep "email verification"
```

**Run Unit Tests**:
```bash
cd apps/api/auth-service
pnpm test
```

**Test Email Configuration**:
```bash
cd apps/api/auth-service
pnpm test:ethereal-setup
```

### API Testing with Postman

Import the Postman collection from `apps/api/auth-service/__docs__/Auth_Service_API.postman_collection.json`

#### Test Scenarios

1. **Complete Signup Flow**:
   - POST `/auth/sign-up`
   - Check Ethereal Email for verification code
   - POST `/auth/verify-email` with code

2. **Password Reset Flow**:
   - POST `/auth/forgot-password`
   - Check Ethereal Email for reset link
   - POST `/auth/reset-password/:token`

3. **Login Flow**:
   - POST `/auth/login`
   - GET `/auth/check-auth`
   - POST `/auth/log-out`

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_FAILED` | Invalid credentials | 401 |
| `UNAUTHORIZED` | Token missing or invalid | 401 |
| `EMAIL_NOT_VERIFIED` | Email verification required | 403 |
| `USER_NOT_FOUND` | User does not exist | 404 |
| `EMAIL_ALREADY_EXISTS` | Email already registered | 409 |
| `VERIFICATION_CODE_INVALID` | Invalid verification code | 400 |
| `VERIFICATION_CODE_EXPIRED` | Verification code expired | 400 |
| `SERVER_ERROR` | Internal server error | 500 |

### Error Handling Examples

#### Validation Error
```json
{
  "success": false,
  "message": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

#### Authentication Error
```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "AUTHENTICATION_FAILED"
}
```

#### Email Verification Error
```json
{
  "success": false,
  "message": "Invalid or expired verification code",
  "code": "VERIFICATION_CODE_INVALID"
}
```

## Environment Variables

### Required Environment Variables

```env
# Auth Service
VITE_AUTH_SERVICE_BASE_URL=http://localhost:5000/api/auth
VITE_TOKEN_EXPIRY_MINUTES=5

# Ethereal Email (for testing)
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_username
ETHEREAL_PASS=your_ethereal_password
ETHEREAL_SECURE=false
EMAIL_TESTING_SERVICE=ethereal

# Social Login (optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_TWITTER_API_KEY=your_twitter_api_key
```

## Security Considerations

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting

- Signup: 5 requests per hour per IP
- Login: 10 requests per hour per IP
- Password reset: 3 requests per hour per email
- Email verification: 5 requests per hour per email

### Token Security

- JWT tokens expire after 5 minutes
- Refresh tokens expire after 7 days
- Tokens are stored in HTTP-only cookies
- CSRF protection enabled

## Monitoring and Logging

### Log Levels

- **ERROR**: Authentication failures, server errors
- **WARN**: Rate limiting, validation errors
- **INFO**: Successful operations, email sending
- **DEBUG**: Detailed request/response information

### Metrics

- Authentication success/failure rates
- Email delivery success rates
- API response times
- Error rates by endpoint

## Support

For API-related issues:

1. Check this documentation
2. Review error responses
3. Check server logs
4. Verify environment variables
5. Test with Postman collection
6. Contact the development team

## References

- [EMAIL_TESTING.md](./EMAIL_TESTING.md) - Email testing setup
- [PLAYWRIGHT_TESTING.md](./PLAYWRIGHT_TESTING.md) - E2E testing guide
- [Auth Service README](../apps/api/auth-service/README.md) - Service-specific documentation 