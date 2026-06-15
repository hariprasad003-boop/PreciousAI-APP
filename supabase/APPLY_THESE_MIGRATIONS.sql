-- ============================================================
-- PreciousAI Pending Migrations 002–007
-- Paste this entire file into Supabase SQL Editor and click Run.
-- It is safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ── Migration 002: onboarding_completed flag ─────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- ── Migration 003: Reminder logs ─────────────────────────────
CREATE TABLE IF NOT EXISTS reminder_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('birthday', 'anniversary', 'follow_up')),
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reminder_logs_tenant_idx ON reminder_logs(tenant_id);
CREATE INDEX IF NOT EXISTS reminder_logs_sent_at_idx ON reminder_logs(sent_at);
CREATE INDEX IF NOT EXISTS reminder_logs_customer_idx ON reminder_logs(customer_id);

ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reminder_logs' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY "service_role_only" ON reminder_logs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS notify_reminders BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Migration 004: Billing (Stripe) ──────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);

-- ── Migration 005: Notifications & Push Subscriptions ─────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  url        TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notifications_tenant_idx ON notifications(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subscriptions(user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON notifications
      FOR ALL USING (tenant_id = get_my_tenant_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'tenant_isolation'
  ) THEN
    CREATE POLICY "tenant_isolation" ON push_subscriptions
      FOR ALL USING (tenant_id = get_my_tenant_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'service_role_bypass_notifications'
  ) THEN
    CREATE POLICY "service_role_bypass_notifications" ON notifications
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'service_role_bypass_push_subs'
  ) THEN
    CREATE POLICY "service_role_bypass_push_subs" ON push_subscriptions
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ── Migration 006: Location extras (address, phone, is_primary) ─
ALTER TABLE tenant_locations
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tenant_locations tl
SET is_primary = true
WHERE tl.created_at = (
  SELECT MIN(tl2.created_at) FROM tenant_locations tl2 WHERE tl2.tenant_id = tl.tenant_id
)
AND NOT EXISTS (
  SELECT 1 FROM tenant_locations tl3 WHERE tl3.tenant_id = tl.tenant_id AND tl3.is_primary = true
);

-- ── Migration 007: follow_ups.completed_at ────────────────────
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================
-- Done! All pending migrations applied.
-- ============================================================
