# @monorepo/rate-limiter

Redis-based rate limiting middleware for AWS Lambda functions using sliding window algorithm.

## Features

- **Sliding Window Algorithm**: Accurate rate limiting using Redis sorted sets
- **Configurable**: Custom limits, time windows, and key prefixes
- **Fail-Open**: Allows requests if Redis is unavailable (prevents total service outage)
- **Type-Safe**: Full TypeScript support
- **Logger-Agnostic**: Bring your own logger or use silent defaults

## Installation

```bash
pnpm add @monorepo/rate-limiter
```

## Usage

### Basic Usage

```typescript
import { createClient } from 'redis'
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@monorepo/rate-limiter'

const redis = await createClient().connect()

// Check rate limit for a user
const result = await checkRateLimit(redis, 'user-123', RATE_LIMIT_CONFIGS.profile)

if (!result.allowed) {
  return {
    statusCode: 429,
    body: JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: result.retryAfter,
    }),
  }
}

// Continue with request...
```

### Custom Configuration

```typescript
import { checkRateLimit, type RateLimitConfig } from '@monorepo/rate-limiter'

const customConfig: RateLimitConfig = {
  maxRequests: 30, // 30 requests
  windowSeconds: 60, // per minute
  keyPrefix: 'ratelimit:custom',
}

const result = await checkRateLimit(redis, userId, customConfig)
```

### With Custom Logger

```typescript
import { checkRateLimit, type RateLimiterLogger } from '@monorepo/rate-limiter'

const logger: RateLimiterLogger = {
  debug: (msg, meta) => console.debug(msg, meta),
  warn: (msg, meta) => console.warn(msg, meta),
  error: (msg, meta) => console.error(msg, meta),
}

const result = await checkRateLimit(redis, userId, config, logger)
```

### Pre-defined Configurations

```typescript
import { RATE_LIMIT_CONFIGS } from '@monorepo/rate-limiter'

// Profile endpoints: 60 requests/minute
RATE_LIMIT_CONFIGS.profile

// Strict limits: 10 requests/minute
RATE_LIMIT_CONFIGS.strict

// Lenient limits: 120 requests/minute
RATE_LIMIT_CONFIGS.lenient
```

## API

### `checkRateLimit(redis, identifier, config, logger?)`

Check if a request is within the rate limit.

**Parameters:**
- `redis`: RedisClientType - Connected Redis client
- `identifier`: string - Unique identifier (userId, IP, etc.)
- `config`: RateLimitConfig - Rate limit configuration
- `logger?`: RateLimiterLogger - Optional logger (defaults to no-op)

**Returns:** `Promise<RateLimitResult>`

```typescript
interface RateLimitResult {
  allowed: boolean // Whether request is allowed
  remaining: number // Requests remaining in window
  resetAt: Date // When the rate limit resets
  retryAfter?: number // Seconds until next allowed request (if denied)
}
```

### `RateLimitConfig`

```typescript
interface RateLimitConfig {
  maxRequests: number // Max requests in window
  windowSeconds: number // Window size in seconds
  keyPrefix: string // Redis key prefix
}
```

## How It Works

The rate limiter uses Redis sorted sets to implement a sliding window algorithm:

1. **Remove Old Entries**: Entries outside the current time window are removed
2. **Count Requests**: Current request count is retrieved
3. **Check Limit**: If under limit, request is added; otherwise, request is denied
4. **Calculate Reset**: Next available time is calculated based on oldest entry

**Benefits of Sliding Window:**
- More accurate than fixed windows
- No sudden traffic spikes at window boundaries
- Fair distribution of requests over time

## Error Handling

The rate limiter uses a **fail-open** strategy:
- If Redis is unavailable, requests are **allowed**
- Errors are logged but don't block requests
- Prevents complete service outage due to Redis issues

## Redis Key Structure

Keys are stored as: `{keyPrefix}:{identifier}`

Example: `ratelimit:profile:user-123`

Each key contains a sorted set where:
- **Member**: Timestamp string (e.g., "1234567890")
- **Score**: Timestamp (for range queries)

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check

# Run tests
pnpm test
```
