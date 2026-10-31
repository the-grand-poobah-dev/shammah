import { NextResponse } from 'next/server';
import { getSupabaseAdmin, resolveUser, getUserProfile } from '../../../lib/live/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await resolveUser(req);
    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { streamId, action, messageId, targetUserId, reason } = body;

    if (!streamId || !action) {
      return NextResponse.json(
        { ok: false, error: 'streamId and action are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const profile = await getUserProfile(user.id);

    // 1. Verify stream & moderator authority
    const { data: stream } = await supabase
      .from('live_streams')
      .select('id, host_id')
      .eq('id', streamId)
      .maybeSingle();

    if (!stream) {
      return NextResponse.json({ ok: false, error: 'Stream not found.' }, { status: 404 });
    }

    const isHost = stream.host_id === user.id;
    const isAdmin = ['admin', 'superadmin', 'pastor'].includes(String(profile?.role || '').toLowerCase());

    let isModerator = isHost || isAdmin;
    if (!isModerator) {
      const { data: mod } = await supabase
        .from('live_moderators')
        .select('stream_id')
        .eq('stream_id', streamId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (mod) isModerator = true;
    }

    if (!isModerator) {
      return NextResponse.json(
        { ok: false, error: 'Moderation privileges required.' },
        { status: 403 }
      );
    }

    // 2. Execute Action
    if (action === 'pin_message' || action === 'pin') {
      if (!messageId) return NextResponse.json({ ok: false, error: 'messageId required' }, { status: 400 });
      // Unpin any previously pinned message in this stream
      await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false })
        .eq('stream_id', streamId);

      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_pinned: true })
        .eq('id', messageId)
        .eq('stream_id', streamId);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: 'pinned', messageId });
    }

    if (action === 'unpin_message' || action === 'unpin') {
      if (!messageId) return NextResponse.json({ ok: false, error: 'messageId required' }, { status: 400 });
      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false })
        .eq('id', messageId)
        .eq('stream_id', streamId);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: 'unpinned', messageId });
    }

    if (action === 'delete_message' || action === 'delete') {
      if (!messageId) return NextResponse.json({ ok: false, error: 'messageId required' }, { status: 400 });
      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('stream_id', streamId);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: 'deleted', messageId });
    }

    if (action === 'ban_user' || action === 'ban') {
      if (!targetUserId) return NextResponse.json({ ok: false, error: 'targetUserId required' }, { status: 400 });
      if (targetUserId === stream.host_id) {
        return NextResponse.json({ ok: false, error: 'Cannot ban the host.' }, { status: 400 });
      }

      const { error } = await supabase.from('live_bans').upsert({
        stream_id: streamId,
        user_id: targetUserId,
        reason: reason || 'Inappropriate conduct in live chat',
        banned_at: new Date().toISOString(),
      });

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      // Soft-delete user's messages in this stream
      await supabase
        .from('live_chat_messages')
        .update({ is_deleted: true })
        .eq('stream_id', streamId)
        .eq('user_id', targetUserId);

      return NextResponse.json({ ok: true, action: 'banned', targetUserId });
    }

    if (action === 'unban_user' || action === 'unban') {
      if (!targetUserId) return NextResponse.json({ ok: false, error: 'targetUserId required' }, { status: 400 });
      const { error } = await supabase
        .from('live_bans')
        .delete()
        .eq('stream_id', streamId)
        .eq('user_id', targetUserId);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: 'unbanned', targetUserId });
    }

    return NextResponse.json({ ok: false, error: `Unknown moderation action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[live/moderate] error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
