-- Migration: 012_status_privacy_and_reports.sql
-- 1. Reshare permission on profiles
alter table public.profiles
  add column if not exists allow_status_reshare boolean not null default false;

-- 2. Unified content reports (works for posts and statuses)
create table if not exists public.content_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles(id) on delete cascade,
  target_type      text not null check (target_type in ('post','status')),
  target_id        uuid not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason           text not null,
  notes            text,
  status           text not null default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at       timestamptz not null default now()
);
create index if not exists content_reports_target_idx on public.content_reports (target_type, target_id);
create index if not exists content_reports_reporter_idx on public.content_reports (reporter_id, created_at desc);

-- Enable Row Level Security
alter table public.content_reports enable row level security;

-- Drop existing policies if re-run
drop policy if exists "users can insert own content reports" on public.content_reports;
drop policy if exists "users can view own content reports" on public.content_reports;
drop policy if exists "admins can update content reports" on public.content_reports;

-- Reporters can insert their own reports
create policy "users can insert own content reports"
  on public.content_reports
  for insert
  with check (auth.uid() = reporter_id);

-- Reporters can view their own reports and admins can view all
create policy "users can view own content reports"
  on public.content_reports
  for select
  using (
    auth.uid() = reporter_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'platform_admin'
    )
  );

-- Admins can update reports
create policy "admins can update content reports"
  on public.content_reports
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'platform_admin'
    )
  );
