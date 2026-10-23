import assert from 'node:assert/strict';

function getOrdinalSuffix(day) {
  const d = Math.abs(Number(day)) || 0;
  const mod100 = d % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }
  const mod10 = d % 10;
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

function formatFullDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const suffix = getOrdinalSuffix(day);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${weekday}, ${day}${suffix} ${month}, ${year}`;
}

function formatPostDate(iso, now = Date.now()) {
  if (!iso) return '';
  const thenDate = iso instanceof Date ? iso : new Date(iso);
  const then = thenDate.getTime();
  if (Number.isNaN(then)) return '';

  const nowMs = typeof now === 'number' ? now : (now instanceof Date ? now.getTime() : new Date(now).getTime());
  const diffMs = nowMs - then;

  // Clock skew (future timestamp) or under 1 minute
  if (diffMs < 60000) {
    return 'Just now';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  return formatFullDate(thenDate);
}

// 1. Test ordinals 1 to 31
const expectedOrdinals = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th',
  10: '10th', 11: '11th', 12: '12th', 13: '13th', 14: '14th',
  20: '20th', 21: '21st', 22: '22nd', 23: '23rd', 24: '24th',
  30: '30th', 31: '31st'
};

for (const [day, expected] of Object.entries(expectedOrdinals)) {
  const actual = `${day}${getOrdinalSuffix(Number(day))}`;
  assert.equal(actual, expected, `Ordinal mismatch for day ${day}: expected ${expected}, got ${actual}`);
}

// 2. Relative time tests
const fixedNow = new Date('2026-10-23T14:30:00.000Z').getTime();

// Future (clock skew)
assert.equal(formatPostDate(new Date(fixedNow + 15000), fixedNow), 'Just now');
assert.equal(formatPostDate(new Date(fixedNow + 120000), fixedNow), 'Just now');

// Under 1 min
assert.equal(formatPostDate(new Date(fixedNow), fixedNow), 'Just now');
assert.equal(formatPostDate(new Date(fixedNow - 30000), fixedNow), 'Just now');
assert.equal(formatPostDate(new Date(fixedNow - 59000), fixedNow), 'Just now');

// 1 - 59 minutes
assert.equal(formatPostDate(new Date(fixedNow - 60000), fixedNow), '1 minute ago');
assert.equal(formatPostDate(new Date(fixedNow - 120000), fixedNow), '2 minutes ago');
assert.equal(formatPostDate(new Date(fixedNow - 300000), fixedNow), '5 minutes ago');
assert.equal(formatPostDate(new Date(fixedNow - 59 * 60000), fixedNow), '59 minutes ago');

// 1 - 23 hours
assert.equal(formatPostDate(new Date(fixedNow - 60 * 60000), fixedNow), '1 hour ago');
assert.equal(formatPostDate(new Date(fixedNow - 7 * 3600000), fixedNow), '7 hours ago');
assert.equal(formatPostDate(new Date(fixedNow - 23 * 3600000 - 59 * 60000), fixedNow), '23 hours ago');

// 24 hours or more
const date24h = new Date(fixedNow - 24 * 3600000);
const fullDate24h = formatPostDate(date24h, fixedNow);
console.log('24h ago formatted:', fullDate24h);
assert.match(fullDate24h, /^[A-Z][a-z]+, \d+(?:st|nd|rd|th) [A-Z][a-z]+, \d{4}$/);

// Explicit date tests with fixed local components
const sampleOct23 = new Date(2026, 9, 23, 12, 0, 0); // Oct 23 2026 local
assert.equal(formatFullDate(sampleOct23), 'Friday, 23rd Oct, 2026');

const sampleOct1 = new Date(2026, 9, 1, 12, 0, 0); // Oct 1 2026
assert.equal(formatFullDate(sampleOct1), 'Thursday, 1st Oct, 2026');

const sampleOct2 = new Date(2026, 9, 2, 12, 0, 0); // Oct 2 2026
assert.equal(formatFullDate(sampleOct2), 'Friday, 2nd Oct, 2026');

const sampleOct3 = new Date(2026, 9, 3, 12, 0, 0); // Oct 3 2026
assert.equal(formatFullDate(sampleOct3), 'Saturday, 3rd Oct, 2026');

const sampleOct11 = new Date(2026, 9, 11, 12, 0, 0); // Oct 11 2026
assert.equal(formatFullDate(sampleOct11), 'Sunday, 11th Oct, 2026');

const sampleOct21 = new Date(2026, 9, 21, 12, 0, 0); // Oct 21 2026
assert.equal(formatFullDate(sampleOct21), 'Wednesday, 21st Oct, 2026');

const sampleOct31 = new Date(2026, 9, 31, 12, 0, 0); // Oct 31 2026
assert.equal(formatFullDate(sampleOct31), 'Saturday, 31st Oct, 2026');

console.log('All date formatter unit tests passed successfully!');
