-- Add completed_at column to follow_ups table
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
