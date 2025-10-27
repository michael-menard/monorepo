# HTTP Request Files for Auth Service

This directory contains HTTP request files for testing the authentication service API endpoints.

## Files Overview

### `auth.http`

Main request file using environment variables. Contains all endpoints with various scenarios including:

- Health check
- User registration (valid and invalid data)
- Login (valid and invalid credentials)
- Email verification
- Password reset flow
- Authentication checks
- Logout

### `dev.http`

Development environment requests with hardcoded localhost URLs for quick testing.

### `staging.http`

Staging environment requests with staging URLs.

### `production.http`

Production environment requests with production URLs.

### `error-testing.http`

Comprehensive error scenarios and edge cases for testing API robustness:

- Missing required fields
- Invalid data formats
- Malformed requests
- Authentication edge cases

### `test-suite.http`

Complete test suite organized by feature flows:

- User registration flow
- Login flow
- Email verification flow
- Password reset flow
- Authentication check flow
- Logout flow
- Edge cases and error scenarios

## Environment Configuration

### `http-client.env.json`

Contains environment-specific variables:

- `baseUrl`: API base URL
- `authPath`: Authentication endpoint path
- `version`: API version

### `http-client.private.env.json`

Contains sensitive environment variables:

- `authToken`: Authentication tokens
- `apiKey`: API keys

## How to Use

### Using VS Code REST Client Extension

1. Install the "REST Client" extension in VS Code
2. Open any `.http` file
3. Click "Send Request" above each request
4. View responses in a new tab

### Using Environment Variables

The main `auth.http` file uses environment variables:

- `{{baseUrl}}`: Base URL (e.g., http://localhost:9000)
- `{{authPath}}`: Auth path (e.g., /api/auth)

### Environment Selection

Switch between environments by changing the active environment in VS Code:

- `dev`: Development (localhost)
- `qa`: QA environment
- `staging`: Staging environment
- `production`: Production environment

## API Endpoints

### Authentication Endpoints

| Method | Endpoint                 | Description                 |
| ------ | ------------------------ | --------------------------- |
| GET    | `/health`                | Health check                |
| POST   | `/sign-up`               | User registration           |
| POST   | `/login`                 | User login                  |
| POST   | `/log-out`               | User logout                 |
| POST   | `/verify-email`          | Email verification          |
| POST   | `/forgot-password`       | Request password reset      |
| POST   | `/reset-password/:token` | Reset password              |
| GET    | `/check-auth`            | Check authentication status |

## Request Examples

### User Registration

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

### User Login

```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

### Email Verification

```json
{
  "code": "123456"
}
```

### Password Reset Request

```json
{
  "email": "john.doe@example.com"
}
```

### Password Reset

```json
{
  "password": "newSecurePassword123"
}
```

## Testing Scenarios

### Happy Path Testing

- Register new user
- Login with valid credentials
- Verify email
- Check authentication
- Logout

### Error Testing

- Invalid email formats
- Weak passwords
- Missing required fields
- Invalid tokens
- Expired tokens
- Malformed requests

### Security Testing

- Authentication without tokens
- Invalid authentication tokens
- Cross-site request forgery attempts
- SQL injection attempts (if applicable)

## Notes

- All requests include proper `Content-Type: application/json` headers
- Authentication endpoints use cookies for token storage
- Error responses follow consistent format
- Health check endpoint is useful for monitoring
- Environment variables allow easy switching between environments
