-- Migration 1002: Composite index for artifact precondition lookups
--
-- kb_update_story_status now checks artifacts.story_artifacts for required
-- artifact types before allowing certain state transitions. This index
-- supports those O(log n) lookups instead of full table scans.
--
-- Required by AUDIT-2 enforcement (Option B application-level guard).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_artifacts_precondition_lookup
  ON artifacts.story_artifacts(story_id, artifact_type);

COMMENT ON INDEX artifacts.idx_story_artifacts_precondition_lookup IS
  '1002: Supports artifact precondition checks in kb_update_story_status.';
