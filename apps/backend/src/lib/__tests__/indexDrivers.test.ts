/**
 * Index-driver ranking and merge tests.
 * Fixtures are the real NVDA 8/27 snapshot — the morning the brief missed it.
 * Run: npx tsx apps/backend/src/lib/__tests__/indexDrivers.test.ts
 */
import assert from 'node:assert/strict';
import {
  MIN_DRIVER_BPS,
  buildDriverContribution,
  contributionBps,
  finalizeDriverSlots,
  mergeWindows,
  priorSessionChangePct,
  rankDrivers,
  type BriefMoverRow,
  type DriverContribution,
} from '../indexDrivers.js';
import { isStale, readWindowFields, deriveFeedNowMs } from '../premarketMovers.js';

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

const NOW_MS = 1_787_875_200_000;

function nvdaAfterClose() {
  return {
    ticker: 'NVDA',
    todaysChangePerc: 7.860345320995893,
    todaysChange: 16.47999999999999,
    day: { o: 222.86, h: 230.47, l: 220.9, c: 227.98, v: 298343048 },
    min: { t: 1_787_875_140_000, c: 226.14, av: 298343048 },
    prevDay: { c: 209.66, v: 179_900_000 },
  };
}

function nvdaPremarket() {
  return {
    ticker: 'NVDA',
    todaysChangePerc: 6.296,
    day: { o: 0, h: 0, l: 0, c: 0, v: 0 },
    lastTrade: { p: 222.86, t: NOW_MS - 60_000 },
    min: { t: NOW_MS - 60_000, c: 222.86, av: 14_000_000 },
    prevDay: { c: 209.66, v: 179_900_000 },
  };
}

function row(
  ticker: string,
  window: BriefMoverRow['window'],
  pct: string,
  dir: BriefMoverRow['dir'] = 'up'
): BriefMoverRow {
  return { ticker, pct, dir, why: 'x', window };
}

test('contributionBps(8.74, 7.5) is 65.55 — the /100 and *100 cancel', () => {
  assert.equal(Number(contributionBps(8.74, 7.5).toFixed(2)), 65.55);
});

test('priorSessionChangePct returns 8.74, not 7.86 (after-hours todaysChangePerc trap)', () => {
  // todaysChangePerc reports 7.860 because prevDay.c 209.66 + todaysChange
  // 16.48 = 226.14, which is min.c — a 19:59 ET after-hours print, not the
  // 227.98 close. See §2 of the index-drivers prompt.
  const pct = priorSessionChangePct(nvdaAfterClose());
  assert.ok(Math.abs(pct - 8.738) < 0.01, `got ${pct}, expected ~8.74`);
  assert.notEqual(Number(pct.toFixed(2)), 7.86);
});

test('readWindowFields on a zero-filled day returns lastTrade price, not 0', () => {
  const fields = readWindowFields(nvdaPremarket(), 'premarket');
  assert.equal(fields.price, 222.86);
  assert.notEqual(fields.price, 0);
});

test('a 0.4% move at 7.5% weight (3 bps) is rejected by MIN_DRIVER_BPS', () => {
  const snap = { ...nvdaPremarket(), todaysChangePerc: 0.4, day: { c: 0 } };
  assert.equal(0.4 * 7.5, 3);
  assert.ok(3 < MIN_DRIVER_BPS);
  assert.equal(buildDriverContribution(snap, 7.5), null);
});

test('flat premarket but +8.74% prior session produces headlineWindow prior_session', () => {
  const snap = {
    ...nvdaAfterClose(),
    todaysChangePerc: 0.1,
    min: { t: NOW_MS - 60_000, c: 227.98, av: 298343048 },
  };
  const row = buildDriverContribution(snap, 7.5);
  assert.ok(row);
  assert.equal(row.headlineWindow, 'prior_session');
  assert.ok(Math.abs(row.headlineBps - 65.53) < 0.2);
});

test('NVDA as both driver and premarket mover yields exactly one index_driver row', () => {
  const drivers = [row('NVDA', 'index_driver', '+6.30%')];
  const premarket = [row('NVDA', 'premarket', '+6.30%'), row('AAA', 'premarket', '+9.00%')];
  const prior = [row('NVDA', 'prior_session', '+8.74%')];
  const merged = mergeWindows(premarket, prior, drivers);
  const nvda = merged.filter((r) => r.ticker === 'NVDA');
  assert.equal(nvda.length, 1);
  assert.equal(nvda[0].window, 'index_driver');
  assert.equal(nvda[0].priorSessionPct, '+8.74%');
});

test('isStale rejects a driver whose lastTrade is 45 minutes old', () => {
  const ts = NOW_MS - 45 * 60_000;
  assert.equal(isStale(ts, NOW_MS), true);
});

test('deriveFeedNowMs: 16-min-old print is fresh on a 15-min delayed plan', () => {
  const wall = NOW_MS;
  const feedNow = deriveFeedNowMs(wall, 15);
  const lastTrade = wall - 16 * 60_000;
  assert.equal(isStale(lastTrade, feedNow, 20), false);
});

test('deriveFeedNowMs: 40-min-old print is still stale (halt detection intact)', () => {
  const wall = NOW_MS;
  const feedNow = deriveFeedNowMs(wall, 15);
  const lastTrade = wall - 40 * 60_000;
  assert.equal(isStale(lastTrade, feedNow, 20), true);
});

test('slot allocation with 5 eligible drivers renders 2, never more', () => {
  const drivers = [0, 1, 2, 3, 4].map((i) => row(`D${i}`, 'index_driver', '+5.00%'));
  const premarket = [row('AAA', 'premarket', '-9.00%', 'down')];
  const prior = [0, 1, 2, 3].map((i) => row(`P${i}`, 'prior_session', '-6.00%', 'down'));
  const merged = mergeWindows(premarket, prior, drivers);
  assert.equal(merged.filter((r) => r.window === 'index_driver').length, 2);
  assert.ok(merged.length <= 6);
});

test('zero eligible drivers leaves premarket and prior-session rows unchanged', () => {
  const premarket = [row('AAA', 'premarket', '+9.00%'), row('BBB', 'premarket', '-4.00%', 'down')];
  const prior = [row('CCC', 'prior_session', '+7.00%'), row('DDD', 'prior_session', '-8.00%', 'down')];
  const merged = mergeWindows(premarket, prior, []);
  assert.deepEqual(
    merged.map((r) => r.ticker),
    ['AAA', 'BBB', 'CCC', 'DDD']
  );
});

test('renders NVDA on 2026-08-27, the morning the brief missed it', () => {
  const nvda = buildDriverContribution(nvdaPremarket(), 7.5);
  const avgo = buildDriverContribution(
    {
      ticker: 'AVGO',
      todaysChangePerc: 4.49,
      day: { c: 0 },
      lastTrade: { p: 371, t: NOW_MS - 60_000 },
      min: { t: NOW_MS - 60_000, c: 371, av: 2_000_000 },
      prevDay: { c: 355.59 },
    },
    2.4
  );
  const ranked = rankDrivers([nvda, avgo].filter((r): r is DriverContribution => r !== null));
  assert.equal(ranked[0].ticker, 'NVDA');
  assert.ok(Math.abs(ranked[0].headlineBps - 47.2) < 1);

  const slots = finalizeDriverSlots(
    ranked,
    new Map([
      ['NVDA', { text: 'Q2 revenue $96.2 billion', url: 'https://x', isEarnings: true }],
      ['AVGO', { text: 'rose alongside NVDA', url: 'https://y', isEarnings: false }],
    ])
  );
  const merged = mergeWindows(
    [],
    [
      row('ANF', 'prior_session', '+35.67%'),
      row('BHVN', 'prior_session', '+17.87%'),
      row('QFIN', 'prior_session', '-18.91%', 'down'),
      row('GENB', 'prior_session', '-20.80%', 'down'),
    ],
    slots
  );
  assert.equal(merged[0].ticker, 'NVDA');
  assert.equal(merged[0].window, 'index_driver');
});

console.log(`\n${passed} tests passed`);
