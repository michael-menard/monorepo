-- Migration: Add MOC Parts Lists Table for Enhanced Tracking
-- Date: 2024-12-30
-- Description: Adds comprehensive parts list tracking including build status, purchase status, inventory percentage, and cost tracking

CREATE TABLE IF NOT EXISTS moc_parts_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moc_id UUID NOT NULL REFERENCES moc_instructions(id) ON DELETE CASCADE,
    file_id UUID REFERENCES moc_files(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    built BOOLEAN DEFAULT false,
    purchased BOOLEAN DEFAULT false,
    inventory_percentage TEXT DEFAULT '0.00',
    total_parts_count TEXT,
    acquired_parts_count TEXT DEFAULT '0',
    cost_estimate TEXT,
    actual_cost TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moc_parts_lists_moc_id ON moc_parts_lists(moc_id);
CREATE INDEX IF NOT EXISTS idx_moc_parts_lists_file_id ON moc_parts_lists(file_id);
CREATE INDEX IF NOT EXISTS idx_moc_parts_lists_built ON moc_parts_lists(built);
CREATE INDEX IF NOT EXISTS idx_moc_parts_lists_purchased ON moc_parts_lists(purchased);
CREATE INDEX IF NOT EXISTS idx_moc_parts_lists_moc_built ON moc_parts_lists(moc_id, built);
CREATE INDEX IF NOT EXISTS idx_moc_parts_lists_moc_purchased ON moc_parts_lists(moc_id, purchased);

-- Add comments for documentation
COMMENT ON TABLE moc_parts_lists IS 'Enhanced tracking for MOC parts lists including build and purchase status';
COMMENT ON COLUMN moc_parts_lists.moc_id IS 'Reference to the parent MOC instruction';
COMMENT ON COLUMN moc_parts_lists.file_id IS 'Optional reference to associated file (e.g., PDF parts list)';
COMMENT ON COLUMN moc_parts_lists.built IS 'Whether this parts list has been built';
COMMENT ON COLUMN moc_parts_lists.purchased IS 'Whether all parts in this list have been purchased';
COMMENT ON COLUMN moc_parts_lists.inventory_percentage IS 'Percentage of parts owned (0.00 to 100.00)';
COMMENT ON COLUMN moc_parts_lists.total_parts_count IS 'Total number of parts in this list';
COMMENT ON COLUMN moc_parts_lists.acquired_parts_count IS 'Number of parts currently owned/acquired';
COMMENT ON COLUMN moc_parts_lists.cost_estimate IS 'Estimated cost to purchase all parts';
COMMENT ON COLUMN moc_parts_lists.actual_cost IS 'Actual amount spent on parts';
COMMENT ON COLUMN moc_parts_lists.notes IS 'User notes about this parts list'; 