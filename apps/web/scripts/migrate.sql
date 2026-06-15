-- PreciousAI Full Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension (already enabled on Supabase, but safe to re-run)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TENANTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                 TEXT NOT NULL,
  subdomain            TEXT NOT NULL UNIQUE,
  plan                 TEXT NOT NULL DEFAULT 'starter',
  branding             JSONB NOT NULL DEFAULT '{"primary_color":"#C9A84C","accent_color":"#1A1A2E","store_name":""}',
  currency             TEXT NOT NULL DEFAULT 'AED',
  country_code         TEXT NOT NULL DEFAULT '+971',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TENANT LOCATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_locations (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  city       TEXT,
  country    TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TENANT USERS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_users (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES tenant_locations(id),
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'sales_staff',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- ─── WHATSAPP CONFIGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_whatsapp_configs (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id             TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id       TEXT NOT NULL,
  access_token          TEXT NOT NULL,
  verify_token          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  webhook_configured_at TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── LEAD STAGES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_stages (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366F1',
  order_index INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── LEADS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id       TEXT REFERENCES tenant_locations(id),
  stage_id          TEXT NOT NULL REFERENCES lead_stages(id),
  assigned_to       TEXT REFERENCES tenant_users(id),
  source            TEXT NOT NULL DEFAULT 'manual',
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  country_code      TEXT NOT NULL DEFAULT '+971',
  raw_message       TEXT,
  intent_score      FLOAT,
  budget_amount     FLOAT,
  budget_currency   TEXT,
  occasion          TEXT,
  category_interest TEXT[] NOT NULL DEFAULT '{}',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  voice_note_url    TEXT,
  converted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_contacted_at TIMESTAMPTZ
);

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id            TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id              TEXT UNIQUE REFERENCES leads(id),
  location_id          TEXT REFERENCES tenant_locations(id),
  full_name            TEXT NOT NULL,
  phone                TEXT NOT NULL,
  email                TEXT,
  dob                  DATE,
  anniversary_date     DATE,
  city                 TEXT,
  country_code         TEXT NOT NULL DEFAULT '+971',
  metal_pref           TEXT[] NOT NULL DEFAULT '{}',
  stone_pref           TEXT[] NOT NULL DEFAULT '{}',
  style_pref           TEXT[] NOT NULL DEFAULT '{}',
  favourite_categories TEXT[] NOT NULL DEFAULT '{}',
  notes                TEXT,
  is_vip               BOOLEAN NOT NULL DEFAULT false,
  lifetime_value       FLOAT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CUSTOMER FAMILY ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_family (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id      TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id        TEXT NOT NULL,
  name             TEXT NOT NULL,
  relation         TEXT NOT NULL,
  dob              DATE,
  anniversary_date DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PURCHASE HISTORY ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_history (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id      TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id        TEXT NOT NULL,
  purchase_date    DATE NOT NULL,
  amount           FLOAT NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'AED',
  category         TEXT,
  item_description TEXT,
  occasion         TEXT,
  staff_id         TEXT,
  location_id      TEXT,
  image_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INTERACTIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interactions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     TEXT REFERENCES leads(id),
  customer_id TEXT REFERENCES customers(id),
  staff_id    TEXT REFERENCES tenant_users(id),
  type        TEXT NOT NULL,
  direction   TEXT NOT NULL DEFAULT 'inbound',
  content     TEXT,
  media_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── WHATSAPP MESSAGES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wa_message_id TEXT UNIQUE,
  direction     TEXT NOT NULL,
  from_number   TEXT NOT NULL,
  to_number     TEXT NOT NULL,
  message_type  TEXT NOT NULL DEFAULT 'text',
  content       TEXT,
  media_url     TEXT,
  lead_id       TEXT REFERENCES leads(id),
  customer_id   TEXT REFERENCES customers(id),
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── FOLLOW-UPS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         TEXT REFERENCES leads(id),
  customer_id     TEXT REFERENCES customers(id),
  assigned_to     TEXT REFERENCES tenant_users(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  type            TEXT NOT NULL,
  message_content TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── EVENTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id             TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id           TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL,
  event_date            TIMESTAMPTZ NOT NULL,
  reminder_days_before  INT NOT NULL DEFAULT 7,
  last_triggered_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AI SCORES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_scores (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id                TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id              TEXT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  vip_score                FLOAT NOT NULL DEFAULT 0,
  churn_risk               FLOAT NOT NULL DEFAULT 0,
  lifetime_value_predicted FLOAT NOT NULL DEFAULT 0,
  next_purchase_category   TEXT,
  next_purchase_date_est   TIMESTAMPTZ,
  suggestions              JSONB NOT NULL DEFAULT '[]',
  scored_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_tenant       ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage        ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant   ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone    ON customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant  ON follow_ups(tenant_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_wa_messages_tenant ON whatsapp_messages(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_lead  ON interactions(lead_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Enable RLS on all tables (service_role bypasses this automatically)
ALTER TABLE tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_locations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_whatsapp_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_family          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scores                ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (used by API routes)
-- anon/authenticated roles will be restricted by RLS policies
-- All API routes use service_role key which bypasses RLS

SELECT 'Schema created successfully!' AS result;
