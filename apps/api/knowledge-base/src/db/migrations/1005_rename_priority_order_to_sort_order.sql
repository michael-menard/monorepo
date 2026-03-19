-- 1005: Decouple sort_order from priority
-- Renames priority_order → sort_order to clarify that display position
-- is independent of priority classification.
ALTER TABLE workflow.plans RENAME COLUMN priority_order TO sort_order;
