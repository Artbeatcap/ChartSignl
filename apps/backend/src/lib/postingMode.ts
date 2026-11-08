import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export type PostingMode = 'confirm' | 'auto';

export interface PostingConfig {
  mode: PostingMode;
  autoFrom: string;
  timezone: string;
  shareToFeed: boolean;
  coverIsHookFrame: boolean;
}

const DEFAULTS: PostingConfig = {
  mode: 'confirm',
  autoFrom: '2026-10-07',
  timezone: 'America/New_York',
  shareToFeed: true,
  coverIsHookFrame: true,
};

let override: PostingConfig | null = null;

export function setPostingConfigForTests(config: PostingConfig | null): void {
  override = config;
}

export function postingConfigPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../../config/posting.json');
}

export function loadPostingConfig(): PostingConfig {
  if (override) return override;

  const path = postingConfigPath();
  if (!existsSync(path)) return { ...DEFAULTS };

  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<PostingConfig>;
  const mode = raw.mode === 'auto' ? 'auto' : 'confirm';
  return {
    mode,
    autoFrom: typeof raw.autoFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.autoFrom)
      ? raw.autoFrom
      : DEFAULTS.autoFrom,
    timezone: raw.timezone || DEFAULTS.timezone,
    shareToFeed: raw.shareToFeed !== false,
    coverIsHookFrame: raw.coverIsHookFrame !== false,
  };
}

export function etDateString(now: Date, timeZone = 'America/New_York'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * confirm until autoFrom (inclusive start of that ET date → auto).
 * Config mode "auto" can flip early; "confirm" still respects autoFrom so
 * a forgotten file cannot stay confirm forever after the date.
 */
export function effectivePostingMode(now = new Date(), config = loadPostingConfig()): PostingMode {
  const today = etDateString(now, config.timezone);
  if (today >= config.autoFrom) return 'auto';
  return config.mode;
}
