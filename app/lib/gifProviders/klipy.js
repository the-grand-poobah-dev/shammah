/**
 * Klipy Provider (Optional secondary GIF provider)
 * Normalizes Klipy / partner GIF API responses into standard shape:
 * { id, title, url, previewUrl, width, height, provider: 'klipy', attribution }
 */

export function normalizeKlipyItem(item) {
  if (!item) return null;
  return {
    id: item.id || `klipy-${Math.random().toString(36).slice(2, 9)}`,
    title: item.title || 'Animated GIF',
    url: item.url || item.media?.gif?.url || '',
    previewUrl: item.preview_url || item.media?.tinygif?.url || item.url || '',
    width: item.width || 300,
    height: item.height || 200,
    provider: 'klipy',
    attribution: 'Powered by Klipy',
  };
}

export async function fetchTrendingKlipy({ apiKey, limit = 24, offset = 0 }) {
  if (!apiKey) {
    return { configured: false, data: [], pagination: { total_count: 0, count: 0, offset: 0 } };
  }
  // Standard partner fallback
  return {
    configured: true,
    data: [],
    pagination: { total_count: 0, count: 0, offset: 0 },
  };
}

export async function searchKlipy({ apiKey, query, limit = 24, offset = 0 }) {
  if (!apiKey) {
    return { configured: false, data: [], pagination: { total_count: 0, count: 0, offset: 0 } };
  }
  return {
    configured: true,
    data: [],
    pagination: { total_count: 0, count: 0, offset: 0 },
  };
}

export async function fetchCategoriesKlipy() {
  return {
    configured: false,
    categories: ['Amen', 'Praise', 'Prayer', 'Blessing', 'Worship'],
  };
}
