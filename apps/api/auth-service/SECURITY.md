# Security Features Documentation

This document outlines the comprehensive security features implemented in the auth-service to protect against common vulnerabilities and attacks.

## 🔒 Security Headers

The service implements helmet-like security headers to protect against various attacks:

### Content Security Policy (CSP)
- **Header**: `Content-Security-Policy`
- **Value**: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`
- **Purpose**: Prevents XSS attacks by controlling which resources can be loaded

### XSS Protection
- **Header**: `X-XSS-Protection`
- **Value**: `1; mode=block`
- **Purpose**: Enables browser's built-in XSS protection

### Content Type Options
- **Header**: `X-Content-Type-Options`
- **Value**: `nosniff`
- **Purpose**: Prevents MIME type sniffing attacks

### Frame Options
- **Header**: `X-Frame-Options`
- **Value**: `DENY`
- **Purpose**: Prevents clickjacking attacks

### Transport Security
- **Header**: `Strict-Transport-Security`
- **Value**: `max-age=31536000; includeSubDomains`
- **Purpose**: Enforces HTTPS connections

### Referrer Policy
- **Header**: `Referrer-Policy`
- **Value**: `strict-origin-when-cross-origin`
- **Purpose**: Controls referrer information in requests

### Permissions Policy
- **Header**: `Permissions-Policy`
- **Value**: `geolocation=(), microphone=(), camera=()`
- **Purpose**: Restricts browser feature access

### Cache Control
- **Headers**: `Cache-Control`, `Pragma`, `Expires`
- **Purpose**: Prevents caching of sensitive authentication data

## 🚦 Rate Limiting

Multi-tier rate limiting system to prevent abuse:

### Rate Limit Tiers
- **Signup**: 5 requests per 5 minutes
- **Login**: 10 requests per 5 minutes
- **Password Reset**: 3 requests per 10 minutes
- **Token Verification**: 100 requests per minute
- **General**: 1000 requests per minute

### Implementation
- In-memory rate limiting (production should use Redis/DynamoDB)
- Automatic window reset after expiration
- Rate limit headers in responses
- Security event logging for rate limit violations

## 🌐 CORS Configuration

Configurable Cross-Origin Resource Sharing:

### Features
- Environment-based origin configuration
- Support for wildcard domains (`*.example.com`)
- Allowed headers: Content-Type, Authorization, AWS headers
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Credentials disabled for security

### Configuration
```bash
CORS_ORIGINS=https://example.com,https://api.example.com
```

## 🛡️ Input Validation & Sanitization

### Input Sanitization
- HTML tag removal (`<script>`, `<iframe>`, etc.)
- JavaScript protocol removal (`javascript:`)
- Event handler removal (`onclick`, `onload`, etc.)
- Whitespace trimming

### Password Strength Validation
- Minimum 8 characters, maximum 128 characters
- Requires uppercase and lowercase letters
- Requires numbers and special characters
- Blocks common weak patterns (password, 123456, etc.)

### Request Validation
- Content-Type header validation
- Request size limits (1MB maximum)
- JWT token format validation
- Suspicious header detection and logging

## 🔍 Security Monitoring

### Audit Logging
All security events are logged with:
- Timestamp
- Event type
- Client IP address
- User agent
- Event-specific details

### Logged Events
- `user_signup_success` - Successful user registration
- `login_success` - Successful login
- `login_failed_invalid_user` - Login attempt with non-existent user
- `login_failed_invalid_password` - Login attempt with wrong password
- `login_failed_locked_account` - Login attempt on locked account
- `account_locked` - Account locked due to too many failed attempts
- `rate_limit_exceeded` - Rate limit violation
- `duplicate_signup_attempt` - Attempt to register existing email
- `suspicious_header` - Detection of suspicious request headers

## 🔐 Account Security

### Account Lockout
- Maximum 5 failed login attempts
- 15-minute lockout duration
- Automatic unlock after lockout period
- Failed attempt counter reset on successful login

### Password Security
- bcrypt hashing with 12 salt rounds
- Secure password strength requirements
- Password reset functionality with time-limited tokens

### Session Management
- Secure JWT token generation
- Token validation with format checking
- Session ID generation with cryptographic randomness

## 🌍 IP Address Handling

### Multi-Header IP Detection
The service checks multiple headers in order of preference:
1. `x-forwarded-for`
2. `x-real-ip`
3. `x-client-ip`
4. `cf-connecting-ip` (Cloudflare)
5. `x-forwarded`
6. `forwarded-for`
7. `forwarded`
8. Request context source IP

### IP Validation
- IPv4 and IPv6 address validation
- Proper handling of comma-separated IP lists
- Fallback to 'unknown' for invalid IPs

## 🔧 Environment Configuration

### Security Environment Variables
```bash
# Rate Limiting
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000

# CORS
CORS_ORIGINS=https://example.com,https://api.example.com

# Environment
NODE_ENV=production
```

## 🧪 Security Testing

Comprehensive test suite covering:
- Rate limiting functionality
- CORS validation
- Input sanitization
- Password strength validation
- Security header generation
- IP address extraction
- Request size validation
- JWT token validation

## 🚨 Security Best Practices

### Implemented Features
1. **Defense in Depth**: Multiple layers of security
2. **Principle of Least Privilege**: Minimal required permissions
3. **Fail Securely**: Graceful handling of security failures
4. **Security by Default**: Secure configurations by default
5. **Audit Trail**: Comprehensive logging of security events

### Production Recommendations
1. **Use Redis/DynamoDB for rate limiting**: Replace in-memory storage
2. **Implement WAF**: Add AWS WAF for additional protection
3. **Enable CloudWatch Logs**: Centralized logging and monitoring
4. **Use AWS Secrets Manager**: Store sensitive configuration
5. **Implement API Gateway throttling**: Additional rate limiting layer
6. **Enable AWS Shield**: DDoS protection
7. **Use AWS Certificate Manager**: SSL/TLS certificates
8. **Implement AWS Config**: Compliance monitoring

## 📊 Security Metrics

Monitor these key security metrics:
- Failed login attempts per IP
- Rate limit violations
- Account lockouts
- Suspicious header detection
- Security event frequency
- Response time anomalies

## 🔄 Security Updates

Regular security maintenance:
1. **Dependency Updates**: Keep packages updated
2. **Security Headers**: Review and update as needed
3. **Rate Limits**: Adjust based on usage patterns
4. **CORS Configuration**: Update allowed origins
5. **Password Policies**: Review strength requirements
6. **Audit Logs**: Monitor for new attack patterns

## 📞 Security Contact

For security issues or questions:
- Review this documentation
- Check CloudWatch logs for security events
- Monitor rate limiting and account lockouts
- Review audit logs for suspicious activity 