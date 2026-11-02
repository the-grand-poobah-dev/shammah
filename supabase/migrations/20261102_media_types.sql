-- Shared media-type support for posts, comments and 24-hour statuses.
-- Idempotent; run manually in Supabase SQL Editor.

do $$
declare
  target_table text;
  constraint_row record;
  allowed_types text;
  existing_types text[];
  legacy_type text;
begin
  foreach target_table in array array['posts','comments','statuses'] loop
    if to_regclass('public.' || target_table) is not null then
      execute format('alter table public.%I add column if not exists media_type text', target_table);
      execute format('alter table public.%I add column if not exists media_meta jsonb not null default %L::jsonb', target_table, '{}');

      -- Preserve any existing application-specific media_type values while adding
      -- the common values used by the current UI.
      execute format(
        'select coalesce(array_agg(distinct media_type) filter (where media_type is not null), ARRAY[]::text[]) from public.%I',
        target_table
      ) into existing_types;

      for constraint_row in
        select conname from pg_constraint
        where conrelid = to_regclass('public.' || target_table)
          and contype = 'c'
          and pg_get_constraintdef(oid) ilike '%media_type%'
      loop
        execute format('alter table public.%I drop constraint %I', target_table, constraint_row.conname);
      end loop;

      if target_table = 'posts' then
        allowed_types := '''image'',''video'',''audio'',''reel'',''podcast'',''gif'',''live''';
      else
        allowed_types := '''image'',''video'',''audio'',''gif'',''live''';
      end if;

      foreach legacy_type in array existing_types loop
        if target_table = 'posts' then
          if legacy_type <> all(array['image','video','audio','reel','podcast','gif','live']) then
            allowed_types := allowed_types || ',' || quote_literal(legacy_type);
          end if;
        else
          if legacy_type <> all(array['image','video','audio','gif','live']) then
            allowed_types := allowed_types || ',' || quote_literal(legacy_type);
          end if;
        end if;
      end loop;

      execute format(
        'alter table public.%I add constraint %I check (media_type is null or media_type in (%s))',
        target_table,
        target_table || '_media_type_check',
        allowed_types
      );
    end if;
  end loop;
end $$;
