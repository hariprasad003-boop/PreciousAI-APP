-- PreciousAI Notifications & Push Subscriptions
-- Migration 005

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

CREATE POLICY "tenant_isolation" ON notifications
  FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_isolation" ON push_subscriptions
  FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "service_role_bypass_notifications" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_push_subs" ON push_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
