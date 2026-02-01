# Implementation Plan - WISH-2047

## Overview

**Story**: IP/Geolocation Logging for Authorization Events
**Goal**: Enrich authorization failure audit logs (403/404 events) with IP address and geolocation data

## Task Breakdown

### Chunk 1: Shared IP Extraction Utility (AC1, AC9)

**Files to Create:**
- `apps/api/lego-api/core/utils/ip.ts`
- `apps/api/lego-api/core/utils/__tests__/ip.test.ts`

**Implementation Steps:**

1. Create `ip.ts` with `extractClientIp()` function:
   ```typescript
   // Priority order: X-Forwarded-For > X-Real-IP > socket.remoteAddress
   // Handle comma-separated lists (take first/leftmost IP)
   // Support IPv4 and IPv6
   // Return null if no IP available
   ```

2. Export from `core/utils/index.ts`

3. Create unit tests (6+ tests per AC10):
   - X-Forwarded-For header with single IP
   - X-Forwarded-For header with comma-separated IPs
   - X-Real-IP header fallback
   - Socket remoteAddress fallback
   - No headers present (returns null)
   - IPv6 address handling

4. Refactor `middleware/rate-limit.ts` to use shared utility

**Acceptance Criteria Coverage:** AC1, AC9, AC10

---

### Chunk 2: Geolocation Service with MaxMind (AC2, AC6, AC7, AC8)

**Files to Create:**
- `apps/api/lego-api/core/geolocation/types.ts`
- `apps/api/lego-api/core/geolocation/geoip.ts`
- `apps/api/lego-api/core/geolocation/index.ts`
- `apps/api/lego-api/core/geolocation/__tests__/geoip.test.ts`

**Implementation Steps:**

1. Add dependency to `package.json`:
   ```json
   "@maxmind/geoip2-node": "^5.0.0"
   ```

2. Create Zod schemas in `types.ts`:
   ```typescript
   const GeolocationDataSchema = z.object({
     country: z.string().nullable(),
     region: z.string().nullable(),
     city: z.string().nullable(),
     latitude: z.number().nullable(),
     longitude: z.number().nullable(),
   })
   ```

3. Create `geoip.ts` with:
   - Singleton pattern for database reader (in-memory caching)
   - `lookupGeolocation(ip: string): Promise<GeolocationData | null>`
   - Environment variable `GEOIP_DATABASE_PATH` for database location
   - Performance monitoring (< 10ms target)
   - Graceful error handling (return null on failure)

4. Create unit tests (5+ tests):
   - Known IP lookup (use test database or mock)
   - Invalid IP returns null
   - Performance assertion (< 10ms)
   - Singleton pattern verification
   - Error handling for missing database

**Note:** For unit tests, we'll mock the MaxMind database reader since actual .mmdb file is not available in dev environment. Real integration testing will be done in Lambda deployment.

**Acceptance Criteria Coverage:** AC2, AC6, AC7, AC8

---

### Chunk 3: Logger Enrichment for Authorization Failures (AC3, AC4)

**Files to Modify:**
- `apps/api/lego-api/domains/wishlist/routes.ts`

**Implementation Steps:**

1. Modify `logAuthorizationFailure()` function to accept additional parameters:
   ```typescript
   function logAuthorizationFailure(
     userId: string,
     itemId: string | null,
     endpoint: string,
     method: string,
     statusCode: 403 | 404,
     errorCode: string,
     clientIp: string | null,         // NEW
     geolocation: GeolocationData | null, // NEW
   ): void
   ```

2. Enrich log entries with IP and geolocation fields:
   ```typescript
   logger.warn('Unauthorized wishlist access attempt', {
     userId,
     itemId,
     endpoint,
     method,
     statusCode,
     errorCode,
     timestamp: new Date().toISOString(),
     // New fields (WISH-2047)
     ip: clientIp,
     country: geolocation?.country ?? null,
     region: geolocation?.region ?? null,
     city: geolocation?.city ?? null,
     latitude: geolocation?.latitude ?? null,
     longitude: geolocation?.longitude ?? null,
   })
   ```

3. Update all route handlers that call `logAuthorizationFailure()`:
   - GET /:id
   - PUT /:id
   - DELETE /:id
   - POST /:id/purchased

4. Extract client IP from request context and pass to logging

**Acceptance Criteria Coverage:** AC3, AC4

---

### Chunk 4: Request Context IP Extraction (AC1, AC4)

**Files to Create:**
- `apps/api/lego-api/middleware/ip-context.ts`

**Implementation Steps:**

1. Create middleware to extract IP and attach to Hono context:
   ```typescript
   declare module 'hono' {
     interface ContextVariableMap {
       clientIp: string | null
       geolocation: GeolocationData | null
     }
   }

   export const ipContext = createMiddleware(async (c, next) => {
     const clientIp = extractClientIp(c.req.raw)
     c.set('clientIp', clientIp)

     // Only lookup geolocation for authorization failures
     // Geolocation lookup is deferred to route handlers

     return next()
   })
   ```

2. Apply middleware globally in `server.ts` or wishlist routes

3. Update wishlist route handlers to get IP from context:
   ```typescript
   const clientIp = c.get('clientIp')
   ```

**Acceptance Criteria Coverage:** AC1, AC4

---

### Chunk 5: Integration Tests (AC11)

**Files to Create:**
- `apps/api/lego-api/__http__/wishlist-ip-geolocation-logging.http`

**Implementation Steps:**

1. Create HTTP test file with test cases:
   ```http
   ### Test: Cross-user GET access logs IP/geolocation (404)
   GET {{baseUrl}}/api/wishlist/other-user-item
   Authorization: Bearer {{userToken}}
   X-Forwarded-For: 8.8.8.8

   ### Test: Cross-user PATCH access logs IP/geolocation (404)
   PATCH {{baseUrl}}/api/wishlist/other-user-item
   Authorization: Bearer {{userToken}}
   X-Forwarded-For: 8.8.8.8
   Content-Type: application/json

   {"title": "Updated"}

   ### Test: Unauthenticated request logs IP/geolocation (401)
   GET {{baseUrl}}/api/wishlist
   X-Forwarded-For: 8.8.8.8

   ### Test: Successful request does NOT log IP (200)
   GET {{baseUrl}}/api/wishlist
   Authorization: Bearer {{userToken}}
   X-Forwarded-For: 8.8.8.8
   ```

2. Add integration tests to verify log structure in test file

**Acceptance Criteria Coverage:** AC11

---

### Chunk 6: Security Policy Documentation (AC5, AC12)

**Files to Modify:**
- `docs/wishlist-authorization-policy.md` (if exists) or create new

**Implementation Steps:**

1. Add "IP/Geolocation Logging" section:
   - Privacy rationale (403/404 only)
   - Log structure with IP and geolocation fields
   - CloudWatch Logs Insights query examples

2. CloudWatch Logs Insights queries:
   ```
   # Top 10 attacking IPs
   fields @timestamp, ip, country, city, endpoint, statusCode
   | filter statusCode = 403 or statusCode = 404
   | stats count(*) as attempts by ip, country
   | sort attempts desc
   | limit 10

   # Geographic anomalies (same user, multiple countries)
   fields @timestamp, userId, ip, country, city
   | filter statusCode = 403 or statusCode = 404
   | stats count_distinct(country) as countries by userId
   | filter countries > 1

   # Failed access attempts by hour
   fields @timestamp, ip, endpoint
   | filter statusCode = 403 or statusCode = 404
   | stats count(*) as failures by bin(1h)
   ```

**Acceptance Criteria Coverage:** AC5, AC12

---

## Implementation Order

1. **Chunk 1**: IP Extraction Utility - Foundation for all other work
2. **Chunk 2**: Geolocation Service - Requires Chunk 1
3. **Chunk 4**: IP Context Middleware - Requires Chunk 1
4. **Chunk 3**: Logger Enrichment - Requires Chunks 1, 2, 4
5. **Chunk 5**: Integration Tests - Requires Chunk 3
6. **Chunk 6**: Documentation - Can be done in parallel

## Dependencies

### External Packages
- `@maxmind/geoip2-node` - MaxMind GeoIP2 Node.js SDK

### Internal Dependencies
- `@repo/logger` - Existing logging infrastructure
- Hono middleware pattern (existing)
- Existing rate-limit.ts IP extraction (to be refactored)

## Risk Mitigation

### Risk 1: MaxMind Database Not Available in Dev
**Mitigation:** Mock the MaxMind reader in unit tests. Real database testing deferred to Lambda deployment or integration environment.

### Risk 2: Geolocation Lookup Performance
**Mitigation:** Singleton pattern with in-memory caching. Performance assertion in unit tests.

### Risk 3: Breaking Rate Limit Middleware
**Mitigation:** Refactor to use shared utility, maintain all existing tests.

## Verification Checklist

- [ ] Unit tests for IP extraction (6+ tests)
- [ ] Unit tests for geolocation service (5+ tests)
- [ ] Refactored rate-limit.ts uses shared utility
- [ ] All existing rate-limit tests pass
- [ ] Logger enrichment includes IP/geolocation fields
- [ ] Privacy: IP NOT logged for 200/201 responses
- [ ] Integration tests verify log structure
- [ ] Documentation updated with CloudWatch queries
- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] All tests pass
