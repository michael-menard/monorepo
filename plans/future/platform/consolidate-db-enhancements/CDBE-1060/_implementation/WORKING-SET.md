# CDBE-1060 Working Set

**Story:** Story Completion and Cancellation Cascade Trigger Functions  
**Branch:** TBD  
**Phase:** Implementation  
**Iteration:** 0

## Constraints

1. **Use Zod schemas for all types** — Source: CLAUDE.md
2. **No barrel files** — Source: CLAUDE.md
3. **Use @repo/logger, not console** — Source: CLAUDE.md (for any logging)
4. **Minimum 45% test coverage** — Source: CLAUDE.md
5. **Named exports preferred** — Source: CLAUDE.md
6. **Dependencies must be merged first** — Source: CDBE-1060 story
   - CDBE-1010 (state history trigger) must be in production
   - CDBE-1050 (DDL prerequisites: story_assignments, story_blockers, story_dependencies.resolved_at) must be in production
7. **No partial cascades** — Source: CDBE-1060 story
   - If any sub-operation fails, the entire cascade must roll back
   - Atomicity enforced by explicit transaction wrapping trigger body
8. **Flag-only on cancellation** — Source: CDBE-1060 story
   - Stories blocked by a cancelled story must be flagged, NOT auto-resolved or auto-advanced
9. **Handle edge cases gracefully** — Source: CDBE-1060 story
   - 0-row UPDATE operations must not raise errors
   - Missing worktree rows must be handled gracefully (no error, no INSERT)
   - Missing blocker rows on cancellation must be handled gracefully

## Next Steps

1. Review CDBE-1050 schema additions to verify story_assignments, story_blockers, story_dependencies.resolved_at exist
2. Review CDBE-1010 state history trigger to understand existing trigger patterns
3. Implement story_completion_cascade() function in 1060_completion_cancellation_cascade.sql
   - Mark story_dependencies row as resolved (resolved_at = NOW()) for this story's entry as a dependency
   - Mark worktree row as merged (merged_at = NOW()) if it exists
   - Soft-delete open story_assignments rows (deleted_at = NOW() where deleted_at IS NULL)
4. Implement story_cancellation_cascade() function
   - Soft-delete open story_assignments rows (deleted_at = NOW())
   - Soft-delete open story_blockers rows (deleted_at = NOW())
   - Flag stories blocked by the cancelled story (flag mechanism to be documented)
5. Create story_cascade_trigger AFTER UPDATE trigger on workflow.stories
   - Wrap functions in explicit transaction
   - Early exit for non-cascade transitions (NOT IN 'completed', 'cancelled')
6. Write pgtap tests with transaction rollback assertions
   - Test completion cascade: dependency resolved, worktree merged, assignments deleted
   - Test cancellation cascade: assignments and blockers deleted, downstream stories flagged
   - Test edge cases: 0-row updates, missing worktree, missing blockers
   - Test atomicity: partial failure causes full rollback
   - Test non-cascade transitions pass through without side effects
7. Verify all tests pass
8. Submit for code review

## Key Files

- Migration: `apps/api/knowledge-base/src/db/migrations/1060_completion_cancellation_cascade.sql`
- Tests: `apps/api/knowledge-base/src/db/migrations/pgtap/1060_completion_cancellation_cascade_test.sql`

## Dependencies Status

- CDBE-1010: ✓ Merged (state history trigger)
- CDBE-1050: ✓ Merged (DDL prerequisites)

This story can proceed to implementation.
