# Platform Migration PRD: AWS to Vercel + Neon + R2

## Document Info

| Field       | Value                        |
| ----------- | ---------------------------- |
| **Project** | LEGO MOC Instructions App    |
| **Type**    | Infrastructure Migration PRD |
| **Version** | 1.0                          |
| **Created** | 2025-12-06                   |
| **Author**  | Platform Engineering         |
| **Status**  | Draft                        |

---

## 1. Executive Summary

### 1.1 Problem Statement

The current AWS infrastructure is significantly over-provisioned for the actual use case:

| Current Reality            | Infrastructure Designed For        |
| -------------------------- | ---------------------------------- |
| 1 user (portfolio project) | Production-scale multi-tenant SaaS |
| Minimal traffic            | Thousands of concurrent users      |
| ~10GB storage              | Terabytes of storage               |
| **Cost: $150-400+/month**  | **Justified cost for scale**       |

### 1.2 Proposed Solution

Migrate from AWS serverless infrastructure to a modern, cost-optimized stack:

| Component        | Current (AWS)        | Target                  | Monthly Cost |
| ---------------- | -------------------- | ----------------------- | ------------ |
| **Frontend**     | S3 + CloudFront      | Vercel                  | $0           |
| **API**          | Lambda + API Gateway | Vercel Functions        | $0           |
| **Database**     | Aurora Serverless v2 | Neon PostgreSQL         | $0           |
| **File Storage** | S3                   | Cloudflare R2           | $0           |
| **Auth**         | Cognito              | Clerk (or keep Cognito) | $0           |
| **Search**       | OpenSearch           | PostgreSQL FTS          | $0           |

**Target Monthly Cost: $0** (within free tier limits for single-user portfolio)

### 1.3 Goals

1. **Reduce monthly infrastructure cost from $150-400+ to $0-10**
2. **Maintain all existing functionality** (no feature regression)
3. **Preserve AWS codebase** as portfolio demonstration of AWS skills
4. **Expand skill set** with modern deployment platforms
5. **Improve developer experience** with faster deployments and local development
6. **Keep the app publicly accessible** as a portfolio piece

### 1.4 Non-Goals

- Refactoring application architecture (shell + domain apps structure stays)
- Changing frontend framework (React 19 stays)
- Rewriting business logic
- Changing ORM (Drizzle stays)
- Multi-region deployment
- High availability / disaster recovery (single-user app)

---

## 2. Current Architecture Analysis

### 2.1 AWS Services in Use

| Service                  | Purpose             | Current Config     | Monthly Cost Est. |
| ------------------------ | ------------------- | ------------------ | ----------------- |
| **Aurora Serverless v2** | PostgreSQL database | 0.5-4 ACU          | $50-200           |
| **OpenSearch**           | Full-text search    | t3.small-r6g.large | $25-300           |
| **Lambda**               | API handlers        | 40+ functions      | $10-50            |
| **API Gateway**          | HTTP routing        | HTTP API           | $5-20             |
| **S3**                   | File storage        | Standard tier      | $5-20             |
| **CloudFront**           | CDN                 | Standard           | $5-20             |
| **Cognito**              | Authentication      | User Pool          | $0-5              |
| **NAT Gateway**          | VPC outbound        | Per AZ             | $32-100           |
| **VPC**                  | Networking          | 2 AZs              | $10-20            |
| **Secrets Manager**      | Credentials         | 5+ secrets         | $2-5              |
| **CloudWatch**           | Logging/metrics     | Standard           | $20-50            |

**Total Estimated: $164-790/month** (depending on stage)

### 2.2 API Endpoints Inventory

Based on `apps/api/endpoints/`:

| Domain               | Endpoints                           | Complexity             |
| -------------------- | ----------------------------------- | ---------------------- |
| **Gallery**          | 12 endpoints (CRUD, upload, search) | High (file uploads)    |
| **MOC Instructions** | 12 endpoints (CRUD, files, stats)   | High (file processing) |
| **MOC Parts Lists**  | 8 endpoints (CRUD, parse)           | Medium                 |
| **Wishlist**         | 9 endpoints (CRUD, search, reorder) | Medium                 |
| **Health**           | 1 endpoint                          | Low                    |
| **WebSocket**        | 3 handlers                          | Medium                 |

**Total: ~45 API endpoints**

### 2.3 Frontend Applications

| App                        | Purpose                          | Size   |
| -------------------------- | -------------------------------- | ------ |
| `main-app`                 | Shell (layout, auth, navigation) | Large  |
| `app-dashboard`            | Dashboard/landing                | Small  |
| `app-instructions-gallery` | MOC collection view              | Medium |
| `app-inspiration-gallery`  | Inspiration browsing             | Medium |
| `app-sets-gallery`         | LEGO sets gallery                | Medium |
| `app-wishlist-gallery`     | Wishlist management              | Medium |
| `user-settings`            | User preferences                 | Small  |
| `reset-password`           | Password reset flow              | Small  |

### 2.4 Data Storage Requirements

| Type                  | Estimated Size | Access Pattern                |
| --------------------- | -------------- | ----------------------------- |
| Database records      | < 100MB        | Read-heavy                    |
| MOC images            | < 5GB          | Read-heavy, infrequent writes |
| Instruction PDFs      | < 2GB          | Read-heavy, rare writes       |
| Parts lists (XML/CSV) | < 100MB        | Read-heavy, rare writes       |

**Total: < 10GB** — Well within free tier limits

---

## 3. Target Architecture

### 3.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Frontend (React Apps)                                   │    │
│  │  - main-app (shell)                                      │    │
│  │  - app-dashboard                                         │    │
│  │  - app-*-gallery                                         │    │
│  │  - user-settings                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API (Vercel Functions)                                  │    │
│  │  - /api/gallery/*                                        │    │
│  │  - /api/mocs/*                                           │    │
│  │  - /api/wishlist/*                                       │    │
│  │  - /api/health                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│      NEON       │          │   CLOUDFLARE R2     │
│   PostgreSQL    │          │   (S3-compatible)   │
│                 │          │                     │
│ - All app data  │          │ - MOC images        │
│ - Full-text     │          │ - Instruction PDFs  │
│   search (FTS)  │          │ - Parts lists       │
└─────────────────┘          └─────────────────────┘
         │
         ▼
┌─────────────────┐
│     CLERK       │
│  (or Cognito)   │
│                 │
│ - User auth     │
│ - JWT tokens    │
│ - Social login  │
└─────────────────┘
```

### 3.2 Platform Selection Rationale

#### Vercel (Frontend + API)

| Criteria           | Assessment                                               |
| ------------------ | -------------------------------------------------------- |
| **Free Tier**      | 100GB bandwidth, unlimited deploys, serverless functions |
| **React Support**  | First-class (Vite, React 19 supported)                   |
| **API Routes**     | Node.js functions, similar to Lambda                     |
| **DX**             | Instant previews, automatic HTTPS, CI/CD built-in        |
| **Learning Value** | Industry-standard platform, valuable skill               |

#### Neon (Database)

| Criteria          | Assessment                                    |
| ----------------- | --------------------------------------------- |
| **Free Tier**     | 0.5GB storage, 1 project, autoscales to zero  |
| **Compatibility** | PostgreSQL 15+, works with Drizzle ORM        |
| **Features**      | Branching (great for dev), connection pooling |
| **Migration**     | Standard pg_dump/restore from Aurora          |
| **Cost at Scale** | Pay-per-use, scales with actual usage         |

#### Cloudflare R2 (File Storage)

| Criteria          | Assessment                                    |
| ----------------- | --------------------------------------------- |
| **Free Tier**     | 10GB storage, 1M Class A ops, 10M Class B ops |
| **Compatibility** | S3-compatible API (minimal code changes)      |
| **Egress**        | **Zero egress fees** (unlike S3)              |
| **Performance**   | Global CDN built-in                           |

#### Clerk (Authentication) — Optional

| Criteria        | Assessment                                 |
| --------------- | ------------------------------------------ |
| **Free Tier**   | 10,000 MAU                                 |
| **Features**    | Social login, MFA, user management UI      |
| **Integration** | React hooks, middleware                    |
| **Alternative** | Keep Cognito (already free for your usage) |

---

## 4. Migration Strategy

### 4.1 Phased Approach

```
Phase 1: Database (Neon)
    ↓
Phase 2: File Storage (R2)
    ↓
Phase 3: API (Vercel Functions)
    ↓
Phase 4: Frontend (Vercel)
    ↓
Phase 5: Auth (Clerk or keep Cognito)
    ↓
Phase 6: Decommission AWS
```

### 4.2 Risk Mitigation

| Risk                       | Mitigation                                        |
| -------------------------- | ------------------------------------------------- |
| Data loss during migration | Full backup before migration, staged rollout      |
| API incompatibility        | Parallel running period, feature flags            |
| Auth token invalidation    | Gradual user migration, token compatibility layer |
| Downtime                   | Blue-green deployment, DNS-based cutover          |

### 4.3 Rollback Plan

- Keep AWS infrastructure running during migration (adds ~1 month cost)
- DNS can be switched back to AWS endpoints within minutes
- Database snapshots retained for 30 days post-migration

---

## 5. Technical Requirements

### 5.1 Database Migration

#### Schema Compatibility

- Neon uses PostgreSQL 15+ (same as Aurora)
- Drizzle ORM works unchanged
- Full-text search via PostgreSQL `tsvector`/`tsquery` (replaces OpenSearch)

#### Migration Steps

```bash
# 1. Export from Aurora
pg_dump -h aurora-endpoint -U postgres -d legoapidb > backup.sql

# 2. Create Neon database
# (via Neon dashboard or CLI)

# 3. Import to Neon
psql -h neon-endpoint -U postgres -d legoapidb < backup.sql

# 4. Update connection string
DATABASE_URL=postgres://user:pass@ep-xxx.us-east-1.aws.neon.tech/legoapidb
```

#### Code Changes Required

```typescript
// Current (Aurora)
const db = drizzle(client, { schema })

// Target (Neon) - same API, just connection string change
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })
```

### 5.2 File Storage Migration

#### S3 to R2 Compatibility

- R2 uses S3-compatible API
- Same `@aws-sdk/client-s3` works with endpoint override

#### Code Changes Required

```typescript
// Current (S3)
const s3 = new S3Client({ region: 'us-east-1' })

// Target (R2) - minimal change
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})
// All existing S3 operations work unchanged
```

#### Migration Steps

```bash
# 1. Install rclone
brew install rclone

# 2. Configure S3 source and R2 destination
rclone config

# 3. Sync files
rclone sync s3:lego-api-files r2:lego-api-files --progress
```

### 5.3 API Migration

#### Lambda to Vercel Functions

| Lambda Pattern                | Vercel Equivalent                   |
| ----------------------------- | ----------------------------------- |
| `handler(event, context)`     | `export default function(req, res)` |
| API Gateway event             | Standard `Request` object           |
| `event.body`                  | `await req.json()`                  |
| `return { statusCode, body }` | `return Response.json(data)`        |

#### Example Transformation

```typescript
// Current Lambda handler (apps/api/endpoints/health/handler.ts)
export const handler = async (event: APIGatewayProxyEvent) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok' }),
  }
}

// Target Vercel Function (apps/api-vercel/api/health.ts)
export default function handler(req: Request) {
  return Response.json({ status: 'ok' })
}
```

#### Shared Code Strategy

- Core business logic stays in `apps/api/core/`
- Only handler adapters change
- Create thin Vercel wrappers that call existing logic

### 5.4 Frontend Migration

#### Vercel Deployment

- Vite builds work out-of-the-box on Vercel
- Each app in `apps/web/` can be deployed separately or as monorepo
- Environment variables via Vercel dashboard

#### Configuration

```json
// vercel.json (root)
{
  "buildCommand": "pnpm turbo build --filter=main-app",
  "outputDirectory": "apps/web/main-app/dist",
  "framework": "vite"
}
```

#### Domain Setup

- Vercel provides `*.vercel.app` subdomain free
- Custom domain supported on free tier

### 5.5 Authentication Migration

#### Option A: Keep Cognito (Recommended for MVP)

- Cognito is already free for your usage
- No code changes required
- Works with Vercel Functions

#### Option B: Migrate to Clerk

| Benefit                | Tradeoff         |
| ---------------------- | ---------------- |
| Better DX              | Migration effort |
| Built-in UI components | New dependency   |
| React hooks            | Learn new API    |

```typescript
// Clerk integration example
import { auth } from '@clerk/nextjs'

export default async function handler(req: Request) {
  const { userId } = auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })
  // ... handler logic
}
```

---

## 6. Epic Structure

### 6.1 Epic Overview

| Order     | Epic                   | Description                       | Stories | Est. Effort   |
| --------- | ---------------------- | --------------------------------- | ------- | ------------- |
| 1         | Database Migration     | Migrate Aurora → Neon             | 8       | 1-2 days      |
| 2         | File Storage Migration | Migrate S3 → R2                   | 6       | 1 day         |
| 3         | API Migration          | Convert Lambda → Vercel Functions | 15      | 3-5 days      |
| 4         | Frontend Migration     | Deploy to Vercel                  | 5       | 0.5-1 day     |
| 5         | Auth Evaluation        | Decide Cognito vs Clerk           | 3       | 0.5 day       |
| 6         | Decommission AWS       | Tear down old infra               | 4       | 0.5 day       |
| **Total** |                        |                                   | **41**  | **6-10 days** |

---

## 7. Epic Details

### Epic 1: Database Migration (Aurora → Neon)

| #   | Story                       | Description                                  | Size |
| --- | --------------------------- | -------------------------------------------- | ---- |
| 1.1 | Neon Account Setup          | Create Neon account, project, database       | XS   |
| 1.2 | Schema Export               | Export Aurora schema via pg_dump             | XS   |
| 1.3 | Schema Import               | Import schema to Neon, verify tables         | S    |
| 1.4 | Data Export                 | Export Aurora data                           | S    |
| 1.5 | Data Import                 | Import data to Neon, verify integrity        | S    |
| 1.6 | Drizzle Config Update       | Update drizzle.config.ts for Neon            | XS   |
| 1.7 | Connection String Migration | Update env vars, test connection             | S    |
| 1.8 | FTS Migration               | Convert OpenSearch queries to PostgreSQL FTS | M    |

**Epic 1 Summary:** 8 stories (3 XS, 4 S, 1 M)

---

### Epic 2: File Storage Migration (S3 → R2)

| #   | Story                 | Description                             | Size |
| --- | --------------------- | --------------------------------------- | ---- |
| 2.1 | R2 Bucket Setup       | Create Cloudflare account, R2 bucket    | XS   |
| 2.2 | R2 Credentials        | Generate API tokens, configure access   | XS   |
| 2.3 | S3 Client Update      | Update S3 client config for R2 endpoint | S    |
| 2.4 | File Sync             | Sync existing files from S3 to R2       | S    |
| 2.5 | URL Generation Update | Update presigned URL generation for R2  | S    |
| 2.6 | Upload Testing        | Verify upload/download works end-to-end | S    |

**Epic 2 Summary:** 6 stories (2 XS, 4 S)

---

### Epic 3: API Migration (Lambda → Vercel Functions)

| #    | Story                      | Description                            | Size |
| ---- | -------------------------- | -------------------------------------- | ---- |
| 3.1  | Vercel Project Setup       | Create Vercel project, link repo       | XS   |
| 3.2  | API Structure              | Create `api/` directory structure      | S    |
| 3.3  | Handler Adapter            | Create Lambda→Vercel adapter utility   | M    |
| 3.4  | Health Endpoint            | Migrate health check endpoint          | XS   |
| 3.5  | Gallery Endpoints          | Migrate 12 gallery endpoints           | L    |
| 3.6  | MOC Instructions Endpoints | Migrate 12 MOC endpoints               | L    |
| 3.7  | Parts Lists Endpoints      | Migrate 8 parts list endpoints         | M    |
| 3.8  | Wishlist Endpoints         | Migrate 9 wishlist endpoints           | M    |
| 3.9  | File Upload Handling       | Adapt multipart upload for Vercel      | M    |
| 3.10 | Auth Middleware            | Adapt JWT validation for Vercel        | S    |
| 3.11 | Error Handling             | Adapt error responses                  | S    |
| 3.12 | Environment Variables      | Configure Vercel env vars              | XS   |
| 3.13 | CORS Configuration         | Set up CORS for Vercel                 | XS   |
| 3.14 | API Integration Tests      | Verify all endpoints work              | M    |
| 3.15 | WebSocket Evaluation       | Evaluate Vercel WebSocket alternatives | S    |

**Epic 3 Summary:** 15 stories (4 XS, 4 S, 5 M, 2 L)

---

### Epic 4: Frontend Migration (S3/CloudFront → Vercel)

| #   | Story                 | Description                          | Size |
| --- | --------------------- | ------------------------------------ | ---- |
| 4.1 | Vercel Config         | Create vercel.json for monorepo      | S    |
| 4.2 | Build Pipeline        | Configure Turborepo build for Vercel | S    |
| 4.3 | Environment Variables | Set up frontend env vars             | XS   |
| 4.4 | Domain Configuration  | Configure custom domain (optional)   | XS   |
| 4.5 | Preview Deployments   | Verify PR previews work              | XS   |

**Epic 4 Summary:** 5 stories (3 XS, 2 S)

---

### Epic 5: Auth Evaluation

| #   | Story                      | Description                         | Size |
| --- | -------------------------- | ----------------------------------- | ---- |
| 5.1 | Cognito Compatibility Test | Verify Cognito works with Vercel    | S    |
| 5.2 | Clerk POC (Optional)       | Prototype Clerk integration         | M    |
| 5.3 | Auth Decision              | Document decision, update if needed | XS   |

**Epic 5 Summary:** 3 stories (1 XS, 1 S, 1 M)

---

### Epic 6: AWS Decommission

| #   | Story               | Description                            | Size |
| --- | ------------------- | -------------------------------------- | ---- |
| 6.1 | Verification Period | Run parallel for 1-2 weeks             | -    |
| 6.2 | DNS Cutover         | Point domain to Vercel                 | XS   |
| 6.3 | AWS Cleanup Script  | Create script to tear down resources   | S    |
| 6.4 | Final Decommission  | Execute teardown, verify billing stops | S    |

**Epic 6 Summary:** 4 stories (1 XS, 2 S)

---

## 8. Cost Comparison

### 8.1 Before Migration (AWS)

| Service                    | Monthly Cost |
| -------------------------- | ------------ |
| Aurora Serverless v2       | $50-200      |
| OpenSearch                 | $25-300      |
| NAT Gateway                | $32-100      |
| Lambda + API Gateway       | $15-70       |
| S3 + CloudFront            | $10-40       |
| CloudWatch                 | $20-50       |
| Other (Secrets, VPC, etc.) | $12-30       |
| **Total**                  | **$164-790** |

### 8.2 After Migration (Vercel + Neon + R2)

| Service       | Free Tier Limit | Your Usage | Monthly Cost |
| ------------- | --------------- | ---------- | ------------ |
| Vercel        | 100GB bandwidth | <1GB       | $0           |
| Neon          | 0.5GB storage   | <100MB     | $0           |
| Cloudflare R2 | 10GB storage    | <10GB      | $0           |
| Cognito/Clerk | 10k-50k MAU     | 1 user     | $0           |
| **Total**     |                 |            | **$0**       |

### 8.3 Annual Savings

| Scenario     | AWS     | Target | Annual Savings  |
| ------------ | ------- | ------ | --------------- |
| Conservative | $164/mo | $0/mo  | **$1,968/year** |
| Moderate     | $400/mo | $0/mo  | **$4,800/year** |
| High         | $790/mo | $0/mo  | **$9,480/year** |

---

## 9. Success Criteria

### 9.1 Functional Requirements

- [ ] All 45 API endpoints working on Vercel
- [ ] All frontend apps accessible via Vercel
- [ ] File upload/download working via R2
- [ ] Authentication working (Cognito or Clerk)
- [ ] Full-text search working via PostgreSQL FTS
- [ ] No data loss during migration

### 9.2 Non-Functional Requirements

- [ ] API response time < 500ms (p95)
- [ ] Frontend load time < 3s (LCP)
- [ ] Zero downtime during cutover
- [ ] Monthly cost < $10

### 9.3 Portfolio Requirements

- [ ] AWS codebase preserved in repository (demonstrates AWS skills)
- [ ] New platform codebase demonstrates modern deployment practices
- [ ] README updated with architecture documentation
- [ ] Live demo accessible via public URL

---

## 10. Timeline

### 10.1 Recommended Schedule

| Week       | Focus              | Deliverables                          |
| ---------- | ------------------ | ------------------------------------- |
| **Week 1** | Database + Storage | Neon + R2 fully configured and synced |
| **Week 2** | API Migration      | All endpoints running on Vercel       |
| **Week 3** | Frontend + Auth    | Full app running on Vercel            |
| **Week 4** | Testing + Cutover  | Parallel running, then DNS switch     |

### 10.2 Milestones

| Milestone         | Target Date | Criteria                            |
| ----------------- | ----------- | ----------------------------------- |
| M1: Database Live | Week 1      | All data in Neon, Drizzle connected |
| M2: Storage Live  | Week 1      | All files in R2, uploads working    |
| M3: API Live      | Week 2      | All endpoints on Vercel             |
| M4: Frontend Live | Week 3      | All apps on Vercel                  |
| M5: Cutover       | Week 4      | AWS decommissioned, $0 bill         |

---

## 11. Risks and Mitigations

| Risk                                    | Probability | Impact | Mitigation                                   |
| --------------------------------------- | ----------- | ------ | -------------------------------------------- |
| Neon cold start latency                 | Medium      | Low    | Acceptable for 1-user app; can upgrade later |
| R2 API incompatibility                  | Low         | Medium | S3 SDK is well-tested with R2                |
| Vercel function timeout (10s free tier) | Medium      | Medium | Optimize slow endpoints; upgrade if needed   |
| WebSocket not supported                 | High        | Low    | Use polling or Pusher/Ably for real-time     |
| Auth token incompatibility              | Low         | High   | Keep Cognito initially; migrate auth later   |

---

## 12. Appendix

### A. File Structure After Migration

```
apps/
├── api/                    # Keep existing Lambda code (portfolio)
│   ├── serverless.yml      # AWS infrastructure reference
│   └── endpoints/          # Lambda handlers
├── api-vercel/             # New Vercel API
│   ├── api/                # Vercel function routes
│   │   ├── health.ts
│   │   ├── gallery/
│   │   ├── mocs/
│   │   └── wishlist/
│   └── vercel.json
└── web/                    # Unchanged, deployed to Vercel
    ├── main-app/
    └── ...
```

### B. Environment Variables

```bash
# Neon
DATABASE_URL=postgres://user:pass@ep-xxx.us-east-1.aws.neon.tech/legoapidb

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=lego-api-files

# Auth (if keeping Cognito)
COGNITO_USER_POOL_ID=us-east-1_xxx
COGNITO_CLIENT_ID=xxx
```

### C. Useful Commands

```bash
# Database migration
pg_dump -h aurora-host -U postgres -d legoapidb > backup.sql
psql $DATABASE_URL < backup.sql

# File sync
rclone sync s3:lego-api-files r2:lego-api-files -P

# Vercel deployment
vercel --prod

# Local development
vercel dev
```

---

## 13. Decision Log

| Date       | Decision                     | Rationale                                         |
| ---------- | ---------------------------- | ------------------------------------------------- |
| 2025-12-06 | Use Vercel over Fly.io       | Better React/Vite integration, generous free tier |
| 2025-12-06 | Use Neon over Supabase       | Pure PostgreSQL, Drizzle-native, scales to zero   |
| 2025-12-06 | Use R2 over Supabase Storage | S3-compatible, zero egress fees                   |
| 2025-12-06 | Keep Cognito initially       | Working auth, avoid migration complexity          |
| 2025-12-06 | Preserve AWS code            | Demonstrates AWS skills for portfolio             |

---

## 14. Next Steps

1. **Review PRD** — Validate approach and timeline
2. **Create Accounts** — Vercel, Neon, Cloudflare (all free)
3. **Start Epic 1** — Database migration first
4. **Iterate** — Adjust based on discoveries

---

_Document created for LEGO MOC Instructions App platform migration_
_Target: $0/month infrastructure for portfolio deployment_
