-- ==============================================================================
-- Migration: 20261102_fix_media_follows_rls.sql
-- Description: Fix "permission denied for table follows" by granting SELECT on
--              public.follows and public.church_members to anon and authenticated,
--              and ensuring RLS allows reading follows for policy evaluations.
-- Idempotent & safe to run in Supabase SQL editor.
-- ==============================================================================

-- 1. Grant SELECT on follows and church_members
grant usage on schema public to anon, authenticated;
grant select on public.follows to anon, authenticated;
grant select on public.church_members to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.profiles to anon, authenticated;

-- 2. Ensure RLS is enabled on follows with a public read policy
alter table if exists public.follows enable row level security;

drop policy if exists "Anyone can read follows" on public.follows;
create policy "Anyone can read follows"
  on public.follows for select
  using (true);

-- 3. Ensure church_members has read access for member checks
alter table if exists public.church_members enable row level security;

drop policy if exists "Anyone can read active church members" on public.church_members;
create policy "Anyone can read active church members"
  on public.church_members for select
  using (true);

-- 4. Re-declare media_items select policy with safe public short-circuit
drop policy if exists "Read published media items" on public.media_items;
create policy "Read published media items"
  on public.media_items for select
  using (
    auth.uid() = author_id
    or
    (
      status = 'published' and (
        visibility = 'public'
        or (
          visibility = 'followers'
          and auth.uid() is not null
          and exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.followed_id = media_items.author_id
          )
        )
        or (
          visibility = 'church'
          and auth.uid() is not null
          and exists (
            select 1 from public.church_members cm
            where cm.user_id = auth.uid()
              and cm.church_id = media_items.church_id::text
              and cm.status = 'active'
          )
        )
      )
    )
  );

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
