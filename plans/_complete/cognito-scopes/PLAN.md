# Epic: User Authorization & Tier System

**Status:** Draft (Revised)
**Priority:** P0 - Critical
**Owner:** TBD
**Created:** 2025-12-01
**Revised:** 2026-02-04

---

## Revision Summary

This plan has been revised based on an AuthN/AuthZ security review. Key changes:

| Area | Original | Revised |
|------|----------|---------|
| Backend | AWS Lambda | Bun (local) → Vercel (future), ports & adapters |
| Token Type | Access token + scopes | ID token + groups (simpler) |
| Authorization | OAuth scopes in JWT | Database is authoritative, checked per request |
| JWT Library | `jwks-rsa` | `jose` (Bun-compatible, built-in caching) |
| Age Verification | Birthdate with computed column | Simple `is_adult` boolean at signup |
| Add-ons | Boolean flags | Separate table with `expires_at` |
| Token Storage | localStorage or cookies | httpOnly cookie with `SameSite=strict` |
| Quota Enforcement | Check then increment | Atomic check-and-increment |

---

## Overview

Implement a comprehensive authorization system using AWS Cognito JWT (ID token with groups) with a freemium tier model that controls feature access and usage quotas for a LEGO inventory management platform.

**Key Architectural Decisions:**

1. **Cognito for authentication only** — issues ID tokens with `cognito:groups`
2. **Database is authoritative** — tier, quotas, permissions checked per request
3. **No Lambda triggers** — backend runs on Vercel/Bun, not AWS Lambda
4. **ID token only** — simpler than OAuth scopes, contains identity + group

---

## Business Context

### Problem Statement

- Need to control infrastructure costs (storage, bandwidth, compute) for a small user base (<100 users initially)
- Want users to try all features in limited quantities before committing to payment
- Require age-appropriate restrictions for chat features (adults only)
- Need flexible monetization through tiers and add-ons

### Goals

1. **Cost Protection:** Prevent unlimited storage/bandwidth usage through quotas
2. **User Experience:** Allow users to experience all features before upgrading
3. **Safety:** Implement age-appropriate restrictions for chat/social features
4. **Scalability:** Design system that works for 1 user today, 100+ users tomorrow
5. **Simplicity:** Avoid over-engineering while maintaining flexibility

### Success Metrics

- Zero unauthorized quota overages
- Clear upgrade paths when users hit limits
- <100ms authorization check latency
- Zero security vulnerabilities in permission model

---

## User Tiers

### Admin Tier

**Target:** App maintainers only
**Assignment:** Manual via Cognito Console
**Quotas:** Unlimited everything
**Features:** All user features + admin panel, moderation tools, analytics

### Free Tier

**Target:** Trial users, casual hobbyists
**Cost:** $0
**Quotas:**

- 5 MOCs
- 50MB total storage
- 1 wishlist
- 0 galleries
- 0 set lists

**Features:**

- Upload MOCs (with PDFs/images)
- Create wishlists
- Profile management
- Basic privacy controls

**Restrictions:**

- No chat/social features
- No galleries
- No set lists
- No add-ons available

### Pro Tier

**Target:** Active users, enthusiasts
**Cost:** TBD (cost recovery + margin)
**Quotas (20x multiplier):**

- 100 MOCs
- 1GB total storage
- 20 wishlists
- 20 galleries
- 0 set lists

**Features (Free +):**

- Chat (30-day history)
- Theme-based chat channels
- User discovery (theme matching)
- Reviews/ratings
- Collection milestones
- "Currently Building" status
- Build logs
- Wishlist sharing
- Can purchase add-ons

**Restrictions:**

- No set lists
- Limited chat history (30 days)
- Standard privacy controls only

### Power User Tier

**Target:** Power users, collectors
**Cost:** TBD (higher than Pro)
**Quotas (40x multiplier):**

- 200 MOCs
- 2GB total storage
- 40 wishlists
- 40 galleries
- Unlimited set lists (constrained by storage)

**Features (Pro +):**

- Unlimited set lists
- Extended chat history (365 days)
- Advanced privacy controls (granular per-feature visibility)
- Can purchase add-ons

### Add-Ons (Pro/Power Only)

Add-ons are **subscription-based** with expiration dates.

**Price Scraping:**

- Automatic price calculation for MOC builds
- Scrapes BrickLink/BrickOwl APIs
- Usage limits: TBD based on API costs

**Brick Purchase Tracking:**

- Track brick purchases across vendors
- Link purchases to MOCs
- Trigger "Currently Building" status

---

## Technical Architecture

### System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Cognito     │────▶│   Bun/Vercel    │────▶│   PostgreSQL    │
│  (ID tokens)    │     │   (API layer)   │     │  (source of     │
│                 │     │                 │     │   truth)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      ▼                       │
         │              ┌─────────────────┐             │
         │              │       S3        │             │
         │              │  (file storage) │             │
         │              └─────────────────┘             │
         │                                              │
         ▼                                              ▼
   ID Token contains:                        Database contains:
   - sub (user ID)                           - tier (authoritative)
   - email                                   - quotas & usage
   - cognito:groups                          - is_adult flag
                                             - is_suspended flag
                                             - add-on subscriptions
```

### Cognito Groups

User tier membership represented as Cognito groups:

- `admin`
- `free-tier`
- `pro-tier`
- `power-tier`

**Assignment:**

- Admin: Manual via Cognito Console
- Free/Pro/Power: Assigned via subscription management system (future)
- Default: `free-tier` on signup

**Note:** Cognito groups are informational only. The **database is authoritative** for tier and permissions.

### Permission Model (Group-Based)

Instead of OAuth scopes, permissions are derived from the user's tier in the database:

```typescript
const TIER_FEATURES = {
  'admin': ['*'],  // All features
  'free-tier': ['moc', 'wishlist', 'profile'],
  'pro-tier': ['moc', 'wishlist', 'profile', 'gallery', 'chat', 'reviews', 'user_discovery'],
  'power-tier': ['moc', 'wishlist', 'profile', 'gallery', 'chat', 'reviews', 'user_discovery', 'setlist', 'privacy_advanced'],
} as const

type Feature = 'moc' | 'wishlist' | 'profile' | 'gallery' | 'chat' | 'reviews' | 'user_discovery' | 'setlist' | 'privacy_advanced'
```

### Feature Access Matrix

| Feature | Free | Pro | Power | Admin |
|---------|------|-----|-------|-------|
| MOC management | ✅ | ✅ | ✅ | ✅ |
| Wishlist management | ✅ | ✅ | ✅ | ✅ |
| Profile management | ✅ | ✅ | ✅ | ✅ |
| Gallery management | ❌ | ✅ | ✅ | ✅ |
| Set list management | ❌ | ❌ | ✅ | ✅ |
| Chat (adults only) | ❌ | ✅ | ✅ | ✅ |
| User discovery | ❌ | ✅ | ✅ | ✅ |
| Reviews/ratings | ❌ | ✅ | ✅ | ✅ |
| Advanced privacy | ❌ | ❌ | ✅ | ✅ |
| Price scraping | ❌ | 💰 | 💰 | ✅ |
| Brick tracking | ❌ | 💰 | 💰 | ✅ |

💰 = Available as paid add-on subscription

---

## Database Schema

### user_quotas Table

```sql
CREATE TABLE user_quotas (
  -- Identity
  user_id UUID PRIMARY KEY REFERENCES users(id),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('admin', 'free-tier', 'pro-tier', 'power-tier')),

  -- Usage Tracking
  mocs_count INT NOT NULL DEFAULT 0,
  wishlists_count INT NOT NULL DEFAULT 0,
  galleries_count INT NOT NULL DEFAULT 0,
  setlists_count INT NOT NULL DEFAULT 0,
  storage_used_mb DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Quota Limits (NULL = unlimited for admin)
  mocs_limit INT,              -- 5, 100, 200, NULL
  wishlists_limit INT,         -- 1, 20, 40, NULL
  galleries_limit INT,         -- 0, 20, 40, NULL
  setlists_limit INT,          -- 0, 0, NULL, NULL
  storage_limit_mb INT,        -- 50, 1000, 2000, NULL

  -- Chat Configuration
  chat_history_days INT,       -- NULL, 30, 365, NULL

  -- Age Verification (simple boolean, no birthdate stored)
  is_adult BOOLEAN NOT NULL DEFAULT false,

  -- Account Status
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_at TIMESTAMP,
  suspended_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_usage CHECK (
    mocs_count >= 0 AND
    wishlists_count >= 0 AND
    galleries_count >= 0 AND
    setlists_count >= 0 AND
    storage_used_mb >= 0
  ),
  CONSTRAINT valid_limits CHECK (
    (tier = 'admin' AND mocs_limit IS NULL) OR
    (tier != 'admin' AND mocs_limit IS NOT NULL)
  )
);

CREATE INDEX idx_user_quotas_tier ON user_quotas(tier);
CREATE INDEX idx_user_quotas_is_adult ON user_quotas(is_adult);
CREATE INDEX idx_user_quotas_is_suspended ON user_quotas(is_suspended);
```

### user_addons Table (Subscription-Based)

```sql
CREATE TABLE user_addons (
  user_id UUID REFERENCES users(id),
  addon_type TEXT NOT NULL CHECK (addon_type IN ('price_scraping', 'brick_tracking')),
  purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,  -- NULL = lifetime (not used currently)

  PRIMARY KEY (user_id, addon_type)
);

CREATE INDEX idx_user_addons_expires ON user_addons(expires_at);
```

### Quota Initialization Function

```sql
CREATE OR REPLACE FUNCTION initialize_user_quotas()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_quotas (
    user_id, tier,
    mocs_limit, wishlists_limit, galleries_limit, setlists_limit,
    storage_limit_mb, chat_history_days, is_adult
  )
  VALUES (
    NEW.id,
    'free-tier',
    5,     -- mocs_limit
    1,     -- wishlists_limit
    0,     -- galleries_limit
    0,     -- setlists_limit
    50,    -- storage_limit_mb
    NULL,  -- chat_history_days (no chat for free tier)
    false  -- is_adult (must be set during signup)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_user_quotas
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_quotas();
```

---

## API Authorization

### JWT Verification with `jose`

**Purpose:** Verify Cognito ID tokens using the `jose` library (Bun-compatible, built-in caching)

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose'

const COGNITO_REGION = process.env.COGNITO_REGION!
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID!

// JWKS with built-in caching
const JWKS = createRemoteJWKSet(
  new URL(`https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
)

interface TokenPayload {
  sub: string
  email: string
  'cognito:groups': string[]
  token_use: string
}

async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
    audience: COGNITO_CLIENT_ID,
  })

  // Verify this is an ID token, not an access token
  if (payload.token_use !== 'id') {
    throw new Error('Invalid token type: expected ID token')
  }

  return payload as unknown as TokenPayload
}
```

### Cookie Configuration

**Token stored in httpOnly cookie with CSRF protection via `SameSite=strict`:**

```typescript
function setAuthCookie(res: Response, token: string) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,           // HTTPS only
    sameSite: 'strict',     // CSRF protection
    maxAge: 3600000,        // 1 hour
    path: '/',
  })
}
```

### Authentication Middleware

```typescript
async function authenticate(req: Request): Promise<AuthenticatedUser> {
  const token = req.cookies.auth_token

  if (!token) {
    throw new UnauthorizedError('No token provided')
  }

  const payload = await verifyToken(token)

  return {
    id: payload.sub,
    email: payload.email,
    groups: payload['cognito:groups'] || [],
  }
}
```

### Authorization with Database Lookup

**The database is authoritative. Every request checks the database for current permissions:**

```typescript
interface UserPermissions {
  tier: string
  isAdmin: boolean
  isAdult: boolean
  isSuspended: boolean
  features: string[]
  quotas: QuotaInfo
  addons: string[]
}

async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const quota = await db.query(`
    SELECT * FROM user_quotas WHERE user_id = $1
  `, [userId])

  if (quota.rows.length === 0) {
    throw new NotFoundError('User not found')
  }

  const user = quota.rows[0]

  // Check if suspended
  if (user.is_suspended) {
    throw new ForbiddenError('Account suspended')
  }

  // Get active add-ons
  const addons = await db.query(`
    SELECT addon_type FROM user_addons
    WHERE user_id = $1
      AND (expires_at IS NULL OR expires_at > NOW())
  `, [userId])

  const activeAddons = addons.rows.map(r => r.addon_type)

  return {
    tier: user.tier,
    isAdmin: user.tier === 'admin',
    isAdult: user.is_adult,
    isSuspended: false,
    features: TIER_FEATURES[user.tier] || [],
    quotas: {
      mocs: { count: user.mocs_count, limit: user.mocs_limit },
      wishlists: { count: user.wishlists_count, limit: user.wishlists_limit },
      galleries: { count: user.galleries_count, limit: user.galleries_limit },
      setlists: { count: user.setlists_count, limit: user.setlists_limit },
      storage: { used: user.storage_used_mb, limit: user.storage_limit_mb },
    },
    addons: activeAddons,
  }
}
```

### Feature Authorization (Domain Layer)

```typescript
const VALID_FEATURES = ['moc', 'wishlist', 'profile', 'gallery', 'chat', 'reviews', 'user_discovery', 'setlist', 'privacy_advanced'] as const

function requireFeature(permissions: UserPermissions, feature: string): void {
  // Validate feature name (prevent injection)
  if (!VALID_FEATURES.includes(feature as any)) {
    throw new Error(`Invalid feature: ${feature}`)
  }

  // Admins have all features
  if (permissions.isAdmin) {
    console.log(`[ADMIN] ${permissions.tier} accessing ${feature}`)
    return
  }

  // Check feature access
  if (!permissions.features.includes(feature) && !permissions.features.includes('*')) {
    throw new ForbiddenError(`Feature '${feature}' requires upgrade`)
  }

  // Special case: chat requires adult status
  if (feature === 'chat' && !permissions.isAdult) {
    throw new ForbiddenError('Chat is restricted to adults')
  }
}
```

### Quota Enforcement (Atomic Check-and-Increment)

**Prevents race conditions with a single atomic query:**

```typescript
const VALID_QUOTA_TYPES = ['mocs', 'wishlists', 'galleries', 'setlists'] as const
type QuotaType = typeof VALID_QUOTA_TYPES[number]

async function reserveQuota(userId: string, quotaType: QuotaType): Promise<boolean> {
  // Validate quota type (prevent SQL injection)
  if (!VALID_QUOTA_TYPES.includes(quotaType)) {
    throw new Error(`Invalid quota type: ${quotaType}`)
  }

  // Atomic check-and-increment
  const result = await db.query(`
    UPDATE user_quotas
    SET ${quotaType}_count = ${quotaType}_count + 1,
        updated_at = NOW()
    WHERE user_id = $1
      AND (${quotaType}_limit IS NULL OR ${quotaType}_count < ${quotaType}_limit)
    RETURNING ${quotaType}_count
  `, [userId])

  return result.rowCount > 0
}

async function releaseQuota(userId: string, quotaType: QuotaType): Promise<void> {
  if (!VALID_QUOTA_TYPES.includes(quotaType)) {
    throw new Error(`Invalid quota type: ${quotaType}`)
  }

  await db.query(`
    UPDATE user_quotas
    SET ${quotaType}_count = GREATEST(0, ${quotaType}_count - 1),
        updated_at = NOW()
    WHERE user_id = $1
  `, [userId])
}
```

### Resource Ownership Verification (Domain Layer)

**Every resource operation must verify ownership:**

```typescript
async function verifyOwnership(
  userId: string,
  resourceType: string,
  resourceId: string,
  permissions: UserPermissions
): Promise<void> {
  const resource = await getResource(resourceType, resourceId)

  if (!resource) {
    throw new NotFoundError(`${resourceType} not found`)
  }

  // Admins can access any resource
  if (permissions.isAdmin) {
    console.log(`[ADMIN] ${userId} accessing ${resourceType}/${resourceId}`)
    return
  }

  if (resource.ownerId !== userId) {
    throw new ForbiddenError(`Not your ${resourceType}`)
  }
}
```

---

## Authorization Flow Diagrams

### User Login Flow

```
1. User enters credentials
   ↓
2. Cognito authenticates user
   ↓
3. Cognito issues ID token with:
   - sub (user ID)
   - email
   - cognito:groups: [tier]
   ↓
4. Frontend receives ID token
   ↓
5. Frontend stores token in httpOnly cookie (SameSite=strict)
   ↓
6. Frontend makes API requests (cookie sent automatically)
```

### API Request Flow

```
1. Frontend makes API request (cookie sent automatically)
   ↓
2. Backend extracts token from cookie
   ↓
3. JWT verification with jose:
   - Verify signature against Cognito JWKS
   - Validate issuer, audience
   - Verify token_use === 'id'
   ↓
4. Database lookup for permissions:
   - Check is_suspended
   - Get tier, quotas, add-ons
   ↓
5. Feature authorization:
   - Check tier has required feature
   - Check adult status for chat
   ↓
6. Quota check (if applicable):
   - Atomic check-and-increment
   ↓
7. Ownership verification:
   - Verify user owns the resource
   ↓
8. Business logic executes
   ↓
9. Response returned to frontend
```

### Tier Upgrade Flow

```
1. User purchases Pro/Power tier
   ↓
2. Payment processor webhook received
   ↓
3. Backend updates database:
   - user_quotas.tier = 'pro-tier'
   - Update all limit fields
   - chat_history_days = 30 or 365
   ↓
4. Optionally update Cognito group (for visibility)
   ↓
5. Next API request sees new tier immediately
   (database is authoritative, no token refresh needed)
```

---

## Edge Cases & Error Handling

### Edge Case 1: User Exceeds Quota Mid-Upload

**Scenario:** Two concurrent uploads, both pass initial check, one fails quota.

**Solution:** Atomic check-and-increment (already implemented above).

### Edge Case 2: User Downgrades Tier

**Scenario:** Power user downgrades to Pro, but already has 150 MOCs (exceeds Pro limit of 100).

**Solution:**

- **Grandfathering:** Allow existing content to remain
- Block new uploads until under limit
- Display message: "You have 150/100 MOCs. Delete 50 to upload more."

### Edge Case 3: Add-on Subscription Expires

**Scenario:** User's price scraping add-on expires mid-month.

**Solution:**

- `user_addons.expires_at` is checked on every request
- Feature becomes unavailable immediately when expired
- Webhook from payment processor updates `expires_at` on renewal

### Edge Case 4: Account Suspension

**Scenario:** Admin suspends user for ToS violation.

**Solution:**

- Set `is_suspended = true` in database
- Next API request returns 403 immediately
- No need to invalidate tokens (database check happens every request)

### Edge Case 5: User Deletes Content

**Scenario:** User deletes a MOC, quota should decrement.

**Solution:**

```typescript
async function deleteMoc(userId: string, mocId: string) {
  await verifyOwnership(userId, 'moc', mocId, permissions)

  const moc = await getMoc(mocId)

  await db.transaction(async (tx) => {
    await tx.query('DELETE FROM mocs WHERE id = $1', [mocId])
    await tx.query(`
      UPDATE user_quotas
      SET mocs_count = GREATEST(0, mocs_count - 1),
          storage_used_mb = GREATEST(0, storage_used_mb - $1),
          updated_at = NOW()
      WHERE user_id = $2
    `, [moc.fileSizeMb, userId])
  })
}
```

---

## Security Considerations

### 1. JWT Validation

- **Always verify JWT signature** using Cognito public keys (JWKS)
- **Validate issuer** matches Cognito User Pool
- **Validate audience** matches Cognito App Client ID
- **Verify token_use** is 'id' (not 'access')
- **Check expiration** (exp claim, handled by jose)

### 2. CSRF Protection

- **httpOnly cookie** prevents JavaScript access (XSS protection)
- **SameSite=strict** prevents cross-origin requests (CSRF protection)
- **No additional CSRF tokens needed** with SameSite=strict

### 3. SQL Injection Prevention

- **Whitelist valid values** for dynamic column names (quota types, features)
- **Use parameterized queries** for all user-provided values
- **Validate in domain layer** before reaching database

### 4. Resource Authorization

- **Always verify ownership** in domain layer
- **Admin bypass with audit logging** (log all admin actions)
- **Never trust client-provided resource IDs** without verification

### 5. Rate Limiting

- Implement rate limiting on all API endpoints
- Start with simple in-memory rate limiting
- Upgrade to Redis/Upstash when deploying to Vercel

```typescript
const requestCounts = new Map<string, { count: number; start: number }>()

function rateLimit(ip: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip) || { count: 0, start: now }

  if (now - record.start > windowMs) {
    record.count = 0
    record.start = now
  }

  record.count++
  requestCounts.set(ip, record)

  return record.count <= limit
}
```

### 6. Age Verification

- Simple boolean `is_adult` at signup ("Are you 18 or older?")
- No birthdate stored (privacy protection)
- Honor system for MVP
- Future: Third-party age verification if needed

### 7. Token Storage

- **httpOnly cookie** (JavaScript cannot read)
- **secure=true** (HTTPS only)
- **SameSite=strict** (no cross-origin requests)
- **1 hour expiration** (matches Cognito token expiry)

---

## Implementation Tasks

### Phase 1: Foundation

**Task 1.1: Database Schema**

- [ ] Create `user_quotas` table (with `is_adult`, `is_suspended`)
- [ ] Create `user_addons` table
- [ ] Create quota initialization trigger
- [ ] Create indexes
- [ ] Write migration scripts
- [ ] Test quota initialization

**Task 1.2: Cognito Configuration**

- [ ] Create Cognito User Pool (if not exists)
- [ ] Configure groups: admin, free-tier, pro-tier, power-tier
- [ ] Set ID token expiration to 1 hour
- [ ] Test user creation and group assignment

### Phase 2: API Authorization

**Task 2.1: JWT Verification**

- [ ] Install `jose` library
- [ ] Implement token verification with JWKS
- [ ] Add `token_use` validation
- [ ] Add audience validation
- [ ] Implement cookie parsing

**Task 2.2: Authorization Logic (Domain Layer)**

- [ ] Implement `getUserPermissions()` function
- [ ] Implement `requireFeature()` function
- [ ] Implement `verifyOwnership()` function
- [ ] Implement quota type whitelist validation
- [ ] Write unit tests

**Task 2.3: Quota Enforcement**

- [ ] Implement atomic `reserveQuota()` function
- [ ] Implement `releaseQuota()` function
- [ ] Add quota checks to create endpoints
- [ ] Add quota decrements to delete endpoints
- [ ] Test race conditions

**Task 2.4: Rate Limiting**

- [ ] Implement in-memory rate limiter
- [ ] Add to request pipeline
- [ ] Configure limits by tier (future)

### Phase 3: Frontend Integration

**Task 3.1: Cookie Management**

- [ ] Configure httpOnly cookies with SameSite=strict
- [ ] Implement token refresh flow
- [ ] Handle token expiration gracefully

**Task 3.2: UI Feature Gating**

- [ ] Create feature permission context
- [ ] Hide/show features based on tier
- [ ] Display upgrade prompts for locked features
- [ ] Show quota usage indicators

**Task 3.3: Error Handling**

- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show upgrade/suspension message)
- [ ] Handle 429 (show quota exceeded message)

### Phase 4: Testing & Launch

**Task 4.1: Testing**

- [ ] Unit tests for authorization logic
- [ ] Integration tests for quota enforcement
- [ ] Test ownership verification
- [ ] Test race conditions
- [ ] Security review

**Task 4.2: Launch**

- [ ] Deploy to production
- [ ] Assign yourself to admin group in Cognito
- [ ] Test all tiers manually
- [ ] Monitor for issues

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| JWT Storage: httpOnly cookies vs localStorage? | **httpOnly cookies with SameSite=strict** |
| Token type: Access token vs ID token? | **ID token only** (simpler) |
| Authorization: Token scopes vs database lookup? | **Database is authoritative** (real-time) |
| Age verification: Birthdate vs boolean? | **Simple boolean** (privacy) |
| Add-ons: Boolean flags vs expiry table? | **Separate table with expires_at** (subscriptions) |
| JWT library: jwks-rsa vs jose? | **jose** (Bun-compatible) |
| CSRF protection: Tokens vs SameSite? | **SameSite=strict** (no extra tokens) |
| Quota enforcement: Check-then-increment vs atomic? | **Atomic check-and-increment** |

---

## Changelog

**2025-12-01 - Initial Draft**

- Created comprehensive PRD for authorization system
- Defined 4 tiers (Admin, Free, Pro, Power)
- Specified Cognito groups and scopes
- Documented database schema
- Detailed Lambda implementation
- Outlined API middleware

**2026-02-04 - Security Review Revision**

- Removed Lambda dependency (Vercel/Bun architecture)
- Switched from OAuth scopes to group-based permissions
- Made database authoritative for all permissions
- Switched to `jose` library for JWT verification
- Added `token_use` and audience validation
- Changed to httpOnly cookies with SameSite=strict
- Replaced birthdate with simple `is_adult` boolean
- Added `is_suspended` column for account status
- Created `user_addons` table for subscription-based add-ons
- Implemented atomic quota check-and-increment
- Added ownership verification pattern
- Added quota type whitelist validation
- Simplified overall architecture

---

**End of PRD**
