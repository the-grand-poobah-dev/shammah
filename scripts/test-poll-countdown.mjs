import assert from 'node:assert';
import { formatPollTimeRemaining } from '../app/lib/useNow.js';

console.log('Testing formatPollTimeRemaining...');

const now = Date.now();

// 1. Missing / null expiration -> returns null (never invent a duration)
assert.strictEqual(formatPollTimeRemaining(null, now), null, 'null expires_at should return null');
assert.strictEqual(formatPollTimeRemaining(undefined, now), null, 'undefined expires_at should return null');

// 2. Poll closed (at zero or past) -> returns isClosed: true and label: "Poll Closed"
assert.strictEqual(formatPollTimeRemaining(new Date(now).toISOString(), now).isClosed, true);
assert.strictEqual(formatPollTimeRemaining(new Date(now).toISOString(), now).label, 'Poll Closed');
assert.strictEqual(formatPollTimeRemaining(new Date(now - 1000).toISOString(), now).isClosed, true);
assert.strictEqual(formatPollTimeRemaining(new Date(now - 1000).toISOString(), now).label, 'Poll Closed');
assert.strictEqual(formatPollTimeRemaining(new Date(now - 3600000).toISOString(), now).isClosed, true);
assert.strictEqual(formatPollTimeRemaining(new Date(now - 3600000).toISOString(), now).label, 'Poll Closed');

// 3. Exact formatting per specification:
// "45s left"
const in45s = new Date(now + 45 * 1000).toISOString();
assert.strictEqual(formatPollTimeRemaining(in45s, now).label, '45s left');

// "12m left"
const in12m = new Date(now + 12 * 60 * 1000).toISOString();
assert.strictEqual(formatPollTimeRemaining(in12m, now).label, '12m left');

// "3h 12m left"
const in3h12m = new Date(now + (3 * 3600 + 12 * 60) * 1000).toISOString();
assert.strictEqual(formatPollTimeRemaining(in3h12m, now).label, '3h 12m left');

// "2d 4h left"
const in2d4h = new Date(now + (2 * 86400 + 4 * 3600) * 1000).toISOString();
assert.strictEqual(formatPollTimeRemaining(in2d4h, now).label, '2d 4h left');

// 4. Test 1-minute test poll countdown transition:
const testOneMin = now + 60 * 1000;
console.log('Testing 1-minute test poll timeline:');
console.log(' at 60s:', formatPollTimeRemaining(new Date(testOneMin).toISOString(), now).label);
console.log(' at 45s:', formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 15000).label);
console.log(' at 10s:', formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 50000).label);
console.log(' at  1s:', formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 59000).label);
console.log(' at  0s (flip):', formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 60000).label);
console.log(' at past (flip):', formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 61000).label);

assert.strictEqual(formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 60000).isClosed, true);
assert.strictEqual(formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 60000).label, 'Poll Closed');
assert.strictEqual(formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 65000).isClosed, true);
assert.strictEqual(formatPollTimeRemaining(new Date(testOneMin).toISOString(), now + 65000).label, 'Poll Closed');

console.log('All poll countdown & flip tests passed successfully!');
