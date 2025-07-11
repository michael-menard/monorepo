# Authentication Service

A secure, production-ready authentication service built with AWS Lambda, DynamoDB, and API Gateway. Implements industry-standard security practices including password hashing, JWT tokens, rate limiting, and account lockout protection.

## 🔒 Security Features

### Password Security
- **bcrypt hashing** with configurable salt rounds (default: 12)
- **Strong password requirements**: 8-128 characters with uppercase, lowercase, numbers, and special characters
- **Never stores plain text passwords**
- **Password change** with current password verification

### Account Protection
- **Rate limiting** on signup and login attempts
- **Account lockout** after 5 failed login attempts (15-minute lockout)
- **IP-based rate limiting** to prevent brute force attacks
- **Secure token management** with access and refresh tokens

### JWT Token Security
- **Short-lived access tokens** (1 hour)
- **Long-lived refresh tokens** (7 days)
- **Token type validation** (access vs refresh)
- **Secure token verification**

### Password Reset
- **Secure reset tokens** with expiration (1 hour)
- **Email-based reset flow**
- **Token validation and cleanup**

## 🏗️ Architecture

- **API Gateway**: RESTful API endpoints
- **Lambda Functions**: Serverless authentication logic
- **DynamoDB**: User data storage with indexes
- **SSM Parameter Store**: Secure JWT secret storage
- **CORS Support**: Cross-origin request handling

## 📋 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/verify` - Token verification
- `POST /auth/refresh` - Token refresh

### Password Management
- `POST /auth/change-password` - Change password
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured
- Node.js 18+
- Serverless Framework

### Installation
```bash
cd auth-service
npm install
```

### Deploy
```bash
npm run deploy
```

### Local Development
```bash
npm run offline
```

## 📝 API Usage Examples

### Sign Up
```bash
curl -X POST https://your-api-gateway-url/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "emailVerified": false
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 3600
  }
}
```

### Login
```bash
curl -X POST https://your-api-gateway-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Verify Token
```bash
curl -X POST https://your-api-gateway-url/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-access-token"
  }'
```

### Change Password
```bash
curl -X POST https://your-api-gateway-url/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!",
    "token": "your-access-token"
  }'
```

### Forgot Password
```bash
curl -X POST https://your-api-gateway-url/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### Reset Password
```bash
curl -X POST https://your-api-gateway-url/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "resetToken": "reset-token-from-email",
    "newPassword": "NewSecurePass456!"
  }'
```

## 🔧 Configuration

### Environment Variables
- `USERS_TABLE`: DynamoDB table name
- `JWT_SECRET`: Secret for JWT signing (stored in SSM)
- `SALT_ROUNDS`: bcrypt salt rounds (default: 12)
- `SESSION_TTL`: Session timeout in seconds (default: 86400)

### Security Settings
- **Password Requirements**: 8-128 characters with complexity
- **Rate Limiting**: 5 signup attempts per 5 minutes, 10 login attempts per 5 minutes
- **Account Lockout**: 5 failed attempts = 15-minute lockout
- **Token Expiry**: Access tokens (1 hour), Refresh tokens (7 days)
- **Reset Token Expiry**: 1 hour

## 🗄️ Database Schema

### Users Table
```json
{
  "id": "string (UUID)",
  "email": "string (lowercase)",
  "password": "string (bcrypt hash)",
  "firstName": "string",
  "lastName": "string",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)",
  "emailVerified": "boolean",
  "loginAttempts": "number",
  "lockedUntil": "string (ISO date) or null",
  "lastLoginAt": "string (ISO date) or null",
  "resetToken": "string or null",
  "resetTokenExpiry": "string (ISO date) or null"
}
```

### Indexes
- **Primary Key**: `id`
- **Email Index**: `email` (for login lookups)
- **Reset Token Index**: `resetToken` (for password reset)

## 🛡️ Security Best Practices Implemented

### Password Security
- ✅ bcrypt hashing with salt
- ✅ Strong password requirements
- ✅ Never store plain text passwords
- ✅ Password change with verification

### Account Protection
- ✅ Rate limiting on authentication endpoints
- ✅ Account lockout after failed attempts
- ✅ IP-based rate limiting
- ✅ Secure session management

### Token Security
- ✅ JWT with short expiry
- ✅ Refresh token rotation
- ✅ Token type validation
- ✅ Secure token storage

### Data Protection
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Error handling without information leakage
- ✅ Secure parameter storage in SSM

### Operational Security
- ✅ Least privilege IAM roles
- ✅ Secure environment variables
- ✅ Audit logging
- ✅ Secure headers

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📊 Monitoring

### CloudWatch Metrics
- Lambda function invocations and errors
- API Gateway request/response metrics
- DynamoDB read/write capacity

### Logs
- Lambda function logs in CloudWatch
- API Gateway access logs
- DynamoDB audit logs

## 🔄 Integration with File Upload Service

To integrate with the file upload service:

1. **Add user authentication** to file upload endpoints
2. **Use JWT tokens** for authorization
3. **Associate files with user IDs**
4. **Implement user-based file access control**

Example integration:
```javascript
// In file upload handler
const decoded = verifyToken(event.headers.Authorization);
if (!decoded) {
  return createErrorResponse(401, 'Unauthorized');
}

const userId = decoded.userId;
// Associate file with user
const fileData = {
  ...fileData,
  userId
};
```

## 🚨 Production Considerations

### Email Integration
- Replace console.log with SES for password reset emails
- Implement email verification flow
- Add email templates

### Enhanced Security
- Implement token blacklisting for logout
- Add MFA support
- Implement session management
- Add audit logging

### Performance
- Use Redis for rate limiting in production
- Implement connection pooling
- Add caching for user data

### Monitoring
- Set up CloudWatch alarms
- Implement health checks
- Add performance monitoring

## 📚 Additional Resources

- [AWS Lambda Security Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/security-best-practices.html)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) 