# CDBN-2020: Extend workflow.stories schema

## Summary

Extended `workflow.stories` table to match `public.stories` schema.

## Changes Made

- Created migration file: `042_cdbn2020_extend_workflow_stories_schema.sql`
- Added columns: `id`, `epic`, `story_type`, `points`, `phase`, `iteration`, `blocked`, `blocked_reason`, `blocked_by_story`, `touches_backend`, `touches_frontend`, `touches_database`, `touches_infra`, `acceptance_criteria`, `embedding`, `started_at`, `completed_at`
- Added CHECK constraints for: `phase`, `priority`, `state`, `story_type`
- Added indexes for: `epic`, `phase`, `story_type`, `priority`, `blocked`

## Next Steps

Run migration:
```bash
cd apps/knowledge-base
pnpm db:migrate
```

Then proceed to CDBN-2021 to migrate data.
