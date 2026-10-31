/**
 * Shammah Live Video Provider Interface
 * 
 * Default implementation uses LiveKit Cloud (livekit-client + livekit-server-sdk).
 * The provider interface abstracts video streaming so that alternative providers
 * (e.g., Agora, 100ms, Amazon IVS, WebRTC SFU) can replace it seamlessly.
 */

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

/**
 * Checks whether the live streaming provider is configured in environment variables.
 * @returns {boolean}
 */
export function isLiveConfigured() {
  const url = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  return Boolean(url && apiKey && apiSecret);
}

/**
 * Returns public provider configuration for clients.
 */
export function getLiveConfig() {
  const configured = isLiveConfigured();
  const url = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
  return {
    configured,
    provider: 'livekit',
    url: configured ? url : '',
  };
}

/**
 * Creates a publisher (host) token for a specific room.
 *
 * @param {string} roomName - Unique room name
 * @param {Object} hostUser - Host identity { id, name, avatar, role }
 * @param {Object} [metadata={}] - Optional custom metadata
 * @returns {Promise<{ token: string, url: string }>}
 */
export async function createHostToken(roomName, hostUser, metadata = {}) {
  if (!isLiveConfigured()) {
    throw new Error('Live streaming is not configured. Missing LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET.');
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const identity = String(hostUser?.id || hostUser?.sub || 'host-' + Date.now());
  const name = hostUser?.name || hostUser?.display_name || 'Broadcast Host';

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({
      role: 'host',
      avatar_url: hostUser?.avatar_url || null,
      ...metadata,
    }),
    ttl: '6h',
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return { token, url: livekitUrl };
}

/**
 * Creates a subscribe-only (viewer) token for a room.
 *
 * @param {string} roomName - Room to join as viewer
 * @param {Object} viewerUser - Viewer identity { id, name, avatar }
 * @returns {Promise<{ token: string, url: string }>}
 */
export async function createViewerToken(roomName, viewerUser) {
  if (!isLiveConfigured()) {
    throw new Error('Live streaming is not configured.');
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const identity = String(viewerUser?.id || `viewer-${Math.random().toString(36).substring(2, 9)}`);
  const name = viewerUser?.name || viewerUser?.display_name || 'Shammah Disciple';

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({
      role: 'viewer',
      avatar_url: viewerUser?.avatar_url || null,
    }),
    ttl: '4h',
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canPublishData: true, // for sending live reactions/chat data messages
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return { token, url: livekitUrl };
}

/**
 * Closes and terminates a live room on the media server.
 *
 * @param {string} roomName
 */
export async function closeRoom(roomName) {
  if (!isLiveConfigured()) return;
  try {
    const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    // Convert ws(s):// to http(s):// for RoomServiceClient if needed
    const httpUrl = livekitUrl.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:');
    const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    await svc.deleteRoom(roomName);
  } catch (err) {
    console.warn('[live provider] closeRoom error:', err?.message || err);
  }
}
