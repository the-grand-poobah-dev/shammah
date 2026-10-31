// Klipy API provider (optional alternative provider)
// Returns the exact same normalized shape as GIPHY:
// { id, title, url, previewUrl, width, height, provider: 'klipy', attribution: 'Powered by Klipy' }

const KLIPY_BASE = 'https://api.klipy.co/v1';

function normalizeKlipyItem(item) {
  if (!item) return null;
  return {
    id: String(item.id),
    title: item.title || 'GIF',
    url: item.gif_url || item.url,
    previewUrl: item.preview_url || item.gif_url || item.url,
    width: item.width || 300,
    height: item.height || 200,
    provider: 'klipy',
    attribution: 'Powered by Klipy',
  };
}

export async function fetchTrendingGifs({ limit = 20, offset = 0, apiKey } = {}) {
  const key = apiKey || process.env.KLIPY_API_KEY || process.env.GIPHY_API_KEY;
  if (!key) {
    throw new Error('Klipy / GIPHY API key not configured.');
  }

  const url = `${KLIPY_BASE}/gifs/trending?api_key=${key}&limit=${limit}&offset=${offset}&rating=pg`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Klipy API error: ${res.status}`);
  }

  const data = await res.json();
  const items = (data.data || data.results || []).map(normalizeKlipyItem).filter(Boolean);
  return {
    results: items,
    total: data.total || items.length,
    offset,
    hasMore: items.length >= limit,
    provider: 'klipy',
  };
}

export async function searchGifs({ query, limit = 20, offset = 0, apiKey } = {}) {
  const key = apiKey || process.env.KLIPY_API_KEY || process.env.GIPHY_API_KEY;
  if (!key) {
    throw new Error('Klipy / GIPHY API key not configured.');
  }

  const url = `${KLIPY_BASE}/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Klipy API error: ${res.status}`);
  }

  const data = await res.json();
  const items = (data.data || data.results || []).map(normalizeKlipyItem).filter(Boolean);
  return {
    results: items,
    total: data.total || items.length,
    offset,
    hasMore: items.length >= limit,
    provider: 'klipy',
  };
}

export async function fetchGifCategories() {
  return [
    { name: 'Amen & Praise', query: 'amen praise' },
    { name: 'Worship', query: 'worship' },
    { name: 'Joy & Happy', query: 'joy celebration' },
    { name: 'Blessings', query: 'blessed' },
    { name: 'Love', query: 'love' },
    { name: 'Prayer', query: 'praying' },
  ];
}
