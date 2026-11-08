/**
 * Notable-movers type/liquidity filter tests.
 * Run: npx tsx apps/backend/src/lib/__tests__/moversFilter.test.ts
 */
import assert from 'node:assert/strict';
import {
  isRealOperatingCompany,
  passesQualityGate,
  scoreMover,
  capDirection,
  type TickerMeta,
  type PolygonSnapshotTicker,
} from '../moversFilter.js';
import {
  buildPreheader,
  priorSessionLabel,
  renderDailyBriefEmail,
} from '../../services/dailyBrief/renderEmail.js';
import { parseDailyContent } from '../../services/dailyBrief/validate.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sanitizeAiField, sanitizeDailySections } from '../briefSanitize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function meta(
  ticker: string,
  name: string,
  type = 'CS',
  extras: Partial<TickerMeta> = {}
): TickerMeta {
  return {
    ticker,
    name,
    type,
    market: 'stocks',
    active: true,
    primaryExchange: 'XNAS',
    marketCap: 2_000_000_000,
    ...extras,
  };
}

const EXCLUDED: Record<string, TickerMeta> = {
  HOOZ: meta('HOOZ', 'Defiance Daily Target 2X Short HOOD ETF', 'ETF'),
  HOOG: meta('HOOG', 'Leverage Shares 2X Long HOOD Daily ETF', 'ETF'),
  CONI: meta('CONI', 'T-Rex 2X Inverse COIN Daily Target ETF', 'ETF'),
  SMST: meta('SMST', 'Defiance Daily Target 2X Short MSTR ETF', 'ETF'),
  BABX: meta('BABX', 'GraniteShares 2X Short BABA Daily ETF', 'ETF'),
  AAOX: meta('AAOX', 'Tradr 2X Long AAOI Daily ETF', 'ETF'),
  AAOZ: meta('AAOZ', 'Tradr 2X Short AAOI Daily ETF', 'ETF'),
  ASTX: meta('ASTX', 'Tradr 2X Long ASTS Daily ETF', 'ETF'),
  QBTX: meta('QBTX', 'Tradr 2X Long IONQ Daily ETF', 'ETF'),
  TJGC: meta('TJGC', 'TJGC Corp', 'CS', { marketCap: 12_000_000 }),
  CIFU: meta('CIFU', 'CIFU Holdings Ltd', 'CS', { marketCap: 8_000_000 }),
};

const RETAINED = ['RGNX', 'NVDA', 'AAPL', 'PLTR', 'SMCI'] as const;
const RETAINED_META: Record<string, TickerMeta> = {
  RGNX: meta('RGNX', 'REGENXBIO Inc.'),
  NVDA: meta('NVDA', 'NVIDIA Corporation', 'CS', { marketCap: 3e12 }),
  AAPL: meta('AAPL', 'Apple Inc.', 'CS', { marketCap: 3e12 }),
  PLTR: meta('PLTR', 'Palantir Technologies Inc.', 'CS', { marketCap: 8e10 }),
  SMCI: meta('SMCI', 'Super Micro Computer, Inc.', 'CS', { marketCap: 2.5e10 }),
};

function liquidSnap(ticker: string, pct: number, price = 25, volume = 8_000_000): PolygonSnapshotTicker {
  return {
    ticker,
    todaysChangePerc: pct,
    day: { c: price, v: volume },
    prevDay: { v: volume },
    lastTrade: { p: price },
  };
}

test('excludes leveraged/inverse products by type and name', () => {
  for (const [ticker, m] of Object.entries(EXCLUDED)) {
    if (ticker === 'TJGC' || ticker === 'CIFU') {
      assert.equal(isRealOperatingCompany(m), true, ticker);
      continue;
    }
    assert.equal(isRealOperatingCompany(m), false, ticker);
  }
});

test('name backstop catches a CS-mistagged 2X product', () => {
  assert.equal(
    isRealOperatingCompany(meta('HOOG', 'Leverage Shares 2X Long HOOD Daily ETF', 'CS')),
    false
  );
});

test('retains real operating companies', () => {
  for (const ticker of RETAINED) {
    const snap = liquidSnap(ticker, ticker === 'RGNX' ? -24.86 : 8);
    assert.equal(isRealOperatingCompany(RETAINED_META[ticker]), true, ticker);
    assert.equal(passesQualityGate(snap, RETAINED_META[ticker]), true, ticker);
  }
});

test('micro-caps fail the quality gate', () => {
  assert.equal(
    passesQualityGate(liquidSnap('TJGC', 31, 1.2, 80_000), EXCLUDED.TJGC),
    false
  );
  assert.equal(
    passesQualityGate(liquidSnap('CIFU', -17, 2.1, 40_000), EXCLUDED.CIFU),
    false
  );
});

test('9% on $2B outranks 30% on $12M', () => {
  const big = liquidSnap('NVDA', 9, 120, 20_000_000);
  const thin = liquidSnap('RGNX', 30, 12, 1_000_000);
  assert.ok(scoreMover(big) > scoreMover(thin));
});

test('mirror pair of 2X long/short cannot both survive type filter', () => {
  const survivors = ['HOOG', 'HOOZ'].filter((t) => isRealOperatingCompany(EXCLUDED[t]));
  assert.equal(survivors.length, 0);
});

test('empty movers omits the Notable Movers section', () => {
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({ ...raw, movers: [] });
  const html = renderDailyBriefEmail({
    content,
    unsubscribeUrl: 'https://example.com/unsub',
  });
  assert.equal(html.includes('Notable Movers'), false);
});

test('direction cap never keeps more than 4 of the same sign', () => {
  const ranked = Array.from({ length: 8 }, (_, i) => ({ todaysChangePerc: 10 + i }));
  const capped = capDirection(ranked, 6, 4);
  assert.equal(capped.length, 4);
});

test('strips markdown rules and greetings from AI fields', () => {
  const dirty = 'Hey guys, here is your morning brief.\nBias is constructive.\n---\n';
  const clean = sanitizeAiField(dirty);
  assert.equal(clean.includes('Hey guys'), false);
  assert.equal(clean.includes('---'), false);
  assert.ok(clean.includes('Bias is constructive'));
});

test('greeting and signoff survive sanitize but analysis fields do not keep them', () => {
  const cleaned = sanitizeDailySections({
    greeting: 'Hey guys, here is your morning brief.\n---',
    opening_bias: 'Hey guys, here is your morning brief. Bias is constructive.',
    signoff: 'Have a great day guys!',
  });
  assert.equal(cleaned.greeting, 'Hey guys, here is your morning brief.');
  assert.equal(cleaned.signoff, 'Have a great day guys!');
  assert.equal(cleaned.opening_bias, 'Bias is constructive.');
});

test('greeting renders outside the Opening Bias callout and stays out of preheader', () => {
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({
    ...raw,
    preheader: undefined,
    sections: {
      ...raw.sections,
      greeting: 'Hey guys, here is your morning brief.',
      signoff: 'Have a great day guys!',
    },
  });

  const html = renderDailyBriefEmail({
    content,
    unsubscribeUrl: 'https://example.com/unsub',
  });
  const biasBox = html.slice(html.indexOf('Opening bias'), html.indexOf('Session Setup'));
  assert.equal(biasBox.includes('Hey guys'), false);
  assert.ok(html.includes('Hey guys, here is your morning brief.'));
  assert.ok(html.includes('Have a great day guys!'));
  assert.equal(buildPreheader(content).includes('Hey guys'), false);
});

test('narrowed name regex keeps real REITs and trust-named companies', () => {
  assert.equal(isRealOperatingCompany(meta('DLR', 'Digital Realty Trust, Inc.')), true);
  assert.equal(isRealOperatingCompany(meta('NTRS', 'Northern Trust Corporation')), true);
  assert.equal(isRealOperatingCompany(meta('VNO', 'Vornado Realty Trust')), true);
});

test('narrowed name regex still rejects leveraged products', () => {
  for (const [ticker, name] of [
    ['HOOG', 'Leverage Shares 2X Long HOOD Daily ETF'],
    ['HOOZ', 'Defiance Daily Target 2X Short HOOD ETF'],
    ['CONI', 'T-Rex 2X Inverse COIN Daily Target ETF'],
    ['SMST', 'Defiance Daily Target 2X Short MSTR ETF'],
    ['AAOX', 'Tradr 2X Long AAOI Daily ETF'],
    ['AAOZ', 'Tradr 2X Short AAOI Daily ETF'],
  ] as const) {
    assert.equal(isRealOperatingCompany(meta(ticker, name)), false, `${ticker} slipped through`);
  }
});

test('premarket rows render a window badge, earnings badge and prior-session clause', () => {
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({
    ...raw,
    movers: [
      {
        ticker: 'DKS',
        pct: '-1.14%',
        dir: 'down',
        why: 'Q2 EPS $3.53 vs $3.78 est; FY guidance cut',
        companyName: "DICK'S Sporting Goods",
        window: 'premarket',
        priorSessionPct: '-27.00%',
        isEarnings: true,
      },
      {
        ticker: 'MRNA',
        pct: '+14.36%',
        dir: 'up',
        why: 'No headline — flow-driven',
        companyName: 'Moderna, Inc.',
        window: 'prior_session',
      },
    ],
  });

  const html = renderDailyBriefEmail({ content, unsubscribeUrl: 'https://example.com/unsub' });
  assert.ok(html.includes('>Premarket</span>'), 'missing premarket badge');
  assert.ok(html.includes('>Earnings</span>'), 'missing earnings badge');
  assert.ok(html.includes('-27.00%'), 'missing prior-session number');
  assert.ok(html.includes('Premarket prints are thin and can reverse at the open.'));
  assert.ok(html.includes('>Movers</div>'), 'section title should be Movers');
  assert.equal(html.split('$DKS').length - 1, 1, 'DKS rendered more than once');
});

test('index driver rows lead with the badge and give the catalyst its own line', () => {
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({
    ...raw,
    movers: [
      {
        ticker: 'NVDA',
        pct: '+6.30%',
        dir: 'up',
        why: 'NVIDIA reported record Q2 FY2027 revenue of $96.2 billion (up 106% YoY) with Data Center revenue reaching $89.0 billion.',
        companyName: 'NVIDIA Corporation',
        window: 'index_driver',
        priorSessionPct: '+8.74%',
        isEarnings: true,
      },
      { ticker: 'ANF', pct: '+35.67%', dir: 'up', why: 'x', window: 'prior_session' },
    ],
  });

  const html = renderDailyBriefEmail({ content, unsubscribeUrl: 'https://example.com/unsub' });
  assert.ok(html.includes('>Index Driver</span>'), 'missing index driver badge');
  assert.ok(html.includes('#EDE9FE'), 'driver badge should use the violet background');
  assert.ok(html.includes('$96.2 billion'), 'the catalyst text is the payload');
  assert.ok(html.includes('>Earnings</span>'), 'NVDA on 8/27 earns both badges');
  assert.ok(html.includes('font-size:13.5px'), 'driver reason line should be a step larger');
  assert.ok(html.includes('#3d4a5c'), 'driver reason line should be a step darker');
  assert.equal(html.split('$NVDA').length - 1, 1, 'NVDA rendered more than once');
  // A driver row is not a premarket print, so the thin-liquidity caveat
  // must not attach itself to one.
  assert.equal(html.includes('Premarket prints are thin'), false);
});

test('no basis-point or index-weight figure reaches the rendered email', () => {
  // Containment. bps ranks, steers, and logs; it never renders. This test
  // enforces the product decision — do not delete it as redundant.
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({
    ...raw,
    movers: [
      {
        ticker: 'NVDA',
        pct: '+6.30%',
        dir: 'up',
        why: 'Reported record Q2 revenue, up sharply year over year.',
        window: 'index_driver',
        // Deliberately smuggled in: the schema must strip them.
        contributionBps: 65.55,
        indexWeightPct: 7.5,
        concentrationRatio: 1.02,
      } as never,
    ],
  });

  const html = renderDailyBriefEmail({ content, unsubscribeUrl: 'https://example.com/unsub' });
  for (const banned of ['1.02', '65.5', '65 bps', 'bps', 'concentration']) {
    assert.equal(html.includes(banned), false, `"${banned}" leaked into the email`);
  }
});

test('the no-catalyst override renders muted rather than as an explanation', () => {
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({
    ...raw,
    movers: [
      {
        ticker: 'NVDA',
        pct: '+8.00%',
        dir: 'up',
        why: 'No catalyst in the last 36 hours',
        window: 'index_driver',
        hasCatalyst: false,
      },
    ],
  });
  const html = renderDailyBriefEmail({ content, unsubscribeUrl: 'https://example.com/unsub' });
  assert.ok(html.includes('No catalyst in the last 36 hours'));
  assert.ok(html.includes('#9aa6b5'), 'no-catalyst text should be muted grey');
  assert.equal(html.includes('#3d4a5c'), false, 'must not use the explanatory colour');
});

test('prior-session label says Friday on a Monday send, Yesterday midweek', () => {
  assert.equal(priorSessionLabel('Monday, August 24, 2026'), 'Friday');
  assert.equal(priorSessionLabel('Wednesday, August 26, 2026'), 'Yesterday');
});

test('caption is omitted when there are no premarket rows', () => {
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({
    ...raw,
    movers: [
      { ticker: 'MRNA', pct: '+14.36%', dir: 'up', why: 'x', window: 'prior_session' },
    ],
  });
  const html = renderDailyBriefEmail({ content, unsubscribeUrl: 'https://example.com/unsub' });
  assert.equal(html.includes('Premarket prints are thin'), false);
  const label = priorSessionLabel(content.date_label);
  assert.ok(html.includes(`>${label}</span>`), 'prior-session rows need a window badge too');
});

console.log(`\n${passed} tests passed`);
