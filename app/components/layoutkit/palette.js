/**
 * Shammah Layout Kit - Palette & Accent Mapping
 * 
 * Provides stable, deterministic color accents for categories, tags, churches,
 * and media items across section pages.
 * 
 * Accents:
 *  - #06b6d4 (Cyan / Water)
 *  - #10b981 (Emerald / Life)
 *  - #ec4899 (Pink / Joy)
 *  - #f59e0b (Amber / Gold)
 *  - #8b5cf6 (Purple / Royalty)
 *  - #0ea5e9 (Sky / Faith)
 *  - #f97316 (Orange / Fire)
 *  - #0d9488 (Teal / Shammah Brand)
 *  - #be123c (Rose / Sacrifice)
 */

export const ACCENT_PALETTE = [
  '#06b6d4',
  '#10b981',
  '#ec4899',
  '#f59e0b',
  '#8b5cf6',
  '#0ea5e9',
  '#f97316',
  '#0d9488',
  '#be123c',
];

/**
 * Maps any string key (category, uuid, tag, ID) to a stable accent from ACCENT_PALETTE.
 * Uses a deterministic string hash (djb2) so the same key always yields the same color.
 * 
 * @param {string|number|null|undefined} key 
 * @returns {string} Hex color string
 */
export function accentFor(key) {
  if (!key) return ACCENT_PALETTE[0];
  const str = String(key);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index];
}
