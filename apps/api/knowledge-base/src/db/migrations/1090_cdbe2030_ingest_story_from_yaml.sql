-- Migration 1090: CDBE-2030 ingest_story_from_yaml Stored Procedure
--
-- Implements workflow.ingest_story_from_yaml(p_caller_agent_id text, p_story_yaml jsonb)
-- as an idempotent upsert that parses a story YAML payload and inserts or updates
-- the story, its metadata, tags, and dependencies in a single transaction.
--
-- Design decisions:
--   - SECURITY INVOKER (default — no SECURITY DEFINER).
--   - Validates caller via workflow.validate_caller() → raises P0001 if unauthorized.
--   - Validates required JSONB keys: story_id, title, feature.
--   - Idempotent upserts using ON CONFLICT for all child tables.
--   - Recursive CTE depth check on merged dependency graph (payload + DB), max depth 5.
--   - Returns observability counts: inserted_stories, updated_stories, upserted_content,
--     upserted_details, inserted_dependencies, skipped_dependencies.
--
-- Deployment dependencies: Requires 1001, 1013, 1050.

BEGIN;

-- ── 1. workflow.ingest_story_from_yaml() ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION workflow.ingest_story_from_yaml(
  p_caller_agent_id text,
  p_story_yaml      jsonb
)
RETURNS TABLE(
  inserted_stories      int,
  updated_stories       int,
  upserted_content      int,
  upserted_details      int,
  inserted_dependencies int,
  skipped_dependencies  int
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_story_id          text;
  v_title             text;
  v_feature           text;
  v_state             text;
  v_priority          text;
  v_description       text;
  v_blocked_reason    text;
  v_blocked_by_story  text;

  -- Story detail fields
  v_story_dir         text;
  v_story_file        text;
  v_touches_backend   boolean;
  v_touches_frontend  boolean;
  v_touches_database  boolean;
  v_touches_infra     boolean;

  -- Counters
  v_inserted_stories      int := 0;
  v_updated_stories       int := 0;
  v_upserted_content      int := 0;
  v_upserted_details      int := 0;
  v_inserted_dependencies int := 0;
  v_skipped_dependencies  int := 0;

  -- Dependency processing
  v_dep               jsonb;
  v_dep_story_id      text;
  v_dep_type          text;
  v_dep_arr           jsonb;

  -- Content processing
  v_content_item      jsonb;
  v_content_arr       jsonb;
  v_section_name      text;
  v_content_text      text;
  v_source_format     text;

  -- Cycle / depth detection
  v_max_depth         int := 5;
  v_cycle_detected    boolean;
  v_depth_exceeded    boolean;
BEGIN
  -- ── Step 1: Validate caller ──────────────────────────────────────────────────
  PERFORM workflow.validate_caller(p_caller_agent_id);

  -- ── Step 2: JSONB schema validation ─────────────────────────────────────────
  -- Required top-level keys: story_id, title, feature
  IF p_story_yaml IS NULL
     OR p_story_yaml->>'story_id' IS NULL
     OR p_story_yaml->>'title'    IS NULL
     OR p_story_yaml->>'feature'  IS NULL
  THEN
    RAISE EXCEPTION
      'ingest_story_from_yaml: p_story_yaml must contain required keys: story_id, title, feature. Got: %',
      p_story_yaml
      USING ERRCODE = 'P0003';
  END IF;

  -- Extract scalar fields
  v_story_id         := p_story_yaml->>'story_id';
  v_title            := p_story_yaml->>'title';
  v_feature          := p_story_yaml->>'feature';
  v_state            := p_story_yaml->>'state';
  v_priority         := p_story_yaml->>'priority';
  v_description      := p_story_yaml->>'description';
  v_blocked_reason   := p_story_yaml->>'blocked_reason';
  v_blocked_by_story := p_story_yaml->>'blocked_by_story';

  -- Extract story_details fields
  v_story_dir        := p_story_yaml->>'story_dir';
  v_story_file       := p_story_yaml->>'story_file';
  v_touches_backend  := (p_story_yaml->>'touches_backend')::boolean;
  v_touches_frontend := (p_story_yaml->>'touches_frontend')::boolean;
  v_touches_database := (p_story_yaml->>'touches_database')::boolean;
  v_touches_infra    := (p_story_yaml->>'touches_infra')::boolean;

  -- ── Step 3: Dependency cycle/depth check ────────────────────────────────────
  -- Merge payload dependencies with existing DB dependencies and check:
  --   (a) no cycles involving v_story_id
  --   (b) max depth from any payload dep does not exceed v_max_depth
  v_dep_arr := p_story_yaml->'dependencies';
  IF v_dep_arr IS NOT NULL AND jsonb_typeof(v_dep_arr) = 'array' AND jsonb_array_length(v_dep_arr) > 0 THEN
    -- Use a recursive CTE over the merged graph:
    --   Base edges  = payload deps for this story
    --   Recursive   = edges from workflow.story_dependencies (existing DB)
    -- Cycle: path visits v_story_id again
    -- Depth: path length > v_max_depth

    WITH RECURSIVE merged_edges AS (
      -- Payload edges (new deps being added for v_story_id)
      SELECT
        v_story_id           AS from_id,
        dep_elem->>'depends_on_id' AS to_id
      FROM jsonb_array_elements(v_dep_arr) AS dep_elem
      WHERE dep_elem->>'depends_on_id' IS NOT NULL

      UNION ALL

      -- Existing DB edges (all other dependencies)
      SELECT
        sd.story_id::text    AS from_id,
        sd.depends_on_id::text AS to_id
      FROM workflow.story_dependencies sd
      WHERE sd.story_id <> v_story_id  -- payload edges already cover v_story_id
    ),
    traversal(current_id, path_ids, depth, has_cycle) AS (
      -- Start from each direct dependency in the payload
      SELECT
        me.to_id,
        ARRAY[v_story_id, me.to_id],
        1,
        (me.to_id = v_story_id)
      FROM merged_edges me
      WHERE me.from_id = v_story_id
        AND me.to_id IS NOT NULL

      UNION ALL

      -- Recurse: follow edges from current_id
      SELECT
        me2.to_id,
        t.path_ids || me2.to_id,
        t.depth + 1,
        (me2.to_id = v_story_id OR me2.to_id = ANY(t.path_ids))
      FROM traversal t
      JOIN merged_edges me2 ON me2.from_id = t.current_id
      WHERE NOT t.has_cycle
        AND t.depth < v_max_depth
        AND me2.to_id IS NOT NULL
    )
    SELECT
      bool_or(has_cycle) AS cycle_found,
      bool_or(depth >= v_max_depth AND NOT has_cycle) AS depth_exceeded
    INTO v_cycle_detected, v_depth_exceeded
    FROM traversal;

    IF v_cycle_detected THEN
      RAISE EXCEPTION
        'ingest_story_from_yaml: cycle detected in dependency graph for story %',
        v_story_id
        USING ERRCODE = 'P0004';
    END IF;

    IF v_depth_exceeded THEN
      RAISE EXCEPTION
        'ingest_story_from_yaml: dependency chain exceeds max depth % for story %',
        v_max_depth, v_story_id
        USING ERRCODE = 'P0005';
    END IF;
  END IF;

  -- ── Step 4: Upsert workflow.stories ─────────────────────────────────────────
  INSERT INTO workflow.stories (
    story_id,
    title,
    feature,
    state,
    priority,
    description,
    blocked_reason,
    blocked_by_story,
    created_at,
    updated_at
  ) VALUES (
    v_story_id,
    v_title,
    v_feature,
    COALESCE(v_state, 'backlog'),
    v_priority,
    v_description,
    v_blocked_reason,
    v_blocked_by_story,
    NOW(),
    NOW()
  )
  ON CONFLICT (story_id) DO UPDATE
    SET title            = EXCLUDED.title,
        feature          = EXCLUDED.feature,
        state            = COALESCE(EXCLUDED.state, workflow.stories.state),
        priority         = COALESCE(EXCLUDED.priority, workflow.stories.priority),
        description      = COALESCE(EXCLUDED.description, workflow.stories.description),
        blocked_reason   = EXCLUDED.blocked_reason,
        blocked_by_story = EXCLUDED.blocked_by_story,
        updated_at       = NOW();

  IF NOT FOUND THEN
    -- ON CONFLICT DO UPDATE always "finds" rows (FOUND is true after upsert)
    -- This branch is unreachable in practice.
    v_inserted_stories := 0;
    v_updated_stories  := 0;
  ELSE
    -- Distinguish insert vs update via xmax: xmax = 0 means freshly inserted
    SELECT
      CASE WHEN xmax::text::bigint = 0 THEN 1 ELSE 0 END,
      CASE WHEN xmax::text::bigint <> 0 THEN 1 ELSE 0 END
    INTO v_inserted_stories, v_updated_stories
    FROM workflow.stories
    WHERE story_id = v_story_id;
  END IF;

  -- ── Step 5: Upsert workflow.story_details ────────────────────────────────────
  IF v_story_dir IS NOT NULL
     OR v_story_file IS NOT NULL
     OR v_touches_backend IS NOT NULL
     OR v_touches_frontend IS NOT NULL
     OR v_touches_database IS NOT NULL
     OR v_touches_infra IS NOT NULL
  THEN
    INSERT INTO workflow.story_details (
      story_id,
      story_dir,
      story_file,
      touches_backend,
      touches_frontend,
      touches_database,
      touches_infra,
      updated_at
    ) VALUES (
      v_story_id,
      v_story_dir,
      v_story_file,
      COALESCE(v_touches_backend, false),
      COALESCE(v_touches_frontend, false),
      COALESCE(v_touches_database, false),
      COALESCE(v_touches_infra, false),
      NOW()
    )
    ON CONFLICT (story_id) DO UPDATE
      SET story_dir        = COALESCE(EXCLUDED.story_dir, workflow.story_details.story_dir),
          story_file       = COALESCE(EXCLUDED.story_file, workflow.story_details.story_file),
          touches_backend  = COALESCE(EXCLUDED.touches_backend, workflow.story_details.touches_backend),
          touches_frontend = COALESCE(EXCLUDED.touches_frontend, workflow.story_details.touches_frontend),
          touches_database = COALESCE(EXCLUDED.touches_database, workflow.story_details.touches_database),
          touches_infra    = COALESCE(EXCLUDED.touches_infra, workflow.story_details.touches_infra),
          updated_at       = NOW();

    v_upserted_details := 1;
  END IF;

  -- ── Step 6: Upsert workflow.story_content ───────────────────────────────────
  v_content_arr := p_story_yaml->'content';
  IF v_content_arr IS NOT NULL AND jsonb_typeof(v_content_arr) = 'array' THEN
    FOR v_content_item IN SELECT * FROM jsonb_array_elements(v_content_arr)
    LOOP
      v_section_name  := v_content_item->>'section_name';
      v_content_text  := v_content_item->>'content_text';
      v_source_format := COALESCE(v_content_item->>'source_format', 'text');

      IF v_section_name IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO workflow.story_content (
        story_id,
        section_name,
        content_text,
        source_format,
        created_at
      ) VALUES (
        v_story_id,
        v_section_name,
        v_content_text,
        v_source_format,
        NOW()
      )
      ON CONFLICT ON CONSTRAINT uq_story_content_section DO UPDATE
        SET content_text  = EXCLUDED.content_text,
            source_format = EXCLUDED.source_format;

      v_upserted_content := v_upserted_content + 1;
    END LOOP;
  END IF;

  -- ── Step 7: Insert workflow.story_dependencies ───────────────────────────────
  IF v_dep_arr IS NOT NULL AND jsonb_typeof(v_dep_arr) = 'array' THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(v_dep_arr)
    LOOP
      v_dep_story_id := v_dep->>'depends_on_id';
      v_dep_type     := COALESCE(v_dep->>'dependency_type', 'depends_on');

      IF v_dep_story_id IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO workflow.story_dependencies (
        story_id,
        depends_on_id,
        dependency_type,
        created_at
      ) VALUES (
        v_story_id,
        v_dep_story_id,
        v_dep_type,
        NOW()
      )
      ON CONFLICT ON CONSTRAINT uq_story_dependency DO NOTHING;

      IF FOUND THEN
        v_inserted_dependencies := v_inserted_dependencies + 1;
      ELSE
        v_skipped_dependencies := v_skipped_dependencies + 1;
      END IF;
    END LOOP;
  END IF;

  -- ── Step 8: Return observability counts ─────────────────────────────────────
  RETURN QUERY SELECT
    v_inserted_stories,
    v_updated_stories,
    v_upserted_content,
    v_upserted_details,
    v_inserted_dependencies,
    v_skipped_dependencies;
END;
$$;

COMMENT ON FUNCTION workflow.ingest_story_from_yaml(text, jsonb) IS
  '1090 (CDBE-2030): Idempotent upsert of a story from a JSONB payload. '
  'Execution order: '
  '(1) validate_caller → P0001 if unauthorized; '
  '(2) JSONB schema validation → P0003 if required keys missing; '
  '(3) Recursive CTE depth/cycle check on merged graph → P0004 (cycle) or P0005 (depth > 5); '
  '(4) INSERT INTO workflow.stories ON CONFLICT DO UPDATE; '
  '(5) INSERT INTO workflow.story_details ON CONFLICT DO UPDATE (if any detail fields present); '
  '(6) INSERT INTO workflow.story_content ON CONFLICT ON CONSTRAINT uq_story_content_section DO UPDATE; '
  '(7) INSERT INTO workflow.story_dependencies ON CONFLICT ON CONSTRAINT uq_story_dependency DO NOTHING; '
  '(8) RETURNS TABLE with observability counts. '
  'SECURITY INVOKER.';

-- ── 2. Grant EXECUTE to agent_role ──────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION workflow.ingest_story_from_yaml(text, jsonb)
  TO agent_role;

-- ── 3. Completion notice ─────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '1090: Migration 1090_cdbe2030_ingest_story_from_yaml complete. '
    'workflow.ingest_story_from_yaml() installed. '
    'EXECUTE granted to agent_role.';
END $$;

COMMIT;
