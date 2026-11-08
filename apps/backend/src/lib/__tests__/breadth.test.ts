/**
 * Breadth classifier + containment tests.
 * Run: npx tsx apps/backend/src/lib/__tests__/breadth.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { breadthPromptLine, classifyBreadth } from '../breadth.js';
import { buildMarketDriversBlock } from '../atlasFeed.js';
import { renderDailyBriefEmail } from '../../services/dailyBrief/renderEmail.js';
import { parseDailyContent } from '../../services/dailyBrief/validate.js';

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

const BANNED = ['1.02', '102', '65.5', '65', 'bps', 'concentration'];

test('containment: neither the email nor the prompt ever sees the numbers', () => {
  // This test enforces the product decision — do not delete it as redundant.
  // Tape/levels from the sample fixture contain "65" inside unrelated prices
  // ($478.65), so the assertion is against a payload that only carries the
  // driver row and innocuous surrounding fields.
  const fixturePath = resolve(__dirname, '../../../fixtures/daily_content_sample.json');
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const content = parseDailyContent({
    ...raw,
    tape: [{ symbol: 'SPY', price: '$771.10', pct: 0.66 }],
    sectors: [],
    levels: {},
    catalyst_bullets: [],
    headlines: [],
    preheader: 'NVDA led overnight.',
    sections: {
      ...raw.sections,
      opening_bias: 'NVDA led the tape overnight after a record quarter.',
      session_setup_html: '<p>The rest of the market did not participate.</p>',
      key_level_note: 'SPY 770 is the line.',
      todays_watch_html: '<p>Watch whether the gap holds.</p>',
      biggest_risk: 'A fade in the leader would leave the index unsupported.',
    },
    movers: [
      {
        ticker: 'NVDA',
        pct: '+6.30%',
        dir: 'up',
        why: 'Reported record Q2 FY2027 revenue of $96.2 billion, up 106% year over year.',
        companyName: 'NVIDIA Corporation',
        window: 'index_driver',
        isEarnings: true,
        contributionBps: 65.55,
        indexWeightPct: 7.5,
        concentrationRatio: 1.02,
      } as never,
    ],
  });

  const html = renderDailyBriefEmail({ content, unsubscribeUrl: 'https://example.com/unsub' });
  for (const banned of BANNED) {
    assert.equal(html.includes(banned), false, `"${banned}" leaked into the email`);
  }

  const prompt = buildMarketDriversBlock(
    [
      {
        ticker: 'NVDA',
        pct: '+6.30%',
        why: 'Reported record Q2 FY2027 revenue of $96.2 billion, up 106% year over year.',
        headlineWindow: 'premarket',
      },
    ],
    'narrow'
  );
  assert.ok(prompt.includes('MARKET BREADTH: narrow'));
  for (const banned of BANNED) {
    assert.equal(prompt.includes(banned), false, `"${banned}" leaked into the prompt`);
  }
});

test('divide-by-noise guard: a 2bp index move returns unknown, never a 2500% ratio', () => {
  const read = classifyBreadth([50, 4, 2], 0.02, 0.02, 0.01);
  assert.equal(read.regime, 'unknown');
  assert.equal(read.concentrationRatio, null);
});

test('regime unknown omits the MARKET BREADTH line from the prompt entirely', () => {
  assert.equal(breadthPromptLine('unknown'), '');
  const block = buildMarketDriversBlock([], 'unknown');
  assert.equal(block.includes('MARKET BREADTH'), false);
});

test('drivers positive while the index is negative returns offset, not narrow', () => {
  const read = classifyBreadth([40, 5, 2], -0.3, -0.3, -0.05);
  assert.equal(read.regime, 'offset');
});

test('high ratio with a flat equal-weight spread returns mixed', () => {
  const read = classifyBreadth([60, 5, 2], 0.66, 0.66, 0.64);
  assert.equal(read.regime, 'mixed');
});

test('the 8/27 fixture classifies as narrow', () => {
  const read = classifyBreadth([65.5, 13.5, 11.2], 0.66, 0.66, 0.2);
  assert.equal(read.regime, 'narrow');
  assert.ok((read.concentrationRatio ?? 0) > 1);
});

console.log(`\n${passed} tests passed`);
