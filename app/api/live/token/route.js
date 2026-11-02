import { createLiveToken, isLiveConfigured } from '../../../lib/live/provider';
import { getLiveServiceClient, getLiveUser, isUuid, liveJsonError, parseLiveJson } from '../../../lib/live/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getLiveUser(request);
  if (!user) return liveJsonError('Please sign in to join a live broadcast.', 401);
  if (!isLiveConfigured()) return liveJsonError('Live is not configured yet.', 503);
  const body = await parseLiveJson(request);
  if (!isUuid(body?.streamId)) return liveJsonError('A valid stream ID is required.');
  const service = getLiveServiceClient();
  if (!service) return liveJsonError('Live server configuration is incomplete.', 503);

  try {
    const { data: stream, error } = await service.from('live_streams')
      .select('id, host_id, church_id, title, room_name, visibility, status')
      .eq('id', body.streamId).maybeSingle();
    if (error) throw error;
    if (!stream || stream.status !== 'live') return liveJsonError('This broadcast is no longer live.', 404);

    let allowed = stream.host_id === user.id || stream.visibility === 'public';
    if (!allowed && stream.visibility === 'followers') {
      const { data } = await service.from('follows').select('follower_id')
        .eq('follower_id', user.id).eq('following_id', stream.host_id).maybeSingle();
      allowed = Boolean(data);
    }
    if (!allowed && stream.visibility === 'church' && stream.church_id) {
      const { data } = await service.from('profiles').select('church_id').eq('id', user.id).maybeSingle();
      allowed = data?.church_id === stream.church_id;
    }
    if (!allowed) return liveJsonError('You do not have permission to watch this broadcast.', 403);

    const { token, url } = await createLiveToken({
      identity: user.id,
      name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Shammah viewer',
      roomName: stream.room_name,
      canPublish: false,
      canSubscribe: true,
    });
    return Response.json({ stream: { id: stream.id, title: stream.title, host_id: stream.host_id }, token, url });
  } catch (error) {
    console.error('[api/live/token]', error?.message || error);
    return liveJsonError('Could not join this broadcast. Please try again.', 500);
  }
}
