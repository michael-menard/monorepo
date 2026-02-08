-- KBMEM-023: Task Audit Trigger
--
-- Creates task_audit_log table and trigger for tracking task changes.
-- Provides audit trail for task operations (insert/update) for compliance
-- and debugging purposes.
--
-- Design:
-- - Separate table from audit_log (which is for knowledge_entries)
-- - Uses trigger to capture changes automatically
-- - Excludes description field from JSONB to reduce storage
-- - Tracks insert and update operations (delete handled via soft-delete)
--
-- @see plans/future/kb-memory-architecture/PLAN.md

-- Create task_audit_log table
CREATE TABLE IF NOT EXISTS task_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID of the task being audited
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE SET NULL,

  -- Type of operation: 'add' | 'update'
  operation TEXT NOT NULL,

  -- Task state before the operation (null for 'add')
  previous_value JSONB,

  -- Task state after the operation
  new_value JSONB,

  -- When the operation occurred
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Context about who/what initiated the change
  user_context JSONB,

  -- When audit record was created
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add check constraint for operation values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_audit_log_operation_check'
  ) THEN
    ALTER TABLE task_audit_log
    ADD CONSTRAINT task_audit_log_operation_check
    CHECK (operation IN ('add', 'update', 'delete'));
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_audit_log_task_id ON task_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_timestamp ON task_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_task_timestamp ON task_audit_log(task_id, timestamp);

-- Create the trigger function
CREATE OR REPLACE FUNCTION audit_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_audit_log (task_id, operation, new_value, timestamp)
    VALUES (
      NEW.id,
      'add',
      to_jsonb(NEW) - 'description',  -- Exclude description to reduce storage
      now()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO task_audit_log (task_id, operation, previous_value, new_value, timestamp)
    VALUES (
      NEW.id,
      'update',
      to_jsonb(OLD) - 'description',
      to_jsonb(NEW) - 'description',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS task_audit_trigger ON tasks;
CREATE TRIGGER task_audit_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION audit_task_changes();

-- Add documentation comments
COMMENT ON TABLE task_audit_log IS 'Audit log for task changes. Part of KBMEM 3-bucket architecture (Bucket C audit trail).';
COMMENT ON COLUMN task_audit_log.task_id IS 'ID of the task that was modified';
COMMENT ON COLUMN task_audit_log.operation IS 'Type of operation: add, update, or delete';
COMMENT ON COLUMN task_audit_log.previous_value IS 'JSONB snapshot of task before change (null for add operations)';
COMMENT ON COLUMN task_audit_log.new_value IS 'JSONB snapshot of task after change';
COMMENT ON COLUMN task_audit_log.timestamp IS 'When the operation occurred';
COMMENT ON FUNCTION audit_task_changes() IS 'Trigger function that logs task insert and update operations to task_audit_log';
