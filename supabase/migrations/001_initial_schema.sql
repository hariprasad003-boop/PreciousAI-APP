-- PreciousAI Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── TENANTS ─────────────────────────────────────────────────────────────────

create table tenants (
  id           text primary key default gen_random_uuid()::text,
  name         text not null,
  subdomain    text not null unique,
  plan         text not null default 'starter',
  branding     jsonb not null default '{"primary_color":"#C9A84C","accent_color":"#1A1A2E","store_name":"","logo_url":null}',
  currency     text not null default 'AED',
  country_code text not null default '+971',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table tenant_locations (
  id         text primary key default gen_random_uuid()::text,
  tenant_id  text not null references tenants(id) on delete cascade,
  name       text not null,
  city       text,
  country    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table tenant_users (
  id          text primary key,  -- same as auth.users.id
  tenant_id   text not null references tenants(id) on delete cascade,
  location_id text references tenant_locations(id),
  email       text not null,
  full_name   text not null,
  role        text not null default 'sales_staff',
  is_active   boolean not null default true,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(tenant_id, email)
);

create table tenant_whatsapp_configs (
  id                    text primary key default gen_random_uuid()::text,
  tenant_id             text not null unique references tenants(id) on delete cascade,
  phone_number_id       text not null,
  access_token          text not null,
  verify_token          text not null default gen_random_uuid()::text,
  webhook_configured_at timestamptz,
  is_active             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── LEADS ───────────────────────────────────────────────────────────────────

create table lead_stages (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null references tenants(id) on delete cascade,
  name        text not null,
  color       text not null default '#6366F1',
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);

create table leads (
  id                text primary key default gen_random_uuid()::text,
  tenant_id         text not null references tenants(id) on delete cascade,
  location_id       text references tenant_locations(id),
  stage_id          text not null references lead_stages(id),
  assigned_to       text references tenant_users(id),
  source            text not null default 'manual',
  full_name         text not null,
  phone             text not null,
  email             text,
  country_code      text not null default '+971',
  raw_message       text,
  intent_score      float,
  budget_amount     float,
  budget_currency   text,
  occasion          text,
  category_interest text[] default '{}',
  tags              text[] default '{}',
  voice_note_url    text,
  converted_at      timestamptz,
  last_contacted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────

create table customers (
  id                   text primary key default gen_random_uuid()::text,
  tenant_id            text not null references tenants(id) on delete cascade,
  lead_id              text unique references leads(id),
  location_id          text references tenant_locations(id),
  full_name            text not null,
  phone                text not null,
  email                text,
  dob                  date,
  anniversary_date     date,
  city                 text,
  country_code         text not null default '+971',
  metal_pref           text[] default '{}',
  stone_pref           text[] default '{}',
  style_pref           text[] default '{}',
  favourite_categories text[] default '{}',
  notes                text,
  is_vip               boolean not null default false,
  lifetime_value       float not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table customer_family (
  id               text primary key default gen_random_uuid()::text,
  customer_id      text not null references customers(id) on delete cascade,
  tenant_id        text not null,
  name             text not null,
  relation         text not null,
  dob              date,
  anniversary_date date,
  notes            text,
  created_at       timestamptz not null default now()
);

create table purchase_history (
  id               text primary key default gen_random_uuid()::text,
  customer_id      text not null references customers(id) on delete cascade,
  tenant_id        text not null,
  purchase_date    date not null,
  amount           float not null,
  currency         text not null default 'AED',
  category         text,
  item_description text,
  occasion         text,
  staff_id         text,
  location_id      text,
  image_url        text,
  created_at       timestamptz not null default now()
);

-- ─── INTERACTIONS & MESSAGING ─────────────────────────────────────────────────

create table interactions (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null references tenants(id) on delete cascade,
  lead_id     text references leads(id),
  customer_id text references customers(id),
  staff_id    text references tenant_users(id),
  type        text not null,
  direction   text not null default 'inbound',
  content     text,
  media_url   text,
  created_at  timestamptz not null default now()
);

create table whatsapp_messages (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null references tenants(id) on delete cascade,
  wa_message_id text unique,
  direction     text not null,
  from_number   text not null,
  to_number     text not null,
  message_type  text not null default 'text',
  content       text,
  media_url     text,
  lead_id       text references leads(id),
  customer_id   text references customers(id),
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── FOLLOW-UPS & EVENTS ─────────────────────────────────────────────────────

create table follow_ups (
  id              text primary key default gen_random_uuid()::text,
  tenant_id       text not null references tenants(id) on delete cascade,
  lead_id         text references leads(id),
  customer_id     text references customers(id),
  assigned_to     text references tenant_users(id),
  scheduled_at    timestamptz not null,
  type            text not null default 'whatsapp',
  message_content text,
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table events (
  id                   text primary key default gen_random_uuid()::text,
  tenant_id            text not null references tenants(id) on delete cascade,
  customer_id          text not null references customers(id) on delete cascade,
  event_type           text not null,
  event_date           date not null,
  reminder_days_before int not null default 7,
  last_triggered_at    timestamptz,
  created_at           timestamptz not null default now()
);

-- ─── AI SCORES ───────────────────────────────────────────────────────────────

create table ai_scores (
  id                       text primary key default gen_random_uuid()::text,
  tenant_id                text not null references tenants(id) on delete cascade,
  customer_id              text not null unique references customers(id) on delete cascade,
  vip_score                float not null default 0,
  churn_risk               float not null default 0,
  lifetime_value_predicted float not null default 0,
  next_purchase_category   text,
  next_purchase_date_est   date,
  suggestions              jsonb not null default '[]',
  scored_at                timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

alter table tenants enable row level security;
alter table tenant_locations enable row level security;
alter table tenant_users enable row level security;
alter table tenant_whatsapp_configs enable row level security;
alter table lead_stages enable row level security;
alter table leads enable row level security;
alter table customers enable row level security;
alter table customer_family enable row level security;
alter table purchase_history enable row level security;
alter table interactions enable row level security;
alter table whatsapp_messages enable row level security;
alter table follow_ups enable row level security;
alter table events enable row level security;
alter table ai_scores enable row level security;

-- Helper function: get current user's tenant_id
create or replace function get_my_tenant_id()
returns text language sql security definer stable as $$
  select tenant_id from tenant_users where id = auth.uid()::text limit 1;
$$;

-- RLS policies — tenant isolation on every table
create policy "tenant_isolation" on tenants
  for all using (id = get_my_tenant_id());

create policy "tenant_isolation" on tenant_locations
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on tenant_users
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on tenant_whatsapp_configs
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on lead_stages
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on leads
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on customers
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on customer_family
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on purchase_history
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on interactions
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on whatsapp_messages
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on follow_ups
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on events
  for all using (tenant_id = get_my_tenant_id());

create policy "tenant_isolation" on ai_scores
  for all using (tenant_id = get_my_tenant_id());

-- Service role bypass (for API routes using admin client)
create policy "service_role_bypass" on tenants
  for all using (auth.role() = 'service_role');

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index on tenants(subdomain);
create index on tenant_users(tenant_id, email);
create index on tenant_users(id);
create index on leads(tenant_id, stage_id);
create index on leads(tenant_id, created_at desc);
create index on leads(phone);
create index on customers(tenant_id, lifetime_value desc);
create index on customers(phone);
create index on whatsapp_messages(tenant_id, created_at desc);
create index on whatsapp_messages(wa_message_id);
create index on follow_ups(tenant_id, scheduled_at, status);
create index on events(tenant_id, event_date);
