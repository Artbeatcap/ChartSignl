import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyYouTubeVideo,
  dropAlreadySaved,
  parseItunesDuration,
  parsePodcastFeed,
  parseYouTubeChannelFeed,
  podcastTranscriptDecision,
} from '../lib/feeds.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('feeds', () => {
  it('parses a YouTube channel RSS feed', () => {
    const items = parseYouTubeChannelFeed(fixture('youtube-feed.xml'));
    assert.equal(items.length, 2);
    assert.equal(items[0].itemId, 'jzpi6KNr0Dg');
    assert.equal(items[0].title, 'These Sectors Are Setting Up For Big Moves!');
    assert.equal(items[0].url, 'https://www.youtube.com/watch?v=jzpi6KNr0Dg');
    assert.equal(items[0].publishedAt, '2026-11-04T15:00:00.000Z');
  });

  it('parses podcast RSS that includes podcast:transcript', () => {
    const items = parsePodcastFeed(fixture('podcast-with-transcript.xml'));
    assert.equal(items.length, 1);
    assert.equal(items[0].itemId, 'dc7b25ff-f033-45be-8c1d-3fcc70e118db');
    assert.equal(items[0].transcriptUrl, 'https://example.com/oct27.vtt');
    assert.equal(items[0].transcriptType, 'text/vtt');
    assert.equal(items[0].durationSeconds, 7350);
    assert.equal(items[0].publishedAt, '2026-10-27T02:15:21.000Z');
    assert.match(items[0].title, /NOVEMBER RALLY & 2 TOP CHIP STOCKS/);
  });

  it('parses podcast RSS without podcast:transcript', () => {
    const items = parsePodcastFeed(fixture('podcast-without-transcript.xml'));
    assert.equal(items.length, 2);
    assert.equal(items[0].transcriptUrl, null);
    assert.equal(items[1].transcriptUrl, null);
    assert.equal(items[0].durationSeconds, 3723);
  });

  it('waits under 72 hours and fails after that when no transcript is in the feed', () => {
    const recent = podcastTranscriptDecision({
      transcriptUrl: null,
      publishedAt: '2026-11-04T18:00:00.000Z',
      now: new Date('2026-11-05T18:00:00.000Z'),
    });
    assert.equal(recent.action, 'waiting');

    const at72h = podcastTranscriptDecision({
      transcriptUrl: null,
      publishedAt: '2026-11-01T18:00:00.000Z',
      now: new Date('2026-11-04T18:00:00.000Z'),
    });
    assert.equal(at72h.action, 'failed');
    assert.equal(at72h.reason, 'no transcript in feed');

    const old = podcastTranscriptDecision({
      transcriptUrl: null,
      publishedAt: '2026-06-01T18:00:00.000Z',
      now: new Date('2026-11-04T18:00:00.000Z'),
    });
    assert.equal(old.action, 'failed');
    assert.equal(old.reason, 'no transcript in feed');

    const ready = podcastTranscriptDecision({
      transcriptUrl: 'https://example.com/a.vtt',
      publishedAt: '2020-01-01T00:00:00.000Z',
    });
    assert.equal(ready.action, 'fetch');
    assert.equal(ready.method, 'feed_vtt');
  });

  it('skips shorts and defers live streams that have not ended', () => {
    assert.equal(classifyYouTubeVideo({ duration: 'PT45S', liveBroadcastContent: 'none' }).action, 'skip');
    assert.equal(classifyYouTubeVideo({ duration: 'PT3M', liveBroadcastContent: 'none' }).action, 'skip');
    assert.equal(classifyYouTubeVideo({ duration: 'PT20M1S', liveBroadcastContent: 'none' }).action, 'fetch');
    const live = classifyYouTubeVideo({ duration: 'PT1H', liveBroadcastContent: 'live' });
    assert.equal(live.action, 'defer');
    assert.match(live.reason, /not ended/);
    const ended = classifyYouTubeVideo({
      duration: 'PT1H',
      liveBroadcastContent: 'live',
      actualEndTime: '2026-11-04T16:00:00Z',
    });
    assert.equal(ended.action, 'fetch');
  });

  it('keeps only items that are not already saved', () => {
    const items = [{ itemId: 'a' }, { itemId: 'b' }];
    assert.deepEqual(dropAlreadySaved(items, ['a']).map((item) => item.itemId), ['b']);
  });

  it('parses itunes durations', () => {
    assert.equal(parseItunesDuration('7350'), 7350);
    assert.equal(parseItunesDuration('1:02:03'), 3723);
  });
});
