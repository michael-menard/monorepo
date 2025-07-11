# 🔒 Security Configuration

This backend template includes comprehensive security measures to protect your application from common attacks.

## 🛡️ Security Middleware

### 1. Helmet
- Sets HTTP headers to protect from common attacks
- Configures Content Security Policy (CSP)
- Prevents clickjacking, XSS, and other attacks

### 2. CORS (Cross-Origin Resource Sharing)
- Controls cross-origin requests
- Configurable allowed origins
- Supports credentials for authenticated requests

### 3. Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- Prevents brute force and DDoS attacks

### 4. XSS Protection
- `xss-clean` sanitizes user input
- Prevents Cross-Site Scripting attacks
- Removes potentially malicious scripts

### 5. HTTP Parameter Pollution Protection
- `hpp` prevents parameter pollution attacks
- Ensures clean request parameters

### 6. Compression
- Gzip compression for better performance
- Reduces bandwidth usage

### 7. Body Parser
- Parses incoming request bodies
- Configurable size limits (10MB default)
- Supports JSON and URL-encoded data

### 8. Cookie Parser
- Parses cookies for session handling
- Essential for authentication systems

## 🔐 Authentication & Authorization

### JWT Token Management
- **Access tokens**: 24-hour expiration
- **Refresh tokens**: 7-day expiration
- Secure token generation and verification
- Role-based access control

### Password Security
- **bcryptjs** for password hashing
- 12 salt rounds for strong security
- Password strength validation
- Secure password comparison

### Input Validation
- **Zod** schema validation
- Email format validation
- Password strength requirements
- Input sanitization

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
BCRYPT_ROUNDS=12

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

## 🚀 Usage Examples

### Protected Route
```typescript
import { authenticateToken } from './middleware/auth'

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected data', user: req.user })
})
```

### Role-Based Access
```typescript
import { requireRole } from './middleware/auth'

app.get('/api/admin', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin only data' })
})
```

### User Registration with Validation
```typescript
import { userRegistrationSchema, hashPassword } from './utils/security'

app.post('/api/register', async (req, res) => {
  try {
    const validatedData = userRegistrationSchema.parse(req.body)
    const hashedPassword = await hashPassword(validatedData.password)
    // Save user to database
    res.status(201).json({ message: 'User created successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Validation failed', errors: error.errors })
  }
})
```

## 🔧 Customization

### Rate Limiting
Adjust limits in `src/index.ts`:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
})
```

### CORS Configuration
Modify allowed origins in `src/index.ts`:
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}))
```

### Helmet Configuration
Customize security headers in `src/index.ts`:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}))
```

## 🧪 Testing Security

### Test Rate Limiting
```bash
# Test general rate limiting
for i in {1..101}; do curl http://localhost:3000/api/test; done

# Test auth rate limiting
for i in {1..6}; do curl -X POST http://localhost:3000/api/auth/login; done
```

### Test CORS
```bash
# Test from allowed origin
curl -H "Origin: http://localhost:3000" http://localhost:3000/api/test

# Test from disallowed origin
curl -H "Origin: http://malicious.com" http://localhost:3000/api/test
```

## ⚠️ Security Best Practices

1. **Change default secrets** in production
2. **Use HTTPS** in production
3. **Regular security updates** for dependencies
4. **Monitor logs** for suspicious activity
5. **Implement proper error handling** without exposing sensitive data
6. **Use environment variables** for all secrets
7. **Regular security audits** of your codebase

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practices-security.html)
- [JWT Security](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Helmet Documentation](https://helmetjs.github.io/) 