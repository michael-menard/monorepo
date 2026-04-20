-- Migration: 1173_db_sequence_story_ids
-- Plan: db-sequence-story-ids
--
-- Creates three DB sequences for generating collision-free story IDs:
--   WORK-NNNN  (workflow/LangGraph pipeline stories)
--   PLAT-NNNN  (shared platform stories)
--   LEGO-NNNN  (LEGO app product stories)
--
-- Old stories keep their existing IDs. New stories use nextval() on the
-- appropriate sequence via kb_create_story's namespace parameter.

CREATE SEQUENCE IF NOT EXISTS workflow.work_story_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS workflow.plat_story_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS workflow.lego_story_seq START WITH 1;
