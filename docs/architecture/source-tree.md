# Source Tree Structure

This document explains the directory structure and organization of the LEGO MOC Instructions monorepo.

## Table of Contents

- [Programming Paradigm](#programming-paradigm)
- [Root Structure](#root-structure)
- [Applications (apps/)](#applications-apps)
- [Shared Packages (packages/)](#shared-packages-packages)
- [Documentation (docs/)](#documentation-docs)
- [Configuration Files](#configuration-files)
- [Development Workflows](#development-workflows)
- [Import Rules](#import-rules)

## Programming Paradigm

**CRITICAL: This codebase uses functional programming with modern ES7+ syntax.**

| Rule            | Requirement                                                   |
| --------------- | ------------------------------------------------------------- |
| Classes         | **Prohibited** (except Error classes, React Error Boundaries) |
| Arrow Functions | **Preferred**                                                 |
| Barrel Files    | **Prohibited**                                                |
| Direct Imports  | **Required**                                                  |

See `/docs/architecture/coding-standards.md` for full details.

## Root Structure

```
Monorepo/
├── apps/                    # Applications (frontend, backend)
│   ├── api/                 # Serverless API (Serverless Framework)
│   └── web/                 # Frontend applications
│       ├── main-app/        # Main React application
│       └── playwright/      # E2E tests
├── packages/                # Shared packages and libraries
│   ├── core/                # Core frontend/shared packages
│   ├── backend/             # Backend/Lambda utilities
│   ├── dev/                 # Development utilities
│   └── shared/              # Shared types (api-types)
├── docs/                    # Documentation, PRDs, stories, architecture
├── scripts/                 # Build, deployment, and automation scripts
├── shared/                  # Root shared config and infrastructure
├── infrastructure/          # Infrastructure as Code (IAM policies)
├── .bmad-core/              # BMad Method agent definitions
├── __http__/                # HTTP request files for API testing
├── __design__/              # Design documents and proposals
├── turbo/                   # Turborepo generator templates
├── package.json             # Root package.json with workspace scripts
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── turbo.json               # Turborepo pipeline configuration
├── tsconfig.json            # Root TypeScript configuration
├── eslint.config.js         # ESLint 9 configuration
└── vitest.config.ts         # Root Vitest test configuration
```

## Applications (apps/)

### Directory Structure

```
apps/
├── api/                     # Serverless API (Serverless Framework)
│   ├── core/                # Core utilities
│   │   ├── auth/            # JWT/Cognito utilities
│   │   ├── cache/           # Redis client
│   │   ├── database/        # Drizzle ORM, schemas
│   │   ├── observability/   # Logging, metrics
│   │   ├── search/          # OpenSearch client
│   │   ├── storage/         # S3 client
│   │   └── utils/           # General utilities
│   ├── endpoints/           # Lambda function handlers
│   │   ├── gallery/         # Gallery CRUD + image upload
│   │   ├── health/          # Health check endpoint
│   │   ├── moc-instructions/ # MOC CRUD
│   │   ├── moc-parts-lists/ # Parts list management
│   │   ├── websocket/       # WebSocket handlers
│   │   └── wishlist/        # Wishlist CRUD + image upload
│   ├── layers/              # Lambda layers
│   │   ├── minimal-layer/   # Minimal dependencies
│   │   ├── standard-layer/  # Standard dependencies
│   │   └── processing-layer/ # Image processing
│   ├── stacks/              # Infrastructure stacks
│   │   ├── functions/       # Lambda function definitions
│   │   └── infrastructure/  # VPC, RDS, etc.
│   ├── gateway/             # API Gateway configuration
│   ├── serverless.yml       # Serverless Framework config
│   ├── drizzle.config.ts    # Drizzle ORM configuration
│   └── package.json
└── web/
    ├── main-app/            # Main React application
    └── playwright/          # E2E tests with Playwright
```

### Backend API (apps/api/)

Serverless API built with Serverless Framework.

```
apps/api/
├── core/                    # Shared core utilities
│   ├── auth/                # JWT verification, Cognito integration
│   ├── cache/               # Redis client with connection pooling
│   ├── database/            # Drizzle ORM client and schemas
│   ├── observability/       # Winston logging, CloudWatch metrics
│   ├── search/              # OpenSearch client
│   ├── storage/             # S3 client for file operations
│   └── utils/               # General utilities, error handling
├── endpoints/               # Lambda function handlers by domain
│   ├── gallery/             # Image gallery CRUD
│   ├── health/              # Health check
│   ├── moc-instructions/    # MOC instructions CRUD
│   ├── moc-parts-lists/     # Parts list management
│   ├── websocket/           # Real-time WebSocket handlers
│   └── wishlist/            # Wishlist CRUD
├── layers/                  # Lambda layers for shared dependencies
├── stacks/                  # CloudFormation stacks
├── serverless.yml           # Main Serverless Framework configuration
└── drizzle.config.ts        # Database migrations config
```

**Purpose**: Serverless API with domain-driven organization.

**Technology**: Serverless Framework, AWS Lambda, API Gateway v2, Drizzle ORM, PostgreSQL (RDS), Redis (ElastiCache), OpenSearch, S3

**Endpoints**:

- `/health` - Health check
- `/api/mocs/*` - MOC instructions CRUD
- `/api/gallery/*` - Gallery CRUD + image upload
- `/api/wishlist/*` - Wishlist CRUD + image upload
- `/ws` - WebSocket for real-time updates

### Frontend Application (apps/web/main-app/)

Main React application for LEGO MOC instructions.

```
apps/web/main-app/
├── src/
│   ├── components/          # React components
│   │   ├── Auth/            # Authentication components
│   │   ├── Cache/           # Caching components
│   │   ├── Dashboard/       # Dashboard components
│   │   ├── ErrorBoundary/   # Error handling
│   │   ├── Layout/          # Layout components (Header, Sidebar, Footer)
│   │   └── Navigation/      # Navigation components
│   ├── routes/              # TanStack Router routes
│   │   ├── pages/           # Page components
│   │   ├── modules/         # Lazy-loaded feature modules
│   │   └── index.ts         # Route definitions
│   ├── store/               # Redux store
│   │   ├── slices/          # Redux slices (auth, navigation, theme, etc.)
│   │   └── store.ts         # Store configuration
│   ├── services/            # Service layer
│   │   └── auth/            # Authentication service (Amplify)
│   ├── lib/                 # Utility libraries
│   ├── hooks/               # Custom React hooks
│   ├── config/              # App configuration
│   ├── styles/              # Global styles
│   ├── test/                # Test utilities and setup
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Root App component
│   └── main.tsx             # Entry point
├── public/                  # Public assets
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── package.json
```

**Purpose**: User-facing application for LEGO MOC instructions.

**Technology**: React 19, TanStack Router, Redux Toolkit, RTK Query, Tailwind CSS, Vite, AWS Amplify

**Port**: 3000

**Features**:

- MOC instructions browsing and management
- User authentication (Cognito via Amplify)
- Image gallery and wishlist
- LEGO-inspired design system (sky/teal theme)
- Responsive layout with mobile sidebar

### E2E Tests (apps/web/playwright/)

Playwright end-to-end tests.

```
apps/web/playwright/
├── tests/                   # Playwright test files
├── scripts/                 # Test helper scripts
├── playwright.config.ts     # Playwright configuration
└── package.json
```

**Technology**: Playwright

## Shared Packages (packages/)

### Directory Structure

```
packages/
├── core/                    # Core frontend/shared packages
│   ├── app-component-library/  # Radix UI components (@repo/ui)
│   ├── api-client/          # API client with RTK Query (@repo/api-client)
│   ├── logger/              # Logging utilities (@repo/logger)
│   ├── cache/               # Client-side caching (@repo/cache)
│   ├── upload/              # File upload components (@repo/upload)
│   ├── accessibility/       # Accessibility utilities
│   ├── charts/              # Chart components
│   ├── design-system/       # Design tokens
│   ├── file-list/           # File display component
│   └── gallery/             # Gallery components
├── backend/                 # Backend/Lambda utilities
│   ├── db/                  # Database utilities (@repo/db)
│   ├── file-validator/      # Universal file validation (@monorepo/file-validator)
│   ├── lambda-auth/         # Lambda authentication (@repo/lambda-auth)
│   ├── lambda-utils/        # Lambda utilities (@repo/lambda-utils)
│   ├── lambda-responses/    # Standardized Lambda responses
│   ├── s3-client/           # S3 client wrapper (@repo/s3-client)
│   ├── cognito-client/      # Cognito client wrapper
│   ├── search/              # Search utilities
│   ├── rate-limiter/        # Rate limiting utilities
│   ├── pii-sanitizer/       # PII data sanitization
│   ├── image-processing/    # Image processing utilities
│   └── mock-data/           # Mock data generators
├── dev/                     # Development utilities
│   └── tech-radar/          # Technology radar
└── shared/                  # Shared types and contracts
    └── api-types/           # Shared API type definitions
```

### Core Packages

#### @repo/ui

25+ Radix UI-based components with full accessibility. LEGO-inspired design system.

**Usage**:

```typescript
// ✅ REQUIRED - Import from package
import { Button, Card, Dialog, Table } from '@repo/ui'

// ❌ PROHIBITED - Individual path imports
import { Button } from '@repo/ui/button'
```

#### @repo/api-client

RTK Query-based API client with Cognito authentication.

**Features**:

- RTK Query endpoints for all API resources
- Automatic token refresh
- Request/response interceptors
- Type-safe API calls

#### @repo/logger

Centralized logging utility. **NEVER use console.log**.

**Usage**:

```typescript
import { logger } from '@repo/logger'

logger.info('User action', { userId, action })
logger.error('API failed', { error, endpoint })
```

#### @repo/cache

Client-side caching utilities with IndexedDB and memory cache.

#### @repo/upload

File and image upload components with drag-and-drop, progress tracking, validation, and image processing.

**Location**: `packages/core/upload/`

**Components**: Upload, UploadArea, UploadModal, FilePreview, ProgressIndicator

**Hooks**: useUpload, useUploadProgress, useImageProcessing, useFileValidation, useDragAndDrop

### Backend Packages

#### @repo/db

Drizzle ORM database utilities and schema definitions.

#### @monorepo/file-validator

Universal file validation that works on both frontend and backend.

**Usage**:

```typescript
import { validateFile, createImageValidationConfig } from '@monorepo/file-validator'

const config = createImageValidationConfig()
const result = validateFile(file, config)
```

#### @repo/lambda-auth

Lambda authentication utilities for JWT verification and Cognito integration.

#### @repo/lambda-utils

Common Lambda utilities including response formatters and error handling.

## Documentation (docs/)

### Structure

```
docs/
├── architecture/            # Architecture documentation
│   ├── coding-standards.md  # Coding standards and style guide
│   ├── tech-stack.md        # Technology stack overview
│   └── source-tree.md       # This file
├── stories/                 # User stories for development
│   ├── 1.1.*.md             # Epic 1 stories
│   ├── 1.2.*.md
│   └── ...
├── prd/                     # Product requirement documents
├── qa/                      # QA documentation
│   └── gates/               # Quality gate decisions
└── prompts/                 # AI prompt templates
```

### Key Documents

- **coding-standards.md**: Full coding standards, functional programming rules, ES7+ syntax
- **tech-stack.md**: Technology stack with versions and rationale
- **source-tree.md**: This file - directory structure documentation

## Configuration Files

### Root Level

| File                  | Purpose                          |
| --------------------- | -------------------------------- |
| `package.json`        | Root workspace scripts           |
| `pnpm-workspace.yaml` | pnpm workspace packages          |
| `turbo.json`          | Turborepo pipeline configuration |
| `tsconfig.json`       | Root TypeScript configuration    |
| `eslint.config.js`    | ESLint 9 configuration           |
| `vitest.config.ts`    | Root Vitest configuration        |
| `.prettierrc`         | Prettier formatting rules        |

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'apps/api/*'
  - 'apps/web/*'
  - 'packages/shared/*'
  - 'packages/core/*'
  - 'packages/features/*'
  - 'packages/backend/*'
  - 'packages/dev/*'
```

### Environment Configuration

Root `.env` contains centralized environment variables:

```bash
# Ports
FRONTEND_PORT=3000

# Database
POSTGRESQL_HOST=localhost
POSTGRESQL_DATABASE=lego_projects

# AWS
AWS_REGION=us-east-1
AWS_PROFILE=lego-moc

# Cognito
COGNITO_USER_POOL_ID=xxx
COGNITO_CLIENT_ID=xxx
```

## Development Workflows

### Running Services

```bash
# Start main app
pnpm --filter main-app dev

# Start with specific port
pnpm --filter main-app dev -- --port 3000

# Build for production
pnpm --filter main-app build

# Type checking
pnpm --filter main-app exec tsc --noEmit
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter main-app test

# Run with coverage
pnpm --filter main-app exec vitest run --coverage

# E2E tests
pnpm --filter playwright test
```

### Adding Dependencies

```bash
# To specific package
pnpm --filter @repo/ui add lucide-react

# To root (monorepo-wide dev deps)
pnpm add -Dw @types/node

# To multiple packages
pnpm --filter "@repo/*" add zod
```

## Import Rules

### Required Patterns

```typescript
// ✅ Package imports
import { Button, Card } from '@repo/ui'
import { logger } from '@repo/logger'
import { validateFile } from '@monorepo/file-validator'

// ✅ Direct file imports (no barrels)
import { UserProfile } from '@/components/UserProfile'
import { authSlice } from '@/store/slices/authSlice'

// ✅ Path alias imports
import { formatDate } from '@/lib/date-utils'
```

### Prohibited Patterns

```typescript
// ❌ Individual component paths
import { Button } from '@repo/ui/button'

// ❌ Barrel imports
import { components } from '@/components'
import { slices } from '@/store/slices'

// ❌ Console logging
console.log('debug') // Use logger.debug() instead

// ❌ Classes for services
class UserService {} // Use factory functions instead
```

## Key Principles

1. **Functional Programming**: Pure functions, closures, composition - no classes
2. **Arrow Functions**: Preferred for all non-component functions
3. **No Barrel Files**: Import directly from source files
4. **TypeScript Strict**: No `any` types, strict null checks
5. **Zod Validation**: Prefer Zod schemas over TypeScript interfaces
6. **RTK Query**: Use for all data fetching, no raw fetch/axios
7. **@repo/logger**: Never use console.log
8. **@repo/ui**: Single import for all UI components

## Resources

- **Coding Standards**: `/docs/architecture/coding-standards.md`
- **Tech Stack**: `/docs/architecture/tech-stack.md`
- **BMad Agents**: `/.bmad-core/agents/`

---

**Last Updated**: 2025-12-08
**Version**: 2.1
