-- Add build status tracking and review system to MOC instructions
-- Plan: moc-build-status-and-review-system

-- Add build_status column to moc_instructions (text, not enum — consistent with existing columns)
ALTER TABLE moc_instructions
  ADD COLUMN IF NOT EXISTS build_status text NOT NULL DEFAULT 'instructions_added';

-- Add review_skipped_at for permanent dismiss of review prompt
ALTER TABLE moc_instructions
  ADD COLUMN IF NOT EXISTS review_skipped_at timestamptz;

-- Create moc_reviews table
CREATE TABLE IF NOT EXISTS moc_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moc_id UUID NOT NULL REFERENCES moc_instructions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sections JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (moc_id, user_id)
);

-- Indexes for moc_reviews
CREATE INDEX IF NOT EXISTS idx_moc_reviews_moc_id ON moc_reviews(moc_id);
CREATE INDEX IF NOT EXISTS idx_moc_reviews_user_id ON moc_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_moc_reviews_status ON moc_reviews(status);

-- Index for build_status queries on moc_instructions
CREATE INDEX IF NOT EXISTS idx_moc_instructions_build_status ON moc_instructions(build_status);
