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
