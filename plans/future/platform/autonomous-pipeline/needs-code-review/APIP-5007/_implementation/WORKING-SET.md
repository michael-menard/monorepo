# APIP-5007 Working Set - Setup Phase

## Story
Database Schema Versioning and Migration Strategy for APIP Pipeline

## Phase
Implementation (setup)

## Constraints (from CLAUDE.md and codebase standards)

1. **SQL Migrations**: Use PostgreSQL standard migration format with versioning in schema_migrations table
   - Source: APIP-5001 baseline, PLAT-002 decision
2. **Thread ID Convention**: Format as `{story_id}:{stage}:{attempt_number}`
   - Source: AC-4 acceptance criteria
3. **LangGraph Checkpoint Isolation**: Ensure LangGraph checkpoint tables do NOT conflict with apip schema
   - Source: APIP-0010 dependencies
4. **Documentation Standards**: All ADRs, runbooks, DDL must follow existing docs structure
   - Source: CLAUDE.md project guidelines
5. **No Runtime Code Changes**: This is a DDL + documentation story
   - Source: Decision context (autonomy_level: aggressive)

## Next Steps

1. Read story requirements and acceptance criteria (full story)
2. Create ADR-002 (migration tooling + LangGraph checkpoint ownership)
3. Write baseline SQL DDL (001_apip_schema_baseline.sql)
4. Document thread ID convention
5. Document rollback procedures
6. Create local migration runbook
7. Create APIP-5001 gap analysis
8. Run integration tests (HP-1 through HP-5)
9. Request code review

## Branch/Worktree
TBD (will be set up during implementation phase)

## E2E Gate
exempt (infrastructure + documentation story)
