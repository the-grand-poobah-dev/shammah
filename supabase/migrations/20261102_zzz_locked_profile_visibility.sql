-- Enforce locked-profile visibility in the database, not only in UI rendering.
-- A locked profile's posts, media and statuses are visible to the owner and
-- accepted followers only, even when individual content rows say "public".
-- Apply after 20261102_zz_rpc_subject_scope_hardening.sql.

BEGIN;

DROP POLICY IF EXISTS "Enforce real post visibility on select" ON public.posts;
CREATE POLICY "Enforce real post visibility on select"
  ON public.posts
  FOR SELECT TO public
  USING (
    auth.uid() = author_id
    OR (
      EXISTS (
        SELECT 1
        FROM public.profiles AS author_profile
        WHERE author_profile.id = posts.author_id
          AND (
            NOT COALESCE(author_profile.is_locked, false)
            OR (
              auth.uid() IS NOT NULL
              AND public.is_following_user(auth.uid(), posts.author_id)
            )
          )
      )
      AND (
        visibility = 'public'
        OR (
          visibility = 'followers'
          AND auth.uid() IS NOT NULL
          AND public.is_following_user(auth.uid(), posts.author_id)
        )
        OR (
          visibility = 'church'
          AND auth.uid() IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles AS viewer
            WHERE viewer.id = auth.uid()
              AND viewer.church_id IS NOT NULL
              AND viewer.church_id = posts.church_id
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Read published media items" ON public.media_items;
CREATE POLICY "Read published media items"
  ON public.media_items
  FOR SELECT TO public
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS moderator
      WHERE moderator.id = auth.uid()
        AND (
          moderator.role = ANY (ARRAY['platform_admin', 'church_admin'])
          OR moderator.badge = ANY (ARRAY['lead_pastor', 'admin', 'moderator'])
        )
    )
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS author_profile
        WHERE author_profile.id = media_items.author_id
          AND (
            NOT COALESCE(author_profile.is_locked, false)
            OR (
              auth.uid() IS NOT NULL
              AND public.is_following_user(auth.uid(), media_items.author_id)
            )
          )
      )
      AND (
        visibility = 'public'
        OR (
          visibility = 'followers'
          AND auth.uid() IS NOT NULL
          AND public.is_following_user(auth.uid(), media_items.author_id)
        )
        OR (
          visibility = 'church'
          AND auth.uid() IS NOT NULL
          AND church_id IS NOT NULL
          AND public.is_active_church_member(auth.uid(), church_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Anon can read unexpired statuses" ON public.statuses;
DROP POLICY IF EXISTS "Anyone signed in can read unexpired statuses" ON public.statuses;
CREATE POLICY "Read unexpired statuses respecting locked profiles"
  ON public.statuses
  FOR SELECT TO anon, authenticated
  USING (
    expires_at > now()
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS status_owner
      WHERE status_owner.id = statuses.user_id
        AND (
          NOT COALESCE(status_owner.is_locked, false)
          OR auth.uid() = statuses.user_id
          OR (
            auth.uid() IS NOT NULL
            AND public.is_following_user(auth.uid(), statuses.user_id)
          )
        )
    )
  );

COMMIT;
