-- Test Data: Sample Stories for WINT-1090 Migration Testing
-- Description: Sample story records to serve as foreign key targets for workflow artifacts
-- Usage: psql -h localhost -p 5432 -U postgres -d lego_projects -f test-data-stories.sql

-- ============================================================================
-- Pre-check: Verify wint schema and stories table exist
-- ============================================================================
-- Expected: Should return 1 row with table_name = 'stories'
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'wint' AND table_name = 'stories';

-- ============================================================================
-- Insert Sample Stories
-- ============================================================================
-- Using explicit UUIDs for predictable foreign key references in other fixtures
-- All story_id values follow pattern: WINT-TEST-XXX

-- Story 1: Feature in backlog (P0)
INSERT INTO wint.stories (
  id,
  story_id,
  title,
  description,
  story_type,
  epic,
  wave,
  priority,
  complexity,
  story_points,
  state,
  feature_id,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'WINT-TEST-001',
  'Test Story: Add User Authentication',
  'Implement JWT-based authentication for API endpoints',
  'feature',
  'WINT',
  1,
  'P0',
  'high',
  8,
  'backlog',
  NULL,
  jsonb_build_object(
    'surfaces', jsonb_build_object('backend', true, 'frontend', false, 'database', true),
    'tags', jsonb_build_array('security', 'api'),
    'goal', 'Secure API endpoints with JWT authentication'
  ),
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
);

-- Story 2: Bug in progress (P1)
INSERT INTO wint.stories (
  id,
  story_id,
  title,
  description,
  story_type,
  epic,
  priority,
  complexity,
  story_points,
  state,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'WINT-TEST-002',
  'Test Story: Fix Memory Leak in Image Processing',
  'Memory leak detected in thumbnail generation for large images',
  'bug',
  'BUGF',
  'P1',
  'medium',
  5,
  'in_progress',
  jsonb_build_object(
    'surfaces', jsonb_build_object('backend', true),
    'tags', jsonb_build_array('performance', 'memory')
  ),
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '2 days'
);

-- Story 3: Tech debt ready for QA (P2)
INSERT INTO wint.stories (
  id,
  story_id,
  title,
  description,
  story_type,
  priority,
  complexity,
  state,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'WINT-TEST-003',
  'Test Story: Refactor Database Connection Pool',
  'Update connection pooling strategy for better performance',
  'tech-debt',
  'P2',
  'low',
  'ready_for_qa',
  jsonb_build_object(
    'surfaces', jsonb_build_object('backend', true, 'database', true),
    'tags', jsonb_build_array('refactoring', 'performance')
  ),
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
);

-- Story 4: Spike completed (P3)
INSERT INTO wint.stories (
  id,
  story_id,
  title,
  description,
  story_type,
  priority,
  state,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  'WINT-TEST-004',
  'Test Story: Research Vector Database Options',
  'Evaluate pgvector vs Pinecone for semantic search',
  'spike',
  'P3',
  'done',
  jsonb_build_object(
    'tags', jsonb_build_array('research', 'database')
  ),
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '3 days'
);

-- Story 5: Feature in draft (P2)
INSERT INTO wint.stories (
  id,
  story_id,
  title,
  description,
  story_type,
  priority,
  complexity,
  story_points,
  state,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000005',
  'WINT-TEST-005',
  'Test Story: Implement Real-time Notifications',
  'Add WebSocket support for real-time user notifications',
  'feature',
  'P2',
  'high',
  13,
  'draft',
  jsonb_build_object(
    'surfaces', jsonb_build_object('backend', true, 'frontend', true),
    'tags', jsonb_build_array('realtime', 'websocket'),
    'non_goals', jsonb_build_array('Email notifications', 'SMS notifications')
  ),
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
);

-- Story 6: Feature in QA (P1)
INSERT INTO wint.stories (
  id,
  story_id,
  title,
  description,
  story_type,
  priority,
  complexity,
  story_points,
  state,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  'WINT-TEST-006',
  'Test Story: Add Rate Limiting to API',
  'Implement per-user rate limiting for API endpoints',
  'feature',
  'P1',
  'medium',
  5,
  'in_qa',
  jsonb_build_object(
    'surfaces', jsonb_build_object('backend', true),
    'tags', jsonb_build_array('api', 'security', 'rate-limiting')
  ),
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '1 hour'
);

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Expected: 6 rows
-- SELECT story_id, title, state, priority FROM wint.stories WHERE story_id LIKE 'WINT-TEST-%' ORDER BY story_id;

-- ============================================================================
-- Cleanup Query (to remove test data)
-- ============================================================================
-- DELETE FROM wint.stories WHERE story_id LIKE 'WINT-TEST-%';
