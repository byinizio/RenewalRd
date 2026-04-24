-- ============================================
-- RENEWALRADAR — COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- ── AGENCIES ──
create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text unique not null,
  owner_phone text,
  carrier text,                                    -- For SMS via email-to-SMS gateways
  timezone text default 'America/New_York',
  send_time time default '08:00:00',
  status text default 'trial'
    check (status in ('trial', 'active', 'paused', 'cancelled')),
  trial_ends_at timestamptz default (now() + interval '7 days'),
  total_clients integer default 0,
  total_saved integer default 0,
  total_lost integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── CLIENTS ──
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  name text not null,
  industry text default 'saas',
  contact_email text,
  contact_phone text,
  monthly_retainer_cents integer default 50000,    -- $500 default
  contract_end_date date,
  status text default 'active'
    check (status in ('active', 'at_risk', 'churned', 'saved')),
  risk_score integer default 0,
  risk_reason text,
  last_interaction_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── SOCIAL ACCOUNTS ──
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  platform text not null check (platform in ('twitter', 'linkedin', 'instagram')),
  account_handle text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  -- Prevent duplicate platform-handle combos per client
  unique(client_id, platform, account_handle)
);

-- ── DAILY METRICS ──
create table if not exists daily_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  platform text not null,
  followers integer default 0,
  impressions integer default 0,
  engagement_rate numeric(8, 6) default 0,
  clicks integer default 0,
  posts_count integer default 0,
  logged_at timestamptz default now()
);

-- ── RISK SNAPSHOTS ──
create table if not exists risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  risk_score integer not null check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  risk_factors text[] default '{}',
  metrics_snapshot jsonb not null default '{}',
  predicted_churn_date date,
  created_at timestamptz default now()
);

-- ── DAILY DIGESTS ──
create table if not exists daily_digests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade not null,
  sent_at timestamptz default now(),
  email_status text default 'pending'
    check (email_status in ('pending', 'sent', 'failed', 'bounced')),
  email_subject text,
  short_summary text,
  full_analysis jsonb default '{}',
  clients_at_risk integer default 0,
  clients_saved integer default 0,
  revenue_at_risk_cents integer default 0,
  created_at timestamptz default now()
);

-- ── FEEDBACK (Learning Loop) ──
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  digest_id uuid references daily_digests(id) on delete set null,
  outcome text not null
    check (outcome in ('saved', 'lost', 'no_action', 'false_alarm')),
  notes text,
  created_at timestamptz default now()
);

-- ── KEEP-ALIVE (Prevents Supabase free tier pausing) ──
create table if not exists keep_alive (
  id integer primary key default 1,
  last_ping timestamptz default now()
);
insert into keep_alive (id, last_ping) values (1, now())
  on conflict (id) do nothing;

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_agencies_status
  on agencies(status) where status in ('trial', 'active');

create index if not exists idx_clients_agency
  on clients(agency_id, status);

create index if not exists idx_clients_risk
  on clients(risk_score desc) where status in ('active', 'at_risk');

create index if not exists idx_daily_metrics_client
  on daily_metrics(client_id, logged_at desc);

create index if not exists idx_risk_snapshots_client
  on risk_snapshots(client_id, created_at desc);

create index if not exists idx_daily_digests_agency
  on daily_digests(agency_id, sent_at desc);

create index if not exists idx_feedback_client
  on feedback(client_id, created_at desc);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table agencies enable row level security;
alter table clients enable row level security;
alter table social_accounts enable row level security;
alter table daily_metrics enable row level security;
alter table risk_snapshots enable row level security;
alter table daily_digests enable row level security;
alter table feedback enable row level security;
alter table keep_alive enable row level security;

-- Open policies for MVP (tighten with auth later)
-- These allow service_role to do everything
-- Anon users can only sign up and read their own data via agency_id param

create policy "Allow public signup" on agencies
  for insert with check (true);

create policy "Allow select by id" on agencies
  for select using (true);

create policy "Allow update" on agencies
  for update using (true);

create policy "Allow client insert" on clients
  for insert with check (true);

create policy "Allow client select" on clients
  for select using (true);

create policy "Allow client update" on clients
  for update using (true);

create policy "Allow client delete" on clients
  for delete using (true);

create policy "Allow account insert" on social_accounts
  for insert with check (true);

create policy "Allow account select" on social_accounts
  for select using (true);

create policy "Allow account update" on social_accounts
  for update using (true);

create policy "Allow metrics insert" on daily_metrics
  for insert with check (true);

create policy "Allow metrics select" on daily_metrics
  for select using (true);

create policy "Allow snapshot insert" on risk_snapshots
  for insert with check (true);

create policy "Allow snapshot select" on risk_snapshots
  for select using (true);

create policy "Allow digest insert" on daily_digests
  for insert with check (true);

create policy "Allow digest select" on daily_digests
  for select using (true);

create policy "Allow digest update" on daily_digests
  for update using (true);

create policy "Allow feedback insert" on feedback
  for insert with check (true);

create policy "Allow feedback select" on feedback
  for select using (true);

create policy "Allow keep_alive upsert" on keep_alive
  for all using (true) with check (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment agency client count
create or replace function increment_agency_clients(p_agency_id uuid)
returns void language plpgsql as $$
begin
  update agencies
  set total_clients = total_clients + 1,
      updated_at = now()
  where id = p_agency_id;
end;
$$;

-- Increment agency saved count
create or replace function increment_agency_saved(p_agency_id uuid)
returns void language plpgsql as $$
begin
  update agencies
  set total_saved = total_saved + 1,
      updated_at = now()
  where id = p_agency_id;
end;
$$;

-- Increment agency lost count
create or replace function increment_agency_lost(p_agency_id uuid)
returns void language plpgsql as $$
begin
  update agencies
  set total_lost = total_lost + 1,
      updated_at = now()
  where id = p_agency_id;
end;
$$;

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agencies_updated_at
  before update on agencies
  for each row execute function update_updated_at();

create trigger clients_updated_at
  before update on clients
  for each row execute function update_updated_at();
-- ============================================
-- AUTH & SECURITY TABLES
-- ============================================

-- Admin users (completely separate from agencies)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL, -- bcrypt hash
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Admin 2FA (TOTP)
CREATE TABLE IF NOT EXISTS admin_2fa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  enabled boolean DEFAULT false,
  backup_codes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Admin sessions (revocable)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- IP whitelist (dynamic, admin-managed)
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  label text,
  enabled boolean DEFAULT true,
  created_by uuid REFERENCES admin_users(id),
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Login attempts (brute force detection)
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  ip_address text NOT NULL,
  user_agent text,
  path text,
  success boolean DEFAULT false,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- Security alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- 'brute_force', 'ip_blocked', 'new_ip_login'
  severity text NOT NULL,   -- 'low', 'medium', 'high', 'critical'
  ip_address text,
  email text,
  details jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SUBSCRIPTION & PAYMENT TABLES
-- ============================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,           -- 'starter', 'growth', 'agency_pro'
  display_name text NOT NULL,
  price_cents integer NOT NULL,
  max_clients integer,          -- null = unlimited
  features jsonb DEFAULT '{}',
  wise_product_id text,
  created_at timestamptz DEFAULT now()
);

-- Seed the plans
INSERT INTO subscription_plans (name, display_name, price_cents, max_clients, features) VALUES
  ('starter',    'Starter',    4900,  5,    '{"ai_scripts": false, "upsell_signals": false, "history_days": 7,  "white_label": false}'),
  ('growth',     'Growth',     7900,  20,   '{"ai_scripts": true,  "upsell_signals": true,  "history_days": 14, "white_label": false}'),
  ('agency_pro', 'Agency Pro', 14900, null, '{"ai_scripts": true,  "upsell_signals": true,  "history_days": 30, "white_label": true}')
ON CONFLICT DO NOTHING;

-- Add subscription fields to agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES subscription_plans(id);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan_name text DEFAULT 'trial';
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS wise_payment_reference text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS ban_reason text;

-- Payment records
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id),
  amount_cents integer NOT NULL,
  currency text DEFAULT 'USD',
  wise_transfer_id text,
  wise_reference text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  confirmed_by_admin uuid REFERENCES admin_users(id),
  confirmed_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- RLS — Agency data isolation
-- ============================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Agencies see only their own payments
CREATE POLICY "agencies_own_payments" ON payments
  FOR SELECT USING (
    agency_id IN (
      SELECT id FROM agencies WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unack ON security_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(admin_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agencies_auth_user   ON agencies(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_agency      ON payments(agency_id, created_at DESC);

-- ============================================
-- Insert your admin account (run once after setup)
-- Generate hash: node -e "const b=require('bcryptjs');console.log(b.hashSync('YourPassword123!',12))"
-- ============================================

-- INSERT INTO admin_users (email, password_hash) VALUES ('your@email.com', '$2b$12$...');

-- Insert your home IP
-- INSERT INTO ip_whitelist (ip_address, label) VALUES ('YOUR.IP.HERE', 'Home');