import assert from 'node:assert/strict';
import './setupEnv.ts';
import {
  guestKeyFromCookie,
  hashGuestIp,
  isGuestUsedThisWeek,
} from '../guestUsage.js';

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

test('guestKeyFromCookie accepts a uuid and lowercases it', () => {
  assert.equal(
    guestKeyFromCookie('A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11'),
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );
});

test('guestKeyFromCookie rejects junk', () => {
  assert.equal(guestKeyFromCookie(undefined), null);
  assert.equal(guestKeyFromCookie('not-a-uuid'), null);
  assert.equal(guestKeyFromCookie(''), null);
});

test('hashGuestIp ignores unknown / empty IPs so they do not share a bucket', () => {
  assert.equal(hashGuestIp('unknown'), null);
  assert.equal(hashGuestIp('   '), null);
  assert.equal(typeof hashGuestIp('203.0.113.10'), 'string');
  assert.equal(hashGuestIp('203.0.113.10'), hashGuestIp('203.0.113.10'));
  assert.notEqual(hashGuestIp('203.0.113.10'), hashGuestIp('203.0.113.11'));
});

test('isGuestUsedThisWeek is true inside 7 days and false after', () => {
  const now = Date.parse('2026-09-15T16:00:00.000Z');
  assert.equal(
    isGuestUsedThisWeek([{ last_used_at: '2026-09-10T16:00:01.000Z' }], now),
    true
  );
  assert.equal(
    isGuestUsedThisWeek([{ last_used_at: '2026-09-08T15:59:00.000Z' }], now),
    false
  );
  assert.equal(isGuestUsedThisWeek([], now), false);
});

console.log(`guestUsage tests: ${passed} passed`);
