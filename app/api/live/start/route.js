import { randomUUID } from 'node:crypto';
import { createLiveRoom, createLiveToken, isLiveConfigured } from '../../../lib/live/provider';
import { getLiveServiceClient, getLiveUser, liveJsonError, parseLiveJson } from '../../../lib/live/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const user = await getLiveUser(request);
  if (!user) return liveJsonError('Please sign in to start a live broadcast.', 401);
  if (!isLiveConfigured()) return liveJsonError('Live is not configured yet. Add the LiveKit environment variables to enable broadcasts.', 503);

  const body = await parseLiveJson(request);
  if (!body) return liveJsonError('Invalid request body.');
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const visibility = ['public', 'followers', 'church', 'private'].includes(body.visibility) ? body.visibility : 'public';
  if (title.length < 1 || title.length > 140) return liveJsonError('Title must be between 1 and 140 characters.');
  if (description.length > 3000) return liveJsonError('Description must be 3,000 characters or fewer.');
  if (visibility === 'church' && !body.churchId) return liveJsonError('Choose a church before starting a church-only stream.');

  const service = getLiveServiceClient();
  if (!service) return liveJsonError('Live server configuration is incomplete.', 503);

  try {
    const [{ data: profile }, { count: recentStarts, error: countError }] = await Promise.all([
      service.from('profiles').select('id, badge_verified, role, church_id').eq('id', user.id).maybeSingle(),
      service.from('live_streams').select('id', { count: 'exact', head: true })
        .eq('host_id', user.id).gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()),
    ]);
    if (countError) throw countError;

    const minAgeDays = Math.min(365, Math.max(0, Number.parseInt(process.env.LIVE_MIN_ACCOUNT_AGE_DAYS || '7', 10) || 0));
    const ageMs = Date.now() - new Date(user.created_at || Date.now()).getTime();
    const isTrusted = Boolean(profile?.badge_verified) || ['platform_admin', 'church_admin'].includes(profile?.role);
    if (!isTrusted && ageMs < minAgeDays * 24 * 60 * 60 * 1000) {
      return liveJsonError('Your account must be at least ' + minAgeDays + ' days old or verified to start a live broadcast.', 403);
    }
    if ((recentStarts || 0) >= 3) return liveJsonError('You have started several broadcasts recently. Please wait a few minutes and try again.', 429);

    const churchId = visibility === 'church' ? (profile?.church_id || body.churchId) : (profile?.church_id || null);
    if (visibility === 'church' && profile?.church_id && body.churchId !== profile.church_id) {
      return liveJsonError('You can only start a church-only stream for your own church.', 403);
    }

    const roomName = 'shammah-' + user.id.slice(0, 8) + '-' + randomUUID();
    const room = await createLiveRoom(roomName);
    const { data: stream, error: insertError } = await service.from('live_streams').insert({
      host_id: user.id,
      church_id: churchId,
      title,
      description: description || null,
      thumb_url: null,
      status: 'live',
      room_name: roomName,
      visibility,
      started_at: new Date().toISOString(),
    }).select('id, title, description, status, visibility, started_at, room_name, host_id, church_id').single();

    if (insertError || !stream) {
      try { await (await import('../../../lib/live/provider')).deleteLiveRoom(roomName); } catch {}
      throw insertError || new Error('Could not create live stream record.');
    }

    const { token, url } = await createLiveToken({
      identity: user.id,
      name: profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Shammah host',
      roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return Response.json({ stream, token, url });
  } catch (error) {
    console.error('[api/live/start]', error?.message || error);
    return liveJsonError('Could not start the live broadcast. Please try again.', 500);
  }
}
