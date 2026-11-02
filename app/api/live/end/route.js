import { countLiveParticipants, deleteLiveRoom, isLiveConfigured } from '../../../lib/live/provider';
import { getLiveServiceClient, getLiveUser, isUuid, liveJsonError, parseLiveJson } from '../../../lib/live/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getLiveUser(request);
  if (!user) return liveJsonError('Please sign in to end a broadcast.', 401);
  const body = await parseLiveJson(request);
  if (!isUuid(body?.streamId)) return liveJsonError('A valid stream ID is required.');
  const service = getLiveServiceClient();
  if (!service) return liveJsonError('Live server configuration is incomplete.', 503);

  try {
    const { data: stream, error } = await service.from('live_streams')
      .select('id, host_id, room_name, status, viewer_count, peak_viewers')
      .eq('id', body.streamId).maybeSingle();
    if (error) throw error;
    if (!stream) return liveJsonError('Broadcast not found.', 404);
    const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (stream.host_id !== user.id && !['platform_admin', 'admin'].includes(profile?.role)) {
      return liveJsonError('Only the host or a platform administrator can end this broadcast.', 403);
    }
    if (stream.status === 'ended') {
      if (isLiveConfigured()) await deleteLiveRoom(stream.room_name);
      return Response.json({ stream, alreadyEnded: true });
    }

    const participants = isLiveConfigured() ? await countLiveParticipants(stream.room_name) : 0;
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await service.from('live_streams').update({
      status: 'ended',
      ended_at: now,
      viewer_count: Math.max(0, participants - 1),
      peak_viewers: Math.max(stream.peak_viewers || 0, stream.viewer_count || 0, Math.max(0, participants - 1)),
      updated_at: now,
    }).eq('id', stream.id).select('*').single();
    if (updateError) throw updateError;
    if (isLiveConfigured()) await deleteLiveRoom(stream.room_name);
    return Response.json({ stream: updated });
  } catch (error) {
    console.error('[api/live/end]', error?.message || error);
    return liveJsonError('Could not end the broadcast. Please try again.', 500);
  }
}
