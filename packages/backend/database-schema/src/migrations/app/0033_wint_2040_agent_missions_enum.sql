-- Migration: WINT-2040 - Add agent_missions to contextPackTypeEnum
-- Description: Adds 'agent_missions' enum value to the context_pack_type PostgreSQL enum
--              to support storing agent mission summaries in wint.context_packs.
--
-- Architecture Notes:
--   - ALTER TYPE ... ADD VALUE is a non-blocking operation in PostgreSQL 12+
--   - No existing rows are affected (additive change only)
--   - The enum value must match the Drizzle schema update in wint.ts
--
-- Pre-migration Checks:
-- 1. Verify wint schema exists (WINT-0010)
-- 2. Verify context_pack_type enum exists (WINT-0030)
--
-- Required Privileges: ALTER on enum type context_pack_type
-- Depends on: wint schema (WINT-0010), context_pack_type enum (WINT-0030)

-- Add agent_missions value to contextPackTypeEnum
-- IF NOT EXISTS prevents errors if migration is run multiple times
ALTER TYPE public.context_pack_type ADD VALUE IF NOT EXISTS 'agent_missions';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Changes: Adds 'agent_missions' to context_pack_type enum
-- Rollback: Cannot remove enum values in PostgreSQL without a full type rebuild
-- Upstream: 0032_wint_0040_hitl_decisions_story_outcomes.sql
-- WINT-2040: agent-mission-cache-populator will use this enum value
