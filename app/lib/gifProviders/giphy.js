/**
 * GIPHY Provider for Shammah
 * Normalizes GIPHY API responses into standard shape:
 * { id, title, url, previewUrl, width, height, provider, attribution }
 */

const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

export function normalizeGiphyItem(item) {
  if (!item) return null;

  // Find optimal high-res url and lightweight preview
  const original = item.images?.original || {};
  const preview = item.images?.fixed_width_small || item.images?.fixed_width || item.images?.preview_gif || original;

  return {
    id: item.id || `giphy-${Math.random().toString(36).slice(2, 9)}`,
    title: item.title || 'Animated GIF',
    url: original.url || item.url || '',
    previewUrl: preview.url || original.url || '',
    width: parseInt(original.width, 10) || 300,
    height: parseInt(original.height, 10) || 200,
    provider: 'giphy',
    attribution: 'Powered by GIPHY',
  };
}

export async function fetchTrendingGiphy({ apiKey, limit = 24, offset = 0, rating = 'pg' }) {
  if (!apiKey) {
    return { configured: false, data: [], pagination: { total_count: 0, count: 0, offset: 0 } };
  }

  const endpoint = `${GIPHY_BASE_URL}/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=${rating}`;
  const res = await fetch(endpoint, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`GIPHY API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const items = Array.isArray(json.data) ? json.data.map(normalizeGiphyItem).filter(Boolean) : [];

  return {
    configured: true,
    data: items,
    pagination: json.pagination || { total_count: items.length, count: items.length, offset },
  };
}

export async function searchGiphy({ apiKey, query, limit = 24, offset = 0, rating = 'pg' }) {
  if (!apiKey) {
    return { configured: false, data: [], pagination: { total_count: 0, count: 0, offset: 0 } };
  }

  const endpoint = `${GIPHY_BASE_URL}/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=${rating}`;
  const res = await fetch(endpoint, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`GIPHY API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const items = Array.isArray(json.data) ? json.data.map(normalizeGiphyItem).filter(Boolean) : [];

  return {
    configured: true,
    data: items,
    pagination: json.pagination || { total_count: items.length, count: items.length, offset },
  };
}

export async function fetchCategoriesGiphy({ apiKey }) {
  if (!apiKey) {
    return {
      configured: false,
      categories: [
        'Amen',
        'Praise God',
        'Hallelujah',
        'Prayer',
        'Blessings',
        'Worship',
        'Faith',
        'Church',
        'Grace',
        'Love',
      ],
    };
  }

  try {
    const endpoint = `${GIPHY_BASE_URL}/categories?api_key=${apiKey}`;
    const res = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        return {
          configured: true,
          categories: json.data.map((c) => c.name).filter(Boolean),
        };
      }
    }
  } catch (_) {}

  return {
    configured: true,
    categories: [
      'Amen',
      'Praise God',
      'Hallelujah',
      'Prayer',
      'Blessings',
      'Worship',
      'Faith',
      'Church',
      'Grace',
      'Love',
    ],
  };
}
