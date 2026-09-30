-- ============================================================
-- Shammah migration 010: Pinned Posts (Community Announcements)
-- Allows admins to pin important announcements to the top of the feed
-- ============================================================

alter table posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz;

-- Composite index so feed queries with pinned-first sorting remain blazing fast
create index if not exists posts_pinned_created_idx
  on posts (is_pinned desc, created_at desc);

-- Allow authenticated users to view posts (existing policy)
-- Update RLS policy so platform_admin and church_admin can update pin status
drop policy if exists "admins can pin and unpin posts" on posts;
create policy "admins can pin and unpin posts" on posts
  for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('platform_admin', 'church_admin')
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('platform_admin', 'church_admin')
    )
  );

notify pgrst, 'reload schema';
