-- Keep poll result aggregation consistent with post visibility and
-- hide-results-until-vote settings. SECURITY DEFINER is retained so callers
-- receive aggregate counts without gaining direct access to other members' votes.

BEGIN;

CREATE OR REPLACE FUNCTION public.poll_results(p_post_ids uuid[])
RETURNS TABLE(post_id uuid, option_id uuid, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    COALESCE(pv.post_id, po.post_id) AS post_id,
    pv.option_id,
    COUNT(*)::bigint AS votes
  FROM public.poll_votes AS pv
  LEFT JOIN public.poll_options AS po ON po.id = pv.option_id
  JOIN public.posts AS p ON p.id = COALESCE(pv.post_id, po.post_id)
  WHERE COALESCE(pv.post_id, po.post_id) = ANY(p_post_ids)
    AND (
      auth.uid() = p.author_id
      OR (
        EXISTS (
          SELECT 1
          FROM public.profiles AS author_profile
          WHERE author_profile.id = p.author_id
            AND (
              NOT COALESCE(author_profile.is_locked, false)
              OR (
                auth.uid() IS NOT NULL
                AND public.is_following_user(auth.uid(), p.author_id)
              )
            )
        )
        AND (
          p.visibility = 'public'
          OR (
            p.visibility = 'followers'
            AND auth.uid() IS NOT NULL
            AND public.is_following_user(auth.uid(), p.author_id)
          )
          OR (
            p.visibility = 'church'
            AND auth.uid() IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.profiles AS viewer
              WHERE viewer.id = auth.uid()
                AND viewer.church_id IS NOT NULL
                AND viewer.church_id = p.church_id
            )
          )
        )
      )
    )
    AND (
      NOT (COALESCE(p.hide_results_until_vote, false) OR COALESCE(p.reveal_results_after_voting, false))
      OR auth.uid() = p.author_id
      OR p.poll_closed_at IS NOT NULL
      OR COALESCE(p.poll_closed_early, false)
      OR (p.poll_expires_at IS NOT NULL AND p.poll_expires_at <= now())
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.poll_votes AS own_vote
          WHERE own_vote.post_id = p.id
            AND own_vote.voter_id = auth.uid()
        )
      )
    )
  GROUP BY COALESCE(pv.post_id, po.post_id), pv.option_id;
$function$;

REVOKE ALL ON FUNCTION public.poll_results(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.poll_results(uuid[]) TO anon, authenticated;

COMMIT;
