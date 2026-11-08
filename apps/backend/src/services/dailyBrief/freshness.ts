import { parseGeneratedAt } from '../briefShared/parseGeneratedAt.js';
import type { StoredDailyBrief } from './types.js';

/** Morning briefs should not send if older than ~36 hours. */
const MAX_AGE_MS = 36 * 60 * 60 * 1000;

export type FreshnessResult =
  | { ok: true }
  | { ok: false; reason: string };

/** YYYY-MM-DD for an instant, in US Eastern — the session clock both sides use. */
function easternDay(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

export function checkArtifactFreshness(stored: StoredDailyBrief | null): FreshnessResult {
  if (!stored) {
    return { ok: false, reason: 'No daily brief artifact found' };
  }

  if (stored.data_stale) {
    return { ok: false, reason: 'Latest artifact is marked data_stale=true' };
  }

  if (!stored.generated_at) {
    return { ok: false, reason: 'Latest artifact has no generated_at timestamp' };
  }

  const generatedAt = parseGeneratedAt(stored.generated_at);
  if (Number.isNaN(generatedAt)) {
    return { ok: false, reason: `Invalid generated_at: ${stored.generated_at}` };
  }

  const now = Date.now();
  const ageMs = now - generatedAt;
  if (ageMs > MAX_AGE_MS) {
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    return { ok: false, reason: `Artifact is ${hours} hours old (max 36 hours)` };
  }

  // Age alone is not enough. OP publishes at 08:00 ET and we send at 08:30 ET,
  // so yesterday's artifact is only ~24h old at send time and would sail
  // through the age window — re-delivering yesterday's brief verbatim.
  const artifactDay = easternDay(generatedAt);
  const today = easternDay(now);
  if (artifactDay !== today) {
    return {
      ok: false,
      reason: `Artifact is from ${artifactDay}, not today (${today}) — upstream brief did not publish`,
    };
  }

  return { ok: true };
}
