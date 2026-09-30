-- Shammah migration 007: church pages + category browsing
-- Run in Supabase Dashboard > SQL Editor > New query. Safe to re-run.
-- Changes no existing data, and no existing column or policy on profiles/posts.

-- ---------------------------------------------------------------
-- 1. Church profile fields
--    (churches already has: id, name, created_at, subscription_status, onboarded_at)
-- ---------------------------------------------------------------
alter table churches
  add column if not exists description text,
  add column if not exists denomination text,
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists location_label text,
  add column if not exists location_place_id text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists website text,
  add column if not exists created_by uuid references profiles(id) on delete set null;

-- "not valid" = the rule applies to new/edited rows, without failing on any test rows you already have
alter table churches drop constraint if exists churches_description_len;
alter table churches add constraint churches_description_len
  check (description is null or char_length(description) <= 500) not valid;

-- ---------------------------------------------------------------
-- 2. Access: the "GRANT" (can this role touch the table at all?)
--    and Row Level Security (which rows?). You need BOTH — the missing
--    GRANT is what caused the profile_private error.
-- ---------------------------------------------------------------
grant select, insert, update on public.churches to authenticated;

alter table churches enable row level security;

drop policy if exists "churches are readable by signed-in users" on churches;
create policy "churches are readable by signed-in users" on churches
  for select using (auth.role() = 'authenticated');

-- Any member who has finished onboarding can start a church, as themselves
drop policy if exists "onboarded members can create a church" on churches;
create policy "onboarded members can create a church" on churches
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.onboarding_completed_at is not null)
  );

-- Only the person who created it (or a platform admin) can edit it
drop policy if exists "church creators can edit their church" on churches;
create policy "church creators can edit their church" on churches
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  )
  with check (
    created_by = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'platform_admin')
  );

-- ---------------------------------------------------------------
-- 3. Guard rules (enforced in the database, like the badge lock):
--    - subscription_status can never be self-edited (payments come later via the server)
--    - created_by can't be reassigned
--    - name 2-80 characters
--    - max 3 churches per person (stops spam)
--    SQL editor / service key (auth.uid() is null) and platform admins pass straight through.
-- ---------------------------------------------------------------
create or replace function public.guard_church_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean := false;
  owned integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  select (role = 'platform_admin') into caller_is_admin from profiles where id = auth.uid();
  if coalesce(caller_is_admin, false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.subscription_status := 'unpaid';
    new.onboarded_at := null;
    new.created_by := auth.uid();
    select count(*) into owned from churches where created_by = auth.uid();
    if owned >= 3 then
      raise exception 'You can create up to 3 churches.';
    end if;
  else
    new.subscription_status := old.subscription_status;
    new.onboarded_at := old.onboarded_at;
    new.created_by := old.created_by;
  end if;

  new.name := btrim(coalesce(new.name, ''));
  if char_length(new.name) < 2 or char_length(new.name) > 80 then
    raise exception 'A church name must be between 2 and 80 characters.';
  end if;

  return new;
end $$;

drop trigger if exists guard_church_write_trg on churches;
create trigger guard_church_write_trg before insert or update on churches
  for each row execute function public.guard_church_write();

-- ---------------------------------------------------------------
-- 4. Category browsing: how many posts each category has
-- ---------------------------------------------------------------
create or replace function public.category_counts()
returns table (category_id text, total bigint)
language sql stable as $$
  select category_id, count(*) as total from posts group by category_id
$$;
grant execute on function public.category_counts() to authenticated;

-- How many members each church has (counted in the database, not the browser)
create or replace function public.church_member_counts()
returns table (church_id uuid, total bigint)
language sql stable as $$
  select church_id, count(*) as total from profiles where church_id is not null group by church_id
$$;
grant execute on function public.church_member_counts() to authenticated;

-- Speed: "posts in this church" and "members of this church" lookups
create index if not exists posts_church_created_idx on posts (church_id, created_at desc);
create index if not exists profiles_church_idx on profiles (church_id);

-- ---------------------------------------------------------------
-- 5. Storage for church logos + covers.
--    Files live in a folder named after the church id: <church id>/logo.jpg
--    Only that church's creator can write there. Anyone can view.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('church-media', 'church-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "church-media read" on storage.objects;
drop policy if exists "church-media insert" on storage.objects;
drop policy if exists "church-media update" on storage.objects;
drop policy if exists "church-media delete" on storage.objects;

create policy "church-media read" on storage.objects for select
  using (bucket_id = 'church-media');

create policy "church-media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-media'
    and exists (select 1 from public.churches c
                where c.id::text = (storage.foldername(name))[1] and c.created_by = auth.uid())
  );

create policy "church-media update" on storage.objects for update to authenticated
  using (
    bucket_id = 'church-media'
    and exists (select 1 from public.churches c
                where c.id::text = (storage.foldername(name))[1] and c.created_by = auth.uid())
  );

create policy "church-media delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'church-media'
    and exists (select 1 from public.churches c
                where c.id::text = (storage.foldername(name))[1] and c.created_by = auth.uid())
  );

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------
-- HOW YOU (the developer) fix things by hand, in the SQL Editor:
--   Make someone the owner of a church:
--     update churches set created_by = '<user-uuid>' where id = '<church-uuid>';
--   Mark a church as paid (until M-Pesa is wired in):
--     update churches set subscription_status = 'active' where id = '<church-uuid>';
-- ---------------------------------------------------------------
