# AWS Integration Guide for LEGO MOC Instructions App

This document explains how the frontend application integrates with AWS-deployed backend services.

## 🏗️ **Architecture Overview**

The frontend can operate in two modes:

### 🏠 **Local Development Mode** (Default)
- Frontend runs on `http://localhost:3002`
- Uses Vite proxy to route API calls to local services
- Backend services run locally via Docker or native processes

### ☁️ **AWS Integration Mode**
- Frontend runs locally but connects to AWS-deployed services
- Direct HTTPS calls to AWS Application Load Balancers
- No Vite proxy - all API calls go directly to AWS endpoints

## 🔧 **Configuration**

### Environment Variables

The frontend uses these environment variables for AWS integration:

```bash
# AWS Integration Mode
VITE_USE_AWS_SERVICES=true
VITE_ENVIRONMENT=dev|staging|production

# AWS Service Endpoints
VITE_API_BASE_URL=https://lego-api-dev-alb-123456789.us-east-1.elb.amazonaws.com
VITE_AUTH_API_URL=https://auth-service-dev-alb-123456789.us-east-1.elb.amazonaws.com/api/auth

# Optional: Frontend URL (for CORS configuration)
VITE_FRONTEND_URL=https://app-dev.yourdomain.com
```

### Automatic Configuration

The frontend automatically detects the environment and configures API endpoints:

1. **Local Development**: Uses Vite proxy (`/api` → `localhost:9000`)
2. **AWS Development**: Uses AWS Load Balancer endpoints
3. **Production**: Uses production AWS endpoints

## 🚀 **Usage**

### Quick Environment Switching

Use the provided scripts to switch between local and AWS modes:

```bash
# Switch to local development mode
pnpm env:local

# Switch to AWS development mode
pnpm env:aws:dev

# Switch to AWS production mode
pnpm env:aws:prod

# Check current environment status
pnpm env:status
```

### Manual Configuration

1. **Get AWS Endpoints**: After deploying your service stacks, get the Load Balancer DNS names:

```bash
# Get Auth Service Load Balancer DNS
aws cloudformation describe-stacks \
  --stack-name AuthServiceStackDev \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text

# Get LEGO Projects API Load Balancer DNS
aws cloudformation describe-stacks \
  --stack-name LegoApiStackDev \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text
```

2. **Update Environment Variables**: Add the endpoints to your `.env` file:

```bash
VITE_USE_AWS_SERVICES=true
VITE_API_BASE_URL=https://your-lego-api-alb-dns
VITE_AUTH_API_URL=https://your-auth-service-alb-dns/api/auth
VITE_ENVIRONMENT=dev
```

3. **Start Development Server**:

```bash
pnpm dev:web
```

## 🔍 **How It Works**

### Environment Detection

The frontend uses a sophisticated environment detection system:

```typescript
// apps/web/lego-moc-instructions-app/src/config/env-loader.ts
const useAwsServices = env.VITE_USE_AWS_SERVICES === 'true' || isProduction
```

### API Client Configuration

Different API clients are configured based on the environment:

```typescript
// Auth API (packages/core/auth/src/store/authApi.ts)
const getAuthBaseUrl = () => {
  if (useAwsServices) {
    return import.meta.env.VITE_AUTH_API_URL || 'https://auth-service-dev-alb.us-east-1.elb.amazonaws.com/api/auth'
  }
  return '/api/auth' // Vite proxy
}

// LEGO Projects API (packages/features/moc-instructions/src/store/instructionsApi.ts)
const getInstructionsBaseUrl = () => {
  if (useAwsServices) {
    return import.meta.env.VITE_API_BASE_URL || 'https://lego-api-dev-alb.us-east-1.elb.amazonaws.com'
  }
  return '/api' // Vite proxy
}
```

### Vite Proxy Configuration

The Vite proxy is automatically disabled when using AWS services:

```typescript
// vite.config.ts
server: {
  // Only use proxy for local development (not AWS services)
  proxy: USE_AWS_SERVICES ? {} : {
    '/api/auth': { target: `http://localhost:${AUTH_SERVICE_PORT}` },
    '/api': { target: `http://localhost:${LEGO_API_PORT}` },
  }
}
```

## 🔒 **Security Considerations**

### CORS Configuration

When using AWS services, ensure your backend services are configured with the correct CORS origins:

```bash
# Backend .env configuration
CORS_ORIGINS=http://localhost:3002,https://app-dev.yourdomain.com
```

### HTTPS Requirements

AWS Application Load Balancers typically use HTTPS. Ensure your frontend is configured to make HTTPS requests to AWS endpoints.

### Authentication

The frontend uses cookie-based authentication with CSRF protection. This works seamlessly with both local and AWS deployments.

## 🧪 **Testing**

### Local Testing with AWS Services

1. Deploy your AWS infrastructure
2. Switch to AWS mode: `pnpm env:aws:dev`
3. Start the frontend: `pnpm dev:web`
4. Test all functionality to ensure proper integration

### Production Testing

1. Build the frontend: `pnpm build`
2. Serve the built files: `pnpm preview`
3. Test with production AWS endpoints

## 🐛 **Troubleshooting**

### Common Issues

1. **CORS Errors**: Ensure backend CORS configuration includes your frontend URL
2. **404 Errors**: Verify AWS Load Balancer DNS names are correct
3. **SSL Errors**: Ensure AWS services are properly configured with SSL certificates
4. **Authentication Issues**: Check that cookies are being sent with cross-origin requests

### Debug Mode

Enable debug logging in development:

```bash
VITE_ENABLE_API_LOGGING=true
```

### Network Inspection

Use browser developer tools to inspect network requests and verify:
- Correct API endpoints are being called
- Proper headers are being sent
- Responses are successful

## 📊 **Performance Considerations**

### Bundle Size

The frontend is configured with code splitting to optimize bundle sizes:
- React vendor chunk: ~253KB gzipped
- Main application chunk: ~129KB gzipped
- Feature-specific chunks loaded on demand

### Caching

RTK Query is configured with appropriate caching strategies:
- Auth data: Real-time (no cache)
- MOC instructions: 30 minutes cache
- Gallery data: 5 minutes cache

## 🚀 **Deployment**

### Development Deployment

The frontend can be deployed to AWS S3 + CloudFront while connecting to AWS backend services:

```bash
# Build for development
VITE_USE_AWS_SERVICES=true VITE_ENVIRONMENT=dev pnpm build

# Deploy to S3 (using your preferred deployment method)
aws s3 sync dist/ s3://your-frontend-bucket-dev/
```

### Production Deployment

```bash
# Build for production
VITE_USE_AWS_SERVICES=true VITE_ENVIRONMENT=production pnpm build

# Deploy to S3
aws s3 sync dist/ s3://your-frontend-bucket-prod/
```

The frontend CDK stack handles S3 and CloudFront deployment automatically when you deploy the infrastructure.
