# @monorepo/search

Generic, type-safe search engine for OpenSearch and PostgreSQL with fuzzy matching and automatic fallback.

## Features

- ✅ **Generic** - Works with any entity (images, documents, products, etc.)
- ✅ **Dual Backend** - OpenSearch primary + PostgreSQL fallback
- ✅ **Fuzzy Matching** - Tolerates typos with configurable fuzziness
- ✅ **Relevance Scoring** - Field boosting for better search results
- ✅ **User Isolation** - Multi-tenant support with automatic user filtering
- ✅ **Type-Safe** - Full TypeScript support with generics
- ✅ **Performance Tracking** - Built-in logging of search metrics
- ✅ **Pagination** - Page-based result pagination
- ✅ **Flexible** - Can search metadata only or integrate with document parsing

## Installation

```bash
pnpm add @monorepo/search
```

## Usage

### Basic Setup

```typescript
import { createSearchEngine, SearchConfig } from '@monorepo/search'
import { db } from './db/client'
import { getOpenSearchClient } from './search/opensearch-client'
import { logger } from './utils/logger'
import { galleryImages } from './db/schema'

// Configure search for your entity
const galleryConfig: SearchConfig = {
  indexName: 'gallery_images',
  table: galleryImages,
  searchableFields: [
    { field: 'title', boost: 3, postgresColumn: galleryImages.title },
    { field: 'description', boost: 2, postgresColumn: galleryImages.description },
    { field: 'tags', boost: 1, postgresColumn: galleryImages.tags },
  ],
  userIdColumn: galleryImages.userId,
}

// Create search engine
const openSearchClient = await getOpenSearchClient()
const searchEngine = createSearchEngine(
  galleryConfig,
  openSearchClient, // Pass null to use PostgreSQL only
  db,
  logger,
)

// Execute search
const results = await searchEngine.search({
  query: 'lego castle',
  userId: 'user-123',
  page: 1,
  limit: 20,
})

console.log(results.data) // Search results with optional scores
console.log(results.total) // Total matching results
console.log(results.source) // 'opensearch' or 'postgres'
console.log(results.duration) // Search duration in ms
```

### Multiple Entities

```typescript
// Gallery search
const gallerySearch = createSearchEngine(galleryConfig, openSearch, db, logger)

// Wishlist search
const wishlistSearch = createSearchEngine(wishlistConfig, openSearch, db, logger)

// MOC instructions search
const mocSearch = createSearchEngine(mocConfig, openSearch, db, logger)

// Search all entities in parallel
const [galleryResults, wishlistResults, mocResults] = await Promise.all([
  gallerySearch.search({ query: 'castle', userId, page: 1, limit: 10 }),
  wishlistSearch.search({ query: 'castle', userId, page: 1, limit: 10 }),
  mocSearch.search({ query: 'castle', userId, page: 1, limit: 10 }),
])
```

### With Sorting (PostgreSQL Fallback)

```typescript
const wishlistConfig: SearchConfig = {
  indexName: 'wishlist_items',
  table: wishlistItems,
  searchableFields: [
    { field: 'title', boost: 3, postgresColumn: wishlistItems.title },
    { field: 'description', boost: 2, postgresColumn: wishlistItems.description },
    { field: 'category', boost: 1, postgresColumn: wishlistItems.category },
  ],
  userIdColumn: wishlistItems.userId,
  sortColumn: wishlistItems.sortOrder, // Custom sort for PostgreSQL
  sortDirection: 'asc',
}
```

### Cache Integration

```typescript
import { SearchEngine } from '@monorepo/search'

// Generate cache key
const cacheKey = `search:${indexName}:${userId}:${SearchEngine.hashQuery(query)}:${page}:${limit}`

// Check cache
const cached = await redis.get(cacheKey)
if (cached) {
  return JSON.parse(cached)
}

// Execute search
const results = await searchEngine.search(options)

// Cache results (e.g., 2 minutes)
await redis.setEx(cacheKey, 120, JSON.stringify(results))
```

## Configuration

### SearchConfig

| Field              | Type              | Description                          |
| ------------------ | ----------------- | ------------------------------------ |
| `indexName`        | `string`          | OpenSearch index name                |
| `table`            | `any`             | Drizzle table reference              |
| `searchableFields` | `SearchField[]`   | Fields to search with optional boost |
| `userIdColumn`     | `any`             | Column for user isolation            |
| `sortColumn`       | `any`             | Optional sort column for PostgreSQL  |
| `sortDirection`    | `'asc' \| 'desc'` | Optional sort direction              |

### SearchField

| Field            | Type     | Description                        |
| ---------------- | -------- | ---------------------------------- |
| `field`          | `string` | Field name in OpenSearch           |
| `boost`          | `number` | Optional boost factor (default: 1) |
| `postgresColumn` | `any`    | Drizzle column for PostgreSQL      |

### SearchOptions

| Field    | Type     | Description             |
| -------- | -------- | ----------------------- |
| `query`  | `string` | Search query            |
| `userId` | `string` | User ID for filtering   |
| `page`   | `number` | Page number (1-indexed) |
| `limit`  | `number` | Results per page        |

### SearchResult

| Field      | Type                         | Description                  |
| ---------- | ---------------------------- | ---------------------------- |
| `data`     | `T[]`                        | Results with optional scores |
| `total`    | `number`                     | Total matching results       |
| `source`   | `'opensearch' \| 'postgres'` | Search backend used          |
| `duration` | `number`                     | Search duration in ms        |

## How It Works

1. **OpenSearch First**: Attempts search via OpenSearch with:
   - Multi-match query across configured fields
   - Field boosting for relevance (e.g., title^3)
   - Fuzzy matching (AUTO: 0-2 edit distance based on term length)
   - User isolation via term filter

2. **Fetch Full Data**: OpenSearch returns IDs + scores, then fetches full records from PostgreSQL

3. **PostgreSQL Fallback**: On OpenSearch failure:
   - Uses ILIKE queries across configured fields
   - Applies custom sorting if configured
   - Returns results without scores

4. **Performance Logging**: Tracks and logs:
   - Search duration
   - Result count
   - Total hits
   - Backend source

## Best Practices

1. **Field Boosting**: Set higher boost for more important fields (e.g., title: 3, description: 2)
2. **Cache Results**: Use Redis caching to reduce load (2-5 minute TTL recommended)
3. **Pagination**: Use reasonable page sizes (10-50 results)
4. **User Isolation**: Always configure userIdColumn for multi-tenant apps
5. **Logging**: Provide a logger to track performance and debug issues

## License

MIT
