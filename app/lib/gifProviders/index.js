/**
 * GIF Provider Aggregator & Dispatcher
 * Selects active provider via process.env.GIF_PROVIDER (default: 'giphy').
 */

import * as giphy from './giphy';
import * as klipy from './klipy';

export function getProviderName() {
  const envVal = (process.env.GIF_PROVIDER || 'giphy').toLowerCase().trim();
  if (envVal === 'klipy') return 'klipy';
  return 'giphy';
}

export function getProvider() {
  const name = getProviderName();
  if (name === 'klipy') return klipy;
  return giphy;
}

export async function getTrendingGifs({ limit = 24, offset = 0 } = {}) {
  const providerName = getProviderName();
  if (providerName === 'klipy') {
    return klipy.fetchTrendingKlipy({
      apiKey: process.env.KLIPY_API_KEY,
      limit,
      offset,
    });
  }

  return giphy.fetchTrendingGiphy({
    apiKey: process.env.GIPHY_API_KEY,
    limit,
    offset,
    rating: 'pg',
  });
}

export async function searchGifs({ query, limit = 24, offset = 0 } = {}) {
  const providerName = getProviderName();
  if (providerName === 'klipy') {
    return klipy.searchKlipy({
      apiKey: process.env.KLIPY_API_KEY,
      query,
      limit,
      offset,
    });
  }

  return giphy.searchGiphy({
    apiKey: process.env.GIPHY_API_KEY,
    query,
    limit,
    offset,
    rating: 'pg',
  });
}

export async function getGifCategories() {
  const providerName = getProviderName();
  if (providerName === 'klipy') {
    return klipy.fetchCategoriesKlipy();
  }

  return giphy.fetchCategoriesGiphy({
    apiKey: process.env.GIPHY_API_KEY,
  });
}
