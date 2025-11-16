# Technology Stack

This document provides a comprehensive overview of the technology stack used across the LEGO MOC Instructions monorepo.

## Table of Contents

- [Core Technologies](#core-technologies)
- [Frontend Stack](#frontend-stack)
- [Backend Stack](#backend-stack)
- [Infrastructure](#infrastructure)
- [Development Tools](#development-tools)
- [Testing](#testing)
- [Build & Deploy](#build--deploy)

## Core Technologies

### Language

- **TypeScript 5.8** - Primary language (strict mode enabled)
  - All source code must be TypeScript (.ts/.tsx)
  - No JavaScript files except required config files
  - Strict type checking enforced

### Monorepo Management

- **pnpm 9** - Fast, disk-efficient package manager with workspace support
- **Turborepo 2.5** - High-performance build system for monorepos
  - Intelligent caching
  - Parallel task execution
  - Remote caching support

### Package Management

```json
{
  "packageManager": "pnpm@9.0.0",
  "workspaces": [
    "apps/*",
    "packages/core/*",
    "packages/features/*",
    "packages/tools/*",
    "packages/dev/*"
  ]
}
```

## Frontend Stack

### Core Framework

- **React 19** - Latest React with new features
  - React Server Components ready
  - Improved concurrent rendering
  - Enhanced hooks

### Routing

- **TanStack Router** - Type-safe routing solution
  - ⚠️ Do **not** introduce React Router or alternatives
  - File-based routing in `src/routes/`
  - Type-safe route parameters and search params

### State Management

- **Redux Toolkit** - Official Redux toolset
  - Simplified Redux logic
  - Built-in best practices
  - Excellent DevTools

- **RTK Query** - Powerful data fetching and caching
  - ⚠️ Use exclusively for data fetching (no axios/fetch in features)
  - Automatic caching and invalidation
  - Optimistic updates
  - Example: `packages/core/auth/src/store/authApi.ts`

### Server State

- **TanStack React Query** - Async state management
  - Server state synchronization
  - Automatic refetching
  - Background updates
  - Request deduplication

### Styling

- **Tailwind CSS 4** - Utility-first CSS framework
  - JIT (Just-In-Time) compilation
  - Custom design tokens
  - Responsive design utilities

### UI Components

- **Radix UI** - Unstyled, accessible component primitives
  - 25+ components in `@repo/ui` package
  - Full accessibility (ARIA)
  - Keyboard navigation
  - Focus management

### Validation

- **Zod** - TypeScript-first schema validation
  - ✅ Preferred over manual type definitions
  - Use for all data validation at boundaries
  - Infer types with `z.infer<typeof schema>`

### Build Tool

- **Vite 6** - Next-generation frontend tooling
  - Lightning-fast HMR (Hot Module Replacement)
  - Optimized production builds
  - ESBuild-powered
  - Code splitting configured for optimal bundles

### PWA Support

- **Vite PWA Plugin** - Progressive Web App capabilities
  - Service worker for offline support
  - App manifest
  - Caching strategies

## Backend Stack

### Runtime

- **Node.js 20.x** - LTS version
  - ES Modules support
  - Native fetch API
  - Enhanced performance

### Serverless Framework

- **SST v3 (Ion)** - Modern serverless framework
  - AWS CDK under the hood
  - Local development environment
  - Type-safe infrastructure as code
  - Live Lambda debugging

### API Framework

- **Express.js** (Traditional API - `lego-projects-api`)
  - RESTful API design
  - Middleware ecosystem
  - Running on port 9000

- **AWS Lambda + API Gateway v2** (Serverless - `lego-api-serverless`)
  - Event-driven architecture
  - Auto-scaling
  - Pay-per-use pricing

### Database

#### PostgreSQL (Primary Database)

- **Version**: PostgreSQL 15.8
- **ORM**: Drizzle ORM
  - Type-safe SQL queries
  - Schema migrations
  - Connection pooling via RDS Proxy (serverless)

```typescript
// Example Drizzle usage
import { db } from '@/lib/db/client'
import { wishlistItems } from '@/db/schema'
import { eq } from 'drizzle-orm'

const items = await db
  .select()
  .from(wishlistItems)
  .where(eq(wishlistItems.userId, userId))
```

#### MongoDB (Authentication Service)

- **Version**: MongoDB 6.x
- **ODM**: Mongoose
  - Schema validation
  - Middleware hooks
  - Population

### Caching

- **Redis 7.1** (ElastiCache in AWS)
  - Session management
  - Query result caching
  - Rate limiting
  - Pattern: `{resource}:user:{userId}:{key}`

### Search

- **OpenSearch 2.13** (AWS OpenSearch Service)
  - Full-text search
  - Fuzzy matching
  - Search analytics
  - Indexes: `gallery_images`, `wishlist_items`, `moc_instructions`

### Storage

- **AWS S3**
  - MOC instruction files
  - Gallery images
  - Wishlist images
  - User avatars
  - Lifecycle policies for cost optimization

### Image Processing

- **Sharp** - High-performance image processing
  - Resize and optimize images
  - Generate thumbnails
  - Format conversion (JPEG, PNG, WebP)
  - Memory-efficient streaming

### Authentication

- **AWS Cognito** - Managed authentication service
  - User pools for authentication
  - JWT token generation
  - Email verification
  - Password reset flows
  - MFA support

- **Frontend SDK**: AWS Amplify Auth
- **Backend**: JWT validation in Lambda authorizers

## Infrastructure

### Cloud Provider

- **AWS (Amazon Web Services)**
  - Primary cloud platform
  - All infrastructure deployed via SST/CDK

### Infrastructure as Code

- **AWS CDK** (via SST v3)
  - TypeScript-based IaC
  - Reusable constructs
  - CloudFormation under the hood

### Networking

- **VPC (Virtual Private Cloud)**
  - Public and private subnets across 2 AZs
  - NAT Gateway for Lambda internet access
  - VPC Endpoints (S3, DynamoDB)

- **Security Groups**
  - Lambda → RDS (port 5432)
  - Lambda → Redis (port 6379)
  - Lambda → OpenSearch (port 443)

### Compute

- **AWS Lambda**
  - Serverless compute
  - Node.js 20.x runtime
  - Memory: 256 MB - 2048 MB (based on function)
  - Timeout: 10s - 60s
  - VPC-connected

### API Gateway

- **API Gateway v2 (HTTP API)**
  - RESTful endpoints
  - CORS configuration
  - JWT authorizers (Cognito)
  - Custom domains

### Container Orchestration (Development)

- **Docker Compose**
  - Local development environment
  - PostgreSQL
  - MongoDB
  - Redis
  - Elasticsearch/OpenSearch

## Development Tools

### Code Quality

- **ESLint 9** - Linting with Airbnb style guide
  - TypeScript-specific rules
  - React hooks rules
  - Import order enforcement

- **Prettier** - Code formatting
  - Consistent style across codebase
  - Integrated with ESLint

### Version Control

- **Git** - Version control system
- **GitHub** - Code hosting and collaboration
  - GitHub Actions for CI/CD
  - Pull request workflows
  - Issue tracking
  - Project boards

### Logging

- **Winston** - Logging library
  - ⚠️ Never use `console.log` in production
  - Structured logging
  - Multiple transports (file, console, CloudWatch)
  - Log levels: error, warn, info, debug

```typescript
import { logger } from '@/lib/logger'

logger.info('User created', { userId, email })
logger.error('Database error', { error, query })
```

### API Testing

- **Postman / Insomnia** - API development and testing
- **cURL** - Command-line HTTP client

### Monitoring (Production)

- **AWS CloudWatch** - Logging and monitoring
  - Lambda function logs
  - Metrics and alarms
  - X-Ray tracing

## Testing

### Unit & Integration Testing

- **Vitest** - Fast unit test framework
  - Vite-powered testing
  - Jest-compatible API
  - Native ESM support
  - Watch mode

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

### Component Testing

- **React Testing Library** - Test React components
  - User-centric testing
  - Accessibility-focused
  - Best practices built-in

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

### E2E Testing

- **Playwright** - End-to-end testing
  - ⚠️ **Must use Gherkin `.feature` files**
  - Cross-browser testing
  - Network interception
  - Visual regression testing

```gherkin
# features/login.feature
Feature: User Login
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should see the dashboard
```

### API Mocking

- **MSW (Mock Service Worker)** - API mocking
  - Intercept network requests
  - Consistent between tests and development
  - No changes to application code

## Build & Deploy

### Build Tools

- **Vite 6** - Frontend bundler
  - Fast development server
  - Optimized production builds
  - Code splitting

- **ESBuild** - Fast JavaScript bundler
  - TypeScript compilation
  - Minification
  - Tree shaking

### Deployment

#### Frontend

- **Platform**: AWS Amplify / CloudFront + S3
- **Build**: `pnpm build`
- **Environment**: Separate staging and production
- **CDN**: CloudFront for global distribution

#### Backend API (Serverless)

- **Platform**: AWS Lambda + API Gateway
- **Deployment**: SST (`sst deploy`)
- **Environments**: dev, staging, production
- **Infrastructure**: Defined in `sst.config.ts`

#### Backend API (Traditional)

- **Platform**: EC2 / ECS (if applicable)
- **Build**: `pnpm build`
- **Process Manager**: PM2 (if on EC2)

### CI/CD

- **GitHub Actions**
  - Automated testing on PRs
  - Build verification
  - Automated deployments
  - Dependency updates (Dependabot)

#### Pipeline Steps

1. **Lint**: `pnpm lint`
2. **Type Check**: `pnpm check-types`
3. **Test**: `pnpm test`
4. **Build**: `pnpm build`
5. **Deploy**: `sst deploy` or `amplify publish`

### Environment Management

- **Development**: Local Docker Compose + local Lambda
- **Staging**: AWS environment (staging subdomain)
- **Production**: AWS environment (production domain)

**Environment Variables**:
- Stored in `.env` files (local)
- AWS Systems Manager Parameter Store (cloud)
- Validated with Zod schemas at startup

## Version Management

### Changesets

- **@changesets/cli** - Version management
  - Semantic versioning
  - Automated changelog generation
  - Coordinated version bumps

```bash
pnpm changeset        # Create changeset
pnpm changeset version # Bump versions
```

### Dependency Sync

- **Custom Script**: `pnpm sync-deps`
  - Enforces consistent versions across workspaces
  - Automatic fixing via lint-staged
  - Prevents version drift

## Key Dependencies

### Shared Packages

- `@repo/ui` - Radix UI components (25+ components)
- `@repo/upload` - File/image upload with validation
- `@repo/file-list` - Generic file display component
- `@repo/moc-instructions` - MOC-specific features
- `@repo/gallery` - Image gallery with filtering
- `@repo/cache` - Client-side caching utilities
- `@monorepo/file-validator` - Universal file validation

### Notable Libraries

- **uuid** - UUID generation
- **date-fns** - Date manipulation
- **zod** - Schema validation
- **lucide-react** - Icon library
- **clsx** / **class-variance-authority** - Conditional classes

## Development Ports

**CRITICAL: These ports are centrally configured and must never be changed.**

Defined in root `.env` file:

- **Frontend**: 3002 (FRONTEND_PORT)
- **LEGO Projects API**: 9000 (LEGO_API_PORT)
- **PostgreSQL**: 5432 (POSTGRESQL_PORT)
- **Redis**: 6379 (REDIS_PORT)
- **Elasticsearch**: 9200 (ELASTICSEARCH_PORT)
- **Storybook**: 6007 (dev), 6008 (preview)

**If a port is busy**: Run `pnpm kill-ports` to stop existing services.

## Performance Optimizations

### Frontend

- **Code Splitting**: Configured in Vite for optimal chunks
- **Lazy Loading**: Routes lazy-loaded by default
- **Tree Shaking**: Dead code elimination
- **Asset Optimization**: Images, fonts compressed
- **Bundle Analysis**: Run before adding heavy deps

### Backend

- **Connection Pooling**: RDS Proxy for Lambda
- **Caching Strategy**: Redis for frequently accessed data
- **Database Indexes**: On all query patterns
- **Query Optimization**: Use `.select()` to fetch only needed fields

### Infrastructure

- **Lambda Cold Start Mitigation**:
  - Provisioned concurrency for critical functions
  - VPC optimization (avoid if possible)
  - Minimal dependencies

## Security Measures

### Application Security

- **Input Validation**: Zod schemas at all boundaries
- **Authentication**: AWS Cognito JWT tokens
- **Authorization**: User ownership checks
- **CORS**: Configured with specific origins
- **Rate Limiting**: On authentication endpoints
- **Helmet**: Security headers (Express)

### Infrastructure Security

- **VPC**: Private subnets for databases
- **Security Groups**: Least-privilege access
- **Encryption**: At-rest (RDS, S3) and in-transit (TLS)
- **Secrets Management**: Environment variables, Parameter Store
- **IAM Roles**: Least-privilege policies

## Resources

- **Monorepo Documentation**: `/CLAUDE.md`
- **Coding Standards**: `/docs/architecture/coding-standards.md`
- **Source Tree**: `/docs/architecture/source-tree.md`
- **Stories**: `/docs/stories/`

---

**Last Updated**: 2025-11-02
**Version**: 1.0
