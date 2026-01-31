# Agent Context - KNOW-006: QA Verification Phase

## Story Information

| Field | Value |
|-------|-------|
| story_id | KNOW-006 |
| feature_dir | plans/future/knowledgebase-mcp |
| phase | qa-verify |
| status | in-qa |
| base_path | plans/future/knowledgebase-mcp/UAT/KNOW-006/ |
| artifacts_path | plans/future/knowledgebase-mcp/UAT/KNOW-006/_implementation/ |
| started_at | 2026-01-25T18:51:00Z |

## Key Files

### Story Files
- Story: `plans/future/knowledgebase-mcp/UAT/KNOW-006/KNOW-006.md`
- Elaboration: `plans/future/knowledgebase-mcp/UAT/KNOW-006/ELAB-KNOW-006.md`
- Proof: `plans/future/knowledgebase-mcp/UAT/KNOW-006/PROOF-KNOW-006.md`
- Verification: `plans/future/knowledgebase-mcp/UAT/KNOW-006/_implementation/VERIFICATION.yaml`
- Test Plan: `plans/future/knowledgebase-mcp/UAT/KNOW-006/_pm/TEST-PLAN.md`

### Source Files
- Package root: `apps/api/knowledge-base/`
- MCP server: `apps/api/knowledge-base/src/mcp-server/`
- CRUD operations: `apps/api/knowledge-base/src/crud-operations/`
- Embedding client: `apps/api/knowledge-base/src/embedding-client/`
- Types: `apps/api/knowledge-base/src/__types__/`

### Seed Data Sources
- YAML seed data: `plans/future/knowledgebase-mcp/seed-data.yaml`
- Lessons learned: `plans/future/knowledgebase-mcp/LESSONS-LEARNED.md`

## Implementation Targets

### New Files to Create
```
apps/api/knowledge-base/src/parsers/
  __types__/index.ts          # Zod schemas for parsed data
  parse-seed-yaml.ts          # YAML parser implementation
  parse-lessons-learned.ts    # Markdown parser implementation
  index.ts                    # Barrel exports
  __tests__/
    parse-seed-yaml.test.ts
    parse-lessons-learned.test.ts

apps/api/knowledge-base/src/seed/
  __types__/index.ts          # Bulk import result schemas
  kb-bulk-import.ts           # Bulk import implementation
  index.ts                    # Barrel exports
  __tests__/
    kb-bulk-import.test.ts
```

### Existing Files to Modify
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Update kb_bulk_import schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Implement handleKbBulkImport, update handleKbStats

## Acceptance Criteria Summary

| AC | Description | Priority |
|----|-------------|----------|
| AC1 | Parse YAML seed data with Zod validation | P1 |
| AC2 | Parse LESSONS-LEARNED.md markdown | P1 |
| AC3 | kb_bulk_import batch processing | P1 |
| AC4 | kb_bulk_import error handling | P1 |
| AC5 | kb_stats statistics queries | P1 |
| AC6 | MCP tool registration | P1 |
| AC7 | YAML security validation | P1 |
| AC8 | Duplicate ID detection | P1 |
| AC9 | CLI seeding scripts (optional) | P3 |
| AC10 | Test coverage >= 85% | P1 |
| AC11-AC20 | QA discovery enhancements | P2 |

## Performance Targets

- kb_bulk_import: < 5 seconds per 10 entries
- kb_stats: < 500ms query time
- Maximum 1000 entries per bulk import call

## Coverage Targets

- Parsers: 85%+ line coverage
- Seed directory: 85%+ line coverage
- kb_stats: 80%+ line coverage
