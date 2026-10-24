-- Shammah migration 002: fix "new row violates row-level security policy for table posts"
--
-- Cause: 001_onboarding.sql replaced the posts insert rule with one that requires
-- profiles.onboarding_completed_at to be set. The app never sets that column
-- (the wizard in the repo writes onboarded_at, and page.js doesn't show it yet),
-- so nobody could post.
--
-- This puts back the original rule: you can post as yourself. We'll tighten it again
-- once the wizard is wired into the app and existing users have been through it.

drop policy if exists "onboarded users can insert their own posts" on posts;
drop policy if exists "users can insert their own posts" on posts;
create policy "users can insert their own posts" on posts
  for insert with check (auth.uid() = author_id);

notify pgrst, 'reload schema';
