import test from 'node:test';
import assert from 'node:assert/strict';

import { checkArtifactFreshness } from '../freshness.js';
import type { StoredDailyBrief } from '../types.js';

function stored(generatedAt: string): StoredDailyBrief {
  return {
    id: 'test',
    date_label: 'Test',
    generated_at: generatedAt,
    data_stale: false,
    artifact: {} as StoredDailyBrief['artifact'],
  } as StoredDailyBrief;
}

/** 08:00 ET on the given date, expressed in UTC (EDT = UTC-4 in August). */
function etMorning(day: string): string {
  return `${day}T12:00:00+00:00`;
}

test('accepts an artifact generated earlier today in ET', () => {
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const result = checkArtifactFreshness(stored(new Date(now.getTime() - 30 * 60_000).toISOString()));
  assert.equal(result.ok, true, `expected today's artifact (${today}) to pass`);
});

test("rejects yesterday's artifact even though it is under 36 hours old", () => {
  const yesterday = new Date(Date.now() - 24.5 * 3600_000);
  const day = yesterday.toISOString().slice(0, 10);
  const result = checkArtifactFreshness(stored(etMorning(day)));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /not today/);
});

test('rejects a stale-flagged artifact', () => {
  const s = { ...stored(new Date().toISOString()), data_stale: true };
  const result = checkArtifactFreshness(s);
  assert.equal(result.ok, false);
});
