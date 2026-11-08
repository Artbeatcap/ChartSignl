import { Hono } from 'hono';
import { effectivePostingMode, etDateString, loadPostingConfig } from '../lib/postingMode.js';
import {
  consumeDayCode,
  ownerSecretMatches,
  revealDayCode,
  type ReelsCodeStore,
  memoryReelsCodeStore,
} from '../lib/reelsCode.js';
import { renderReelsCodeDeniedPage, renderReelsCodePage } from '../lib/reelsPages.js';
import { configuredPublisherName, defaultReelPublisher, type ReelPublisher } from '../lib/reelsPublisher.js';
import { supabaseAdmin } from '../lib/supabase.js';

const reelsRoute = new Hono();

let codeStore: ReelsCodeStore = memoryReelsCodeStore;
let publisher: ReelPublisher = defaultReelPublisher();

export function setReelsCodeStoreForTests(store: ReelsCodeStore): void {
  codeStore = store;
}

export function setReelPublisherForTests(next: ReelPublisher | null): void {
  publisher = next || defaultReelPublisher();
}

async function recordReelPost(row: {
  dayEt: string;
  ticker: string | null;
  caption: string;
  postingMode: 'confirm' | 'auto';
  publisher: 'postiz' | 'graph' | 'none';
  posted: boolean;
  videoUrl: string;
  providerId: string;
}): Promise<void> {
  if ((process.env.SUPABASE_URL || '').includes('example.supabase.co')) return;
  const { error } = await supabaseAdmin.from('reels_posts').insert({
    day_et: row.dayEt,
    ticker: row.ticker,
    caption: row.caption,
    posting_mode: row.postingMode,
    publisher: row.publisher,
    posted: row.posted,
    video_url: row.videoUrl,
    provider_id: row.providerId,
  });
  if (error) console.error('[REELS] ledger insert failed:', error.message);
}

function ownerSecretFromRequest(c: {
  req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined };
}): string {
  return c.req.header('x-reels-owner-secret') || c.req.query('secret') || '';
}

reelsRoute.get('/mode', (c) => {
  const config = loadPostingConfig();
  const now = new Date();
  const mode = effectivePostingMode(now, config);
  return c.json({
    mode,
    autoFrom: config.autoFrom,
    timezone: config.timezone,
    shareToFeed: config.shareToFeed,
    coverIsHookFrame: config.coverIsHookFrame,
    dayEt: etDateString(now, config.timezone),
    posts: mode === 'auto',
  });
});

reelsRoute.get('/code', async (c) => {
  if (!ownerSecretMatches(ownerSecretFromRequest(c))) {
    return c.html(renderReelsCodeDeniedPage(), 401);
  }

  const config = loadPostingConfig();
  const now = new Date();
  const dayEt = etDateString(now, config.timezone);
  const revealed = await revealDayCode(dayEt, codeStore);
  const mode = effectivePostingMode(now, config);
  const html = renderReelsCodePage({
    dayEt,
    code: revealed.code,
    used: revealed.used,
    postingMode: mode,
  });

  if (c.req.header('accept')?.includes('application/json')) {
    return c.json({
      dayEt,
      code: revealed.code || null,
      used: revealed.used,
      postingMode: mode,
    });
  }
  return c.html(html);
});

reelsRoute.post('/publish', async (c) => {
  const code = c.req.header('x-reels-code') || '';
  const config = loadPostingConfig();
  const now = new Date();
  const mode = effectivePostingMode(now, config);
  const dayEt = etDateString(now, config.timezone);

  let body: {
    action?: string;
    caption?: string;
    ticker?: string;
    videoUrl?: string;
    shareToFeed?: boolean;
    coverOffsetMs?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'invalid_json', postingMode: mode, posted: false }, 400);
  }

  if (mode === 'confirm' && body.action !== 'post') {
    return c.json({
      ok: false,
      error: 'confirm_required',
      postingMode: mode,
      posted: false,
      detail: 'Confirm mode does not publish. Claude delivers the reel and caption. Call this endpoint only when posting.',
    }, 409);
  }

  const consumed = await consumeDayCode(dayEt, code, codeStore, now);
  if (consumed !== 'ok') {
    const status = consumed === 'used' ? 409 : 401;
    return c.json({
      ok: false,
      error: consumed === 'used' ? 'code_used' : 'invalid_code',
      postingMode: mode,
      posted: false,
    }, status);
  }

  const videoUrl = String(body.videoUrl || '');
  if (!/^https:\/\//i.test(videoUrl)) {
    return c.json({
      ok: false,
      error: 'video_url_required',
      postingMode: mode,
      posted: false,
    }, 400);
  }

  const caption = String(body.caption || '').trim();
  if (!caption) {
    return c.json({
      ok: false,
      error: 'caption_required',
      postingMode: mode,
      posted: false,
    }, 400);
  }

  try {
    const result = await publisher({
      videoUrl,
      caption,
      shareToFeed: body.shareToFeed !== false && config.shareToFeed,
      coverOffsetMs: Number.isFinite(body.coverOffsetMs) ? Number(body.coverOffsetMs) : 0,
    });
    await recordReelPost({
      dayEt,
      ticker: body.ticker ? String(body.ticker).toUpperCase() : null,
      caption,
      postingMode: mode,
      publisher: result.publisher,
      posted: true,
      videoUrl,
      providerId: result.id,
    });
    return c.json({
      ok: true,
      posted: true,
      postingMode: mode,
      publisher: result.publisher,
      id: result.id,
      permalink: result.permalink,
      caption,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'publish_failed';
    console.error('[REELS] publish failed:', err);
    return c.json({
      ok: false,
      error: message,
      postingMode: mode,
      posted: false,
      publisher: configuredPublisherName(),
    }, 502);
  }
});

export default reelsRoute;
