import './setupEnv.js';

import assert from 'node:assert/strict';
import {
  effectivePostingMode,
  setPostingConfigForTests,
  type PostingConfig,
} from '../postingMode.js';
import {
  consumeDayCode,
  resetReelsCodeStoreForTests,
  revealDayCode,
} from '../reelsCode.js';
import reelsRoute, { setReelPublisherForTests } from '../../routes/reels.js';

process.env.REELS_CODE_SECRET ||= 'test-reels-code-secret-32chars!!';
process.env.REELS_OWNER_PAGE_SECRET ||= 'test-reels-owner-secret-32ch!!';

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

const confirmConfig: PostingConfig = {
  mode: 'confirm',
  autoFrom: '2099-01-01',
  timezone: 'America/New_York',
  shareToFeed: true,
  coverIsHookFrame: true,
};

const caption = [
  "COIN just tagged Tuesday's high and backed off.",
  '',
  "Resistance: $184 (Tuesday's high)",
  "Support: $168 → $158 (Tuesday's low)",
  '',
  'Save this. Free levels in the app, link in bio.',
  '',
  '#COIN #Coinbase #stockmarket #trading #ChartSignl',
].join('\n');

await test('confirm before Oct 7, auto on and after', () => {
  setPostingConfigForTests({
    ...confirmConfig,
    autoFrom: '2026-10-07',
  });
  assert.equal(effectivePostingMode(new Date('2026-09-16T14:00:00Z')), 'confirm');
  assert.equal(effectivePostingMode(new Date('2026-10-07T08:00:00-04:00')), 'auto');
  assert.equal(effectivePostingMode(new Date('2026-10-08T12:00:00Z')), 'auto');
});

await test('GET /mode says confirm and posts=false', async () => {
  setPostingConfigForTests(confirmConfig);
  const res = await reelsRoute.request('/mode');
  const body = await res.json() as { mode: string; posts: boolean };
  assert.equal(res.status, 200);
  assert.equal(body.mode, 'confirm');
  assert.equal(body.posts, false);
});

await test('publish in confirm mode without action=post is refused', async () => {
  setPostingConfigForTests(confirmConfig);
  let published = 0;
  setReelPublisherForTests(async () => {
    published += 1;
    return { publisher: 'postiz', id: 'nope' };
  });
  const res = await reelsRoute.request('/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-reels-code': '123456',
    },
    body: JSON.stringify({
      caption,
      videoUrl: 'https://example.com/reel.mp4',
    }),
  });
  const body = await res.json() as { error: string; posted: boolean };
  assert.equal(res.status, 409);
  assert.equal(body.error, 'confirm_required');
  assert.equal(body.posted, false);
  assert.equal(published, 0);
});

await test('owner page is gated; same-day code publishes Claude caption once', async () => {
  setPostingConfigForTests(confirmConfig);
  resetReelsCodeStoreForTests();
  let published = 0;
  setReelPublisherForTests(async (input) => {
    published += 1;
    assert.equal(input.caption, caption);
    assert.equal(input.shareToFeed, true);
    assert.equal(input.coverOffsetMs, 0);
    return { publisher: 'graph', id: 'ig_1', permalink: 'https://instagram.com/reel/1' };
  });

  const denied = await reelsRoute.request('/code');
  assert.equal(denied.status, 401);

  const page = await reelsRoute.request('/code', {
    headers: {
      accept: 'application/json',
      'x-reels-owner-secret': process.env.REELS_OWNER_PAGE_SECRET!,
    },
  });
  const revealed = await page.json() as { code: string; used: boolean };
  assert.equal(page.status, 200);
  assert.equal(revealed.used, false);
  assert.match(revealed.code, /^\d{6}$/);

  const first = await reelsRoute.request('/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-reels-code': revealed.code,
    },
    body: JSON.stringify({
      action: 'post',
      ticker: 'COIN',
      caption,
      videoUrl: 'https://example.com/coin.mp4',
    }),
  });
  const posted = await first.json() as { posted: boolean; postingMode: string; id: string };
  assert.equal(first.status, 200);
  assert.equal(posted.posted, true);
  assert.equal(posted.postingMode, 'confirm');
  assert.equal(posted.id, 'ig_1');
  assert.equal(published, 1);

  const second = await reelsRoute.request('/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-reels-code': revealed.code,
    },
    body: JSON.stringify({
      action: 'post',
      caption: 'again',
      videoUrl: 'https://example.com/coin.mp4',
    }),
  });
  const again = await second.json() as { error: string; posted: boolean };
  assert.equal(second.status, 409);
  assert.equal(again.error, 'code_used');
  assert.equal(again.posted, false);
  assert.equal(published, 1);
});

await test('consumeDayCode rejects a wrong code', async () => {
  resetReelsCodeStoreForTests();
  const { code } = await revealDayCode('2026-09-16');
  const result = await consumeDayCode('2026-09-16', code === '000000' ? '000001' : '000000');
  assert.equal(result, 'invalid');
});

setPostingConfigForTests(null);
setReelPublisherForTests(null);
resetReelsCodeStoreForTests();

console.log(`\n${passed} tests passed`);
