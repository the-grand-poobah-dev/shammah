// Optional adapter placeholder. GIPHY is the default provider; this adapter
// deliberately fails closed until a KLIPY_API_KEY and verified API contract exist.
export async function trendingGifs() {
  return { data: [], error: 'Klipy is not configured. Set GIF_PROVIDER=giphy or configure a supported provider.' };
}
export async function searchGifs() {
  return { data: [], error: 'Klipy is not configured. Set GIF_PROVIDER=giphy or configure a supported provider.' };
}
export async function gifCategories() {
  return { data: [], error: 'Klipy is not configured. Set GIF_PROVIDER=giphy or configure a supported provider.' };
}
