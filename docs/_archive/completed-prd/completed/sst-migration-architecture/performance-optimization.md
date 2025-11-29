# Performance Optimization

## Cold Start Mitigation

**Strategies**:

1. **Provisioned Concurrency** (production only):
   - Health Check Lambda: 5 reserved instances (always warm)
   - MOC Lambda: 2 reserved instances
   - Gallery Lambda: 2 reserved instances

2. **Lambda Architecture**: arm64 (Graviton2) for faster cold starts and lower cost

3. **Code Splitting**: Shared dependencies in Lambda Layer, minimal function code

4. **Bundle Optimization**:
   - esbuild tree-shaking
   - Exclude AWS SDK v3 from bundle (already in Lambda runtime)
   - Minification enabled

5. **Connection Reuse**:
   - Database client initialized outside handler
   - Redis client persistent across invocations
   - HTTP clients with keep-alive

**Measured Cold Start Targets**:

- Health Check: <500ms
- CRUD Lambdas: <1500ms
- Upload Lambda: <2000ms

## Response Time Optimization

**Database Query Optimization**:

- Proper indexes on frequently queried columns
- Eager loading of relationships with Drizzle
- Pagination for large result sets
- Limit result columns with `.select()`

**Caching Strategy**:

- Redis for frequently accessed data (5-10 min TTL)
- CDN (CloudFront) for S3 assets

**S3 Presigned URLs**:

- Offload file downloads to S3 (direct client → S3)
- Reduces Lambda invocation time

**Async Processing**:

- CSV parsing offloaded to separate Lambda (async invocation)
- Image uploads processed synchronously (user waits for confirmation)

---
