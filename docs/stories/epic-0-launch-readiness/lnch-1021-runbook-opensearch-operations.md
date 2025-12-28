# Story lnch-1021: OpenSearch Operations Runbook

## Status

Draft

## Story

**As an** operator,
**I want** an OpenSearch operations runbook,
**so that** I can manage search infrastructure effectively.

## Epic Context

This is **Story 3 of Launch Readiness Epic: Infrastructure Runbooks Workstream**.
Priority: **Medium** - Search infrastructure (staging/production only).

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1016: Cache Operations Runbook (search cache management)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/opensearch-operations.md`
2. Documents index management
3. Documents mapping updates
4. Documents reindexing procedures
5. Documents cluster health monitoring
6. Documents backup/snapshot management
7. Documents scaling procedures

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/opensearch-operations.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Index Management** (AC: 2)
  - [ ] List indices
  - [ ] Create index
  - [ ] Delete index
  - [ ] Index aliases

- [ ] **Task 3: Document Mappings** (AC: 3)
  - [ ] View current mappings
  - [ ] Add new fields
  - [ ] Mapping update limitations
  - [ ] Reindex for mapping changes

- [ ] **Task 4: Document Reindexing** (AC: 4)
  - [ ] Zero-downtime reindex
  - [ ] Alias swap pattern
  - [ ] Progress monitoring
  - [ ] Rollback procedure

- [ ] **Task 5: Document Health Monitoring** (AC: 5)
  - [ ] Cluster health API
  - [ ] Shard status
  - [ ] Node status
  - [ ] Common health issues

- [ ] **Task 6: Document Backups** (AC: 6)
  - [ ] Automated snapshots
  - [ ] Manual snapshot creation
  - [ ] Restore from snapshot

- [ ] **Task 7: Document Scaling** (AC: 7)
  - [ ] Instance type changes
  - [ ] Adding data nodes
  - [ ] Storage scaling

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/opensearch-operations.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers index management, reindexing, health monitoring

2. **Playbook**: `docs/operations/playbooks/opensearch-incident.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers cluster red/yellow, search degradation, capacity issues

The runbook handles normal operations; the playbook handles when things go wrong.

---

### OpenSearch Configuration
- Available in: staging, production
- Dev uses PostgreSQL full-text search

### Domain Names
- `lego-api-staging-search`
- `lego-api-production-search`

### Index Names
- `mocs` - MOC instructions
- (add others as applicable)

### Common Commands

**Cluster Health**
```bash
curl -X GET "https://search-domain/_cluster/health?pretty"
```

**List Indices**
```bash
curl -X GET "https://search-domain/_cat/indices?v"
```

**View Mappings**
```bash
curl -X GET "https://search-domain/mocs/_mapping?pretty"
```

**Zero-Downtime Reindex**
```bash
# 1. Create new index with updated mapping
curl -X PUT "https://search-domain/mocs-v2" -d @mapping.json

# 2. Reindex
curl -X POST "https://search-domain/_reindex" -d '
{
  "source": { "index": "mocs" },
  "dest": { "index": "mocs-v2" }
}'

# 3. Swap alias
curl -X POST "https://search-domain/_aliases" -d '
{
  "actions": [
    { "remove": { "index": "mocs", "alias": "mocs-alias" } },
    { "add": { "index": "mocs-v2", "alias": "mocs-alias" } }
  ]
}'
```

### CloudWatch Alarms
- `opensearch-cluster-red` - Cluster status is red
- `opensearch-jvm-pressure` - JVM memory > 80%

## Testing

### Verification
- Commands work with actual domain
- Procedures are tested
- Health monitoring is accurate

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
