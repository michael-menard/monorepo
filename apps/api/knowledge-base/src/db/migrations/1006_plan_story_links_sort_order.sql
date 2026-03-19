ALTER TABLE workflow.plan_story_links ADD COLUMN sort_order integer;

-- Backfill: assign dense 0-based order per plan using creation time
UPDATE workflow.plan_story_links psl
SET sort_order = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY plan_slug ORDER BY created_at) AS rn
  FROM workflow.plan_story_links
) sub
WHERE psl.id = sub.id;

CREATE INDEX idx_plan_story_links_sort_order
  ON workflow.plan_story_links (plan_slug, sort_order ASC NULLS LAST);
