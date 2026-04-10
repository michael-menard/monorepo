-- Fix MOC instruction tags: strip embedded whitespace/newlines and trailing usage counts
-- e.g., "building\n            \n                \n                    1427" → "building"
--       "spider-man 451" → "spider-man"
--
-- Run against the app database (monorepo):
--   cat scripts/fix-moc-tags.sql | docker exec -i monorepo-postgres psql -U postgres -d monorepo
--
-- Safe to run multiple times (idempotent).
-- Applied 2026-04-10: cleaned 186 rows.

-- Preview what will change
SELECT
  title,
  tags AS old_tags,
  (
    SELECT jsonb_agg(DISTINCT
      regexp_replace(
        trim(both from regexp_replace(tag::text, '\s+', ' ', 'g')),
        ' \d[\d,]*$', '', 'g'
      )
    )
    FROM jsonb_array_elements_text(tags) AS tag
  ) AS new_tags
FROM moc_instructions
WHERE tags IS NOT NULL
  AND jsonb_array_length(tags) > 0
LIMIT 20;

-- Apply the fix
UPDATE moc_instructions
SET tags = (
  SELECT jsonb_agg(DISTINCT
    regexp_replace(
      trim(both from regexp_replace(tag::text, '\s+', ' ', 'g')),
      ' \d[\d,]*$', '', 'g'
    )
  )
  FROM jsonb_array_elements_text(tags) AS tag
)
WHERE tags IS NOT NULL
  AND jsonb_array_length(tags) > 0;
