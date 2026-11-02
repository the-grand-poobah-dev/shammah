import * as giphy from './giphy';
import * as klipy from './klipy';

function activeProvider() {
  return (process.env.GIF_PROVIDER || 'giphy').trim().toLowerCase() === 'klipy' ? klipy : giphy;
}

export function trendingGifs(options) { return activeProvider().trendingGifs(options); }
export function searchGifs(query, options) { return activeProvider().searchGifs(query, options); }
export function gifCategories(options) { return activeProvider().gifCategories(options); }
