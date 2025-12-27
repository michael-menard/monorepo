# API Design and Integration

## API Integration Strategy

**API Integration Strategy:** Migrate existing RTK Query endpoints to serverless architecture while maintaining all current functionality and data contracts
**Authentication:** Preserve existing AWS Cognito JWT token injection with enhanced serverless endpoint support
**Versioning:** Maintain API compatibility during migration with gradual endpoint transition

## New API Endpoints

### Enhanced Gallery API

- **Method:** GET
- **Endpoint:** `/api/v2/gallery/search`
- **Purpose:** Enhanced gallery search with improved filtering and performance optimization for serverless
- **Integration:** Replaces existing gallery search with enhanced capabilities

#### Request

```json
{
  "query": "string",
  "filters": {
    "category": "string",
    "difficulty": "string",
    "piece_count_range": [100, 500],
    "tags": ["string"]
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "sort": {
    "field": "created_at",
    "direction": "desc"
  }
}
```

#### Response

```json
{
  "items": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "image_url": "string",
      "creator": {
        "id": "string",
        "username": "string",
        "avatar_url": "string"
      },
      "metadata": {
        "difficulty": "string",
        "piece_count": 150,
        "tags": ["string"],
        "created_at": "2024-11-24T00:00:00Z"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "has_next": true
  },
  "performance": {
    "query_time_ms": 45,
    "cache_hit": true
  }
}
```

### Enhanced Wishlist API

- **Method:** POST
- **Endpoint:** `/api/v2/wishlist/items`
- **Purpose:** Add items to wishlist with enhanced organization and sharing capabilities
- **Integration:** Extends existing wishlist functionality with new features

#### Request

```json
{
  "moc_id": "string",
  "category": "string",
  "priority": "high|medium|low",
  "notes": "string",
  "tags": ["string"]
}
```

#### Response

````json
{
  "id": "string",
  "moc_id": "string",
  "category": "string",
  "priority": "high",
  "notes": "string",
  "tags": ["string"],
  "added_at": "2024-11-24T00:00:00Z",
  "moc_details": {
    "title": "string",
    "image_url": "string",
    "creator": "string"
  }
}
```

### MOC Upload Session API (Multipart Uploads)

Large file uploads (up to 50MB) use a session-based multipart upload flow. This enables reliable uploads of large PDFs without timeout failures.

#### Configuration

| Setting           | Value   | Description                             |
| ----------------- | ------- | --------------------------------------- |
| Part Size         | 5 MB    | Each chunk uploaded via `uploadPart`    |
| Session TTL       | 15 min  | Time before session expires             |
| Max PDF Size      | 50 MB   | Maximum instruction file size           |
| Rate Limit        | 100/day | Sessions created per user per day       |
| Finalize Lock TTL | 5 min   | Idempotency window for finalize         |

#### Upload Session Flow

```
1. POST /api/mocs/uploads/sessions
   → Create session, validate file metadata
   → Returns: sessionId, partSizeBytes (5MB), expiresAt

2. POST /api/mocs/uploads/sessions/{sessionId}/files
   → Register file, initiate S3 multipart upload
   → Returns: fileId, uploadId, s3Key

3. PUT /api/mocs/uploads/sessions/{sessionId}/files/{fileId}/parts/{n}
   → Upload 5MB chunk (binary body)
   → Returns: partNumber, etag
   → Repeat for all chunks

4. POST /api/mocs/uploads/sessions/{sessionId}/files/{fileId}/complete
   → Complete S3 multipart upload
   → Verifies all parts present

5. POST /api/mocs/uploads/sessions/{sessionId}/finalize
   → Verify files in S3, magic bytes validation
   → Create MOC record in database
   → Returns: mocId, slug, status (idempotent)
```

#### 1. Create Session

- **Method:** POST
- **Endpoint:** `/api/mocs/uploads/sessions`
- **Auth:** Required (Cognito JWT)
- **Rate Limit:** 100/day per user

##### Request

```json
{
  "files": [
    {
      "category": "instruction",
      "name": "instructions.pdf",
      "size": 52428800,
      "type": "application/pdf",
      "ext": "pdf"
    }
  ]
}
```

##### Response (201)

```json
{
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "partSizeBytes": 5242880,
    "expiresAt": "2024-12-09T12:15:00Z"
  }
}
```

#### 2. Register File

- **Method:** POST
- **Endpoint:** `/api/mocs/uploads/sessions/{sessionId}/files`
- **Auth:** Required

##### Request

```json
{
  "category": "instruction",
  "name": "instructions.pdf",
  "size": 52428800,
  "type": "application/pdf"
}
```

##### Response (201)

```json
{
  "data": {
    "fileId": "file-uuid",
    "uploadId": "s3-multipart-upload-id",
    "s3Key": "uploads/user-id/session-id/file-id/instructions.pdf"
  }
}
```

#### 3. Upload Part

- **Method:** PUT
- **Endpoint:** `/api/mocs/uploads/sessions/{sessionId}/files/{fileId}/parts/{partNumber}`
- **Auth:** Required
- **Body:** Binary chunk data (5MB)

##### Response (200)

```json
{
  "data": {
    "partNumber": 1,
    "etag": "\"abc123def456\""
  }
}
```

#### 4. Complete File

- **Method:** POST
- **Endpoint:** `/api/mocs/uploads/sessions/{sessionId}/files/{fileId}/complete`
- **Auth:** Required

##### Request

```json
{
  "parts": [
    { "partNumber": 1, "etag": "\"abc123\"" },
    { "partNumber": 2, "etag": "\"def456\"" }
  ]
}
```

##### Response (200)

```json
{
  "data": {
    "fileId": "file-uuid",
    "fileUrl": "https://s3.amazonaws.com/bucket/path/file.pdf"
  }
}
```

#### 5. Finalize Session

- **Method:** POST
- **Endpoint:** `/api/mocs/uploads/sessions/{sessionId}/finalize`
- **Auth:** Required
- **Idempotent:** Yes (safe to retry)

##### Request

```json
{
  "uploadSessionId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My LEGO MOC",
  "description": "Optional description",
  "tags": ["spaceship", "sci-fi"]
}
```

##### Response (201)

```json
{
  "data": {
    "mocId": "moc-uuid",
    "slug": "my-lego-moc",
    "status": "published",
    "title": "My LEGO MOC",
    "idempotent": false
  }
}
```

#### Error Responses

| Code | Error                  | Description                           |
| ---- | ---------------------- | ------------------------------------- |
| 400  | BAD_REQUEST            | Invalid request body or parameters    |
| 401  | UNAUTHORIZED           | Missing or invalid JWT token          |
| 404  | NOT_FOUND              | Session or file not found             |
| 409  | CONFLICT               | Slug already exists                   |
| 413  | PAYLOAD_TOO_LARGE      | File exceeds size limit               |
| 415  | UNSUPPORTED_MEDIA_TYPE | Invalid MIME type                     |
| 422  | VALIDATION_ERROR       | Schema validation failed              |
| 429  | TOO_MANY_REQUESTS      | Daily rate limit exceeded             |

# Source Tree

## Existing Project Structure
```plaintext
apps/web/lego-moc-instructions-app/
├── src/
│   ├── pages/                          # Current monolithic pages (to be extracted)
│   │   ├── HomePage/
│   │   ├── InspirationGallery/         # → gallery-app
│   │   ├── WishlistGalleryPage/        # → wishlist-app
│   │   ├── MocInstructionsGallery/     # → moc-instructions-app
│   │   └── ProfilePage/                # → profile-app
│   ├── routes/                         # TanStack Router (to be restructured)
│   ├── components/                     # Mixed components (to be organized)
│   ├── services/                       # API services (to be enhanced)
│   └── store/                          # Redux store (to be modularized)
packages/
├── features/                           # Already modular (perfect alignment!)
│   ├── gallery/                        # → gallery-app foundation
│   ├── wishlist/                       # → wishlist-app foundation
│   ├── moc-instructions/               # → moc-instructions-app foundation
│   └── profile/                        # → profile-app foundation
├── core/
│   ├── ui/                             # → enhanced shared components
│   └── design-system/                  # → expanded design system
````

## New File Organization

```plaintext
apps/web/
├── main-app/                           # New shell application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/                 # Unified layout components
│   │   │   ├── Navigation/             # Enhanced navigation
│   │   │   └── ErrorBoundary/          # Global error handling
│   │   ├── routes/                     # Module routing coordination
│   │   ├── services/
│   │   │   ├── auth/                   # Centralized auth management
│   │   │   ├── api/                    # Enhanced API client
│   │   │   └── analytics/              # Performance tracking
│   │   ├── store/                      # Shared store configuration
│   │   └── App.tsx                     # Main shell app entry
│   └── package.json                    # Shell app dependencies
├── gallery-app/                        # Extracted gallery module
│   ├── src/
│   │   ├── components/                 # Gallery-specific components
│   │   ├── pages/                      # Gallery pages
│   │   ├── services/                   # Gallery API services
│   │   ├── store/                      # Gallery state management
│   │   └── App.tsx                     # Gallery app entry
│   └── package.json                    # Gallery dependencies
├── wishlist-app/                       # Extracted wishlist module
│   ├── src/
│   │   ├── components/                 # Wishlist-specific components
│   │   ├── pages/                      # Wishlist pages
│   │   ├── services/                   # Wishlist API services
│   │   ├── store/                      # Wishlist state management
│   │   └── App.tsx                     # Wishlist app entry
│   └── package.json                    # Wishlist dependencies
├── moc-instructions-app/               # Extracted MOC module
│   ├── src/
│   │   ├── components/                 # MOC-specific components
│   │   ├── pages/                      # MOC pages
│   │   ├── services/                   # MOC API services
│   │   ├── store/                      # MOC state management
│   │   └── App.tsx                     # MOC app entry
│   └── package.json                    # MOC dependencies
├── profile-app/                        # Extracted profile module
│   ├── src/
│   │   ├── components/                 # Profile-specific components
│   │   ├── pages/                      # Profile pages
│   │   ├── services/                   # Profile API services
│   │   ├── store/                      # Profile state management
│   │   └── App.tsx                     # Profile app entry
│   └── package.json                    # Profile dependencies
└── shared-components/                  # Enhanced shared library
    ├── src/
    │   ├── components/                 # Enhanced UI components
    │   ├── design-system/              # Comprehensive design system
    │   ├── hooks/                      # Shared React hooks
    │   ├── utils/                      # Utility functions
    │   ├── types/                      # Shared TypeScript types
    │   └── index.ts                    # Centralized exports
    └── package.json                    # Shared component dependencies

packages/
├── core/
│   ├── ui-enhanced/                    # Enhanced UI components
│   │   ├── components/                 # Modern, accessible components
│   │   ├── themes/                     # Theme system
│   │   ├── animations/                 # Animation utilities
│   │   └── accessibility/              # A11y utilities
│   ├── api-client/                     # Enhanced serverless API client
│   │   ├── client/                     # Base API client
│   │   ├── retry/                      # Retry logic
│   │   ├── cache/                      # Enhanced caching
│   │   └── types/                      # API type definitions
│   └── performance/                    # Performance monitoring
│       ├── metrics/                    # Performance metrics
│       ├── analytics/                  # Usage analytics
│       └── monitoring/                 # Error monitoring
```

## Integration Guidelines

- **File Naming:** Maintain existing kebab-case for files, PascalCase for components
- **Folder Organization:** Follow existing patterns with clear separation between apps, packages, and shared code
- **Import/Export Patterns:** Use centralized exports from packages, maintain existing import patterns for compatibility

# Infrastructure and Deployment Integration

## Existing Infrastructure

**Current Deployment:** SST (Serverless Stack) for AWS deployment with CloudFront distribution and S3 static hosting
**Infrastructure Tools:** AWS CDK through SST, Turborepo for build orchestration, GitHub Actions for CI/CD
**Environments:** Local development, staging, and production with environment-specific configurations

## Enhancement Deployment Strategy

**Deployment Approach:** Maintain single CloudFront distribution with enhanced routing for modular applications. Use SST's existing infrastructure with additional Lambda functions for serverless backend.
**Infrastructure Changes:** Add serverless backend Lambda functions, enhance CloudFront routing rules for module loading, implement module-specific caching strategies
**Pipeline Integration:** Extend existing Turborepo build pipeline with module-specific builds and deployment stages

## Rollback Strategy

**Rollback Method:** Feature flags for gradual module rollout, ability to route traffic back to monolithic version during transition
**Risk Mitigation:** Blue-green deployment for serverless backend, gradual traffic shifting for frontend modules
**Monitoring:** Enhanced CloudWatch monitoring for module performance, error tracking, and user experience metrics

# Coding Standards

## Existing Standards Compliance

**Code Style:** ESLint with TypeScript rules, Prettier for formatting, existing React and TypeScript patterns
**Linting Rules:** Current ESLint configuration with React hooks, TypeScript strict mode, accessibility rules
**Testing Patterns:** Vitest for unit tests, Testing Library for component tests, Playwright for E2E testing
**Documentation Style:** JSDoc comments for functions, README files for packages, inline code comments for complex logic

## Enhancement-Specific Standards

- **Module Boundaries:** Clear separation between modules with defined interfaces and no direct cross-module imports
- **Shared Component Usage:** All modules must use enhanced shared components for consistency
- **API Integration:** Standardized error handling and retry patterns for serverless endpoints
- **Performance Standards:** Bundle size limits per module, loading time targets, accessibility compliance

## Critical Integration Rules

- **Existing API Compatibility:** All new API calls must maintain backward compatibility during transition period
- **Database Integration:** No direct database access from frontend modules, all data through API layer
- **Error Handling:** Consistent error boundaries and user feedback across all modules
- **Logging Consistency:** Structured logging with module identification for debugging and monitoring

# Testing Strategy

## Integration with Existing Tests

**Existing Test Framework:** Vitest with Testing Library for React components, Playwright for end-to-end testing
**Test Organization:** Tests co-located with components, integration tests in dedicated folders, E2E tests in separate directory
**Coverage Requirements:** Maintain current coverage levels (80%+) with enhanced coverage for new components

## New Testing Requirements

### Unit Tests for New Components

- **Framework:** Vitest with Testing Library React
- **Location:** Co-located with components in each module
- **Coverage Target:** 85% for new components, maintain 80%+ overall
- **Integration with Existing:** Extend current test setup with module-specific configurations

### Integration Tests

- **Scope:** Module boundaries, API integration, shared component usage
- **Existing System Verification:** Ensure existing functionality continues working during migration
- **New Feature Testing:** Comprehensive testing of enhanced UX features and serverless integration

### Regression Tests

- **Existing Feature Verification:** Automated tests to ensure no functionality is lost during modular migration
- **Automated Regression Suite:** Enhanced Playwright tests covering all user flows across modules
- **Manual Testing Requirements:** UX testing for design system implementation, accessibility testing with screen readers

# Security Integration

## Existing Security Measures

**Authentication:** AWS Cognito with JWT tokens, automatic token refresh, secure session management
**Authorization:** Role-based access control through Cognito groups, API-level authorization
**Data Protection:** HTTPS everywhere, secure cookie handling, input validation and sanitization
**Security Tools:** AWS security best practices, dependency vulnerability scanning, secure headers

## Enhancement Security Requirements

**New Security Measures:** Enhanced CSP for modular loading, secure module communication, serverless function security
**Integration Points:** Maintain existing authentication across all modules, secure API communication with serverless backend
**Compliance Requirements:** Continue GDPR compliance for user data, accessibility compliance (WCAG 2.1 AA)

## Security Testing

**Existing Security Tests:** Automated dependency scanning, security headers validation, authentication flow testing
**New Security Test Requirements:** Module boundary security testing, serverless endpoint security validation
**Penetration Testing:** Enhanced testing for modular architecture and serverless integration points

# Next Steps

## Story Manager Handoff

For the Story Manager to begin implementation of this comprehensive frontend modernization:

**Reference Documents:** This architecture document, the comprehensive PRD (docs/prd.md), UI/UX specification (docs/front-end-spec.md), and brownfield analysis (docs/brownfield-architecture.md)

**Key Integration Requirements:** Maintain existing AWS Cognito authentication, preserve all current functionality during modular migration, ensure backward compatibility with existing API contracts, implement progressive enhancement for UX improvements

**Existing System Constraints:** Must work within current Turborepo monorepo structure, maintain SST deployment pipeline, preserve existing performance levels while achieving 15% improvement targets

**First Story Implementation:** Begin with Story 1.1 (Enhanced Shared Component Library) as it provides the foundation for all subsequent modular applications. This story has clear integration checkpoints and minimal risk to existing functionality.

**System Integrity Focus:** Each story implementation must include verification that existing functionality continues working, with specific rollback procedures if any issues arise during development.

## Developer Handoff

For developers beginning implementation of the modular architecture:

**Architecture Reference:** This document provides the complete technical blueprint based on actual project analysis, with all integration requirements validated against the existing LEGO MOC Instructions codebase

**Integration Requirements:** Follow existing React 19, TypeScript, and Tailwind CSS patterns while implementing enhanced components. Maintain current ESLint and Prettier configurations. Preserve existing test patterns while adding module-specific testing.

**Key Technical Decisions:** Leverage existing packages/features/ structure for module extraction, build upon current @repo/ui components for enhanced design system, maintain RTK Query patterns while adding serverless optimization

**Compatibility Requirements:** All changes must maintain existing functionality, preserve current authentication flows, and ensure existing user data remains accessible. Implement comprehensive testing at module boundaries to prevent integration issues.

**Implementation Sequencing:** Follow the 11-story sequence defined in the PRD, starting with shared component library enhancement, then shell application, followed by individual module extraction. This sequence minimizes risk to existing functionality while building the foundation for modular architecture.

```

```
