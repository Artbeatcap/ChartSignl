/**
 * Catalyst scoring tests — fixtures are the real NVDA 8/27 Polygon titles.
 * Run: npx tsx apps/backend/src/lib/__tests__/catalyst.test.ts
 */
import assert from 'node:assert/strict';
import {
  MIN_CATALYST_SCORE,
  pickCatalyst,
  scoreCatalyst,
  type CatalystCandidate,
} from '../catalyst.js';
import { finalizeDriverSlots, type DriverContribution } from '../indexDrivers.js';

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

function globenewswire(): CatalystCandidate {
  return {
    title: 'NVIDIA Announces Upcoming Event for Financial Community',
    description:
      'NVIDIA reported record Q2 FY2027 revenue of $96.2 billion (up 106% YoY) with Data Center revenue reaching $89.0 billion (up 117% YoY). The company also announced a major expansion with AWS to deliver 2 million additional GPUs…',
    publisher: 'GlobeNewswire Inc.',
    articleUrl: 'https://example.com/nvda-globenewswire',
    tickers: ['NVDA'],
    keywords: ['Q2 FY2027 results', 'revenue growth', 'data center'],
    publishedUtc: '2026-08-27T21:00:00Z',
  };
}

function zacksCircular(): CatalystCandidate {
  return {
    title: 'Nvidia Stock Soars After Q2 Earnings: Is NVDA Still a Buy?',
    description:
      'Nvidia surged 7% after delivering blockbuster Q2 earnings with $96.22B revenue (106% YoY growth) and raising FY28 guidance to ~70% growth.',
    publisher: 'Zacks Investment Research',
    articleUrl: 'https://example.com/nvda-zacks',
    tickers: ['NVDA'],
    keywords: ['earnings', 'guidance'],
    publishedUtc: '2026-08-27T18:45:00Z',
  };
}

function marketWrap(): CatalystCandidate {
  return {
    title: 'Stock Market Today, Aug. 27: Nvidia Surges on Blowout Results and Surprising Guidance',
    description:
      'Nvidia surged 8.74% after reporting $96.2 billion in quarterly revenue (up 106% YoY) and providing surprisingly strong guidance for 70% revenue growth in 2027.',
    publisher: 'The Motley Fool',
    articleUrl: 'https://example.com/wrap',
    tickers: ['SPY', 'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META'],
    keywords: ['market wrap'],
    publishedUtc: '2026-08-27T21:01:26Z',
  };
}

function spacexRoundup(): CatalystCandidate {
  return {
    title: 'Should SpaceX Join the Magnificent Seven?',
    description: 'A look at whether SpaceX belongs alongside the largest technology companies.',
    publisher: 'The Motley Fool',
    articleUrl: 'https://example.com/spacex',
    tickers: ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'NFLX', 'ORCL', 'CRM'],
    keywords: ['magnificent seven'],
    publishedUtc: '2026-08-28T09:00:00Z',
  };
}

test('pickCatalyst selects the GlobeNewswire article, and the text contains $96.2 billion', () => {
  const pick = pickCatalyst(
    [spacexRoundup(), marketWrap(), zacksCircular(), globenewswire()],
    'NVDA'
  );
  assert.ok(pick);
  assert.ok(pick.text.includes('$96.2 billion'), `got: ${pick.text}`);
  assert.equal(pick.url, 'https://example.com/nvda-globenewswire');
});

test('Should SpaceX Join the Magnificent Seven? scores below MIN_CATALYST_SCORE', () => {
  assert.ok(scoreCatalyst(spacexRoundup(), 'NVDA') < MIN_CATALYST_SCORE);
});

test('circular title with no description fails; the same title with figures passes', () => {
  const bare: CatalystCandidate = {
    title: 'Nvidia Stock Soars After Earnings',
    description: null,
    publisher: 'Some Blog',
    articleUrl: 'https://example.com/bare',
    tickers: ['NVDA'],
    keywords: [],
    publishedUtc: '2026-08-27T20:00:00Z',
  };
  assert.ok(scoreCatalyst(bare, 'NVDA') < MIN_CATALYST_SCORE);
  assert.ok(scoreCatalyst(zacksCircular(), 'NVDA') >= MIN_CATALYST_SCORE);
});

function contrib(ticker: string, bps: number): DriverContribution {
  return {
    ticker,
    weightPct: 5,
    premarketChangePct: bps / 5,
    priorSessionChangePct: 0,
    premarketBps: bps,
    priorSessionBps: 0,
    headlineBps: bps,
    headlineWindow: 'premarket',
  };
}

test('a driver whose candidates all score below threshold is dropped and the next promoted', () => {
  const ranked = [contrib('AAA', 20), contrib('BBB', 15), contrib('CCC', 12)];
  const catalysts = new Map([
    ['AAA', null],
    ['BBB', { text: 'BBB did a thing worth $1 billion.', url: 'https://x', isEarnings: false }],
    ['CCC', { text: 'CCC guided higher.', url: 'https://y', isEarnings: false }],
  ]);
  const rows = finalizeDriverSlots(ranked, catalysts);
  assert.deepEqual(
    rows.map((r) => r.ticker),
    ['BBB', 'CCC']
  );
});

test('the same driver at 35 bps renders anyway with No catalyst in the last 36 hours', () => {
  const ranked = [contrib('AAA', 35)];
  const rows = finalizeDriverSlots(ranked, new Map([['AAA', null]]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].why, 'No catalyst in the last 36 hours');
  assert.equal(rows[0].hasCatalyst, false);
});

console.log(`\n${passed} tests passed`);
