# Story 1.8: Serverless Backend Cache Namespacing

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.8

**Priority:** Medium

**Estimated Effort:** 3 story points

---

## User Story

**As a** backend engineer,
**I want** serverless Lambda functions to use `v2:` cache key prefix during migration,
**so that** cache collisions with Express backend are impossible.

---

## Business Context

During dual-backend operation, both Express and Serverless APIs share the same Redis instance. Without cache namespacing, they would read/write the same keys, causing data inconsistencies. This story implements a `v2:` prefix for all Serverless cache operations, ensuring complete isolation during migration.

---

## Acceptance Criteria

**AC1**: Environment variable `MIGRATION_MODE` added to serverless backend (default: `false`)

**AC2**: Cache key generation updated: `const prefix = process.env.MIGRATION_MODE === 'true' ? 'v2:' : ''`

**AC3**: All Redis cache operations (get, set, del) use prefixed keys when migration mode enabled

**AC4**: Unit tests verify correct prefix applied in migration mode, no prefix in normal mode

**AC5**: Post-migration cleanup documented: Set `MIGRATION_MODE=false`, flush `v1:*` keys

**AC6**: Cache namespacing strategy documented in `docs/operations/redis-cache-management.md` for future brownfield migrations

---

## Integration Verification

**IV1**: Staging deployment with `MIGRATION_MODE=true`: All cache operations use `v2:` prefix

**IV2**: Dual operation test: Express writes to `mocs:user:123:list`, Serverless reads from `v2:mocs:user:123:list` (no collision)

**IV3**: Cache isolation verified: User updates MOC via Express, switch to Serverless → no stale cache hit

---

## Technical Implementation Notes

### Implementation Approach

```typescript
// apps/api/lego-api-serverless/src/lib/cache/redis-client.ts
import { createClient } from 'redis'

const MIGRATION_PREFIX = process.env.MIGRATION_MODE === 'true' ? 'v2:' : ''

export class CacheClient {
  private client: ReturnType<typeof createClient>

  private prefixKey(key: string): string {
    return `${MIGRATION_PREFIX}${key}`
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(this.prefixKey(key))
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const prefixedKey = this.prefixKey(key)
    if (ttl) {
      await this.client.setEx(prefixedKey, ttl, value)
    } else {
      await this.client.set(prefixedKey, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(this.prefixKey(key))
  }
}
```

**SST Environment Configuration**:

```typescript
// sst.config.ts
export default $config({
  app(input) {
    return {
      name: 'lego-api-serverless',
      stage: input?.stage || 'dev',
    }
  },
  async run() {
    const migrationMode = $app.stage === 'production' ? 'false' : 'true'

    new sst.aws.Function('ApiFunction', {
      handler: 'src/functions/index.handler',
      environment: {
        MIGRATION_MODE: migrationMode,
        // ... other env vars
      },
    })
  },
})
```

---

## Definition of Done

- [ ] `MIGRATION_MODE` environment variable added
- [ ] Cache key prefixing implemented in all Redis operations
- [ ] Unit tests verify prefix behavior
- [ ] Documentation created in `docs/operations/redis-cache-management.md`
- [ ] Post-migration cleanup procedure documented
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

**Story Created:** 2025-11-23
