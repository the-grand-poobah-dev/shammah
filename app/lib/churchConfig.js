// Church page settings. Add or rename denominations here — no database change needed.
export const DENOMINATIONS = [
  'Anglican',
  'Baptist',
  'Catholic',
  'Lutheran',
  'Methodist',
  'Non-denominational',
  'Orthodox',
  'Pentecostal',
  'Presbyterian',
  'Seventh-day Adventist',
  'Other',
];

export const DESCRIPTION_MAX = 500;

// The church columns the church pages load
export const CHURCH_FIELDS =
  'id, name, description, denomination, logo_url, cover_url, location_label, location_place_id, location_lat, location_lng, website, created_by, subscription_status, created_at';

// Accepts "mychurch.org" or "https://mychurch.org"; returns a clean https URL or '' if unusable
export function cleanWebsite(raw) {
  const v = (raw || '').trim();
  if (!v) return '';
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null; // null = invalid (different from '' = empty)
  }
}
