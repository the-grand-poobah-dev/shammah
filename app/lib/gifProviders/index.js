// Provider-agnostic GIF aggregator layer
// Selected by env GIF_PROVIDER (default 'giphy')
// Supports 'giphy' and 'klipy'. Note: Tenor shut down on June 30, 2026.

import * as giphyProvider from './giphy';
import * as klipyProvider from './klipy';

export function getActiveGifProvider() {
  const chosen = (process.env.GIF_PROVIDER || 'giphy').toLowerCase();
  if (chosen === 'klipy') {
    return klipyProvider;
  }
  return giphyProvider;
}

export async function getTrendingGifs(options = {}) {
  const provider = getActiveGifProvider();
  return provider.fetchTrendingGifs(options);
}

export async function searchGifs(options = {}) {
  const provider = getActiveGifProvider();
  return provider.searchGifs(options);
}

export async function getGifCategories(options = {}) {
  const provider = getActiveGifProvider();
  return provider.fetchGifCategories(options);
}
