-- SQL script to verify migration and update FK references
-- This script will check the integrity of foreign key constraints after migration.

-- Example query to check a specific foreign key constraint
SELECT conname, pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
AND c.contype = 'f';
