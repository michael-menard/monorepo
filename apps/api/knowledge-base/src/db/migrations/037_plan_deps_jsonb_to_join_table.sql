-- Migration 037: Migrate plan dependencies from JSONB to join table
--
-- The plan_details.dependencies JSONB column was the legacy storage for plan
-- blocking dependencies (an array of plan slugs). The canonical storage is now
-- the plan_dependencies join table (created in migration 029).
--
-- This migration:
-- 1. Copies any JSONB dependency data into plan_dependencies rows (idempotent)
-- 2. Drops the JSONB column from plan_details
-- 3. Drops the legacy JSONB column from plans (added in migration 017)

BEGIN;

-- Step 1: Migrate existing JSONB data to the plan_dependencies join table.
-- Uses jsonb_array_elements_text to unnest the array, then inserts with
-- ON CONFLICT DO NOTHING to avoid duplicates with pre-existing rows.
INSERT INTO public.plan_dependencies (plan_slug, depends_on_slug, satisfied, created_at)
SELECT
  p.plan_slug,
  dep_slug,
  false,
  NOW()
FROM public.plan_details pd
JOIN public.plans p ON p.id = pd.plan_id
CROSS JOIN LATERAL jsonb_array_elements_text(pd.dependencies) AS dep_slug
WHERE pd.dependencies IS NOT NULL
  AND jsonb_typeof(pd.dependencies) = 'array'
  AND jsonb_array_length(pd.dependencies) > 0
ON CONFLICT (plan_slug, depends_on_slug) DO NOTHING;

-- Step 2: Drop the JSONB column from plan_details (no longer used by app code)
ALTER TABLE public.plan_details DROP COLUMN IF EXISTS dependencies;

-- Step 3: Drop the legacy JSONB column from plans table (added in migration 017,
-- superseded by plan_details in CDTS-1030, now fully replaced by join table)
ALTER TABLE public.plans DROP COLUMN IF EXISTS dependencies;

COMMIT;
