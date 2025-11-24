# Umami Analytics Database Integration

This directory contains the Umami analytics database schema and client integration for Story 1.2.

## Overview

The Umami analytics system uses a separate PostgreSQL schema namespace (`umami`) within the existing Aurora database for complete isolation from application data.

## Files

### Schema Definition

- **`umami-schema.ts`** - Complete Drizzle schema for Umami analytics tables
- **`umami-client.ts`** - Database client with AWS Secrets Manager integration
- **`setup-umami.ts`** - Setup script for schema, user, and credentials

### Configuration

- **`../../drizzle.umami.config.ts`** - Drizzle Kit configuration for Umami schema
- **`__tests__/umami-schema.test.ts`** - Unit tests for schema validation

## Database Schema

The Umami schema includes the following tables in the `umami` PostgreSQL namespace:

### Core Tables

- **`_prisma_migrations`** - Migration tracking
- **`account`** - Umami admin user accounts
- **`website`** - Website configurations for tracking
- **`session`** - User session data
- **`website_event`** - Page views and custom events
- **`event_data`** - Additional event metadata

### Team Management (Multi-user)

- **`team`** - Team information
- **`team_user`** - Team membership
- **`team_website`** - Team website access

## Usage

### 1. Initial Setup

Set up the Umami schema and database user:

```bash
# Set environment variables for Aurora master user
export POSTGRES_HOST="your-aurora-endpoint"
export POSTGRES_USERNAME="postgres"
export POSTGRES_PASSWORD="your-master-password"
export POSTGRES_DATABASE="lego_projects"
export AWS_REGION="us-east-1"

# Run setup script
npm run db:setup-umami
```

This creates:

- `umami` PostgreSQL schema
- `umami_user` database role with schema-scoped permissions
- AWS Secrets Manager secret: `observability/umami-db-credentials`

### 2. Generate and Apply Migrations

```bash
# Generate Drizzle migrations for Umami schema
npm run db:umami:generate

# Apply migrations to database
npm run db:umami:push

# Or use Drizzle Studio to explore the schema
npm run db:umami:studio
```

### 3. Using the Umami Database Client

```typescript
import { umamiDb } from '@/lib/db/umami-client'
import { website, session, websiteEvent } from '@/db/umami-schema'

// Query websites
const websites = await umamiDb.select().from(website)

// Query sessions for a website
const sessions = await umamiDb.select().from(session).where(eq(session.websiteId, websiteId))

// Query events with relations
const events = await umamiDb.query.websiteEvent.findMany({
  with: {
    website: true,
    session: true,
  },
})
```

### 4. Connection Testing

```typescript
import { testUmamiConnection, getUmamiConnectionInfo } from '@/lib/db/umami-client'

// Test connectivity
const isConnected = await testUmamiConnection()

// Get connection info (for debugging)
const info = await getUmamiConnectionInfo()
```

## Security & Isolation

### Schema Isolation

- All Umami tables are in the `umami` PostgreSQL schema namespace
- Complete isolation from application data (no foreign keys or relationships)
- Dedicated `umami_user` database role with permissions limited to `umami` schema only

### Credential Management

- Umami database credentials stored in AWS Secrets Manager
- Automatic credential retrieval in production
- No plaintext passwords in code or configuration

### Access Control

- `umami_user` cannot access application schemas (`public`, etc.)
- Application users cannot access `umami` schema
- Master database user retained for administrative tasks only

## Development Workflow

### Local Development

```bash
# Set up local environment with Umami credentials
export UMAMI_DATABASE_URL="postgresql://umami_user:password@localhost:5432/lego_projects?schema=umami"

# Generate migrations
npm run db:umami:generate

# Push schema changes
npm run db:umami:push

# Open Drizzle Studio
npm run db:umami:studio
```

### Production Deployment

- Credentials automatically retrieved from AWS Secrets Manager
- Connection pooling optimized for serverless environments
- Schema migrations applied during deployment

## Monitoring & Maintenance

### Performance

- Separate connection pool for Umami queries (max 2 connections)
- Optimized indexes for common analytics queries
- Connection reuse across Lambda invocations

### Backup & Recovery

- Included in Aurora automated backups
- Schema can be dropped and recreated without affecting application data
- Rollback script available in setup documentation

## Integration with Umami Application

The schema is designed to be compatible with Umami v2.x:

1. **Story 4.1** will deploy Umami ECS service using these credentials
2. **Umami container** will run Prisma migrations on startup
3. **Analytics data** will be stored in the `umami` schema tables
4. **Application queries** can access analytics data via the `umamiDb` client

## Troubleshooting

### Connection Issues

- Verify Aurora endpoint and credentials
- Check VPC security groups allow connections
- Ensure `umami_user` exists and has proper permissions

### Schema Issues

- Run `npm run db:setup-umami` to recreate schema and user
- Check AWS Secrets Manager for credential availability
- Verify schema isolation with test queries

### Migration Issues

- Ensure `umami_user` has CREATE privileges on `umami` schema
- Check Drizzle configuration points to correct schema
- Verify migration files are generated correctly
