# KB Operations Runbook

Operational procedures for managing the Knowledge Base system.

## Quick Reference

| Task | Command |
|------|---------|
| Start KB database | `cd apps/api/knowledge-base && docker-compose up -d` |
| Stop KB database | `cd apps/api/knowledge-base && docker-compose down` |
| Check health | `pnpm kb:validate-connection` |
| View logs | `docker-compose logs -f kb-postgres` |
| Run migrations | `pnpm db:init` |
| Open DB UI | `pnpm db:studio` |
| Create backup | `./scripts/backup-kb.sh` |

---

## Daily Operations

### Starting the KB System

```bash
# 1. Navigate to KB package
cd apps/api/knowledge-base

# 2. Start PostgreSQL container
docker-compose up -d

# 3. Wait for healthy status
docker-compose ps  # Should show "healthy"

# 4. Validate connection
pnpm kb:validate-connection
```

### Stopping the KB System

```bash
# Graceful shutdown (preserves data)
docker-compose down

# Full cleanup including data (DESTRUCTIVE)
docker-compose down -v
```

### Checking KB Health

```bash
# Full validation
pnpm kb:validate-connection

# Quick Docker check
docker-compose ps

# Database connectivity test
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "SELECT 1"
```

---

## MCP Server Operations

### Starting MCP Server (Manual)

```bash
# Build first
pnpm build

# Start server
node dist/mcp-server/index.js
```

### Validating Claude Code Integration

```bash
# Generate Claude Code config
pnpm kb:generate-config

# Validate everything
pnpm kb:validate-connection

# Check output:
# - Docker running
# - Database healthy
# - MCP server built
# - Environment vars set
# - Database connectivity
# - OpenAI API valid
```

### Troubleshooting MCP Server

**Server not appearing in Claude Code:**
1. Check config exists: `cat ~/.claude/mcp.json`
2. Verify JSON syntax: `jq . ~/.claude/mcp.json`
3. Check path is absolute and correct
4. Restart Claude Code (not just refresh)

**Server crashes on startup:**
1. Check environment variables are set
2. Test server directly: `node dist/mcp-server/index.js`
3. Look for error messages in output
4. Verify database is running

---

## Database Operations

### Running Migrations

```bash
# Initialize database (runs all migrations)
pnpm db:init

# Generate new migration from schema changes
pnpm db:generate

# Push schema directly (dev only, no migration file)
pnpm db:push
```

### Seeding Sample Data

```bash
pnpm db:seed
```

### Viewing Data

```bash
# Drizzle Studio (web UI)
pnpm db:studio

# Direct psql access
docker exec -it knowledge-base-postgres psql -U kbuser -d knowledgebase

# Common queries:
\dt                          # List tables
SELECT COUNT(*) FROM knowledge_entries;
SELECT * FROM knowledge_entries LIMIT 5;
SELECT * FROM tasks WHERE status = 'open';
```

### Analyzing Performance

```bash
# Run ANALYZE for query optimization
pnpm db:analyze

# Check table sizes
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT schemaname, relname,
         pg_size_pretty(pg_total_relation_size(relid)) as total_size
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
"

# Check index usage
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public';
"
```

---

## Backup and Recovery

### Creating Backups

```bash
# Automated backup script
./scripts/backup-kb.sh

# Manual backup
docker exec knowledge-base-postgres pg_dump -U kbuser knowledgebase | gzip > backups/kb-backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

### Validating Backups

```bash
# Validate specific backup
./scripts/validate-backup.sh --backup-file=backups/kb-backup-20260204-100000.sql.gz

# Monthly validation of all backups
./scripts/monthly-validate-all.sh
```

### Restoring from Backup

```bash
# Full restore procedure
./scripts/restore-kb.sh --backup-file=backups/kb-backup-20260204-100000.sql.gz

# Manual restore
docker-compose down -v
docker-compose up -d
gunzip -c backups/kb-backup-20260204-100000.sql.gz | docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase
```

### Cleanup Old Backups

```bash
./scripts/cleanup-backups.sh
```

---

## Embedding Operations

### Regenerating Embeddings

When embedding model changes or embeddings become corrupted:

```bash
# Via MCP tool
# In Claude Code: Use kb_rebuild_embeddings

# Check embedding cache status
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT COUNT(*) as cache_entries FROM embedding_cache;
"
```

### Clearing Embedding Cache

```bash
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  TRUNCATE embedding_cache;
"
```

---

## Task Backlog Operations

### Viewing Open Tasks

```bash
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT id, title, task_type, priority, status, source_story_id
  FROM tasks
  WHERE status = 'open'
  ORDER BY priority, created_at;
"
```

### Task Audit Trail

```bash
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT task_id, operation, timestamp
  FROM task_audit_log
  ORDER BY timestamp DESC
  LIMIT 20;
"
```

### Bulk Task Operations

```bash
# Close all tasks for a completed story
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  UPDATE tasks
  SET status = 'completed', completed_at = NOW()
  WHERE source_story_id = 'WISH-2045' AND status = 'open';
"
```

---

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs kb-postgres

# Recreate container
docker-compose down
docker-compose up -d
```

**Port 5433 in use:**
```bash
# Find process using port
lsof -i :5433

# Either stop that process or change KB_DB_PORT in .env
```

### Database Issues

**Connection refused:**
```bash
# Check container is running
docker ps | grep knowledge-base

# Check container health
docker inspect knowledge-base-postgres | jq '.[0].State.Health'

# Restart container
docker-compose restart kb-postgres
```

**Authentication failed:**
```bash
# Verify credentials match
cat .env | grep KB_DB
docker-compose config | grep POSTGRES

# If mismatch, recreate container with correct credentials
docker-compose down -v
docker-compose up -d
```

**Connection pool exhausted:**
```bash
# Check active connections
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT count(*) FROM pg_stat_activity WHERE datname = 'knowledgebase';
"

# Kill idle connections
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'knowledgebase'
    AND state = 'idle'
    AND pid <> pg_backend_pid();
"
```

### OpenAI API Issues

**Rate limiting:**
- Wait and retry with exponential backoff
- Check OpenAI status: https://status.openai.com/

**Invalid API key:**
```bash
# Test key directly
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# If 401: Key is invalid or revoked
# If 200: Key is valid, check environment variable propagation
```

### Search Quality Issues

**Poor search results:**
1. Check if embeddings exist for entries
2. Verify IVFFlat index is being used (EXPLAIN query)
3. Run ANALYZE after bulk imports
4. Consider rebuilding embeddings

```bash
# Check for entries without embeddings
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT COUNT(*) FROM knowledge_entries WHERE embedding IS NULL;
"

# Check index usage
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  EXPLAIN SELECT * FROM knowledge_entries
  ORDER BY embedding <=> '[0.1,0.2,...]'::vector LIMIT 10;
"
```

---

## Monitoring

### Key Metrics to Watch

| Metric | Normal Range | Action if Exceeded |
|--------|--------------|-------------------|
| Connection count | < 50% of max | Increase pool size |
| Query latency | < 500ms | Check slow query log |
| Disk usage | < 80% | Archive old data |
| Embedding cache hits | > 50% | Working as expected |

### Log Analysis

```bash
# View recent logs
docker-compose logs --tail=100 kb-postgres

# Follow logs
docker-compose logs -f kb-postgres

# Search for errors
docker-compose logs kb-postgres 2>&1 | grep -i error
```

### Performance Profiling

```bash
# Enable slow query logging (in psql)
SET log_min_duration_statement = 100;  # Log queries > 100ms

# Check running queries
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT pid, now() - query_start AS duration, query, state
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY duration DESC;
"
```

---

## Emergency Procedures

### Database Unresponsive

1. **Restart container:**
   ```bash
   docker-compose restart kb-postgres
   ```

2. **If restart fails, recreate:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **If data is corrupted, restore from backup:**
   ```bash
   ./scripts/restore-kb.sh --backup-file=<latest_backup>
   ```

### Disk Full

1. **Identify large tables:**
   ```bash
   docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
     SELECT pg_size_pretty(pg_total_relation_size(relid)), relname
     FROM pg_stat_user_tables
     ORDER BY pg_total_relation_size(relid) DESC;
   "
   ```

2. **Clean up Docker:**
   ```bash
   docker system prune -a
   ```

3. **Archive old KB entries:**
   ```bash
   # Backup old entries first, then delete
   ```

### Full Reset (Last Resort)

```bash
# WARNING: This deletes ALL data
docker-compose down -v
docker-compose up -d
pnpm db:init
pnpm db:seed  # Optional: restore sample data
```

---

## Related Documentation

- [KB-MEMORY-ARCHITECTURE.md](./KB-MEMORY-ARCHITECTURE.md) - 3-bucket memory model
- [DEPLOYMENT.md](./DEPLOYMENT.md) - MCP server deployment
- [DISASTER-RECOVERY-RUNBOOK.md](./DISASTER-RECOVERY-RUNBOOK.md) - Full DR procedures
- [PERFORMANCE.md](./PERFORMANCE.md) - Performance tuning
