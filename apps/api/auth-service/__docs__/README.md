# Auth Service API Documentation

This directory contains the API documentation for the Auth Service.

## Files

- `swagger.yaml` - OpenAPI 3.0 specification for the Auth Service API
- `README.md` - This file

## API Overview

The Auth Service provides authentication and authorization functionality for the LEGO MOC Instructions App. It handles user registration, login, email verification, password reset, and session management.

### Base URL

- **Development**: `http://localhost:5000`
- **Production**: `https://api.lego-moc-instructions.com`

### Authentication

The API uses JWT tokens stored in HTTP-only cookies for session management. Protected endpoints require a valid JWT token.

## Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/sign-up` | Register a new user | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/log-out` | User logout | No |
| GET | `/auth/check-auth` | Check authentication status | Yes |

### Email Verification

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/verify-email` | Verify email address | No |
| POST | `/auth/resend-verification` | Resend verification email | No |

### Password Reset

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password/{token}` | Reset password | No |

### Health Check

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/health` | Health check | No |

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data varies by endpoint
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE" // Optional error code
}
```

## Data Models

### User

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "isVerified": true,
  "lastLogin": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Invalid email or password |
| `EMAIL_NOT_VERIFIED` | User email not verified |
| `EMAIL_REQUIRED` | Email field is required |
| `USER_NOT_FOUND` | User not found |
| `ALREADY_VERIFIED` | User already verified |

## Usage Examples

### Register a New User

```bash
curl -X POST http://localhost:5000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }' \
  -c cookies.txt
```

### Check Authentication

```bash
curl -X GET http://localhost:5000/auth/check-auth \
  -b cookies.txt
```

### Verify Email

```bash
curl -X POST http://localhost:5000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### Request Password Reset

```bash
curl -X POST http://localhost:5000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### Reset Password

```bash
curl -X POST http://localhost:5000/auth/reset-password/abc123def456ghi789 \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePassword123!"
  }'
```

## Viewing the Documentation

### Swagger UI

You can view the interactive API documentation using Swagger UI:

1. Copy the contents of `swagger.yaml`
2. Go to [Swagger Editor](https://editor.swagger.io/)
3. Paste the YAML content
4. View the interactive documentation

### Local Swagger UI

To serve the documentation locally:

```bash
# Install swagger-ui-express
npm install -g swagger-ui-express

# Serve the documentation
swagger-ui-express swagger.yaml
```

## Development

### Adding New Endpoints

When adding new endpoints to the auth service:

1. Update the controller with the new functionality
2. Add the route to `routes/auth.routes.ts`
3. Update the Swagger documentation in `swagger.yaml`
4. Add examples and test cases

### Testing

The API can be tested using the provided HTTP files in the `__http__` directory or using tools like:

- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [curl](https://curl.se/)

### Validation

The Swagger specification can be validated using:

```bash
# Install swagger-cli
npm install -g @apidevtools/swagger-cli

# Validate the specification
swagger-cli validate swagger.yaml
```

## Security Considerations

- JWT tokens are stored in HTTP-only cookies
- Passwords are hashed using bcrypt
- Email verification is required before login
- Password reset tokens expire after 1 hour
- Verification codes expire after 24 hours
- Rate limiting is implemented on authentication endpoints

## Environment Variables

The following environment variables are required:

```env
JWT_SECRET=your-jwt-secret
MONGODB_URI=mongodb://localhost:27017/auth-service
CLIENT_URL=http://localhost:3000
MAILTRAP_USER=your-mailtrap-user
MAILTRAP_PASS=your-mailtrap-password
```

## Support

For questions or issues with the Auth Service API:

- Check the [main README](../../README.md)
- Review the [troubleshooting guide](../../TROUBLESHOOTING.md)
- Contact the development team 