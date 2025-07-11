# Helmet Security Implementation

This document outlines the Helmet security implementation for the auth-service, providing comprehensive security headers and middleware for AWS Lambda environments.

## 🔒 Overview

The Helmet implementation provides enterprise-grade security headers and middleware specifically designed for AWS Lambda environments. It includes:

- **Comprehensive Security Headers**: 15+ security headers to protect against common attacks
- **Environment-Specific Configuration**: Different security levels for development, staging, and production
- **Lambda-Optimized Middleware**: Lightweight middleware designed for serverless environments
- **Security Validation**: Tools to validate and audit security headers
- **Dynamic Configuration**: Runtime security header generation based on environment

## 🛡️ Security Headers

### Essential Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Comprehensive CSP | Prevents XSS, injection attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Browser XSS protection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Permissions-Policy` | Comprehensive restrictions | Restricts browser features |

### Advanced Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Cross-Origin-Embedder-Policy` | `require-corp` | Cross-origin isolation |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | Cross-origin isolation |
| `Expect-CT` | `enforce, max-age=30` | Certificate transparency |
| `X-DNS-Prefetch-Control` | `off` | Prevents DNS prefetching |

### Cache Control Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Cache-Control` | `no-store, no-cache, must-revalidate, proxy-revalidate` | Prevents caching |
| `Pragma` | `no-cache` | Legacy cache control |
| `Expires` | `0` | Immediate expiration |

### Information Hiding Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Powered-By` | `` (empty) | Hides server technology |
| `X-Download-Options` | `noopen` | Prevents IE downloads |
| `X-Permitted-Cross-Domain-Policies` | `none` | Restricts cross-domain policies |

## 🏗️ Architecture

### Core Components

1. **Helmet Utilities** (`src/utils/helmet.ts`)
   - Header generation functions
   - Middleware implementation
   - Security validation tools

2. **Helmet Configuration** (`src/config/helmet.config.ts`)
   - Environment-specific configurations
   - Security policies for different endpoints
   - Validation rules and recommendations

3. **Security Integration** (`src/utils/security.ts`)
   - Integration with existing security utilities
   - Combined security header application

### Middleware Pattern

```typescript
// Apply Helmet headers to Lambda response
const securedResponse = applyHelmetHeaders(response);

// Wrap handler with Helmet middleware
const securedHandler = withHelmet(originalHandler);
```

## 🔧 Configuration

### Environment-Specific Settings

#### Development Environment
```typescript
{
  enableHSTS: false,        // Disable HSTS for local development
  enableCSP: false,         // Relax CSP for debugging
  enableXSSProtection: true,
  enableFrameGuard: true,
  enableNoSniff: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
}
```

#### Staging Environment
```typescript
{
  enableHSTS: true,         // Enable HSTS without preload
  enableCSP: true,          // Moderate CSP policies
  enableXSSProtection: true,
  enableFrameGuard: true,
  enableNoSniff: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
}
```

#### Production Environment
```typescript
{
  enableHSTS: true,         // Full HSTS with preload
  enableCSP: true,          // Strict CSP policies
  enableXSSProtection: true,
  enableFrameGuard: true,
  enableNoSniff: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
}
```

### Endpoint-Specific Security Policies

#### Public Endpoints (signup, login)
- Moderate CSP policies
- Essential security headers
- CORS support

#### Protected Endpoints (require authentication)
- Strict CSP policies
- All security headers
- Enhanced protection

#### Admin Endpoints (highest security)
- Maximum CSP restrictions
- All security headers
- Additional validation

## 🚀 Usage

### Basic Usage

```typescript
import { applyHelmetHeaders } from '../utils/helmet';

// Apply security headers to response
const response: LambdaResponse = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'success' }),
};

const securedResponse = applyHelmetHeaders(response);
```

### Middleware Usage

```typescript
import { withHelmet } from '../utils/helmet';

// Wrap handler with security middleware
const originalHandler = async (event: any, context: any) => {
  // Your handler logic
  return { statusCode: 200, body: 'success' };
};

const securedHandler = withHelmet(originalHandler);
```

### Dynamic Headers

```typescript
import { getDynamicSecurityHeaders } from '../utils/helmet';

// Get headers based on environment
const headers = getDynamicSecurityHeaders('production');
```

### Security Validation

```typescript
import { validateSecurityHeaders } from '../utils/helmet';

// Validate security headers
const validation = validateSecurityHeaders(headers);

if (!validation.isValid) {
  console.log('Missing headers:', validation.missingHeaders);
  console.log('Recommendations:', validation.recommendations);
}
```

## 🧪 Testing

### Test Coverage

The Helmet implementation includes comprehensive tests covering:

- **Header Generation**: All security headers are properly generated
- **Middleware Functionality**: Middleware correctly applies headers
- **Environment Configuration**: Different environments get appropriate headers
- **Security Validation**: Header validation works correctly
- **Error Handling**: Middleware handles errors gracefully

### Running Tests

```bash
# Run all tests
npm test

# Run Helmet-specific tests
npm test -- src/utils/__tests__/helmet.test.ts

# Run tests with coverage
npm run test:coverage
```

## 🔍 Security Validation

### Header Validation

The implementation includes tools to validate security headers:

```typescript
const validation = validateSecurityHeaders(headers);

// Check if all required headers are present
if (validation.isValid) {
  console.log('All security headers are properly configured');
} else {
  console.log('Missing headers:', validation.missingHeaders);
  console.log('Recommendations:', validation.recommendations);
}
```

### Environment Validation

```typescript
import { getRequiredHeaders, getSecurityRecommendations } from '../config/helmet.config';

// Get required headers for current environment
const requiredHeaders = getRequiredHeaders('production');

// Get security recommendations
const recommendations = getSecurityRecommendations('production');
```

## 📊 Monitoring

### Security Metrics

Monitor these key security metrics:

- **Header Presence**: Ensure all required headers are present
- **Header Values**: Validate header values are correct
- **Environment Compliance**: Verify environment-specific configurations
- **Security Events**: Monitor for security-related events

### Logging

```typescript
import { logSecurityEvent } from '../utils/security';

// Log security header application
logSecurityEvent('helmet_headers_applied', {
  environment: process.env.NODE_ENV,
  headersApplied: Object.keys(securityHeaders).length,
}, clientIP);
```

## 🔄 Best Practices

### 1. Environment Configuration
- Use appropriate security levels for each environment
- Disable HSTS in development to avoid HTTPS requirements
- Relax CSP in development for debugging

### 2. Header Management
- Always apply security headers to all responses
- Validate headers in production environments
- Monitor for missing or incorrect headers

### 3. Performance Considerations
- Helmet middleware is lightweight for Lambda
- Headers are generated once and reused
- No significant performance impact

### 4. Security Maintenance
- Regularly review and update security policies
- Monitor for new security threats
- Update CSP policies as needed

## 🚨 Troubleshooting

### Common Issues

1. **Missing Headers**
   - Check environment configuration
   - Verify middleware is applied
   - Validate header generation

2. **CSP Violations**
   - Review CSP policies for your application
   - Adjust policies for development
   - Monitor CSP violation reports

3. **HSTS Issues**
   - Ensure HTTPS is properly configured
   - Disable HSTS in development
   - Use appropriate HSTS settings for environment

### Debug Mode

```typescript
// Enable debug logging
const debugHeaders = getDynamicSecurityHeaders('development');
console.log('Debug headers:', debugHeaders);
```

## 📚 References

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## 🔗 Integration

The Helmet implementation integrates with:

- **Existing Security Utilities**: Works with current security features
- **Rate Limiting**: Complements rate limiting security
- **CORS Configuration**: Works alongside CORS settings
- **Audit Logging**: Logs security header applications
- **Environment Configuration**: Respects environment settings

This comprehensive Helmet implementation provides enterprise-grade security for the auth-service while maintaining flexibility for different environments and use cases. 