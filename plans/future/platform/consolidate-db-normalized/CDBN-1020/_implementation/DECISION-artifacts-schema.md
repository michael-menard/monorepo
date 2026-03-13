# DECISION: Artifacts Schema Design

## Context

CDBN-1020 requires consolidating artifact tables from two sources:
1. **artifacts.* schema** (7 tables from lego_dev port 5432): checkpoint_artifacts, evidence_artifacts, plan_artifacts, qa_verify_artifacts, review_artifacts, scope_artifacts, story_artifacts
2. **wint.story_artifacts** (from lego_dev): Has dedup strategy `keep_latest_by_updated_at` on (story_id, artifact_type)

The target is a normalized artifacts schema in knowledgebase DB (port 5433).

## Decision

### Schema Structure: Jump Table Pattern (Same as Existing)

Maintain the existing jump table pattern used in knowledgebase:
- **artifacts.jump_table** (story_artifacts equivalent): Core artifact metadata with references to type-specific detail tables
- **artifacts.detail_* tables**: Type-specific tables (checkpoints, reviews, evidence, etc.)

This approach:
- Preserves existing application patterns
- Enables type-specific indexes and columns
- Maintains compatibility with existing code

### Idempotency Strategy

Add unique constraint on `(story_id, artifact_type, artifact_name, iteration)`:
- `story_id`: Reference to workflow.stories
- `artifact_type`: Type discriminator (checkpoint, scope, plan, etc.)
- `artifact_name`: Human-readable name (optional, for disambiguation)
- `iteration`: Fix cycle number (default 0)

This matches the existing pattern in knowledgebase's public.story_artifacts and ensures:
- Multiple artifacts of same type for a story are allowed (via artifact_name)
- Re-running artifact creation is idempotent
- Phase is NOT part of the key (artifacts can move across phases)

### Foreign Key References

All artifact tables reference `workflow.stories.story_id`:
- FK constraint with ON DELETE CASCADE for detail tables
- FK with ON DELETE CASCADE on jump_table (cascade deletes detail rows)

### Handling Legacy Duplicates

Per CDBN-0020 MANIFEST:
- wint.story_artifacts deduplication: `keep_latest_by_updated_at` on (story_id, artifact_type)
- Before migration, run deduplication to remove duplicates
- Migration inserts deduped rows into artifacts.jump_table

## Consequences

- Jump table pattern maintained (existing code compatible)
- Unique constraint ensures idempotent artifact creation
- FK to workflow.stories enables cascade deletes
- Deduplication step required before migration (handled in CDBN-1030)
