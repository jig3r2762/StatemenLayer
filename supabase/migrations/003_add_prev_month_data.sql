-- Store previous month per-owner figures for variance comparison and trend charts
-- Run manually in Supabase SQL editor: Dashboard → SQL Editor → paste and run
alter table report_batches
  add column if not exists prev_month_data jsonb;
