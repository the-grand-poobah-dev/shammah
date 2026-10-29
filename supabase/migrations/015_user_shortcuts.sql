-- =============================================================================
-- Shammah Migration 015: User Shortcuts Cloud Sync
-- Table: public.user_shortcuts
-- Stores custom shortcut tableau configurations for signed-in users with
-- offline-first localStorage caching and cloud sync.
-- =============================================================================

-- 1. Create table with check constraint: maximum 12 items in jsonb array
create table if not exists public.user_shortcuts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_shortcuts_items_array check (jsonb_typeof(items) = 'array'),
  constraint user_shortcuts_max_items check (jsonb_array_length(items) <= 12)
);

-- 2. Trigger function to auto-update updated_at on row changes
create or replace function public.handle_user_shortcuts_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_shortcuts_updated_at on public.user_shortcuts;
create trigger set_user_shortcuts_updated_at
  before update on public.user_shortcuts
  for each row
  execute function public.handle_user_shortcuts_updated_at();

-- 3. Enable Row Level Security (RLS)
alter table public.user_shortcuts enable row level security;

-- 4. Policies: users can select, insert, update, delete only their own row (auth.uid() = user_id)
drop policy if exists "Users can select own shortcuts" on public.user_shortcuts;
create policy "Users can select own shortcuts"
  on public.user_shortcuts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own shortcuts" on public.user_shortcuts;
create policy "Users can insert own shortcuts"
  on public.user_shortcuts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own shortcuts" on public.user_shortcuts;
create policy "Users can update own shortcuts"
  on public.user_shortcuts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own shortcuts" on public.user_shortcuts;
create policy "Users can delete own shortcuts"
  on public.user_shortcuts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5. Grant access permissions
grant select, insert, update, delete on table public.user_shortcuts to authenticated;
grant all on table public.user_shortcuts to service_role;
