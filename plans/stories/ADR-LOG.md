# Architecture Decision Record Log

This file captures technical architecture decisions to ensure consistency across the codebase and prevent drift between components.

---

## Table of Contents

1. [ADR-001: API Endpoint Path Schema](#adr-001-api-endpoint-path-schema)
2. [ADR-002: Infrastructure-as-Code Strategy](#adr-002-infrastructure-as-code-strategy)
3. [ADR-003: Image Storage and CDN Architecture](#adr-003-image-storage-and-cdn-architecture)
4. [ADR-004: Authentication Architecture](#adr-004-authentication-architecture)
5. [ADR-005: Testing Strategy - UAT Must Use Real Services](#adr-005-testing-strategy---uat-must-use-real-services)
6. [ADR-006: E2E Tests Required in Dev Phase](#adr-006-e2e-tests-required-in-dev-phase)

---

## ADR-001: API Endpoint Path Schema

**Date**: 2026-02-01
**Status**: Active
**Context**: WISH-2004 debugging revealed frontend/backend API path mismatches causing 404 errors.

### Problem

Frontend RTK Query expects paths like `/api/v2/wishlist/items` while backend Hono routes provide `/wishlist`. This mismatch requires either:
- Vite proxy rewrites for local development
- MSW handlers matching frontend paths
- Manual path alignment

### Decision

Establish a canonical API path schema with clear mapping between environments.

### API Path Schema

#### Production (API Gateway)

| Domain | Base Path | Example |
|--------|-----------|---------|
| Wishlist | `/api/v2/wishlist` | `/api/v2/wishlist/items`, `/api/v2/wishlist/items/:id` |
| Gallery | `/api/v2/gallery` | `/api/v2/gallery/images`, `/api/v2/gallery/albums` |
| Sets | `/api/v2/sets` | `/api/v2/sets`, `/api/v2/sets/:id` |
| MOCs | `/api/v2/mocs` | `/api/v2/mocs`, `/api/v2/mocs/:id` |
| Health | `/api/v2/health` | `/api/v2/health` |
| Auth | `/api/v2/auth` | `/api/v2/auth/me`, `/api/v2/auth/refresh` |

#### Local Development (Hono Server - port 3001)

| Domain | Base Path | Example |
|--------|-----------|---------|
| Wishlist | `/wishlist` | `/wishlist`, `/wishlist/:id` |
| Gallery | `/gallery` | `/gallery/images`, `/gallery/albums` |
| Sets | `/sets` | `/sets`, `/sets/:id` |
| MOCs | `/mocs` | `/mocs`, `/mocs/:id` |
| Health | `/health` | `/health` |
| Auth | `/auth` | `/auth/me`, `/auth/refresh` |

### Path Mapping Strategy

#### Option A: Vite Proxy (Recommended for Live API Testing)

```typescript
// apps/web/main-app/vite.config.ts
proxy: {
  '/api/v2/wishlist': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/v2\/wishlist\/items/, '/wishlist')
                         .replace(/^\/api\/v2\/wishlist/, '/wishlist'),
  },
  '/api/v2/gallery': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/v2\/gallery/, '/gallery'),
  },
  '/api/v2/sets': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/v2\/sets/, '/sets'),
  },
  '/api/v2/mocs': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/v2\/mocs/, '/mocs'),
  },
  '/api/v2/health': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/v2\/health/, '/health'),
  },
}
```

#### Option B: MSW Handlers (Recommended for E2E Test Isolation)

```typescript
// apps/web/main-app/src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Match production paths that RTK Query uses
  http.get('/api/v2/wishlist/items', () => {
    return HttpResponse.json({ items: mockWishlistItems })
  }),
  http.get('/api/v2/wishlist/items/:id', ({ params }) => {
    return HttpResponse.json(mockWishlistItems.find(i => i.id === params.id))
  }),
  // ... additional handlers
]
```

### Frontend API Client Configuration

```typescript
// packages/core/api-client/src/config/endpoints.ts
export const endpoints = {
  wishlist: {
    list: '/api/v2/wishlist/items',
    get: (id: string) => `/api/v2/wishlist/items/${id}`,
    create: '/api/v2/wishlist/items',
    update: (id: string) => `/api/v2/wishlist/items/${id}`,
    delete: (id: string) => `/api/v2/wishlist/items/${id}`,
  },
  gallery: {
    images: '/api/v2/gallery/images',
    albums: '/api/v2/gallery/albums',
  },
  // ... etc
}
```

### Consequences

- Frontend always uses production-style paths (`/api/v2/...`)
- Local development requires Vite proxy OR MSW mocking
- E2E tests should prefer MSW for deterministic data
- Backend routes remain simple (`/wishlist`, `/gallery`, etc.)

### Related Files

- `packages/core/api-client/src/config/endpoints.ts` - Frontend endpoint definitions
- `apps/api/lego-api/server.ts` - Backend route mounting
- `apps/web/main-app/vite.config.ts` - Proxy configuration
- `apps/web/main-app/src/mocks/handlers.ts` - MSW handlers

---

## ADR-002: Infrastructure-as-Code Strategy

**Date**: 2026-02-01
**Status**: Active
**Context**: Infrastructure definitions were lost during CDK → SST → Serverless Framework migrations.

### Problem

Multiple IaC framework migrations resulted in:
- 54 infrastructure files deleted without replacement
- Cognito, S3, CloudFront resources exist in AWS but have no IaC
- Story ACs referencing infrastructure marked complete without IaC

### Decision

Use standalone CloudFormation templates that are framework-agnostic.

### Infrastructure Stack Architecture

```
infra/
├── cognito/              # Authentication stack
│   ├── template.yaml
│   └── README.md
├── image-cdn/            # S3 + CloudFront for images
│   ├── template.yaml
│   └── README.md
├── frontend-hosting/     # S3 + CloudFront for React SPA
│   ├── template.yaml
│   └── README.md
├── monitoring/           # CloudWatch alarms (Terraform)
│   └── *.tf
├── deploy.sh             # Deployment script
└── README.md
```

### Stack Independence

Each stack is independently deployable with no cross-stack dependencies:

```bash
# Deploy individually
./deploy.sh dev cognito
./deploy.sh dev image-cdn
./deploy.sh dev frontend-hosting

# Deploy all
./deploy.sh dev
```

### Environment Variable Mapping

| Env Var | Stack | Output |
|---------|-------|--------|
| `COGNITO_USER_POOL_ID` | cognito | `UserPoolId` |
| `COGNITO_CLIENT_ID` | cognito | `UserPoolClientId` |
| `COGNITO_REGION` | cognito | `CognitoRegion` |
| `S3_BUCKET` | image-cdn | `ImageBucketName` |
| `CLOUDFRONT_DISTRIBUTION_DOMAIN` | image-cdn | `CloudFrontDomainName` |

### Consequences

- CloudFormation templates survive framework migrations
- Each stack can be deployed/destroyed independently
- Stack outputs provide values for application env vars
- No vendor lock-in to SST, CDK, or Serverless Framework

### Related Files

- `infra/*/template.yaml` - CloudFormation templates
- `infra/deploy.sh` - Deployment script
- `.env.example` files - Document required env vars

---

## ADR-003: Image Storage and CDN Architecture

**Date**: 2026-02-01
**Status**: Active
**Context**: WISH-2018 CDN integration for image performance optimization.

### Problem

Images stored in S3 are served directly, causing:
- No edge caching (every request hits S3)
- Higher latency for geographically distributed users
- Higher S3 request costs

### Decision

Use CloudFront as CDN in front of S3 with Origin Access Control (OAC).

### Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Browser   │────▶│   CloudFront    │────▶│     S3      │
│             │◀────│   (CDN Edge)    │◀────│   Bucket    │
└─────────────┘     └─────────────────┘     └─────────────┘
                           │
                    Origin Access Control
                    (OAC - replaces OAI)
```

### URL Flow

1. **Upload**: Client → Presigned S3 URL → S3 Bucket
2. **Read**: Client → CloudFront URL → Edge Cache (or S3 origin)
3. **Conversion**: Backend converts S3 URLs to CloudFront URLs on-the-fly

### URL Formats

| Type | Format |
|------|--------|
| S3 Direct | `https://{bucket}.s3.amazonaws.com/{key}` |
| S3 Regional | `https://{bucket}.s3.{region}.amazonaws.com/{key}` |
| CloudFront | `https://{distribution}.cloudfront.net/{key}` |

### Code Implementation

```typescript
// apps/api/lego-api/core/cdn/cloudfront.ts
export function toCloudFrontUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (isCloudFrontUrl(url)) return url  // Already CloudFront
  if (!isCloudFrontEnabled()) return url  // Fallback to S3
  if (isS3Url(url)) return s3UrlToCloudFrontUrl(url)  // Convert
  return url  // External URL, pass through
}

// Repository mapper applies conversion
function mapRowToWishlistItem(row): WishlistItem {
  return {
    ...row,
    imageUrl: toCloudFrontUrl(row.imageUrl),  // Convert on read
  }
}
```

### Cache Configuration

| Content Type | TTL | Cache-Control |
|--------------|-----|---------------|
| Images (default) | 24 hours | `max-age=86400` |
| Thumbnails | 24 hours | `max-age=86400` |
| Error responses | 10-60 seconds | Short cache |

### Cache Busting

Use version query parameter for immediate updates:

```typescript
const imageUrl = `https://${domain}/wishlist/user-123/image.jpg?v=${Date.now()}`
```

### Consequences

- Images cached at edge locations globally
- S3 bucket is private (CloudFront-only access via OAC)
- Existing S3 URLs in database automatically converted
- Presigned uploads still go directly to S3

### Related Files

- `apps/api/lego-api/core/cdn/cloudfront.ts` - URL conversion utilities
- `apps/api/lego-api/domains/wishlist/adapters/repositories.ts` - Repository mapping
- `infra/image-cdn/template.yaml` - CloudFront + S3 infrastructure

---

## ADR-004: Authentication Architecture

**Date**: 2026-02-01
**Status**: Active
**Context**: Cognito authentication for user management.

### Decision

Use AWS Cognito with the following configuration.

### Cognito Pools

| Environment | User Pool ID | Client ID | Purpose |
|-------------|--------------|-----------|---------|
| Development | `us-east-1_jJPnVUCxF` | `7enc2rd3jv8juooui89b1mot56` | Main dev pool |
| Test/E2E | `us-east-1_vtW1Slo3o` | `4527ui02h63b7c0ra7vs00gua5` | Playwright tests |
| Production | TBD | TBD | Production users |

### Test Credentials

| Environment | Email | Password | Notes |
|-------------|-------|----------|-------|
| E2E Tests | `stan.marsh@southpark.test` | `0Xcoffee?` | For Playwright |

### Token Configuration

| Token | Validity | Unit |
|-------|----------|------|
| Access Token | 60 | minutes |
| ID Token | 60 | minutes |
| Refresh Token | 30 | days |

### OAuth Configuration

- **Flow**: Authorization Code (PKCE for SPA)
- **Scopes**: `openid`, `email`, `profile`
- **Callback URLs**:
  - Dev: `http://localhost:3002/auth/callback`, `http://localhost:5173/auth/callback`
  - Prod: `https://lego-moc-instructions.com/auth/callback`

### Frontend Integration

```typescript
// Environment variables
VITE_AWS_USER_POOL_ID=us-east-1_jJPnVUCxF
VITE_AWS_USER_POOL_WEB_CLIENT_ID=7enc2rd3jv8juooui89b1mot56
VITE_AWS_REGION=us-east-1
```

### E2E Test Configuration

Playwright tests must override Cognito config to use test pool:

```typescript
// playwright.config.ts
webServer: {
  command: [
    'VITE_AWS_USER_POOL_ID=us-east-1_vtW1Slo3o',
    'VITE_AWS_USER_POOL_WEB_CLIENT_ID=4527ui02h63b7c0ra7vs00gua5',
    'pnpm dev',
  ].join(' '),
}
```

### Consequences

- Separate test pool prevents pollution of dev/prod user data
- Token validity balanced between security and UX
- OAuth code flow with PKCE for SPA security

### Related Files

- `infra/cognito/template.yaml` - Cognito infrastructure
- `apps/web/main-app/.env.development` - Dev pool config
- `apps/web/playwright/playwright.legacy.config.ts` - Test pool config

---

## ADR-005: Testing Strategy - UAT Must Use Real Services

**Date**: 2026-02-01
**Status**: Active
**Context**: Clarifying when mocking is appropriate vs when real services must be used.

### Problem

Confusion about when to use MSW/mocking vs live services in different testing contexts. Using mocks in UAT defeats the entire purpose of User Acceptance Testing.

### Decision

**UAT (User Acceptance Testing) MUST NEVER use mocking.** The entire point of UAT is to validate the real end-to-end flow with actual services.

### Testing Pyramid and Mocking Policy

| Test Type | Mocking Allowed | Services | Purpose |
|-----------|-----------------|----------|---------|
| **Unit Tests** | ✅ Required | All mocked | Test isolated logic |
| **Integration Tests** | ✅ Allowed | Partial mocks | Test component integration |
| **E2E Tests (Dev)** | ✅ Optional | MSW or Live | Test UI flows with deterministic data |
| **UAT** | ❌ **NEVER** | All real | Validate real user workflows |
| **Production Smoke** | ❌ **NEVER** | All real | Verify production deployment |

### UAT Requirements

UAT tests **MUST**:
- Connect to real backend API (not MSW)
- Use real database (dev/staging environment)
- Authenticate against real Cognito
- Upload to real S3
- Serve images from real CloudFront
- Process real webhooks/events

UAT tests **MUST NOT**:
- Use MSW (Mock Service Worker)
- Use in-memory databases
- Mock authentication tokens
- Stub external API responses
- Use fake file storage

### Why This Matters

```
Unit Tests     → "Does my code work?"
Integration    → "Do my components work together?"
E2E (mocked)   → "Does my UI flow work?"
UAT            → "Does the REAL SYSTEM work for users?"
                 ↑
                 Mocking here answers the wrong question
```

**If UAT uses mocks, you're only testing that your mocks match your expectations - not that the real system works.**

### Configuration by Environment

```typescript
// playwright.config.ts

// ❌ WRONG for UAT - uses MSW
const uatConfigWRONG = {
  use: {
    baseURL: 'http://localhost:3002',
  },
  webServer: {
    command: 'VITE_ENABLE_MSW=true pnpm dev',  // ❌ MSW enabled
  },
}

// ✅ CORRECT for UAT - real services
const uatConfigCORRECT = {
  use: {
    baseURL: 'https://staging.lego-moc-instructions.com',  // Real staging
  },
  // No webServer - uses deployed staging environment
  // OR local with real backend:
  webServer: {
    command: 'VITE_ENABLE_MSW=false VITE_API_URL=http://localhost:3001 pnpm dev',
  },
}
```

### Environment Setup for UAT

```bash
# UAT environment variables - NO MOCKING
VITE_ENABLE_MSW=false
VITE_SERVERLESS_API_BASE_URL=https://api.staging.lego-moc-instructions.com
VITE_AWS_USER_POOL_ID=<staging-pool-id>
VITE_AWS_USER_POOL_WEB_CLIENT_ID=<staging-client-id>

# Ensure backend is running with real services
DATABASE_URL=<staging-database>
S3_BUCKET=<staging-bucket>
CLOUDFRONT_DISTRIBUTION_DOMAIN=<staging-cloudfront>
```

### Consequences

- UAT takes longer (real network, real database)
- UAT requires staging environment to be deployed and healthy
- UAT may have flaky tests due to real service variability
- UAT catches real integration issues that mocks would hide
- UAT validates the actual user experience

### Anti-Patterns to Avoid

1. **"UAT is slow, let's mock the API"** → You're no longer doing UAT
2. **"The backend isn't ready, let's mock it"** → UAT should wait for backend
3. **"Mocks make tests deterministic"** → UAT should test real-world variability
4. **"We can mock just this one service"** → Slippery slope to full mocking

### Related Files

- `apps/web/playwright/playwright.config.ts` - E2E config (mocking allowed)
- `apps/web/playwright/playwright.uat.config.ts` - UAT config (no mocking)
- `apps/web/main-app/src/mocks/handlers.ts` - MSW handlers (E2E only)

---

## ADR-006: E2E Tests Required in Dev Phase

**Date**: 2026-02-01
**Status**: Active
**Context**: Unit tests consistently pass but E2E/UAT tests fail due to configuration mismatches.

### Problem

Config drift between unit test mocks and real services goes undetected until UAT, when:
- Developer context is stale (days/weeks since implementation)
- Fixes take longer due to context switching
- Multiple stories may be blocked by the same config issue
- QA cycles become longer and more frustrating

Root causes discovered:
- MSW mock URLs don't match actual backend routes
- Environment variables differ between dev and E2E environments
- API response shapes in mocks don't match real backend
- Vite proxy rewrites not aligned with RTK Query expectations

### Decision

**Require at least one happy-path E2E test per story during the dev implementation phase.** Tests must use live resources (no MSW mocking).

### Updated Dev Phase Flow

```
Previous:  Setup → Plan → Execute (unit) → Proof → Review
New:       Setup → Plan → Execute (unit) → E2E (live) → Proof → Review
```

### E2E Test Requirements in Dev Phase

1. **Minimum Coverage**: One happy-path test per UI-facing acceptance criterion
2. **Configuration**: Use `playwright.legacy.config.ts` (live API mode)
3. **Environment**: `VITE_ENABLE_MSW=false` - no mocking allowed
4. **Evidence**: Results recorded in `EVIDENCE.yaml` under `e2e_tests` section
5. **Config Issue Logging**: Any config mismatches logged with resolution

### EVIDENCE.yaml Schema Addition

```yaml
e2e_tests:
  status: pass | fail | skipped
  config: playwright.legacy.config.ts
  mode: "live"  # Must always be "live"
  results:
    total: 5
    passed: 5
    failed: 0
  config_issues:
    - type: url_mismatch
      expected: "/api/v2/wishlist"
      actual: "/wishlist"
      files: [handlers.ts, server.ts]
      resolution: "Updated Vite proxy"
```

### Skip Conditions

E2E tests may be skipped if:
- `frontend_impacted: false` in SCOPE.yaml
- Story explicitly marks `e2e: not_applicable`
- No UI-facing acceptance criteria

### Consequences

**Positive:**
- Config issues caught while developer has full context
- Faster UAT cycles with fewer surprises
- E2E tests become part of "definition of done"
- Builds institutional knowledge about common config issues
- Config issue logging creates feedback loop for workflow improvement

**Negative:**
- Dev phase takes slightly longer
- Requires backend running during frontend development
- Additional infrastructure dependencies during development

**Trade-offs:**
- Slight increase in dev time is offset by significant reduction in QA/UAT time
- Infrastructure setup is a one-time cost per developer

### Related Files

- `.claude/agents/dev-execute-leader.agent.md` - Needs E2E phase addition
- `.claude/agents/dev-implement-playwright.agent.md` - Needs live mode enforcement
- `.claude/schemas/workflow-e2e-integration.yaml` - Schema definitions
- `apps/web/playwright/playwright.legacy.config.ts` - E2E config (no mocking)
- `packages/backend/orchestrator/src/artifacts/evidence.ts` - Schema update needed

---

## Template for New ADRs

```markdown
## ADR-XXX: [Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Active | Deprecated | Superseded by ADR-YYY
**Context**: Brief description of the problem or context.

### Problem

What issue are we trying to solve?

### Decision

What is the chosen solution?

### Alternatives Considered

1. **Alternative A**: Description and why rejected
2. **Alternative B**: Description and why rejected

### Consequences

- Positive consequence 1
- Positive consequence 2
- Trade-off or negative consequence

### Related Files

- `path/to/file.ts` - Description
```
