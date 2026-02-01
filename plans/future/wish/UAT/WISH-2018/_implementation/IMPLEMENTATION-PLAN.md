# Implementation Plan: WISH-2018 - CDN Integration for Image Performance Optimization

## Scope Surface

- **backend/API**: yes - CloudFront URL utilities, storage adapter updates
- **frontend/UI**: no - URLs are transparent to frontend (just uses imageUrl field)
- **infra/config**: documentation only - CloudFront configuration documented, no IaC code

## Acceptance Criteria Checklist

| AC | Description | Status |
|----|-------------|--------|
| AC4 | CloudFront URL generation utility | To implement |
| AC5 | GET /api/wishlist returns CloudFront URLs | To implement |
| AC6 | GET /api/wishlist/:id returns CloudFront URL | To implement |
| AC8 | Backward compatibility for S3 URLs | To implement |
| AC9 | Presigned URL upload still uses S3 | Already works (no change) |
| AC13 | Integration tests for CloudFront URLs | To implement |

Note: AC1-3 (CloudFront distribution), AC10-12 (logging/monitoring), AC14-15 (performance/security) are infrastructure concerns documented in story but out of scope for code changes.

## Files To Touch (Expected)

### Create

| File | Purpose |
|------|---------|
| `apps/api/lego-api/core/cdn/cloudfront.ts` | CloudFront URL generation utilities |
| `apps/api/lego-api/core/cdn/index.ts` | Module exports |
| `apps/api/lego-api/core/cdn/__tests__/cloudfront.test.ts` | Unit tests (15+ tests) |

### Modify

| File | Changes |
|------|---------|
| `apps/api/lego-api/domains/wishlist/adapters/storage.ts` | Use CloudFront for `buildImageUrl()` |
| `apps/api/lego-api/domains/wishlist/adapters/repositories.ts` | Convert S3 URLs in `mapRowToWishlistItem()` |
| `apps/api/lego-api/domains/wishlist/adapters/__tests__/storage.test.ts` | Update tests for CloudFront URLs |

## Reuse Targets

| Package | Location | Purpose |
|---------|----------|---------|
| `@repo/api-core` | `packages/api-core/src/` | Existing S3 utilities, Result type |
| `@repo/logger` | `packages/core/logger/` | Logging for URL conversion |
| Existing storage adapter | `apps/api/lego-api/domains/wishlist/adapters/storage.ts` | Extend with CloudFront |
| Environment patterns | Existing `process.env.S3_BUCKET` pattern | Similar for `CLOUDFRONT_DISTRIBUTION_DOMAIN` |

## Architecture Notes (Ports & Adapters)

### Core CDN Module (`core/cdn/`)

Pure utility functions for CloudFront URL generation. No infrastructure dependencies except environment variables.

```
apps/api/lego-api/core/cdn/
├── cloudfront.ts     # URL conversion functions
├── index.ts          # Exports
└── __tests__/
    └── cloudfront.test.ts
```

### Integration Points

1. **Storage Adapter** - `buildImageUrl()` returns CloudFront URL instead of S3 URL
2. **Repository Mapper** - `mapRowToWishlistItem()` converts any stored S3 URLs to CloudFront
3. **Presign Flow** - Unchanged (uploads still go to S3)

### URL Flow

```
Upload:  Frontend -> S3 Presigned URL -> S3 Bucket
Read:    S3 Bucket -> CloudFront -> Frontend
         (Backend converts S3 key/URL to CloudFront URL in API response)
```

## Step-by-Step Plan (Small Steps)

### Step 1: Create CloudFront Utility Module

**Objective**: Create the core CloudFront URL generation utilities

**Files**:
- CREATE: `apps/api/lego-api/core/cdn/cloudfront.ts`
- CREATE: `apps/api/lego-api/core/cdn/index.ts`

**Implementation**:
```typescript
// cloudfront.ts
export function s3KeyToCloudFrontUrl(s3Key: string): string
export function s3UrlToCloudFrontUrl(s3Url: string): string | null
export function isS3Url(url: string): boolean
export function isCloudFrontUrl(url: string): boolean
export function getCloudFrontDomain(): string | null
```

**Verification**: TypeScript compiles, module exports correctly

---

### Step 2: Write Unit Tests for CloudFront Utilities

**Objective**: Comprehensive test coverage for URL conversion functions

**Files**:
- CREATE: `apps/api/lego-api/core/cdn/__tests__/cloudfront.test.ts`

**Test Cases (15+ tests)**:
- `s3KeyToCloudFrontUrl` with valid key
- `s3KeyToCloudFrontUrl` with various path patterns
- `s3UrlToCloudFrontUrl` with standard S3 URL
- `s3UrlToCloudFrontUrl` with regional S3 URL
- `s3UrlToCloudFrontUrl` with invalid URL (returns null)
- `s3UrlToCloudFrontUrl` with non-S3 URL (returns null)
- `isS3Url` returns true for S3 URLs
- `isS3Url` returns false for CloudFront URLs
- `isCloudFrontUrl` returns true for CloudFront URLs
- `isCloudFrontUrl` returns false for S3 URLs
- `getCloudFrontDomain` returns domain from env
- `getCloudFrontDomain` returns null when not configured
- Edge case: empty string handling
- Edge case: URL with query parameters
- Edge case: URL with special characters in path

**Verification**: `pnpm test apps/api/lego-api/core/cdn`

---

### Step 3: Update Storage Adapter - buildImageUrl

**Objective**: Modify `buildImageUrl()` to return CloudFront URLs

**Files**:
- MODIFY: `apps/api/lego-api/domains/wishlist/adapters/storage.ts`

**Changes**:
```typescript
import { s3KeyToCloudFrontUrl, getCloudFrontDomain } from '../../../core/cdn/index.js'

buildImageUrl(key: string): string {
  // If CloudFront is configured, use it
  const cloudFrontDomain = getCloudFrontDomain()
  if (cloudFrontDomain) {
    return s3KeyToCloudFrontUrl(key)
  }

  // Fallback to S3 URL (backward compatibility for envs without CloudFront)
  const bucket = process.env.S3_BUCKET
  return `https://${bucket}.s3.amazonaws.com/${key}`
}
```

**Verification**: Unit tests pass, manual check URL format

---

### Step 4: Update Repository Mapper for S3 URL Conversion

**Objective**: Convert any existing S3 URLs stored in database to CloudFront URLs

**Files**:
- MODIFY: `apps/api/lego-api/domains/wishlist/adapters/repositories.ts`

**Changes**:
```typescript
import { s3UrlToCloudFrontUrl, getCloudFrontDomain } from '../../../core/cdn/index.js'

function mapRowToWishlistItem(row: ...): WishlistItem {
  let imageUrl = row.imageUrl

  // Convert S3 URLs to CloudFront URLs for backward compatibility (AC8)
  if (imageUrl && getCloudFrontDomain()) {
    const cloudFrontUrl = s3UrlToCloudFrontUrl(imageUrl)
    if (cloudFrontUrl) {
      imageUrl = cloudFrontUrl
    }
  }

  return {
    ...
    imageUrl,
    ...
  }
}
```

**Verification**: Unit tests for repository, check response URLs

---

### Step 5: Update Storage Adapter Tests

**Objective**: Update existing tests to verify CloudFront URL generation

**Files**:
- MODIFY: `apps/api/lego-api/domains/wishlist/adapters/__tests__/storage.test.ts`

**Test Cases**:
- `buildImageUrl` returns CloudFront URL when configured
- `buildImageUrl` falls back to S3 URL when CloudFront not configured
- Verify URL format matches expected pattern

**Verification**: `pnpm test apps/api/lego-api/domains/wishlist/adapters`

---

### Step 6: Add Integration Tests for API Responses

**Objective**: Verify GET /api/wishlist and GET /api/wishlist/:id return CloudFront URLs

**Files**:
- MODIFY: `apps/api/lego-api/domains/wishlist/__tests__/services.test.ts`

**Test Cases**:
- `listItems` returns items with CloudFront URLs
- `getItem` returns item with CloudFront URL
- Legacy items with S3 URLs are converted to CloudFront

**Verification**: `pnpm test apps/api/lego-api/domains/wishlist`

---

### Step 7: Run Full Test Suite and Type Check

**Objective**: Ensure all changes compile and tests pass

**Commands**:
```bash
pnpm check-types:all
pnpm lint apps/api/lego-api
pnpm test apps/api/lego-api
```

**Verification**: Zero errors, all tests pass

---

### Step 8: Document Infrastructure Configuration

**Objective**: Create documentation for CloudFront setup

**Files**:
- Already documented in WISH-2018.md story file

**Content to verify**:
- CloudFront distribution configuration documented in story
- Environment variable: `CLOUDFRONT_DISTRIBUTION_DOMAIN`
- S3 bucket policy updates documented
- Cache invalidation strategy documented (versioned URLs)

**Verification**: Read story for infrastructure notes

## Test Plan

### Unit Tests
```bash
pnpm test apps/api/lego-api/core/cdn           # CloudFront utilities
pnpm test apps/api/lego-api/domains/wishlist   # Storage + repository
```

### Type Checking
```bash
pnpm check-types apps/api/lego-api
```

### Linting
```bash
pnpm lint apps/api/lego-api
```

### Integration Verification
Manual verification that API responses contain CloudFront URLs when `CLOUDFRONT_DISTRIBUTION_DOMAIN` is set.

## Stop Conditions / Blockers

**None identified.** The implementation plan is self-contained:

- Story is well-defined with clear acceptance criteria
- Existing codebase patterns are sufficient for implementation
- No external dependencies on other stories
- No database migrations required
- No API contract changes (same `imageUrl` field, just different domain)

## Architectural Decisions

### Decision Status: NO BLOCKING DECISIONS

The implementation follows established patterns:

1. **File Placement**: `apps/api/lego-api/core/cdn/` - follows existing `core/` pattern
2. **URL Generation**: Environment variable pattern matches existing `S3_BUCKET`
3. **Backward Compatibility**: On-the-fly conversion (no data migration)
4. **Fallback Strategy**: Graceful degradation when CloudFront not configured

All decisions align with existing codebase conventions. No user confirmation required.

## Worker Token Summary

- Input: ~35,000 tokens (story file, codebase files, agent instructions)
- Output: ~3,500 tokens (IMPLEMENTATION-PLAN.md)
