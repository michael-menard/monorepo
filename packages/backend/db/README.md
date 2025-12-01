# @monorepo/db

Shared database client and schema for Lambda functions using Drizzle ORM and PostgreSQL.

## Features

- **Drizzle ORM** - Type-safe database queries
- **Connection Pooling** - Optimized for serverless with RDS Proxy
- **Schema Exports** - All table definitions in one place
- **Lambda Optimized** - Connection reuse across invocations

## Installation

```bash
pnpm add @monorepo/db
```

## Usage

### Basic Query

```typescript
import { db, galleryImages } from '@monorepo/db'

export async function handler(event) {
  const images = await db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.userId, userId))
    .limit(20)

  return {
    statusCode: 200,
    body: JSON.stringify({ images }),
  }
}
```

### With Schema Import

```typescript
import { db } from '@monorepo/db/client'
import * as schema from '@monorepo/db/schema'

const { galleryImages, galleryAlbums, wishlistImages } = schema
```

### Health Check

```typescript
import { testConnection } from '@monorepo/db'

export async function handler(event) {
  const isHealthy = await testConnection()

  return {
    statusCode: isHealthy ? 200 : 503,
    body: JSON.stringify({
      database: isHealthy ? 'healthy' : 'unhealthy'
    }),
  }
}
```

## Environment Variables

Required environment variables (automatically set by SST when linking):

- `POSTGRES_HOST` - Database hostname (RDS Proxy endpoint)
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_USERNAME` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DATABASE` - Database name
- `NODE_ENV` - Environment (production uses SSL)

## Connection Pooling

The client is optimized for Lambda:

- **Pool Size**: 1 connection per Lambda container
- **RDS Proxy**: Handles actual connection pooling
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 5 seconds (fail fast)

## Available Tables

- `galleryImages` - User gallery images
- `galleryAlbums` - User gallery albums
- `galleryFlags` - Image moderation flags
- `wishlistImages` - User wishlist images
- `mocInstructions` - MOC instruction sets
- `mocInstructionFiles` - MOC instruction file attachments

## Type Safety

All queries are fully type-safe:

```typescript
import { db, galleryImages } from '@monorepo/db'
import { eq } from 'drizzle-orm'

// ✅ Type-safe - TypeScript knows the shape
const images = await db
  .select()
  .from(galleryImages)
  .where(eq(galleryImages.userId, 'user-123'))

// images is typed as Array<typeof galleryImages.$inferSelect>
```

## Transactions

```typescript
import { db, galleryImages, galleryAlbums } from '@monorepo/db'

await db.transaction(async tx => {
  const [album] = await tx
    .insert(galleryAlbums)
    .values({ title: 'My Album', userId })
    .returning()

  await tx.insert(galleryImages).values({
    title: 'Image 1',
    userId,
    albumId: album.id,
    imageUrl: 'https://...',
  })
})
```
