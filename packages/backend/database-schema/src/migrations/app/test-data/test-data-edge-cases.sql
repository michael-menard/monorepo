-- Test Data: Edge Cases for WINT-1090 Migration Testing
-- Description: Edge case scenarios for constraint testing and boundary validation
-- Prerequisites: test-data-stories.sql must be loaded first
-- Usage: psql -h localhost -p 5432 -U postgres -d lego_projects -f test-data-edge-cases.sql

-- ============================================================================
-- Edge Case Story: For testing large artifact volumes
-- ============================================================================

INSERT INTO wint.stories (
  id,
  story_id,
  title,
  state,
  priority,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  'WINT-TEST-EDGE-001',
  'Edge Case Story: High Volume Artifact Testing',
  'in_progress',
  'P2',
  NOW(),
  NOW()
);

-- ============================================================================
-- Edge Case 1: NULL Optional Columns
-- ============================================================================

-- Elaboration with all optional fields NULL
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
  '00000000-0000-0000-0000-000000000099',
  NULL,  -- date is optional
  NULL,  -- verdict is optional
  NULL,  -- content is optional
  NULL,  -- readiness_score is optional
  NULL,  -- gaps_count is optional
  NULL,  -- created_by is optional
  NOW()
);

-- Implementation plan with minimal required fields
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
  '00000000-0000-0000-0000-000000000099',
  1,
  NULL,  -- content optional
  NULL,  -- steps_count optional
  NULL,  -- files_count optional
  NULL,  -- complexity optional
  NULL,  -- created_by optional
  NULL,  -- estimated_files optional
  NULL,  -- estimated_tokens optional
  NOW()
);

-- Verification with NULL optional fields
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
  '00000000-0000-0000-0000-000000000099',
  1,
  'qa_verify',
  NULL,  -- content optional
  NULL,  -- verdict optional
  NULL,  -- issues_count optional
  NULL,  -- created_by optional
  NULL,  -- qa_verdict optional
  NOW()
);

-- Proof with NULL optional fields
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
  '00000000-0000-0000-0000-000000000099',
  1,
  NULL,  -- content optional
  NULL,  -- acs_passing optional
  NULL,  -- acs_total optional
  NULL,  -- files_touched optional
  NULL,  -- created_by optional
  NULL,  -- all_acs_verified optional
  NOW()
);

-- Token usage with NULL model and agent_name
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
  '00000000-0000-0000-0000-000000000099',
  'unknown',
  0,
  0,
  NULL,  -- total_tokens optional (may be generated)
  NULL,  -- model optional
  NULL,  -- agent_name optional
  NOW()
);

-- ============================================================================
-- Edge Case 2: Large JSONB Content
-- ============================================================================

-- Elaboration with large JSONB (simulating detailed analysis)
INSERT INTO wint.elaborations (
  story_id,
  verdict,
  content,
  readiness_score,
  gaps_count,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  'pass',
  jsonb_build_object(
    'title', 'Large Content Test',
    'detailed_analysis', repeat('This is a very long analysis paragraph. ', 100),
    'acceptance_criteria', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'ac_id', 'AC-' || lpad(i::text, 3, '0'),
          'text', 'Acceptance criterion number ' || i,
          'details', repeat('Details for AC ' || i || '. ', 50)
        )
      )
      FROM generate_series(1, 50) AS i
    ),
    'gaps', jsonb_build_array()
  ),
  85,
  0,
  'test-fixture-large',
  NOW()
);

-- ============================================================================
-- Edge Case 3: High Version Numbers
-- ============================================================================

-- Implementation plan with high version number (v100)
INSERT INTO wint.implementation_plans (
  story_id,
  version,
  content,
  complexity,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  100,
  jsonb_build_object('note', 'Testing version 100'),
  'low',
  'test-fixture-version',
  NOW()
);

-- Verification with high version number (v50)
INSERT INTO wint.verifications (
  story_id,
  version,
  type,
  verdict,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  50,
  'qa_verify',
  'PASS',
  'test-fixture-version',
  NOW()
);

-- Proof with high version number (v75)
INSERT INTO wint.proofs (
  story_id,
  version,
  content,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  75,
  jsonb_build_object('note', 'Testing version 75'),
  'test-fixture-version',
  NOW()
);

-- ============================================================================
-- Edge Case 4: Large Token Counts
-- ============================================================================

-- Token usage with very large numbers (>1M tokens)
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
  '00000000-0000-0000-0000-000000000099',
  'large_context',
  1500000,  -- 1.5M input tokens
  500000,   -- 500K output tokens
  2000000,  -- 2M total
  'claude-opus-4-6',
  'large-context-agent',
  NOW()
);

-- ============================================================================
-- Edge Case 5: Empty JSONB Arrays and Objects
-- ============================================================================

-- Implementation plan with empty arrays/objects
INSERT INTO wint.implementation_plans (
  story_id,
  version,
  content,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  2,
  jsonb_build_object(
    'steps', jsonb_build_array(),
    'files_to_change', jsonb_build_array(),
    'metadata', jsonb_build_object()
  ),
  'test-fixture-empty',
  NOW()
);

-- ============================================================================
-- Edge Case 6: Multiple Artifacts Per Story (Stress Test)
-- ============================================================================

-- Insert 10 more elaborations for the same story
INSERT INTO wint.elaborations (story_id, verdict, readiness_score, gaps_count, created_by, created_at)
SELECT
  '00000000-0000-0000-0000-000000000099',
  'pass',
  90 + (i % 10),
  0,
  'test-fixture-stress',
  NOW() - (i || ' minutes')::interval
FROM generate_series(1, 10) AS i;

-- Insert 20 token usage records for various phases
INSERT INTO wint.token_usage (story_id, phase, tokens_input, tokens_output, model, created_at)
SELECT
  '00000000-0000-0000-0000-000000000099',
  CASE (i % 4)
    WHEN 0 THEN 'elaboration'
    WHEN 1 THEN 'plan'
    WHEN 2 THEN 'implement'
    ELSE 'qa_verify'
  END,
  1000 + (i * 100),
  500 + (i * 50),
  'claude-sonnet-4-5',
  NOW() - (i || ' hours')::interval
FROM generate_series(1, 20) AS i;

-- ============================================================================
-- Edge Case 7: Concurrent Same-Version Inserts (Should Violate Unique Constraint)
-- ============================================================================
-- Note: These inserts are commented out to prevent constraint violations
-- Uncomment to test unique constraint enforcement

-- This should fail with unique constraint violation (story_id, version already exists)
-- INSERT INTO wint.implementation_plans (story_id, version, created_by, created_at)
-- VALUES ('00000000-0000-0000-0000-000000000099', 1, 'test-duplicate', NOW());

-- This should fail with unique constraint violation (story_id, type, version already exists)
-- INSERT INTO wint.verifications (story_id, version, type, created_by, created_at)
-- VALUES ('00000000-0000-0000-0000-000000000099', 1, 'qa_verify', 'test-duplicate', NOW());

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Check elaboration count (should be 12: 1 NULL, 1 large, 10 stress)
-- SELECT COUNT(*) FROM wint.elaborations WHERE story_id = '00000000-0000-0000-0000-000000000099';
--
-- Check implementation plans versions (should include 1, 2, 100)
-- SELECT version FROM wint.implementation_plans
-- WHERE story_id = '00000000-0000-0000-0000-000000000099' ORDER BY version;
--
-- Check token usage count (should be 22: 1 NULL, 1 large, 20 stress)
-- SELECT COUNT(*) FROM wint.token_usage WHERE story_id = '00000000-0000-0000-0000-000000000099';
--
-- Check large JSONB size
-- SELECT pg_column_size(content) as content_size_bytes
-- FROM wint.elaborations
-- WHERE story_id = '00000000-0000-0000-0000-000000000099'
-- AND created_by = 'test-fixture-large';

-- ============================================================================
-- Cleanup Query (to remove test data)
-- ============================================================================
-- DELETE FROM wint.stories WHERE story_id = 'WINT-TEST-EDGE-001';
