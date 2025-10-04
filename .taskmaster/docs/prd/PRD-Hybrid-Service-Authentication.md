# 🔐 Hybrid Service-to-Service Authentication System - PRD

**Product Requirements Document**  
**Version:** 1.0  
**Date:** January 2025  
**Author:** System Architecture Team  

---

## **🎯 Executive Summary**

### **Problem Statement**
As our microservices architecture expands to include image service, LEGO bricks price scraper, realtime notifications service, and other backend services, we need a secure, performant authentication system for service-to-service communication that doesn't rely on user context.

### **Solution Overview**
Implement a hybrid authentication approach:
- **JWT tokens** for user-context operations (existing system)
- **HMAC-SHA256 signatures** for service-to-service operations (new system)

### **Success Metrics**
- ✅ Zero security vulnerabilities in service-to-service communication
- ✅ <50ms authentication overhead for service calls
- ✅ 100% audit trail for all inter-service requests
- ✅ Easy onboarding for new services (<30 minutes setup)

---

## **🏗️ Technical Architecture**

### **Current State**
```typescript
// User-context authentication (keep as-is)
const userToken = jwt.sign({ sub: userId, userId }, JWT_SECRET, {
  expiresIn: '7d',
  issuer: 'auth-service'
});
```

### **Target State**
```typescript
// Service-to-service authentication (new)
const serviceSignature = crypto
  .createHmac('sha256', SERVICE_SECRET)
  .update(`${method}\n${path}\n${timestamp}\n${body}`)
  .digest('hex');
```

### **Service Authentication Matrix**

| Operation Type | Authentication Method | Use Case |
|---|---|---|
| User uploads image | JWT (user context) | User-initiated, needs user identity |
| Background image processing | HMAC (service context) | System-initiated, no user context |
| Price scraper updates | HMAC (service context) | Scheduled job, system operation |
| Real-time notifications | JWT + HMAC hybrid | User notifications via service calls |
| Health checks | HMAC (service context) | Internal monitoring |

---

## **🔧 Implementation Specification**

### **1. HMAC Signature Generation**

#### **Latest Security Standards (2025)**
- **Algorithm**: HMAC-SHA256 (FIPS 140-2 approved)
- **Key Length**: 256-bit minimum (32 bytes)
- **Timestamp**: Unix timestamp in seconds
- **Replay Protection**: 300-second window (5 minutes)
- **Encoding**: Hexadecimal lowercase

#### **Signature Components**
```typescript
const stringToSign = [
  httpMethod.toUpperCase(),        // GET, POST, PUT, DELETE
  requestPath,                     // /api/images/process
  timestamp.toString(),            // Unix timestamp
  requestBody || '',               // JSON string or empty
  serviceId                        // Calling service identifier
].join('\n');

const signature = crypto
  .createHmac('sha256', serviceSecret)
  .update(stringToSign, 'utf8')
  .digest('hex');
```

#### **Required Headers**
```typescript
{
  'X-Service-ID': 'image-service',           // Calling service
  'X-Timestamp': '1704067200',               // Unix timestamp
  'X-Signature': 'a1b2c3d4e5f6...',         // HMAC signature
  'X-Request-ID': 'uuid-v4',                 // Request correlation
  'Content-Type': 'application/json'
}
```

### **2. Service Registry & Secrets Management**

#### **Service Configuration**
```typescript
// Environment variables per service
interface ServiceConfig {
  SERVICE_ID: string;              // 'auth-service', 'image-service', etc.
  SERVICE_SECRET: string;          // 256-bit hex string
  ALLOWED_SERVICES: string;        // Comma-separated service IDs
  HMAC_WINDOW_SECONDS: number;     // Default: 300 (5 minutes)
}
```

#### **Service Registry**
```typescript
// Centralized service registry
const SERVICE_REGISTRY = {
  'auth-service': {
    id: 'auth-service',
    secret: process.env.AUTH_SERVICE_SECRET,
    allowedTargets: ['lego-projects-api', 'image-service', 'notifications-service']
  },
  'image-service': {
    id: 'image-service', 
    secret: process.env.IMAGE_SERVICE_SECRET,
    allowedTargets: ['lego-projects-api', 'notifications-service']
  },
  'price-scraper': {
    id: 'price-scraper',
    secret: process.env.PRICE_SCRAPER_SECRET,
    allowedTargets: ['lego-projects-api']
  },
  'notifications-service': {
    id: 'notifications-service',
    secret: process.env.NOTIFICATIONS_SERVICE_SECRET,
    allowedTargets: ['auth-service', 'lego-projects-api']
  }
};
```

### **3. Middleware Implementation**

#### **HMAC Verification Middleware**
```typescript
// packages/shared/src/middleware/hmacAuth.ts
import crypto from 'crypto';

export interface HMACAuthOptions {
  windowSeconds?: number;          // Default: 300
  requiredHeaders?: string[];      // Additional required headers
  skipPaths?: string[];           // Paths to skip HMAC auth
}

export function createHMACAuthMiddleware(options: HMACAuthOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Implementation details in next section
  };
}
```

#### **Service Client Implementation**
```typescript
// packages/shared/src/clients/ServiceClient.ts
export class ServiceClient {
  constructor(
    private serviceId: string,
    private serviceSecret: string,
    private baseUrl: string
  ) {}

  async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    // Implementation details in next section
  }

  private generateSignature(
    method: string,
    path: string,
    timestamp: number,
    body: string
  ): string {
    // Implementation details in next section
  }
}
```

---

## **📋 Implementation Tasks**

### **Phase 1: Core Infrastructure (Week 1-2)**

#### **Task 1.1: Create Shared Authentication Package**
- **File**: `packages/shared/src/auth/hmac.ts`
- **Deliverables**:
  - HMAC signature generation utilities
  - Signature verification utilities
  - Timestamp validation
  - Service registry types

#### **Task 1.2: Environment Configuration**
- **Files**: Update all service `.env.example` files
- **Deliverables**:
  - Service ID configuration
  - Service secret generation script
  - Environment validation

#### **Task 1.3: HMAC Middleware**
- **File**: `packages/shared/src/middleware/hmacAuth.ts`
- **Deliverables**:
  - Express middleware for HMAC verification
  - Request logging and audit trail
  - Error handling and security events

### **Phase 2: Service Client Library (Week 2-3)**

#### **Task 2.1: Service Client Implementation**
- **File**: `packages/shared/src/clients/ServiceClient.ts`
- **Deliverables**:
  - HTTP client with automatic HMAC signing
  - Request/response interceptors
  - Retry logic and error handling

#### **Task 2.2: Service Discovery**
- **File**: `packages/shared/src/registry/ServiceRegistry.ts`
- **Deliverables**:
  - Service registry configuration
  - Service health checking
  - Dynamic service discovery

### **Phase 3: Integration (Week 3-4)**

#### **Task 3.1: Update Existing Services**
- **Services**: `auth-service`, `lego-projects-api`
- **Deliverables**:
  - Add HMAC middleware to existing services
  - Update inter-service calls to use ServiceClient
  - Maintain backward compatibility

#### **Task 3.2: Testing & Validation**
- **Files**: Test suites for all components
- **Deliverables**:
  - Unit tests for HMAC utilities
  - Integration tests for service communication
  - Security penetration testing

### **Phase 4: New Service Templates (Week 4)**

#### **Task 4.1: Update API Generator**
- **File**: `generators/api-gen/templates/`
- **Deliverables**:
  - HMAC middleware template
  - Service client configuration template
  - Environment setup template

#### **Task 4.2: Documentation**
- **Files**: Service integration guides
- **Deliverables**:
  - Junior engineer onboarding guide
  - Security best practices
  - Troubleshooting guide

---

## **🔒 Security Considerations**

### **Secret Management**
- Use environment variables for service secrets
- Rotate secrets quarterly (automated process)
- Never log or expose secrets in code
- Use different secrets per environment

### **Attack Mitigation**
- **Replay Attacks**: 5-minute timestamp window
- **Man-in-the-Middle**: HTTPS only in production
- **Secret Exposure**: Separate secrets per service
- **Brute Force**: Rate limiting on authentication failures

### **Audit & Monitoring**
- Log all HMAC authentication attempts
- Monitor for unusual service communication patterns
- Alert on authentication failures
- Track service-to-service request volumes

---

## **📊 Success Criteria**

### **Functional Requirements**
- ✅ All service-to-service calls use HMAC authentication
- ✅ User-context operations continue using JWT
- ✅ New services can be onboarded in <30 minutes
- ✅ Zero breaking changes to existing user flows

### **Non-Functional Requirements**
- ✅ Authentication overhead <50ms per request
- ✅ 99.9% authentication success rate
- ✅ Complete audit trail for all requests
- ✅ Automated secret rotation capability

### **Security Requirements**
- ✅ Pass security audit for service authentication
- ✅ Zero unauthorized service access
- ✅ Comprehensive monitoring and alerting
- ✅ Incident response procedures documented

---

## **🚀 Rollout Plan**

### **Week 1-2: Foundation**
- Implement core HMAC utilities
- Create shared middleware package
- Set up service registry

### **Week 3: Integration**
- Update existing services
- Implement service client library
- Add comprehensive testing

### **Week 4: Validation**
- Security testing and audit
- Performance benchmarking
- Documentation completion

### **Week 5+: New Services**
- Use HMAC for all new service development
- Monitor and optimize performance
- Iterate based on feedback

---

## **💻 Implementation Examples**

### **HMAC Utilities Implementation**
```typescript
// packages/shared/src/auth/hmac.ts
import crypto from 'crypto';

export interface HMACSignatureData {
  method: string;
  path: string;
  timestamp: number;
  body: string;
  serviceId: string;
}

export interface HMACHeaders {
  'X-Service-ID': string;
  'X-Timestamp': string;
  'X-Signature': string;
  'X-Request-ID': string;
}

/**
 * Generate HMAC signature using latest security standards
 */
export function generateHMACSignature(
  data: HMACSignatureData,
  secret: string
): string {
  const stringToSign = [
    data.method.toUpperCase(),
    data.path,
    data.timestamp.toString(),
    data.body,
    data.serviceId
  ].join('\n');

  return crypto
    .createHmac('sha256', secret)
    .update(stringToSign, 'utf8')
    .digest('hex');
}

/**
 * Verify HMAC signature with replay protection
 */
export function verifyHMACSignature(
  signature: string,
  data: HMACSignatureData,
  secret: string,
  windowSeconds: number = 300
): { valid: boolean; error?: string } {
  // Check timestamp window (replay protection)
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(now - data.timestamp);

  if (timeDiff > windowSeconds) {
    return { valid: false, error: 'Request timestamp outside allowed window' };
  }

  // Generate expected signature
  const expectedSignature = generateHMACSignature(data, secret);

  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  return { valid, error: valid ? undefined : 'Invalid signature' };
}

/**
 * Generate secure service secret (for setup scripts)
 */
export function generateServiceSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

### **Service Client Implementation**
```typescript
// packages/shared/src/clients/ServiceClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { generateHMACSignature, HMACHeaders } from '../auth/hmac';

export interface ServiceClientConfig {
  serviceId: string;
  serviceSecret: string;
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

export class ServiceClient {
  private client: AxiosInstance;
  private config: ServiceClientConfig;

  constructor(config: ServiceClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `ServiceClient/${config.serviceId}`
      }
    });

    // Add request interceptor for HMAC signing
    this.client.interceptors.request.use(this.signRequest.bind(this));

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      this.handleError.bind(this)
    );
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(path, config);
    return response.data;
  }

  async post<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(path, data, config);
    return response.data;
  }

  async put<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(path, data, config);
    return response.data;
  }

  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(path, config);
    return response.data;
  }

  private signRequest(config: AxiosRequestConfig): AxiosRequestConfig {
    const method = (config.method || 'GET').toUpperCase();
    const path = config.url || '';
    const timestamp = Math.floor(Date.now() / 1000);
    const body = config.data ? JSON.stringify(config.data) : '';
    const requestId = uuidv4();

    const signature = generateHMACSignature(
      { method, path, timestamp, body, serviceId: this.config.serviceId },
      this.config.serviceSecret
    );

    const hmacHeaders: HMACHeaders = {
      'X-Service-ID': this.config.serviceId,
      'X-Timestamp': timestamp.toString(),
      'X-Signature': signature,
      'X-Request-ID': requestId
    };

    config.headers = { ...config.headers, ...hmacHeaders };
    return config;
  }

  private async handleError(error: any) {
    if (error.response?.status === 401) {
      console.error(`HMAC Authentication failed for ${this.config.serviceId}:`, {
        status: error.response.status,
        data: error.response.data,
        requestId: error.config?.headers?.['X-Request-ID']
      });
    }
    throw error;
  }
}
```

### **HMAC Middleware Implementation**
```typescript
// packages/shared/src/middleware/hmacAuth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyHMACSignature } from '../auth/hmac';

// Extend Express Request to include service info
declare global {
  namespace Express {
    interface Request {
      serviceId?: string;
      requestId?: string;
      isServiceRequest?: boolean;
    }
  }
}

export interface HMACAuthOptions {
  windowSeconds?: number;
  skipPaths?: string[];
  serviceRegistry: Record<string, { secret: string; allowedTargets: string[] }>;
  onAuthSuccess?: (req: Request, serviceId: string) => void;
  onAuthFailure?: (req: Request, error: string) => void;
}

export function createHMACAuthMiddleware(options: HMACAuthOptions) {
  const {
    windowSeconds = 300,
    skipPaths = [],
    serviceRegistry,
    onAuthSuccess,
    onAuthFailure
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip HMAC auth for specified paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Check for HMAC headers
    const serviceId = req.headers['x-service-id'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const signature = req.headers['x-signature'] as string;
    const requestId = req.headers['x-request-id'] as string;

    // If no HMAC headers, continue to next middleware (might be JWT auth)
    if (!serviceId || !timestamp || !signature) {
      return next();
    }

    // Validate service exists in registry
    const serviceConfig = serviceRegistry[serviceId];
    if (!serviceConfig) {
      const error = `Unknown service: ${serviceId}`;
      onAuthFailure?.(req, error);
      return res.status(401).json({ error: 'Unknown service' });
    }

    // Prepare signature data
    const body = req.body ? JSON.stringify(req.body) : '';
    const signatureData = {
      method: req.method,
      path: req.path,
      timestamp: parseInt(timestamp, 10),
      body,
      serviceId
    };

    // Verify signature
    const verification = verifyHMACSignature(
      signature,
      signatureData,
      serviceConfig.secret,
      windowSeconds
    );

    if (!verification.valid) {
      const error = verification.error || 'Invalid signature';
      onAuthFailure?.(req, error);
      return res.status(401).json({ error });
    }

    // Set service context on request
    req.serviceId = serviceId;
    req.requestId = requestId;
    req.isServiceRequest = true;

    onAuthSuccess?.(req, serviceId);
    next();
  };
}
```

---

## **🛠️ Setup Scripts**

### **Service Secret Generation Script**
```bash
#!/bin/bash
# scripts/generate-service-secrets.sh

echo "Generating service secrets for HMAC authentication..."

services=("auth-service" "lego-projects-api" "image-service" "price-scraper" "notifications-service")

for service in "${services[@]}"; do
  secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "${service^^}_SECRET=${secret}"
done

echo ""
echo "Add these to your .env files and secret management system"
```

### **Environment Validation Script**
```typescript
// scripts/validate-hmac-config.ts
import crypto from 'crypto';

interface ServiceConfig {
  id: string;
  secret?: string;
  allowedTargets: string[];
}

const requiredServices: ServiceConfig[] = [
  { id: 'auth-service', allowedTargets: ['lego-projects-api', 'notifications-service'] },
  { id: 'lego-projects-api', allowedTargets: ['image-service', 'notifications-service'] },
  { id: 'image-service', allowedTargets: ['lego-projects-api'] },
  { id: 'price-scraper', allowedTargets: ['lego-projects-api'] },
  { id: 'notifications-service', allowedTargets: ['auth-service', 'lego-projects-api'] }
];

function validateHMACConfiguration() {
  console.log('🔍 Validating HMAC configuration...\n');

  let allValid = true;

  for (const service of requiredServices) {
    const secretEnvVar = `${service.id.toUpperCase().replace('-', '_')}_SECRET`;
    const secret = process.env[secretEnvVar];

    console.log(`Checking ${service.id}:`);

    if (!secret) {
      console.log(`  ❌ Missing ${secretEnvVar}`);
      allValid = false;
    } else if (secret.length !== 64) {
      console.log(`  ❌ ${secretEnvVar} should be 64 characters (32 bytes hex)`);
      allValid = false;
    } else {
      console.log(`  ✅ ${secretEnvVar} configured correctly`);
    }
  }

  if (allValid) {
    console.log('\n🎉 All HMAC configurations are valid!');
  } else {
    console.log('\n❌ HMAC configuration issues found. Please fix before deployment.');
    process.exit(1);
  }
}

validateHMACConfiguration();
```

---

## **🧪 Testing Strategy**

### **Unit Tests Example**
```typescript
// packages/shared/src/auth/__tests__/hmac.test.ts
import { generateHMACSignature, verifyHMACSignature } from '../hmac';

describe('HMAC Authentication', () => {
  const testSecret = 'a'.repeat(64); // 64-char hex string
  const testData = {
    method: 'POST',
    path: '/api/test',
    timestamp: 1704067200,
    body: '{"test": true}',
    serviceId: 'test-service'
  };

  test('should generate consistent signatures', () => {
    const sig1 = generateHMACSignature(testData, testSecret);
    const sig2 = generateHMACSignature(testData, testSecret);
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64); // SHA256 hex = 64 chars
  });

  test('should verify valid signatures', () => {
    const signature = generateHMACSignature(testData, testSecret);
    const result = verifyHMACSignature(signature, testData, testSecret);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject expired timestamps', () => {
    const oldData = { ...testData, timestamp: 1000000000 }; // Very old
    const signature = generateHMACSignature(oldData, testSecret);
    const result = verifyHMACSignature(signature, oldData, testSecret, 300);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('timestamp outside allowed window');
  });

  test('should reject tampered requests', () => {
    const signature = generateHMACSignature(testData, testSecret);
    const tamperedData = { ...testData, body: '{"hacked": true}' };
    const result = verifyHMACSignature(signature, tamperedData, testSecret);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });
});
```

### **Integration Tests Example**
```typescript
// apps/api/auth-service/__tests__/hmac-integration.test.ts
import request from 'supertest';
import { ServiceClient } from '@packages/shared/clients/ServiceClient';
import app from '../index';

describe('HMAC Integration', () => {
  let serviceClient: ServiceClient;

  beforeAll(() => {
    serviceClient = new ServiceClient({
      serviceId: 'test-service',
      serviceSecret: process.env.TEST_SERVICE_SECRET!,
      baseUrl: 'http://localhost:5000'
    });
  });

  test('should authenticate valid service requests', async () => {
    const response = await serviceClient.get('/api/health');
    expect(response.status).toBe('ok');
  });

  test('should reject requests without HMAC headers', async () => {
    const response = await request(app)
      .get('/api/internal/users')
      .expect(401);

    expect(response.body.error).toContain('authentication required');
  });

  test('should reject requests with invalid signatures', async () => {
    const response = await request(app)
      .get('/api/internal/users')
      .set('X-Service-ID', 'test-service')
      .set('X-Timestamp', Math.floor(Date.now() / 1000).toString())
      .set('X-Signature', 'invalid-signature')
      .set('X-Request-ID', 'test-123')
      .expect(401);

    expect(response.body.error).toBe('Invalid signature');
  });
});
```

---

## **🔧 Troubleshooting Guide**

### **Common Issues & Solutions**

#### **Issue: "Invalid signature" errors**
```bash
# Check if service secret is correctly configured
echo $AUTH_SERVICE_SECRET | wc -c  # Should output 65 (64 chars + newline)

# Verify timestamp synchronization
curl -s http://worldtimeapi.org/api/timezone/UTC | jq .unixtime
date +%s  # Should be within 5 minutes of above
```

**Solutions:**
- Ensure service secrets are exactly 64 hex characters
- Synchronize server clocks using NTP
- Check for trailing whitespace in environment variables

#### **Issue: "Request timestamp outside allowed window"**
```typescript
// Debug timestamp issues
const now = Math.floor(Date.now() / 1000);
const requestTime = parseInt(req.headers['x-timestamp']);
console.log('Time diff:', Math.abs(now - requestTime), 'seconds');
```

**Solutions:**
- Synchronize clocks across all services
- Increase HMAC window if needed (max 600 seconds)
- Check for timezone configuration issues

#### **Issue: Service client connection failures**
```typescript
// Add debug logging to ServiceClient
const client = new ServiceClient({
  serviceId: 'my-service',
  serviceSecret: process.env.MY_SERVICE_SECRET,
  baseUrl: process.env.TARGET_SERVICE_URL
});

// Enable request/response logging
client.interceptors.request.use(req => {
  console.log('Outgoing request:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });
  return req;
});
```

### **Security Monitoring**

#### **Audit Log Format**
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "event": "hmac_auth_success",
  "serviceId": "image-service",
  "targetService": "lego-projects-api",
  "requestId": "uuid-v4",
  "method": "POST",
  "path": "/api/images/process",
  "ip": "10.0.1.5",
  "duration": 45
}
```

#### **Alert Conditions**
- Authentication failure rate >5% over 5 minutes
- Unknown service ID attempts
- Timestamp skew >60 seconds
- Signature verification failures from known services

---

## **📋 Junior Engineer Onboarding Checklist**

### **Prerequisites**
- [ ] Node.js 18+ installed
- [ ] Access to service environment variables
- [ ] Understanding of Express.js middleware
- [ ] Basic cryptography knowledge (HMAC concept)

### **Setup Steps**
1. [ ] Clone the repository and install dependencies
2. [ ] Copy `.env.example` to `.env` and configure service secrets
3. [ ] Run `npm run validate:hmac-config` to verify setup
4. [ ] Start the service in development mode
5. [ ] Run integration tests to verify HMAC authentication

### **Implementation Checklist**
- [ ] Import HMAC middleware in service entry point
- [ ] Configure service registry with allowed targets
- [ ] Add HMAC authentication to protected routes
- [ ] Implement ServiceClient for outgoing requests
- [ ] Add comprehensive error handling and logging
- [ ] Write unit tests for HMAC utilities
- [ ] Write integration tests for service communication

### **Testing Checklist**
- [ ] Test valid HMAC requests succeed
- [ ] Test invalid signatures are rejected
- [ ] Test timestamp window enforcement
- [ ] Test unknown service rejection
- [ ] Test error handling and logging
- [ ] Verify audit trail completeness

### **Deployment Checklist**
- [ ] Service secrets configured in production
- [ ] HTTPS enabled for all service communication
- [ ] Monitoring and alerting configured
- [ ] Security audit completed
- [ ] Documentation updated

---

## **📚 References**

- [RFC 2104: HMAC-SHA256 Specification](https://tools.ietf.org/html/rfc2104)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [Express.js Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [Node.js Crypto Module Documentation](https://nodejs.org/api/crypto.html)
