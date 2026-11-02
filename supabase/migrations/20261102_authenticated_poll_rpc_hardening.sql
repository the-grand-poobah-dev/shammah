-- Restrict poll mutation RPCs to signed-in users.
-- Both functions validate auth.uid() internally, but they do not need to be
-- exposed as callable anonymous endpoints. Keep authenticated client access.
revoke all on function public.cast_vote(uuid, uuid) from public, anon;
grant execute on function public.cast_vote(uuid, uuid) to authenticated;

revoke all on function public.close_poll_early(uuid) from public, anon;
grant execute on function public.close_poll_early(uuid) to authenticated;

notify pgrst, 'reload schema';
