# Express to Lambda Microservices Migration Strategy

## Overview

This document outlines the strategy for migrating the current Express.js applications (`lego-projects-api` and `auth-service`) to AWS Lambda microservices. The migration is designed to be low-risk with minimal downtime, leveraging the existing modular architecture.

## Current Architecture Analysis

### Existing Services

#### 1. **lego-projects-api** (Main API)
- **Profile Management:** CRUD operations for user profiles with avatar uploads
- **Gallery System:** Image upload, metadata management, albums, flagging
- **Authentication:** JWT-based with refresh token mechanism
- **File Storage:** S3 + local storage abstraction
- **Database:** PostgreSQL with Drizzle ORM
- **Security:** Rate limiting, file validation, security headers

#### 2. **auth-service** (Separate Service)
- **User Authentication:** Login, signup, password reset
- **JWT Management:** Token generation and validation
- **Email Services:** Verification and password reset emails
- **Database:** User management tables

### Current Structure Strengths

✅ **Already Microservice-Ready:**
- Auth is already separated into its own service
- Clear separation of concerns (profile vs gallery)
- Modular middleware and handlers
- Storage abstraction layer

✅ **Serverless-Friendly Dependencies:**
- Drizzle ORM works well with Lambda
- S3 integration already implemented
- JWT authentication is stateless
- No heavy session management

✅ **Clean Architecture:**
- Handlers are pure functions
- Middleware is modular
- Database operations are abstracted
- File processing is separated

## Migration Complexity Assessment

### **Overall Complexity: LOW to MEDIUM** 🟡

| Service | Complexity | Timeline | Risk |
|---------|------------|----------|------|
| Auth Service | Low | 1-2 days | Low |
| Profile Service | Low | 1-2 days | Low |
| Gallery Service | Medium | 3-5 days | Medium |
| File Upload Service | Medium | 3-5 days | Medium |
| Image Processing Service | Medium | 3-5 days | Medium |

### **Easy Migrations (1-2 days each):**

#### 1. **Profile Service**
- Simple CRUD operations
- No file processing complexity
- Straightforward database operations

#### 2. **Auth Service**
- Already separate service
- Minimal changes needed
- Stateless JWT operations

### **Medium Complexity (3-5 days each):**

#### 1. **File Upload Service**
**Challenge:** Handle multer → Lambda multipart
```typescript
// Current: Multer middleware
router.post('/api/images', requireAuth, galleryUpload.single('image'), uploadGalleryImage);

// Lambda: Need to handle multipart/form-data manually
// Or use API Gateway multipart support
```

#### 2. **Image Processing Service**
**Challenge:** Sharp processing in Lambda
- Memory constraints
- Cold start optimization
- Processing time limits

#### 3. **Database Connection Management**
**Challenge:** Connection pooling for Lambda
```typescript
// Current: Persistent connection
import { db } from '../db/client';

// Lambda: Need connection pooling/management
// Consider using connection proxies or RDS Proxy
```

## Migration Strategy

### **Phase 1: Preparation (1 week)**

#### 1.1 Infrastructure Setup
- [ ] Set up AWS API Gateway
- [ ] Configure Lambda execution roles and permissions
- [ ] Set up RDS Proxy for database connections
- [ ] Configure ElastiCache for rate limiting
- [ ] Set up CloudWatch logging and monitoring

#### 1.2 Shared Utilities Extraction
- [ ] Create `packages/database` for shared DB client
- [ ] Create `packages/auth` for JWT utilities
- [ ] Create `packages/storage` for S3 operations
- [ ] Create `packages/validation` for Zod schemas

#### 1.3 Lambda-Compatible Database Client
```typescript
// packages/database/src/client.ts
export class LambdaDBClient {
  private static instance: LambdaDBClient;
  private connection: any;

  static getInstance(): LambdaDBClient {
    if (!LambdaDBClient.instance) {
      LambdaDBClient.instance = new LambdaDBClient();
    }
    return LambdaDBClient.instance;
  }

  async connect() {
    // Implement connection pooling for Lambda
  }

  async disconnect() {
    // Clean up connections
  }
}
```

### **Phase 2: Service Migration (2-3 weeks)**

#### 2.1 Auth Service Migration (Week 1)
**Priority:** High (other services depend on it)

**Lambda Functions:**
- `auth-login` - Handle user login
- `auth-signup` - Handle user registration
- `auth-refresh` - Handle token refresh
- `auth-verify` - Verify JWT tokens

**Migration Steps:**
1. [ ] Extract auth handlers to Lambda functions
2. [ ] Adapt JWT middleware for API Gateway
3. [ ] Update email service integration
4. [ ] Test authentication flow
5. [ ] Update client applications to use new endpoints

#### 2.2 Profile Service Migration (Week 2)
**Priority:** Medium

**Lambda Functions:**
- `profile-get` - Get user profile
- `profile-create` - Create user profile
- `profile-update` - Update user profile
- `profile-avatar-upload` - Handle avatar uploads
- `profile-avatar-delete` - Delete avatar

**Migration Steps:**
1. [ ] Extract profile handlers to Lambda functions
2. [ ] Adapt file upload handling for Lambda
3. [ ] Update S3 integration
4. [ ] Test profile CRUD operations
5. [ ] Update client applications

#### 2.3 Gallery Service Migration (Week 3)
**Priority:** Medium

**Lambda Functions:**
- `gallery-upload` - Handle image uploads
- `gallery-update` - Update image metadata
- `gallery-delete` - Delete images
- `gallery-album-get` - Get album data
- `gallery-flag` - Flag images for moderation

**Migration Steps:**
1. [ ] Extract gallery handlers to Lambda functions
2. [ ] Implement multipart file handling
3. [ ] Set up S3 triggers for image processing
4. [ ] Test gallery operations
5. [ ] Update client applications

### **Phase 3: File Processing Optimization (1 week)**

#### 3.1 Image Processing Service
**Lambda Functions:**
- `image-process` - Process uploaded images (Sharp operations)
- `image-cleanup` - Clean up temporary files

**S3 Triggers:**
- Upload trigger → `image-process`
- Processing complete → `image-cleanup`

#### 3.2 File Upload Optimization
- [ ] Implement presigned URLs for direct S3 uploads
- [ ] Set up S3 event notifications
- [ ] Optimize Lambda memory allocation for image processing

## Infrastructure Architecture

### **API Gateway Configuration**

```yaml
# serverless.yml example
service: lego-projects-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    DB_HOST: ${ssm:/lego-projects/db-host}
    DB_NAME: ${ssm:/lego-projects/db-name}
    JWT_SECRET: ${ssm:/lego-projects/jwt-secret}

functions:
  profile-get:
    handler: src/functions/profile/get.handler
    events:
      - http:
          path: /api/users/{id}
          method: get
          cors: true
          authorizer: auth-verify

  gallery-upload:
    handler: src/functions/gallery/upload.handler
    events:
      - http:
          path: /api/images
          method: post
          cors: true
          authorizer: auth-verify
    timeout: 30
    memorySize: 1024
```

### **Database Architecture**

#### **RDS Proxy Setup**
- Connection pooling for Lambda functions
- Automatic failover
- Connection reuse across invocations

#### **Connection Management**
```typescript
// packages/database/src/lambda-client.ts
export class LambdaDBClient {
  private static pool: Pool;

  static async getConnection() {
    if (!this.pool) {
      this.pool = new Pool({
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 1, // Lambda-specific optimization
        idleTimeoutMillis: 120000,
        connectionTimeoutMillis: 10000,
      });
    }
    return this.pool.connect();
  }
}
```

### **Security Architecture**

#### **API Gateway Authorizers**
```typescript
// src/authorizers/auth.ts
export const authAuthorizer = async (event: any) => {
  const token = event.authorizationToken;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      principalId: decoded.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }]
      }
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};
```

#### **Rate Limiting**
- API Gateway throttling
- ElastiCache for distributed rate limiting
- Per-user and per-endpoint limits

## Migration Challenges & Solutions

### **Challenge 1: File Upload Handling**

**Problem:** Multer middleware doesn't work in Lambda

**Solutions:**
1. **API Gateway Multipart Support**
   ```typescript
   // Handle multipart in Lambda
   export const uploadHandler = async (event: any) => {
     const body = event.body;
     const boundary = event.headers['content-type'].split('boundary=')[1];
     const parts = parseMultipart(body, boundary);
     // Process file parts
   };
   ```

2. **Presigned S3 URLs**
   ```typescript
   // Generate presigned URL for direct upload
   const presignedUrl = await s3Client.getSignedUrl('putObject', {
     Bucket: 'lego-projects-uploads',
     Key: `uploads/${userId}/${filename}`,
     Expires: 300
   });
   ```

### **Challenge 2: Database Connections**

**Problem:** Lambda cold starts and connection limits

**Solutions:**
1. **RDS Proxy**
   - Connection pooling
   - Automatic failover
   - Connection reuse

2. **Connection Optimization**
   ```typescript
   // Reuse connections across invocations
   let dbConnection: any = null;
   
   export const handler = async (event: any) => {
     if (!dbConnection) {
       dbConnection = await connect();
     }
     // Use connection
   };
   ```

### **Challenge 3: Middleware Adaptation**

**Problem:** Express middleware doesn't work in Lambda

**Solutions:**
1. **Lambda Middleware Pattern**
   ```typescript
   const withAuth = (handler: Function) => async (event: any) => {
     // Auth logic
     return handler(event);
   };
   
   export const handler = withAuth(async (event: any) => {
     // Handler logic
   });
   ```

2. **API Gateway Integration**
   - CORS handling
   - Request validation
   - Rate limiting

### **Challenge 4: Rate Limiting**

**Problem:** In-memory rate limiting doesn't work across Lambda instances

**Solutions:**
1. **ElastiCache Redis**
   ```typescript
   const rateLimiter = new RedisRateLimiter({
     redis: redisClient,
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

2. **API Gateway Throttling**
   - Built-in rate limiting
   - Usage plans
   - API keys

## Testing Strategy

### **Phase 1: Unit Testing**
- [ ] Test individual Lambda functions
- [ ] Mock external dependencies
- [ ] Test error handling

### **Phase 2: Integration Testing**
- [ ] Test API Gateway integration
- [ ] Test database connections
- [ ] Test S3 operations

### **Phase 3: End-to-End Testing**
- [ ] Test complete user flows
- [ ] Test file upload/download
- [ ] Test authentication flows

### **Phase 4: Performance Testing**
- [ ] Test Lambda cold starts
- [ ] Test concurrent requests
- [ ] Test memory usage

## Deployment Strategy

### **Blue-Green Deployment**
1. **Blue Environment:** Current Express services
2. **Green Environment:** New Lambda services
3. **Traffic Switching:** Gradual migration with health checks

### **Canary Deployment**
1. **Phase 1:** 5% traffic to Lambda
2. **Phase 2:** 25% traffic to Lambda
3. **Phase 3:** 50% traffic to Lambda
4. **Phase 4:** 100% traffic to Lambda

### **Rollback Plan**
- [ ] Keep Express services running during migration
- [ ] Monitor Lambda performance metrics
- [ ] Automatic rollback on error thresholds
- [ ] Manual rollback procedures

## Monitoring & Observability

### **CloudWatch Metrics**
- Lambda invocation count and duration
- Error rates and throttles
- Memory usage and cold starts
- API Gateway metrics

### **Custom Metrics**
- Database connection pool usage
- File upload success rates
- Authentication success rates
- User experience metrics

### **Logging Strategy**
- Structured logging with correlation IDs
- Lambda function logs
- API Gateway access logs
- Database query logs

## Cost Optimization

### **Lambda Optimization**
- Right-size memory allocation
- Optimize cold start times
- Use provisioned concurrency for critical functions

### **Database Optimization**
- RDS Proxy for connection pooling
- Read replicas for read-heavy operations
- Proper indexing strategies

### **Storage Optimization**
- S3 lifecycle policies
- CloudFront for static assets
- Image compression and optimization

## Timeline & Milestones

### **Week 1: Preparation**
- [ ] Infrastructure setup
- [ ] Shared utilities extraction
- [ ] Database client optimization

### **Week 2: Auth Service**
- [ ] Auth Lambda functions
- [ ] API Gateway integration
- [ ] Testing and validation

### **Week 3: Profile Service**
- [ ] Profile Lambda functions
- [ ] File upload adaptation
- [ ] Testing and validation

### **Week 4: Gallery Service**
- [ ] Gallery Lambda functions
- [ ] Image processing optimization
- [ ] Testing and validation

### **Week 5: Optimization**
- [ ] Performance tuning
- [ ] Cost optimization
- [ ] Monitoring setup

### **Week 6: Production Migration**
- [ ] Blue-green deployment
- [ ] Traffic migration
- [ ] Post-migration validation

## Risk Assessment

### **Low Risk**
- Auth service migration (already separate)
- Profile CRUD operations
- Database schema changes (none required)

### **Medium Risk**
- File upload handling
- Image processing performance
- Database connection management

### **Mitigation Strategies**
- Comprehensive testing at each phase
- Gradual traffic migration
- Rollback procedures
- Performance monitoring
- Cost monitoring

## Success Criteria

### **Functional Requirements**
- [ ] All existing endpoints work correctly
- [ ] File upload/download functionality preserved
- [ ] Authentication flows work seamlessly
- [ ] Database operations perform as expected

### **Performance Requirements**
- [ ] Response times within acceptable limits
- [ ] Cold start times under 1 second
- [ ] Memory usage optimized
- [ ] Cost per request within budget

### **Operational Requirements**
- [ ] Comprehensive monitoring in place
- [ ] Error handling and alerting
- [ ] Backup and recovery procedures
- [ ] Documentation updated

## Conclusion

The migration from Express to Lambda microservices is **low to medium complexity** due to the existing modular architecture. The main challenges are around file handling and database connections, which have well-established patterns in the serverless world.

The recommended approach is a **gradual migration** with comprehensive testing at each phase, ensuring minimal risk and downtime. The existing separation of concerns and clean architecture will significantly reduce migration effort.

**Estimated Timeline:** 4-6 weeks
**Risk Level:** Low-Medium
**Downtime:** Minimal (service-by-service migration) 