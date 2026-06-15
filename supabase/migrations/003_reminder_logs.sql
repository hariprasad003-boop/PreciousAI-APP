-- Reminder logs: tracks every email sent for birthday / anniversary / follow-up
-- reminders so we can avoid duplicate sends and debug delivery issues.

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

CREATE INDEX ON reminder_logs(tenant_id);
CREATE INDEX ON reminder_logs(sent_at);
CREATE INDEX ON reminder_logs(customer_id);

-- RLS: service role only (this table is written from cron API route using admin client)
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON reminder_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: add notify_reminders column to tenant_users if not already present
-- This lets each staff member opt-in/out of birthday & anniversary email alerts.
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS notify_reminders BOOLEAN NOT NULL DEFAULT TRUE;
