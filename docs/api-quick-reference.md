# API Quick Reference

**Version:** 1.0.0  
**Base URL:** `https://api.lego-inventory.com/v1`

---

## Authentication

```bash
# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
# Returns: { user, refresh_token, expires_in }
# Sets HttpOnly cookie: access_token=<JWT>

# Refresh Token
POST /auth/refresh
{
  "refresh_token": "..."
}
# Returns: { expires_in }
# Sets HttpOnly cookie: access_token=<NEW_JWT>

# Logout
POST /auth/logout
# Clears HttpOnly cookie

# All requests automatically include access_token cookie
# For testing: Use Authorization: Bearer <access_token> OR Cookie: access_token=<token>
```

---

## Quotas

```bash
# Get current user's quotas
GET /quotas/me
# Returns: UserQuotas object with usage and limits
```

---

## MOCs

```bash
# List MOCs
GET /mocs?page=1&limit=20&theme=Castle&build_status=building&sort=created_at&order=desc
# Scope: moc:manage

# Get MOC
GET /mocs/{id}
# Scope: moc:manage

# Create MOC
POST /mocs
{
  "name": "Medieval Castle",
  "description": "...",
  "theme": "Castle",
  "piece_count": 2847,
  "designer": "John Doe",
  "purchase_url": "https://...",
  "tags": ["castle", "medieval"]
}
# Scope: moc:manage
# Checks: mocs quota

# Update MOC
PUT /mocs/{id}
{ ...same as create... }
# Scope: moc:manage

# Delete MOC
DELETE /mocs/{id}
# Scope: moc:manage
# Frees: mocs quota, storage quota

# Upload file to MOC
POST /mocs/{id}/files
Content-Type: multipart/form-data
file: [binary]
file_type: pdf|image
# Scope: moc:manage
# Checks: storage quota
# Max: 100MB (PDF), 25MB (image)

# Delete file from MOC
DELETE /mocs/{id}/files/{fileId}
# Scope: moc:manage
# Frees: storage quota
```

---

## Wishlists

```bash
# List wishlists
GET /wishlists?page=1&limit=20
# Scope: wishlist:manage

# Create wishlist
POST /wishlists
{
  "name": "Dream Castle Sets",
  "description": "...",
  "is_public": true
}
# Scope: wishlist:manage
# Checks: wishlists quota

# Get/Update/Delete: Similar to MOCs
```

---

## Galleries (Pro/Power only)

```bash
# List galleries
GET /galleries?page=1&limit=20
# Scope: gallery:manage

# Create gallery
POST /galleries
{
  "name": "Castle Collection Photos",
  "description": "..."
}
# Scope: gallery:manage
# Checks: galleries quota

# Upload image to gallery
POST /galleries/{id}/images
Content-Type: multipart/form-data
file: [binary]
caption: "My favorite build"
# Scope: gallery:manage
# Checks: storage quota
```

---

## Set Lists (Power only)

```bash
# List set lists
GET /setlists?page=1&limit=20
# Scope: setlist:manage

# Create set list
POST /setlists
{
  "name": "Official Castle Sets I Own",
  "description": "..."
}
# Scope: setlist:manage
# Checks: setlists quota (unlimited for Power tier)
```

---

## Users

```bash
# Get my profile
GET /users/me
# Scope: profile:manage

# Update my profile
PUT /users/me
{
  "username": "castle_builder_42",
  "profile_visibility": "public|network|private",
  "theme_breakdown_visible": true
}
# Scope: profile:manage

# Discover similar users (Pro/Power only)
GET /users/discover?min_similarity=50&limit=10
# Scope: user:discover
# Returns: Users with similar theme breakdowns

# Get another user's profile
GET /users/{userId}
# Scope: user:discover
# Respects privacy settings
```

---

## Reviews (Pro/Power only)

```bash
# List reviews
GET /reviews?moc_id={id}&user_id={id}&page=1&limit=20
# Scope: review:manage

# Create review
POST /reviews
{
  "moc_id": "...",
  "rating": 5,
  "review_text": "Amazing build!",
  "build_time_hours": 24.5,
  "difficulty": "medium",
  "would_recommend": true
}
# Scope: review:manage
# Must own the MOC
```

---

## Chat (Pro/Power only, 18+)

```bash
# List channels
GET /chat/channels
# Scope: chat:participate
# Returns: General and theme-based channels

# Get channel messages
GET /chat/channels/{channelId}/messages?limit=50&before=2025-12-01T10:00:00Z
# Scope: chat:participate
# History limit: Pro=30 days, Power=365 days

# Send message
POST /chat/channels/{channelId}/messages
{
  "message": "Hello everyone!"
}
# Scope: chat:participate
# Max length: 2000 characters
```

---

## Admin Endpoints (Admin only)

```bash
# List all users
GET /admin/users?page=1&limit=50&tier=pro-tier&search=email
# Scope: admin:users:manage

# Get user details
GET /admin/users/{userId}
# Scope: admin:users:manage

# Update user
PUT /admin/users/{userId}
{
  "tier": "pro-tier",
  "has_price_scraping_addon": true,
  "custom_mocs_limit": 150
}
# Scope: admin:users:manage

# Delete user
DELETE /admin/users/{userId}
# Scope: admin:users:manage

# List all MOCs
GET /admin/content/mocs?page=1&limit=50&user_id={id}
# Scope: admin:content:moderate

# Delete any MOC
DELETE /admin/content/mocs/{id}?reason=inappropriate
# Scope: admin:content:moderate

# View all chat messages
GET /admin/chat/messages?channel_id={id}&user_id={id}&limit=100
# Scope: admin:chat:moderate

# Delete chat message
DELETE /admin/chat/messages/{messageId}?reason=spam
# Scope: admin:chat:moderate

# Get analytics
GET /admin/analytics?period=month
# Scope: admin:analytics:view
# Returns: User stats, content stats, storage stats, activity stats
```

---

## Error Responses

All errors return:
```json
{
  "error": "error_code",
  "message": "Human-readable message",
  "details": { ... },
  "actions": [
    {
      "label": "Upgrade to Pro",
      "url": "/pricing",
      "description": "Get 100 MOC uploads"
    }
  ]
}
```

**Common Error Codes:**
- `401 unauthorized` - Invalid/missing token
- `403 forbidden` - Missing scope or tier
- `404 not_found` - Resource doesn't exist
- `409 conflict` - Resource already exists
- `413 storage_exceeded` - Storage quota full
- `429 quota_exceeded` - Item quota reached
- `429 rate_limit_exceeded` - Too many requests

---

## Rate Limits

| Tier | Requests/Minute |
|------|-----------------|
| Free | 100 |
| Pro | 1,000 |
| Power | 5,000 |
| Admin | Unlimited |

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1733137260
```

---

## Scopes by Tier

| Scope | Free | Pro | Power | Admin |
|-------|------|-----|-------|-------|
| `moc:manage` | ✅ | ✅ | ✅ | ✅ |
| `wishlist:manage` | ✅ | ✅ | ✅ | ✅ |
| `profile:manage` | ✅ | ✅ | ✅ | ✅ |
| `gallery:manage` | ❌ | ✅ | ✅ | ✅ |
| `chat:participate` | ❌ | ✅ (18+) | ✅ (18+) | ✅ |
| `user:discover` | ❌ | ✅ | ✅ | ✅ |
| `review:manage` | ❌ | ✅ | ✅ | ✅ |
| `setlist:manage` | ❌ | ❌ | ✅ | ✅ |
| `privacy:advanced` | ❌ | ❌ | ✅ | ✅ |
| `price-scraping:use` | Add-on | Add-on | Add-on | ✅ |
| `brick-tracking:use` | Add-on | Add-on | Add-on | ✅ |
| `admin:*` | ❌ | ❌ | ❌ | ✅ |

---

## Quotas by Tier

| Resource | Free | Pro | Power | Admin |
|----------|------|-----|-------|-------|
| MOCs | 5 | 100 | 200 | ∞ |
| Storage | 50MB | 1GB | 2GB | ∞ |
| Wishlists | 1 | 20 | 40 | ∞ |
| Galleries | 0 | 20 | 40 | ∞ |
| Set Lists | 0 | 0 | ∞ | ∞ |
| Chat History | N/A | 30 days | 365 days | ∞ |

---

**Full Documentation:** [API Implementation Guide](./api-implementation-guide.md)  
**OpenAPI Spec:** [api-spec.yaml](./api-spec.yaml)

