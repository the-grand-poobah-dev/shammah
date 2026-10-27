-- Migration 013: Comment Media Support
-- Allows attaching photos, videos, and audio clips / voice notes to comments and replies

alter table public.comments
  add column if not exists media_url  text,
  add column if not exists media_type text
    check (media_type is null or media_type in ('image','video','audio'));

-- Make text_content nullable so users can post media-only comments (e.g. voice prayer or photo)
alter table public.comments
  alter column text_content drop not null;

-- Helper index for posts with media comments
create index if not exists comments_media_idx on public.comments (post_id) where media_url is not null;
