# Setup Log for CDTS-1040

## Actions Completed

1. [OK] Story moved from ready-to-work to in-progress
2. [OK] Story status updated to in-progress
3. [OK] _implementation directory created
4. [OK] CHECKPOINT.yaml written
5. [OK] SCOPE.yaml written

## Story Context

**Story ID**: CDTS-1040
**Title**: Update MCP Tool SQL
**Feature**: Schema-qualify raw SQL in semantic.ts, keyword.ts, kb-get-related.ts with explicit public. prefix. Update list tools to query header tables only; get-by-id tools JOIN to detail tables. Add WHERE deleted_at IS NULL to all entity queries.

**Touches**: backend, packages, db, contracts
**Risk Flags**: migrations, security, performance

## Constraints

- Use Zod schemas for all types (CLAUDE.md)
- No barrel files (CLAUDE.md)
- Use @repo/logger, not console (CLAUDE.md)
- Minimum 45% test coverage (CLAUDE.md)
- Named exports preferred (CLAUDE.md)
- High query count — grep scope must cover all MCP src files including crud-operations/, search/, and mcp-server/
- Drizzle ORM handles schema qualification for Drizzle queries automatically; only raw sql`` queries need manual prefixing

## Blockers

None. CDTS-1030 blocking dependency has been resolved.

## Next Steps

1. Read story requirements in detail
2. Implement backend MCP tool query updates
3. Add schema qualification to raw SQL queries
4. Implement header/detail split for list queries
5. Add soft-delete filtering (WHERE deleted_at IS NULL)
6. Update analytics schema references
7. Write tests
8. Run verification

