-- Test Data: Workflow Artifacts for WINT-1090 Migration Testing
-- Description: Sample workflow artifact records (elaborations, plans, verifications, proofs, token_usage)
-- Prerequisites: test-data-stories.sql must be loaded first
-- Usage: psql -h localhost -p 5432 -U postgres -d lego_projects -f test-data-workflow-artifacts.sql

-- ============================================================================
-- Elaborations - Story readiness assessments
-- ============================================================================

-- Elaboration for WINT-TEST-001 (pass verdict)
INSERT INTO wint.elaborations (
  story_id,
  date,
  verdict,
  content,
  readiness_score,
  gaps_count,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  'pass',
  jsonb_build_object(
    'title', 'Add User Authentication',
    'ready', true,
    'gaps', jsonb_build_array(),
    'readiness_score', 95,
    'acceptance_criteria', jsonb_build_array(
      jsonb_build_object('ac_id', 'AC-001', 'text', 'JWT tokens generated on login'),
      jsonb_build_object('ac_id', 'AC-002', 'text', 'Protected endpoints require valid token')
    )
  ),
  95,
  0,
  'test-fixture',
  NOW() - INTERVAL '6 days'
);

-- Elaboration for WINT-TEST-002 (concerns verdict)
INSERT INTO wint.elaborations (
  story_id,
  date,
  verdict,
  content,
  readiness_score,
  gaps_count,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  CURRENT_DATE,
  'concerns',
  jsonb_build_object(
    'title', 'Fix Memory Leak in Image Processing',
    'ready', false,
    'gaps', jsonb_build_array(
      jsonb_build_object('gap_id', 'GAP-001', 'description', 'Need profiling data for root cause')
    ),
    'readiness_score', 65
  ),
  65,
  1,
  'test-fixture',
  NOW() - INTERVAL '4 days'
);

-- Elaboration for WINT-TEST-003 (pass verdict)
INSERT INTO wint.elaborations (
  story_id,
  date,
  verdict,
  content,
  readiness_score,
  gaps_count,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  CURRENT_DATE,
  'pass',
  jsonb_build_object(
    'title', 'Refactor Database Connection Pool',
    'ready', true,
    'gaps', jsonb_build_array(),
    'readiness_score', 90
  ),
  90,
  0,
  'test-fixture',
  NOW() - INTERVAL '9 days'
);

-- ============================================================================
-- Implementation Plans - Versioned execution plans
-- ============================================================================

-- Plan v1 for WINT-TEST-001
INSERT INTO wint.implementation_plans (
  story_id,
  version,
  content,
  steps_count,
  files_count,
  complexity,
  created_by,
  estimated_files,
  estimated_tokens,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  1,
  jsonb_build_object(
    'steps', jsonb_build_array(
      jsonb_build_object('step_id', 'P-001', 'description', 'Add JWT library dependency'),
      jsonb_build_object('step_id', 'P-002', 'description', 'Create authentication middleware'),
      jsonb_build_object('step_id', 'P-003', 'description', 'Update API endpoints')
    ),
    'files_to_change', jsonb_build_array(
      'package.json',
      'src/middleware/auth.ts',
      'src/routes/api.ts'
    )
  ),
  3,
  3,
  'high',
  'test-fixture',
  3,
  5000,
  NOW() - INTERVAL '6 days'
);

-- Plan v2 for WINT-TEST-001 (revised)
INSERT INTO wint.implementation_plans (
  story_id,
  version,
  content,
  steps_count,
  files_count,
  complexity,
  created_by,
  estimated_files,
  estimated_tokens,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  2,
  jsonb_build_object(
    'steps', jsonb_build_array(
      jsonb_build_object('step_id', 'P-001', 'description', 'Add JWT library dependency'),
      jsonb_build_object('step_id', 'P-002', 'description', 'Create authentication middleware'),
      jsonb_build_object('step_id', 'P-003', 'description', 'Update API endpoints'),
      jsonb_build_object('step_id', 'P-004', 'description', 'Add unit tests for auth middleware')
    ),
    'files_to_change', jsonb_build_array(
      'package.json',
      'src/middleware/auth.ts',
      'src/routes/api.ts',
      'src/__tests__/auth.test.ts'
    )
  ),
  4,
  4,
  'high',
  'test-fixture',
  4,
  7000,
  NOW() - INTERVAL '5 days'
);

-- Plan v1 for WINT-TEST-003
INSERT INTO wint.implementation_plans (
  story_id,
  version,
  content,
  steps_count,
  files_count,
  complexity,
  created_by,
  estimated_files,
  estimated_tokens,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  1,
  jsonb_build_object(
    'steps', jsonb_build_array(
      jsonb_build_object('step_id', 'P-001', 'description', 'Update connection pool configuration'),
      jsonb_build_object('step_id', 'P-002', 'description', 'Add connection monitoring')
    ),
    'files_to_change', jsonb_build_array(
      'src/db/connection.ts',
      'src/monitoring/db-metrics.ts'
    )
  ),
  2,
  2,
  'low',
  'test-fixture',
  2,
  3000,
  NOW() - INTERVAL '8 days'
);

-- ============================================================================
-- Verifications - QA, Review, UAT results
-- ============================================================================

-- QA verification v1 for WINT-TEST-003 (PASS)
INSERT INTO wint.verifications (
  story_id,
  version,
  type,
  content,
  verdict,
  issues_count,
  created_by,
  qa_verdict,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  1,
  'qa_verify',
  jsonb_build_object(
    'qa_type', 'functional',
    'test_cases', jsonb_build_array(
      jsonb_build_object('case_id', 'TC-001', 'result', 'PASS'),
      jsonb_build_object('case_id', 'TC-002', 'result', 'PASS')
    ),
    'issues', jsonb_build_array()
  ),
  'PASS',
  0,
  'test-fixture',
  'pass',
  NOW() - INTERVAL '1 day'
);

-- Review verification v1 for WINT-TEST-006 (CONCERNS)
INSERT INTO wint.verifications (
  story_id,
  version,
  type,
  content,
  verdict,
  issues_count,
  created_by,
  qa_verdict,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  1,
  'review',
  jsonb_build_object(
    'review_type', 'code',
    'findings', jsonb_build_array(
      jsonb_build_object('finding_id', 'F-001', 'severity', 'minor', 'description', 'Missing error handling in edge case')
    )
  ),
  'CONCERNS',
  1,
  'test-fixture',
  'concerns',
  NOW() - INTERVAL '2 hours'
);

-- ============================================================================
-- Proofs - Evidence/AC verification
-- ============================================================================

-- Proof v1 for WINT-TEST-003 (all ACs verified)
INSERT INTO wint.proofs (
  story_id,
  version,
  content,
  acs_passing,
  acs_total,
  files_touched,
  created_by,
  all_acs_verified,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  1,
  jsonb_build_object(
    'acceptance_criteria', jsonb_build_array(
      jsonb_build_object('ac_id', 'AC-001', 'status', 'PASS', 'evidence', 'Connection pool metrics show improved performance'),
      jsonb_build_object('ac_id', 'AC-002', 'status', 'PASS', 'evidence', 'Monitoring dashboard shows pool health')
    ),
    'touched_files', jsonb_build_array(
      'src/db/connection.ts',
      'src/monitoring/db-metrics.ts'
    )
  ),
  2,
  2,
  2,
  'test-fixture',
  true,
  NOW() - INTERVAL '1 day'
);

-- Proof v1 for WINT-TEST-006 (partial ACs verified)
INSERT INTO wint.proofs (
  story_id,
  version,
  content,
  acs_passing,
  acs_total,
  files_touched,
  created_by,
  all_acs_verified,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  1,
  jsonb_build_object(
    'acceptance_criteria', jsonb_build_array(
      jsonb_build_object('ac_id', 'AC-001', 'status', 'PASS', 'evidence', 'Rate limiting active for all endpoints'),
      jsonb_build_object('ac_id', 'AC-002', 'status', 'PENDING', 'evidence', 'Load testing not yet complete')
    ),
    'touched_files', jsonb_build_array(
      'src/middleware/rate-limit.ts',
      'src/routes/api.ts'
    )
  ),
  1,
  2,
  2,
  'test-fixture',
  false,
  NOW() - INTERVAL '3 hours'
);

-- ============================================================================
-- Token Usage - Phase-based token tracking
-- ============================================================================

-- Token usage for WINT-TEST-001 (elaboration phase)
INSERT INTO wint.token_usage (
  story_id,
  phase,
  tokens_input,
  tokens_output,
  total_tokens,
  model,
  agent_name,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'elaboration',
  12500,
  3500,
  16000,
  'claude-opus-4-6',
  'dev-elaborate',
  NOW() - INTERVAL '6 days'
);

-- Token usage for WINT-TEST-001 (plan phase)
INSERT INTO wint.token_usage (
  story_id,
  phase,
  tokens_input,
  tokens_output,
  total_tokens,
  model,
  agent_name,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'plan',
  8000,
  5000,
  13000,
  'claude-opus-4-6',
  'dev-plan',
  NOW() - INTERVAL '5 days'
);

-- Token usage for WINT-TEST-003 (elaboration phase)
INSERT INTO wint.token_usage (
  story_id,
  phase,
  tokens_input,
  tokens_output,
  total_tokens,
  model,
  agent_name,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'elaboration',
  9000,
  2500,
  11500,
  'claude-sonnet-4-5',
  'dev-elaborate',
  NOW() - INTERVAL '9 days'
);

-- Token usage for WINT-TEST-003 (qa phase)
INSERT INTO wint.token_usage (
  story_id,
  phase,
  tokens_input,
  tokens_output,
  total_tokens,
  model,
  agent_name,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'qa_verify',
  6000,
  2000,
  8000,
  'claude-sonnet-4-5',
  'qa-verify-leader',
  NOW() - INTERVAL '1 day'
);

-- Token usage for WINT-TEST-006 (review phase)
INSERT INTO wint.token_usage (
  story_id,
  phase,
  tokens_input,
  tokens_output,
  total_tokens,
  model,
  agent_name,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  'review',
  15000,
  4000,
  19000,
  'claude-opus-4-6',
  'dev-review-leader',
  NOW() - INTERVAL '2 hours'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Expected counts:
-- Elaborations: 3
-- SELECT COUNT(*) FROM wint.elaborations WHERE created_by = 'test-fixture';
--
-- Implementation Plans: 3 (2 versions for WINT-TEST-001, 1 for WINT-TEST-003)
-- SELECT COUNT(*) FROM wint.implementation_plans WHERE created_by = 'test-fixture';
--
-- Verifications: 2
-- SELECT COUNT(*) FROM wint.verifications WHERE created_by = 'test-fixture';
--
-- Proofs: 2
-- SELECT COUNT(*) FROM wint.proofs WHERE created_by = 'test-fixture';
--
-- Token Usage: 5
-- SELECT COUNT(*) FROM wint.token_usage WHERE story_id IN (
--   SELECT id FROM wint.stories WHERE story_id LIKE 'WINT-TEST-%'
-- );

-- ============================================================================
-- Cleanup Query (to remove test data)
-- ============================================================================
-- DELETE FROM wint.elaborations WHERE created_by = 'test-fixture';
-- DELETE FROM wint.implementation_plans WHERE created_by = 'test-fixture';
-- DELETE FROM wint.verifications WHERE created_by = 'test-fixture';
-- DELETE FROM wint.proofs WHERE created_by = 'test-fixture';
-- DELETE FROM wint.token_usage WHERE story_id IN (
--   SELECT id FROM wint.stories WHERE story_id LIKE 'WINT-TEST-%'
-- );
