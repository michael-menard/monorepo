# Project Structure

```plaintext
apps/api/lego-api-serverless/
├── sst.config.ts                     # SST infrastructure definition
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── src/
│   ├── functions/                    # Lambda handlers
│   │   ├── health.ts                 # Health check
│   │   ├── mocs.ts                   # MOC Instructions CRUD
│   │   ├── gallery.ts                # Gallery Images CRUD + Albums
│   │   ├── wishlist.ts               # Wishlist CRUD
│   │   ├── profile.ts                # User Profile + Avatar
│   │   ├── upload.ts                 # File uploads
│   │   └── parse-csv.ts              # CSV parts list parser
│   ├── lib/                          # Shared business logic
│   │   ├── db/                       # Database utilities
│   │   │   ├── client.ts             # Drizzle client setup
│   │   │   ├── schema.ts             # Drizzle schema definitions
│   │   │   └── migrations/           # Migration files
│   │   ├── cache/                    # Redis utilities
│   │   │   ├── client.ts             # Redis client setup
│   │   │   ├── keys.ts               # Cache key patterns
│   │   │   └── utils.ts              # Cache helpers
│   │   ├── search/                   # OpenSearch utilities
│   │   │   ├── client.ts             # OpenSearch client
│   │   │   ├── indexers.ts           # Index document functions
│   │   │   └── queries.ts            # Search queries
│   │   ├── storage/                  # S3 utilities
│   │   │   ├── client.ts             # S3 client setup
│   │   │   ├── upload.ts             # Upload helpers
│   │   │   └── delete.ts             # Delete helpers
│   │   ├── auth/                     # Auth utilities
│   │   │   ├── cognito.ts            # Cognito Admin API
│   │   │   └── jwt.ts                # JWT validation (if needed)
│   │   ├── image/                    # Image processing
│   │   │   └── sharp-processor.ts    # Sharp utilities
│   │   ├── validation/               # Zod schemas
│   │   │   ├── moc.ts                # MOC validation schemas
│   │   │   ├── gallery.ts            # Gallery schemas
│   │   │   ├── wishlist.ts           # Wishlist schemas
│   │   │   └── profile.ts            # Profile schemas
│   │   ├── errors/                   # Error classes
│   │   │   ├── api-error.ts          # Base API error
│   │   │   └── handlers.ts           # Error handler utilities
│   │   └── utils/                    # Common utilities
│   │       ├── response.ts           # Standard response builders
│   │       ├── logger.ts             # Pino logger setup
│   │       └── retry.ts              # Retry logic
│   └── types/                        # TypeScript types
│       ├── api.ts                    # API request/response types
│       ├── lambda.ts                 # Lambda event types
│       └── index.ts                  # Barrel exports
├── scripts/                          # Utility scripts
│   ├── reindex-opensearch.ts         # Bulk re-indexing
│   └── seed-dev-data.ts              # Dev data seeding
└── __tests__/                        # Tests
    ├── unit/                         # Unit tests
    │   ├── functions/                # Handler tests
    │   └── lib/                      # Library tests
    └── integration/                  # Integration tests
        ├── mocs.test.ts              # MOC API integration
        ├── gallery.test.ts           # Gallery API integration
        └── setup.ts                  # Test setup/teardown
```

---
