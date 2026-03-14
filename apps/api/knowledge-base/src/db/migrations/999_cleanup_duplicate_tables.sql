-- Migration: Clean up duplicate tables in public schema
-- These tables are now in workflow schema and should be removed from public

BEGIN;

-- Drop duplicate tables from public schema (they're in workflow now)
-- Use CASCADE to drop dependent objects
DROP TABLE IF EXISTS public.agent_outcomes CASCADE;
DROP TABLE IF EXISTS public.hitl_decisions CASCADE;
DROP TABLE IF EXISTS public.agent_decisions CASCADE;
DROP TABLE IF EXISTS public.agent_invocations CASCADE;
DROP TABLE IF EXISTS public.context_cache_hits CASCADE;
DROP TABLE IF EXISTS public.context_packs CASCADE;
DROP TABLE IF EXISTS public.context_sessions CASCADE;

-- Keep these in public for now (knowledge entries, etc.)
-- knowledge_entries
-- embedding_cache
-- audit_log

-- Keep these in public (may still be used)
-- adrs
-- code_standards
-- cohesion_rules
-- lessons_learned
-- rules

COMMIT;
