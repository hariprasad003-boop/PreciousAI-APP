-- Add onboarding_completed flag to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
