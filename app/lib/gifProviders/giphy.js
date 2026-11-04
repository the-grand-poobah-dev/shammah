const API_ROOT = 'https://api.giphy.com/v1';

function normalizeGif(item) {
  const original = item?.images?.original || {};
  const preview = item?.images?.fixed_width_small || item?.images?.preview_gif || item?.images?.downsized_small || original;
  return {
    id: String(item?.id || ''),
    title: String(item?.title || 'GIF').slice(0, 140),
    url: original.url || '',
    previewUrl: preview.webp || preview.url || original.url || '',
    width: Number(original.width || preview.width || 0),
    height: Number(original.height || preview.height || 0),
    provider: 'giphy',
    attribution: 'Powered by GIPHY',
  };
}

async function request(path, params = {}) {
  const apiKey = process.env.GIPHY_API_KEY?.trim();
  if (!apiKey) return { data: [], error: 'GIF search is not configured yet.' };
  const url = new URL(API_ROOT + path);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('rating', 'pg');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[giphy] provider returned status', response.status);
      return { data: [], error: 'GIF search is temporarily unavailable.' };
    }
    return { data: payload.data || [], error: null };
  } catch (error) {
    console.error('[giphy] request failed:', error?.message || error);
    return { data: [], error: 'GIF search is temporarily unavailable.' };
  }
}

export async function trendingGifs({ limit = 24, offset = 0 } = {}) {
  const result = await request('/gifs/trending', { limit, offset });
  return { ...result, data: result.data.map(normalizeGif).filter((item) => item.id && item.url) };
}

export async function searchGifs(query, { limit = 24, offset = 0 } = {}) {
  const result = await request('/gifs/search', { q: query, limit, offset });
  return { ...result, data: result.data.map(normalizeGif).filter((item) => item.id && item.url) };
}

export async function gifCategories({ limit = 24 } = {}) {
  const result = await request('/gifs/categories', { limit });
  return {
    ...result,
    data: result.data.map((item) => ({
      name: String(item.name || item.slug || '').slice(0, 60),
      gif: normalizeGif(item.gif || {}),
    })).filter((item) => item.name && item.gif.url),
  };
}
