# Story 1.7: Redis Cache Flush Automation

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.7

**Priority:** High

**Estimated Effort:** 5 story points

---

## User Story

**As a** DevOps engineer,
**I want** automated Redis cache flushing before each rollout stage,
**so that** users don't experience stale data during dual-backend operation.

---

## Business Context

During the staged rollout, users may switch between Express and Serverless backends due to Route53 weighted routing. Without cache flushing, users could receive stale data cached by the opposite backend. This story implements selective cache flushing to prevent data inconsistencies while preserving critical caches like sessions and rate limits.

---

## Acceptance Criteria

**AC1**: Cache flush script created: `scripts/flush-migration-cache.ts` with selective pattern flushing (mocs, gallery, wishlist)

**AC2**: Script preserves critical caches: `sessions:*`, `ratelimit:*`, `user-profiles:*`

**AC3**: Dry-run mode implemented: `DRY_RUN=true` logs keys without deleting (for validation)

**AC4**: Script added to package.json: `pnpm flush:migration-cache` and `pnpm flush:migration-cache:dry-run`

**AC5**: CloudWatch metrics tracked: Redis hit/miss rate before/after flush, DB query latency spike

**AC6**: Rollout runbook documents flush procedure: Run script → Wait 2 minutes → Advance Route53 weights

**AC7**: Script includes error handling: Redis connection failures trigger retry (3 attempts, exponential backoff), timeout after 60 seconds, clear error messages logged

---

## Integration Verification

**IV1**: Dry-run in staging identifies correct key patterns (manual review of output)

**IV2**: Live flush in staging: Cache cleared, preserved patterns intact (sessions still work)

**IV3**: Performance impact measured: Cache hit rate drops to ~40%, recovers to >80% within 10 minutes

---

## Technical Implementation Notes

### Implementation Approach

```typescript
// scripts/flush-migration-cache.ts
import { createClient } from 'redis'
import { logger } from '../packages/core/logger/src'

const FLUSH_PATTERNS = ['mocs:*', 'gallery:*', 'wishlist:*', 'albums:*']

const PRESERVE_PATTERNS = ['sessions:*', 'ratelimit:*', 'user-profiles:*']

const DRY_RUN = process.env.DRY_RUN === 'true'
const MAX_RETRIES = 3
const TIMEOUT_MS = 60000

async function flushCache() {
  const client = createClient({
    url: process.env.REDIS_URL,
    socket: { connectTimeout: 10000 },
  })

  try {
    await client.connect()
    logger.info('Connected to Redis')

    let totalFlushed = 0

    for (const pattern of FLUSH_PATTERNS) {
      logger.info(`Scanning pattern: ${pattern}`)
      const keys = await scanPattern(client, pattern)

      if (DRY_RUN) {
        logger.info(`[DRY RUN] Would flush ${keys.length} keys matching ${pattern}`)
        keys.slice(0, 10).forEach(key => logger.info(`  - ${key}`))
      } else {
        if (keys.length > 0) {
          await client.del(keys)
          logger.info(`Flushed ${keys.length} keys matching ${pattern}`)
          totalFlushed += keys.length
        }
      }
    }

    logger.info(`Cache flush complete. Total keys flushed: ${totalFlushed}`)
  } catch (error) {
    logger.error('Cache flush failed', { error })
    throw error
  } finally {
    await client.quit()
  }
}

async function scanPattern(client, pattern: string): Promise<string[]> {
  const keys: string[] = []
  let cursor = 0

  do {
    const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 })
    cursor = reply.cursor
    keys.push(...reply.keys)
  } while (cursor !== 0)

  return keys
}

flushCache().catch(err => {
  logger.error('Script failed', { error: err })
  process.exit(1)
})
```

**package.json scripts**:

```json
{
  "scripts": {
    "flush:migration-cache": "tsx scripts/flush-migration-cache.ts",
    "flush:migration-cache:dry-run": "DRY_RUN=true tsx scripts/flush-migration-cache.ts"
  }
}
```

---

## Definition of Done

- [ ] Cache flush script created with selective pattern flushing
- [ ] Critical caches preserved (sessions, rate limits)
- [ ] Dry-run mode implemented and tested
- [ ] Package.json scripts added
- [ ] Error handling with retries implemented
- [ ] CloudWatch metrics configured
- [ ] Rollout runbook documented
- [ ] Manual testing in staging completed
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

**Story Created:** 2025-11-23
