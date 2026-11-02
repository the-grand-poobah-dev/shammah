import { removeLiveParticipant } from '../../../lib/live/provider';
import { getLiveServiceClient, getLiveUser, isUuid, liveJsonError, parseLiveJson } from '../../../lib/live/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getLiveUser(request);
  if (!user) return liveJsonError('Please sign in to moderate live chat.', 401);
  const body = await parseLiveJson(request);
  if (!isUuid(body?.streamId) || !['pin', 'delete', 'ban'].includes(body?.action)) {
    return liveJsonError('A valid stream and moderation action are required.');
  }
  const service = getLiveServiceClient();
  if (!service) return liveJsonError('Live server configuration is incomplete.', 503);

  try {
    const { data: stream, error: streamError } = await service.from('live_streams')
      .select('id, host_id, room_name').eq('id', body.streamId).maybeSingle();
    if (streamError) throw streamError;
    if (!stream) return liveJsonError('Broadcast not found.', 404);
    const { data: moderator } = await service.from('live_moderators').select('user_id')
      .eq('stream_id', stream.id).eq('user_id', user.id).maybeSingle();
    if (stream.host_id !== user.id && !moderator) {
      return liveJsonError('Only the host or an assigned moderator can do this.', 403);
    }

    if (body.action === 'ban') {
      if (!isUuid(body.userId) || body.userId === stream.host_id) return liveJsonError('A valid viewer ID is required.');
      const { error } = await service.from('live_bans').upsert({
        stream_id: stream.id, user_id: body.userId, created_by: user.id,
      }, { onConflict: 'stream_id,user_id' });
      if (error) throw error;
      await removeLiveParticipant(stream.room_name, body.userId);
      return Response.json({ ok: true });
    }

    if (!isUuid(body.messageId)) return liveJsonError('A valid chat message ID is required.');
    if (body.action === 'pin') {
      const { error: clearError } = await service.from('live_chat_messages')
        .update({ is_pinned: false }).eq('stream_id', stream.id);
      if (clearError) throw clearError;
      const { error } = await service.from('live_chat_messages')
        .update({ is_pinned: true }).eq('stream_id', stream.id).eq('id', body.messageId);
      if (error) throw error;
    } else {
      const { error } = await service.from('live_chat_messages')
        .update({ is_deleted: true }).eq('stream_id', stream.id).eq('id', body.messageId);
      if (error) throw error;
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[api/live/moderate]', error?.message || error);
    return liveJsonError('Could not moderate this message. Please try again.', 500);
  }
}
