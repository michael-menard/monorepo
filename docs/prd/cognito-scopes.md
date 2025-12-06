# Epic: User Authorization & Tier System

**Status:** Draft  
**Priority:** P0 - Critical  
**Owner:** TBD  
**Created:** 2025-12-01

---

## Overview

Implement a comprehensive authorization system using AWS Cognito JWT (groups + scopes) with a freemium tier model that controls feature access and usage quotas for a LEGO inventory management platform.

---

## Business Context

### Problem Statement

- Need to control infrastructure costs (storage, bandwidth, compute) for a small user base (<100 users initially)
- Want users to try all features in limited quantities before committing to payment
- Require age-appropriate restrictions for chat features (minors vs adults)
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

### Cognito Scopes

OAuth 2.0 scopes representing feature permissions:

**Core Content:**

- `moc:manage` - Upload, view, edit, delete MOCs
- `wishlist:manage` - Create, view, edit, delete wishlists
- `gallery:manage` - Create, view, edit, delete galleries (Pro/Power)
- `setlist:manage` - Create, view, edit, delete set lists (Power only)

**Social/Community:**

- `chat:participate` - Access chat features (Pro/Power, age-restricted)
- `user:discover` - Discover other users via theme matching (Pro/Power)
- `review:manage` - Write and manage reviews (Pro/Power)
- `profile:manage` - Manage profile and basic privacy settings (All tiers)

**Advanced:**

- `privacy:advanced` - Granular privacy controls (Power only)

**Add-ons:**

- `price-scraping:use` - Access price scraping feature (purchased add-on)
- `brick-tracking:use` - Access brick purchase tracking (purchased add-on)

**Admin:**

- `admin:users:manage` - View, edit, delete users
- `admin:content:moderate` - View, remove any content
- `admin:chat:moderate` - View all chats, remove messages, ban users
- `admin:analytics:view` - System analytics, usage stats
- `admin:config:manage` - App configuration, feature flags

### Scope Assignment Matrix

| Scope              | Free | Pro  | Power | Admin |
| ------------------ | ---- | ---- | ----- | ----- |
| moc:manage         | ✅   | ✅   | ✅    | ✅    |
| wishlist:manage    | ✅   | ✅   | ✅    | ✅    |
| gallery:manage     | ❌   | ✅   | ✅    | ✅    |
| setlist:manage     | ❌   | ❌   | ✅    | ✅    |
| chat:participate   | ❌   | ✅\* | ✅\*  | ✅    |
| user:discover      | ❌   | ✅   | ✅    | ✅    |
| review:manage      | ❌   | ✅   | ✅    | ✅    |
| profile:manage     | ✅   | ✅   | ✅    | ✅    |
| privacy:advanced   | ❌   | ❌   | ✅    | ✅    |
| price-scraping:use | ❌   | 💰   | 💰    | ✅    |
| brick-tracking:use | ❌   | 💰   | 💰    | ✅    |
| admin:\*           | ❌   | ❌   | ❌    | ✅    |

\*Age-restricted: Minors (<18) do not receive chat scopes
💰 = Available as paid add-on

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

  -- Add-on Purchases
  has_price_scraping_addon BOOLEAN NOT NULL DEFAULT FALSE,
  has_brick_tracking_addon BOOLEAN NOT NULL DEFAULT FALSE,

  -- Age Verification
  birthdate DATE,
  is_minor BOOLEAN GENERATED ALWAYS AS (
    birthdate > CURRENT_DATE - INTERVAL '18 years'
  ) STORED,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Indexes
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
CREATE INDEX idx_user_quotas_is_minor ON user_quotas(is_minor);
```

### Quota Initialization Function

```sql
CREATE OR REPLACE FUNCTION initialize_user_quotas()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_quotas (user_id, tier, mocs_limit, wishlists_limit, galleries_limit, setlists_limit, storage_limit_mb, chat_history_days)
  VALUES (
    NEW.id,
    'free-tier',
    5,    -- mocs_limit
    1,    -- wishlists_limit
    0,    -- galleries_limit
    0,    -- setlists_limit
    50,   -- storage_limit_mb
    NULL  -- chat_history_days (no chat for free tier)
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

## Lambda Triggers

### Pre Token Generation Trigger

**Purpose:** Dynamically assign scopes to JWT based on user tier, age, and add-on purchases

**Trigger:** Cognito Pre Token Generation
**Runtime:** Node.js 18.x
**Timeout:** 5 seconds
**Memory:** 256MB

**Environment Variables:**

- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_SECRET_ARN` - Secrets Manager ARN for DB credentials

**Implementation:**

```javascript
const { Client } = require('pg')
const AWS = require('aws-sdk')

// Scope definitions by tier
const TIER_SCOPES = {
  admin: [
    'moc:manage',
    'wishlist:manage',
    'gallery:manage',
    'setlist:manage',
    'chat:participate',
    'user:discover',
    'review:manage',
    'profile:manage',
    'privacy:advanced',
    'price-scraping:use',
    'brick-tracking:use',
    'admin:users:manage',
    'admin:content:moderate',
    'admin:chat:moderate',
    'admin:analytics:view',
    'admin:config:manage',
  ],
  'free-tier': ['moc:manage', 'wishlist:manage', 'profile:manage'],
  'pro-tier': [
    'moc:manage',
    'wishlist:manage',
    'gallery:manage',
    'chat:participate',
    'user:discover',
    'review:manage',
    'profile:manage',
  ],
  'power-tier': [
    'moc:manage',
    'wishlist:manage',
    'gallery:manage',
    'setlist:manage',
    'chat:participate',
    'user:discover',
    'review:manage',
    'profile:manage',
    'privacy:advanced',
  ],
}

exports.handler = async event => {
  const userId = event.request.userAttributes.sub

  try {
    // Connect to database
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })
    await client.connect()

    // Fetch user quotas and tier
    const result = await client.query(
      'SELECT tier, is_minor, has_price_scraping_addon, has_brick_tracking_addon FROM user_quotas WHERE user_id = $1',
      [userId],
    )

    await client.end()

    if (result.rows.length === 0) {
      throw new Error(`User quotas not found for user_id: ${userId}`)
    }

    const user = result.rows[0]

    // Get base scopes for tier
    let scopes = [...TIER_SCOPES[user.tier]]

    // Remove chat scopes if minor
    if (user.is_minor) {
      scopes = scopes.filter(s => s !== 'chat:participate')
    }

    // Add add-on scopes
    if (user.has_price_scraping_addon && !scopes.includes('price-scraping:use')) {
      scopes.push('price-scraping:use')
    }
    if (user.has_brick_tracking_addon && !scopes.includes('brick-tracking:use')) {
      scopes.push('brick-tracking:use')
    }

    // Override token claims
    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          scope: scopes.join(' '),
        },
        groupOverrideDetails: {
          groupsToOverride: [user.tier],
        },
      },
    }

    return event
  } catch (error) {
    console.error('Error in Pre Token Generation:', error)
    // Fail closed - return minimal scopes on error
    event.response = {
      claimsOverrideDetails: {
        claimsToAddOrOverride: {
          scope: 'profile:manage',
        },
        groupOverrideDetails: {
          groupsToOverride: ['free-tier'],
        },
      },
    }
    return event
  }
}
```

**Error Handling:**

- Database connection failures → Fail closed (minimal scopes)
- Missing user quotas → Fail closed (free-tier scopes)
- Invalid tier value → Fail closed (free-tier scopes)
- Lambda timeout → Cognito uses default scopes (none)

**Monitoring:**

- CloudWatch Logs for all errors
- CloudWatch Metrics: invocation count, error rate, duration
- Alerts on error rate >1%

---

## API Authorization Middleware

### Scope Verification Middleware

**Purpose:** Verify JWT scopes before allowing API operations

**Implementation (Node.js/Express):**

```javascript
const jwt = require('jsonwebtoken')
const jwksClient = require('jwks-rsa')

// JWKS client for Cognito public keys
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
})

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey
    callback(null, signingKey)
  })
}

// Middleware: Verify JWT and extract claims
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  jwt.verify(
    token,
    getKey,
    {
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' })
      }

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        groups: decoded['cognito:groups'] || [],
        scopes: decoded.scope ? decoded.scope.split(' ') : [],
      }

      next()
    },
  )
}

// Middleware: Require specific scope
function requireScope(requiredScope) {
  return (req, res, next) => {
    // Admins bypass scope checks
    if (req.user.groups.includes('admin')) {
      return next()
    }

    // Check if user has required scope
    if (!req.user.scopes.includes(requiredScope)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required_scope: requiredScope,
        upgrade_url: '/pricing',
      })
    }

    next()
  }
}

// Middleware: Check quota limits
async function checkQuota(quotaType, incrementBy = 1) {
  return async (req, res, next) => {
    // Admins bypass quota checks
    if (req.user.groups.includes('admin')) {
      return next()
    }

    try {
      const quotas = await db.query('SELECT * FROM user_quotas WHERE user_id = $1', [req.user.id])

      if (quotas.rows.length === 0) {
        return res.status(500).json({ error: 'User quotas not found' })
      }

      const userQuota = quotas.rows[0]
      const currentCount = userQuota[`${quotaType}_count`]
      const limit = userQuota[`${quotaType}_limit`]

      // Check if quota exceeded
      if (currentCount + incrementBy > limit) {
        return res.status(429).json({
          error: 'Quota exceeded',
          quota_type: quotaType,
          current: currentCount,
          limit: limit,
          upgrade_url: '/pricing',
        })
      }

      // Store quota info for later increment
      req.quotaInfo = {
        type: quotaType,
        increment: incrementBy,
      }

      next()
    } catch (error) {
      console.error('Quota check error:', error)
      return res.status(500).json({ error: 'Quota check failed' })
    }
  }
}

// Middleware: Increment quota after successful operation
async function incrementQuota(req, res, next) {
  if (!req.quotaInfo || req.user.groups.includes('admin')) {
    return next()
  }

  try {
    await db.query(
      `UPDATE user_quotas
       SET ${req.quotaInfo.type}_count = ${req.quotaInfo.type}_count + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [req.quotaInfo.increment, req.user.id],
    )
    next()
  } catch (error) {
    console.error('Quota increment error:', error)
    // Don't fail the request, but log the error
    next()
  }
}

// Example usage
app.post(
  '/api/mocs',
  authenticateToken,
  requireScope('moc:manage'),
  checkQuota('mocs'),
  async (req, res) => {
    // Process MOC upload
    const moc = await createMOC(req.user.id, req.body)

    // Increment quota
    await incrementQuota(req, res, () => {})

    res.json(moc)
  },
)
```

### Storage Quota Middleware

**Purpose:** Check storage limits before file uploads

```javascript
const multer = require('multer')

// Middleware: Check storage quota before upload
async function checkStorageQuota(req, res, next) {
  // Admins bypass storage checks
  if (req.user.groups.includes('admin')) {
    return next()
  }

  try {
    const quotas = await db.query(
      'SELECT storage_used_mb, storage_limit_mb FROM user_quotas WHERE user_id = $1',
      [req.user.id],
    )

    if (quotas.rows.length === 0) {
      return res.status(500).json({ error: 'User quotas not found' })
    }

    const { storage_used_mb, storage_limit_mb } = quotas.rows[0]

    // Get file size from request (in MB)
    const fileSizeMB = parseInt(req.headers['content-length']) / (1024 * 1024)

    if (storage_used_mb + fileSizeMB > storage_limit_mb) {
      return res.status(413).json({
        error: 'Storage quota exceeded',
        current_mb: storage_used_mb,
        limit_mb: storage_limit_mb,
        file_size_mb: fileSizeMB,
        upgrade_url: '/pricing',
      })
    }

    // Store for later increment
    req.uploadedFileSizeMB = fileSizeMB

    next()
  } catch (error) {
    console.error('Storage quota check error:', error)
    return res.status(500).json({ error: 'Storage quota check failed' })
  }
}

// Middleware: Increment storage after successful upload
async function incrementStorage(req, res, next) {
  if (!req.uploadedFileSizeMB || req.user.groups.includes('admin')) {
    return next()
  }

  try {
    await db.query(
      `UPDATE user_quotas
       SET storage_used_mb = storage_used_mb + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [req.uploadedFileSizeMB, req.user.id],
    )
    next()
  } catch (error) {
    console.error('Storage increment error:', error)
    next()
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
3. Pre Token Generation Lambda triggered
   ↓
4. Lambda queries user_quotas table
   ↓
5. Lambda determines scopes based on:
   - User tier (free/pro/power/admin)
   - Age (is_minor flag)
   - Add-on purchases
   ↓
6. Lambda returns scopes to Cognito
   ↓
7. Cognito issues JWT with:
   - cognito:groups: [tier]
   - scope: "space-separated scopes"
   ↓
8. Frontend receives JWT
   ↓
9. Frontend parses scopes, shows/hides UI features
```

### API Request Flow

```
1. Frontend makes API request with JWT
   ↓
2. API Gateway / Backend receives request
   ↓
3. authenticateToken middleware:
   - Verifies JWT signature
   - Extracts user ID, groups, scopes
   ↓
4. requireScope middleware:
   - Checks if admin (bypass)
   - Checks if user has required scope
   - Returns 403 if missing
   ↓
5. checkQuota middleware:
   - Checks if admin (bypass)
   - Queries user_quotas table
   - Compares current usage vs limit
   - Returns 429 if exceeded
   ↓
6. Business logic executes
   ↓
7. incrementQuota middleware:
   - Updates usage counts in database
   ↓
8. Response returned to frontend
```

### Tier Upgrade Flow

```
1. User purchases Pro/Power tier
   ↓
2. Payment processor webhook received
   ↓
3. Backend updates user_quotas table:
   - tier = 'pro-tier' or 'power-tier'
   - Update all limit fields
   - chat_history_days = 30 or 365
   ↓
4. User's next login triggers Pre Token Generation
   ↓
5. Lambda reads new tier, assigns new scopes
   ↓
6. User receives new JWT with expanded scopes
   ↓
7. Frontend detects new scopes, shows new features
```

---

## Edge Cases & Error Handling

### Edge Case 1: User Exceeds Quota Mid-Upload

**Scenario:** User starts uploading a large file, but another concurrent upload completes first and exhausts their quota.

**Solution:**

- Use database transactions with row-level locking
- Check quota immediately before processing upload
- Return 429 if quota exceeded during upload
- Frontend retries with exponential backoff

**Implementation:**

```sql
BEGIN;
SELECT * FROM user_quotas WHERE user_id = $1 FOR UPDATE;
-- Check quota
-- Process upload
-- Increment quota
COMMIT;
```

### Edge Case 2: Lambda Timeout During Token Generation

**Scenario:** Database is slow, Lambda times out before returning scopes.

**Solution:**

- Cognito falls back to default scopes (none)
- User gets minimal access
- Frontend shows "Authentication error, please refresh"
- CloudWatch alarm triggers for investigation

**Mitigation:**

- Database connection pooling
- Read replicas for quota queries
- Lambda timeout set to 5s (generous)
- Retry logic in Lambda

### Edge Case 3: User Downgrades Tier

**Scenario:** Power user downgrades to Pro, but already has 150 MOCs (exceeds Pro limit of 100).

**Solution:**

- **Grandfathering:** Allow existing content to remain
- Block new uploads until under limit
- Display message: "You have 150/100 MOCs. Delete 50 to upload more, or upgrade to Power tier."

**Implementation:**

```javascript
if (currentCount >= limit) {
  return res.status(429).json({
    error: 'Quota exceeded',
    message: 'You have exceeded your tier limit. Delete existing items or upgrade.',
    current: currentCount,
    limit: limit,
    overage: currentCount - limit,
  })
}
```

### Edge Case 4: Minor Turns 18

**Scenario:** User's 18th birthday occurs, should gain chat access automatically.

**Solution:**

- `is_minor` is a computed column, updates automatically
- Next login triggers Pre Token Generation Lambda
- Lambda reads updated `is_minor = false`
- Assigns `chat:participate` scope
- User gains chat access on next session

**Consideration:**

- Birthday happens at midnight, but user may be logged in
- JWT remains valid until expiration (typically 1 hour)
- User must refresh token to get new scopes

**Implementation:**

- Frontend checks token expiration
- Prompts user to refresh if token >1 hour old
- "New features available! Refresh to access."

### Edge Case 5: Admin Manually Changes User Tier

**Scenario:** Admin upgrades user from Free to Pro via admin panel (future feature).

**Solution:**

- Admin panel updates `user_quotas.tier` in database
- User's current JWT remains valid with old scopes
- Next login (or forced token refresh) gets new scopes
- Admin can force logout to require immediate re-auth

**Implementation:**

```javascript
// Admin endpoint to upgrade user
POST /api/admin/users/:userId/upgrade

1. Verify admin scope
2. Update user_quotas table
3. Optionally: Invalidate user's current tokens (Cognito GlobalSignOut)
4. User must re-login to get new scopes
```

### Edge Case 6: Database and JWT Out of Sync

**Scenario:** User's tier is updated in database, but JWT still has old scopes.

**Solution:**

- **Accept JWT as source of truth** for current session
- Backend can optionally check database for critical operations
- Token expiration forces re-sync (typically 1 hour)
- For immediate effect, force user logout/re-login

**Mitigation:**

- Keep JWT expiration short (1 hour)
- Provide "Refresh" button in UI
- Critical operations (payments, tier changes) force token refresh

### Edge Case 7: User Deletes Content, Quota Not Decremented

**Scenario:** User deletes a MOC, but `mocs_count` and `storage_used_mb` not updated.

**Solution:**

- Implement delete hooks that decrement quotas
- Periodic reconciliation job to fix drift
- Admin tools to recalculate quotas

**Implementation:**

```javascript
// Delete MOC endpoint
DELETE /api/mocs/:mocId

1. Verify ownership
2. Get MOC file size
3. Delete MOC from storage
4. Decrement quotas:
   - mocs_count -= 1
   - storage_used_mb -= file_size_mb
5. Return success
```

**Reconciliation Job (daily cron):**

```sql
-- Recalculate actual usage vs recorded usage
UPDATE user_quotas uq
SET
  mocs_count = (SELECT COUNT(*) FROM mocs WHERE user_id = uq.user_id),
  storage_used_mb = (SELECT COALESCE(SUM(file_size_mb), 0) FROM mocs WHERE user_id = uq.user_id),
  updated_at = NOW()
WHERE uq.tier != 'admin';
```

### Edge Case 8: Race Condition on Quota Increment

**Scenario:** Two concurrent uploads both check quota (both see 4/5 MOCs), both proceed, user ends up with 6/5 MOCs.

**Solution:**

- Use database transactions with `FOR UPDATE` lock
- Atomic increment operations
- Check quota again after lock acquired

**Implementation:**

```javascript
async function checkAndIncrementQuota(userId, quotaType, increment) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Lock the row
    const result = await client.query(
      `SELECT ${quotaType}_count, ${quotaType}_limit
       FROM user_quotas
       WHERE user_id = $1
       FOR UPDATE`,
      [userId],
    )

    const { count, limit } = result.rows[0]

    // Check quota under lock
    if (count + increment > limit) {
      await client.query('ROLLBACK')
      throw new QuotaExceededError()
    }

    // Increment quota
    await client.query(
      `UPDATE user_quotas
       SET ${quotaType}_count = ${quotaType}_count + $1
       WHERE user_id = $2`,
      [increment, userId],
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

### Edge Case 9: Add-on Purchase Fails Mid-Transaction

**Scenario:** User pays for price scraping add-on, payment succeeds, but database update fails.

**Solution:**

- Idempotent webhook handlers
- Store payment transaction ID
- Retry failed database updates
- Admin tools to manually reconcile

**Implementation:**

```javascript
// Payment webhook handler
POST /api/webhooks/payment

1. Verify webhook signature
2. Check if transaction_id already processed (idempotency)
3. Update user_quotas.has_price_scraping_addon = true
4. Store transaction record
5. Return 200 (even if update fails, will retry)
6. If update fails, queue for retry
```

### Edge Case 10: User Has Multiple Active Sessions

**Scenario:** User logs in on desktop and mobile, tier upgraded on desktop, mobile still has old JWT.

**Solution:**

- Mobile JWT expires naturally (1 hour)
- Mobile app checks for tier changes periodically
- Backend can return "Token outdated" error
- Frontend prompts user to refresh

**Implementation:**

```javascript
// Backend can optionally check tier mismatch
if (req.user.groups[0] !== actualTierFromDB) {
  return res.status(401).json({
    error: 'Token outdated',
    message: 'Your account has been updated. Please refresh.',
    action: 'refresh_token',
  })
}
```

---

## Security Considerations

### 1. JWT Validation

- **Always verify JWT signature** using Cognito public keys (JWKS)
- **Validate issuer** matches Cognito User Pool
- **Check expiration** (exp claim)
- **Validate audience** (aud claim) if using multiple clients
- **Never trust client-provided scopes** - always use JWT scopes

### 2. Scope Tampering Prevention

- Scopes are signed in JWT, cannot be tampered
- Backend MUST verify JWT signature before trusting scopes
- Never accept scopes from request body/headers
- Use HTTPS only to prevent token interception

### 3. Admin Privilege Escalation

- Admin group assignment is manual in Cognito (not via API)
- No API endpoint to self-promote to admin
- Admin actions logged and audited
- Require MFA for admin accounts (future)

### 4. Age Verification

- Self-reported birthdate (honor system for now)
- Future: Require parental consent for minors
- Future: Age verification service integration
- Chat logs retained for moderation (compliance)

### 5. Rate Limiting

- Implement rate limiting on all API endpoints
- Prevent quota exhaustion attacks
- Separate rate limits for free vs paid tiers
- Example: Free tier = 100 req/min, Pro = 1000 req/min

### 6. Data Privacy

- Users can only access their own data (except admins)
- Verify `user_id` matches JWT `sub` claim
- Prevent user enumeration attacks
- GDPR compliance: Right to deletion, data export

### 7. Token Storage

- Frontend stores JWT in httpOnly cookies (preferred)
- Or localStorage with XSS protections
- Never log full JWTs (only last 4 chars)
- Rotate Cognito signing keys periodically

### 8. SQL Injection Prevention

- Use parameterized queries (never string concatenation)
- Validate all user inputs
- Escape special characters
- Use ORM with built-in protections

---

## Monitoring & Observability

### CloudWatch Metrics

**Lambda Metrics:**

- `PreTokenGeneration.Invocations` - Total invocations
- `PreTokenGeneration.Errors` - Error count
- `PreTokenGeneration.Duration` - Execution time
- `PreTokenGeneration.DatabaseLatency` - DB query time

**API Metrics:**

- `API.QuotaExceeded` - 429 responses by tier
- `API.Unauthorized` - 401/403 responses
- `API.UploadSize` - File upload sizes
- `API.QuotaUsage` - Current usage by tier

**Database Metrics:**

- `DB.QuotaQueries` - Quota check query count
- `DB.QuotaUpdates` - Quota increment count
- `DB.ConnectionPoolUtilization` - Connection usage

### CloudWatch Alarms

**Critical:**

- Lambda error rate >1% (5 min window)
- Database connection failures >5 (1 min window)
- API 5xx errors >10 (5 min window)

**Warning:**

- Lambda duration >3s (p99)
- Quota exceeded rate >50% of requests (indicates pricing issue)
- Storage quota >90% for any user (proactive upgrade prompt)

### Logging

**Lambda Logs:**

```javascript
console.log(
  JSON.stringify({
    event: 'pre_token_generation',
    user_id: userId,
    tier: user.tier,
    is_minor: user.is_minor,
    scopes_assigned: scopes.length,
    duration_ms: Date.now() - startTime,
  }),
)
```

**API Logs:**

```javascript
console.log(
  JSON.stringify({
    event: 'quota_check',
    user_id: req.user.id,
    quota_type: quotaType,
    current: currentCount,
    limit: limit,
    result: 'allowed' | 'exceeded',
  }),
)
```

---

## Testing Strategy

### Unit Tests

**Lambda Function:**

- Test scope assignment for each tier
- Test minor age restriction
- Test add-on scope assignment
- Test error handling (DB failure, missing user)
- Test admin scope assignment

**Middleware:**

- Test JWT verification (valid, invalid, expired)
- Test scope checking (has scope, missing scope, admin bypass)
- Test quota checking (under limit, at limit, over limit, admin bypass)
- Test quota increment (success, failure, rollback)

### Integration Tests

**End-to-End Flows:**

- User signup → Free tier → Upload 5 MOCs → Hit quota → Upgrade to Pro → Upload more
- Minor user → No chat access → Turn 18 → Gain chat access
- User purchases add-on → Scope added → Can use feature
- Admin user → Bypass all quotas → Access admin endpoints

**Database Tests:**

- Quota initialization on user creation
- Quota increment/decrement accuracy
- Reconciliation job correctness
- Transaction rollback on quota exceeded

### Load Tests

**Scenarios:**

- 100 concurrent logins (Lambda performance)
- 1000 concurrent API requests (quota check performance)
- 50 concurrent file uploads (storage quota checking)
- Database connection pool under load

**Targets:**

- p50 latency <100ms
- p99 latency <500ms
- Error rate <0.1%
- Throughput >1000 req/sec

---

## Implementation Tasks

### Phase 1: Foundation (Week 1-2)

**Task 1.1: Database Schema**

- [ ] Create `user_quotas` table
- [ ] Create quota initialization trigger
- [ ] Create indexes
- [ ] Write migration scripts
- [ ] Test quota initialization

**Task 1.2: Cognito Configuration**

- [ ] Create Cognito User Pool (if not exists)
- [ ] Configure groups: admin, free-tier, pro-tier, power-tier
- [ ] Set JWT expiration to 1 hour
- [ ] Configure custom attributes (if needed)
- [ ] Test user creation and group assignment

**Task 1.3: Lambda Function**

- [ ] Create Pre Token Generation Lambda
- [ ] Implement scope assignment logic
- [ ] Add database connection pooling
- [ ] Implement error handling
- [ ] Add CloudWatch logging
- [ ] Write unit tests
- [ ] Deploy and attach to Cognito trigger

### Phase 2: API Authorization (Week 3-4)

**Task 2.1: Middleware Development**

- [ ] Implement `authenticateToken` middleware
- [ ] Implement `requireScope` middleware
- [ ] Implement `checkQuota` middleware
- [ ] Implement `incrementQuota` middleware
- [ ] Implement `checkStorageQuota` middleware
- [ ] Write unit tests for all middleware

**Task 2.2: API Endpoint Protection**

- [ ] Add auth middleware to all endpoints
- [ ] Add scope requirements to each endpoint
- [ ] Add quota checks to upload endpoints
- [ ] Implement quota increment on success
- [ ] Test all endpoints with different tiers

**Task 2.3: Error Handling**

- [ ] Standardize error responses
- [ ] Add upgrade URLs to quota errors
- [ ] Implement retry logic for transient errors
- [ ] Add error logging and monitoring

### Phase 3: Frontend Integration (Week 5)

**Task 3.1: JWT Handling**

- [ ] Implement JWT storage (httpOnly cookies or localStorage)
- [ ] Parse JWT and extract scopes/groups
- [ ] Implement token refresh logic
- [ ] Handle token expiration gracefully
- [ ] Add "Refresh" button for manual token refresh

**Task 3.2: UI Feature Gating**

- [ ] Create `hasScope()` utility function
- [ ] Hide/show features based on scopes
- [ ] Display upgrade prompts for locked features
- [ ] Show quota usage indicators (e.g., "3/5 MOCs used")
- [ ] Implement tier badges (Free/Pro/Power/Admin)

**Task 3.3: Error Handling**

- [ ] Handle 401 (redirect to login)
- [ ] Handle 403 (show upgrade prompt)
- [ ] Handle 429 (show quota exceeded message)
- [ ] Handle 413 (show storage exceeded message)
- [ ] Implement user-friendly error messages

### Phase 4: Age Restrictions (Week 6)

**Task 4.1: Age Verification**

- [ ] Add birthdate field to signup form
- [ ] Store birthdate in database
- [ ] Implement `is_minor` computed column
- [ ] Update Lambda to check `is_minor` flag
- [ ] Test chat scope removal for minors

**Task 4.2: Chat Safety**

- [ ] Hide chat UI for users without `chat:participate` scope
- [ ] Display age restriction message for minors
- [ ] Implement profanity filter (toggleable for adults)
- [ ] Add report/block features
- [ ] Create moderation queue for flagged content

### Phase 5: Monitoring & Operations (Week 7)

**Task 5.1: CloudWatch Setup**

- [ ] Create custom metrics for Lambda
- [ ] Create custom metrics for API
- [ ] Set up CloudWatch dashboards
- [ ] Configure alarms (critical and warning)
- [ ] Set up SNS notifications for alarms

**Task 5.2: Logging**

- [ ] Implement structured logging in Lambda
- [ ] Implement structured logging in API
- [ ] Set up log aggregation
- [ ] Create log-based metrics
- [ ] Set up log retention policies

**Task 5.3: Reconciliation Jobs**

- [ ] Create quota reconciliation cron job
- [ ] Create storage usage recalculation job
- [ ] Create orphaned file cleanup job
- [ ] Test reconciliation accuracy
- [ ] Schedule jobs (daily at 2 AM UTC)

### Phase 6: Testing & Launch (Week 8)

**Task 6.1: Testing**

- [ ] Run unit tests (>90% coverage)
- [ ] Run integration tests
- [ ] Run load tests
- [ ] Perform security audit
- [ ] Test all edge cases

**Task 6.2: Documentation**

- [ ] API documentation (scopes, quotas, errors)
- [ ] Admin runbook (how to assign tiers, troubleshoot)
- [ ] User documentation (tier comparison, upgrade flow)
- [ ] Developer documentation (middleware usage)

**Task 6.3: Launch**

- [ ] Deploy to production
- [ ] Assign yourself to admin group
- [ ] Create test users for each tier
- [ ] Monitor for 24 hours
- [ ] Fix any issues
- [ ] Announce to users

---

## Future Enhancements

### Phase 7: Admin Panel (Future)

**Features:**

- View all users and their tiers
- Manually upgrade/downgrade users
- View quota usage across all users
- Moderate content (view, delete)
- View chat logs and moderate
- Ban/suspend users
- View analytics (signups, upgrades, quota usage)

**Scopes Required:**

- `admin:users:manage`
- `admin:content:moderate`
- `admin:chat:moderate`
- `admin:analytics:view`

### Phase 8: Subscription Management (Future)

**Features:**

- Stripe/PayPal integration
- Self-service tier upgrades
- Automatic tier assignment on payment
- Subscription renewal handling
- Downgrade flow (end of billing period)
- Refund handling

**Implementation:**

- Payment webhook updates `user_quotas.tier`
- Subscription cancellation sets tier to free at period end
- Prorated refunds for downgrades

### Phase 9: Advanced Features (Future)

**Usage Analytics:**

- User dashboard showing quota usage over time
- Predictions: "You'll hit your limit in 14 days"
- Recommendations: "Upgrade to Pro to unlock galleries"

**Flexible Quotas:**

- One-time quota boosts (e.g., "Upload 10 extra MOCs this month")
- Rollover unused quota to next month
- Quota sharing between team members (future team feature)

**Dynamic Pricing:**

- Pay-as-you-go storage (e.g., $0.10/GB over limit)
- A la carte feature purchases (buy just price scraping, not full tier)
- Annual billing discount (20% off)

---

## Success Criteria

### Launch Criteria (Must Have)

- [ ] All Phase 1-3 tasks complete
- [ ] Zero critical bugs
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Security audit complete
- [ ] Admin user can access all features
- [ ] Free user limited to 5 MOCs, 50MB
- [ ] Pro/Power tiers work as specified
- [ ] Quota enforcement working correctly
- [ ] No unauthorized access possible

### Post-Launch Metrics (30 Days)

**Technical:**

- API error rate <0.1%
- p99 latency <500ms
- Zero security incidents
- Zero quota bypass incidents
- Lambda cold start <1s

**Business:**

- X% of users hit free tier limits (validates quotas)
- Y% of users upgrade to paid tiers
- Average storage usage per tier
- Most popular features by tier

**User Experience:**

- User feedback on quota limits (too restrictive? too generous?)
- Upgrade conversion rate
- Feature adoption rate by tier

---

## Open Questions

### Technical

1. **JWT Storage:** httpOnly cookies vs localStorage?
   - Cookies: More secure (XSS protection), but CSRF concerns
   - localStorage: Easier to implement, but XSS vulnerable
   - **Recommendation:** httpOnly cookies with CSRF tokens

2. **Database:** PostgreSQL vs DynamoDB for quotas?
   - PostgreSQL: ACID transactions, computed columns, easier queries
   - DynamoDB: Serverless, auto-scaling, but eventual consistency
   - **Recommendation:** PostgreSQL for consistency

3. **File Storage:** S3 vs CloudFront + S3?
   - S3 only: Simpler, cheaper for small scale
   - CloudFront: Faster, but adds complexity and cost
   - **Recommendation:** S3 only initially, add CloudFront later

### Business

4. **Pricing:** What should Pro/Power tiers cost?
   - Calculate AWS costs per user (storage, bandwidth, compute)
   - Add margin for development time
   - Research competitor pricing
   - **Recommendation:** Pro = $5/mo, Power = $15/mo (placeholder)

5. **Free Tier Limits:** Are 5 MOCs / 50MB too restrictive?
   - Need user feedback after launch
   - Monitor conversion rates
   - Adjust based on data
   - **Recommendation:** Start conservative, increase if needed

6. **Add-on Pricing:** How to price scraping/tracking?
   - Depends on external API costs
   - Monitor actual usage and costs
   - **Recommendation:** $3/mo per add-on (placeholder)

### Product

7. **Grandfathering:** What happens when users downgrade?
   - Allow existing content to remain (read-only)?
   - Force deletion to get under limit?
   - Grace period (30 days to delete or upgrade)?
   - **Recommendation:** Grace period approach

8. **Team Accounts:** Should we support shared quotas?
   - Future feature for families/clubs
   - Shared storage pool, multiple users
   - Requires significant architecture changes
   - **Recommendation:** Not in MVP, revisit later

9. **Referral Program:** Incentivize user growth?
   - "Refer a friend, get +5 MOC slots"
   - Viral growth mechanism
   - Requires tracking and fraud prevention
   - **Recommendation:** Not in MVP, revisit if growth desired

---

## Risks & Mitigation

### Risk 1: Lambda Cold Starts Delay Login

**Impact:** High - Poor user experience
**Probability:** Medium - Lambda cold starts are common
**Mitigation:**

- Provision concurrency for Lambda (costs money)
- Keep Lambda warm with scheduled pings
- Optimize Lambda package size
- Use Lambda SnapStart (if available for Node.js)

### Risk 2: Database Becomes Bottleneck

**Impact:** High - API slowdowns, quota check failures
**Probability:** Low - <100 users unlikely to stress DB
**Mitigation:**

- Use connection pooling
- Add read replicas for quota queries
- Cache quota data in Redis (if needed)
- Monitor DB performance metrics

### Risk 3: Quota Bypass Exploits

**Impact:** Critical - Unlimited storage costs
**Probability:** Low - If implemented correctly
**Mitigation:**

- Thorough security audit
- Penetration testing
- Rate limiting on all endpoints
- Monitor for anomalous usage patterns
- Automated alerts on quota overages

### Risk 4: JWT Expiration Causes Confusion

**Impact:** Medium - Users lose access mid-session
**Probability:** High - 1 hour expiration is short
**Mitigation:**

- Implement automatic token refresh
- Show clear "Session expired" messages
- Provide easy re-login flow
- Consider longer expiration (4 hours?)

### Risk 5: Age Verification Circumvention

**Impact:** Medium - Minors access chat
**Probability:** High - Self-reported birthdate is easy to fake
**Mitigation:**

- Accept risk for MVP (honor system)
- Add parental consent flow later
- Implement chat moderation
- Clear ToS about age requirements
- Future: Third-party age verification service

### Risk 6: Pricing Too Low, Costs Exceed Revenue

**Impact:** High - Unsustainable business model
**Probability:** Medium - Hard to predict usage patterns
**Mitigation:**

- Monitor AWS costs closely
- Adjust pricing based on actual costs
- Implement usage alerts
- Cap storage per user (hard limit)
- Reserve right to adjust pricing in ToS

---

## Appendix

### A. Cognito Configuration Details

**User Pool Settings:**

- Pool name: `lego-inventory-users`
- Sign-in options: Email
- MFA: Optional (required for admin)
- Password policy: Min 8 chars, uppercase, lowercase, number, symbol
- Account recovery: Email only
- Email verification: Required

**App Client Settings:**

- Client name: `lego-inventory-web`
- Auth flows: USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH
- Token expiration: Access token 1 hour, Refresh token 30 days
- Scopes: Custom scopes defined in this PRD

**Lambda Triggers:**

- Pre Token Generation: `lego-inventory-pre-token-gen`
- Post Confirmation: `lego-inventory-post-signup` (creates user_quotas record)

### B. Database Indexes

```sql
-- Primary indexes
CREATE INDEX idx_user_quotas_tier ON user_quotas(tier);
CREATE INDEX idx_user_quotas_is_minor ON user_quotas(is_minor);
CREATE INDEX idx_user_quotas_updated_at ON user_quotas(updated_at);

-- Composite indexes for common queries
CREATE INDEX idx_user_quotas_tier_usage ON user_quotas(tier, storage_used_mb);
CREATE INDEX idx_user_quotas_addons ON user_quotas(has_price_scraping_addon, has_brick_tracking_addon) WHERE tier IN ('pro-tier', 'power-tier');
```

### C. API Error Response Format

```json
{
  "error": "quota_exceeded",
  "message": "You have reached your MOC upload limit",
  "details": {
    "quota_type": "mocs",
    "current": 5,
    "limit": 5,
    "tier": "free-tier"
  },
  "actions": [
    {
      "label": "Upgrade to Pro",
      "url": "/pricing",
      "description": "Get 100 MOC uploads and 1GB storage"
    },
    {
      "label": "Delete existing MOCs",
      "url": "/mocs",
      "description": "Free up space by removing old MOCs"
    }
  ]
}
```

### D. Scope Naming Convention

**Format:** `resource:action`

**Resources:**

- `moc` - MOCs (My Own Creations)
- `wishlist` - Wishlists
- `gallery` - Image galleries
- `setlist` - Set lists
- `chat` - Chat/messaging
- `user` - User discovery/profiles
- `review` - Reviews/ratings
- `profile` - Own profile management
- `privacy` - Privacy settings
- `admin` - Admin functions

**Actions:**

- `manage` - Full CRUD (create, read, update, delete)
- `read` - Read-only access
- `create` - Create new items
- `update` - Edit existing items
- `delete` - Remove items
- `participate` - Participate in activity (chat)
- `discover` - Discover other users
- `use` - Use a feature (add-ons)

**Examples:**

- `moc:manage` - Full access to own MOCs
- `chat:participate` - Can send/receive chat messages
- `admin:users:manage` - Admin can manage all users

---

## Changelog

**2025-12-01 - Initial Draft**

- Created comprehensive PRD for authorization system
- Defined 4 tiers (Admin, Free, Pro, Power)
- Specified Cognito groups and scopes
- Documented database schema
- Detailed Lambda implementation
- Outlined API middleware
- Identified edge cases and error handling
- Created implementation task breakdown
- Added monitoring and testing strategies

---

**End of PRD**
