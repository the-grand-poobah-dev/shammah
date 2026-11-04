begin;

create table if not exists public.bible_chapters (
  translation text not null,
  book_id text not null,
  chapter integer not null check (chapter > 0),
  verses jsonb not null default '[]'::jsonb,
  source text not null default 'bible-api.com',
  fetched_at timestamptz not null default now(),
  primary key (translation, book_id, chapter)
);
alter table public.bible_chapters enable row level security;
-- Remove legacy public write policies; chapter cache writes must stay server-side.
drop policy if exists "Allow chapter update" on public.bible_chapters;
drop policy if exists "Server and authenticated users can insert chapters" on public.bible_chapters;
drop policy if exists "Bible chapters are readable by everyone" on public.bible_chapters;
create policy "Bible chapters are readable by everyone" on public.bible_chapters for select to anon, authenticated using (true);
revoke insert, update, delete on public.bible_chapters from public, anon, authenticated;
grant select on public.bible_chapters to anon, authenticated, service_role;
grant insert, update, delete on public.bible_chapters to service_role;

create table if not exists public.bible_verses (
  id text primary key,
  translation text not null default 'KJV',
  book_id text not null,
  book_name text,
  chapter integer not null,
  verse integer not null,
  text text not null,
  heading text,
  fts tsvector
);
alter table public.bible_verses add column if not exists book_name text;
alter table public.bible_verses add column if not exists fts tsvector;
create index if not exists bible_verses_search_idx on public.bible_verses using gin (fts);
create index if not exists bible_verses_ref_idx on public.bible_verses (translation, book_id, chapter, verse);
-- The existing bible_verses.fts column is GENERATED ALWAYS on this project.
-- PostgreSQL maintains it from heading and text; do not write to it or add a trigger.
alter table public.bible_verses enable row level security;
-- Remove legacy public write policies; indexed verse text must stay server-side.
drop policy if exists "Allow insert to bible verses" on public.bible_verses;
drop policy if exists "Allow update to bible verses" on public.bible_verses;
drop policy if exists "Bible verses are readable by everyone" on public.bible_verses;
create policy "Bible verses are readable by everyone" on public.bible_verses for select to anon, authenticated using (true);
revoke insert, update, delete on public.bible_verses from anon, authenticated;
grant select on public.bible_verses to anon, authenticated, service_role;
grant insert, update, delete on public.bible_verses to service_role;

create table if not exists public.bible_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  translation text not null default 'KJV',
  book_id text not null,
  chapter integer not null check (chapter > 0),
  verse integer not null check (verse > 0),
  created_at timestamptz not null default now(),
  unique (user_id, translation, book_id, chapter, verse)
);
create table if not exists public.bible_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book text not null,
  translation text not null default 'KJV',
  book_id text,
  chapter integer not null check (chapter > 0),
  verse integer not null check (verse > 0),
  color text not null default 'gold' check (color in ('gold','aqua','emerald','rose','blue','green','pink','purple')),
  created_at timestamptz not null default now(),
  unique (user_id, book, chapter, verse)
);
alter table public.bible_highlights add column if not exists book text;
alter table public.bible_highlights add column if not exists book_id text;
alter table public.bible_highlights add column if not exists translation text not null default 'KJV';
alter table public.bible_highlights drop constraint if exists bible_highlights_color_check;
alter table public.bible_highlights add constraint bible_highlights_color_check check (color in ('gold','teal','aqua','emerald','rose','blue','green','pink','purple'));

create table if not exists public.bible_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  translation text not null default 'KJV',
  book_id text not null,
  chapter integer not null check (chapter > 0),
  verse_start integer,
  verse_end integer,
  body_md text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verse_start is null or verse_start > 0),
  check (verse_end is null or verse_end > 0),
  check (verse_start is null or verse_end is null or verse_end >= verse_start)
);
alter table public.bible_notes add column if not exists translation text not null default 'KJV';
alter table public.bible_notes add column if not exists book text;
alter table public.bible_notes add column if not exists book_id text;
alter table public.bible_notes add column if not exists verse_start integer;
alter table public.bible_notes add column if not exists verse_end integer;
alter table public.bible_notes add column if not exists verse integer;
alter table public.bible_notes add column if not exists title text;
alter table public.bible_notes add column if not exists content text not null default '';
alter table public.bible_notes add column if not exists speaker text;
alter table public.bible_notes add column if not exists church text;
alter table public.bible_notes add column if not exists tags text[] not null default '{}';
alter table public.bible_notes add column if not exists color text;
alter table public.bible_notes add column if not exists ref_range text;

create table if not exists public.reading_plans (
  id text primary key,
  title text not null,
  description text not null default '',
  days integer not null check (days > 0),
  kind text not null default 'devotional',
  accent text not null default '#0d9488',
  created_at timestamptz not null default now()
);
create table if not exists public.reading_plan_days (
  plan_id text not null references public.reading_plans(id) on delete cascade,
  day integer not null check (day > 0),
  refs jsonb not null default '[]'::jsonb,
  primary key (plan_id, day)
);
create table if not exists public.reading_plan_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.reading_plans(id) on delete cascade,
  day integer not null check (day > 0),
  completed_on date not null default current_date,
  primary key (user_id, plan_id, day)
);
create table if not exists public.verse_of_day (
  day date primary key,
  ref text not null,
  translation text not null default 'KJV',
  text text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.verse_of_day add column if not exists text text not null default '';

do $$
declare t text;
begin
  foreach t in array array['bible_bookmarks','bible_highlights','bible_notes','reading_plans','reading_plan_days','reading_plan_progress','verse_of_day'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists "Users manage their own Bible bookmarks" on public.bible_bookmarks;
create policy "Users manage their own Bible bookmarks" on public.bible_bookmarks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their own Bible highlights" on public.bible_highlights;
create policy "Users manage their own Bible highlights" on public.bible_highlights for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their own Bible notes" on public.bible_notes;
create policy "Users manage their own Bible notes" on public.bible_notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Reading plans are readable by everyone" on public.reading_plans;
create policy "Reading plans are readable by everyone" on public.reading_plans for select to anon, authenticated using (true);
drop policy if exists "Reading plan days are readable by everyone" on public.reading_plan_days;
create policy "Reading plan days are readable by everyone" on public.reading_plan_days for select to anon, authenticated using (true);
drop policy if exists "Users manage their own reading progress" on public.reading_plan_progress;
create policy "Users manage their own reading progress" on public.reading_plan_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Verse of day is readable by everyone" on public.verse_of_day;
create policy "Verse of day is readable by everyone" on public.verse_of_day for select to anon, authenticated using (true);

grant select on public.reading_plans, public.reading_plan_days, public.verse_of_day to anon, authenticated;
grant select, insert, update, delete on public.bible_bookmarks, public.bible_highlights, public.bible_notes, public.reading_plan_progress to authenticated;
grant all on public.reading_plans, public.reading_plan_days, public.verse_of_day to service_role;

commit;
