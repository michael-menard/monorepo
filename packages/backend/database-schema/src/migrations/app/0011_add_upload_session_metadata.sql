-- Add metadata columns to upload_sessions table for presigned upload tracking
-- INST-1105: Upload Instructions (Presigned >10MB)
-- AC92, AC93, AC94

ALTER TABLE upload_sessions
  ADD COLUMN original_filename VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN original_file_size BIGINT NOT NULL DEFAULT 0;

-- Remove defaults after adding columns (for new inserts to require values)
ALTER TABLE upload_sessions
  ALTER COLUMN original_filename DROP DEFAULT,
  ALTER COLUMN original_file_size DROP DEFAULT;
