-- ============================================================
-- Shammah — Onboarding & Profile enrichment
-- Run this in Supabase SQL Editor AFTER the original schema.sql
-- ============================================================

-- 1. Extend profiles
alter table profiles
  add column if not exists badge text,
  add column if not exists avatar_url text,
  add column if not exists cover_url text,
  add column if not exists about text,
  add column if not exists date_of_birth date,
  add column if not exists location_name text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists display_name_changed_at timestamptz,
  add column if not exists onboarded_at timestamptz,
  add column if not exists badge_set_at timestamptz;

-- Badge is locked once set (users may only set it when it is still null)
comment on column profiles.badge is 'Member badge chosen once at onboarding. Changes only by platform_admin.';
comment on column profiles.display_name_changed_at is 'Last time display_name was changed. Users may change once every 90 days.';

-- Allowed badges (app also enforces this list)
-- Believer | Student | Teacher | Missionary | Pastor | Bishop | Reverend | Deacon | Elder | Evangelist | Worship Leader | Volunteer

-- 2. Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Protect badge + enforce 90-day name change via trigger
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();

  -- Badge: once set, only platform_admin may change it
  if old.badge is not null and new.badge is distinct from old.badge then
    if caller_role is distinct from 'platform_admin' then
      raise exception 'Badge cannot be changed once set. Contact support to request a change.';
    end if;
  end if;

  -- When user first sets badge, stamp badge_set_at
  if old.badge is null and new.badge is not null then
    new.badge_set_at := now();
  end if;

  -- display_name: only once every 90 days (admins exempt)
  if new.display_name is distinct from old.display_name then
    if caller_role is distinct from 'platform_admin' then
      if old.display_name_changed_at is not null
         and old.display_name_changed_at > now() - interval '90 days' then
        raise exception 'You can only change your display name once every 90 days.';
      end if;
      new.display_name_changed_at := now();
    end if;
  end if;

  -- Cap about at ~250 characters
  if new.about is not null and char_length(new.about) > 280 then
    raise exception 'About text is limited to 280 characters.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_fields on profiles;
create trigger protect_profile_fields
  before update on profiles
  for each row execute procedure public.protect_profile_fields();

-- 4. RLS: keep existing policies; ensure insert is allowed for the trigger path
-- (security definer handles the insert). Users can still update their own row
-- except for the fields the trigger guards.

-- 5. Storage buckets for avatars & covers (run in SQL or create via Dashboard)
-- You still need to create the buckets in Supabase Dashboard > Storage:
--   - avatars  (public)
--   - covers   (public)
-- Then add policies below.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

-- Anyone authenticated can upload to their own folder (userId/...)
create policy "Avatar upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Cover upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Cover update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Cover public read"
  on storage.objects for select
  using (bucket_id = 'covers');

-- Optional: allow users to delete their own files
create policy "Avatar delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Cover delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
