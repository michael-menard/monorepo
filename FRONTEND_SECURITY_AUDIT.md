# Frontend Stack Security Audit

## Security Configuration Analysis

### ✅ S3 Bucket - PROPERLY SECURED (Private)

**Location**: `lib/frontend-stack.ts:28-37`

```typescript
this.bucket = new s3.Bucket(this, 'FrontendBucket', {
  bucketName: `lego-moc-frontend-${environment}-${this.account}`,
  websiteIndexDocument: 'index.html',
  websiteErrorDocument: 'index.html',
  publicReadAccess: false,                           // ✅ PRIVATE
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // ✅ ALL PUBLIC ACCESS BLOCKED
  removalPolicy: environment === 'production'
    ? cdk.RemovalPolicy.RETAIN
    : cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: environment !== 'production',
})
```

**Security Controls:**
- ✅ `publicReadAccess: false` - Explicitly denies public read access
- ✅ `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL` - AWS S3 Block Public Access enabled
  - Blocks all public ACLs
  - Ignores all public ACLs
  - Blocks all public bucket policies
  - Restricts cross-account access
- ✅ **The S3 bucket is COMPLETELY PRIVATE** - No direct internet access possible

**Note**: The `websiteIndexDocument` and `websiteErrorDocument` settings do NOT make the bucket public. These are just metadata for CloudFront to use.

---

### ✅ CloudFront Origin Access Identity (OAI) - PROPERLY CONFIGURED

**Location**: `lib/frontend-stack.ts:39-45`

```typescript
// Origin Access Identity for CloudFront
const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
  comment: `OAI for ${environment} frontend`,
})

// Grant CloudFront access to S3 bucket
this.bucket.grantRead(originAccessIdentity)
```

**What This Does:**
- ✅ Creates a special AWS identity for CloudFront
- ✅ Grants **ONLY** CloudFront read access to the private S3 bucket
- ✅ S3 bucket policy is automatically updated to allow ONLY this OAI
- ✅ Direct S3 URLs (s3.amazonaws.com) will return "Access Denied"
- ✅ Content is ONLY accessible through CloudFront

**Security Flow:**
```
Internet User → CloudFront (Public) → OAI → S3 Bucket (Private)
Internet User → S3 Direct Access → ❌ ACCESS DENIED
```

---

### ✅ CloudFront Distribution - PUBLIC (As Intended)

**Location**: `lib/frontend-stack.ts:57-108`

```typescript
this.distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(this.bucket, {
      originAccessIdentity,  // ✅ Uses OAI for secure S3 access
    }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // ✅ Forces HTTPS
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,                   // ✅ Edge caching
    compress: true,                                                           // ✅ Gzip compression
  },
  // ... API proxying configuration
  defaultRootObject: 'index.html',
  errorResponses: [
    // SPA routing support - 404/403 → index.html
    { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
    { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
  ],
})
```

**Security Features:**
- ✅ **HTTPS Enforced**: `REDIRECT_TO_HTTPS` automatically redirects HTTP → HTTPS
- ✅ **Edge Caching**: Content cached at CloudFront edge locations (faster, cheaper, more secure)
- ✅ **Compression**: Reduces bandwidth and improves performance
- ✅ **SPA Routing**: Handles client-side routing correctly (404 → index.html)

**Public Access:**
- ✅ CloudFront distribution is **intentionally public**
- ✅ Accessed via CloudFront URL: `https://d1234567890abc.cloudfront.net`
- ✅ Or custom domain (if configured): `https://yourdomain.com`

---

### ⚠️ ISSUE: API Proxying Configuration

**Location**: `lib/frontend-stack.ts:66-86`

```typescript
additionalBehaviors: {
  '/api/auth/*': {
    origin: new origins.HttpOrigin(authApiDomain || 'localhost:3001', {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    }),
    // ...
  },
  '/api/lego/*': {
    origin: new origins.HttpOrigin(apiDomain || 'localhost:3000', {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    }),
    // ...
  },
}
```

**Problem:**
- ❌ `authApiDomain` is not passed from `bin/app.ts`
- ❌ `apiDomain` is not passed from `bin/app.ts`
- ❌ Defaults to `localhost:3001` and `localhost:3000` which won't work in production
- ❌ CloudFront will try to route `/api/auth/*` and `/api/lego/*` to localhost (which fails)

**Impact:**
- Frontend static files (HTML, CSS, JS) will work fine ✅
- API calls from the frontend will fail ❌

**Solution Required:**
Either:
1. **Remove the API proxying** (frontend calls APIs directly via their ALB URLs)
2. **Fix the configuration** (pass actual API domain names after deploying API stacks)

---

## Security Summary

### ✅ What's Secure:

| Component | Security Status | Details |
|-----------|----------------|---------|
| **S3 Bucket** | ✅ PRIVATE | All public access blocked |
| **OAI** | ✅ CONFIGURED | Only CloudFront can access S3 |
| **CloudFront** | ✅ PUBLIC | HTTPS enforced, proper caching |
| **Direct S3 Access** | ✅ BLOCKED | Returns 403 Forbidden |
| **Data in Transit** | ✅ ENCRYPTED | HTTPS only |
| **Bucket Policy** | ✅ RESTRICTIVE | OAI-only access |

### ⚠️ What Needs Fixing:

| Issue | Severity | Impact | Fix Required |
|-------|----------|--------|--------------|
| API Proxying | Medium | API calls will fail | Remove or configure domains |

---

## Recommended Architecture

### Option 1: Direct API Calls (Simplest)

**Remove CloudFront API proxying entirely:**

Frontend → CloudFront → S3 (static files)
Frontend → Direct API calls → ALB → ECS (auth-service)
Frontend → Direct API calls → ALB → ECS (lego-projects-api)

**Pros:**
- ✅ Simpler configuration
- ✅ Fewer moving parts
- ✅ CloudFront only handles static assets
- ✅ Each service has its own domain

**Cons:**
- ⚠️ Requires CORS configuration on APIs
- ⚠️ Multiple domains (could cause cookie issues)

### Option 2: CloudFront as Single Entry Point (Better for Production)

**Configure CloudFront to proxy all requests:**

```
Frontend → CloudFront →
  - /api/auth/* → Auth Service ALB
  - /api/lego/* → LEGO API ALB
  - /* → S3 (static files)
```

**Pros:**
- ✅ Single domain for frontend + APIs
- ✅ No CORS issues
- ✅ Simpler authentication (same-origin cookies)
- ✅ CloudFront caching for API responses (if configured)

**Cons:**
- ⚠️ Requires API stacks to be deployed first
- ⚠️ More complex configuration
- ⚠️ Need to update stack when API domains change

---

## Deployment Options

### Option A: Deploy Frontend Without API Proxying (Recommended Now)

**Modifications needed:**
1. Remove the `additionalBehaviors` section (lines 66-86)
2. Deploy the frontend stack
3. Configure frontend app to call APIs directly via ALB URLs

### Option B: Deploy Frontend With API Proxying (Later)

**Requirements:**
1. Deploy Auth Service stack first → get ALB URL
2. Deploy LEGO API stack first → get ALB URL
3. Update `bin/app.ts` to pass API domains
4. Deploy frontend stack

---

## Test Plan After Deployment

### 1. Verify S3 Bucket is Private

```bash
# Get bucket name from stack output
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Try to access bucket directly (should fail)
curl -I https://$BUCKET_NAME.s3.amazonaws.com/index.html
# Expected: 403 Forbidden or Access Denied
```

### 2. Verify CloudFront Works

```bash
# Get CloudFront URL
CF_URL=$(aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
  --output text)

# Access via CloudFront (should work)
curl -I $CF_URL
# Expected: 200 OK
```

### 3. Verify HTTPS Redirect

```bash
# Try HTTP (should redirect to HTTPS)
curl -I http://${CF_URL#https://}
# Expected: 301/302 redirect to HTTPS
```

---

## Conclusion

### Security: ✅ EXCELLENT

Your frontend stack is properly configured with:
- ✅ Private S3 bucket (no public access)
- ✅ CloudFront with Origin Access Identity (secure access to S3)
- ✅ HTTPS enforced
- ✅ Public CloudFront distribution (as intended)

### Functionality: ⚠️ NEEDS ADJUSTMENT

The API proxying configuration won't work without API domains. You have two options:

1. **Remove API proxying** and call APIs directly (simpler, faster to test)
2. **Deploy APIs first**, then configure CloudFront with actual domains (better for production)

---

## Recommendation

**For initial testing:**
1. Remove the API proxying configuration
2. Deploy the frontend stack
3. Verify S3 is private and CloudFront is public
4. Configure frontend app to call APIs directly (when you deploy them later)

**For production:**
1. Deploy API stacks
2. Update frontend stack with actual API domains
3. Redeploy frontend with full API proxying

Would you like me to:
- **A)** Modify the stack to remove API proxying for now?
- **B)** Keep the current configuration and plan to deploy APIs first?
- **C)** Something else?
