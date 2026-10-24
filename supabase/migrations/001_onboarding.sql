-- Shammah migration 001: mandatory onboarding + profile fields
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run (idempotent).
--
-- BEFORE YOU RUN: check whether you already have a trigger on auth.users:
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- If it returns a trigger that creates profile rows under a name other than
-- "on_auth_user_created", drop it first (or skip section 5) so two triggers
-- don't both try to insert the same profile row.

-- ---------------------------------------------------------------
-- 1. Badges lookup (add a new badge later with a plain INSERT)
-- ---------------------------------------------------------------
create table if not exists badges (
  id text primary key,
  label text not null,
  sort_order integer not null default 0
);

insert into badges (id, label, sort_order) values
  ('believer',     'Believer',         10),
  ('seeker',       'Seeker',           20),
  ('student',      'Student',          30),
  ('intercessor',  'Intercessor',      40),
  ('teacher',      'Teacher',          50),
  ('worship',      'Worship Leader',   60),
  ('youth',        'Youth Leader',     70),
  ('deacon',       'Deacon / Deaconess', 80),
  ('elder',        'Elder',            90),
  ('evangelist',   'Evangelist',      100),
  ('missionary',   'Missionary',      110),
  ('chaplain',     'Chaplain',        120),
  ('pastor',       'Pastor',          130),
  ('reverend',     'Reverend',        140),
  ('priest',       'Priest',          150),
  ('bishop',       'Bishop',          160),
  ('apostle',      'Apostle',         170),
  ('prophet',      'Prophet',         180)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

alter table badges enable row level security;
drop policy if exists "badges are readable" on badges;
create policy "badges are readable" on badges for select using (true);

-- ---------------------------------------------------------------
-- 2. New profile columns
-- ---------------------------------------------------------------
alter table profiles
  add column if not exists badge text references badges(id),
  add column if not exists badge_verified boolean not null default false,
  add column if not exists avatar_url text,
  add column if not exists cover_url text,
  add column if not exists about text,
  add column if not exists location_label text,
  add column if not exists location_place_id text,
  add column if not exists location_lat double precision,   -- rounded to ~1 km by trigger
  add column if not exists location_lng double precision,
  add column if not exists display_name_changed_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

alter table profiles drop constraint if exists profiles_about_len;
alter table profiles add constraint profiles_about_len
  check (about is null or char_length(about) <= 250);

-- ---------------------------------------------------------------
-- 3. Private profile data (profiles are readable by every signed-in
--    user, so anything private lives in its own owner-only table)
-- ---------------------------------------------------------------
create table if not exists profile_private (
  id uuid primary key references profiles(id) on delete cascade,
  date_of_birth date,
  updated_at timestamptz default now()
);

alter table profile_private enable row level security;
drop policy if exists "owner reads private profile" on profile_private;
drop policy if exists "owner inserts private profile" on profile_private;
drop policy if exists "owner updates private profile" on profile_private;
create policy "owner reads private profile"   on profile_private for select using (auth.uid() = id);
create policy "owner inserts private profile" on profile_private for insert with check (auth.uid() = id);
create policy "owner updates private profile" on profile_private for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.check_dob()
returns trigger language plpgsql as $$
begin
  if new.date_of_birth is not null then
    if new.date_of_birth < date '1900-01-01' or new.date_of_birth > current_date then
      raise exception 'Please enter a valid date of birth.';
    end if;
    -- Minimum age 13. Talk to a Kenyan data-protection lawyer about under-18s (see notes).
    if new.date_of_birth > (current_date - interval '13 years')::date then
      raise exception 'You must be at least 13 years old to join Shammah.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists check_dob_trg on profile_private;
create trigger check_dob_trg before insert or update on profile_private
  for each row execute function public.check_dob();

-- ---------------------------------------------------------------
-- 4. Guard rules on profile edits (enforced in the database, so they
--    can't be bypassed by editing the front-end)
--    - role / badge_verified: never self-editable
--    - badge: can be set once, then only by you (SQL editor) or a platform_admin
--    - display_name: 2-50 chars, once every 90 days
--    - onboarding can't be marked complete without name + badge + date of birth
-- ---------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean := false;
  clean_name text;
begin
  -- SQL editor / service key: auth.uid() is null -> full power (this is how YOU change a badge)
  if auth.uid() is null then
    return new;
  end if;

  select (role = 'platform_admin') into caller_is_admin from profiles where id = auth.uid();
  if coalesce(caller_is_admin, false) then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'You cannot change your role.';
  end if;
  if new.badge_verified is distinct from old.badge_verified then
    raise exception 'Badge verification is managed by the Shammah team.';
  end if;

  -- Badge: set once, then locked
  if new.badge is distinct from old.badge and old.badge is not null then
    raise exception 'Your badge is permanent. Contact the Shammah team if it needs to change.';
  end if;

  -- Display name
  clean_name := btrim(coalesce(new.display_name, ''));
  if clean_name is distinct from coalesce(old.display_name, '') then
    if char_length(clean_name) < 2 or char_length(clean_name) > 50 then
      raise exception 'Your name must be between 2 and 50 characters.';
    end if;
    if lower(clean_name) in ('admin', 'administrator', 'shammah', 'shammah team', 'support', 'moderator') then
      raise exception 'That name is reserved. Please choose another.';
    end if;
    if old.onboarding_completed_at is not null
       and old.display_name_changed_at is not null
       and old.display_name_changed_at > now() - interval '90 days' then
      raise exception 'You can change your name once every 90 days. Your next change is available on %.',
        to_char(old.display_name_changed_at + interval '90 days', 'DD Mon YYYY');
    end if;
    new.display_name := clean_name;
    new.display_name_changed_at := now();
  end if;

  -- About: trim
  if new.about is not null then
    new.about := nullif(btrim(new.about), '');
  end if;

  -- Location privacy: keep coordinates city-level (~1 km)
  if new.location_lat is not null then new.location_lat := round(new.location_lat::numeric, 2); end if;
  if new.location_lng is not null then new.location_lng := round(new.location_lng::numeric, 2); end if;

  -- Onboarding completion
  if old.onboarding_completed_at is not null
     and new.onboarding_completed_at is distinct from old.onboarding_completed_at then
    raise exception 'Onboarding is already complete.';
  end if;
  if old.onboarding_completed_at is null and new.onboarding_completed_at is not null then
    if new.badge is null then
      raise exception 'Please choose a badge to finish setting up.';
    end if;
    if not exists (select 1 from profile_private pp where pp.id = new.id and pp.date_of_birth is not null) then
      raise exception 'Please add your date of birth to finish setting up.';
    end if;
    new.onboarding_completed_at := now();
  end if;

  return new;
end $$;

drop trigger if exists guard_profile_update_trg on profiles;
create trigger guard_profile_update_trg before update on profiles
  for each row execute function public.guard_profile_update();

-- The old update policy had no WITH CHECK; add one
drop policy if exists "users manage their own profile" on profiles;
create policy "users manage their own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------
-- 5. Create a profile row automatically at signup (all sign-in methods)
--    Google/Facebook put the person's name in full_name / name.
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: anyone who signed up before this trigger existed
insert into public.profiles (id, display_name)
select u.id,
       coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'), ''),
                nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                nullif(btrim(u.raw_user_meta_data->>'name'), ''),
                split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- 6. Make onboarding truly mandatory: no posting until it's done
-- ---------------------------------------------------------------
drop policy if exists "users can insert their own posts" on posts;
drop policy if exists "onboarded users can insert their own posts" on posts;
create policy "onboarded users can insert their own posts" on posts
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.onboarding_completed_at is not null
    )
  );

-- ---------------------------------------------------------------
-- 7. Storage for profile + cover pictures (public read, owner-only write)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "profile-media read"   on storage.objects;
drop policy if exists "profile-media insert" on storage.objects;
drop policy if exists "profile-media update" on storage.objects;
drop policy if exists "profile-media delete" on storage.objects;

create policy "profile-media read" on storage.objects for select
  using (bucket_id = 'profile-media');
create policy "profile-media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile-media update" on storage.objects for update to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile-media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------
-- HOW YOU (the developer) change someone's badge or verify it:
--   update profiles set badge = 'pastor', badge_verified = true where id = '<user-uuid>';
-- Run it in the SQL Editor; the guard trigger lets the SQL editor through.
-- ---------------------------------------------------------------
