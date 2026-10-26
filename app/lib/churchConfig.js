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

// Google Workspace Church Plan (KES 7,000 / month)
export const WORKSPACE_PLAN_KEY = 'workspace_premium';
export const WORKSPACE_PLAN_PRICE_KES = 7000;
export const WORKSPACE_PLAN_LABEL = 'Workspace Premium Plan';
export const WORKSPACE_PLAN_DESCRIPTION =
  'Unlocks church creation and administration of Google Workspace tools: Google Forms, Google Calendar events, Google Meet rooms, Google Classroom courses, Google Drive/Docs/Sheets/Slides, Tasks, and Chat spaces.';

export function formatKes(amount) {
  return `KES ${Number(amount || 0).toLocaleString('en-KE')}`;
}

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

const BRANCHES_STORAGE_KEY = 'shammah_church_branches_v1';

export function getInstitutionBranch(churchId) {
  if (typeof window === 'undefined' || !churchId) return null;
  try {
    const raw = localStorage.getItem(BRANCHES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[churchId] || null;
  } catch {
    return null;
  }
}

export function saveInstitutionBranch(churchId, branchName) {
  if (typeof window === 'undefined' || !churchId) return;
  try {
    const raw = localStorage.getItem(BRANCHES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (branchName && branchName.trim()) {
      map[churchId] = branchName.trim();
    } else {
      delete map[churchId];
    }
    localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}
