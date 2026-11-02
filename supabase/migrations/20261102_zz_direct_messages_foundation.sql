-- Shammah direct-message foundation.
-- Apply after 20261102_profile_column_privacy_hardening.sql so the private
-- inbox-preference column and can_receive_direct_message(uuid) RPC exist.
-- This migration creates the table/RPCs expected by app/lib/inboxManager.js.

BEGIN;

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL CHECK (
    char_length(btrim(text_content)) BETWEEN 1 AND 10000
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT direct_messages_no_self_message CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS direct_messages_sender_created_idx
  ON public.direct_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_created_idx
  ON public.direct_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_unread_idx
  ON public.direct_messages (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "direct messages participants can read" ON public.direct_messages;
CREATE POLICY "direct messages participants can read"
  ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "senders can send allowed direct messages" ON public.direct_messages;
CREATE POLICY "senders can send allowed direct messages"
  ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() <> recipient_id
    AND public.can_receive_direct_message(recipient_id)
  );

DROP POLICY IF EXISTS "recipients can mark direct messages read" ON public.direct_messages;
CREATE POLICY "recipients can mark direct messages read"
  ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

REVOKE ALL PRIVILEGES ON TABLE public.direct_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.direct_messages TO authenticated;
-- The client may change only read_at, not message content or participant IDs.
GRANT UPDATE (read_at) ON TABLE public.direct_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid)
RETURNS TABLE (
  conversation_id text,
  participant_id uuid,
  participant_name text,
  participant_avatar text,
  participant_badge text,
  participant_verified boolean,
  participant_role text,
  last_message text,
  last_message_time timestamptz,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $conversations$
  WITH messages_for_user AS (
    SELECT
      dm.*,
      CASE WHEN dm.sender_id = p_user_id
        THEN dm.recipient_id ELSE dm.sender_id
      END AS other_user_id
    FROM public.direct_messages AS dm
    WHERE auth.uid() = p_user_id
      AND (dm.sender_id = p_user_id OR dm.recipient_id = p_user_id)
  ),
  latest AS (
    SELECT DISTINCT ON (m.other_user_id)
      m.other_user_id,
      m.text_content,
      m.created_at,
      m.id
    FROM messages_for_user AS m
    ORDER BY m.other_user_id, m.created_at DESC, m.id DESC
  ),
  unread AS (
    SELECT dm.sender_id AS other_user_id, count(*) AS unread_count
    FROM public.direct_messages AS dm
    WHERE auth.uid() = p_user_id
      AND dm.recipient_id = p_user_id
      AND dm.read_at IS NULL
    GROUP BY dm.sender_id
  )
  SELECT
    l.other_user_id::text,
    l.other_user_id,
    COALESCE(p.display_name, 'Member'),
    p.avatar_url,
    p.badge,
    COALESCE(p.badge_verified, false),
    COALESCE(p.role, 'member'),
    l.text_content,
    l.created_at,
    COALESCE(u.unread_count, 0)
  FROM latest AS l
  JOIN public.profiles AS p ON p.id = l.other_user_id
  LEFT JOIN unread AS u ON u.other_user_id = l.other_user_id
  ORDER BY l.created_at DESC;
$conversations$;

CREATE OR REPLACE FUNCTION public.total_unread_messages_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $unread_count$
  SELECT CASE
    WHEN auth.uid() IS NULL OR auth.uid() <> p_user_id THEN 0::bigint
    ELSE (
      SELECT count(*)::bigint
      FROM public.direct_messages AS dm
      WHERE dm.recipient_id = p_user_id
        AND dm.read_at IS NULL
    )
  END;
$unread_count$;

REVOKE ALL ON FUNCTION public.get_user_conversations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.total_unread_messages_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.total_unread_messages_count(uuid) TO authenticated;

-- Enable Supabase Realtime delivery if the standard publication exists.
DO $realtime$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'direct_messages'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages';
  END IF;
END;
$realtime$;

NOTIFY pgrst, 'reload schema';

COMMIT;
