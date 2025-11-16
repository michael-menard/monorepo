# Database Architecture

## Connection Strategy

**RDS Proxy Configuration**:
- **Max Connections**: 100 (configurable per environment)
- **Connection Borrowing Timeout**: 30 seconds
- **Idle Timeout**: 1800 seconds (30 minutes)
- **IAM Authentication**: Enabled for Lambda roles

**Connection Pooling in Lambda**:
- Drizzle client initialized outside handler (reused across invocations)
- Connection lazily established on first query
- Lambda execution context reuse leverages warm connections
- RDS Proxy manages connection lifecycle

**Example Connection Setup**:
```typescript
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Resource } from 'sst';

// Initialize pool outside handler for connection reuse
const pool = new Pool({
  host: Resource.MyPostgres.host,
  port: Resource.MyPostgres.port,
  database: Resource.MyPostgres.database,
  user: Resource.MyPostgres.username,
  password: Resource.MyPostgres.password,
  max: 1, // Lambda concurrency = 1, single connection per container
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool);
```

## Database Schema

The schema is unchanged from the existing Express API. All Drizzle definitions are migrated as-is.

**Tables**:
- `gallery_images`
- `gallery_albums`
- `gallery_flags`
- `moc_instructions`
- `moc_files`
- `moc_gallery_images` (join table)
- `moc_gallery_albums` (join table)
- `moc_parts_lists`
- `wishlist_items`

**Migration Strategy**:
- Existing database and schema remain in place
- No data migration required
- SST project includes Drizzle migration runner
- Migrations applied during SST deployment via `DevCommand` or deploy hook

---
