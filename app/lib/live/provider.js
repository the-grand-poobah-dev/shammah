import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

function getLiveKitConfig() {
  const rawUrl = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!rawUrl || !apiKey || !apiSecret) return null;
  const httpUrl = rawUrl.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/$/, '');
  if (!/^https?:\/\//i.test(httpUrl)) return null;
  return { httpUrl, apiKey, apiSecret, clientUrl: rawUrl };
}

export function isLiveConfigured() {
  return Boolean(getLiveKitConfig());
}

function roomService(config) {
  return new RoomServiceClient(config.httpUrl, config.apiKey, config.apiSecret);
}

export async function createLiveRoom(roomName) {
  const config = getLiveKitConfig();
  if (!config) throw new Error('Live is not configured yet.');
  await roomService(config).createRoom({
    name: roomName,
    emptyTimeout: 90,
    maxParticipants: 1000,
    metadata: JSON.stringify({ product: 'shammah-live' }),
  });
  return { url: config.clientUrl };
}

export async function deleteLiveRoom(roomName) {
  const config = getLiveKitConfig();
  if (!config) return;
  try { await roomService(config).deleteRoom(roomName); } catch {}
}

export async function removeLiveParticipant(roomName, identity) {
  const config = getLiveKitConfig();
  if (!config) return;
  try { await roomService(config).removeParticipant(roomName, String(identity)); } catch {}
}

export async function countLiveParticipants(roomName) {
  const config = getLiveKitConfig();
  if (!config) return 0;
  try {
    const participants = await roomService(config).listParticipants(roomName);
    return Array.isArray(participants) ? participants.length : 0;
  } catch {
    return 0;
  }
}

export async function createLiveToken({ identity, name, roomName, canPublish, canSubscribe = true, ttl = '1h' }) {
  const config = getLiveKitConfig();
  if (!config) throw new Error('Live is not configured yet.');
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: String(identity),
    name: String(name || 'Shammah member').slice(0, 80),
    ttl,
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: Boolean(canPublish),
    canSubscribe: Boolean(canSubscribe),
    canPublishData: Boolean(canPublish),
  });
  return { token: await token.toJwt(), url: config.clientUrl };
}
