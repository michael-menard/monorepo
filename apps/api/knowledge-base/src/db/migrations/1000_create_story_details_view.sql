-- Migration: Create workflow.story_details view
--
-- Aggregates stories + all related tables into a single denormalized row
-- so the roadmap service can query one table without joins.
--
-- Aggregated columns:
--   content_sections  jsonb[]  — all story_content rows for this story
--   state_history     jsonb[]  — last 20 state transitions, newest first
--   linked_plans      jsonb[]  — plan_story_links rows
--   dependencies      jsonb[]  — story_dependencies rows
--   outcome_*         scalar   — from the single most-recent story_outcomes row
--   ws_*              scalar   — from work_state (unique per story)

CREATE OR REPLACE VIEW workflow.story_details AS
SELECT
  -- Core story columns
  s.story_id,
  s.feature,
  s.title,
  s.description,
  s.state,
  s.priority,
  s.tags,
  s.experiment_variant,
  s.blocked_reason,
  s.blocked_by_story,
  s.started_at,
  s.completed_at,
  s.file_hash,
  s.created_at,
  s.updated_at,

  -- Latest outcome (scalar columns, null when no outcome exists)
  o.final_verdict          AS outcome_verdict,
  o.quality_score          AS outcome_quality_score,
  o.review_iterations      AS outcome_review_iterations,
  o.qa_iterations          AS outcome_qa_iterations,
  o.duration_ms            AS outcome_duration_ms,
  o.total_input_tokens     AS outcome_total_input_tokens,
  o.total_output_tokens    AS outcome_total_output_tokens,
  o.total_cached_tokens    AS outcome_total_cached_tokens,
  o.estimated_total_cost   AS outcome_estimated_total_cost,
  o.primary_blocker        AS outcome_primary_blocker,
  o.completed_at           AS outcome_completed_at,

  -- Current work state (scalar columns, null when no work_state row)
  ws.branch                AS ws_branch,
  ws.phase                 AS ws_phase,
  ws.next_steps            AS ws_next_steps,
  ws.blockers              AS ws_blockers,

  -- Content sections: all rows for this story, ordered by section_name
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('section_name', sc.section_name, 'content_text', sc.content_text)
        ORDER BY sc.section_name
      )
      FROM workflow.story_content sc
      WHERE sc.story_id = s.story_id
    ),
    '[]'::jsonb
  ) AS content_sections,

  -- State history: last 20 transitions, newest first
  COALESCE(
    (
      SELECT jsonb_agg(h_row)
      FROM (
        SELECT jsonb_build_object(
          'event_type', h.event_type,
          'from_state',  h.from_state,
          'to_state',    h.to_state,
          'created_at',  h.created_at
        ) AS h_row
        FROM workflow.story_state_history h
        WHERE h.story_id = s.story_id
        ORDER BY h.created_at DESC
        LIMIT 20
      ) sub
    ),
    '[]'::jsonb
  ) AS state_history,

  -- Plan links
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('plan_slug', pl.plan_slug, 'link_type', pl.link_type)
      )
      FROM workflow.plan_story_links pl
      WHERE pl.story_id = s.story_id
    ),
    '[]'::jsonb
  ) AS linked_plans,

  -- Dependencies
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('depends_on_id', d.depends_on_id, 'dependency_type', d.dependency_type)
      )
      FROM workflow.story_dependencies d
      WHERE d.story_id = s.story_id
    ),
    '[]'::jsonb
  ) AS dependencies

FROM workflow.stories s

-- Latest outcome via LATERAL (avoids a GROUP BY on the outer query)
LEFT JOIN LATERAL (
  SELECT *
  FROM workflow.story_outcomes o2
  WHERE o2.story_id = s.story_id
  ORDER BY o2.created_at DESC
  LIMIT 1
) o ON true

-- Current work state (unique per story_id)
LEFT JOIN workflow.work_state ws
  ON ws.story_id = s.story_id;
