-- Remove old broad SELECT policies that expose per-user Arcade progress and
-- private live moderator assignments. Keep owner/host-scoped policies.
begin;

drop policy if exists "Public can view arcade progress" on public.arcade_progress;
drop policy if exists "Public can view arcade achievements" on public.arcade_achievements;
revoke select on table public.arcade_progress, public.arcade_achievements
  from public, anon, authenticated;
grant select on table public.arcade_progress, public.arcade_achievements
  to authenticated;

drop policy if exists "Anyone can view live moderators" on public.live_moderators;
revoke select on table public.live_moderators from public, anon, authenticated;
grant select on table public.live_moderators to authenticated;

commit;
