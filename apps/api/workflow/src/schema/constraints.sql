-- Constraints for Workflow Schema
-- Example Constraint Creation
ALTER TABLE workflows ADD CONSTRAINT unique_workflow_name UNIQUE (name);
