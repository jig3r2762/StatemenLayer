-- StatementLayer Initial Schema
-- Run this in the Supabase SQL editor or via supabase db push

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- accounts
-- One row per property management firm
-- ─────────────────────────────────────────────
create table if not exists accounts (
  id            uuid primary key default uuid_generate_v4(),
  clerk_user_id text not null unique,
  firm_name     text not null,
  logo_url      text,
  brand_color   text not null default '#2563EB',
  plan          text not null default 'starter' check (plan in ('starter', 'growth', 'agency')),
  stripe_id     text,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- column_mappings
-- Saved CSV column mapping per account + PMS type
-- ─────────────────────────────────────────────
create table if not exists column_mappings (
  id          uuid primary key default uuid_generate_v4(),
  account_id  uuid not null references accounts(id) on delete cascade,
  pms_type    text not null check (pms_type in ('appfolio', 'buildium')),
  mapping     jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (account_id, pms_type)
);

-- ─────────────────────────────────────────────
-- owners
-- One row per investor/owner profile per account
-- ─────────────────────────────────────────────
create table if not exists owners (
  id              uuid primary key default uuid_generate_v4(),
  account_id      uuid not null references accounts(id) on delete cascade,
  name            text not null,
  email           text not null,
  layout          text not null default 'standard' check (layout in ('summary', 'standard', 'detailed')),
  sections_config jsonb not null default '{
    "show_income": true,
    "show_expenses": true,
    "show_management_fee": true,
    "show_line_items": true,
    "show_attachments": true,
    "number_format": "comma",
    "section_order": ["income", "expenses", "fee", "net"]
  }',
  pms_type        text not null check (pms_type in ('appfolio', 'buildium')),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- report_batches
-- One batch per monthly upload
-- ─────────────────────────────────────────────
create table if not exists report_batches (
  id           uuid primary key default uuid_generate_v4(),
  account_id   uuid not null references accounts(id) on delete cascade,
  month        text not null,                -- "2026-04"
  source_file  text not null,
  status       text not null default 'processing'
                 check (status in ('processing', 'ready', 'sent', 'partial')),
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);

-- ─────────────────────────────────────────────
-- reports
-- One row per owner per batch
-- ─────────────────────────────────────────────
create table if not exists reports (
  id             uuid primary key default uuid_generate_v4(),
  batch_id       uuid not null references report_batches(id) on delete cascade,
  owner_id       uuid not null references owners(id) on delete cascade,
  pdf_url        text,
  web_token      text unique,
  web_token_expires_at timestamptz,
  ai_commentary  text,
  email_status   text not null default 'pending'
                   check (email_status in ('pending', 'sent', 'delivered', 'opened')),
  opened_at      timestamptz,
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- attachments
-- Uploaded photos / invoices, matched to line items
-- ─────────────────────────────────────────────
create table if not exists attachments (
  id              uuid primary key default uuid_generate_v4(),
  account_id      uuid not null references accounts(id) on delete cascade,
  batch_id        uuid not null references report_batches(id) on delete cascade,
  file_url        text not null,
  file_name       text not null,
  file_type       text not null,           -- "image" | "pdf"
  matched_report_id uuid references reports(id),
  matched_date    text,
  matched_amount  numeric,
  confirmed       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_owners_account_id on owners(account_id);
create index if not exists idx_owners_active on owners(account_id, active);
create index if not exists idx_report_batches_account_id on report_batches(account_id);
create index if not exists idx_reports_batch_id on reports(batch_id);
create index if not exists idx_reports_owner_id on reports(owner_id);
create index if not exists idx_reports_web_token on reports(web_token);
create index if not exists idx_attachments_batch_id on attachments(batch_id);

-- ─────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────
alter table accounts enable row level security;
alter table owners enable row level security;
alter table column_mappings enable row level security;
alter table report_batches enable row level security;
alter table reports enable row level security;
alter table attachments enable row level security;

-- NOTE: RLS policies use clerk_user_id stored in accounts.
-- API routes use the service role key (bypasses RLS) — auth is enforced
-- at the application layer via Clerk middleware.

-- Allow service role full access (used by API routes)
-- No additional policies needed for service role key.

-- Public web-view: reports accessible by web_token (no auth)
create policy "public_web_view" on reports
  for select
  using (
    web_token is not null
    and web_token_expires_at > now()
  );
