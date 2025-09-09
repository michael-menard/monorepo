# Frontend Native Development Setup

This guide covers how to set up and run the frontend applications natively (without Docker) while connecting to native backend services.

## Overview

The monorepo contains two main frontend applications:
- **LEGO MOC Instructions App** (`apps/web/lego-moc-instructions-app`) - Main React application
- **LEGO MOC Documentation** (`apps/web/lego-moc-docs`) - Docusaurus documentation site

## Prerequisites

- **Node.js**: Version 18 or higher
- **pnpm**: Version 8 or higher (preferred package manager)
- **Git**: For version control
- **Native Backend Services**: Auth service and LEGO Projects API running natively

## Quick Start

### 1. Install Dependencies

From the monorepo root:
```bash
# Install all dependencies
pnpm install

# Or install for specific apps
cd apps/web/lego-moc-instructions-app && pnpm install
cd apps/web/lego-moc-docs && pnpm install
```

### 2. Configure Environment Variables

#### Main Application Environment
```bash
# Copy example environment file
cp apps/web/lego-moc-instructions-app/.env.example apps/web/lego-moc-instructions-app/.env

# Edit the environment file
nano apps/web/lego-moc-instructions-app/.env
```

#### Essential Environment Variables
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_API_URL=http://localhost:5000

# Authentication Settings
VITE_AUTH_DOMAIN=localhost
VITE_CLIENT_URL=http://localhost:5173

# Feature Flags
VITE_ENABLE_AUTH=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENVIRONMENT=development

# Optional: Image Storage (if using cloud storage)
VITE_S3_BUCKET_NAME=your-s3-bucket
VITE_CLOUDFRONT_URL=your-cloudfront-url
```

### 3. Start Native Backend Services

Before starting the frontend, ensure your backend services are running:

```bash
# Terminal 1: Start MongoDB (if using local MongoDB)
mongod --dbpath /usr/local/var/mongodb

# Terminal 2: Start Auth Service
cd apps/api/auth-service
pnpm dev

# Terminal 3: Start LEGO Projects API
cd apps/api/lego-projects-api
pnpm dev
```

Verify backends are running:
- Auth Service: http://localhost:5000/health
- LEGO Projects API: http://localhost:3001/health

### 4. Start Frontend Applications

#### Main Application
```bash
cd apps/web/lego-moc-instructions-app
pnpm dev
```

Application will be available at: http://localhost:5173

#### Documentation Site
```bash
cd apps/web/lego-moc-docs
pnpm start
```

Documentation will be available at: http://localhost:3000

## Development Workflow

### Single App Development

Work on just the main application:
```bash
# Start only the main app
cd apps/web/lego-moc-instructions-app
pnpm dev
```

### Multi-App Development

Use the monorepo scripts to manage multiple services:
```bash
# From monorepo root - start all frontend apps
pnpm dev:web

# Start specific combination
pnpm dev:app      # Main app only
pnpm dev:docs     # Docs only
pnpm dev:full     # All apps + backends
```

### Hot Reloading and Live Updates

Both applications support hot module replacement (HMR):
- **React App**: Changes reload instantly without losing state
- **Docs Site**: Markdown changes refresh automatically
- **Shared Packages**: Changes trigger rebuilds in consuming apps

## API Integration Configuration

### RTK Query Setup

The main application uses RTK Query for API communication. Configure the base URLs:

```typescript
// apps/web/lego-moc-instructions-app/src/services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    credentials: 'include', // Important for auth cookies
    prepareHeaders: (headers, { getState }) => {
      // Add auth headers if needed
      return headers;
    },
  }),
  endpoints: (builder) => ({
    // API endpoints defined here
  }),
});
```

### CSRF Protection

The application includes comprehensive CSRF protection for native backend integration:

```typescript
// CSRF tokens are automatically handled
import { authApi } from '@/services/authApi';

// All mutations are automatically CSRF-protected
await authApi.login({ email, password });
await authApi.signup({ name, email, password });
```

### Environment-Specific API Configuration

```typescript
// src/config/api.ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL,
  AUTH_URL: import.meta.env.VITE_AUTH_API_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// Development vs Production
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
```

## Testing with Native Backends

### API Integration Tests

Test the frontend against running native backends:

```bash
# Start backends first
pnpm backend:start

# Run frontend API integration tests
cd apps/web/lego-moc-instructions-app
pnpm test:integration

# Run E2E tests against native services
pnpm test:e2e:native
```

### Manual Testing Workflow

1. **Start Services**: Ensure all native backends are running
2. **Check Health**: Verify backend health endpoints
3. **Test Authentication**: Login/signup flows
4. **Test Core Features**: Create/edit instructions, image upload
5. **Test Error Handling**: Network failures, validation errors

### Testing Different Backend States

```bash
# Test with empty database
pnpm test:e2e:clean

# Test with seed data
pnpm test:e2e:seeded

# Test error scenarios
pnpm test:e2e:errors
```

## Build and Preview

### Development Build

```bash
cd apps/web/lego-moc-instructions-app
pnpm build:dev
```

### Production Build

```bash
# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

### Build with Native API Integration

```bash
# Build with native backend URLs
VITE_API_BASE_URL=http://localhost:3001 pnpm build

# Build with production URLs
VITE_API_BASE_URL=https://api.yourdomain.com pnpm build
```

## Troubleshooting

### Common Issues

#### CORS Errors
```bash
# Check backend CORS configuration
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3001/api/instructions
```

#### API Connection Issues
```bash
# Test backend connectivity
curl http://localhost:5000/health
curl http://localhost:3001/health

# Check network requests in browser dev tools
# Verify environment variables are loaded
console.log(import.meta.env)
```

#### Authentication Issues
```bash
# Verify auth service is responding
curl -X POST http://localhost:5000/api/auth/csrf

# Check cookies in browser dev tools
# Verify CSRF token handling
```

#### Build Issues
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear build output
rm -rf dist

# Reinstall dependencies
rm -rf node_modules && pnpm install
```

### Performance Optimization

#### Development Server
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: false, // Disable error overlay if needed
    },
    proxy: {
      // Proxy API requests during development
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:5000'
    }
  }
});
```

#### Bundle Analysis
```bash
# Analyze bundle size
pnpm build:analyze

# Check for duplicate dependencies
pnpm ls --depth=0
```

## Production Deployment

### Environment Configuration

```env
# Production environment variables
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_AUTH_API_URL=https://auth.yourdomain.com
VITE_ENVIRONMENT=production
VITE_ENABLE_DEVTOOLS=false
```

### Build Optimization

```bash
# Production build with optimizations
NODE_ENV=production pnpm build

# Serve with production settings
pnpm preview --host --port 4173
```

### Health Checks

Create a health check endpoint for monitoring:

```typescript
// src/pages/HealthCheck.tsx
export function HealthCheck() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // Check frontend health and backend connectivity
    checkHealth().then(setHealth);
  }, []);

  return (
    <div>
      <h1>Frontend Health Status</h1>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  );
}
```

## Integration with Shared Packages

### Using Shared Components

```typescript
// Import from shared packages
import { Button } from '@repo/ui';
import { useAuth } from '@repo/auth';
import { formatDate } from '@repo/shared';

function MyComponent() {
  const { user } = useAuth();
  
  return (
    <Button variant="primary">
      Welcome, {user?.name}!
    </Button>
  );
}
```

### Package Development Workflow

```bash
# Make changes to shared packages
cd packages/ui
# ... make changes ...

# Packages automatically rebuild and update in apps
# No restart needed for most changes
```

## Monitoring and Debugging

### Development Tools

```typescript
// Enable Redux DevTools in development
if (import.meta.env.DEV) {
  // Redux DevTools automatically enabled
}

// Enable React DevTools profiling
// Available in browser extension
```

### Error Tracking

```typescript
// Error boundary for production
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        {/* App content */}
      </Router>
    </ErrorBoundary>
  );
}
```

### Performance Monitoring

```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

if (import.meta.env.PROD) {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
```

## Next Steps

1. **Explore the Applications**: Start both frontend apps and explore their features
2. **Review Shared Packages**: Check out the reusable components and utilities
3. **Read API Documentation**: Understand the backend API endpoints
4. **Run Tests**: Execute the test suites to verify everything works
5. **Customize Configuration**: Adjust environment variables for your setup

## Related Documentation

- [Auth Development Setup](AUTH-DEV-SETUP.md) - Backend authentication setup
- [API Documentation](API_DOCUMENTATION.md) - Complete API reference
- [Testing Guide](TESTING_GUIDE.md) - Comprehensive testing strategies
- [Architecture Overview](ARCHITECTURE_README.md) - System architecture
- [Package Structure](PACKAGE-STRUCTURE.md) - Monorepo organization
