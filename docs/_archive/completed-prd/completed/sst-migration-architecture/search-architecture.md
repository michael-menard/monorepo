# Search Architecture

## OpenSearch Configuration

**Domain**:

- **Node Type**: t3.small.search (dev), r6g.large.search (production)
- **Node Count**: 1 (dev), 3 (production with dedicated master)
- **EBS Volume**: 20 GB (dev), 100 GB (production)
- **Fine-Grained Access Control**: Enabled with IAM-based authentication

## Index Definitions

**MOC Instructions Index**: `moc_instructions`

**Mappings**:

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "description": { "type": "text", "analyzer": "standard" },
      "tags": {
        "type": "keyword",
        "fields": { "text": { "type": "text", "analyzer": "standard" } }
      },
      "type": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

**Gallery Images Index**: `gallery_images`
**Wishlist Items Index**: `wishlist_items`

## Indexing Strategy

**Async Indexing**:

- After successful database write, index document in OpenSearch
- Non-blocking operation (errors logged but don't fail request)
- Eventual consistency acceptable

**Bulk Indexing** (for initial migration):

- SST deployment task or one-time script
- Stream existing data from PostgreSQL
- Bulk insert to OpenSearch indices

## Search Query Pattern

**Multi-Match Query**:

```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "userId": "user-123" } },
        {
          "multi_match": {
            "query": "search term",
            "fields": ["title^3", "description", "tags^2"],
            "fuzziness": "AUTO",
            "type": "best_fields"
          }
        }
      ]
    }
  },
  "sort": [{ "_score": { "order": "desc" } }, { "updatedAt": { "order": "desc" } }]
}
```

## Fallback to PostgreSQL

If OpenSearch unavailable or query fails:

```typescript
async function searchMOCs(userId: string, query: string) {
  try {
    return await searchOpenSearch(userId, query)
  } catch (error) {
    logger.warn('OpenSearch unavailable, falling back to PostgreSQL')
    return await searchPostgreSQL(userId, query)
  }
}

async function searchPostgreSQL(userId: string, query: string) {
  return await db
    .select()
    .from(mocInstructions)
    .where(
      and(
        eq(mocInstructions.userId, userId),
        or(
          ilike(mocInstructions.title, `%${query}%`),
          ilike(mocInstructions.description, `%${query}%`),
        ),
      ),
    )
}
```

---
