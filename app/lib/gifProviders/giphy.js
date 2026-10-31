// GIPHY API provider (server-side only)
// Uses GIPHY_API_KEY from environment variables.
// Tenor API was shut down on June 30, 2026, so GIPHY is the official primary provider.

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

function normalizeGiphyItem(item) {
  if (!item) return null;
  const original = item.images?.original || {};
  const preview = item.images?.fixed_width || item.images?.fixed_height || original;

  return {
    id: item.id,
    title: item.title || 'GIF',
    url: original.url || preview.url,
    previewUrl: preview.url || original.url,
    width: parseInt(original.width, 10) || parseInt(preview.width, 10) || 300,
    height: parseInt(original.height, 10) || parseInt(preview.height, 10) || 200,
    provider: 'giphy',
    attribution: 'Powered by GIPHY',
  };
}

export async function fetchTrendingGifs({ limit = 20, offset = 0, apiKey } = {}) {
  const key = apiKey || process.env.GIPHY_API_KEY;
  if (!key) {
    throw new Error('GIPHY_API_KEY is not configured on the server.');
  }

  const url = `${GIPHY_BASE}/trending?api_key=${key}&limit=${limit}&offset=${offset}&rating=pg`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`GIPHY API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const items = (data.data || []).map(normalizeGiphyItem).filter(Boolean);
  return {
    results: items,
    total: data.pagination?.total_count || items.length,
    offset: data.pagination?.offset || offset,
    hasMore: (data.pagination?.offset || 0) + items.length < (data.pagination?.total_count || 0),
    provider: 'giphy',
  };
}

export async function searchGifs({ query, limit = 20, offset = 0, apiKey } = {}) {
  const key = apiKey || process.env.GIPHY_API_KEY;
  if (!key) {
    throw new Error('GIPHY_API_KEY is not configured on the server.');
  }

  const url = `${GIPHY_BASE}/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`GIPHY API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const items = (data.data || []).map(normalizeGiphyItem).filter(Boolean);
  return {
    results: items,
    total: data.pagination?.total_count || items.length,
    offset: data.pagination?.offset || offset,
    hasMore: (data.pagination?.offset || 0) + items.length < (data.pagination?.total_count || 0),
    provider: 'giphy',
  };
}

export async function fetchGifCategories({ apiKey } = {}) {
  const key = apiKey || process.env.GIPHY_API_KEY;
  if (!key) {
    // Return curated faith & emotion categories if no key
    return [
      { name: 'Amen & Praise', query: 'amen praise' },
      { name: 'Worship', query: 'worship' },
      { name: 'Joy & Happy', query: 'joy celebration' },
      { name: 'Blessings', query: 'blessed' },
      { name: 'Love', query: 'christian love' },
      { name: 'Prayer', query: 'praying prayer' },
      { name: 'Hallelujah', query: 'hallelujah' },
      { name: 'Church', query: 'church sunday' },
    ];
  }

  try {
    const url = `${GIPHY_BASE}/categories?api_key=${key}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const cats = (data.data || []).slice(0, 12).map((c) => ({
        name: c.name,
        query: c.name_encoded || c.name,
      }));
      if (cats.length > 0) return cats;
    }
  } catch (err) {
    console.warn('Giphy categories fetch error, returning fallback categories:', err?.message);
  }

  return [
    { name: 'Praise & Amen', query: 'amen praise' },
    { name: 'Worship', query: 'worship' },
    { name: 'Celebration', query: 'joy celebration' },
    { name: 'Blessed', query: 'blessed' },
    { name: 'Prayer', query: 'praying' },
    { name: 'Love', query: 'love' },
    { name: 'Hallelujah', query: 'hallelujah' },
    { name: 'Fellowship', query: 'church community' },
  ];
}
