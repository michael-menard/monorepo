# Auth Service HTTP Documentation

This directory contains `.http` files for testing and documenting the Auth Service API endpoints. These files can be used with VS Code's REST Client extension or similar tools.

## Files Overview

### Main Documentation
- `auth-service.http` - Comprehensive API documentation with all endpoints and test scenarios

### Environment-Specific Files
- `dev.http` - Development environment tests and configurations
- `staging.http` - Staging environment tests and configurations  
- `prod.http` - Production environment tests and configurations

## Prerequisites

### VS Code REST Client Extension
Install the REST Client extension in VS Code:
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "REST Client"
4. Install the extension by Huachao Mao

### Alternative Tools
- **Postman** - Import the requests manually
- **Insomnia** - Import the requests manually
- **curl** - Use the curl commands provided in comments

## Usage

### Using VS Code REST Client

1. **Open a .http file** in VS Code
2. **Update the base URL** to match your deployed API
3. **Click "Send Request"** above any request to execute it
4. **View the response** in the split pane

### Environment Variables

Each file contains environment variables at the top:

```http
@baseUrl = https://your-api-id.execute-api.region.amazonaws.com/dev/auth
@contentType = application/json
@testEmail = test@example.com
@testPassword = SecurePassword123!
```

### Updating URLs

Replace the placeholder URLs with your actual API Gateway URLs:

```http
# Development
@baseUrl = https://abc123.execute-api.us-east-1.amazonaws.com/dev/auth

# Staging  
@baseUrl = https://def456.execute-api.us-east-1.amazonaws.com/staging/auth

# Production
@baseUrl = https://ghi789.execute-api.us-east-1.amazonaws.com/prod/auth
```

## API Endpoints

### 1. Health Check
```http
GET {{baseUrl}}/health
```
**Purpose**: Verify the service is running
**Response**: Service status and environment information

### 2. User Registration (Signup)
```http
POST {{baseUrl}}/signup
Content-Type: {{contentType}}

{
  "email": "{{testEmail}}",
  "password": "{{testPassword}}",
  "name": "{{testName}}"
}
```
**Purpose**: Register a new user account
**Response**: User details and confirmation

### 3. User Authentication (Login)
```http
POST {{baseUrl}}/login
Content-Type: {{contentType}}

{
  "email": "{{testEmail}}",
  "password": "{{testPassword}}"
}
```
**Purpose**: Authenticate user and get access tokens
**Response**: User details and JWT tokens

### 4. Token Refresh
```http
POST {{baseUrl}}/refresh
Content-Type: {{contentType}}
Authorization: Bearer {{refreshToken}}
```
**Purpose**: Refresh expired access tokens
**Response**: New access token

### 5. User Logout
```http
POST {{baseUrl}}/logout
Content-Type: {{contentType}}
Authorization: Bearer {{accessToken}}
```
**Purpose**: Logout user and invalidate tokens
**Response**: Confirmation message

### 6. Password Reset Request
```http
POST {{baseUrl}}/reset-password
Content-Type: {{contentType}}

{
  "email": "{{testEmail}}"
}
```
**Purpose**: Request password reset email
**Response**: Confirmation message

### 7. Password Reset Confirmation
```http
POST {{baseUrl}}/confirm-reset
Content-Type: {{contentType}}

{
  "token": "{{resetToken}}",
  "newPassword": "NewSecurePassword123!"
}
```
**Purpose**: Confirm password reset with token
**Response**: Confirmation message

## Test Scenarios

### Basic Functionality Tests
- ✅ Health check
- ✅ User registration
- ✅ User login
- ✅ Token refresh
- ✅ User logout
- ✅ Password reset flow

### Validation Tests
- ✅ Invalid email format
- ✅ Weak password
- ✅ Missing required fields
- ✅ Malformed JSON
- ✅ Wrong content type

### Security Tests
- ✅ Rate limiting
- ✅ CORS headers
- ✅ Security headers
- ✅ Invalid tokens
- ✅ Unauthorized access

### Performance Tests
- ✅ Response time measurement
- ✅ Load testing preparation
- ✅ Multiple concurrent requests

### Edge Cases
- ✅ Very long inputs
- ✅ Special characters
- ✅ Empty requests
- ✅ Boundary conditions

## Environment-Specific Testing

### Development Environment (`dev.http`)
- **Base URL**: Development API Gateway
- **Features**: Debug headers, detailed error messages
- **Testing**: Local development scenarios
- **Security**: Relaxed for development

### Staging Environment (`staging.http`)
- **Base URL**: Staging API Gateway
- **Features**: Pre-production testing
- **Testing**: Integration scenarios
- **Security**: Production-like settings

### Production Environment (`prod.http`)
- **Base URL**: Production API Gateway
- **Features**: Production configurations
- **Testing**: Final validation
- **Security**: Full security measures

## Response Examples

### Successful Signup Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "test@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Successful Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "test@example.com",
      "name": "John Doe"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 3600
    }
  }
}
```

### Error Response Example
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Testing Workflows

### Complete User Lifecycle
1. **Register** a new user
2. **Login** with credentials
3. **Refresh** access token
4. **Logout** user

### Password Reset Flow
1. **Request** password reset
2. **Confirm** reset with token
3. **Login** with new password

### Error Handling
1. **Test** invalid inputs
2. **Verify** error messages
3. **Check** response codes

### Security Validation
1. **Test** rate limiting
2. **Verify** CORS headers
3. **Check** security headers

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if the API is deployed
   - Verify the base URL is correct
   - Ensure network connectivity

2. **Authentication Errors**
   - Verify JWT tokens are valid
   - Check token expiration
   - Ensure proper Authorization header

3. **Validation Errors**
   - Check request body format
   - Verify required fields
   - Ensure proper content type

4. **Rate Limiting**
   - Wait before retrying
   - Check rate limit headers
   - Use different test data

### Debug Tips

1. **Check Response Headers**
   - Look for CORS headers
   - Verify security headers
   - Check rate limit information

2. **Review Response Body**
   - Check error messages
   - Verify data format
   - Look for debugging info

3. **Use Environment Variables**
   - Update base URLs
   - Set test data
   - Configure headers

## Best Practices

### Testing Strategy
1. **Start with health check** to verify connectivity
2. **Test basic functionality** before edge cases
3. **Use environment-specific** files for different stages
4. **Document responses** for team reference

### Security Considerations
1. **Never commit** real tokens or passwords
2. **Use test data** for all requests
3. **Verify security headers** in responses
4. **Test rate limiting** behavior

### Performance Testing
1. **Measure response times** for key endpoints
2. **Test concurrent requests** for load handling
3. **Monitor error rates** under load
4. **Verify timeout handling**

## Integration with CI/CD

### Automated Testing
These HTTP files can be used with:
- **Newman** (Postman CLI)
- **REST Client** VS Code extension
- **Custom scripts** for automated testing

### Example Newman Usage
```bash
# Install Newman
npm install -g newman

# Run tests
newman run auth-service.http
```

### Example Script Usage
```bash
# Convert to curl commands
grep -A 10 "POST\|GET" auth-service.http | head -20
```

## Contributing

### Adding New Tests
1. **Create new request** in appropriate file
2. **Add comments** explaining the test
3. **Include expected response** in comments
4. **Update this README** if needed

### Updating Documentation
1. **Keep examples current** with API changes
2. **Add new endpoints** as they're developed
3. **Update response examples** for accuracy
4. **Maintain environment-specific** configurations

## References

- [VS Code REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [HTTP Request Documentation](https://github.com/Huachao/vscode-restclient)
- [API Testing Best Practices](https://docs.postman.com/)
- [JWT Token Testing](https://jwt.io/) 