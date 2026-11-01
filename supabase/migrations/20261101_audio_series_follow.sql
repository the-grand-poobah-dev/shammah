-- Audio follow subscriptions. Users can manage only their own subscriptions;
-- episode visibility remains governed by media_items RLS.
create table if not exists public.media_series_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references public.media_series(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

create index if not exists idx_media_series_follows_series_created
  on public.media_series_follows (series_id, created_at desc);
create index if not exists idx_media_series_follows_user_created
  on public.media_series_follows (user_id, created_at desc);

alter table public.media_series_follows enable row level security;

drop policy if exists "Users can read own media series follows" on public.media_series_follows;
create policy "Users can read own media series follows"
  on public.media_series_follows for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can follow media series" on public.media_series_follows;
create policy "Users can follow media series"
  on public.media_series_follows for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.media_series s
      where s.id = series_id
        and s.kind = 'audio'
    )
  );

drop policy if exists "Users can unfollow media series" on public.media_series_follows;
create policy "Users can unfollow media series"
  on public.media_series_follows for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.media_series_follows to authenticated;
