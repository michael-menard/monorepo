# Wishlist Authorization Policy

> Security policy documentation for the wishlist feature (WISH-2008)

## Overview

This document describes the authorization model for the wishlist feature, including ownership verification, access control rules, audit logging, and security best practices.

---

## 1. Ownership Model

### Single-User Ownership

The wishlist feature implements a **single-user ownership model** where each wishlist item belongs to exactly one user:

```
wishlist_items
├── id: UUID (primary key)
├── userId: VARCHAR(255) (foreign key to Cognito user)
├── title, store, price, etc. (item data)
├── createdAt, updatedAt (timestamps)
├── createdBy, updatedBy (audit trail)
└── ...
```

**Key Principle:** The `userId` field is the **sole source of truth** for authorization decisions.

### Database Constraints

- `userId` is a required field (NOT NULL)
- All queries include `userId` in WHERE clauses
- No shared items or collaborative access in MVP
- Foreign key references Cognito user pool identifiers

---

## 2. Authentication Requirements

### JWT Token Validation

All wishlist endpoints require valid Cognito JWT access tokens:

```typescript
// Middleware applies to all routes
wishlist.use('*', auth)
```

**Token Requirements:**
- Algorithm: RS256
- Token type: `access` (not `id`)
- Issuer: Configured Cognito User Pool
- Audience: Configured Cognito Client ID

### User ID Extraction

The authenticated user's identity is extracted from the JWT `sub` claim:

```typescript
// @repo/api-core/auth.ts
export async function verifyToken(token: string): Promise<AuthUser | null> {
  const payload = await verifier.verify(cleanToken)
  return {
    userId: payload.sub,  // <-- This becomes c.get('userId')
    // ...
  }
}
```

### Bearer Token Format

The Authorization header must use the Bearer token format:

```
Authorization: Bearer <jwt-token>
```

**Edge Cases Handled:**
- Missing `Bearer` prefix: Returns 401
- Extra whitespace: Normalized by regex
- Empty token: Returns 401
- Malformed JWT: Returns 401

---

## 3. Authorization Rules

### Repository Layer Enforcement

All repository methods include `userId` in WHERE clauses to enforce ownership:

| Method | Query Pattern |
|--------|---------------|
| `findByUserId` | `WHERE userId = $1` |
| `findById` | No userId filter (service layer checks) |
| `update` | `WHERE id = $1` (service layer verifies ownership first) |
| `delete` | `WHERE id = $1` (service layer verifies ownership first) |
| `updateSortOrders` | `WHERE id = $1 AND userId = $2` |
| `verifyOwnership` | `WHERE userId = $1 AND id IN ($2...)` |

### Service Layer Ownership Checks

The service layer performs explicit ownership verification before mutations:

```typescript
// Example: getItem
async getItem(userId: string, itemId: string) {
  const result = await wishlistRepo.findById(itemId)
  if (!result.ok) return result

  // Ownership check
  if (result.data.userId !== userId) {
    return err('FORBIDDEN')
  }

  return result
}
```

### HTTP Status Code Mapping

| Scenario | Internal State | HTTP Response |
|----------|----------------|---------------|
| Item exists, user owns it | SUCCESS | 200/201/204 |
| Item exists, user does NOT own it | FORBIDDEN | **404** |
| Item does not exist | NOT_FOUND | 404 |
| User not authenticated | UNAUTHORIZED | 401 |
| Rate limit exceeded | TOO_MANY_REQUESTS | 429 |

**Important:** Cross-user access returns **404 Not Found** (not 403 Forbidden) to prevent item ID enumeration attacks. An attacker cannot distinguish between "item doesn't exist" and "item exists but you can't access it."

---

## 4. Audit Trail Fields (AC21)

### createdBy and updatedBy

The database schema includes `createdBy` and `updatedBy` audit fields:

```sql
CREATE TABLE wishlist_items (
  -- ...
  created_by VARCHAR(255),  -- Cognito user ID who created the record
  updated_by VARCHAR(255),  -- Cognito user ID who last updated
  -- ...
);
```

**IMPORTANT:** These fields are **for audit trail only**, NOT for authorization decisions.

### Authorization vs. Audit

| Field | Purpose | Used for Authorization? |
|-------|---------|------------------------|
| `userId` | Owner identity | **YES** - All access control |
| `createdBy` | Audit: who created | NO |
| `updatedBy` | Audit: who modified | NO |

### Implications

1. **Users cannot impersonate creators:** Even if `createdBy` is visible in responses, authorization always uses `userId`.
2. **Audit fields are read-only:** Users cannot modify `createdBy`/`updatedBy` via API.
3. **Historical tracking:** Audit fields help debug "who did what" without affecting access control.

---

## 5. Audit Logging (AC14)

### Structured Logging for Authorization Failures

All 403/404 responses for authorization failures are logged with structured metadata:

```json
{
  "level": "warn",
  "message": "Unauthorized wishlist access attempt",
  "userId": "user-a-id",
  "itemId": "item-456",
  "endpoint": "/wishlist/:id",
  "method": "GET",
  "statusCode": 404,
  "errorCode": "FORBIDDEN",
  "timestamp": "2026-01-29T12:00:00.000Z"
}
```

### Log Fields

| Field | Description |
|-------|-------------|
| `level` | Log severity ("warn" for auth failures) |
| `message` | Human-readable description |
| `userId` | Authenticated user's ID (from JWT) |
| `itemId` | Target resource ID |
| `endpoint` | API endpoint pattern |
| `method` | HTTP method (GET, PUT, DELETE, POST) |
| `statusCode` | HTTP response code (403, 404) |
| `errorCode` | Internal error code (FORBIDDEN, NOT_FOUND) |
| `timestamp` | ISO 8601 timestamp |

### CloudWatch Integration

Logs are written to CloudWatch Logs via `@repo/logger`. To query authorization failures:

```
# CloudWatch Logs Insights Query
fields @timestamp, userId, itemId, endpoint, statusCode
| filter message = "Unauthorized wishlist access attempt"
| sort @timestamp desc
| limit 100
```

---

## 6. S3 Path Isolation (AC13)

### User-Scoped S3 Prefixes

Wishlist images are stored with user-scoped prefixes to prevent cross-user access:

```
s3://bucket-name/wishlist/{userId}/images/{filename}
```

### Presigned URL Generation

The presigned URL endpoint generates URLs scoped to the authenticated user:

```typescript
async generateImageUploadUrl(userId: string, fileName: string, mimeType: string) {
  // Key includes userId from JWT
  const key = `wishlist/${userId}/images/${uuid()}.${extension}`
  const presignedUrl = await getPresignedUploadUrl(key, mimeType)
  return { presignedUrl, key, expiresIn: 900 }  // 15 minutes
}
```

### S3 Security

- Users can only upload to their own prefix
- Presigned URLs expire after 15 minutes
- S3 bucket policy restricts direct access
- CloudFront (future) will serve images with OAI

---

## 7. Rate Limiting (AC24)

### Brute-Force Protection

Rate limiting middleware protects against brute-force authorization attacks:

**Configuration:**
- Window: 5 minutes (sliding)
- Max failures: 10 per IP per window
- Tracked responses: 401 Unauthorized, 403 Forbidden
- Response: 429 Too Many Requests

### Rate Limit Response

```json
HTTP/1.1 429 Too Many Requests
Retry-After: 287

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 287
}
```

### Implementation Notes

- In-memory storage for MVP (single Lambda instance)
- Migrate to Redis for production scaling (WISH-2019)
- Cleanup runs every 60 seconds to prevent memory growth

---

## 8. Future Enhancements

### Phase 4 - Role-Based Access Control

- Admin role with read-all wishlist access
- User impersonation for customer support
- Role claims in JWT (`cognito:groups`)

### Phase 5 - Observability Improvements

- CloudWatch metrics for authorization events
- CloudWatch alarms for failure spike detection
- IP/geolocation logging (WISH-2047)
- Audit log viewer UI

### Phase 6 - Advanced Security

- Penetration testing engagement
- Authorization policy as code (OPA/Cedar)
- Multi-factor authentication step-up for sensitive operations

---

## API Endpoints

### Authorization Matrix

| Endpoint | Method | Auth Required | Ownership Check |
|----------|--------|---------------|-----------------|
| `/wishlist` | GET | Yes | Filter by userId |
| `/wishlist` | POST | Yes | Set userId from JWT |
| `/wishlist/:id` | GET | Yes | Verify userId match |
| `/wishlist/:id` | PUT | Yes | Verify userId match |
| `/wishlist/:id` | DELETE | Yes | Verify userId match |
| `/wishlist/reorder` | PUT | Yes | Verify all itemIds owned |
| `/wishlist/:id/purchased` | POST | Yes | Verify userId match |
| `/wishlist/images/presign` | GET | Yes | Scope S3 path to userId |

---

## References

- **Story:** WISH-2008 - Authorization Layer Testing and Policy Documentation
- **Database Schema:** `packages/backend/database-schema/src/schema/wishlist.ts`
- **Auth Middleware:** `apps/api/lego-api/middleware/auth.ts`
- **Rate Limiting:** `apps/api/lego-api/middleware/rate-limit.ts`
- **Service Layer:** `apps/api/lego-api/domains/wishlist/application/services.ts`
- **Repository:** `apps/api/lego-api/domains/wishlist/adapters/repositories.ts`

---

*Last updated: 2026-01-29*
*Document version: 1.0.0*
*Story: WISH-2008*
