# Source Tree Structure

This document explains the directory structure and organization of the LEGO MOC Instructions monorepo.

## Table of Contents

- [Root Structure](#root-structure)
- [Applications (apps/)](#applications-apps)
- [Shared Packages (packages/)](#shared-packages-packages)
- [Documentation (docs/)](#documentation-docs)
- [Configuration Files](#configuration-files)
- [Development Workflows](#development-workflows)

## Root Structure

```
Monorepo/
├── apps/                    # Applications (frontend, backend, e2e tests)
├── packages/                # Shared packages and libraries
├── docs/                    # Documentation, PRDs, stories, architecture
├── scripts/                 # Build, deployment, and automation scripts
├── shared/                  # Shared configuration (env-loader, errors)
├── infrastructure/          # Infrastructure as Code (IAM policies)
├── __tests__/              # Root-level test utilities and mocks
├── __http__/               # HTTP request files for API testing
├── __design__/             # Design documents and proposals
├── logs/                   # Application logs (local development)
├── turbo/                  # Turborepo generator templates
├── CLAUDE.md               # AI assistant instructions
├── package.json            # Root package.json with workspace scripts
├── pnpm-workspace.yaml     # pnpm workspace configuration
├── turbo.json              # Turborepo pipeline configuration
├── tsconfig.json           # Root TypeScript configuration
└── vitest.config.ts        # Root Vitest test configuration
```

## Applications (apps/)

### Directory Structure

```
apps/
├── api/                    # Backend services
│   ├── auth-service-cognito/     # Cognito authentication (CDK)
│   ├── lego-api-serverless/      # Serverless API (SST v3)
│   └── lego-projects-api/        # Traditional Express API
├── web/                    # Frontend applications
│   ├── lego-moc-instructions-app/ # Main React app
│   └── storybook/                 # Component documentation
├── e2e/                    # End-to-end tests
└── infrastructure/         # Shared infrastructure
    └── shared-services/
```

### Backend Services

#### auth-service-cognito/

AWS Cognito authentication service deployed with CDK.

```
auth-service-cognito/
├── infrastructure/         # CDK infrastructure code
│   ├── lib/               # CDK constructs
│   └── bin/               # CDK app entry point
├── src/                   # Lambda functions (if any)
├── package.json
└── tsconfig.json
```

**Purpose**: Manages user authentication, registration, email verification, password reset.

**Technology**: AWS CDK, AWS Cognito, Lambda

**Port**: N/A (AWS managed service)

#### lego-api-serverless/

Serverless API built with SST v3 (Ion).

```
lego-api-serverless/
├── src/
│   ├── functions/         # Lambda function handlers
│   │   ├── health.ts                    # Health check
│   │   ├── moc-instructions.ts          # MOC CRUD
│   │   ├── moc-file-upload.ts          # File uploads
│   │   ├── moc-file-download.ts        # File downloads
│   │   ├── gallery.ts                  # Gallery CRUD + image upload
│   │   └── wishlist.ts                 # Wishlist CRUD + image upload
│   ├── lib/               # Shared utilities
│   │   ├── auth/          # JWT utilities
│   │   ├── db/            # Database client (Drizzle)
│   │   ├── storage/       # S3 client
│   │   ├── cache/         # Redis client
│   │   ├── search/        # OpenSearch client
│   │   ├── services/      # Business logic (image processing)
│   │   ├── utils/         # General utilities
│   │   └── validation/    # Zod schemas
│   └── db/
│       └── schema/        # Drizzle schema definitions
├── sst.config.ts          # SST infrastructure configuration
├── drizzle.config.ts      # Drizzle ORM configuration
├── package.json
└── tsconfig.json
```

**Purpose**: Serverless migration of LEGO Projects API with improved scalability.

**Technology**: SST v3, AWS Lambda, API Gateway v2, Drizzle ORM, PostgreSQL, Redis, OpenSearch, S3

**Endpoints**:
- `/health` - Health check
- `/api/mocs/*` - MOC instructions CRUD
- `/api/images/*` - Gallery CRUD + upload
- `/api/albums/*` - Album management
- `/api/wishlist/*` - Wishlist CRUD + upload

#### lego-projects-api/

Traditional Express.js API (original implementation).

```
lego-projects-api/
├── src/
│   ├── controllers/       # Route controllers
│   ├── models/            # Database models
│   ├── routes/            # Express routes
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── config/            # Configuration
│   └── index.ts           # Express app entry point
├── package.json
└── tsconfig.json
```

**Purpose**: Original Express API (being migrated to serverless).

**Technology**: Express, MongoDB/Mongoose, PostgreSQL/Drizzle, Redis, Elasticsearch, S3

**Port**: 9000

### Frontend Applications

#### lego-moc-instructions-app/

Main React application for LEGO MOC instructions.

```
lego-moc-instructions-app/
├── src/
│   ├── routes/            # TanStack Router routes
│   │   ├── __root.tsx     # Root route layout
│   │   ├── index.tsx      # Home page
│   │   ├── login.tsx      # Login page
│   │   └── ...
│   ├── components/        # React components
│   │   ├── layout/        # Layout components
│   │   ├── common/        # Shared components
│   │   └── ...
│   ├── store/             # Redux store
│   │   ├── store.ts       # Store configuration
│   │   └── slices/        # Redux slices
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── styles/            # Global styles, Tailwind
│   ├── assets/            # Static assets
│   ├── App.tsx            # App component
│   └── main.tsx           # Entry point
├── public/                # Public assets
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── package.json
└── tsconfig.json
```

**Purpose**: User-facing application for browsing, creating, and managing LEGO MOC instructions.

**Technology**: React 19, TanStack Router, Redux Toolkit, RTK Query, Tailwind CSS, Vite

**Port**: 3002 (dev server may use 5173)

**Features**:
- MOC instructions browsing and management
- User authentication (Cognito)
- File uploads (instructions, images)
- Gallery and wishlist management
- User profiles with avatars
- PWA support (offline capabilities)

#### storybook/

Component documentation and development environment.

```
storybook/
├── stories/               # Storybook stories
│   ├── components/        # Component stories
│   └── ...
├── .storybook/            # Storybook configuration
│   ├── main.ts            # Main config
│   └── preview.ts         # Preview config
├── package.json
└── tsconfig.json
```

**Purpose**: Document and develop UI components in isolation.

**Technology**: Storybook 8, React 19, TypeScript

**Port**: 6007 (dev), 6008 (preview)

### End-to-End Tests

#### e2e/

Playwright end-to-end tests with Gherkin syntax.

```
e2e/
├── features/              # Gherkin feature files
│   ├── auth/
│   │   ├── login.feature
│   │   └── signup.feature
│   └── ...
├── step-definitions/      # Step implementations
│   ├── auth-steps.ts
│   └── ...
├── tests/                 # Playwright test files
├── playwright.config.ts   # Playwright configuration
└── package.json
```

**Purpose**: Automated end-to-end testing across the application.

**Technology**: Playwright, Cucumber (Gherkin)

**Critical Rule**: All E2E tests must use `.feature` files with Gherkin syntax.

## Shared Packages (packages/)

### Directory Structure

```
packages/
├── core/                  # Core infrastructure packages
│   ├── ui/                # Radix UI components (25+)
│   ├── accessibility/     # Accessibility utilities
│   ├── cache/             # Client-side caching
│   ├── charts/            # Chart components
│   ├── design-system/     # Design tokens
│   ├── file-list/         # File display component
│   └── logger/            # Logging utilities
├── features/              # Feature-specific packages
│   ├── gallery/           # Gallery features
│   ├── moc-instructions/  # MOC instruction features
│   ├── profile/           # User profile features
│   └── wishlist/          # Wishlist features
├── tools/                 # Development tools
│   ├── file-validator/    # Universal file validation
│   ├── upload/            # File upload utilities
│   └── mock-data/         # Mock data generators
└── dev/                   # Development utilities
    └── tech-radar/        # Technology radar
```

### Package Structure (Example: @repo/ui)

```
packages/core/ui/
├── src/
│   ├── components/        # React components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── ...
│   ├── hooks/             # React hooks
│   ├── utils/             # Utility functions
│   └── index.ts           # Main export
├── package.json
├── tsconfig.json
├── vite.config.ts         # For building
└── README.md
```

### Core Packages

#### @repo/ui

25+ Radix UI-based components with full accessibility.

**Components**: Button, Dialog, Dropdown, Select, Toast, Tooltip, etc.

**Usage**:
```typescript
import { Button, Dialog } from '@repo/ui'
```

#### @repo/upload

File and image upload components with drag-and-drop, validation, and compression.

**Features**:
- Drag-and-drop file upload
- File type validation
- Image compression
- Progress tracking
- Preview generation

#### @repo/file-list

Generic file display component for showing uploaded files.

#### @repo/cache

Client-side caching utilities for improved performance.

### Feature Packages

#### @repo/moc-instructions

MOC-specific features including forms, validation, and display components.

#### @repo/gallery

Image gallery components with filtering, sorting, and album management.

#### @repo/wishlist

Wishlist management features and components.

#### @repo/profile

User profile components including avatar upload and profile editing.

### Tool Packages

#### @monorepo/file-validator

Universal file validation that works on both frontend and backend.

**Features**:
- MIME type validation
- File size limits
- Extension validation
- Shared validation config

**Usage**:
```typescript
import { validateFile, createImageValidationConfig } from '@monorepo/file-validator'

const config = createImageValidationConfig()
const result = validateFile(file, config)
```

## Documentation (docs/)

### Structure

```
docs/
├── architecture/          # Architecture documentation
│   ├── coding-standards.md
│   ├── tech-stack.md
│   └── source-tree.md
├── stories/               # User stories for development
│   ├── 3.5-create-wishlist-lambda-handler.md
│   ├── 3.6-wishlist-crud-operations.md
│   └── ...
├── prd/                   # Product requirement documents
├── sst-migration-prd/     # SST migration epics and stories
│   ├── epic-1-*.md
│   ├── epic-2-*.md
│   └── ...
├── qa/                    # QA documentation
│   └── gates/             # Quality gate decisions
└── sst-migration-architecture/  # Serverless architecture docs
```

### Key Documents

- **CLAUDE.md**: Instructions for AI assistants working on the codebase
- **docs/architecture/**: System architecture and design documents
- **docs/stories/**: Development stories with acceptance criteria
- **docs/prd/**: Product requirements and feature specifications
- **docs/qa/gates/**: Quality gate assessments from reviews

## Configuration Files

### Root Level

#### package.json

Root package.json with workspace scripts.

**Key Scripts**:
```json
{
  "scripts": {
    "dev": "Start entire development stack",
    "build": "Build all packages",
    "test": "Run all tests",
    "lint": "Lint all code",
    "check-types": "Type check all packages"
  }
}
```

#### pnpm-workspace.yaml

Defines workspace packages for pnpm.

```yaml
packages:
  - 'apps/*'
  - 'apps/api/*'
  - 'apps/web/*'
  - 'packages/core/*'
  - 'packages/features/*'
  - 'packages/tools/*'
  - 'packages/dev/*'
```

#### turbo.json

Turborepo pipeline configuration for build caching and task orchestration.

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "check-types": {}
  }
}
```

#### tsconfig.json

Root TypeScript configuration with shared settings.

**Key Settings**:
- `strict: true` - Strict type checking
- Path aliases for `@repo/*` and `@monorepo/*`
- ES2022 target
- ESNext modules

### Environment Configuration

#### Root .env

Centralized environment variables (not committed).

**Key Variables**:
```bash
# Ports (DO NOT CHANGE)
FRONTEND_PORT=3002
LEGO_API_PORT=9000
POSTGRESQL_PORT=5432
REDIS_PORT=6379
ELASTICSEARCH_PORT=9200

# Database
POSTGRESQL_HOST=localhost
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=password
POSTGRESQL_DATABASE=lego_projects

# AWS
AWS_REGION=us-east-1
AWS_PROFILE=lego-moc

# Cognito
COGNITO_USER_POOL_ID=xxx
COGNITO_CLIENT_ID=xxx
```

#### shared/config/env-loader.js

Centralized environment loader that:
- Automatically detects service type
- Assigns correct PORT based on service type
- Maps centralized vars to legacy variable names
- Validates port configuration

**Usage**: Imported first in every service's entry point.

## Development Workflows

### Creating New Packages

Use Turborepo generators:

```bash
pnpm turbo gen           # Interactive generator
pnpm gen:package         # Create new package
pnpm gen:component       # Create component with stories/tests
pnpm gen:api             # Create API service
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

### Running Services

```bash
# Start entire stack
pnpm dev

# Start specific services
pnpm dev:web             # Frontend only
pnpm dev:api             # API services only

# View logs
pnpm logs:lego           # LEGO API logs
pnpm logs:auth           # Auth service logs
```

### Testing

```bash
# All tests
pnpm test

# Specific package tests
pnpm --filter @repo/ui test

# E2E tests
pnpm test:e2e
pnpm test:e2e:headed     # With browser visible
```

### Building

```bash
# Build all
pnpm build

# Build specific package
pnpm --filter lego-moc-instructions-app build

# Type checking
pnpm check-types
```

## File Naming Conventions

### Source Files

- **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `api-client.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Stories**: `*.stories.tsx`
- **Types**: `*.types.ts`
- **Schemas**: `*-schemas.ts` (Zod schemas)

### Configuration Files

- **TypeScript**: `tsconfig.json`
- **Vite**: `vite.config.ts`
- **Tailwind**: `tailwind.config.js`
- **ESLint**: `eslint.config.js`
- **Vitest**: `vitest.config.ts`

## Import Path Aliases

Configured in `tsconfig.json`:

```typescript
// ✅ Internal package imports
import { Button } from '@repo/ui'
import { uploadFile } from '@repo/upload'
import { validateFile } from '@monorepo/file-validator'

// ✅ App-level imports (varies by app)
import { logger } from '@/lib/logger'
import { db } from '@/lib/db/client'
```

## Key Principles

1. **Reuse over reinvention**: Always search `packages/` before creating new utilities
2. **Shared packages for common functionality**: Extract code that appears 2+ times
3. **Centralized environment configuration**: All env vars in root `.env`
4. **TypeScript-only codebase**: No JavaScript files (except required configs)
5. **Zod schemas for validation**: Prefer Zod schemas + inferred types over manual types
6. **Type-safe with strict mode**: No `any` types allowed
7. **RTK Query for data fetching**: No axios/fetch in feature code
8. **TanStack Router for routing**: Do not introduce alternatives

## Resources

- **Monorepo Guide**: `/CLAUDE.md`
- **Coding Standards**: `/docs/architecture/coding-standards.md`
- **Tech Stack**: `/docs/architecture/tech-stack.md`
- **Development Guidelines**: `/packages/DEVELOPMENT_GUIDELINES.md`
- **Migration Guide**: `/packages/MIGRATION_GUIDE.md`

---

**Last Updated**: 2025-11-02
**Version**: 1.0
