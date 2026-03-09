-- KB Persistence for BUGF-026
-- Generated: 2026-02-11

INSERT INTO stories (
  story_id,
  feature,
  title,
  story_dir,
  story_file,
  story_type,
  points,
  priority,
  state,
  touches_backend,
  touches_frontend,
  touches_database,
  touches_infra
) VALUES (
  'BUGF-026',
  'bug-fix',
  'Auth Token Refresh Security Review',
  'plans/future/bug-fix/backlog/BUGF-026',
  'plans/future/bug-fix/backlog/BUGF-026/BUGF-026.md',
  'documentation',
  3,
  'high',
  'backlog',
  false,
  false,
  false,
  false
)
ON CONFLICT (story_id) DO UPDATE SET
  title = EXCLUDED.title,
  story_dir = EXCLUDED.story_dir,
  story_file = EXCLUDED.story_file,
  story_type = EXCLUDED.story_type,
  points = EXCLUDED.points,
  priority = EXCLUDED.priority,
  state = EXCLUDED.state,
  touches_backend = EXCLUDED.touches_backend,
  touches_frontend = EXCLUDED.touches_frontend,
  touches_database = EXCLUDED.touches_database,
  touches_infra = EXCLUDED.touches_infra;
