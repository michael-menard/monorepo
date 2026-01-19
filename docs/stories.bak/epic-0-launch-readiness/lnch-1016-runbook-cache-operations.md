# Story lnch-1016: Cache Operations Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a cache operations runbook,
**so that** I can manage OpenSearch and other caches effectively.

## Epic Context

This is **Story 8 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **Medium** - Required for search and caching.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1021: OpenSearch Operations Runbook (detailed search operations)
- lnch-1011: Frontend Deployment Runbook (CloudFront cache)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/cache-operations.md`
2. Documents OpenSearch index management
3. Documents reindexing procedures
4. Documents cache invalidation
5. Documents search performance tuning
6. Documents CloudFront cache management
7. Documents emergency cache clear

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/cache-operations.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Index Management** (AC: 2)
  - [ ] List indices
  - [ ] View index mappings
  - [ ] Delete old indices
  - [ ] Index aliases

- [ ] **Task 3: Document Reindexing** (AC: 3)
  - [ ] Full reindex procedure
  - [ ] Partial reindex
  - [ ] Zero-downtime reindex

- [ ] **Task 4: Document Invalidation** (AC: 4)
  - [ ] OpenSearch document updates
  - [ ] Bulk refresh
  - [ ] Force merge

- [ ] **Task 5: Document Performance Tuning** (AC: 5)
  - [ ] Shard configuration
  - [ ] Replica settings
  - [ ] Query optimization

- [ ] **Task 6: Document CloudFront Cache** (AC: 6)
  - [ ] Create invalidation
  - [ ] Monitor invalidation status
  - [ ] Cost considerations

- [ ] **Task 7: Document Emergency Clear** (AC: 7)
  - [ ] When to use
  - [ ] Full cache clear procedure
  - [ ] Impact assessment

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/cache-operations.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers index management, reindexing, cache invalidation

2. **Playbook**: `docs/operations/playbooks/cache-failures.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers search degradation, stale cache incidents, emergency clear

The runbook handles normal operations; the playbook handles when things go wrong.

---

### OpenSearch Operations

**List Indices**
```bash
curl -X GET "https://opensearch-domain/_cat/indices?v"
```

**Reindex**
```bash
curl -X POST "https://opensearch-domain/_reindex" -H 'Content-Type: application/json' -d'
{
  "source": { "index": "mocs-v1" },
  "dest": { "index": "mocs-v2" }
}'
```

**Force Refresh**
```bash
curl -X POST "https://opensearch-domain/mocs/_refresh"
```

### CloudFront Invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"

# Check status
aws cloudfront get-invalidation \
  --distribution-id E1234567890 \
  --id ABCDEFGHIJ
```

### OpenSearch Domain
- Available in staging/production only
- Dev uses PostgreSQL full-text search

## Testing

### Verification
- Commands work with actual OpenSearch domain
- Procedures are safe (no data loss)
- Cost implications documented

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
